import { PLAN_DEFINITIONS } from '../../../constants/plans';
import { logger } from '../../../utils/logger';
import { usageDataService } from '../core/usageData.service';
import { usagePlanService } from '../core/usagePlan.service';
import { usageCacheService } from '../utils/usageCache.service';
import { usageForecastService } from '../utils/usageForecast.service';
import { usageValidationService } from '../validation/usageValidation.service';
import type {
  UsageAnalytics,
  UsageAnalyticsOptions,
  UsageCategory,
  UsageCheck,
  UsageLimits,
  UsageLimitsOptions
} from '../utils/types';

export class UsageLimitsService {
  async getUsageLimits(businessId: string, options: UsageLimitsOptions = {}): Promise<UsageLimits> {
    const normalizedBusinessId = usageValidationService.ensureBusinessId(businessId);
    const useCache = options.useCache ?? true;

    if (useCache) {
      const cached = await usageCacheService.getUsageLimits(normalizedBusinessId);
      if (cached) {
        return cached;
      }
    }

    const plan = await usagePlanService.getPlan(normalizedBusinessId);
    const planLimits = PLAN_DEFINITIONS[plan];

    const current = await usageDataService.getCurrentUsage(normalizedBusinessId);

    const limits: UsageLimits = {
      certificates: this.buildEntry(current.certificates, planLimits.certificates),
      votes: this.buildEntry(current.votes, planLimits.votes),
      apiCalls: this.buildEntry(current.apiCalls, planLimits.apiCalls),
      storage: this.buildEntry(current.storage, planLimits.storage)
    };

    if (useCache) {
      await usageCacheService.setUsageLimits(normalizedBusinessId, limits);
    }

    logger.debug('Usage limits computed', {
      businessId: normalizedBusinessId,
      plan
    });

    return limits;
  }

  async checkLimits(businessId: string, operation: UsageCategory, amount: number = 1): Promise<UsageCheck> {
    const normalizedBusinessId = usageValidationService.ensureBusinessId(businessId);
    const normalizedOperation = usageValidationService.ensureOperation(operation);
    const normalizedAmount = usageValidationService.ensureAmount(amount);

    const limits = await this.getUsageLimits(normalizedBusinessId, { useCache: true });
    const entry = limits[normalizedOperation];

    const projectedUsage = entry.used + normalizedAmount;
    const overage = Number.isFinite(entry.limit) && projectedUsage > entry.limit
      ? projectedUsage - entry.limit
      : 0;

    return {
      allowed: !Number.isFinite(entry.limit) || projectedUsage <= entry.limit,
      currentUsage: entry.used,
      limit: entry.limit,
      remaining: Number.isFinite(entry.limit) ? Math.max(0, entry.limit - entry.used) : Infinity,
      percentage: this.calculatePercentage(projectedUsage, entry.limit),
      overage: overage > 0 ? overage : undefined
    };
  }

  async getUsageAnalytics(businessId: string, options: UsageAnalyticsOptions = {}): Promise<UsageAnalytics> {
    const normalizedBusinessId = usageValidationService.ensureBusinessId(businessId);
    const days = options.days ?? 30;

    const cached = await usageCacheService.getUsageAnalytics(normalizedBusinessId, days);
    if (cached) {
      return cached;
    }

    const usageLimits = await this.getUsageLimits(normalizedBusinessId, { useCache: true });

    const trends = options.includeTrends === false
      ? { certificates: [], votes: [], apiCalls: [], storage: [] }
      : usageForecastService.generateTrends(usageLimits, days);

    const projectedExhaustion = options.includeProjections === false
      ? {}
      : usageForecastService.calculateProjectedExhaustion(usageLimits, trends);

    const recommendations = usageForecastService.generateRecommendations(usageLimits);

    const analytics: UsageAnalytics = {
      currentUsage: usageLimits,
      trends,
      recommendations,
      projectedExhaustion
    };

    await usageCacheService.setUsageAnalytics(normalizedBusinessId, days, analytics);

    return analytics;
  }

  private buildEntry(used: number, limit: number): { used: number; limit: number; percentage: number } {
    return {
      used,
      limit,
      percentage: this.calculatePercentage(used, limit)
    };
  }

  private calculatePercentage(used: number, limit: number): number {
    if (!Number.isFinite(limit) || limit <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((used / limit) * 100));
  }
}

export const usageLimitsService = new UsageLimitsService();