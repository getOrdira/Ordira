/**
 * Optimized Usage Tracking Service
 *
 * This service is CRITICAL for optimization because it's called on every API request
 * for rate limiting and usage checking. Optimizations include:
 * - Aggressive caching of usage limits (1-5 minute TTL)
 * - Cached business plan data (longer TTL)
 * - Batched usage updates for high-frequency operations
 * - Cached analytics with moderate TTL
 * - Performance monitoring for all operations
 */

import { Billing } from '../../models/billing.model';
import { Business } from '../../models/business.model';
import { PLAN_DEFINITIONS, PlanKey } from '../../constants/plans';
import { createAppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';
import { enhancedCacheService } from '../external/enhanced-cache.service';

export interface UsageUpdate {
  certificates?: number;
  votes?: number;
  apiCalls?: number;
  storage?: number; // in MB
}

export interface UsageLimits {
  certificates: { used: number; limit: number; percentage: number };
  votes: { used: number; limit: number; percentage: number };
  apiCalls: { used: number; limit: number; percentage: number };
  storage: { used: number; limit: number; percentage: number };
}

export interface UsageAnalytics {
  currentUsage: UsageLimits;
  trends: {
    certificates: number[];
    votes: number[];
    apiCalls: number[];
    storage: number[];
  };
  recommendations: string[];
  projectedExhaustion: {
    certificates?: string;
    votes?: string;
    apiCalls?: string;
    storage?: string;
  };
}

export interface UsageCheck {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  percentage: number;
  overage?: number;
}

/**
 * Optimized usage tracking service with aggressive caching
 */
export class UsageTrackingService {
  private readonly USAGE_CACHE_TTL = 60; // 1 minute - very short for real-time accuracy
  private readonly PLAN_CACHE_TTL = 300; // 5 minutes - plan data changes rarely
  private readonly ANALYTICS_CACHE_TTL = 900; // 15 minutes - analytics can be slightly stale
  private readonly BATCH_UPDATE_INTERVAL = 5000; // 5 seconds for batching updates

  // Batch update queue
  private updateQueue: Map<string, UsageUpdate> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;

  /**
   * Get usage limits with aggressive caching (MOST IMPORTANT OPTIMIZATION)
   * This method is called on every API request, so caching is critical
   */
  async getUsageLimits(businessId: string, useCache: boolean = true): Promise<UsageLimits> {
    const startTime = Date.now();

    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      // Try cache first (this will handle 95%+ of requests)
      if (useCache) {
        const cacheKey = `usage_limits:${businessId}`;
        const cached = await enhancedCacheService.getCachedAnalytics('usage', { businessId });
        if (cached) {
          logger.debug('Usage limits served from cache', {
            businessId,
            processingTime: Date.now() - startTime
          });
          return cached;
        }
      }

      // Get business plan (try cache first)
      const plan = await this.getBusinessPlan(businessId);
      const planLimits = PLAN_DEFINITIONS[plan];

      // Get current billing/usage data
      const billing = await Billing.findOne({ business: businessId }).lean();
      const currentUsage = billing?.currentUsage || {
        certificates: 0,
        votes: 0,
        apiCalls: 0,
        storage: 0,
        lastUpdated: new Date()
      };

      const usageLimits: UsageLimits = {
        certificates: {
          used: currentUsage.certificates || 0,
          limit: planLimits.certificates,
          percentage: this.calculatePercentage(currentUsage.certificates || 0, planLimits.certificates)
        },
        votes: {
          used: currentUsage.votes || 0,
          limit: planLimits.votes,
          percentage: this.calculatePercentage(currentUsage.votes || 0, planLimits.votes)
        },
        apiCalls: {
          used: currentUsage.apiCalls || 0,
          limit: planLimits.apiCalls,
          percentage: this.calculatePercentage(currentUsage.apiCalls || 0, planLimits.apiCalls)
        },
        storage: {
          used: currentUsage.storage || 0,
          limit: planLimits.storage,
          percentage: this.calculatePercentage(currentUsage.storage || 0, planLimits.storage)
        }
      };

      // Cache the result with short TTL for real-time accuracy
      if (useCache) {
        await enhancedCacheService.cacheAnalytics('usage', { businessId }, usageLimits, {
          ttl: this.USAGE_CACHE_TTL
        });
      }

      const processingTime = Date.now() - startTime;
      logger.info('Usage limits generated from database', {
        businessId,
        plan,
        processingTime,
        cached: false
      });

      return usageLimits;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get usage limits', {
        businessId,
        error: error.message,
        processingTime
      });

      if (error.statusCode) {
        throw error;
      }
      throw createAppError(`Failed to get usage limits: ${error.message}`, 500, 'USAGE_LIMITS_ERROR');
    }
  }

  /**
   * Check if operation would exceed limits (HIGHLY OPTIMIZED)
   * This is called before every operation, so it must be fast
   */
  async checkLimits(
    businessId: string,
    operation: keyof UsageUpdate,
    amount: number = 1
  ): Promise<UsageCheck> {
    const startTime = Date.now();

    try {
      // Get cached usage limits (this should almost always be cached)
      const usageLimits = await this.getUsageLimits(businessId, true);
      const usage = usageLimits[operation];

      const newUsage = usage.used + amount;
      const limit = usage.limit;
      const overage = limit !== Infinity && newUsage > limit ? newUsage - limit : 0;

      const result: UsageCheck = {
        allowed: limit === Infinity || newUsage <= limit,
        currentUsage: usage.used,
        limit,
        remaining: limit === Infinity ? Infinity : Math.max(0, limit - usage.used),
        percentage: this.calculatePercentage(newUsage, limit),
        overage: overage > 0 ? overage : undefined
      };

      const processingTime = Date.now() - startTime;

      // Log warnings for high usage
      if (result.percentage > 90) {
        logger.warn('High usage detected', {
          businessId,
          operation,
          percentage: result.percentage,
          remaining: result.remaining
        });
      }

      logger.debug('Usage check completed', {
        businessId,
        operation,
        allowed: result.allowed,
        percentage: result.percentage,
        processingTime
      });

      return result;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to check limits', {
        businessId,
        operation,
        error: error.message,
        processingTime
      });
      throw error;
    }
  }

  /**
   * Update usage with batching optimization for high-frequency operations
   */
  async updateUsage(businessId: string, usageUpdate: UsageUpdate, immediate: boolean = false): Promise<void> {
    const startTime = Date.now();

    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      if (immediate) {
        // Immediate update (for critical operations)
        await this.executeUsageUpdate(businessId, usageUpdate);
      } else {
        // Batch update (for high-frequency operations)
        await this.queueUsageUpdate(businessId, usageUpdate);
      }

      // Always invalidate cache after updates for real-time accuracy
      await this.invalidateUsageCache(businessId);

      const processingTime = Date.now() - startTime;
      logger.info('Usage update processed', {
        businessId,
        usageUpdate,
        immediate,
        processingTime
      });

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to update usage', {
        businessId,
        usageUpdate,
        error: error.message,
        processingTime
      });

      if (error.statusCode) {
        throw error;
      }
      throw createAppError(`Failed to update usage: ${error.message}`, 500, 'USAGE_UPDATE_ERROR');
    }
  }

  /**
   * Get usage analytics with caching
   */
  async getUsageAnalytics(businessId: string, days: number = 30): Promise<UsageAnalytics> {
    const startTime = Date.now();

    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      // Try cache first
      const cacheKey = `usage_analytics:${businessId}:${days}`;
      const cached = await enhancedCacheService.getCachedAnalytics('usage_analytics', {
        businessId,
        days
      });

      if (cached) {
        logger.info('Usage analytics served from cache', {
          businessId,
          days,
          processingTime: Date.now() - startTime
        });
        return cached;
      }

      // Get current usage
      const currentUsage = await this.getUsageLimits(businessId);

      // Get historical trends
      const trends = await this.getHistoricalUsage(businessId, days);

      // Generate recommendations
      const recommendations = this.generateRecommendations(currentUsage);

      // Calculate projected exhaustion dates
      const projectedExhaustion = this.calculateProjectedExhaustion(currentUsage, trends);

      const analytics: UsageAnalytics = {
        currentUsage,
        trends,
        recommendations,
        projectedExhaustion
      };

      // Cache the result
      await enhancedCacheService.cacheAnalytics('usage_analytics', {
        businessId,
        days
      }, analytics, {
        ttl: this.ANALYTICS_CACHE_TTL
      });

      const processingTime = Date.now() - startTime;
      logger.info('Usage analytics generated', {
        businessId,
        days,
        processingTime,
        recommendationsCount: recommendations.length
      });

      return analytics;

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to get usage analytics', {
        businessId,
        days,
        error: error.message,
        processingTime
      });
      throw error;
    }
  }

  /**
   * Reset monthly usage with cache invalidation
   */
  async resetMonthlyUsage(businessId: string): Promise<void> {
    const startTime = Date.now();

    try {
      await Billing.findOneAndUpdate(
        { business: businessId },
        {
          $set: {
            'currentUsage.certificates': 0,
            'currentUsage.votes': 0,
            'currentUsage.apiCalls': 0,
            'currentUsage.lastUpdated': new Date()
          }
        },
        { upsert: true }
      );

      // Invalidate all usage-related caches
      await this.invalidateUsageCache(businessId);

      const processingTime = Date.now() - startTime;
      logger.info('Monthly usage reset completed', {
        businessId,
        processingTime
      });

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Failed to reset monthly usage', {
        businessId,
        error: error.message,
        processingTime
      });
      throw createAppError(`Failed to reset usage: ${error.message}`, 500, 'USAGE_RESET_ERROR');
    }
  }

  /**
   * Get business plan with caching
   */
  private async getBusinessPlan(businessId: string): Promise<PlanKey> {
    const startTime = Date.now();

    try {
      // Try cache first
      const cacheKey = `business_plan:${businessId}`;
      const cached = await enhancedCacheService.getCachedBusiness(businessId);
      if (cached?.plan) {
        return cached.plan as PlanKey;
      }

      // Get from database
      const business = await Business.findById(businessId).select('plan').lean();
      if (!business) {
        throw createAppError('Business not found', 404, 'BUSINESS_NOT_FOUND');
      }

      const plan = (business.plan || 'foundation') as PlanKey;

      // Cache the business data
      await enhancedCacheService.cacheBusiness(businessId, business, {
        ttl: this.PLAN_CACHE_TTL
      });

      const processingTime = Date.now() - startTime;
      logger.debug('Business plan retrieved', {
        businessId,
        plan,
        processingTime
      });

      return plan;

    } catch (error: any) {
      logger.error('Failed to get business plan', {
        businessId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Queue usage update for batching
   */
  private async queueUsageUpdate(businessId: string, usageUpdate: UsageUpdate): Promise<void> {
    // Add to queue
    const existing = this.updateQueue.get(businessId) || {};
    const merged = {
      certificates: (existing.certificates || 0) + (usageUpdate.certificates || 0),
      votes: (existing.votes || 0) + (usageUpdate.votes || 0),
      apiCalls: (existing.apiCalls || 0) + (usageUpdate.apiCalls || 0),
      storage: Math.max(existing.storage || 0, usageUpdate.storage || 0) // Storage is not additive
    };

    this.updateQueue.set(businessId, merged);

    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatchUpdates();
      }, this.BATCH_UPDATE_INTERVAL);
    }
  }

  /**
   * Process batched usage updates
   */
  private async processBatchUpdates(): Promise<void> {
    if (this.updateQueue.size === 0) {
      this.batchTimer = null;
      return;
    }

    const updates = Array.from(this.updateQueue.entries());
    this.updateQueue.clear();
    this.batchTimer = null;

    logger.info(`Processing ${updates.length} batched usage updates`);

    // Process updates in parallel
    const promises = updates.map(([businessId, usageUpdate]) =>
      this.executeUsageUpdate(businessId, usageUpdate).catch(error => {
        logger.error('Batch update failed for business', {
          businessId,
          usageUpdate,
          error: error.message
        });
      })
    );

    await Promise.all(promises);
  }

  /**
   * Execute actual usage update
   */
  private async executeUsageUpdate(businessId: string, usageUpdate: UsageUpdate): Promise<void> {
    const updateFields: any = {
      'currentUsage.lastUpdated': new Date()
    };

    // Build increment operations
    Object.entries(usageUpdate).forEach(([key, value]) => {
      if (typeof value === 'number' && value !== 0) {
        if (key === 'storage') {
          // Storage is not incremental, it's a current value
          updateFields[`currentUsage.${key}`] = value;
        } else {
          // Certificates, votes, apiCalls are incremental
          updateFields[`$inc`] = updateFields[`$inc`] || {};
          updateFields[`$inc`][`currentUsage.${key}`] = value;
        }
      }
    });

    const update: any = { $set: updateFields };
    if (updateFields['$inc']) {
      update.$inc = updateFields['$inc'];
      delete updateFields['$inc'];
    }

    await Billing.findOneAndUpdate(
      { business: businessId },
      update,
      { upsert: true, new: true }
    );
  }

  /**
   * Get historical usage data with optimization
   */
  private async getHistoricalUsage(businessId: string, days: number): Promise<{
    certificates: number[];
    votes: number[];
    apiCalls: number[];
    storage: number[];
  }> {
    // TODO: Implement actual historical data retrieval
    // This would typically query a usage history collection
    // For now, generate sample trend data

    const generateTrend = (currentValue: number) => {
      const trend = [];
      for (let i = days - 1; i >= 0; i--) {
        // Simple trend simulation - replace with actual data
        const variation = Math.random() * 0.3 - 0.15; // ±15% variation
        trend.push(Math.max(0, Math.floor(currentValue * (1 + variation) * (i / days))));
      }
      return trend;
    };

    // Get current usage for trend generation
    const currentUsage = await this.getUsageLimits(businessId);

    return {
      certificates: generateTrend(currentUsage.certificates.used),
      votes: generateTrend(currentUsage.votes.used),
      apiCalls: generateTrend(currentUsage.apiCalls.used),
      storage: generateTrend(currentUsage.storage.used)
    };
  }

  /**
   * Generate intelligent usage recommendations
   */
  private generateRecommendations(usage: UsageLimits): string[] {
    const recommendations: string[] = [];

    // Check each usage category
    Object.entries(usage).forEach(([key, data]) => {
      if (data.percentage > 95) {
        recommendations.push(`🚨 Critical: ${key} usage at ${data.percentage}%. Immediate plan upgrade required.`);
      } else if (data.percentage > 90) {
        recommendations.push(`⚠️ High ${key} usage at ${data.percentage}%. Consider upgrading your plan soon.`);
      } else if (data.percentage > 75) {
        recommendations.push(`📊 Approaching ${key} limit at ${data.percentage}%. Monitor usage closely.`);
      } else if (data.percentage > 50) {
        recommendations.push(`📈 Moderate ${key} usage at ${data.percentage}%. On track for normal usage.`);
      }
    });

    // Add growth recommendations
    const highUsageCategories = Object.entries(usage)
      .filter(([_, data]) => data.percentage > 60)
      .map(([key, _]) => key);

    if (highUsageCategories.length > 2) {
      recommendations.push(`💡 Consider upgrading to a higher plan for better value across ${highUsageCategories.join(', ')}.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Usage is within normal limits across all categories. Great job managing your resources!');
    }

    return recommendations;
  }

  /**
   * Calculate projected exhaustion dates
   */
  private calculateProjectedExhaustion(usage: UsageLimits, trends: any): {
    certificates?: string;
    votes?: string;
    apiCalls?: string;
    storage?: string;
  } {
    const projections: any = {};

    Object.entries(usage).forEach(([key, data]) => {
      if (data.limit !== Infinity && data.percentage > 50) {
        const trend = trends[key as keyof typeof trends];
        if (trend && trend.length > 1) {
          // Calculate daily growth rate
          const recent = trend.slice(-7); // Last 7 days
          const dailyGrowth = recent.reduce((acc, val, i) =>
            i === 0 ? 0 : acc + (val - recent[i-1]), 0
          ) / (recent.length - 1);

          if (dailyGrowth > 0) {
            const remaining = data.limit - data.used;
            const daysUntilExhaustion = Math.ceil(remaining / dailyGrowth);

            if (daysUntilExhaustion > 0 && daysUntilExhaustion < 60) {
              const exhaustionDate = new Date();
              exhaustionDate.setDate(exhaustionDate.getDate() + daysUntilExhaustion);
              projections[key] = `~${daysUntilExhaustion} days (${exhaustionDate.toLocaleDateString()})`;
            }
          }
        }
      }
    });

    return projections;
  }

  /**
   * Calculate percentage with Infinity handling
   */
  private calculatePercentage(used: number, limit: number): number {
    if (limit === Infinity) return 0;
    return Math.round((used / limit) * 100);
  }

  /**
   * Invalidate usage-related caches
   */
  private async invalidateUsageCache(businessId: string): Promise<void> {
    const tags = [
      `usage:${businessId}`,
      `business:${businessId}`,
      'usage_analytics'
    ];

    await enhancedCacheService.invalidateByTags(tags);
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      await this.processBatchUpdates();
    }
  }
}

export const usageTrackingService = new UsageTrackingService();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  usageTrackingService.cleanup();
});

process.on('SIGINT', () => {
  usageTrackingService.cleanup();
});