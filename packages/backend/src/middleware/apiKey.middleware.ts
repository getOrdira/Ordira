// src/middleware/apiKey.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/business/apiKey.service';
import { createAppError, createUnauthorizedError, createRateLimitError } from './error.middleware';

const apiKeyService = new ApiKeyService();

/**
 * Extended request interface for API key authentication
 */
export interface ApiKeyRequest extends Request {
  businessId?: string;
  apiKeyId?: string;
  rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: Date;
  };
}

/**
 * API key authentication middleware with enhanced security and rate limiting
 */
export async function authenticateApiKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract API key from headers (multiple possible header names)
    const apiKey = req.headers['x-api-key'] || 
                   req.headers['authorization']?.replace(/^Bearer\s+/, '') ||
                   req.query.api_key;

    if (!apiKey || typeof apiKey !== 'string') {
      throw createUnauthorizedError('API key is required. Provide it via X-API-Key header, Authorization header, or api_key query parameter.');
    }

    // Validate API key format
    if (!isValidApiKeyFormat(apiKey)) {
      throw createUnauthorizedError('Invalid API key format');
    }

    // Verify API key and get associated business
    const apiKeyDoc = await apiKeyService.verifyApiKey(apiKey);
    
    if (!apiKeyDoc || !apiKeyDoc.business) {
      throw createUnauthorizedError('Invalid or revoked API key');
    }

    // Check if API key is active
    if (apiKeyDoc.isActive === false) {
      throw createUnauthorizedError('API key has been deactivated');
    }

    // Check expiration
    if (apiKeyDoc.expiresAt && apiKeyDoc.expiresAt < new Date()) {
      throw createUnauthorizedError('API key has expired');
    }

    // Check rate limits
    const rateLimitResult = await checkRateLimit(apiKeyDoc._id.toString(), apiKeyDoc.rateLimits?.requestsPerMinute * 60 || 1000);
    if (!rateLimitResult.allowed) {
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString()
      });
      
      throw createRateLimitError(
        `Rate limit exceeded. Limit: ${rateLimitResult.limit} requests per hour. Reset at: ${rateLimitResult.resetTime.toISOString()}`
      );
    }

    // Check IP whitelist if configured - note: there's no ipWhitelist in the model
    // Remove this section or implement if needed
    
    // Check allowed origins for CORS
    if (apiKeyDoc.allowedOrigins && apiKeyDoc.allowedOrigins.length > 0) {
      const origin = req.headers.origin;
      if (origin && !apiKeyDoc.allowedOrigins.includes(origin)) {
        throw createUnauthorizedError('Origin not authorized for this API key');
      }
    }

    // Attach business context to request
    req.businessId = apiKeyDoc.business.toString();
    req.apiKeyId = apiKeyDoc._id.toString();
    req.rateLimit = {
      limit: rateLimitResult.limit,
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime
    };

    // Add rate limit headers to response
    res.set({
      'X-RateLimit-Limit': rateLimitResult.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString()
    });

    // Log API key usage (async, don't wait)
    logApiKeyUsage(apiKeyDoc._id.toString(), req).catch(err => {
      console.error('Failed to log API key usage:', err);
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate API key format (basic validation)
 */
function isValidApiKeyFormat(apiKey: string): boolean {
  // API keys should be 32-64 characters, alphanumeric with possible special chars
  return /^[A-Za-z0-9_\-\.]{32,64}$/.test(apiKey);
}

/**
 * Check rate limits for API key
 */
async function checkRateLimit(apiKeyId: string, hourlyLimit: number = 1000): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
}> {
  try {
    // This would typically use Redis or similar for distributed rate limiting
    // For now, implementing a simple in-memory approach
    const result = await apiKeyService.checkRateLimit(apiKeyId, hourlyLimit);
    
    return {
      allowed: result.remaining > 0,
      limit: result.limit,
      remaining: Math.max(0, result.remaining - 1),
      resetTime: result.resetTime
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // On error, allow the request but log the issue
    return {
      allowed: true,
      limit: hourlyLimit,
      remaining: hourlyLimit - 1,
      resetTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    };
  }
}

/**
 * Get client IP address with proxy support
 */
function getClientIP(req: Request): string {
  return (
    req.headers['x-forwarded-for'] as string ||
    req.headers['x-real-ip'] as string ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  ).split(',')[0].trim();
}

/**
 * Check if IP is in whitelist
 */
function isIPWhitelisted(clientIP: string, whitelist: string[]): boolean {
  return whitelist.some(whitelistedIP => {
    // Support CIDR notation and exact matches
    if (whitelistedIP.includes('/')) {
      return isIPInCIDR(clientIP, whitelistedIP);
    }
    return clientIP === whitelistedIP;
  });
}

/**
 * Check if IP is in CIDR range (basic implementation)
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    // This is a simplified implementation
    // In production, use a proper CIDR matching library
    const [network, prefixLength] = cidr.split('/');
    if (!prefixLength) return ip === network;
    
    // For IPv4 basic check
    const ipParts = ip.split('.').map(Number);
    const networkParts = network.split('.').map(Number);
    const mask = parseInt(prefixLength);
    
    if (ipParts.length !== 4 || networkParts.length !== 4) return false;
    
    for (let i = 0; i < 4; i++) {
      const bitsInThisOctet = Math.min(8, Math.max(0, mask - i * 8));
      if (bitsInThisOctet === 0) break;
      
      const ipOctet = ipParts[i] >> (8 - bitsInThisOctet);
      const networkOctet = networkParts[i] >> (8 - bitsInThisOctet);
      
      if (ipOctet !== networkOctet) return false;
    }
    
    return true;
  } catch (error) {
    console.error('CIDR check failed:', error);
    return false;
  }
}

/**
 * Log API key usage for analytics and monitoring
 */
async function logApiKeyUsage(apiKeyId: string, req: Request): Promise<void> {
  try {
    await apiKeyService.logUsage(apiKeyId, {
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: getClientIP(req),
      timestamp: new Date()
    });
  } catch (error) {
    // Don't throw errors for logging failures
    console.error('Failed to log API key usage:', error);
  }
}

/**
 * Middleware to require specific API key permissions
 */
export function requireApiKeyPermission(permission: string) {
  return async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.apiKeyId) {
        throw createUnauthorizedError('API key authentication required');
      }

      const hasPermission = await apiKeyService.hasPermission(req.apiKeyId, permission);
      if (!hasPermission) {
        throw createUnauthorizedError(`API key does not have required permission: ${permission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check API key scope
 */
export function requireApiKeyScope(scope: string) {
  return async (req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.apiKeyId) {
        throw createUnauthorizedError('API key authentication required');
      }

      const hasScope = await apiKeyService.hasScope(req.apiKeyId, scope);
      if (!hasScope) {
        throw createUnauthorizedError(`API key does not have required scope: ${scope}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
