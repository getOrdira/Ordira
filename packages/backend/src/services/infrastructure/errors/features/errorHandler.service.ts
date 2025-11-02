// services/infrastructure/errors/features/errorHandler.service.ts
import { Request, Response, NextFunction } from 'express';
import { getErrorMessage, getErrorStack, getErrorCode, getErrorStatusCode, extractErrorInfo } from '../core/errorExtractor.service';
import { sendErrorResponse } from '../../http';
import { logger } from '../../logging';

/**
 * Enhanced error handler service for Express middleware
 */
export class ErrorHandlerService {
  /**
   * Default error handler middleware
   */
  static handleError(
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const errorInfo = extractErrorInfo(error);
    const statusCode = errorInfo.statusCode || 500;
    
    // Log error with context
    logger.error('Unhandled error:', {
      ...errorInfo,
      requestId: req.headers['x-request-id'] as string,
      method: req.method,
      path: req.path,
      ip: req.ip
    });

    // Send error response
    sendErrorResponse(res, error as any, statusCode, req.headers['x-request-id'] as string);
  }

  /**
   * Handle async errors in route handlers
   */
  static asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Wrap a function to catch and handle errors
   */
  static wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: string
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        if (context) {
          logger.error(`[${context}] Error in wrapped function:`, {
            message: getErrorMessage(error),
            stack: getErrorStack(error),
            code: getErrorCode(error)
          });
        }
        throw error;
      }
    }) as T;
  }

  /**
   * Transform error to safe format for client
   */
  static sanitizeErrorForClient(
    error: unknown,
    isDevelopment: boolean = process.env.NODE_ENV === 'development'
  ): {
    message: string;
    code?: string | number;
    details?: any;
  } {
    const errorInfo = extractErrorInfo(error);
    
    if (isDevelopment) {
      return {
        message: errorInfo.message,
        code: errorInfo.code,
        details: {
          stack: errorInfo.stack,
          name: errorInfo.name
        }
      };
    }

    // In production, only return safe information
    return {
      message: errorInfo.message || 'An unexpected error occurred',
      code: errorInfo.code
    };
  }
}

/**
 * Convenience function for async error handler
 */
export const asyncHandler = ErrorHandlerService.asyncHandler;

/**
 * Convenience function for wrapping async functions
 */
export const wrapAsync = ErrorHandlerService.wrapAsync;

