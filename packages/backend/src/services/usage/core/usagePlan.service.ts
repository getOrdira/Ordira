import { Business } from '../../../models/deprecated/business.model';
import { PLAN_DEFINITIONS, type PlanKey } from '../../../constants/plans';
import { createAppError } from '../../../middleware/deprecated/error.middleware';
import { logger } from '../../../utils/logger';
import { usageCacheService } from '../utils/usageCache.service';

export class UsagePlanService {
  async getPlan(businessId: string): Promise<PlanKey> {
    const cached = await usageCacheService.getPlan(businessId);
    if (cached?.plan) {
      return cached.plan;
    }

    const business = await Business.findById(businessId).select('plan').lean();
    if (!business) {
      throw createAppError('Business not found', 404, 'BUSINESS_NOT_FOUND');
    }

    const plan = (business.plan || 'foundation') as PlanKey;
    if (!PLAN_DEFINITIONS[plan]) {
      logger.warn('Unknown plan encountered, falling back to foundation', {
        businessId,
        plan
      });
      return 'foundation';
    }

    await usageCacheService.setPlan(businessId, {
      plan,
      cachedAt: new Date().toISOString()
    });

    return plan;
  }
}

export const usagePlanService = new UsagePlanService();