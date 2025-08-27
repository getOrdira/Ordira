// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

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
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
  path: string;
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
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
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
 * Determine if error is operational (expected) or programming error
 */
export function isOperationalError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'isOperational' in error) {
    return Boolean((error as any).isOperational);
  }
  
  // Consider errors with statusCode as operational
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = (error as any).statusCode;
    return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500;
  }
  
  return false;
}

/**
 * Generate unique request ID for error tracking
 */
export function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Format date for logging
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC'
  }).format(date);
}

/**
 * Log error with appropriate level and details
 */
export function logError(error: unknown, req: Request, requestId: string): void {
  const errorMessage = getErrorMessage(error);
  const errorStack = getErrorStack(error);
  const isOperational = isOperationalError(error);
  
  const logData = {
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    error: errorMessage,
    isOperational,
    timestamp: formatDate(new Date())
  };

  if (isOperational) {
    // Operational errors are expected and logged at info level
    console.info('[ERROR-OPERATIONAL]', JSON.stringify(logData, null, 2));
  } else {
    // Programming errors are unexpected and logged at error level with stack
    console.error('[ERROR-PROGRAMMING]', JSON.stringify({ ...logData, stack: errorStack }, null, 2));
  }
}

/**
 * Handle Mongoose validation errors
 */
export function handleMongooseValidationError(error: any): AppError {
  const errors = Object.values(error.errors).map((err: any) => ({
    field: err.path,
    message: getErrorMessage(err),
    value: err.value
  }));

  const newError = new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`) as AppError;
  newError.statusCode = 400;
  newError.code = 'VALIDATION_ERROR';
  newError.details = errors;
  newError.isOperational = true;
  
  return newError;
}

/**
 * Handle MongoDB duplicate key errors
 */
export function handleMongoDuplicateKeyError(error: any): AppError {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  
  const newError = new Error(`Duplicate value for field '${field}': ${value}`) as AppError;
  newError.statusCode = 409;
  newError.code = 'DUPLICATE_FIELD';
  newError.details = { field, value };
  newError.isOperational = true;
  
  return newError;
}

/**
 * Handle MongoDB cast errors (invalid ObjectId, etc.)
 */
export function handleMongoCastError(error: any): AppError {
  const newError = new Error(`Invalid ${error.path}: ${error.value}`) as AppError;
  newError.statusCode = 400;
  newError.code = 'INVALID_DATA';
  newError.details = { path: error.path, value: error.value };
  newError.isOperational = true;
  
  return newError;
}

/**
 * Handle JWT errors
 */
export function handleJWTError(error: any): AppError {
  let message = 'Invalid token';
  let code = 'INVALID_TOKEN';
  
  if (error.name === 'TokenExpiredError') {
    message = 'Token has expired';
    code = 'TOKEN_EXPIRED';
  } else if (error.name === 'JsonWebTokenError') {
    message = 'Invalid token format';
    code = 'INVALID_TOKEN_FORMAT';
  }
  
  const newError = new Error(message) as AppError;
  newError.statusCode = 401;
  newError.code = code;
  newError.isOperational = true;
  
  return newError;
}

/**
 * Handle blockchain-specific errors
 */
function handleBlockchainError(error: any): AppError {
  const errorMessage = getErrorMessage(error);
  let statusCode = 500;
  let code = 'BLOCKCHAIN_ERROR';
  
  // Handle specific blockchain error codes
  if (error.code === 'INSUFFICIENT_FUNDS') {
    statusCode = 400;
    code = 'INSUFFICIENT_FUNDS';
  } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    statusCode = 400;
    code = 'GAS_ESTIMATION_FAILED';
  } else if (error.code === 'CALL_EXCEPTION') {
    statusCode = 404;
    code = 'CONTRACT_CALL_FAILED';
  } else if (error.code === 'NETWORK_ERROR') {
    statusCode = 503;
    code = 'BLOCKCHAIN_NETWORK_ERROR';
  }
  
  const newError = new Error(errorMessage) as AppError;
  newError.statusCode = statusCode;
  newError.code = code;
  newError.isOperational = true;
  
  return newError;
}

/**
 * Convert known error types to standardized AppError format
 */
export function normalizeError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof Error && 'statusCode' in error) {
    return error as AppError;
  }
  
  // MongoDB/Mongoose errors
  if (error && typeof error === 'object') {
    const errorObj = error as any;
    
    if (errorObj.name === 'ValidationError') {
      return handleMongooseValidationError(errorObj);
    }
    
    if (errorObj.code === 11000) {
      return handleMongoDuplicateKeyError(errorObj);
    }
    
    if (errorObj.name === 'CastError') {
      return handleMongoCastError(errorObj);
    }
    
    // JWT errors
    if (errorObj.name && ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(errorObj.name)) {
      return handleJWTError(errorObj);
    }
    
    // Blockchain errors (from our custom error classes)
    if (errorObj.name && ['BlockchainError', 'MediaError', 'ProductError', 'WixError', 'ShopifyError', 'WooCommerceError'].includes(errorObj.name)) {
      return handleBlockchainError(errorObj);
    }
  }
  
  // Generic Error
  if (error instanceof Error) {
    const appError = error as AppError;
    appError.statusCode = appError.statusCode || 500;
    appError.isOperational = appError.isOperational || false;
    return appError;
  }
  
  // Unknown error type
  const newError = new Error(getErrorMessage(error)) as AppError;
  newError.statusCode = 500;
  newError.isOperational = false;
  
  return newError;
}

/**
 * Enhanced error handler middleware with comprehensive error processing
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = generateRequestId();
  
  // Handle Multer-specific errors first
  if (err instanceof multer.MulterError) {
    const multerError = new Error(getErrorMessage(err)) as AppError;
    multerError.statusCode = 400;
    multerError.code = err.code;
    multerError.isOperational = true;
    
    logError(multerError, req, requestId);
    
    const response: ErrorResponse = {
      error: multerError.message,
      code: multerError.code,
      timestamp: new Date().toISOString(),
      path: req.path,
      requestId
    };
    
    res.status(400).json(response)
    return;
  }
  
  // Normalize the error
  const normalizedError = normalizeError(err);
  
  // Log the error
  logError(normalizedError, req, requestId);
  
  // Determine response status and message
  const status = normalizedError.statusCode || 500;
  const message = normalizedError.message || 'Internal Server Error';
  
  // In production, don't expose internal error details for 5xx errors
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldHideDetails = isProduction && status >= 500;
  
  const response: ErrorResponse = {
    error: shouldHideDetails ? 'Internal Server Error' : message,
    code: normalizedError.code,
    details: shouldHideDetails ? undefined : normalizedError.details,
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId
  };
  
  // Add additional context in development
  if (!isProduction && status >= 500) {
    (response as any).stack = getErrorStack(normalizedError);
  }
  
  res.status(status).json(response);
}

/**
 * Handle 404 errors for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  const requestId = generateRequestId();
  
  const response: ErrorResponse = {
    error: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId
  };
  
  console.info('[404-NOT-FOUND]', JSON.stringify({
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  }));
  
  res.status(404).json(response);
}

/**
 * Async error wrapper to catch async errors in route handlers
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create standardized operational error
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
 * Validation error helper
 */
export function createValidationError(message: string, details?: any): AppError {
  return createAppError(message, 400, 'VALIDATION_ERROR', details);
}

/**
 * Not found error helper
 */
export function createNotFoundError(resource: string): AppError {
  return createAppError(`${resource} not found`, 404, 'NOT_FOUND');
}

/**
 * Unauthorized error helper
 */
export function createUnauthorizedError(message: string = 'Unauthorized'): AppError {
  return createAppError(message, 401, 'UNAUTHORIZED');
}

/**
 * Forbidden error helper
 */
export function createForbiddenError(message: string = 'Forbidden'): AppError {
  return createAppError(message, 403, 'FORBIDDEN');
}

/**
 * Conflict error helper
 */
export function createConflictError(message: string, details?: any): AppError {
  return createAppError(message, 409, 'CONFLICT', details);
}

/**
 * Rate limit error helper
 */
export function createRateLimitError(message: string = 'Too many requests'): AppError {
  return createAppError(message, 429, 'RATE_LIMIT_EXCEEDED');
}