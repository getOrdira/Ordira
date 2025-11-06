// src/lib/validation/middleware/apiLogger.ts
// Frontend logging utilities aligned with backend structured logger patterns.

import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import {
  createSafeSummary,
  sanitizeErrorForLogging,
  sanitizeRequestDataForLogging,
  sanitizeSensitiveObject,
  sanitizeSensitiveString
} from '../sanitizers/primitives';

const MAX_LOG_OBJECT_DEPTH = 3;

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

export interface LogContext {
  requestId?: string;
  sessionId?: string;
  userId?: string;
  businessId?: string;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  retryCount?: number;
  isRetry?: boolean;
  [key: string]: unknown;
}

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
  service: string;
  version: string;
  environment: string;
}

const getConsoleMethod = (level: LogLevel): 'error' | 'warn' | 'info' | 'debug' | 'log' => {
  switch (level) {
    case LogLevel.ERROR:
      return 'error';
    case LogLevel.WARN:
      return 'warn';
    case LogLevel.DEBUG:
    case LogLevel.TRACE:
      return 'debug';
    case LogLevel.INFO:
    default:
      return 'info';
  }
};

class ApiLogger {
  private service: string;

  private version: string;

  private environment: string;

  constructor() {
    this.service = 'b2b-frontend';
    this.version = process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version || '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const sanitizedContext = context ? sanitizeSensitiveObject(context, 0, MAX_LOG_OBJECT_DEPTH) : undefined;
    const sanitizedError = error ? sanitizeErrorForLogging(error) : undefined;

    const structuredLog: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      message: sanitizeSensitiveString(message),
      context: sanitizedContext,
      error: sanitizedError as StructuredLog['error'],
      service: this.service,
      version: this.version,
      environment: this.environment
    };

    const consoleMethod = getConsoleMethod(level);

    if (this.environment === 'development') {
      console[consoleMethod](JSON.stringify(structuredLog, null, 2));
    } else {
      console[consoleMethod](JSON.stringify(structuredLog));
    }
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  trace(message: string, context?: LogContext): void {
    this.log(LogLevel.TRACE, message, context);
  }

  logRequest(config: AxiosRequestConfig, context?: LogContext): void {
    const sanitizedPayload = sanitizeRequestDataForLogging({
      body: config.data,
      query: config.params
    });

    const requestContext: LogContext = {
      ...context,
      method: config.method?.toUpperCase(),
      endpoint: config.url,
      requestId: (config.headers?.['x-request-id'] as string | undefined) ?? context?.requestId,
      userAgent: (config.headers?.['user-agent'] as string | undefined) ?? context?.userAgent,
      data: sanitizedPayload?.body,
      query: sanitizedPayload?.query
    };

    this.info('HTTP Request', requestContext);
  }

  logResponse(response: AxiosResponse, context?: LogContext): void {
    const requestConfig = response.config as AxiosRequestConfig & { metadata?: { startTime?: number } };
    const duration = requestConfig.metadata?.startTime ? Date.now() - requestConfig.metadata.startTime : undefined;

    const responseContext: LogContext = {
      ...context,
      method: requestConfig.method?.toUpperCase(),
      endpoint: requestConfig.url,
      statusCode: response.status,
      duration,
      requestId: (response.headers?.['x-request-id'] as string | undefined) ?? context?.requestId,
      data: sanitizeRequestDataForLogging({ body: response.data })?.body
    };

    const logLevel = response.status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = response.status >= 400 ? 'HTTP Response Error' : 'HTTP Response';

    this.log(logLevel, message, responseContext);
  }

  logError(error: Error, context?: LogContext): void {
    this.error('Application Error', context, error);
  }

  logAxiosError(error: AxiosError, context?: LogContext): void {
    const status = error.response?.status;
    const metadata = (error.config as AxiosRequestConfig & { metadata?: { startTime?: number } })?.metadata;
    const duration = metadata?.startTime ? Date.now() - metadata.startTime : undefined;

    const errorContext: LogContext = {
      ...context,
      method: error.config?.method?.toUpperCase(),
      endpoint: error.config?.url,
      statusCode: status,
      duration,
      requestId: (error.response?.headers?.['x-request-id'] as string | undefined) ?? context?.requestId,
      data: sanitizeRequestDataForLogging({ body: error.response?.data })?.body
    };

    this.error('HTTP Request Failed', errorContext, error);
  }

  logValidationError(field: string, value: unknown, context?: LogContext): void {
    const validationContext: LogContext = {
      ...context,
      field,
      value: createSafeSummary(value)
    };

    this.warn('Validation Error', validationContext);
  }

  createContext(context?: Partial<LogContext>): LogContext {
    return sanitizeSensitiveObject({
      requestId: context?.requestId,
      sessionId: context?.sessionId,
      userId: context?.userId,
      businessId: context?.businessId,
      tenantId: context?.tenantId,
      method: context?.method,
      endpoint: context?.endpoint,
      statusCode: context?.statusCode,
      duration: context?.duration,
      userAgent: context?.userAgent,
      ip: context?.ip,
      retryCount: context?.retryCount,
      isRetry: context?.isRetry
    }, 0, MAX_LOG_OBJECT_DEPTH) as LogContext;
  }
}

export const apiLogger = new ApiLogger();

export const createLogContextFromAxiosConfig = (config: AxiosRequestConfig): LogContext => {
  return apiLogger.createContext({
    method: config.method?.toUpperCase(),
    endpoint: config.url,
    requestId: config.headers?.['x-request-id'] as string | undefined
  });
};

export const createLogContextFromAxiosError = (error: AxiosError): LogContext => {
  const requestConfig = error.config as AxiosRequestConfig;
  return apiLogger.createContext({
    method: requestConfig?.method?.toUpperCase(),
    endpoint: requestConfig?.url,
    statusCode: error.response?.status,
    requestId: error.response?.headers?.['x-request-id'] as string | undefined
  });
};

export const createLogContextFromResponse = (response: AxiosResponse): LogContext => {
  return apiLogger.createContext({
    method: response.config?.method?.toUpperCase(),
    endpoint: response.config?.url,
    statusCode: response.status,
    requestId: response.headers?.['x-request-id'] as string | undefined,
    duration: (response.config as AxiosRequestConfig & { metadata?: { startTime?: number } })?.metadata?.startTime
      ? Date.now() - ((response.config as AxiosRequestConfig & { metadata?: { startTime?: number } }).metadata!.startTime!)
      : undefined
  });
};

export const withPerformanceTimer = <T extends (...args: any[]) => Promise<unknown>>(
  operation: string,
  fn: T,
  context?: LogContext
) => {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      apiLogger.debug(`Performance: ${operation}`, {
        ...context,
        duration
      });
      return result as Awaited<ReturnType<T>>;
    } catch (error) {
      const duration = Date.now() - start;
      apiLogger.error(`Performance Error: ${operation}`, {
        ...context,
        duration
      }, error as Error);
      throw error;
    }
  };
};

