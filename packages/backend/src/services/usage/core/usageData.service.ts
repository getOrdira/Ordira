import { Billing } from '../../../models/billing.model';
import { logger } from '../../../utils/logger';
import type { UsageCounters, UsageUpdate } from '../utils/types';

const DEFAULT_COUNTERS: UsageCounters = {
  certificates: 0,
  votes: 0,
  apiCalls: 0,
  storage: 0,
  lastUpdated: new Date()
};

export class UsageDataService {
  async getCurrentUsage(businessId: string): Promise<UsageCounters> {
    const billing = await Billing.findOne({ business: businessId })
      .select('currentUsage')
      .lean();

    if (!billing?.currentUsage) {
      return { ...DEFAULT_COUNTERS, lastUpdated: new Date() };
    }

    const usage = billing.currentUsage as UsageCounters;
    return {
      certificates: usage.certificates || 0,
      votes: usage.votes || 0,
      apiCalls: usage.apiCalls || 0,
      storage: usage.storage || 0,
      lastUpdated: usage.lastUpdated ? new Date(usage.lastUpdated) : new Date()
    };
  }

  async applyUsageIncrement(businessId: string, update: UsageUpdate): Promise<void> {
    const updateDoc: Record<string, any> = {
      $set: {
        'currentUsage.lastUpdated': new Date()
      }
    };

    Object.entries(update).forEach(([key, value]) => {
      if (typeof value !== 'number' || Number.isNaN(value) || value === 0) {
        return;
      }

      if (key === 'storage') {
        updateDoc.$set[`currentUsage.${key}`] = value;
      } else {
        updateDoc.$inc = updateDoc.$inc || {};
        updateDoc.$inc[`currentUsage.${key}`] = value;
      }
    });

    try {
      await Billing.findOneAndUpdate(
        { business: businessId },
        updateDoc,
        { upsert: true, new: true }
      );
    } catch (error) {
      logger.error('Failed to apply usage increment', {
        businessId,
        update,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async resetMonthlyUsage(businessId: string): Promise<void> {
    await Billing.findOneAndUpdate(
      { business: businessId },
      {
        $set: {
          'currentUsage.certificates': 0,
          'currentUsage.votes': 0,
          'currentUsage.apiCalls': 0,
          'currentUsage.storage': 0,
          'currentUsage.lastUpdated': new Date()
        }
      },
      { upsert: true }
    );
  }
}

export const usageDataService = new UsageDataService();