import { logger } from '../../utils/logger';
import { createAppError } from '../../middleware/error.middleware';
import {
  usageLimitsService,
  usageUpdatesService,
  usageDataService,
  usageCacheService,
  usageValidationService,
  type UsageUpdate,
  type UsageLimits,
  type UsageAnalytics,
  type UsageCheck
} from '../usage';

export {
  UsageUpdate,
  UsageLimits,
  UsageAnalytics,
  UsageCheck
} from '../usage';

interface UsageAnalyticsQueryOptions {
  days?: number;
  includeProjections?: boolean;
  includeTrends?: boolean;
}

export class UsageTrackingService {
  constructor(
    private readonly limits = usageLimitsService,
    private readonly updates = usageUpdatesService
  ) {}

  async getUsageLimits(businessId: string, useCache: boolean = true): Promise<UsageLimits> {
    const normalizedBusinessId = usageValidationService.ensureBusinessId(businessId);
    return this.limits.getUsageLimits(normalizedBusinessId, { useCache });
  }

  async checkLimits(
    businessId: string,
    operation: keyof UsageUpdate,
    amount: number = 1
  ): Promise<UsageCheck> {
    const normalizedOperation = usageValidationService.ensureOperation(operation as string);
    return this.limits.checkLimits(businessId, normalizedOperation, amount);
  }

  async updateUsage(businessId: string, usageUpdate: UsageUpdate, immediate: boolean = false): Promise<void> {
    await this.updates.updateUsage(businessId, usageUpdate, immediate);
  }

  async getUsageAnalytics(
    businessId: string,
    days: number = 30,
    options: UsageAnalyticsQueryOptions = {}
  ): Promise<UsageAnalytics> {
    return this.limits.getUsageAnalytics(businessId, {
      days,
      includeProjections: options.includeProjections,
      includeTrends: options.includeTrends
    });
  }

  async resetMonthlyUsage(businessId: string): Promise<void> {
    const normalizedBusinessId = usageValidationService.ensureBusinessId(businessId);

    try {
      await usageDataService.resetMonthlyUsage(normalizedBusinessId);
      await usageCacheService.invalidateUsage(normalizedBusinessId);
    } catch (error) {
      logger.error('Failed to reset usage counters', {
        businessId: normalizedBusinessId,
        error: (error as Error).message
      });
      throw createAppError('Failed to reset usage counters', 500, 'USAGE_RESET_ERROR');
    }
  }

  async cleanup(): Promise<void> {
    await this.updates.cleanup();
  }
}

export const usageTrackingService = new UsageTrackingService();

process.on('SIGTERM', () => {
  usageTrackingService.cleanup().catch(error => {
    logger.error('Usage tracking cleanup on SIGTERM failed', { error: (error as Error).message });
  });
});

process.on('SIGINT', () => {
  usageTrackingService.cleanup().catch(error => {
    logger.error('Usage tracking cleanup on SIGINT failed', { error: (error as Error).message });
  });
});