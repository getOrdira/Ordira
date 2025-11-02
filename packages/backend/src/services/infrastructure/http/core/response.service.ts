// services/infrastructure/http/core/response.service.ts
import { Response } from 'express';
import { logger } from '../../logging';

/**
 * Standardized API response interfaces
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export interface SuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data?: T;
  message?: string;
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

/**
 * Standardized error response interface (alternative format)
 */
export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
  data?: null;
}

/**
 * Standardized success response interface (alternative format)
 */
export interface StandardSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Error codes for consistent error handling
 */
export enum ErrorCodes {
  // Authentication errors
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Business logic errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Security errors
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  
  // Legacy aliases for backward compatibility
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Sanitize error details to prevent information disclosure
 */
function sanitizeErrorDetails(error: any, isDevelopment: boolean = false): any {
  if (isDevelopment) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }

  // In production, only return safe error information
  if (error.code && Object.values(ErrorCodes).includes(error.code as ErrorCodes)) {
    return {
      code: error.code,
      message: error.message
    };
  }

  // For unknown errors, return generic information
  return {
    message: 'An unexpected error occurred'
  };
}

/**
 * Create standardized error response object
 */
export function createErrorResponse(
  error: any,
  requestId?: string,
  isDevelopment: boolean = process.env.NODE_ENV === 'development'
): StandardErrorResponse {
  const sanitizedDetails = sanitizeErrorDetails(error, isDevelopment);
  
  // Log the full error for debugging (but don't expose it to client)
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
    requestId,
    timestamp: new Date().toISOString()
  });

  return {
    success: false,
    error: {
      code: error.code || ErrorCodes.INTERNAL_SERVER_ERROR,
      message: error.message || 'An unexpected error occurred',
      details: sanitizedDetails,
      timestamp: new Date().toISOString(),
      requestId
    },
    data: null
  };
}

/**
 * Create standardized success response object
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  requestId?: string
): StandardSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId
  };
}

/**
 * Send standardized success response
 */
export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200,
  requestId?: string
): void {
  const response: SuccessResponse<T> = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId()
  };

  res.status(statusCode).json(response);
}

/**
 * Send standardized success response (alternative format)
 */
export function sendSuccessResponse<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string,
  requestId?: string
): void {
  const successResponse = createSuccessResponse(data, message, requestId);
  res.status(statusCode).json(successResponse);
}

/**
 * Send standardized error response
 */
export function sendError(
  res: Response,
  error: string,
  statusCode: number = 500,
  code?: string,
  details?: any,
  requestId?: string
): void {
  const response: ErrorResponse = {
    success: false,
    error,
    code,
    details,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId()
  };

  res.status(statusCode).json(response);
}

/**
 * Send standardized error response (alternative format with error object)
 */
export function sendErrorResponse(
  res: Response,
  error: any,
  statusCode: number = 500,
  requestId?: string
): void {
  const errorResponse = createErrorResponse(error, requestId);
  res.status(statusCode).json(errorResponse);
}

/**
 * Send validation error response
 */
export function sendValidationError(
  res: Response,
  message: string,
  details?: any,
  requestId?: string
): void {
  sendError(res, message, 400, ErrorCodes.VALIDATION_ERROR, details, requestId);
}

/**
 * Send unauthorized error response
 */
export function sendUnauthorizedError(
  res: Response,
  message: string = 'Unauthorized',
  requestId?: string
): void {
  sendError(res, message, 401, ErrorCodes.UNAUTHORIZED, undefined, requestId);
}

/**
 * Send forbidden error response
 */
export function sendForbiddenError(
  res: Response,
  message: string = 'Forbidden',
  requestId?: string
): void {
  sendError(res, message, 403, ErrorCodes.FORBIDDEN, undefined, requestId);
}

/**
 * Send not found error response
 */
export function sendNotFoundError(
  res: Response,
  resource: string = 'Resource',
  requestId?: string
): void {
  sendError(res, `${resource} not found`, 404, ErrorCodes.NOT_FOUND, undefined, requestId);
}

/**
 * Send conflict error response
 */
export function sendConflictError(
  res: Response,
  message: string,
  details?: any,
  requestId?: string
): void {
  sendError(res, message, 409, ErrorCodes.CONFLICT, details, requestId);
}

/**
 * Send rate limit error response
 */
export function sendRateLimitError(
  res: Response,
  message: string = 'Too many requests',
  requestId?: string
): void {
  sendError(res, message, 429, ErrorCodes.RATE_LIMIT_EXCEEDED, undefined, requestId);
}

/**
 * Send internal server error response
 */
export function sendInternalError(
  res: Response,
  message: string = 'Internal server error',
  requestId?: string
): void {
  sendError(res, message, 500, ErrorCodes.INTERNAL_ERROR, undefined, requestId);
}

/**
 * Send created response (201)
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message?: string,
  requestId?: string
): void {
  sendSuccess(res, data, message, 201, requestId);
}

/**
 * Send accepted response (202)
 */
export function sendAccepted<T>(
  res: Response,
  data?: T,
  message?: string,
  requestId?: string
): void {
  sendSuccess(res, data, message, 202, requestId);
}

/**
 * Send no content response (204)
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}

/**
 * Send paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  message?: string,
  requestId?: string
): void {
  const response: SuccessResponse<{
    items: T[];
    pagination: typeof pagination;
  }> = {
    success: true,
    message,
    data: {
      items: data,
      pagination
    },
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId()
  };

  res.status(200).json(response);
}

/**
 * Send file download response
 */
export function sendFileDownload(
  res: Response,
  filePath: string,
  fileName: string,
  contentType: string = 'application/octet-stream'
): void {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.download(filePath, fileName);
}

/**
 * Send streaming response
 */
export function sendStreaming(
  res: Response,
  contentType: string = 'application/json'
): Response {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Transfer-Encoding', 'chunked');
  return res;
}

/**
 * Response helper class for more complex scenarios
 */
export class ResponseHelper {
  private requestId: string;
  private res: Response;

  constructor(res: Response, requestId?: string) {
    this.res = res;
    this.requestId = requestId || generateRequestId();
  }

  success<T>(data?: T, message?: string, statusCode: number = 200): void {
    sendSuccess(this.res, data, message, statusCode, this.requestId);
  }

  error(error: string, statusCode: number = 500, code?: string, details?: any): void {
    sendError(this.res, error, statusCode, code, details, this.requestId);
  }

  validationError(message: string, details?: any): void {
    sendValidationError(this.res, message, details, this.requestId);
  }

  unauthorized(message: string = 'Unauthorized'): void {
    sendUnauthorizedError(this.res, message, this.requestId);
  }

  forbidden(message: string = 'Forbidden'): void {
    sendForbiddenError(this.res, message, this.requestId);
  }

  notFound(resource: string = 'Resource'): void {
    sendNotFoundError(this.res, resource, this.requestId);
  }

  conflict(message: string, details?: any): void {
    sendConflictError(this.res, message, details, this.requestId);
  }

  rateLimit(message: string = 'Too many requests'): void {
    sendRateLimitError(this.res, message, this.requestId);
  }

  internalError(message: string = 'Internal server error'): void {
    sendInternalError(this.res, message, this.requestId);
  }

  created<T>(data: T, message?: string): void {
    sendCreated(this.res, data, message, this.requestId);
  }

  accepted<T>(data?: T, message?: string): void {
    sendAccepted(this.res, data, message, this.requestId);
  }

  noContent(): void {
    sendNoContent(this.res);
  }

  paginated<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    },
    message?: string
  ): void {
    sendPaginated(this.res, data, pagination, message, this.requestId);
  }

  getRequestId(): string {
    return this.requestId;
  }
}

/**
 * Middleware to add response helper to request object
 */
export function responseHelperMiddleware(req: any, res: Response, next: any): void {
  req.responseHelper = new ResponseHelper(res);
  next();
}

/**
 * Create a standardized error object
 */
export function createStandardError(
  message: string,
  code: ErrorCodes = ErrorCodes.INTERNAL_SERVER_ERROR,
  statusCode: number = 500,
  details?: any
): Error & { code: string; statusCode: number; details?: any } {
  const error = new Error(message) as any;
  error.code = code;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

/**
 * Validation error helper
 */
export function createValidationError(
  message: string,
  field?: string,
  value?: any
): Error & { code: string; statusCode: number; field?: string; value?: any } {
  const error = new Error(message) as any;
  error.code = ErrorCodes.VALIDATION_ERROR;
  error.statusCode = 400;
  error.field = field;
  error.value = value;
  return error;
}

/**
 * Authentication error helper
 */
export function createAuthError(
  message: string,
  code: ErrorCodes = ErrorCodes.AUTHENTICATION_FAILED
): Error & { code: string; statusCode: number } {
  const error = new Error(message) as any;
  error.code = code;
  error.statusCode = 401;
  return error;
}

/**
 * Authorization error helper
 */
export function createAuthorizationError(
  message: string,
  code: ErrorCodes = ErrorCodes.AUTHORIZATION_FAILED
): Error & { code: string; statusCode: number } {
  const error = new Error(message) as any;
  error.code = code;
  error.statusCode = 403;
  return error;
}

/**
 * Not found error helper
 */
export function createNotFoundError(
  message: string,
  resource?: string
): Error & { code: string; statusCode: number; resource?: string } {
  const error = new Error(message) as any;
  error.code = ErrorCodes.RESOURCE_NOT_FOUND;
  error.statusCode = 404;
  error.resource = resource;
  return error;
}

/**
 * Conflict error helper
 */
export function createConflictError(
  message: string,
  resource?: string
): Error & { code: string; statusCode: number; resource?: string } {
  const error = new Error(message) as any;
  error.code = ErrorCodes.RESOURCE_ALREADY_EXISTS;
  error.statusCode = 409;
  error.resource = resource;
  return error;
}

