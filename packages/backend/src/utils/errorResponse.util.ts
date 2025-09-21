// src/utils/errorResponse.util.ts

import { Response } from 'express';
import { logger } from './logger';

/**
 * Standardized error response interface
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
 * Standardized success response interface
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
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
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
  if (error.code && Object.values(ErrorCodes).includes(error.code)) {
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
 * Generate a standardized error response
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
 * Generate a standardized success response
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
 * Send standardized error response
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
 * Send standardized success response
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
