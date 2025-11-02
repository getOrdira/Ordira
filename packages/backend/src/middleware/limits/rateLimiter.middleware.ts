import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { logger } from '../../utils/logger';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { BrandSettings } from '../../models/brands/brandSettings.model';
import { Manufacturer } from '../../models/manufacturer/manufacturer.model';
import { PlanKey, PLAN_DEFINITIONS } from '../../constants/plans';
import { ManufacturerPlanKey, MANUFACTURER_PLAN_DEFINITIONS } from '../../constants/manufacturerPlans';
import { UnifiedAuthRequest } from '../auth/unifiedAuth.middleware';
import redis from 'ioredis';

// Type compatibility helper for express-rate-limit
type CompatibleRequest = Parameters<RateLimitRequestHandler>[0];
type CompatibleResponse = Parameters<RateLimitRequestHandler>[1];



const redisClient= new redis(process.env.REDIS_URL || 'redis://localhost:6379');

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
 * Customer/User rate limits (simplified for voters)
 */
const USER_RATE_LIMITS = {
  rpm: 3,    // 50 requests per minute
  burst: 5, // 100 burst requests
  window: 1   // 1 minute window
};

/**
 * Supply chain event rate limits per manufacturer plan (blockchain transactions)
 * These are more restrictive since they involve gas costs
 */
const SUPPLY_CHAIN_RATE_LIMITS: Record<ManufacturerPlanKey, { 
  eventsPerMinute: number; 
  eventsPerHour: number; 
  eventsPerDay: number;
  burstAllowance: number;
  cooldownPeriod: number; // seconds between events
}> = {
  starter: { 
    eventsPerMinute: 2, 
    eventsPerHour: 10, 
    eventsPerDay: 50,
    burstAllowance: 5,
    cooldownPeriod: 30 // 30 seconds between events
  },
  professional: { 
    eventsPerMinute: 5, 
    eventsPerHour: 30, 
    eventsPerDay: 200,
    burstAllowance: 10,
    cooldownPeriod: 15 // 15 seconds between events
  },
  enterprise: { 
    eventsPerMinute: 10, 
    eventsPerHour: 100, 
    eventsPerDay: 1000,
    burstAllowance: 25,
    cooldownPeriod: 10 // 10 seconds between events
  },
  unlimited: { 
    eventsPerMinute: 30, 
    eventsPerHour: 500, 
    eventsPerDay: 5000,
    burstAllowance: 100,
    cooldownPeriod: 5 // 5 seconds between events
  }
};

/**
 * Cache for user plan information to avoid repeated database queries
 */
const planCache = new Map<string, { plan: PlanKey; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user's rate limit configuration based on their plan
 */
async function getUserRateLimit(userId: string, userType: 'brand' | 'manufacturer' | 'user'): Promise<{ max: number; windowMs: number }> {
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
    } else if (userType === 'user') {
      // Customer/User - use simplified rate limits
      return {
        max: USER_RATE_LIMITS.burst,
        windowMs: USER_RATE_LIMITS.window * 60 * 1000
      };
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
    logger.error('Error getting user rate limit:', error);
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
  const unifiedReq = req as UnifiedAuthRequest;
  if (unifiedReq.userId && unifiedReq.userType) {
    return `${unifiedReq.userType}:${unifiedReq.userId}`;
  }

  // Fall back to IP address for unauthenticated requests
  const forwardedFor = req.get('X-Forwarded-For');
  const realIp = req.get('X-Real-IP');
  const forwardedForStr = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const ip = forwardedForStr?.split(',')[0] || realIp || req.ip;
  
  return `ip:${ip}`;
}

/**
 * Determine user type for rate limiting
 */
function getUserType(req: Request): 'brand' | 'manufacturer' | 'user' | 'anonymous' {
  const unifiedReq = req as UnifiedAuthRequest;
  if (unifiedReq.userId && unifiedReq.userType) {
    switch (unifiedReq.userType) {
      case 'manufacturer':
        return 'manufacturer';
      case 'business':
        return 'brand';
      case 'user':
        return 'user';
      default:
        return 'anonymous';
    }
  }
  
  return 'anonymous';
}

/**
 * Dynamic rate limiter that adjusts limits based on user plan and type
 */
export function dynamicRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    // Remove the static windowMs and max - we'll use dynamic ones
    
    // Custom key generator
    keyGenerator: (req: CompatibleRequest) => generateRateLimitKey(req as unknown as Request),

    // Dynamic rate limit based on user
    skip: async (req: CompatibleRequest) => {
      // Skip rate limiting for health checks and metrics
      if (req.path === '/health' || req.path === '/metrics') {
        return true;
      }
      return false;
    },

    // Custom rate limit logic (keep only this max property)
    max: async (req: CompatibleRequest) => {
      const userType = getUserType(req as unknown as Request);
      
      if (userType === 'anonymous') {
        return DEFAULT_RATE_LIMIT.burst;
      }

      const unifiedReq = req as unknown as UnifiedAuthRequest;
      const userId = unifiedReq.userId;

      if (!userId) {
        return DEFAULT_RATE_LIMIT.burst;
      }

      try {
        const limits = await getUserRateLimit(userId, userType);
        return limits.max;
      } catch (error) {
        logger.error('Error in dynamic rate limit:', error);
        return DEFAULT_RATE_LIMIT.burst;
      }
    },

    // Use static windowMs (rate limiting libraries typically don't support async windowMs)
    windowMs: DEFAULT_RATE_LIMIT.window * 60 * 1000,

    // Custom handler for rate limit exceeded
    handler: (req: CompatibleRequest, res: CompatibleResponse) => {
      const userType = getUserType(req as unknown as Request);
      const key = generateRateLimitKey(req as unknown as Request);
      
      logger.warn('Rate limit exceeded for ${userType} ${key} on ${req.method} ${req.path}');
      
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(res.getHeader('Retry-After') as number) || 60,
        userType,
        code: 'RATE_LIMIT_EXCEEDED'
      });
    },

    standardHeaders: true,
    legacyHeaders: false,
  });
}

/**
 * Strict rate limiter for sensitive endpoints (auth, payments, etc.)
 */
export function strictRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    keyGenerator: (req: CompatibleRequest) => generateRateLimitKey(req as unknown as Request),
    
    handler: (req: CompatibleRequest, res: CompatibleResponse) => {
      const key = generateRateLimitKey(req as unknown as Request);
      logger.warn('Strict rate limit exceeded for ${key} on ${req.method} ${req.path}');
      
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
export function apiRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: async (req: CompatibleRequest) => {
      const userType = getUserType(req as unknown as Request);
      
      if (userType === 'anonymous') return 10; // Very restrictive for anonymous
      
      const unifiedReq = req as unknown as UnifiedAuthRequest;
      const userId = unifiedReq.userId;

      if (userId) {
        const limits = await getUserRateLimit(userId, userType);
        return Math.floor(limits.max / 2); // API endpoints get half the normal limit
      }
      
      return 20; // Default for authenticated users
    },
    
    keyGenerator: (req: CompatibleRequest) => {
      const baseKey = generateRateLimitKey(req as unknown as Request);
      return `api:${baseKey}`;
    },

    handler: (req: CompatibleRequest, res: CompatibleResponse) => {
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
 * Supply chain event rate limiter with plan-based limits and abuse prevention
 */
export function supplyChainRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: async (req: CompatibleRequest) => {
      const unifiedReq = req as unknown as UnifiedAuthRequest;
      if (!unifiedReq.userId || unifiedReq.userType !== 'manufacturer') {
        return 0; // No access for non-manufacturers
      }

      try {
        // Get manufacturer's plan
        const manufacturer = await Manufacturer.findById(unifiedReq.userId).select('plan');
        const plan = manufacturer?.plan || 'starter';
        const limits = SUPPLY_CHAIN_RATE_LIMITS[plan as ManufacturerPlanKey];
        
        return limits.eventsPerMinute;
      } catch (error) {
        logger.error('Error getting supply chain rate limit:', error);
        return SUPPLY_CHAIN_RATE_LIMITS.starter.eventsPerMinute; // Fallback to starter
      }
    },
    
    keyGenerator: (req: CompatibleRequest) => {
      const unifiedReq = req as unknown as UnifiedAuthRequest;
      return `supply-chain:${unifiedReq.userId}`;
    },

    skip: async (req: CompatibleRequest) => {
      // Skip rate limiting for health checks
      if (req.path === '/health' || req.path === '/metrics') {
        return true;
      }
      return false;
    },

    handler: (req: CompatibleRequest, res: CompatibleResponse) => {
      const unifiedReq = req as unknown as UnifiedAuthRequest;
      const key = `supply-chain:${unifiedReq.userId}`;
      
      logger.warn('Supply chain rate limit exceeded for manufacturer ${manufacturerReq.userId} on ${req.method} ${req.path}');
      
      res.status(429).json({
        error: 'Supply chain event rate limit exceeded',
        message: 'Too many supply chain events. These are blockchain transactions with gas costs.',
        retryAfter: Math.ceil(res.getHeader('Retry-After') as number) || 60,
        code: 'SUPPLY_CHAIN_RATE_LIMIT_EXCEEDED',
        limits: {
          window: '1 minute',
          reason: 'Blockchain transactions require rate limiting to prevent abuse and manage gas costs'
        }
      });
    },

    standardHeaders: true,
    legacyHeaders: false,
  });
}

/**
 * Enhanced supply chain rate limiter with multiple time windows and cooldown
 */
export function enhancedSupplyChainRateLimiter(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const unifiedReq = req as UnifiedAuthRequest;
    
    if (!unifiedReq.userId || unifiedReq.userType !== 'manufacturer') {
      res.status(401).json({
        error: 'Manufacturer authentication required',
        code: 'MANUFACTURER_AUTH_REQUIRED'
      });
      return;
    }

    try {
      // Get manufacturer's plan and limits
      const manufacturer = await Manufacturer.findById(unifiedReq.userId).select('plan');
      const plan = manufacturer?.plan || 'starter';
      const limits = SUPPLY_CHAIN_RATE_LIMITS[plan as ManufacturerPlanKey];
      
      const now = Date.now();
      const minuteKey = `sc:${unifiedReq.userId}:min:${Math.floor(now / 60000)}`;
      const hourKey = `sc:${unifiedReq.userId}:hour:${Math.floor(now / 3600000)}`;
      const dayKey = `sc:${unifiedReq.userId}:day:${Math.floor(now / 86400000)}`;
      const cooldownKey = `sc:${unifiedReq.userId}:cooldown`;
      
      // Check cooldown period
      const lastEvent = await redisClient.get(cooldownKey);
      if (lastEvent) {
        const timeSinceLastEvent = now - parseInt(lastEvent);
        if (timeSinceLastEvent < limits.cooldownPeriod * 1000) {
          const waitTime = Math.ceil((limits.cooldownPeriod * 1000 - timeSinceLastEvent) / 1000);
          
          res.status(429).json({
            error: 'Supply chain event cooldown active',
            message: `Please wait ${waitTime} seconds before logging another event`,
            retryAfter: waitTime,
            code: 'SUPPLY_CHAIN_COOLDOWN_ACTIVE',
            limits: {
              cooldownPeriod: limits.cooldownPeriod,
              plan: plan
            }
          });
          return;
        }
      }
      
      // Check rate limits using Redis counters
      const [minuteCount, hourCount, dayCount] = await Promise.all([
        redisClient.incr(minuteKey),
        redisClient.incr(hourKey),
        redisClient.incr(dayKey)
      ]);
      
      // Set expiration for counters
      await Promise.all([
        redisClient.expire(minuteKey, 60),
        redisClient.expire(hourKey, 3600),
        redisClient.expire(dayKey, 86400)
      ]);
      
      // Check if any limit is exceeded
      if (minuteCount > limits.eventsPerMinute) {
        res.status(429).json({
          error: 'Supply chain events per minute limit exceeded',
          message: `Maximum ${limits.eventsPerMinute} events per minute allowed for ${plan} plan`,
          retryAfter: 60,
          code: 'SUPPLY_CHAIN_MINUTE_LIMIT_EXCEEDED',
          limits: {
            current: minuteCount,
            limit: limits.eventsPerMinute,
            plan: plan
          }
        });
        return;
      }
      
      if (hourCount > limits.eventsPerHour) {
        res.status(429).json({
          error: 'Supply chain events per hour limit exceeded',
          message: `Maximum ${limits.eventsPerHour} events per hour allowed for ${plan} plan`,
          retryAfter: 3600,
          code: 'SUPPLY_CHAIN_HOUR_LIMIT_EXCEEDED',
          limits: {
            current: hourCount,
            limit: limits.eventsPerHour,
            plan: plan
          }
        });
        return;
      }
      
      if (dayCount > limits.eventsPerDay) {
        res.status(429).json({
          error: 'Supply chain events per day limit exceeded',
          message: `Maximum ${limits.eventsPerDay} events per day allowed for ${plan} plan`,
          retryAfter: 86400,
          code: 'SUPPLY_CHAIN_DAY_LIMIT_EXCEEDED',
          limits: {
            current: dayCount,
            limit: limits.eventsPerDay,
            plan: plan
          }
        });
        return;
      }
      
      // Set cooldown timestamp
      await redisClient.setex(cooldownKey, limits.cooldownPeriod, now.toString());
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit-Minute': limits.eventsPerMinute.toString(),
        'X-RateLimit-Remaining-Minute': Math.max(0, limits.eventsPerMinute - minuteCount).toString(),
        'X-RateLimit-Limit-Hour': limits.eventsPerHour.toString(),
        'X-RateLimit-Remaining-Hour': Math.max(0, limits.eventsPerHour - hourCount).toString(),
        'X-RateLimit-Limit-Day': limits.eventsPerDay.toString(),
        'X-RateLimit-Remaining-Day': Math.max(0, limits.eventsPerDay - dayCount).toString(),
        'X-RateLimit-Cooldown': limits.cooldownPeriod.toString(),
        'X-RateLimit-Plan': plan
      });
      
      next();
    } catch (error) {
      logger.error('Enhanced supply chain rate limiter error:', error);
      res.status(500).json({
        error: 'Rate limiter error',
        message: 'Unable to process rate limiting',
        code: 'RATE_LIMITER_ERROR'
      });
    }
  };
}

/**
 * Middleware to warm up plan cache for authenticated users
 */
export function warmupPlanCache() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userType = getUserType(req);
    
    if (userType !== 'anonymous') {
      const unifiedReq = req as unknown as UnifiedAuthRequest;
      const userId = unifiedReq.userId;

      if (userId && !planCache.has(userId)) {
        // Preload user's rate limit configuration
        await getUserRateLimit(userId, userType);
      }
    }
    
    next();
  };
}



