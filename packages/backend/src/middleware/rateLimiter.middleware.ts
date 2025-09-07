import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { BrandSettings } from '../models/brandSettings.model';
import { Manufacturer } from '../models/manufacturer.model';
import { PlanKey, PLAN_DEFINITIONS } from '../constants/plans';
import { ManufacturerPlanKey, MANUFACTURER_PLAN_DEFINITIONS } from '../constants/manufacturerPlans';
import { AuthRequest } from './auth.middleware';
import { ManufacturerAuthRequest } from './manufacturerAuth.middleware';
import redis from 'ioredis';

// Redis store for distributed rate limiting (optional)
// import RedisStore from 'rate-limit-redis';
// import Redis from 'ioredis';

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
function getUserType(req: Request): 'brand' | 'manufacturer' | 'user' | 'anonymous' {
  const manufacturerReq = req as ManufacturerAuthRequest;
  if (manufacturerReq.manufacturer) return 'manufacturer';
  
  const authReq = req as AuthRequest;
  if (authReq.userId) {
    // Check if this is a customer/user or business based on userType
    return authReq.userType === 'user' ? 'user' : 'brand';
  }
  
  return 'anonymous';
}

/**
 * Dynamic rate limiter that adjusts limits based on user plan and type
 */
export function dynamicRateLimiter() {
  return rateLimit({
    // Remove the static windowMs and max - we'll use dynamic ones
    
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

    // Custom rate limit logic (keep only this max property)
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

    // Use static windowMs (rate limiting libraries typically don't support async windowMs)
    windowMs: DEFAULT_RATE_LIMIT.window * 60 * 1000,

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

    standardHeaders: true,
    legacyHeaders: false,
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
 * Supply chain event rate limiter with plan-based limits and abuse prevention
 */
export function supplyChainRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: async (req: Request) => {
      const manufacturerReq = req as ManufacturerAuthRequest;
      if (!manufacturerReq.userId || !manufacturerReq.manufacturer) {
        return 0; // No access for non-manufacturers
      }

      try {
        // Get manufacturer's plan
        const manufacturer = await Manufacturer.findById(manufacturerReq.userId).select('plan');
        const plan = manufacturer?.plan || 'starter';
        const limits = SUPPLY_CHAIN_RATE_LIMITS[plan as ManufacturerPlanKey];
        
        return limits.eventsPerMinute;
      } catch (error) {
        console.error('Error getting supply chain rate limit:', error);
        return SUPPLY_CHAIN_RATE_LIMITS.starter.eventsPerMinute; // Fallback to starter
      }
    },
    
    keyGenerator: (req: Request) => {
      const manufacturerReq = req as ManufacturerAuthRequest;
      return `supply-chain:${manufacturerReq.userId}`;
    },

    skip: async (req: Request) => {
      // Skip rate limiting for health checks
      if (req.path === '/health' || req.path === '/metrics') {
        return true;
      }
      return false;
    },

    handler: (req: Request, res: Response) => {
      const manufacturerReq = req as ManufacturerAuthRequest;
      const key = `supply-chain:${manufacturerReq.userId}`;
      
      console.warn(`Supply chain rate limit exceeded for manufacturer ${manufacturerReq.userId} on ${req.method} ${req.path}`);
      
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
export function enhancedSupplyChainRateLimiter() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const manufacturerReq = req as ManufacturerAuthRequest;
    
    if (!manufacturerReq.userId || !manufacturerReq.manufacturer) {
      res.status(401).json({
        error: 'Manufacturer authentication required',
        code: 'MANUFACTURER_AUTH_REQUIRED'
      });
      return;
    }

    try {
      // Get manufacturer's plan and limits
      const manufacturer = await Manufacturer.findById(manufacturerReq.userId).select('plan');
      const plan = manufacturer?.plan || 'starter';
      const limits = SUPPLY_CHAIN_RATE_LIMITS[plan as ManufacturerPlanKey];
      
      const now = Date.now();
      const minuteKey = `sc:${manufacturerReq.userId}:min:${Math.floor(now / 60000)}`;
      const hourKey = `sc:${manufacturerReq.userId}:hour:${Math.floor(now / 3600000)}`;
      const dayKey = `sc:${manufacturerReq.userId}:day:${Math.floor(now / 86400000)}`;
      const cooldownKey = `sc:${manufacturerReq.userId}:cooldown`;
      
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
      console.error('Enhanced supply chain rate limiter error:', error);
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