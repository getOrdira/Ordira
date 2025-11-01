/**
 * Core Middleware Module
 * 
 * Application-level middleware for error handling, logging, and core functionality
 */

export {
  AppError,
  ErrorResponse,
  getErrorMessage,
  getErrorStack,
  getErrorCode,
  createAppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validationErrorHandler,
  rateLimitErrorHandler,
  databaseErrorHandler,
  authErrorHandler,
  authorizationErrorHandler
} from './error.middleware';

export {
  loggingMiddleware,
  productionLoggingMiddleware,
  developmentLoggingMiddleware,
  minimalLoggingMiddleware,
  auditLoggingMiddleware,
  LoggingMiddlewareOptions
} from './logging.middleware';

