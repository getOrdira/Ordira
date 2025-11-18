/**
 * HTTPS Enforcement Middleware
 * 
 * Ensures all authentication and sensitive endpoints only accept HTTPS requests in production.
 * Handles proxy scenarios (X-Forwarded-Proto header) for load balancers and reverse proxies.
 * 
 * Security Best Practices:
 * - Rejects HTTP requests to auth endpoints in production
 * - Validates X-Forwarded-Proto header for proxy scenarios
 * - Logs security violations for monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

/**
 * Check if request is using HTTPS
 * Handles both direct HTTPS and proxy scenarios (X-Forwarded-Proto)
 */
function isHttpsRequest(req: Request): boolean {
  // Direct HTTPS connection
  if (req.secure) {
    return true;
  }

  // Check X-Forwarded-Proto header (for proxy/load balancer scenarios)
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (forwardedProto === 'https') {
    return true;
  }

  // Check X-Forwarded-Ssl header (alternative header used by some proxies)
  const forwardedSsl = req.headers['x-forwarded-ssl'];
  if (forwardedSsl === 'on') {
    return true;
  }

  return false;
}

/**
 * HTTPS Enforcement Middleware
 * 
 * Rejects HTTP requests in production to ensure all sensitive operations use HTTPS.
 * Allows HTTP in development for local testing.
 * 
 * @param options - Configuration options
 * @returns Express middleware function
 */
export function httpsEnforcementMiddleware(options: {
  /**
   * Whether to enforce HTTPS (default: true in production)
   */
  enforce?: boolean;
  /**
   * Whether to allow HTTP in development (default: true)
   */
  allowHttpInDevelopment?: boolean;
  /**
   * Custom error message (optional)
   */
  errorMessage?: string;
} = {}) {
  const {
    enforce = process.env.NODE_ENV === 'production',
    allowHttpInDevelopment = true,
    errorMessage = 'HTTPS is required for this endpoint'
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip enforcement if disabled
    if (!enforce) {
      return next();
    }

    // Allow HTTP in development if configured
    if (allowHttpInDevelopment && process.env.NODE_ENV !== 'production') {
      return next();
    }

    // Check if request is using HTTPS
    if (!isHttpsRequest(req)) {
      // Log security violation
      logger.warn('HTTPS enforcement violation', {
        event: 'security.https_violation',
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        forwardedProto: req.headers['x-forwarded-proto'],
        secure: req.secure
      });

      // Return 403 Forbidden
      res.status(403).json({
        error: errorMessage,
        code: 'HTTPS_REQUIRED',
        message: 'This endpoint requires HTTPS. Please use https:// instead of http://'
      });
      return;
    }

    // Request is using HTTPS, continue
    next();
  };
}

/**
 * Convenience middleware for authentication endpoints
 * Pre-configured for auth routes with strict enforcement
 */
export const authHttpsEnforcement = httpsEnforcementMiddleware({
  enforce: true,
  allowHttpInDevelopment: true,
  errorMessage: 'Authentication endpoints require HTTPS for security'
});

/**
 * Convenience middleware for all sensitive endpoints
 * Pre-configured for general use
 */
export const strictHttpsEnforcement = httpsEnforcementMiddleware({
  enforce: true,
  allowHttpInDevelopment: false, // Even stricter - no HTTP in dev
  errorMessage: 'This endpoint requires HTTPS'
});

