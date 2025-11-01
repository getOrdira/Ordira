// src/routes/core/base.routes.ts
// Base route utilities and helpers for consistent route creation

import { Router, RequestHandler } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/deprecated/validation.middleware';
import { authenticate } from '../../middleware/deprecated/unifiedAuth.middleware';
import { resolveTenant, requireTenantSetup } from '../../middleware/deprecated/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/deprecated/rateLimiter.middleware';
import { asRouteHandler, asRateLimitHandler } from '../../utils/routeHelpers';
import Joi from 'joi';

/**
 * Route configuration options
 */
export interface RouteConfig {
  requireAuth?: boolean;
  requireTenant?: boolean;
  requireTenantSetup?: boolean;
  requireTenantPlan?: string[];
  rateLimit?: 'dynamic' | 'strict' | 'none';
  middleware?: RequestHandler[];
}

/**
 * Route method options
 */
export interface RouteMethodOptions {
  validateBody?: Joi.ObjectSchema;
  validateQuery?: Joi.ObjectSchema;
  validateParams?: Joi.ObjectSchema;
  middleware?: RequestHandler[];
}

/**
 * Base route builder class
 * Provides standardized route creation with common middleware patterns
 */
export class BaseRouteBuilder {
  private router: Router;
  private config: RouteConfig;

  constructor(config: RouteConfig = {}) {
    this.router = Router();
    this.config = {
      requireAuth: true,
      requireTenant: false,
      rateLimit: 'dynamic',
      ...config
    };
    this.applyGlobalMiddleware();
  }

  /**
   * Apply global middleware based on configuration
   */
  private applyGlobalMiddleware(): void {
    // Rate limiting
    if (this.config.rateLimit === 'strict') {
      this.router.use(asRateLimitHandler(strictRateLimiter()));
    } else if (this.config.rateLimit === 'dynamic') {
      this.router.use(asRateLimitHandler(dynamicRateLimiter()));
    }
    // Note: 'none' skips rate limiting

    // Authentication
    if (this.config.requireAuth) {
      this.router.use(authenticate);
    }

    // Tenant resolution
    if (this.config.requireTenant || this.config.requireTenantSetup) {
      this.router.use(resolveTenant);
    }

    // Tenant setup requirement
    if (this.config.requireTenantSetup) {
      this.router.use(requireTenantSetup);
    }

    // Additional middleware
    if (this.config.middleware) {
      this.router.use(...this.config.middleware);
    }
  }

  /**
   * Get the configured router
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Add GET route with optional validation and middleware
   */
  get(
    path: string,
    handler: RequestHandler,
    options: RouteMethodOptions = {}
  ): this {
    const middlewares: RequestHandler[] = [];

    if (options.validateQuery) {
      middlewares.push(validateQuery(options.validateQuery));
    }
    if (options.validateParams) {
      middlewares.push(validateParams(options.validateParams));
    }
    if (options.middleware) {
      middlewares.push(...options.middleware);
    }

    this.router.get(path, ...middlewares, handler);
    return this;
  }

  /**
   * Add POST route with optional validation and middleware
   */
  post(
    path: string,
    handler: RequestHandler,
    options: RouteMethodOptions = {}
  ): this {
    const middlewares: RequestHandler[] = [];

    if (options.validateBody) {
      middlewares.push(validateBody(options.validateBody));
    }
    if (options.validateParams) {
      middlewares.push(validateParams(options.validateParams));
    }
    if (options.middleware) {
      middlewares.push(...options.middleware);
    }

    this.router.post(path, ...middlewares, handler);
    return this;
  }

  /**
   * Add PUT route with optional validation and middleware
   */
  put(
    path: string,
    handler: RequestHandler,
    options: RouteMethodOptions = {}
  ): this {
    const middlewares: RequestHandler[] = [];

    if (options.validateBody) {
      middlewares.push(validateBody(options.validateBody));
    }
    if (options.validateParams) {
      middlewares.push(validateParams(options.validateParams));
    }
    if (options.middleware) {
      middlewares.push(...options.middleware);
    }

    this.router.put(path, ...middlewares, handler);
    return this;
  }

  /**
   * Add DELETE route with optional validation and middleware
   */
  delete(
    path: string,
    handler: RequestHandler,
    options: RouteMethodOptions = {}
  ): this {
    const middlewares: RequestHandler[] = [];

    if (options.validateParams) {
      middlewares.push(validateParams(options.validateParams));
    }
    if (options.middleware) {
      middlewares.push(...options.middleware);
    }

    this.router.delete(path, ...middlewares, handler);
    return this;
  }

  /**
   * Add PATCH route with optional validation and middleware
   */
  patch(
    path: string,
    handler: RequestHandler,
    options: RouteMethodOptions = {}
  ): this {
    const middlewares: RequestHandler[] = [];

    if (options.validateBody) {
      middlewares.push(validateBody(options.validateBody));
    }
    if (options.validateParams) {
      middlewares.push(validateParams(options.validateParams));
    }
    if (options.middleware) {
      middlewares.push(...options.middleware);
    }

    this.router.patch(path, ...middlewares, handler);
    return this;
  }

  /**
   * Use additional middleware on the router
   */
  use(...handlers: RequestHandler[]): this {
    this.router.use(...handlers);
    return this;
  }
}

/**
 * Create a new route builder with the given configuration
 */
export function createRouteBuilder(config?: RouteConfig): BaseRouteBuilder {
  return new BaseRouteBuilder(config);
}

/**
 * Common route configurations
 */
export const RouteConfigs = {
  /**
   * Public routes (no authentication required)
   */
  public: {
    requireAuth: false,
    requireTenant: false,
    rateLimit: 'strict' as const
  },

  /**
   * Authenticated routes (requires auth, no tenant)
   */
  authenticated: {
    requireAuth: true,
    requireTenant: false,
    rateLimit: 'dynamic' as const
  },

  /**
   * Tenant routes (requires auth and tenant setup)
   */
  tenant: {
    requireAuth: true,
    requireTenant: true,
    requireTenantSetup: true,
    rateLimit: 'dynamic' as const
  },

  /**
   * Admin routes (requires auth, stricter rate limiting)
   */
  admin: {
    requireAuth: true,
    requireTenant: false,
    rateLimit: 'strict' as const
  }
};

/**
 * Helper to create a controller handler with proper binding
 */
export function createHandler(
  controller: any,
  methodName: string
): RequestHandler {
  return asRouteHandler(controller[methodName].bind(controller));
}

