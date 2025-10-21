import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse
} from 'axios';
import { logger } from '../../../../utils/logger';
import { EcommerceIntegrationError } from './errors';
import type { EcommerceHttpClientOptions } from './types';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const DEFAULT_RETRY_ON_STATUSES = [429, 500, 502, 503, 504];
const DEFAULT_REDACT_HEADERS = ['authorization', 'x-shopify-access-token', 'x-wix-signature'];

type RetriableAxiosRequestConfig = AxiosRequestConfig & { __retryCount?: number };

/**
 * Factory responsible for producing configured Axios clients with shared instrumentation.
 */
export class HttpClientFactoryService {
  createClient(options: EcommerceHttpClientOptions): AxiosInstance {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.defaultHeaders
    };

    if (options.bearerToken) {
      headers.Authorization = `Bearer ${options.bearerToken}`;
    }

    if (options.userAgent) {
      headers['User-Agent'] = options.userAgent;
    }

    const config: AxiosRequestConfig = {
      baseURL: options.baseURL,
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      headers,
      params: options.queryParams,
      auth: options.auth
    };

    const instance = axios.create(config);

    instance.interceptors.request.use((request) => {
      (request as RetriableAxiosRequestConfig).__retryCount ??= 0;
      (request as any).__startedAt = Date.now();

      if (options.logRequests) {
        logger.info('Ecommerce request', {
          provider: options.provider,
          businessId: options.businessId,
          method: request.method?.toUpperCase(),
          url: request.baseURL ? `${request.baseURL}${request.url ?? ''}` : request.url,
          params: request.params,
          headers: this.redactHeaders(request.headers, options.redactHeaders)
        });
      }

      return request;
    });

    instance.interceptors.response.use(
      (response) => {
        this.logResponse(response, options);
        return response;
      },
      (error) => this.handleAxiosError(instance, error, options)
    );

    return instance;
  }

  private async handleAxiosError(
    instance: AxiosInstance,
    error: AxiosError,
    options: EcommerceHttpClientOptions
  ): Promise<AxiosResponse> {
    const config = error.config as RetriableAxiosRequestConfig | undefined;
    const retriesAllowed = options.retries ?? 0;

    const status = error.response?.status;

    const shouldRetry =
      config &&
      retriesAllowed > 0 &&
      (config.__retryCount ?? 0) < retriesAllowed &&
      this.shouldRetryStatus(status, options.retryOnStatuses ?? DEFAULT_RETRY_ON_STATUSES);

    if (!shouldRetry) {
      throw this.wrapAxiosError(error, options);
    }

    config.__retryCount = (config.__retryCount ?? 0) + 1;

    const delay =
      options.retryDelayMs ??
      DEFAULT_RETRY_DELAY_MS * Math.pow(2, config.__retryCount - 1);

    await new Promise((resolve) => setTimeout(resolve, delay));

    logger.warn('Retrying ecommerce request', {
      provider: options.provider,
      businessId: options.businessId,
      attempt: config.__retryCount,
      maxAttempts: retriesAllowed,
      status
    });

    return instance.request(config);
  }

  private wrapAxiosError(error: AxiosError, options: EcommerceHttpClientOptions): EcommerceIntegrationError {
    const statusCode = error.response?.status ?? 500;
    const responseData = error.response?.data;
    const message = (responseData && typeof responseData === 'object' && 'error' in responseData && 
                    typeof responseData.error === 'object' && responseData.error && 
                    'message' in responseData.error && typeof responseData.error.message === 'string') 
                    ? responseData.error.message 
                    : error.message ?? 'Unknown axios error';

    return new EcommerceIntegrationError(message, {
      provider: options.provider,
      businessId: options.businessId,
      statusCode,
      code: error.code,
      severity: statusCode >= 500 ? 'high' : 'medium',
      details: {
        url: error.config?.url,
        method: error.config?.method,
        status: statusCode,
        responseHeaders: this.redactHeaders(error.response?.headers, options.redactHeaders),
        data: error.response?.data
      },
      cause: error
    });
  }

  private logResponse(response: AxiosResponse, options: EcommerceHttpClientOptions): void {
    if (!options.logRequests) {
      return;
    }

    const startedAt = (response.config as any).__startedAt as number | undefined;
    const durationMs = startedAt ? Date.now() - startedAt : undefined;

    logger.info('Ecommerce response', {
      provider: options.provider,
      businessId: options.businessId,
      status: response.status,
      durationMs,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      headers: this.redactHeaders(response.headers, options.redactHeaders)
    });
  }

  private shouldRetryStatus(status: number | undefined, allowedStatuses: number[]): boolean {
    if (!status) {
      return true;
    }
    return allowedStatuses.includes(status);
  }

  private redactHeaders(
    headers: AxiosRequestConfig['headers'],
    customRedactions?: string[]
  ): Record<string, string | string[] | undefined> | undefined {
    if (!headers) {
      return undefined;
    }

    const redactions = new Set(
      [...DEFAULT_REDACT_HEADERS, ...(customRedactions ?? [])].map((header) => header.toLowerCase())
    );

    return Object.entries(headers).reduce<Record<string, string | string[] | undefined>>((acc, [key, value]) => {
      if (redactions.has(key.toLowerCase())) {
        acc[key] = Array.isArray(value) ? value.map(() => '***REDACTED***') : '***REDACTED***';
      } else {
        acc[key] = value as string | string[] | undefined;
      }
      return acc;
    }, {});
  }
}

export const httpClientFactoryService = new HttpClientFactoryService();
