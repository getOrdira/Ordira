/**
 * Enhanced Sliding Window Rate Limiter Service
 *
 * Provides accurate rate limiting using sliding window algorithm
 * with Redis for distributed environments and memory fallback.
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../../../utils/logger';
import { redisClusterService } from '../../cache';
import { monitoringService } from '../../observability';

export interface SlidingWindowConfig {
  windowSizeMs: number;
  maxRequests: number;
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

export class SlidingWindowRateLimiter {
  private fallbackStorage = new Map<string, Array<{ timestamp: number; count: number }>>();
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

  async isAllowed(key: string, config: SlidingWindowConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowSizeMs;

    this.stats.totalRequests++;

    try {
      const result = await this.checkRedisWindow(key, config, now, windowStart);
      if (result) {
        return result;
      }
    } catch (error) {
      this.stats.redisErrors++;
      logger.warn('Redis sliding window failed, using fallback:', error);
    }

    this.stats.fallbackUsage++;
    return this.checkMemoryWindow(key, config, now, windowStart);
  }

  private async checkRedisWindow(
    key: string,
    config: SlidingWindowConfig,
    now: number,
    windowStart: number
  ): Promise<RateLimitResult | null> {
    const redisKey = `sliding_window:${key}`;

    try {
      const currentEntries = await this.getRedisWindowEntries(redisKey, windowStart, now);
      const currentCount = currentEntries.length;

      if (currentCount < config.maxRequests) {
        await this.addRedisEntry(redisKey, now, config.windowSizeMs);

        return {
          allowed: true,
          info: this.buildRateLimitInfo({
            current: currentCount + 1,
            limit: config.maxRequests,
            windowSizeMs: config.windowSizeMs,
            now,
            oldestTimestamp: currentEntries[0]?.timestamp
          })
        };
      }

      this.stats.blockedRequests++;
      return {
        allowed: false,
        info: this.buildRateLimitInfo({
          current: currentCount,
          limit: config.maxRequests,
          windowSizeMs: config.windowSizeMs,
          now,
          oldestTimestamp: currentEntries[0]?.timestamp
        })
      };
    } catch (error) {
      logger.error('Redis sliding window error:', error);
      throw error;
    }
  }

  private async getRedisWindowEntries(
    redisKey: string,
    windowStart: number,
    now: number
  ): Promise<Array<{ timestamp: number; id: string }>> {
    const client = await redisClusterService.getClient();
    if (!client) {
      throw new Error('Redis client not available');
    }

    try {
      await client.zremrangebyscore(redisKey, 0, windowStart);

      const result = await client.zrange(redisKey, 0, -1, 'WITHSCORES');
      // result is array like [value1, score1, value2, score2, ...]
      const entries: Array<{ timestamp: number; id: string }> = [];
      for (let i = 0; i < result.length; i += 2) {
        entries.push({
          timestamp: Number(result[i + 1]),
          id: result[i]
        });
      }
      return entries;
    } finally {
      redisClusterService.releaseClient(client);
    }
  }

  private async addRedisEntry(
    redisKey: string,
    timestamp: number,
    windowSizeMs: number
  ): Promise<void> {
    const client = await redisClusterService.getClient();
    if (!client) {
      throw new Error('Redis client not available');
    }

    try {
      await client.zadd(redisKey, timestamp, `${timestamp}:${Math.random()}`);
      await client.expire(redisKey, Math.ceil(windowSizeMs / 1000));
    } finally {
      redisClusterService.releaseClient(client);
    }
  }

  private checkMemoryWindow(
    key: string,
    config: SlidingWindowConfig,
    now: number,
    windowStart: number
  ): RateLimitResult {
    const entries = this.fallbackStorage.get(key) ?? [];
    const filtered = entries.filter((entry) => entry.timestamp > windowStart);

    if (filtered.length >= config.maxRequests) {
      this.stats.blockedRequests++;
      const info = this.buildRateLimitInfo({
        current: filtered.length,
        limit: config.maxRequests,
        windowSizeMs: config.windowSizeMs,
        now,
        oldestTimestamp: filtered[0]?.timestamp
      });

      this.fallbackStorage.set(key, filtered);
      return { allowed: false, info };
    }

    filtered.push({ timestamp: now, count: 1 });
    this.fallbackStorage.set(key, filtered);

    const info = this.buildRateLimitInfo({
      current: filtered.length,
      limit: config.maxRequests,
      windowSizeMs: config.windowSizeMs,
      now,
      oldestTimestamp: filtered[0]?.timestamp
    });

    return { allowed: true, info };
  }

  private buildRateLimitInfo(params: {
    current: number;
    limit: number;
    windowSizeMs: number;
    now: number;
    oldestTimestamp?: number;
  }): RateLimitInfo {
    const resetTime = params.oldestTimestamp
      ? params.oldestTimestamp + params.windowSizeMs
      : params.now + params.windowSizeMs;

    const retryAfter = Math.max(0, Math.ceil((resetTime - params.now) / 1000));

    return {
      current: params.current,
      limit: params.limit,
      remaining: Math.max(0, params.limit - params.current),
      resetTime,
      retryAfter,
      windowSizeMs: params.windowSizeMs
    };
  }

  async clearKey(key: string): Promise<void> {
    try {
      await redisClusterService.deleteFromCluster(`sliding_window:${key}`);
      this.fallbackStorage.delete(key);
    } catch (error) {
      logger.error('Failed to clear rate limit key:', error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      logger.info('Clearing all sliding window rate limit data');
      this.fallbackStorage.clear();
    } catch (error) {
      logger.error('Failed to clear all rate limit data:', error);
    }
  }

  createMiddleware(config: SlidingWindowConfig) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (config.skipCondition?.(req)) {
          next();
          return;
        }

        const key = config.keyGenerator?.(req);

        if (!key) {
          logger.warn('Sliding window rate limiter missing key generator');
          next();
          return;
        }

        const result = await this.isAllowed(key, config);
        res.setHeader('X-RateLimit-Limit', result.info.limit.toString());
        res.setHeader('X-RateLimit-Remaining', result.info.remaining.toString());
        res.setHeader('X-RateLimit-Reset', result.info.resetTime.toString());

        if (result.allowed) {
          next();
          return;
        }

        res.setHeader('Retry-After', result.info.retryAfter.toString());

        if (config.onLimitExceeded) {
          config.onLimitExceeded(req, res, result.info);
          return;
        }

        res.status(429).json({
          error: 'Too many requests',
          retryAfter: result.info.retryAfter,
          limit: result.info.limit,
          remaining: result.info.remaining
        });
      } catch (error) {
        logger.error('Sliding window middleware error:', error);
        next(error);
      }
    };
  }

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

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();

      for (const [key, entries] of this.fallbackStorage.entries()) {
        const filtered = entries.filter((entry) => now - entry.timestamp < 60_000);
        if (filtered.length) {
          this.fallbackStorage.set(key, filtered);
        } else {
          this.fallbackStorage.delete(key);
        }
      }
    }, 30_000);
  }

  private startStatsCollection(): void {
    setInterval(() => {
      monitoringService.recordMetric({
        name: 'rate_limiter_requests_total',
        value: this.stats.totalRequests,
        tags: { limiter: 'sliding_window' }
      });

      monitoringService.recordMetric({
        name: 'rate_limiter_blocked_total',
        value: this.stats.blockedRequests,
        tags: { limiter: 'sliding_window' }
      });

      monitoringService.recordMetric({
        name: 'rate_limiter_fallback_usage',
        value: this.stats.fallbackUsage,
        tags: { limiter: 'sliding_window' }
      });

      this.stats.redisErrors = 0;
      this.stats.fallbackUsage = 0;
    }, 60_000);
  }
}

export const slidingWindowRateLimiter = new SlidingWindowRateLimiter();

export const slidingWindowConfigs = {
  api: {
    windowSizeMs: 60_000,
    maxRequests: 100,
    keyGenerator: (req: Request) => {
      const userId = (req as any).userId || 'anonymous';
      const ip = req.ip || 'unknown';
      return `api:${userId}:${ip}`;
    }
  },
  auth: {
    windowSizeMs: 15 * 60_000,
    maxRequests: 5,
    keyGenerator: (req: Request) => {
      const ip = req.ip || 'unknown';
      return `auth:${ip}`;
    }
  },
  upload: {
    windowSizeMs: 60_000,
    maxRequests: 10,
    keyGenerator: (req: Request) => {
      const userId = (req as any).userId || 'anonymous';
      return `upload:${userId}`;
    }
  },
  search: {
    windowSizeMs: 30_000,
    maxRequests: 50,
    keyGenerator: (req: Request) => {
      const userId = (req as any).userId || 'anonymous';
      const ip = req.ip || 'unknown';
      return `search:${userId}:${ip}`;
    }
  },
  analytics: {
    windowSizeMs: 5 * 60_000,
    maxRequests: 20,
    keyGenerator: (req: Request) => {
      const userId = (req as any).userId || 'anonymous';
      return `analytics:${userId}`;
    }
  }
} satisfies Record<string, SlidingWindowConfig>;

export function createSlidingWindowLimiter(config: SlidingWindowConfig) {
  return slidingWindowRateLimiter.createMiddleware(config);
}

export const slidingWindowMiddleware = {
  api: () => createSlidingWindowLimiter(slidingWindowConfigs.api),
  auth: () => createSlidingWindowLimiter(slidingWindowConfigs.auth),
  upload: () => createSlidingWindowLimiter(slidingWindowConfigs.upload),
  search: () => createSlidingWindowLimiter(slidingWindowConfigs.search),
  analytics: () => createSlidingWindowLimiter(slidingWindowConfigs.analytics)
};
