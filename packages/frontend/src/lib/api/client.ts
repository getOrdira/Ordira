// src/lib/api/client.ts

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { getToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth/session';
import { ApiError } from '@/lib/errors';

// Extended request config for retry logic
interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  retryCount?: number;
  _retryDelay?: number;
  metadata?: { startTime: number };
}

// Rate limiting tracking
interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
}

class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map();

  constructor() {
    this.instance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0',
        'X-Client-Platform': 'web',
      },
      withCredentials: false, // Handle auth via headers
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for auth, logging, and request preparation
    this.instance.interceptors.request.use(
      (config: RetryableAxiosRequestConfig) => {
        // Add authentication token
        const token = getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request timing for performance monitoring
        config.metadata = { startTime: Date.now() };

        // Log requests in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
            params: config.params,
            data: config.data ? Object.keys(config.data) : null,
          });
        }

        // Add device fingerprint for security
        if (typeof window !== 'undefined') {
          config.headers['X-Device-Fingerprint'] = this.generateDeviceFingerprint();
        }

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor with token refresh, retry logic, and error handling
    this.instance.interceptors.response.use(
      (response) => {
        // Log response timing in development
        if (process.env.NODE_ENV === 'development') {
          const config = response.config as RetryableAxiosRequestConfig;
          const duration = Date.now() - (config.metadata?.startTime || 0);
          console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
        }

        // Track rate limiting info from headers
        this.updateRateLimitInfo(response);

        // Return only the data, as backend sends direct JSON responses
        return response.data;
      },
      async (error: AxiosError) => {
        const config = error.config as RetryableAxiosRequestConfig;
        
        // Log errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, {
            status: error.response?.status,
            message: (error.response?.data as any)?.message,
          });
        }

        // Handle token refresh for 401 errors
        if (error.response?.status === 401 && config && !config._retry) {
          return this.handleTokenRefresh(error);
        }

        // Handle server errors with retry logic
        if (this.shouldRetry(error, config)) {
          return this.retryRequest(config);
        }

        // Transform error to our standard format
        return Promise.reject(this.transformError(error));
      }
    );
  }

  private updateRateLimitInfo(response: any): void {
    const headers = response.headers;
    if (headers['x-ratelimit-limit'] && headers['x-ratelimit-remaining']) {
      const endpoint = response.config.url;
      this.rateLimitInfo.set(endpoint, {
        limit: parseInt(headers['x-ratelimit-limit'], 10),
        remaining: parseInt(headers['x-ratelimit-remaining'], 10),
        resetTime: new Date(headers['x-ratelimit-reset'] || Date.now() + 60000),
      });
    }
  }

  private async handleTokenRefresh(error: AxiosError): Promise<any> {
    const config = error.config as RetryableAxiosRequestConfig;
    
    if (this.isRefreshing) {
      // Token refresh in progress, queue this request
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then(() => {
        // Retry with new token
        return this.instance(config);
      });
    }

    config._retry = true;
    this.isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call refresh endpoint
      const response = await this.instance.post('/auth/refresh', {
        refreshToken,
      });

      const { token, refreshToken: newRefreshToken } = response as any;
      
      // Store new tokens
      setTokens(token, newRefreshToken);

      // Process queued requests
      this.processQueue(null);

      // Retry original request with new token
      config.headers.Authorization = `Bearer ${token}`;
      return this.instance(config);

    } catch (refreshError) {
      // Refresh failed, clear tokens and redirect to login
      this.processQueue(refreshError);
      clearTokens();
      
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      
      return Promise.reject(refreshError);
    } finally {
      this.isRefreshing = false;
    }
  }

  private processQueue(error: any): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(null);
      }
    });
    
    this.failedQueue = [];
  }

  private shouldRetry(error: AxiosError, config?: RetryableAxiosRequestConfig): boolean {
    if (!config) return false;
    
    // Don't retry if already retried max times
    if ((config.retryCount || 0) >= 3) return false;
    
    // Retry for server errors (5xx)
    if (error.response?.status && error.response.status >= 500) return true;
    
    // Retry for network errors
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') return true;
    
    // Retry for specific timeout scenarios
    if (error.code === 'ECONNRESET' || error.message.includes('timeout')) return true;
    
    return false;
  }

  private async retryRequest(config: RetryableAxiosRequestConfig): Promise<any> {
    config.retryCount = (config.retryCount || 0) + 1;
    
    // Calculate exponential backoff delay
    const delay = Math.min(1000 * Math.pow(2, config.retryCount - 1), 10000);
    config._retryDelay = delay;

    console.log(`🔄 Retrying request (attempt ${config.retryCount}) after ${delay}ms delay`);

    // Wait for delay
    await new Promise(resolve => setTimeout(resolve, delay));

    return this.instance(config);
  }

  private transformError(error: AxiosError): ApiError {
    // Extract rate limit info if available
    const rateLimitHeaders = error.response?.headers;
    const isRateLimited = error.response?.status === 429;

    const apiError = new ApiError(
      (error.response?.data as any)?.message || error.message || 'An unexpected error occurred',
      error.response?.status || 500
    );

    // Add retry info if this was a retried request
    const config = error.config as RetryableAxiosRequestConfig;
    if (config?.retryCount) {
      (apiError as any).retryInfo = {
        attemptNumber: config.retryCount,
        totalDelay: config._retryDelay || 0,
        lastError: error.code || 'UNKNOWN',
      };
    }

    return apiError;
  }

  private generateDeviceFingerprint(): string {
    if (typeof window === 'undefined') return '';
    
    try {
      const fingerprint = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        timestamp: Date.now(),
      };
      
      return btoa(JSON.stringify(fingerprint)).slice(0, 32);
    } catch {
      return '';
    }
  }

  // ===== PUBLIC API METHODS =====

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get<T>(url, config) as Promise<T>;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post<T>(url, data, config) as Promise<T>;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.put<T>(url, data, config) as Promise<T>;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.patch<T>(url, data, config) as Promise<T>;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete<T>(url, config) as Promise<T>;
  }

  async postFormData<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post<T>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    }) as Promise<T>;
  }

  // ===== UTILITY METHODS =====

  /**
   * Get rate limit info for specific endpoint
   */
  getRateLimitInfo(endpoint: string): RateLimitInfo | null {
    return this.rateLimitInfo.get(endpoint) || null;
  }

  /**
   * Check if endpoint is currently rate limited
   */
  isRateLimited(endpoint: string): boolean {
    const info = this.rateLimitInfo.get(endpoint);
    return info ? info.remaining <= 0 && info.resetTime > new Date() : false;
  }

  /**
   * Get suggested delay before next request to avoid rate limiting
   */
  getSuggestedDelay(endpoint: string): number {
    const info = this.rateLimitInfo.get(endpoint);
    if (!info) return 0;
    
    if (info.remaining <= 5) {
      // Suggest delay when approaching limit
      return Math.max(1000, (info.resetTime.getTime() - Date.now()) / info.remaining);
    }
    
    return 0;
  }

  /**
   * Validate connection to backend
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    version?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await this.instance.get('/health');
      const latency = Date.now() - startTime;
      
      return {
        healthy: true,
        latency,
        version: (response as any).version,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
      };
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Export both the instance and typed methods
export default apiClient;

// Typed API methods matching your backend response patterns
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.get<T>(url, config),
    
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.post<T>(url, data, config),
    
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.put<T>(url, data, config),
    
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.patch<T>(url, data, config),
    
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.delete<T>(url, config),
    
  postFormData: <T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> => 
    apiClient.postFormData<T>(url, formData, config),
};

// ===== SPECIALIZED API CLIENTS =====

/**
 * API client for manufacturer-specific endpoints
 * Uses different auth patterns and rate limiting
 */
export const manufacturerApi = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return api.get<T>(`/manufacturer${url}`, config);
  },
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return api.post<T>(`/manufacturer${url}`, data, config);
  },
  
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return api.put<T>(`/manufacturer${url}`, data, config);
  },
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return api.delete<T>(`/manufacturer${url}`, config);
  },
};

/**
 * Public API client for non-authenticated endpoints
 * No auth headers, different rate limits
 */
export const publicApi = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const publicConfig = {
      ...config,
      transformRequest: [(data: any, headers: any) => {
        // Remove auth headers for public requests
        delete headers.Authorization;
        return data;
      }],
    };
    return apiClient.get<T>(url, publicConfig);
  },
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const publicConfig = {
      ...config,
      transformRequest: [(requestData: any, headers: any) => {
        delete headers.Authorization;
        return JSON.stringify(requestData);
      }],
    };
    return apiClient.post<T>(url, data, publicConfig);
  },
};

// ===== UTILITY FUNCTIONS =====

/**
 * Create request with custom timeout
 */
export const createTimeoutRequest = (timeoutMs: number) => ({
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
    api.get<T>(url, { ...config, timeout: timeoutMs }),
    
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
    api.post<T>(url, data, { ...config, timeout: timeoutMs }),
});

/**
 * Create request with retry configuration
 */
export const createRetryableRequest = (maxRetries: number, baseDelay = 1000) => {
  const retryConfig = { maxRetries, baseDelay };
  
  return {
    get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => 
      api.get<T>(url, { ...config, ...retryConfig }),
      
    post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => 
      api.post<T>(url, data, { ...config, ...retryConfig }),
  };
};

/**
 * Batch multiple requests with concurrency control
 */
export const batchRequests = async <T>(
  requests: Array<() => Promise<T>>,
  concurrency = 5
): Promise<T[]> => {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const request of requests) {
    const promise = request().then(result => {
      results.push(result);
    });
    
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }
  
  await Promise.all(executing);
  return results;
};

/**
 * Request with automatic retry and exponential backoff
 */
export const requestWithRetry = async <T>(
  requestFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => error.statusCode >= 500,
  } = options;

  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        break;
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// ===== CLIENT HEALTH MONITORING =====

/**
 * Monitor API client health and performance
 */
export const clientMonitor = {
  
  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): Record<string, RateLimitInfo> {
    return Object.fromEntries(apiClient['rateLimitInfo']);
  },
  
  /**
   * Check connection health
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    latency: number;
    version?: string;
    timestamp: string;
  }> {
    const result = await apiClient.healthCheck();
    return {
      ...result,
      timestamp: new Date().toISOString(),
    };
  },
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    averageLatency: number;
    totalRequests: number;
    errorRate: number;
    rateLimitHits: number;
  } {
    // This would typically be stored in a performance tracker
    // For now, return placeholder data
    return {
      averageLatency: 150,
      totalRequests: 0,
      errorRate: 0.02,
      rateLimitHits: 0,
    };
  },
  
  /**
   * Reset client state (useful for testing)
   */
  reset(): void {
    apiClient['rateLimitInfo'].clear();
    apiClient['failedQueue'] = [];
    apiClient['isRefreshing'] = false;
  },
};

// ===== ENVIRONMENT CONFIGURATION =====

/**
 * Configure API client for different environments
 */
export const configureApiClient = (config: {
  baseURL?: string;
  timeout?: number;
  enableLogging?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
}) => {
  if (config.baseURL) {
    apiClient['instance'].defaults.baseURL = config.baseURL;
  }
  
  if (config.timeout) {
    apiClient['instance'].defaults.timeout = config.timeout;
  }
  
  // Additional configuration can be added here
  console.log('API client configured:', config);
};

// ===== ERROR RECOVERY =====

/**
 * Recover from network errors
 */
export const recoverFromError = async (error: ApiError): Promise<boolean> => {
  // Try to recover from common errors
  if (error.statusCode === 429) {
    // Rate limited - wait for reset
    const resetTime = (error as any).rateLimitInfo?.resetTime;
    if (resetTime) {
      const waitTime = new Date(resetTime).getTime() - Date.now();
      if (waitTime > 0 && waitTime < 60000) { // Wait max 1 minute
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return true;
      }
    }
  }
  
  if (error.statusCode === 401) {
    // Unauthorized - try token refresh
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        const response = await api.post('/auth/refresh', { refreshToken }) as any;
        setTokens(response.token, response.refreshToken);
        return true;
      }
    } catch {
      clearTokens();
    }
  }
  
  return false;
};

