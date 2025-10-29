// src/controllers/utils/error.helpers.ts
// Error handling utilities for controllers

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { ResponseHelpers } from './response.helpers';

/**
 * Application error interface
 */
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

/**
 * Error handler middleware
 */
export class ErrorHelpers {
  /**
   * Create application error
   */
  static createError(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ): AppError {
    const error: AppError = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    error.isOperational = true;
    return error;
  }

  /**
   * Handle async errors
   */
  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Global error handler middleware
   */
  static globalErrorHandler(
    error: AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // Log error
    logger.error('Controller Error', {
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        details: error.details
      },
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        params: req.params,
        query: req.query
      },
      timestamp: new Date().toISOString()
    });

    // Handle different error types
    if (error.name === 'ValidationError') {
      ResponseHelpers.validationError(
        res,
        'Validation failed',
        error.details
      );
      return;
    }

    if (error.name === 'CastError') {
      ResponseHelpers.error(res, {
        code: 'INVALID_ID',
        message: 'Invalid ID format'
      }, 400);
      return;
    }

    if (error.name === 'MongoError' && error.code === 11000) {
      ResponseHelpers.error(res, {
        code: 'DUPLICATE_KEY',
        message: 'Resource already exists'
      }, 409);
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      ResponseHelpers.unauthorized(res, 'Invalid token');
      return;
    }

    if (error.name === 'TokenExpiredError') {
      ResponseHelpers.unauthorized(res, 'Token expired');
      return;
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    const message = error.isOperational ? error.message : 'Internal server error';

    ResponseHelpers.error(res, {
      code: error.code || 'INTERNAL_ERROR',
      message,
      details: process.env.NODE_ENV === 'development' ? error.details : undefined
    }, statusCode);
  }

  /**
   * Handle not found errors
   */
  static notFoundHandler(req: Request, res: Response, next: NextFunction): void {
    ResponseHelpers.notFound(res, `Route ${req.originalUrl} not found`);
  }

  /**
   * Validate request body
   */
  static validateBody<T>(req: Request & { validatedBody?: T }, res: Response, next: NextFunction): void {
    if (!req.validatedBody) {
      ResponseHelpers.validationError(res, 'Request body validation required');
      return;
    }
    next();
  }

  /**
   * Validate request query
   */
  static validateQuery<T>(req: Request & { validatedQuery?: T }, res: Response, next: NextFunction): void {
    if (!req.validatedQuery) {
      ResponseHelpers.validationError(res, 'Request query validation required');
      return;
    }
    next();
  }

  /**
   * Validate request params
   */
  static validateParams<T>(req: Request & { validatedParams?: T }, res: Response, next: NextFunction): void {
    if (!req.validatedParams) {
      ResponseHelpers.validationError(res, 'Request params validation required');
      return;
    }
    next();
  }

  /**
   * Handle service errors
   */
  static handleServiceError(error: any, res: Response, defaultMessage: string = 'Service error'): void {
    if (error.isOperational) {
      ResponseHelpers.error(res, {
        code: error.code || 'SERVICE_ERROR',
        message: error.message,
        details: error.details
      }, error.statusCode || 400);
    } else {
      ResponseHelpers.internalError(res, defaultMessage);
    }
  }
}
