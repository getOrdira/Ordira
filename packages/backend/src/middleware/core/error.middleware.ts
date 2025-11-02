// src/middleware/core/error.middleware.ts
// Updated error middleware with structured logging integration

import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { MulterError } from '../../services/infrastructure/types/declarations';
import { hasErrorMessage, isOperationalErrorType, hasErrorStatusCode } from '../../utils/typeGuards';
import { logger, LogContext } from '../../services/infrastructure/logging';

// ===== TYPE DEFINITIONS =====

// Extended Request interface for custom request properties
interface ExtendedRequest extends Request {
  userId?: string;
  businessId?: string;
  tenant?: {
    business?: {
      toString(): string;
    };
  };
}

// Extended Error interface for custom error properties
interface ExtendedError extends Error {
  collection?: string;
  permission?: string;
}

/**
 * Custom error interface for structured error handling
 */
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

/**
 * Safely extract error message from unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (hasErrorMessage(error)) {
    return error.message;
  }
  
  return 'An unknown error occurred';
}

/**
 * Safely extract error stack from unknown error types
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Safely extract error code from unknown error types
 */
export function getErrorCode(error: unknown): string | number | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' || typeof code === 'number' ? code : undefined;
  }
  return undefined;
}

/**
 * Create a structured application error
 */
export function createAppError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  error.isOperational = true;
  return error;
}

/**
 * Enhanced error middleware with structured logging
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const extendedReq = req as ExtendedRequest;
  const context: LogContext = {
    requestId: req.headers['x-request-id'] as string,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    endpoint: req.path,
    method: req.method,
    userId: extendedReq.userId,
    businessId: extendedReq.businessId,
    tenantId: extendedReq.tenant?.business?.toString()
  };

  // Determine error type and log appropriately
  if (error instanceof MulterError) {
    logger.logSecurityEvent('file_upload_error', {
      ...context,
      errorCode: error.code,
      field: error.field,
      message: error.message
    });
  } else if (isOperationalErrorType(error)) {
    logger.warn('Operational Error', {
      ...context,
      errorCode: error.code,
      statusCode: error.statusCode,
      message: error.message
    });
  } else {
    logger.logError(error, context);
  }

  // Prepare error response
  const statusCode = hasErrorStatusCode(error) ? error.statusCode : 500;
  const errorCode = getErrorCode(error);
  const errorMessage = getErrorMessage(error);

  const errorResponse: ErrorResponse = {
    success: false,
    error: errorMessage,
    code: errorCode?.toString(),
    timestamp: new Date().toISOString(),
    requestId: context.requestId
  };

  // Add details for development environment
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      stack: getErrorStack(error),
      originalError: error.name
    };
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Handle 404 errors with structured logging
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context = logger.createContext(req);
  
  logger.logSecurityEvent('endpoint_not_found', {
    ...context,
    attemptedPath: req.path,
    method: req.method
  });

  const error = createAppError(
    `Route ${req.method} ${req.path} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );

  next(error);
}

/**
 * Handle async errors with structured logging
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      const context = logger.createContext(req);
      logger.logError(error, context);
      next(error);
    });
  };
}

/**
 * Validation error handler
 */
export function validationErrorHandler(
  field: string,
  value: any,
  message: string,
  req: Request
): void {
  const context = logger.createContext(req);
  
  logger.logValidationError(field, value, {
    ...context,
    validationMessage: message
  });
}

/**
 * Rate limit error handler
 */
export function rateLimitErrorHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context = logger.createContext(req);
  
  logger.logSecurityEvent('rate_limit_exceeded', {
    ...context,
    limit: req.headers['x-ratelimit-limit'],
    remaining: req.headers['x-ratelimit-remaining'],
    reset: req.headers['x-ratelimit-reset']
  });

  const error = createAppError(
    'Too many requests, please try again later',
    429,
    'RATE_LIMIT_EXCEEDED'
  );

  next(error);
}

/**
 * Database error handler
 */
export function databaseErrorHandler(
  error: Error,
  operation: string,
  context?: LogContext
): void {
  const extendedError = error as ExtendedError;
  logger.logError(error, {
    ...context,
    operation,
    errorType: 'database_error',
    collection: extendedError.collection
  });
}

/**
 * Authentication error handler
 */
export function authErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context = logger.createContext(req);
  
  logger.logSecurityEvent('authentication_failed', {
    ...context,
    errorType: error.name,
    message: error.message
  });

  const authError = createAppError(
    'Authentication failed',
    401,
    'AUTH_FAILED'
  );

  next(authError);
}

/**
 * Authorization error handler
 */
export function authorizationErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context = logger.createContext(req);
  
  const extendedError = error as ExtendedError;
  logger.logSecurityEvent('authorization_failed', {
    ...context,
    errorType: error.name,
    message: error.message,
    requiredPermission: extendedError.permission
  });

  const authError = createAppError(
    'Insufficient permissions',
    403,
    'AUTHORIZATION_FAILED'
  );

  next(authError);
}

