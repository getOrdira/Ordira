// services/infrastructure/errors/utils/errorTypes.ts

/**
 * Base error interface for application errors
 */
export interface AppError extends Error {
  code?: string | number;
  statusCode?: number;
  details?: any;
  isOperational?: boolean;
}

/**
 * Operational error - expected errors that are handled gracefully
 */
export interface OperationalError extends AppError {
  isOperational: true;
  statusCode: number;
  code: string;
}

/**
 * Validation error interface
 */
export interface ValidationError extends AppError {
  code: 'VALIDATION_ERROR' | string;
  statusCode: 400;
  field?: string;
  value?: any;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Authentication error interface
 */
export interface AuthenticationError extends AppError {
  code: 'AUTHENTICATION_FAILED' | 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | string;
  statusCode: 401;
}

/**
 * Authorization error interface
 */
export interface AuthorizationError extends AppError {
  code: 'AUTHORIZATION_FAILED' | 'FORBIDDEN' | string;
  statusCode: 403;
}

/**
 * Not found error interface
 */
export interface NotFoundError extends AppError {
  code: 'RESOURCE_NOT_FOUND' | 'NOT_FOUND' | string;
  statusCode: 404;
  resource?: string;
}

/**
 * Conflict error interface
 */
export interface ConflictError extends AppError {
  code: 'RESOURCE_ALREADY_EXISTS' | 'CONFLICT' | string;
  statusCode: 409;
  resource?: string;
}

/**
 * Type guard to check if error is operational
 */
export function isOperationalError(error: unknown): error is OperationalError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isOperational' in error &&
    (error as OperationalError).isOperational === true
  );
}

/**
 * Type guard to check if error has status code
 */
export function hasStatusCode(error: unknown): error is { statusCode: number } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number'
  );
}

