// src/middleware/auth/unifiedAuth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';
import { createAppError } from '../core';
import { Manufacturer } from '../../models/manufacturer/manufacturer.model';
import { Business } from '../../models/deprecated/business.model';
import { User } from '../../models/deprecated/user.model';

/**
 * Unified request interface for all authentication types
 */
export interface UnifiedAuthRequest extends Request {
  userId?: string;
  userType?: 'business' | 'manufacturer' | 'user';
  tokenPayload?: JWTPayload;
  sessionId?: string;
  user?: any; // Will contain the full user document (manufacturer, business, or user)
  manufacturer?: any; // For backward compatibility
  business?: any; // For business-specific operations
}

/**
 * Enhanced JWT payload interface with comprehensive claims
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
  refreshToken?: boolean; // Flag for refresh tokens
  deviceId?: string; // Device fingerprinting
  ip?: string; // IP address at token creation
}

/**
 * Token validation result with enhanced error information
 */
interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
  errorCode?: string;
}

/**
 * Token configuration interface for flexible token management
 */
interface TokenConfig {
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  maxTokenAge: number; // Maximum age in seconds before requiring refresh
  issuer: string;
  audience: string;
}

// Environment variables validation with fallbacks
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'Ordira-api';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'ordira-app';

// Token configuration with environment overrides
const TOKEN_CONFIG: TokenConfig = {
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  maxTokenAge: parseInt(process.env.JWT_MAX_AGE || '86400'), // 24 hours default
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE
};

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable!');
}

/**
 * Unified authentication middleware with comprehensive token validation and user document fetching
 * Supports all user types: business, manufacturer, and user
 */
export async function authenticate(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw createAppError('No Authorization header provided', 401, 'UNAUTHORIZED');
    }

    const [scheme, token] = authHeader.split(' ');
    
    if (scheme !== 'Bearer') {
      throw createAppError('Invalid authorization scheme. Use Bearer token', 401, 'UNAUTHORIZED');
    }
    
    if (!token || token.trim() === '') {
      throw createAppError('No token provided in Authorization header', 401, 'UNAUTHORIZED');
    }

    // Validate and decode token
    const validationResult = validateToken(token);
    
    if (!validationResult.valid || !validationResult.payload) {
      throw createAppError(validationResult.error || 'Invalid token', 401, 'UNAUTHORIZED');
    }

    const payload = validationResult.payload;

    // Enhanced payload validation
    if (!payload.sub) {
      throw createAppError('Token missing subject (user ID)', 401, 'UNAUTHORIZED');
    }

    if (!payload.userType || !['business', 'manufacturer', 'user'].includes(payload.userType)) {
      throw createAppError('Token missing or invalid user type', 401, 'UNAUTHORIZED');
    }

    // Check token freshness with configurable max age
    const tokenAge = Date.now() / 1000 - payload.iat;
    
    if (tokenAge > TOKEN_CONFIG.maxTokenAge) {
      throw createAppError('Token is too old, please refresh', 401, 'UNAUTHORIZED');
    }

    // Fetch user document based on user type
    let userDocument = null;
    try {
      switch (payload.userType) {
        case 'manufacturer':
          userDocument = await Manufacturer.findById(payload.sub);
          if (userDocument && !userDocument.isAccountActive()) {
            throw createAppError('Account is deactivated', 401, 'UNAUTHORIZED');
          }
          // Update last login for manufacturers
          if (userDocument) {
            await userDocument.updateLastLogin();
          }
          break;
        case 'business':
          userDocument = await Business.findById(payload.sub);
          break;
        case 'user':
          userDocument = await User.findById(payload.sub);
          break;
      }
    } catch (error: any) {
      if (error.message === 'Account is deactivated') {
        throw error;
      }
      logger.error('Error fetching user document:', error);
      throw createAppError('User not found', 401, 'UNAUTHORIZED');
    }

    if (!userDocument) {
      throw createAppError('User not found', 401, 'UNAUTHORIZED');
    }

    // Attach user context to request
    req.userId = payload.sub;
    req.userType = payload.userType;
    req.tokenPayload = payload;
    req.sessionId = payload.sessionId;
    req.user = userDocument;
    
    // For backward compatibility and type-specific access
    if (payload.userType === 'manufacturer') {
      req.manufacturer = userDocument;
    } else if (payload.userType === 'business') {
      req.business = userDocument;
    }

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
 * Enhanced token validation with comprehensive error handling
 */
function validateToken(token: string): TokenValidationResult {
  try {
    const payload = jwt.verify(token, JWT_SECRET!, {
      issuer: TOKEN_CONFIG.issuer,
      audience: TOKEN_CONFIG.audience,
      algorithms: ['HS256']
    }) as JWTPayload;

    return {
      valid: true,
      payload
    };
  } catch (error: any) {
    let errorMessage = 'Invalid token';
    let errorCode = 'INVALID_TOKEN';
    
    switch (error.name) {
      case 'TokenExpiredError':
        errorMessage = 'Token has expired';
        errorCode = 'TOKEN_EXPIRED';
        break;
      case 'JsonWebTokenError':
        errorMessage = 'Invalid token format';
        errorCode = 'INVALID_TOKEN_FORMAT';
        break;
      case 'NotBeforeError':
        errorMessage = 'Token not yet valid';
        errorCode = 'TOKEN_NOT_ACTIVE';
        break;
      default:
        errorMessage = 'Token validation failed';
        errorCode = 'TOKEN_VALIDATION_FAILED';
    }

    return {
      valid: false,
      error: errorMessage,
      errorCode
    };
  }
}

/**
 * Middleware to require specific user type
 */
export function requireUserType(allowedTypes: ('business' | 'manufacturer' | 'user')[]) {
  return (req: UnifiedAuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.userType) {
        throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      if (!allowedTypes.includes(req.userType)) {
        throw createAppError(`Access denied. Required user types: ${allowedTypes.join(', ')}`);
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
  return (req: UnifiedAuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.tokenPayload) {
        throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const userPermissions = req.tokenPayload.permissions || [];
      
      if (!userPermissions.includes(permission) && !userPermissions.includes('*')) {
        throw createAppError(`Insufficient permissions. Required: ${permission}`);
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
  return (req: UnifiedAuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.tokenPayload) {
        throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const userPermissions = req.tokenPayload.permissions || [];
      
      // Check if user has admin permission
      if (userPermissions.includes('*')) {
        return next();
      }

      const missingPermissions = permissions.filter(perm => !userPermissions.includes(perm));
      
      if (missingPermissions.length > 0) {
        throw createAppError(`Missing permissions: ${missingPermissions.join(', ')}`);
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
  return (req: UnifiedAuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.tokenPayload) {
        throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const userPermissions = req.tokenPayload.permissions || [];
      
      // Check if user has admin permission
      if (userPermissions.includes('*')) {
        return next();
      }

      const hasAnyPermission = permissions.some(perm => userPermissions.includes(perm));
      
      if (!hasAnyPermission) {
        throw createAppError(`Insufficient permissions. Required any of: ${permissions.join(', ')}`);
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
  req: UnifiedAuthRequest,
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
  return (req: UnifiedAuthRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.userId) {
        throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const requestedUserId = req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam];
      
      if (!requestedUserId) {
        throw createAppError(`${userIdParam} parameter is required`);
      }

      if (req.userId !== requestedUserId) {
        throw createAppError('Access denied. You can only access your own resources');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Generate JWT token with enhanced payload and configurable options
 */
export function generateToken(
  userId: string,
  userType: 'business' | 'manufacturer' | 'user',
  options: {
    expiresIn?: string;
    permissions?: string[];
    sessionId?: string;
    deviceId?: string;
    ip?: string;
    refreshToken?: boolean;
    additionalClaims?: Record<string, any>;
  } = {}
): string {
  const {
    expiresIn = TOKEN_CONFIG.accessTokenExpiry,
    permissions = [],
    sessionId,
    deviceId,
    ip,
    refreshToken = false,
    additionalClaims = {}
  } = options;

  const payload = {
    sub: userId,
    userType,
    permissions,
    sessionId,
    deviceId,
    ip,
    refreshToken,
    iss: TOKEN_CONFIG.issuer,
    aud: TOKEN_CONFIG.audience,
    ...additionalClaims
  };

  const signOptions: jwt.SignOptions = {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256'
  };

  return jwt.sign(payload, JWT_SECRET!, signOptions);
}

/**
 * Generate refresh token with extended expiry
 */
export function generateRefreshToken(
  userId: string,
  userType: 'business' | 'manufacturer' | 'user',
  sessionId: string,
  deviceId?: string,
  ip?: string
): string {
  return generateToken(userId, userType, {
    expiresIn: TOKEN_CONFIG.refreshTokenExpiry,
    sessionId,
    deviceId,
    ip,
    refreshToken: true,
    permissions: ['refresh']
  });
}

/**
 * Refresh token validation (for longer-lived tokens)
 */
export function validateRefreshToken(token: string): TokenValidationResult {
  try {
    const payload = jwt.verify(token, JWT_SECRET!, {
      issuer: TOKEN_CONFIG.issuer,
      audience: TOKEN_CONFIG.audience,
      algorithms: ['HS256']
    }) as JWTPayload;

    // Additional validation for refresh tokens
    if (!payload.sessionId) {
      return {
        valid: false,
        error: 'Invalid refresh token format',
        errorCode: 'INVALID_REFRESH_TOKEN_FORMAT'
      };
    }

    if (!payload.refreshToken) {
      return {
        valid: false,
        error: 'Token is not a refresh token',
        errorCode: 'NOT_REFRESH_TOKEN'
      };
    }

    return {
      valid: true,
      payload
    };
  } catch (error: any) {
    return {
      valid: false,
      error: 'Invalid refresh token',
      errorCode: 'INVALID_REFRESH_TOKEN'
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

/**
 * Middleware to require manufacturer user type specifically
 */
export function requireManufacturer(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    if (!req.userType || req.userType !== 'manufacturer') {
      throw createAppError('This endpoint requires manufacturer authentication');
    }

    if (!req.manufacturer) {
      throw createAppError('Manufacturer data not found');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to require verified manufacturers only
 */
export function requireVerifiedManufacturer(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    if (!req.manufacturer) {
      throw createAppError('Manufacturer authentication required', 401, 'UNAUTHORIZED');
    }

    if (!req.manufacturer.isVerified) {
      throw createAppError('This action requires a verified manufacturer account');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to check if manufacturer has access to a specific brand
 * Expects brandId in req.params.brandId or req.body.brandId
 */
export function requireBrandAccess(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    if (!req.manufacturer) {
      throw createAppError('Manufacturer authentication required', 401, 'UNAUTHORIZED');
    }

    const brandId = req.params.brandId || req.body.brandId;
    
    if (!brandId) {
      throw createAppError('Brand ID is required');
    }

    // Check if manufacturer has access to this brand
    const hasAccess = req.manufacturer.brands.some((brand: any) => 
      brand.toString() === brandId
    );

    if (!hasAccess) {
      throw createAppError('Access denied to this brand');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to require business user type specifically
 */
export function requireBusiness(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    if (!req.userType || req.userType !== 'business') {
      throw createAppError('This endpoint requires business authentication');
    }

    if (!req.business) {
      throw createAppError('Business data not found');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to require user type specifically
 */
export function requireUser(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    if (!req.userType || req.userType !== 'user') {
      throw createAppError('This endpoint requires user authentication');
    }

    if (!req.user) {
      throw createAppError('User data not found');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Token refresh endpoint handler
 */
export async function refreshToken(
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw createAppError('Refresh token is required');
    }

    const validationResult = validateRefreshToken(refreshToken);
    
    if (!validationResult.valid || !validationResult.payload) {
      throw createAppError(validationResult.error || 'Invalid refresh token');
    }

    const payload = validationResult.payload;

    // Verify user still exists and is active
    let userDocument = null;
    switch (payload.userType) {
      case 'manufacturer':
        userDocument = await Manufacturer.findById(payload.sub);
        if (userDocument && !userDocument.isAccountActive()) {
          throw createAppError('Account is deactivated');
        }
        break;
      case 'business':
        userDocument = await Business.findById(payload.sub);
        break;
      case 'user':
        userDocument = await User.findById(payload.sub);
        break;
    }

    if (!userDocument) {
      throw createAppError('User not found', 401, 'UNAUTHORIZED');
    }

    // Generate new access token
    const newAccessToken = generateToken(payload.sub, payload.userType, {
      permissions: payload.permissions,
      sessionId: payload.sessionId,
      deviceId: payload.deviceId,
      ip: req.ip
    });

    res.json({
      success: true,
      accessToken: newAccessToken,
      expiresIn: TOKEN_CONFIG.accessTokenExpiry
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Export token configuration for external use
 */
export { TOKEN_CONFIG };


