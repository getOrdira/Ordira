// services/infrastructure/http/features/routeHelpers.service.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { RateLimitRequestHandler } from 'express-rate-limit';

/**
 * Type-safe route handler wrapper that properly handles custom request interfaces
 * This creates a proper Express RequestHandler while maintaining type safety
 */
export function asRouteHandler<T extends Request = Request>(
  handler: (req: T, res: Response, next: NextFunction) => void | Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    return handler(req as T, res, next);
  };
}

/**
 * Alternative approach: Create a handler that validates the request type at runtime
 * This provides better runtime safety but requires more setup
 */
export function createValidatedRouteHandler<T extends Request = Request>(
  handler: (req: T, res: Response, next: NextFunction) => void | Promise<void>,
  validator?: (req: Request) => req is T
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (validator && !validator(req)) {
      return next(new Error('Request validation failed'));
    }
    return handler(req as T, res, next);
  };
}

/**
 * Rate limiter compatibility helper
 * Converts RateLimitRequestHandler to RequestHandler for Express compatibility
 */
export function asRateLimitHandler(rateLimiter: RateLimitRequestHandler): RequestHandler {
  return rateLimiter as unknown as RequestHandler;
}

/**
 * Shorthand for asRouteHandler
 */
export const route = asRouteHandler;

