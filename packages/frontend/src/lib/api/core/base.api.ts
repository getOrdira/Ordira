// src/lib/api/core/base.api.ts
// Base API utilities aligned with backend routes/core/base.routes.ts

import type { ObjectSchema } from 'joi';

import { api, manufacturerApi, publicApi } from '../client';
import type { ApiResponse, PaginatedResponse } from '@/lib/types/core';
import { ApiError } from '@/lib/errors/errors';
import {
  sanitizePagination,
  type PaginationInput,
  type PaginationOptions,
  type SanitizedPagination
} from '@/lib/validation/sanitizers/pagination';
import {
  sanitizeRequestBody,
  sanitizeQueryParams as sanitizeQueryRecord,
  toSearchParams
} from '@/lib/validation/transformations/sanitizerPayload';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  assertWithSchema,
  type JoiValidationOptions
} from '@/lib/validation/validators/joiValidate';

type RequestSanitizeOptions = Parameters<typeof sanitizeRequestBody>[1];
type QuerySanitizeOptions = Parameters<typeof sanitizeQueryRecord>[1];
type QueryParamPrimitive = string | number | boolean;
type QueryParamRecord = Record<string, QueryParamPrimitive | QueryParamPrimitive[]>;
type HandleResponseOptions = {
  requireData?: boolean;
};

/**
 * Route configuration types (mirrored from backend RouteConfig)
 * These types help document the expected behavior of different API endpoints
 */
export interface RouteConfig {
  requireAuth?: boolean;
  requireTenant?: boolean;
  requireTenantSetup?: boolean;
  requireTenantPlan?: string[];
  rateLimit?: 'dynamic' | 'strict' | 'none';
}

/**
 * Common route configurations (mirrored from backend RouteConfigs)
 * Used for documentation and type safety
 */
export const RouteConfigs = {
  /**
   * Public routes (no authentication required)
   */
  public: {
    requireAuth: false,
    requireTenant: false,
    rateLimit: 'strict' as const
  },

  /**
   * Authenticated routes (requires auth, no tenant)
   */
  authenticated: {
    requireAuth: true,
    requireTenant: false,
    rateLimit: 'dynamic' as const
  },

  /**
   * Tenant routes (requires auth and tenant setup)
   */
  tenant: {
    requireAuth: true,
    requireTenant: true,
    requireTenantSetup: true,
    rateLimit: 'dynamic' as const
  },

  /**
   * Admin routes (requires auth, stricter rate limiting)
   */
  admin: {
    requireAuth: true,
    requireTenant: false,
    rateLimit: 'strict' as const
  }
} as const;

/**
 * Base API Utilities
 * 
 * Common utilities and helpers for API calls that align with backend base patterns
 */
export const baseApi = {
  
  /**
   * Create pagination query parameters
   * Helper to standardize pagination across API calls
   */
  createPaginationParams: (
    params: PaginationInput = {},
    options?: PaginationOptions
  ): SanitizedPagination => {
    return sanitizePagination(params, options);
  },

  /**
   * Create a pagination query string from raw params
   */
  createPaginationQueryString: (
    params: PaginationInput = {},
    options?: PaginationOptions
  ): string => {
    const pagination = sanitizePagination(params, options);
    const queryString = toSearchParams(pagination).toString();
    return queryString ? `?${queryString}` : '';
  },

  /**
   * Create pagination metadata from response
   * Helper to extract pagination info from backend responses
   */
  extractPaginationMeta: <T>(response: PaginatedResponse<T>) => {
    return {
      page: response.pagination?.page || 1,
      limit: response.pagination?.limit || 10,
      total: response.pagination?.total || 0,
      totalPages: response.pagination?.totalPages || 0,
      hasNext: response.pagination?.hasNext || false,
      hasPrev: response.pagination?.hasPrev || false
    };
  },

  /**
   * Handle API response with error checking
   * Standardized error handling pattern for all API calls
   */
  handleResponse: <T>(
    response: ApiResponse<T>,
    errorMessage: string = 'Request failed',
    defaultStatusCode: number = 400,
    options?: HandleResponseOptions
  ): T => {
    if (!response.success) {
      throw new ApiError(response.message || errorMessage, defaultStatusCode);
    }
    if ((response.data === undefined || response.data === null) && options?.requireData !== false) {
      throw new ApiError(errorMessage || 'No data returned', defaultStatusCode);
    }
    return response.data as T;
  },

  /**
   * Handle paginated response with error checking
   * Standardized error handling pattern for paginated API calls
   */
  handlePaginatedResponse: <T>(
    response: ApiResponse<PaginatedResponse<T>>,
    errorMessage: string = 'Request failed',
    defaultStatusCode: number = 400
  ): PaginatedResponse<T> => {
    if (!response.success) {
      throw new ApiError(response.message || errorMessage, defaultStatusCode);
    }
    if (!response.data) {
      throw new ApiError(errorMessage || 'No data returned', defaultStatusCode);
    }
    return response.data;
  },

  /**
   * Validate payloads against Joi schemas
   */
  validatePayload: <T>(
    schema: ObjectSchema<T>,
    payload: unknown,
    options?: JoiValidationOptions
  ): T => {
    return assertWithSchema(schema, payload, options);
  },

  /**
   * Validate and sanitize payloads before sending them to the backend
   */
  validateAndSanitize: <T>(
    schema: ObjectSchema<T>,
    payload: unknown,
    options?: {
      joi?: JoiValidationOptions;
      sanitize?: RequestSanitizeOptions;
    }
  ): T => {
    const validated = assertWithSchema(schema, payload, options?.joi);
    return sanitizeRequestBody(validated, options?.sanitize);
  },

  /**
   * Validate business ID format
   * Aligned with backend validation patterns
   */
  validateBusinessId: (businessId: string): boolean => {
    // MongoDB ObjectId format: 24 hex characters
    return /^[0-9a-fA-F]{24}$/.test(businessId);
  },

  /**
   * Validate manufacturer ID format
   * Aligned with backend validation patterns
   */
  validateManufacturerId: (manufacturerId: string): boolean => {
    // MongoDB ObjectId format: 24 hex characters
    return /^[0-9a-fA-F]{24}$/.test(manufacturerId);
  },

  /**
   * Validate user ID format
   * Aligned with backend validation patterns
   */
  validateUserId: (userId: string): boolean => {
    // MongoDB ObjectId format: 24 hex characters
    return /^[0-9a-fA-F]{24}$/.test(userId);
  },

  /**
   * Create request metadata
   * Helper to create consistent request metadata for API calls
   */
  createRequestMeta: (customMeta?: Record<string, any>) => {
    return {
      timestamp: new Date().toISOString(),
      clientVersion: '1.0.0',
      ...customMeta
    };
  },

  /**
   * Sanitize request data
   * Normalizes payloads using shared sanitizer rules
   */
  sanitizeRequestData: <T>(data: T, options?: RequestSanitizeOptions): T => {
    return sanitizeRequestBody(data, options);
  },

  /**
   * Sanitize query params prior to serialization
   */
  sanitizeQueryParams: (
    params?: Record<string, unknown>,
    options?: QuerySanitizeOptions
  ): QueryParamRecord => {
    return sanitizeQueryRecord(params, options) as QueryParamRecord;
  },

  /**
   * Create query string from params
   * Helper to build query strings consistently
   */
  buildQueryString: (
    params?: Record<string, unknown>,
    options?: QuerySanitizeOptions
  ): string => {
    const queryString = toSearchParams(params, options).toString();
    return queryString ? `?${queryString}` : '';
  },

  /**
   * Get appropriate API client based on route configuration
   * Returns the correct API client (api, manufacturerApi, or publicApi)
   */
  getApiClient: (config: RouteConfig) => {
    if (!config.requireAuth) {
      return publicApi;
    }
    // For manufacturer-specific routes, use manufacturerApi
    // This is determined by the route path, not the config
    return api;
  },

  /**
   * Retry logic helper
   * Standardized retry pattern for API calls
   */
  withRetry: async <T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx)
        if (error instanceof ApiError && error.statusCode < 500) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
    
    throw lastError!;
  },

  /**
   * Batch API requests with concurrency control
   * Helper for making multiple API calls efficiently
   */
  batchRequests: async <T>(
    requests: Array<() => Promise<T>>,
    concurrency: number = 5
  ): Promise<T[]> => {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const request of requests) {
      const promise = request()
        .then(result => {
          results.push(result);
        })
        .catch(error => {
          // Continue processing other requests even if one fails
          const normalizedError = handleApiError(error, {
            method: 'BATCH',
            endpoint: 'baseApi.batchRequests'
          });
          results.push(normalizedError as T);
        });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  },

  /**
   * Create timeout wrapper for API calls
   * Helper to add timeout to API calls
   */
  withTimeout: <T>(
    apiCall: () => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> => {
    return Promise.race([
      apiCall(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new ApiError('Request timeout', 408)), timeoutMs)
      )
    ]);
  }
};

// Export as default for convenience
export default baseApi;
