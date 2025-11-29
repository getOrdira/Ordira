// src/controllers/core/base.controller.ts
// Base controller with common patterns for all controllers

import { Request, Response, NextFunction } from 'express';
import { logger, LogLevel } from '../../services/infrastructure/logging/index';
import { getServices } from '../../services/container/container.getters';
import { ResponseHelpers, ResponseMeta } from '../utils/response.helpers';
import { ErrorHelpers, AppError } from '../utils/error.helpers';
import { ValidationHelpers } from '../utils/validation.helpers';
import { PerformanceHelpers } from '../utils/performance.helpers';

/**
 * Enhanced request interface with all middleware properties
 */
export interface BaseRequest extends Request {
  // Core auth/tenant context populated by middleware
  userId?: string;
  userType?: 'business' | 'manufacturer' | 'customer' | 'user';
  businessId?: string;
  manufacturerId?: string;
  tenantId?: string;

  // Validation helpers
  validatedBody?: any;
  validatedQuery?: any;
  validatedParams?: any;
  performanceMetrics?: any;

  // Explicitly mirror key Express request properties to avoid missing type augments
  headers: Request['headers'];
  params: Request['params'];
  query: Request['query'];
  body: Request['body'];
  ip: Request['ip'];
  path: Request['path'];
  hostname: Request['hostname'];
  method: Request['method'];
  url: Request['url'];
  get: Request['get'];
  file?: Request['file'];
  files?: Request['files'];
}

/**
 * Public logger interface (excludes private properties)
 * Uses the existing StructuredLogger with built-in sanitization
 */
export interface PublicLogger {
  error(message: string, context?: any, error?: Error): void;
  warn(message: string, context?: any): void;
  info(message: string, context?: any): void;
  debug(message: string, context?: any): void;
  trace(message: string, context?: any): void;
  logError(error: Error, context?: any): void;
  logRequest(req: Request, context?: any): void;
  logResponse(req: Request, res: Response, duration: number, context?: any): void;
  logSafe(level: any, message: string, data?: any, context?: any): void;
  logConfigSafe(message: string, configData?: any, context?: any): void;
  createContext(req?: Request): any;
}

/**
 * Base controller class with common patterns
 */
export abstract class BaseController {
  public services: ReturnType<typeof getServices>;
  public logger: PublicLogger = logger;

  constructor() {
    this.services = getServices();
  }

  /**
   * Send successful response
   */
  protected sendSuccess<T>(
    res: Response,
    data: T,
    message?: string,
    meta?: ResponseMeta,
    statusCode: number = 200
  ): void {
    ResponseHelpers.success(res, data, message, meta, statusCode);
  }

  /**
   * Send paginated response
   */
  protected sendPaginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    },
    message?: string,
    meta?: ResponseMeta
  ): void {
    ResponseHelpers.paginated(res, data, pagination, message, meta);
  }

  /**
   * Send error response
   */
  protected sendError(
    res: Response,
    error: AppError | Error | string | { statusCode?: number; message?: string; code?: string; details?: any },
    statusCode?: number
  ): void {
    if (typeof error === 'string') {
      ResponseHelpers.error(res, {
        code: 'CONTROLLER_ERROR',
        message: error
      }, statusCode || 400);
    } else if (error && typeof error === 'object' && ('code' in error || 'statusCode' in error)) {
      // AppError or plain error object case
      const appError = error as AppError | { statusCode?: number; message?: string; code?: string; details?: any };
      ResponseHelpers.error(res, {
        code: appError.code || 'CONTROLLER_ERROR',
        message: appError.message || 'An error occurred',
        details: (appError as AppError).details
      }, statusCode || appError.statusCode || 400);
    } else {
      // Regular Error case
      ErrorHelpers.handleServiceError(error as Error, res);
    }
  }

  /**
   * Handle async operations with error catching
   */
  protected async handleAsync<T>(
    operation: () => Promise<T>,
    res: Response,
    successMessage?: string,
    meta?: ResponseMeta
  ): Promise<void> {
    try {
      const result = await operation();
      this.sendSuccess(res, result, successMessage, meta);
    } catch (error) {
      this.sendError(res, error as Error);
    }
  }

  /**
   * Validate request body
   */
  protected validateBody<T>(
    req: BaseRequest,
    res: Response,
    next: NextFunction,
    requiredFields?: string[]
  ): void {
    if (!req.validatedBody) {
      ResponseHelpers.validationError(res, 'Request body validation required');
      return;
    }

    if (requiredFields && requiredFields.length > 0) {
      ValidationHelpers.validateRequired(
        req.validatedBody,
        requiredFields,
        res,
        next
      );
      return;
    }

    next();
  }

  /**
   * Validate request query
   */
  protected validateQuery<T>(
    req: BaseRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.validatedQuery) {
      ResponseHelpers.validationError(res, 'Request query validation required');
      return;
    }
    next();
  }

  /**
   * Validate request params
   */
  protected validateParams<T>(
    req: BaseRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.validatedParams) {
      ResponseHelpers.validationError(res, 'Request params validation required');
      return;
    }
    next();
  }

  /**
   * Validate business ID
   */
  protected validateBusinessId(
    req: BaseRequest,
    res: Response,
    next: NextFunction
  ): void {
    const businessId = req.businessId || req.validatedParams?.businessId || req.validatedQuery?.businessId;
    
    if (!businessId) {
      ResponseHelpers.validationError(res, 'Business ID is required');
      return;
    }

    if (!ValidationHelpers.validateBusinessId(businessId)) {
      ResponseHelpers.validationError(res, 'Invalid business ID format');
      return;
    }

    next();
  }

  /**
   * Validate manufacturer ID
   */
  protected validateManufacturerId(
    req: BaseRequest,
    res: Response,
    next: NextFunction
  ): void {
    const manufacturerId = req.manufacturerId || req.validatedParams?.manufacturerId || req.validatedQuery?.manufacturerId;
    
    if (!manufacturerId) {
      ResponseHelpers.validationError(res, 'Manufacturer ID is required');
      return;
    }

    if (!ValidationHelpers.validateBusinessId(manufacturerId)) {
      ResponseHelpers.validationError(res, 'Invalid manufacturer ID format');
      return;
    }

    next();
  }

  /**
   * Validate user authentication
   */
  protected validateAuth(
    req: BaseRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.userId) {
      ResponseHelpers.unauthorized(res, 'Authentication required');
      return;
    }

    if (!req.userType) {
      ResponseHelpers.unauthorized(res, 'User type required');
      return;
    }

    next();
  }

  /**
   * Validate business user
   */
  protected validateBusinessUser(
    req: BaseRequest,
    res: Response,
    next: NextFunction | (() => Promise<any>)
  ): void | Promise<any> {
    return new Promise((resolve, reject) => {
      this.validateAuth(req, res, async (err) => {
        if (err) {
          reject(err);
          return;
        }

        if (req.userType !== 'business') {
          ResponseHelpers.forbidden(res, 'Business user access required');
          reject({ statusCode: 403, message: 'Business user access required' });
          return;
        }

        if (!req.businessId) {
          ResponseHelpers.validationError(res, 'Business ID required for business user');
          reject({ statusCode: 400, message: 'Business ID required for business user' });
          return;
        }

        try {
          const result = next();
          // If next is async, await it and catch errors
          if (result && typeof result === 'object' && 'then' in result) {
            const awaitedResult = await result;
            resolve(awaitedResult);
          } else {
            resolve(result);
          }
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Validate manufacturer user
   */
  protected validateManufacturerUser(
    req: BaseRequest,
    res: Response,
    next: NextFunction | (() => Promise<any>)
  ): void | Promise<any> {
    return new Promise((resolve, reject) => {
      this.validateAuth(req, res, async (err) => {
        if (err) {
          reject(err);
          return;
        }

        if (req.userType !== 'manufacturer') {
          ResponseHelpers.forbidden(res, 'Manufacturer user access required');
          reject({ statusCode: 403, message: 'Manufacturer user access required' });
          return;
        }

        if (!req.manufacturerId) {
          ResponseHelpers.validationError(res, 'Manufacturer ID required for manufacturer user');
          reject({ statusCode: 400, message: 'Manufacturer ID required for manufacturer user' });
          return;
        }

        try {
          const result = next();
          // If next is async, await it and catch errors
          if (result && typeof result === 'object' && 'then' in result) {
            const awaitedResult = await result;
            resolve(awaitedResult);
          } else {
            resolve(result);
          }
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Ensure request is authenticated and optionally matches the allowed roles.
   */
  protected ensureAuthenticated(
    req: BaseRequest,
    allowedTypes?: Array<'business' | 'manufacturer' | 'customer' | 'user'>,
  ): void {
    if (!req.userId || !req.userType) {
      throw { statusCode: 401, message: 'Authentication required' };
    }

    if (allowedTypes && !allowedTypes.includes(req.userType)) {
      throw { statusCode: 403, message: 'User type not permitted for this operation' };
    }
  }

  /**
   * Record performance metrics
   * Uses safe logging - logger.info already sanitizes context automatically
   */
  protected recordPerformance(req: BaseRequest, operation: string): void {
    PerformanceHelpers.recordDatabaseQuery(req);
    
    // logger.info already sanitizes all context data via sanitizeObject()
    this.logger.info(`Controller operation: ${operation}`, {
      userId: req.userId,
      userType: req.userType,
      businessId: req.businessId,
      manufacturerId: req.manufacturerId,
      requestId: req.headers['x-request-id']
    });
  }

  /**
   * Log controller action with automatic sanitization
   * All details are sanitized to prevent sensitive data exposure (passwords, tokens, keys, etc.)
   * Uses logSafe to sanitize the details parameter separately before merging into context
   */
  protected logAction(
    req: BaseRequest,
    action: string,
    details?: any
  ): void {
    // Use logSafe to sanitize details separately - prevents exposure of passwords, API keys, tokens, etc.
    // logger.info already sanitizes context, but logSafe provides extra layer for the details object
    if (details !== undefined) {
      this.logger.logSafe(LogLevel.INFO, `Controller action: ${action}`, details, {
        userId: req.userId,
        userType: req.userType,
        businessId: req.businessId,
        manufacturerId: req.manufacturerId,
        action,
        requestId: req.headers['x-request-id']
      });
    } else {
      // No details to sanitize, just use info (which sanitizes context)
      this.logger.info(`Controller action: ${action}`, {
        userId: req.userId,
        userType: req.userType,
        businessId: req.businessId,
        manufacturerId: req.manufacturerId,
        action,
        requestId: req.headers['x-request-id']
      });
    }
  }

  /**
   * Create pagination metadata
   */
  protected createPaginationMeta(
    page: number,
    limit: number,
    total: number
  ): {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } {
    const totalPages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  /**
   * Sanitize input data
   */
  protected sanitizeInput<T>(data: T): T {
    return ValidationHelpers.sanitizeObject(data) as T;
  }

  /**
   * Get request metadata
   */
  protected getRequestMeta(req: BaseRequest): ResponseMeta {
    return {
      requestId: req.headers?.['x-request-id'] as string,
      processingTime: req.performanceMetrics?.duration,
      cacheHit: req.performanceMetrics?.cacheHit,
      version: '1.0.0'
    };
  }
}
