// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createAppError, createUnauthorizedError, createForbiddenError } from './error.middleware';

/**
 * Extended request interface for authentication
 */
export interface AuthRequest extends Request {
  userId?: string;
  userType?: 'business' | 'manufacturer' | 'user';
  tokenPayload?: JWTPayload;
  sessionId?: string;
}

/**
 * JWT payload interface
 */
export interface JWTPayload {
  sub: string;
  userType: 'business' | 'manufacturer' | 'user';
  sessionId?: string;
  permissions?: string[];
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

/**
 * Token validation result
 */
interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

// Environment variables validation
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'Ordira-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'ordira-app';

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable!');
}

/**
 * Enhanced authentication middleware with comprehensive token validation
 */
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw createUnauthorizedError('No Authorization header provided');
    }

    const [scheme, token] = authHeader.split(' ');
    
    if (scheme !== 'Bearer') {
      throw createUnauthorizedError('Invalid authorization scheme. Use Bearer token');
    }
    
    if (!token || token.trim() === '') {
      throw createUnauthorizedError('No token provided in Authorization header');
    }

    // Validate and decode token
    const validationResult = validateToken(token);
    
    if (!validationResult.valid || !validationResult.payload) {
      throw createUnauthorizedError(validationResult.error || 'Invalid token');
    }

    const payload = validationResult.payload;

    // Additional payload validation
    if (!payload.sub) {
      throw createUnauthorizedError('Token missing subject (user ID)');
    }

    if (!payload.userType || !['business', 'manufacturer', 'user'].includes(payload.userType)) {
      throw createUnauthorizedError('Token missing or invalid user type');
    }

    // Check token freshness (optional)
    const tokenAge = Date.now() / 1000 - payload.iat;
    const maxTokenAge = 24 * 60 * 60; // 24 hours
    
    if (tokenAge > maxTokenAge) {
      throw createUnauthorizedError('Token is too old, please refresh');
    }

    // Attach user context to request
    req.userId = payload.sub;
    req.userType = payload.userType;
    req.tokenPayload = payload;
    req.sessionId = payload.sessionId;

    // Add security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validate and decode JWT token
 */
function validateToken(token: string): TokenValidationResult {
  try {
    const payload = jwt.verify(token, JWT_SECRET!, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256']
    }) as JWTPayload;

    return {
      valid: true,
      payload
    };
  } catch (error: any) {
    let errorMessage = 'Invalid token';
    
    switch (error.name) {
      case 'TokenExpiredError':
        errorMessage = 'Token has expired';
        break;
      case 'JsonWebTokenError':
        errorMessage = 'Invalid token format';
        break;
      case 'NotBeforeError':
        errorMessage = 'Token not yet valid';
        break;
      default:
        errorMessage = 'Token validation failed';
    }

    return {
      valid: false,
      error: errorMessage
    };
  }
}

/**
 * Middleware to require specific user type
 */
export function requireUserType(allowedTypes: ('business' | 'manufacturer' | 'user')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.userType) {
        throw createUnauthorizedError('Authentication required');
      }

      if (!allowedTypes.includes(req.userType)) {
        throw createForbiddenError(`Access denied. Required user types: ${allowedTypes.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to require specific permissions
 */
export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.tokenPayload) {
        throw createUnauthorizedError('Authentication required');
      }

      const userPermissions = req.tokenPayload.permissions || [];
      
      if (!userPermissions.includes(permission) && !userPermissions.includes('*')) {
        throw createForbiddenError(`Insufficient permissions. Required: ${permission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to require multiple permissions (all must be present)
 */
export function requireAllPermissions(permissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.tokenPayload) {
        throw createUnauthorizedError('Authentication required');
      }

      const userPermissions = req.tokenPayload.permissions || [];
      
      // Check if user has admin permission
      if (userPermissions.includes('*')) {
        return next();
      }

      const missingPermissions = permissions.filter(perm => !userPermissions.includes(perm));
      
      if (missingPermissions.length > 0) {
        throw createForbiddenError(`Missing permissions: ${missingPermissions.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to require any of the specified permissions
 */
export function requireAnyPermission(permissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.tokenPayload) {
        throw createUnauthorizedError('Authentication required');
      }

      const userPermissions = req.tokenPayload.permissions || [];
      
      // Check if user has admin permission
      if (userPermissions.includes('*')) {
        return next();
      }

      const hasAnyPermission = permissions.some(perm => userPermissions.includes(perm));
      
      if (!hasAnyPermission) {
        throw createForbiddenError(`Insufficient permissions. Required any of: ${permissions.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function optionalAuthenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next();
  }

  // If authorization header is present, validate it
  authenticate(req, res, next);
}

/**
 * Middleware to ensure user can only access their own resources
 */
export function requireOwnership(userIdParam: string = 'userId') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.userId) {
        throw createUnauthorizedError('Authentication required');
      }

      const requestedUserId = req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam];
      
      if (!requestedUserId) {
        throw createForbiddenError(`${userIdParam} parameter is required`);
      }

      if (req.userId !== requestedUserId) {
        throw createForbiddenError('Access denied. You can only access your own resources');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Generate JWT token with enhanced payload
 */
export function generateToken(
  userId: string,
  userType: 'business' | 'manufacturer' | 'user',
  options: {
    expiresIn?: string;
    permissions?: string[];
    sessionId?: string;
    additionalClaims?: Record<string, any>;
  } = {}
): string {
  const {
    expiresIn = '24h',
    permissions = [],
    sessionId,
    additionalClaims = {}
  } = options;

  const payload: Partial<JWTPayload> = {
    sub: userId,
    userType,
    permissions,
    sessionId,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    ...additionalClaims
  };

  return jwt.sign(payload, JWT_SECRET!, {
    expiresIn,
    algorithm: 'HS256'
  });
}

/**
 * Refresh token validation (for longer-lived tokens)
 */
export function validateRefreshToken(token: string): TokenValidationResult {
  try {
    const payload = jwt.verify(token, JWT_SECRET!, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256']
    }) as JWTPayload;

    // Additional validation for refresh tokens
    if (!payload.sessionId) {
      return {
        valid: false,
        error: 'Invalid refresh token format'
      };
    }

    return {
      valid: true,
      payload
    };
  } catch (error: any) {
    return {
      valid: false,
      error: 'Invalid refresh token'
    };
  }
}

/**
 * Decode token without verification (for debugging/inspection)
 */
export function decodeTokenUnsafe(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
}