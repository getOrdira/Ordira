// src/controllers/utils/response.helpers.ts
// Standardized response formatting utilities

import { Response } from 'express';
import { logger } from '../../utils/logger';

/**
 * Standard API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: ResponseMeta;
  timestamp: string;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

/**
 * Error response interface
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

/**
 * Response metadata interface
 */
export interface ResponseMeta {
  requestId?: string;
  processingTime?: number;
  cacheHit?: boolean;
  version?: string;
}

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Response helper class for standardized API responses
 */
export class ResponseHelpers {
  /**
   * Send successful response
   */
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    meta?: ResponseMeta,
    statusCode: number = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      meta: {
        ...meta,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message?: string,
    meta?: ResponseMeta,
    statusCode: number = 200
  ): void {
    const response: PaginatedResponse<T> = {
      success: true,
      data,
      message,
      pagination,
      meta: {
        ...meta,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    error: {
      code: string;
      message: string;
      details?: any;
    },
    statusCode: number = 400
  ): void {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        ...error,
        details: error.details || undefined
      },
      timestamp: new Date().toISOString()
    };

    logger.error('API Error Response', {
      error: response.error,
      statusCode,
      timestamp: response.timestamp
    });

    res.status(statusCode).json(response);
  }

  /**
   * Send created response
   */
  static created<T>(
    res: Response,
    data: T,
    message?: string,
    meta?: ResponseMeta
  ): void {
    ResponseHelpers.success(res, data, message, meta, 201);
  }

  /**
   * Send no content response
   */
  static noContent(res: Response, message?: string): void {
    const response: ApiResponse = {
      success: true,
      message: message || 'No content',
      timestamp: new Date().toISOString()
    };

    res.status(204).json(response);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(res: Response, message: string = 'Unauthorized'): void {
    ResponseHelpers.error(res, {
      code: 'UNAUTHORIZED',
      message
    }, 401);
  }

  /**
   * Send forbidden response
   */
  static forbidden(res: Response, message: string = 'Forbidden'): void {
    ResponseHelpers.error(res, {
      code: 'FORBIDDEN',
      message
    }, 403);
  }

  /**
   * Send not found response
   */
  static notFound(res: Response, message: string = 'Resource not found'): void {
    ResponseHelpers.error(res, {
      code: 'NOT_FOUND',
      message
    }, 404);
  }

  /**
   * Send validation error response
   */
  static validationError(
    res: Response,
    message: string = 'Validation failed',
    details?: any
  ): void {
    ResponseHelpers.error(res, {
      code: 'VALIDATION_ERROR',
      message,
      details
    }, 422);
  }

  /**
   * Send internal server error response
   */
  static internalError(
    res: Response,
    message: string = 'Internal server error',
    details?: any
  ): void {
    ResponseHelpers.error(res, {
      code: 'INTERNAL_ERROR',
      message,
      details
    }, 500);
  }
}
