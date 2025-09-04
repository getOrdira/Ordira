// src/lib/errors.ts

export class ApiError extends Error {
    statusCode: number;
    code?: string;
    data?: any;
    details?: any;
  
    constructor(message: string, statusCode = 500, code?: string, data?: any) {
      super(message);
      this.name = 'ApiError';
      this.statusCode = statusCode;
      this.code = code;
      this.data = data;
    }
  
    // Check if error is retryable
    get isRetryable(): boolean {
      return this.statusCode >= 500 || this.statusCode === 408 || this.statusCode === 429;
    }
  
    // Check if error is client error
    get isClientError(): boolean {
      return this.statusCode >= 400 && this.statusCode < 500;
    }
  }
  
  // Network related errors
  export class NetworkError extends Error {
    isOffline: boolean;
  
    constructor(message: string = 'Network error occurred', isOffline = false) {
      super(message);
      this.name = 'NetworkError';
      this.isOffline = isOffline;
    }
  }
  
  // Authentication errors (aligned with backend auth patterns)
  export class AuthError extends ApiError {
    constructor(message: string = 'Authentication failed', statusCode = 401, code?: string) {
      super(message, statusCode, code);
      this.name = 'AuthError';
    }
  }
  
  // Authorization errors
  export class ForbiddenError extends ApiError {
    constructor(message: string = 'Access forbidden', code?: string) {
      super(message, 403, code);
      this.name = 'ForbiddenError';
    }
  }
  
  // Validation errors (aligned with backend validation patterns)
  export class ValidationError extends Error {
    field: string;
    details?: any;
    errors?: Record<string, string[]>;
  
    constructor(message: string, field: string, details?: any, errors?: Record<string, string[]>) {
      super(message);
      this.name = 'ValidationError';
      this.field = field;
      this.details = details;
      this.errors = errors;
    }
  }
  
  // Not found errors
  export class NotFoundError extends ApiError {
    resource?: string;
  
    constructor(message: string = 'Resource not found', resource?: string) {
      super(message, 404, 'RESOURCE_NOT_FOUND');
      this.name = 'NotFoundError';
      this.resource = resource;
    }
  }
  
  // Rate limiting errors
  export class RateLimitError extends ApiError {
    retryAfter?: number;
  
    constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
      super(message, 429, 'RATE_LIMIT_EXCEEDED');
      this.name = 'RateLimitError';
      this.retryAfter = retryAfter;
    }
  }
  
  // Business logic errors (aligned with your backend business rules)
  export class BusinessError extends ApiError {
    constructor(message: string, code?: string, data?: any) {
      super(message, 422, code, data);
      this.name = 'BusinessError';
    }
  }
  
  // Plan/subscription related errors
  export class PlanLimitError extends BusinessError {
    currentPlan?: string;
    requiredPlan?: string;
    
    constructor(message: string, currentPlan?: string, requiredPlan?: string) {
      super(message, 'PLAN_LIMIT_EXCEEDED', { currentPlan, requiredPlan });
      this.name = 'PlanLimitError';
      this.currentPlan = currentPlan;
      this.requiredPlan = requiredPlan;
    }
  }
  
  // Web3/Blockchain errors (for your NFT certificate features)
  export class Web3Error extends Error {
    code?: string;
    reason?: string;
  
    constructor(message: string, code?: string, reason?: string) {
      super(message);
      this.name = 'Web3Error';
      this.code = code;
      this.reason = reason;
    }
  }
  
  // File upload errors
  export class UploadError extends ApiError {
    fileSize?: number;
    maxSize?: number;
    fileType?: string;
  
    constructor(message: string, details?: { fileSize?: number; maxSize?: number; fileType?: string }) {
      super(message, 413, 'UPLOAD_ERROR', details);
      this.name = 'UploadError';
      this.fileSize = details?.fileSize;
      this.maxSize = details?.maxSize;
      this.fileType = details?.fileType;
    }
  }
  
  // Error creation helpers aligned with backend error responses
  export const createErrorFromResponse = (error: any): ApiError => {
    // Handle Axios/fetch response errors
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.error || 'API error occurred';
      const code = data?.code;
      
      // Map to specific error types based on status codes
      switch (status) {
        case 400:
          if (data?.errors) {
            return new ValidationError(message, data.field || 'unknown', data.details, data.errors);
          }
          return new ApiError(message, status, code, data);
        case 401:
          return new AuthError(message, status, code);
        case 403:
          return new ForbiddenError(message, code);
        case 404:
          return new NotFoundError(message, data?.resource);
        case 422:
          return new BusinessError(message, code, data);
        case 429:
          return new RateLimitError(message, data?.retryAfter);
        default:
          return new ApiError(message, status, code, data);
      }
    }
  
    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('network')) {
      return new NetworkError(error.message);
    }
  
    // Handle timeout errors
    if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
      return new NetworkError('Request timeout', false);
    }
  
    // Default to generic ApiError
    return new ApiError(error.message || 'Unknown error occurred', 500);
  };
  
  // Error type guards
  export const isApiError = (error: unknown): error is ApiError => {
    return error instanceof ApiError;
  };
  
  export const isAuthError = (error: unknown): error is AuthError => {
    return error instanceof AuthError;
  };
  
  export const isValidationError = (error: unknown): error is ValidationError => {
    return error instanceof ValidationError;
  };
  
  export const isNetworkError = (error: unknown): error is NetworkError => {
    return error instanceof NetworkError;
  };
  
  export const isPlanLimitError = (error: unknown): error is PlanLimitError => {
    return error instanceof PlanLimitError;
  };
  
  // Error message helpers
  export const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unexpected error occurred';
  };
  
  // Get user-friendly error message
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