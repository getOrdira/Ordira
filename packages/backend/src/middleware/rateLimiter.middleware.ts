import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { BrandSettings } from '../models/brandSettings.model';
import { Manufacturer } from '../models/manufacturer.model';
import { PlanKey, PLAN_DEFINITIONS } from '../constants/plans';
import { AuthRequest } from './auth.middleware';
import { ManufacturerAuthRequest } from './manufacturerAuth.middleware';

// Redis store for distributed rate limiting (optional)
// import RedisStore from 'rate-limit-redis';
// import Redis from 'ioredis';

// const redisClient = new Redis(process.env.REDIS_URL);

/**
 * Rate limit configurations per plan
 */
const PLAN_RATE_LIMITS: Record<PlanKey, { rpm: number; burst: number; window: number }> = {
  foundation: { rpm: 30, burst: 60, window: 1 }, // 30 req/min, 60 burst, 1 min window
  growth: { rpm: 75, burst: 150, window: 1 },    // 75 req/min, 150 burst, 1 min window
  premium: { rpm: 150, burst: 300, window: 1 },   // 150 req/min, 300 burst, 1 min window
  enterprise: { rpm: 500, burst: 1000, window: 1 } // 500 req/min, 1000 burst, 1 min window
};

/**
 * Default rate limits for unauthenticated requests
 */
const DEFAULT_RATE_LIMIT = {
  rpm: 20,     // 20 requests per minute
  burst: 40,   // 40 burst requests
  window: 5    // 5 minute window
};

/**
 * Manufacturer-specific rate limits (more generous for verified manufacturers)
 */
const MANUFACTURER_RATE_LIMITS = {
  verified: { rpm: 200, burst: 400, window: 1 },
  unverified: { rpm: 100, burst: 200, window: 1 }
};

/**
 * Cache for user plan information to avoid repeated database queries
 */
const planCache = new Map<string, { plan: PlanKey; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user's rate limit configuration based on their plan
 */
async function getUserRateLimit(userId: string, userType: 'brand' | 'manufacturer'): Promise<{ max: number; windowMs: number }> {
  try {
    // Check cache first
    const cached = planCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const limits = PLAN_RATE_LIMITS[cached.plan];
      return {
        max: limits.burst,
        windowMs: limits.window * 60 * 1000
      };
    }

    if (userType === 'manufacturer') {
      const manufacturer = await Manufacturer.findById(userId).select('isVerified');
      if (manufacturer) {
        const limits = manufacturer.isVerified ? 
          MANUFACTURER_RATE_LIMITS.verified : 
          MANUFACTURER_RATE_LIMITS.unverified;
        
        return {
          max: limits.burst,
          windowMs: limits.window * 60 * 1000
        };
      }
    } else {
      // Brand user - get their plan from BrandSettings
      const brandSettings = await BrandSettings.findOne({ business: userId }).select('plan');
      if (brandSettings && brandSettings.plan) {
        const plan = brandSettings.plan as PlanKey;
        
        // Cache the plan
        planCache.set(userId, { plan, timestamp: Date.now() });
        
        const limits = PLAN_RATE_LIMITS[plan];
        return {
          max: limits.burst,
          windowMs: limits.window * 60 * 1000
        };
      }
    }

    // Fallback to foundation plan limits
    const limits = PLAN_RATE_LIMITS.foundation;
    return {
      max: limits.burst,
      windowMs: limits.window * 60 * 1000
    };
  } catch (error) {
    console.error('Error getting user rate limit:', error);
    // Fallback to foundation plan
    const limits = PLAN_RATE_LIMITS.foundation;
    return {
      max: limits.burst,
      windowMs: limits.window * 60 * 1000
    };
  }
}

/**
 * Generate a unique key for rate limiting
 */
function generateRateLimitKey(req: Request): string {
  // Check for manufacturer auth first
  const manufacturerReq = req as ManufacturerAuthRequest;
  if (manufacturerReq.userId && manufacturerReq.manufacturer) {
    return `mfg:${manufacturerReq.userId}`;
  }

  // Check for regular auth
  const authReq = req as AuthRequest;
  if (authReq.userId) {
    return `user:${authReq.userId}`;
  }

  // Fall back to IP address for unauthenticated requests
  const forwardedFor = req.get('X-Forwarded-For');
  const realIp = req.get('X-Real-IP');
  const ip = forwardedFor?.split(',')[0] || realIp || req.ip;
  
  return `ip:${ip}`;
}

/**
 * Determine user type for rate limiting
 */
function getUserType(req: Request): 'brand' | 'manufacturer' | 'anonymous' {
  const manufacturerReq = req as ManufacturerAuthRequest;
  if (manufacturerReq.manufacturer) return 'manufacturer';
  
  const authReq = req as AuthRequest;
  if (authReq.userId) return 'brand';
  
  return 'anonymous';
}

/**
 * Dynamic rate limiter that adjusts limits based on user plan and type
 */
export function dynamicRateLimiter() {
  return rateLimit({
    windowMs: DEFAULT_RATE_LIMIT.window * 60 * 1000, // Default window
    max: DEFAULT_RATE_LIMIT.burst, // Default max requests

    // Custom key generator
    keyGenerator: generateRateLimitKey,

    // Dynamic rate limit based on user
    skip: async (req: Request) => {
      // Skip rate limiting for health checks and metrics
      if (req.path === '/health' || req.path === '/metrics') {
        return true;
      }
      return false;
    },

    // Custom rate limit logic
    max: async (req: Request) => {
      const userType = getUserType(req);
      
      if (userType === 'anonymous') {
        return DEFAULT_RATE_LIMIT.burst;
      }

      const manufacturerReq = req as ManufacturerAuthRequest;
      const authReq = req as AuthRequest;
      const userId = manufacturerReq.userId || authReq.userId;

      if (!userId) {
        return DEFAULT_RATE_LIMIT.burst;
      }

      try {
        const limits = await getUserRateLimit(userId, userType);
        return limits.max;
      } catch (error) {
        console.error('Error in dynamic rate limit:', error);
        return DEFAULT_RATE_LIMIT.burst;
      }
    },

    // Custom window based on user
    windowMs: async (req: Request) => {
      const userType = getUserType(req);
      
      if (userType === 'anonymous') {
        return DEFAULT_RATE_LIMIT.window * 60 * 1000;
      }

      const manufacturerReq = req as ManufacturerAuthRequest;
      const authReq = req as AuthRequest;
      const userId = manufacturerReq.userId || authReq.userId;

      if (!userId) {
        return DEFAULT_RATE_LIMIT.window * 60 * 1000;
      }

      try {
        const limits = await getUserRateLimit(userId, userType);
        return limits.windowMs;
      } catch (error) {
        console.error('Error in dynamic window calculation:', error);
        return DEFAULT_RATE_LIMIT.window * 60 * 1000;
      }
    },

    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response) => {
      const userType = getUserType(req);
      const key = generateRateLimitKey(req);
      
      console.warn(`Rate limit exceeded for ${userType} ${key} on ${req.method} ${req.path}`);
      
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(res.getHeader('Retry-After') as number) || 60,
        userType,
        code: 'RATE_LIMIT_EXCEEDED'
      });
    },

    // Add headers with rate limit info
    standardHeaders: true,
    legacyHeaders: false,

    // Use Redis store for distributed deployments
    // store: new RedisStore({
    //   sendCommand: (...args: string[]) => redisClient.call(...args),
    // })
  });
}

/**
 * Strict rate limiter for sensitive endpoints (auth, payments, etc.)
 */
export function strictRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    keyGenerator: generateRateLimitKey,
    
    handler: (req: Request, res: Response) => {
      const key = generateRateLimitKey(req);
      console.warn(`Strict rate limit exceeded for ${key} on ${req.method} ${req.path}`);
      
      res.status(429).json({
        error: 'Too many attempts',
        message: 'You have exceeded the maximum number of attempts. Please try again later.',
        retryAfter: 15 * 60, // 15 minutes
        code: 'STRICT_RATE_LIMIT_EXCEEDED'
      });
    },

    standardHeaders: true,
    legacyHeaders: false
  });
}

/**
 * API-specific rate limiter for external integrations
 */
export function apiRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: async (req: Request) => {
      const userType = getUserType(req);
      
      if (userType === 'anonymous') return 10; // Very restrictive for anonymous
      
      const manufacturerReq = req as ManufacturerAuthRequest;
      const authReq = req as AuthRequest;
      const userId = manufacturerReq.userId || authReq.userId;

      if (userId) {
        const limits = await getUserRateLimit(userId, userType);
        return Math.floor(limits.max / 2); // API endpoints get half the normal limit
      }
      
      return 20; // Default for authenticated users
    },
    
    keyGenerator: (req: Request) => {
      const baseKey = generateRateLimitKey(req);
      return `api:${baseKey}`;
    },

    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'API rate limit exceeded',
        message: 'Too many API requests. Please reduce your request frequency.',
        code: 'API_RATE_LIMIT_EXCEEDED'
      });
    },

    standardHeaders: true,
    legacyHeaders: false
  });
}

/**
 * Middleware to clear rate limit cache when plan changes
 */
export function clearPlanCache(userId: string): void {
  planCache.delete(userId);
}

/**
 * Middleware to warm up plan cache for authenticated users
 */
export function warmupPlanCache() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userType = getUserType(req);
    
    if (userType !== 'anonymous') {
      const manufacturerReq = req as ManufacturerAuthRequest;
      const authReq = req as AuthRequest;
      const userId = manufacturerReq.userId || authReq.userId;

      if (userId && !planCache.has(userId)) {
        // Preload user's rate limit configuration
        await getUserRateLimit(userId, userType);
      }
    }
    
    next();
  };
}