import { logger } from '../../../utils/logger';
import { cacheService } from '../../external/cache.service';
import { enhancedCacheService } from '../../external/enhanced-cache.service';
import type { UsageAnalytics, UsageLimits, UsagePlanCacheEntry } from './types';

class UsageCacheService {
  readonly prefix = 'usage';
  readonly LIMITS_TTL = 60; // seconds
  readonly PLAN_TTL = 300;
  readonly ANALYTICS_TTL = 900;

  buildKey(segment: string, identifier: string): string {
    return `${this.prefix}:${segment}:${identifier}`;
  }

  async getUsageLimits(businessId: string): Promise<UsageLimits | null> {
    const key = this.buildKey('limits', businessId);
    return cacheService.get<UsageLimits>(key);
  }

  async setUsageLimits(businessId: string, limits: UsageLimits): Promise<void> {
    const key = this.buildKey('limits', businessId);
    await cacheService.set(key, limits, { ttl: this.LIMITS_TTL });
  }

  async getUsageAnalytics(businessId: string, days: number): Promise<UsageAnalytics | null> {
    const key = this.buildKey('analytics', `${businessId}:${days}`);
    return cacheService.get<UsageAnalytics>(key);
  }

  async setUsageAnalytics(businessId: string, days: number, analytics: UsageAnalytics): Promise<void> {
    const key = this.buildKey('analytics', `${businessId}:${days}`);
    await cacheService.set(key, analytics, { ttl: this.ANALYTICS_TTL });
  }

  async getPlan(businessId: string): Promise<UsagePlanCacheEntry | null> {
    const key = this.buildKey('plan', businessId);
    return cacheService.get<UsagePlanCacheEntry>(key);
  }

  async setPlan(businessId: string, plan: UsagePlanCacheEntry): Promise<void> {
    const key = this.buildKey('plan', businessId);
    await cacheService.set(key, plan, { ttl: this.PLAN_TTL });
  }

  async invalidateUsage(businessId: string): Promise<void> {
    const keys = [
      this.buildKey('limits', businessId),
      this.buildKey('analytics', `${businessId}:30`),
      this.buildKey('analytics', `${businessId}:60`),
      this.buildKey('analytics', `${businessId}:90`)
    ];

    const operations = keys.map(key => cacheService.delete(key));
    await Promise.all(operations);

    try {
      await enhancedCacheService.invalidateByTags([
        `usage:${businessId}`,
        `business:${businessId}`,
        'usage_analytics'
      ]);
    } catch (error) {
      logger.warn('Failed to invalidate usage tags', {
        businessId,
        error: (error as Error).message
      });
    }
  }
}

export const usageCacheService = new UsageCacheService();