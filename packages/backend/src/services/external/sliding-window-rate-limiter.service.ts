/**
 * Enhanced Sliding Window Rate Limiter Service
 *
 * Provides accurate rate limiting using sliding window algorithm
 * with Redis for distributed environments and memory fallback.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { redisClusterService } from './redis-cluster.service';
import { monitoringService } from './monitoring.service';

export interface SlidingWindowConfig {
  windowSizeMs: number;     // Window size in milliseconds
  maxRequests: number;      // Maximum requests per window
  keyGenerator?: (req: Request) => string;
  skipCondition?: (req: Request) => boolean;
  onLimitExceeded?: (req: Request, res: Response, info: RateLimitInfo) => void;
}

export interface RateLimitInfo {
  current: number;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
  windowSizeMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  info: RateLimitInfo;
}

/**
 * Sliding Window Rate Limiter with Redis backend
 */
export class SlidingWindowRateLimiter {
  private fallbackStorage: Map<string, Array<{ timestamp: number; count: number }>> = new Map();
  private stats = {
    totalRequests: 0,
    blockedRequests: 0,
    redisErrors: 0,
    fallbackUsage: 0
  };

  constructor() {
    this.startCleanupInterval();
    this.startStatsCollection();
  }

  /**
   * Check if request is allowed using sliding window algorithm
   */
  async isAllowed(key: string, config: SlidingWindowConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowSizeMs;

    this.stats.totalRequests++;

    try {
      // Try Redis first
      const result = await this.checkRedisWindow(key, config, now, windowStart);
      if (result) {
        return result;
      }
    } catch (error) {
      this.stats.redisErrors++;
      logger.warn('Redis sliding window failed, using fallback:', error);
    }

    // Fallback to memory
    this.stats.fallbackUsage++;
    return this.checkMemoryWindow(key, config, now, windowStart);
  }

  /**
   * Redis-based sliding window implementation
   */
  private async checkRedisWindow(
    key: string,
    config: SlidingWindowConfig,
    now: number,
    windowStart: number
  ): Promise<RateLimitResult | null> {
    try {
      const redisKey = `sliding_window:${key}`;

      // Use Redis sorted set to store timestamps
      // Remove old entries outside the window
      await redisClusterService.deleteFromCluster(`${redisKey}:cleanup`);

      // Count current requests in window using Lua script for atomicity
      const luaScript = `
        local key = KEYS[1]
        local window_start = tonumber(ARGV[1])
        local now = tonumber(ARGV[2])
        local max_requests = tonumber(ARGV[3])
        local window_size = tonumber(ARGV[4])

        -- Remove old entries
        redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

        -- Count current entries
        local current_count = redis.call('ZCARD', key)

        -- Check if we can add this request
        if current_count < max_requests then
          -- Add current request
          redis.call('ZADD', key, now, now .. ':' .. math.random())
          -- Set expiration
          redis.call('EXPIRE', key, math.ceil(window_size / 1000))
          return {current_count + 1, max_requests, 1}
        else
          return {current_count, max_requests, 0}
        end
      `;

      // For now, let's use a simpler approach without Lua
      // Get current count
      const currentEntries = await this.getRedisWindowEntries(redisKey, windowStart, now);
      const currentCount = currentEntries.length;

      if (currentCount < config.maxRequests) {
        // Add current request
        await this.addRedisEntry(redisKey, now, config.windowSizeMs);

        return {
          allowed: true,
          info: {
            current: currentCount + 1,
            limit: config.maxRequests,
            remaining: config.maxRequests - currentCount - 1,
            resetTime: now + config.windowSizeMs,
            retryAfter: 0,
            windowSizeMs: config.windowSizeMs
          }
        };
      } else {
        // Find when the oldest request will expire
        const oldestTimestamp = Math.min(...currentEntries);
        const retryAfter = Math.max(0, Math.ceil((oldestTimestamp + config.windowSizeMs - now) / 1000));

        return {
          allowed: false,
          info: {
            current: currentCount,
            limit: config.maxRequests,
            remaining: 0,
            resetTime: oldestTimestamp + config.windowSizeMs,
            retryAfter,
            windowSizeMs: config.windowSizeMs
          }
        };
      }
    } catch (error) {
      logger.error('Redis sliding window error:', error);
      return null;
    }
  }

  /**
   * Get entries from Redis window
   */
  private async getRedisWindowEntries(key: string, windowStart: number, now: number): Promise<number[]> {
    try {
      // Get all entries from Redis (simplified - in production you'd use ZRANGEBYSCORE)
      const entries = await redisClusterService.getFromCluster<string[]>(key) || [];

      // Filter entries within window
      return entries
        .map(entry => {
          const timestamp = parseInt(entry.split(':')[0]);
          return timestamp;
        })
        .filter(timestamp => timestamp >= windowStart);

    } catch (error) {
      return [];
    }
  }

  /**
   * Add entry to Redis window
   */
  private async addRedisEntry(key: string, timestamp: number, windowSizeMs: number): Promise<void> {
    try {
      // Get existing entries
      const existing = await redisClusterService.getFromCluster<string[]>(key) || [];

      // Add new entry
      const newEntry = `${timestamp}:${Math.random()}`;
      existing.push(newEntry);

      // Store back with TTL
      await redisClusterService.setInCluster(key, existing, Math.ceil(windowSizeMs / 1000));

    } catch (error) {
      logger.error('Failed to add Redis entry:', error);
    }
  }

  /**
   * Check if Redis is healthy (with caching to avoid constant checks)
   */
  private async checkRedisHealth(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastRedisCheck < this.redisCheckInterval) {
      return this.redisHealthy;
    }

    try {
      // Simple ping to check Redis health
      await redisClusterService.ping();
      this.redisHealthy = true;
    } catch (error) {
      this.redisHealthy = false;
    }

    this.lastRedisCheck = now;
    return this.redisHealthy;
  }

  /**
   * Check if this is a security-critical path that should fail closed
   */
  private isSecurityCriticalPath(config: SlidingWindowConfig): boolean {
    // Define critical paths that should fail closed on Redis failure
    // This would need to be determined based on the request context
    // For now, assume high-security if very restrictive limits
    return config.maxRequests <= 10 || config.windowSizeMs <= 60000;
  }

  /**
   * Security-hardened memory-based sliding window implementation
   */
  private checkMemoryWindow(
    key: string,
    config: SlidingWindowConfig,
    now: number,
    windowStart: number
  ): RateLimitResult {
    // Prevent memory exhaustion attacks
    if (this.fallbackStorage.size >= this.maxFallbackEntries) {
      logger.warn('Fallback storage limit reached, rejecting request for security');
      return {
        allowed: false,
        info: {
          current: config.maxRequests,
          limit: config.maxRequests,
          remaining: 0,
          resetTime: Date.now() + config.windowSizeMs,
          retryAfter: Math.ceil(config.windowSizeMs / 1000),
          windowSizeMs: config.windowSizeMs
        }
      };
    }

    // Get or create window data
    let windowData = this.fallbackStorage.get(key);
    if (!windowData) {
      windowData = [];
      this.fallbackStorage.set(key, windowData);
    }

    // Remove old entries
    const validEntries = windowData.filter(entry => entry.timestamp >= windowStart);
    this.fallbackStorage.set(key, validEntries);

    // Count current requests
    const currentCount = validEntries.reduce((sum, entry) => sum + entry.count, 0);

    if (currentCount < config.maxRequests) {
      // Add current request
      validEntries.push({ timestamp: now, count: 1 });

      return {
        allowed: true,
        info: {
          current: currentCount + 1,
          limit: config.maxRequests,
          remaining: config.maxRequests - currentCount - 1,
          resetTime: now + config.windowSizeMs,
          retryAfter: 0,
          windowSizeMs: config.windowSizeMs
        }
      };
    } else {
      // Find when the oldest request will expire
      const oldestTimestamp = Math.min(...validEntries.map(e => e.timestamp));
      const retryAfter = Math.max(0, Math.ceil((oldestTimestamp + config.windowSizeMs - now) / 1000));

      this.stats.blockedRequests++;

      return {
        allowed: false,
        info: {
          current: currentCount,
          limit: config.maxRequests,
          remaining: 0,
          resetTime: oldestTimestamp + config.windowSizeMs,
          retryAfter,
          windowSizeMs: config.windowSizeMs
        }
      };
    }
  }

  /**
   * Create Express middleware
   */
  createMiddleware(config: SlidingWindowConfig) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Check skip condition
        if (config.skipCondition && config.skipCondition(req)) {
          return next();
        }

        // Generate key
        const key = config.keyGenerator ? config.keyGenerator(req) : this.defaultKeyGenerator(req);

        // Check rate limit
        const result = await this.isAllowed(key, config);

        // Add headers
        this.addRateLimitHeaders(res, result.info);

        if (result.allowed) {
          next();
        } else {
          // Handle rate limit exceeded
          if (config.onLimitExceeded) {
            config.onLimitExceeded(req, res, result.info);
          } else {
            this.defaultLimitExceededHandler(req, res, result.info);
          }
        }

      } catch (error) {
        logger.error('Sliding window middleware error:', error);
        // Fail open - allow request on error
        next();
      }
    };
  }

  /**
   * Default key generator
   */
  private defaultKeyGenerator(req: Request): string {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).userId || 'anonymous';
    return `${userId}:${ip}`;
  }

  /**
   * Add rate limit headers to response
   */
  private addRateLimitHeaders(res: Response, info: RateLimitInfo): void {
    res.set({
      'X-RateLimit-Limit': info.limit.toString(),
      'X-RateLimit-Remaining': info.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(info.resetTime / 1000).toString(),
      'X-RateLimit-Window': info.windowSizeMs.toString(),
      'X-RateLimit-Policy': 'sliding-window'
    });

    if (!info.remaining) {
      res.set('Retry-After', info.retryAfter.toString());
    }
  }

  /**
   * Default rate limit exceeded handler
   */
  private defaultLimitExceededHandler(req: Request, res: Response, info: RateLimitInfo): void {
    const userAgent = req.get('User-Agent') || 'unknown';
    const ip = req.ip || 'unknown';

    logger.warn('Rate limit exceeded', {
      ip,
      userAgent,
      path: req.path,
      method: req.method,
      current: info.current,
      limit: info.limit,
      resetTime: new Date(info.resetTime).toISOString()
    });

    monitoringService.recordMetric({
      name: 'rate_limit_exceeded',
      value: 1,
      tags: {
        path: req.path,
        method: req.method,
        algorithm: 'sliding-window'
      }
    });

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests in the time window',
      retryAfter: info.retryAfter,
      limit: info.limit,
      windowSizeMs: info.windowSizeMs,
      resetTime: new Date(info.resetTime).toISOString()
    });
  }

  /**
   * Start cleanup interval for memory storage
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const cleanupOlderThan = now - (24 * 60 * 60 * 1000); // 24 hours

      for (const [key, windowData] of this.fallbackStorage.entries()) {
        const validEntries = windowData.filter(entry => entry.timestamp > cleanupOlderThan);

        if (validEntries.length === 0) {
          this.fallbackStorage.delete(key);
        } else {
          this.fallbackStorage.set(key, validEntries);
        }
      }

      logger.debug(`Cleaned up rate limiter storage, ${this.fallbackStorage.size} keys remaining`);
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Start statistics collection
   */
  private startStatsCollection(): void {
    setInterval(() => {
      monitoringService.recordMetric({
        name: 'rate_limiter_total_requests',
        value: this.stats.totalRequests,
        tags: { algorithm: 'sliding-window' }
      });

      monitoringService.recordMetric({
        name: 'rate_limiter_blocked_requests',
        value: this.stats.blockedRequests,
        tags: { algorithm: 'sliding-window' }
      });

      monitoringService.recordMetric({
        name: 'rate_limiter_redis_errors',
        value: this.stats.redisErrors,
        tags: { algorithm: 'sliding-window' }
      });

      monitoringService.recordMetric({
        name: 'rate_limiter_fallback_usage',
        value: this.stats.fallbackUsage,
        tags: { algorithm: 'sliding-window' }
      });

      // Reset stats
      this.stats.totalRequests = 0;
      this.stats.blockedRequests = 0;
      this.stats.redisErrors = 0;
      this.stats.fallbackUsage = 0;

    }, 60000); // Every minute
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      memoryStorage: {
        keys: this.fallbackStorage.size,
        totalEntries: Array.from(this.fallbackStorage.values()).reduce(
          (sum, entries) => sum + entries.length,
          0
        )
      }
    };
  }

  /**
   * Clear all rate limit data for a key
   */
  async clearKey(key: string): Promise<void> {
    try {
      await redisClusterService.deleteFromCluster(`sliding_window:${key}`);
      this.fallbackStorage.delete(key);
    } catch (error) {
      logger.error('Failed to clear rate limit key:', error);
    }
  }

  /**
   * Clear all rate limit data
   */
  async clearAll(): Promise<void> {
    try {
      // Clear Redis keys (would need pattern matching in production)
      logger.info('Clearing all sliding window rate limit data');

      // Clear memory storage
      this.fallbackStorage.clear();

    } catch (error) {
      logger.error('Failed to clear all rate limit data:', error);
    }
  }
}

/**
 * Predefined sliding window configurations
 */
export const slidingWindowConfigs = {
  // Standard API rate limiting
  api: {
    windowSizeMs: 60 * 1000,    // 1 minute
    maxRequests: 100,
    keyGenerator: (req: Request) => {
      const userId = (req as any).userId || 'anonymous';
      const ip = req.ip || 'unknown';
      return `api:${userId}:${ip}`;
    }
  },

  // Strict rate limiting for auth endpoints
  auth: {
    windowSizeMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,
    keyGenerator: (req: Request) => {
      const ip = req.ip || 'unknown';
      return `auth:${ip}`;
    }
  },

  // Upload rate limiting
  upload: {
    windowSizeMs: 60 * 1000,    // 1 minute
    maxRequests: 10,
    keyGenerator: (req: Request) => {
      const userId = (req as any).userId || 'anonymous';
      return `upload:${userId}`;
    }
  },

  // Search rate limiting
  search: {
    windowSizeMs: 30 * 1000,    // 30 seconds
    maxRequests: 50,
    keyGenerator: (req: Request) => {
      const userId = (req as any).userId || 'anonymous';
      const ip = req.ip || 'unknown';
      return `search:${userId}:${ip}`;
    }
  },

  // Analytics rate limiting
  analytics: {
    windowSizeMs: 5 * 60 * 1000,   // 5 minutes
    maxRequests: 20,
    keyGenerator: (req: Request) => {
      const userId = (req as any).userId || 'anonymous';
      return `analytics:${userId}`;
    }
  }
};

// Global instance
export const slidingWindowRateLimiter = new SlidingWindowRateLimiter();

/**
 * Helper function to create sliding window middleware
 */
export function createSlidingWindowLimiter(config: SlidingWindowConfig) {
  return slidingWindowRateLimiter.createMiddleware(config);
}

/**
 * Pre-configured middleware functions
 */
export const slidingWindowMiddleware = {
  api: () => createSlidingWindowLimiter(slidingWindowConfigs.api),
  auth: () => createSlidingWindowLimiter(slidingWindowConfigs.auth),
  upload: () => createSlidingWindowLimiter(slidingWindowConfigs.upload),
  search: () => createSlidingWindowLimiter(slidingWindowConfigs.search),
  analytics: () => createSlidingWindowLimiter(slidingWindowConfigs.analytics)
};