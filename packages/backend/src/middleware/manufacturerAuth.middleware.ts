// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { Manufacturer } from '../models/manufacturer.model';

const JWT_SECRET = process.env.MFG_JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error('Missing MFG_JWT_SECRET environment variable!');
}

/**
 * Extended Express Request interface for manufacturer authentication
 */
export interface ManufacturerAuthRequest extends Request {
  userId?: string;
  manufacturer?: any; // Will contain the full manufacturer document
}

export async function authenticateManufacturer(
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  try {
    // Extract authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'No Authorization header provided.',
        code: 'MISSING_AUTH_HEADER'
      });
    }

    // Parse Bearer token
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ 
        error: 'Malformed Authorization header. Expected format: Bearer <token>',
        code: 'MALFORMED_AUTH_HEADER'
      });
    }

    // Verify JWT token
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    
    if (!payload.sub) {
      return res.status(401).json({ 
        error: 'Invalid token payload.',
        code: 'INVALID_TOKEN_PAYLOAD'
      });
    }

    // Find manufacturer and verify account status
    const manufacturer = await Manufacturer.findById(payload.sub);
    if (!manufacturer) {
      return res.status(401).json({ 
        error: 'Manufacturer not found.',
        code: 'MANUFACTURER_NOT_FOUND'
      });
    }

    // Check if manufacturer account is active
    if (!manufacturer.isAccountActive()) {
      return res.status(403).json({ 
        error: 'Account is deactivated.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Update last login timestamp
    await manufacturer.updateLastLogin();

    // Attach manufacturer info to request
    req.userId = payload.sub;
    req.manufacturer = manufacturer;
    
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token has expired.',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Log unexpected errors for debugging
    logger.error('Manufacturer authentication error:', error);
    return res.status(500).json({ 
      error: 'Internal server error during authentication.',
      code: 'AUTH_INTERNAL_ERROR'
    });
  }
}

/**
 * Optional middleware to check if manufacturer has access to a specific brand.
 * Must be used after authenticateManufacturer.
 * 
 * Expects brandId in req.params.brandId or req.body.brandId
 */
export function requireBrandAccess(
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  const brandId = req.params.brandId || req.body.brandId;
  
  if (!brandId) {
    return res.status(400).json({ 
      error: 'Brand ID is required.',
      code: 'MISSING_BRAND_ID'
    });
  }

  if (!req.manufacturer) {
    return res.status(500).json({ 
      error: 'Manufacturer not found in request. Ensure authenticateManufacturer runs first.',
      code: 'MIDDLEWARE_ORDER_ERROR'
    });
  }

  // Check if manufacturer has access to this brand
  const hasAccess = req.manufacturer.brands.some((brand: any) => 
    brand.toString() === brandId
  );

  if (!hasAccess) {
    return res.status(403).json({ 
      error: 'Access denied to this brand.',
      code: 'BRAND_ACCESS_DENIED'
    });
  }

  return next();
}

/**
 * Optional middleware to require verified manufacturers only
 */
export function requireVerifiedManufacturer(
  req: ManufacturerAuthRequest,
  res: Response,
  next: NextFunction
): void | Response {
  if (!req.manufacturer) {
    return res.status(500).json({ 
      error: 'Manufacturer not found in request. Ensure authenticateManufacturer runs first.',
      code: 'MIDDLEWARE_ORDER_ERROR'
    });
  }

  if (!req.manufacturer.isVerified) {
    return res.status(403).json({ 
      error: 'This action requires a verified manufacturer account.',
      code: 'VERIFICATION_REQUIRED'
    });
  }

  return next();
}

