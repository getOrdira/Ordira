// src/lib/errors.ts

import {
  sanitizeSensitiveString,
  sanitizeSensitiveObject,
  sanitizeErrorForLogging
} from '../security/sensitiveData';

interface ApiErrorMetadata {
  requestId?: string;
  context?: Record<string, unknown>;
  details?: unknown;
  timestamp?: string;
  cause?: unknown;
}

export interface SerializedError {
  name: string;
  message: string;
  code?: string | number;
  statusCode?: number;
  retryable?: boolean;
  data?: unknown;
  details?: unknown;
  stack?: string;
  context?: Record<string, unknown>;
  requestId?: string;
  timestamp?: string;
}

interface HttpErrorLike {
  response?: {
    status?: number;
    data?: any;
    headers?: Record<string, unknown>;
  };
  request?: unknown;
  code?: string;
  message?: string;
}

const isHttpErrorLike = (value: unknown): value is HttpErrorLike => {
  return typeof value === 'object' && value !== null && ('response' in value || 'request' in value);
};

const NETWORK_ERROR_CODES = new Set(['ECONNRESET', 'ECONNABORTED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNREFUSED']);

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  data?: unknown;
  details?: unknown;
  context?: Record<string, unknown>;
  requestId?: string;
  timestamp: string;

  constructor(message: string, statusCode = 500, code?: string, data?: unknown, metadata?: ApiErrorMetadata) {
    const sanitizedMessage = sanitizeSensitiveString(message);
    super(sanitizedMessage);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.data = data ? sanitizeSensitiveObject(data) : undefined;
    const mergedDetails = metadata?.details ?? this.data;
    this.details = mergedDetails ? sanitizeSensitiveObject(mergedDetails) : undefined;
    this.context = metadata?.context ? sanitizeSensitiveObject(metadata.context) : undefined;
    this.requestId = metadata?.requestId;
    this.timestamp = metadata?.timestamp ?? new Date().toISOString();
    if (metadata?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = metadata.cause;
    }
  }

  get isRetryable(): boolean {
    return this.statusCode >= 500 || this.statusCode === 408 || this.statusCode === 429;
  }

  get isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  toJSON(): SerializedError {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      retryable: this.isRetryable,
      data: this.data,
      details: this.details,
      stack: this.stack,
      context: this.context,
      requestId: this.requestId,
      timestamp: this.timestamp
    };
  }

  toLogObject(): Record<string, unknown> {
    const sanitized = sanitizeErrorForLogging(this) as Record<string, unknown>;
    return {
      ...sanitized,
      requestId: this.requestId,
      timestamp: this.timestamp,
      context: this.context ? sanitizeSensitiveObject(this.context) : undefined
    };
  }
}

export class NetworkError extends ApiError {
  isOffline: boolean;

  constructor(message = 'Network error occurred', isOffline = false, metadata?: ApiErrorMetadata) {
    super(message, 503, 'NETWORK_ERROR', undefined, metadata);
    this.name = 'NetworkError';
    this.isOffline = isOffline;
  }
}

export class AuthError extends ApiError {
  constructor(message = 'Authentication failed', statusCode = 401, code?: string, metadata?: ApiErrorMetadata) {
    super(message, statusCode, code ?? 'AUTHENTICATION_FAILED', undefined, metadata);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Access forbidden', code?: string, metadata?: ApiErrorMetadata) {
    super(message, 403, code ?? 'FORBIDDEN', undefined, metadata);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends ApiError {
  field: string;
  errors?: Record<string, string[]>;

  constructor(message: string, field: string, details?: unknown, errors?: Record<string, string[]>, metadata?: ApiErrorMetadata) {
    const sanitizedDetails = details ? sanitizeSensitiveObject(details) : undefined;
    const sanitizedErrors = errors ? sanitizeSensitiveObject(errors) : undefined;
    const payload = {
      field,
      details: sanitizedDetails,
      errors: sanitizedErrors
    };
    super(message, 400, 'VALIDATION_ERROR', payload, { ...metadata, details: payload });
    this.name = 'ValidationError';
    this.field = field;
    this.details = sanitizedDetails;
    this.errors = sanitizedErrors;
  }
}

export class NotFoundError extends ApiError {
  resource?: string;

  constructor(message = 'Resource not found', resource?: string, metadata?: ApiErrorMetadata) {
    super(message, 404, 'RESOURCE_NOT_FOUND', { resource }, metadata);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

export class RateLimitError extends ApiError {
  retryAfter?: number;

  constructor(message = 'Rate limit exceeded', retryAfter?: number, metadata?: ApiErrorMetadata) {
    const payload = retryAfter ? { retryAfter } : undefined;
    super(message, 429, 'RATE_LIMIT_EXCEEDED', payload, metadata);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class BusinessError extends ApiError {
  constructor(message: string, code?: string, data?: unknown, metadata?: ApiErrorMetadata) {
    super(message, 422, code ?? 'BUSINESS_ERROR', data, metadata);
    this.name = 'BusinessError';
  }
}

export class PlanLimitError extends BusinessError {
  currentPlan?: string;
  requiredPlan?: string;

  constructor(message: string, currentPlan?: string, requiredPlan?: string, metadata?: ApiErrorMetadata) {
    const payload = { currentPlan, requiredPlan };
    super(message, 'PLAN_LIMIT_EXCEEDED', payload, metadata);
    this.name = 'PlanLimitError';
    this.currentPlan = currentPlan;
    this.requiredPlan = requiredPlan;
  }
}

export class Web3Error extends ApiError {
  reason?: string;

  constructor(message: string, code?: string, reason?: string, metadata?: ApiErrorMetadata) {
    const payload = reason ? { reason } : undefined;
    super(message, 502, code ?? 'WEB3_ERROR', payload, metadata);
    this.name = 'Web3Error';
    this.reason = reason;
  }
}

export class UploadError extends ApiError {
  fileSize?: number;
  maxSize?: number;
  fileType?: string;

  constructor(message: string, details?: { fileSize?: number; maxSize?: number; fileType?: string }, metadata?: ApiErrorMetadata) {
    super(message, 413, 'UPLOAD_ERROR', details, metadata);
    this.name = 'UploadError';
    this.fileSize = details?.fileSize;
    this.maxSize = details?.maxSize;
    this.fileType = details?.fileType;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export const isAuthError = (error: unknown): error is AuthError => error instanceof AuthError;

export const isValidationError = (error: unknown): error is ValidationError => error instanceof ValidationError;

export const isNetworkError = (error: unknown): error is NetworkError => error instanceof NetworkError;

export const isPlanLimitError = (error: unknown): error is PlanLimitError => error instanceof PlanLimitError;

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return sanitizeSensitiveString(error.message);
  }
  if (typeof error === 'string') {
    return sanitizeSensitiveString(error);
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return sanitizeSensitiveString(String((error as { message: unknown }).message));
  }
  return 'An unexpected error occurred';
};

export const getErrorStack = (error: unknown): string | undefined => {
  if (error instanceof Error && typeof error.stack === 'string') {
    return sanitizeSensitiveString(error.stack);
  }
  return undefined;
};

export const getErrorCode = (error: unknown): string | number | undefined => {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string' || typeof code === 'number') {
      return code;
    }
  }
  return undefined;
};

export const getStatusCode = (error: unknown): number => {
  if (error instanceof ApiError) {
    return error.statusCode;
  }

  if (error && typeof error === 'object' && 'statusCode' in error) {
    const status = (error as { statusCode?: unknown }).statusCode;
    if (typeof status === 'number') {
      return status;
    }
  }

  if (isHttpErrorLike(error) && typeof error.response?.status === 'number') {
    return error.response.status;
  }

  return 500;
};

export const extractErrorInfo = (error: unknown): SerializedError => {
  const statusCode = getStatusCode(error);
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  const stack = getErrorStack(error);

  return {
    name: error instanceof Error ? error.name : 'Error',
    message,
    code,
    statusCode,
    retryable: statusCode >= 500,
    stack
  };
};

const isNetworkLikeError = (error: HttpErrorLike): boolean => {
  const code = error.code ? String(error.code).toUpperCase() : undefined;
  if (code && NETWORK_ERROR_CODES.has(code)) {
    return true;
  }
  const message = error.message?.toLowerCase() ?? '';
  if (message.includes('network') || message.includes('timeout')) {
    return true;
  }
  return Boolean(error.request && !error.response);
};

export const createErrorFromResponse = (error: unknown): ApiError => {
  if (isHttpErrorLike(error) && error.response) {
    const status = typeof error.response.status === 'number' ? error.response.status : 500;
    const rawData = error.response.data ?? {};
    const data = sanitizeSensitiveObject(rawData);
    const message = sanitizeSensitiveString(
      (data && typeof data === 'object' && 'message' in data ? String((data as { message: unknown }).message) : undefined) ||
        (data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : undefined) ||
        error.message ||
        'API error occurred'
    );
    const code = (data && typeof data === 'object' && typeof (data as { code?: unknown }).code === 'string')
      ? ((data as { code: string }).code)
      : undefined;
    const requestId = typeof error.response.headers?.['x-request-id'] === 'string'
      ? String(error.response.headers['x-request-id'])
      : undefined;

    switch (status) {
      case 400:
        if (data && typeof data === 'object' && ('errors' in data || 'field' in data)) {
          const field = typeof (data as { field?: unknown }).field === 'string' ? (data as { field: string }).field : 'unknown';
          const details = (data as { details?: unknown }).details ?? data;
          const errors = (data as { errors?: Record<string, string[]> }).errors;
          return new ValidationError(message, field, details, errors, { requestId });
        }
        return new ApiError(message, status, code, data, { requestId });
      case 401:
        return new AuthError(message, status, code, { requestId });
      case 403:
        return new ForbiddenError(message, code, { requestId });
      case 404:
        return new NotFoundError(message, (data as { resource?: string })?.resource, { requestId });
      case 422:
        return new BusinessError(message, code, data, { requestId });
      case 429:
        return new RateLimitError(message, (data as { retryAfter?: number })?.retryAfter, { requestId });
      default:
        return new ApiError(message, status, code, data, { requestId });
    }
  }

  if (isHttpErrorLike(error) && isNetworkLikeError(error)) {
    return new NetworkError(getErrorMessage(error), false);
  }

  if (isHttpErrorLike(error) && error.code && String(error.code).toUpperCase() === 'ETIMEDOUT') {
    return new NetworkError('Request timeout', false);
  }

  return new ApiError(getErrorMessage(error), getStatusCode(error), typeof getErrorCode(error) === 'string' ? String(getErrorCode(error)) : undefined);
};

export const getFriendlyErrorMessage = (error: unknown): string => {
  if (isAuthError(error)) {
    return 'Please sign in to continue';
  }
  if (isNetworkError(error)) {
    return 'Please check your internet connection and try again';
  }
  if (isPlanLimitError(error)) {
    return `This feature requires a ${error.requiredPlan} plan. Please upgrade to continue.`;
  }
  if (isValidationError(error)) {
    return error.message;
  }
  if (isApiError(error)) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
};