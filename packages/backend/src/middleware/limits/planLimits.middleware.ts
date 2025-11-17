// src/middleware/limits/planLimits.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { UnifiedAuthRequest } from '../auth/unifiedAuth.middleware';
import { TenantRequest } from '../tenant/tenant.middleware';
import { BrandSettings } from '../../models/brands/brandSettings.model';
import { Billing } from '../../models/subscription/billing.model';
import { PLAN_DEFINITIONS, PlanKey } from '../../constants/plans';
import { createAppError } from '../core';

export interface PlanLimitsRequest extends UnifiedAuthRequest, TenantRequest {
  planLimits?: {
    plan: PlanKey;
    limits: typeof PLAN_DEFINITIONS[PlanKey];
    usage: {
      certificates: number;
      votes: number;
      apiCalls: number;
      storage: number;
    };
  };
}

/**
 * Middleware to enforce plan limits for various operations
 */
export function enforcePlanLimits(operation: 'certificates' | 'votes' | 'api' | 'storage') {
  return async (req: PlanLimitsRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const businessId = req.userId || req.tenant?.business?.toString();
      if (!businessId) {
        throw createAppError('Business context required for plan limits', 400, 'MISSING_BUSINESS_CONTEXT');
      }

      // Get current plan and usage
      const [brandSettings, billing] = await Promise.all([
        BrandSettings.findOne({ business: businessId }),
        Billing.findOne({ business: businessId })
      ]);

      const plan = (brandSettings?.plan || 'foundation') as PlanKey;
      const planLimits = PLAN_DEFINITIONS[plan];
      const currentUsage = billing?.currentUsage || {
        certificates: 0,
        votes: 0,
        apiCalls: 0,
        storage: 0,
        lastUpdated: new Date()
      };

      // Check limits based on operation
      let limitExceeded = false;
      let limitType = '';
      let currentUsageValue = 0;
      let limitValue = 0;

      switch (operation) {
        case 'certificates':
          currentUsageValue = currentUsage.certificates;
          limitValue = planLimits.certificates;
          limitType = 'certificates';
          break;
        case 'votes':
          currentUsageValue = currentUsage.votes;
          limitValue = planLimits.votes;
          limitType = 'votes';
          break;
        case 'api':
          currentUsageValue = currentUsage.apiCalls;
          limitValue = planLimits.apiCalls;
          limitType = 'API calls';
          break;
        case 'storage':
          currentUsageValue = currentUsage.storage;
          limitValue = planLimits.storage;
          limitType = 'storage';
          break;
      }

      // Check if limit is exceeded (handle Infinity case)
      if (limitValue !== Infinity && currentUsageValue >= limitValue) {
        limitExceeded = true;
      }

      if (limitExceeded) {
        const utilization = limitValue !== Infinity ? 
          Math.round((currentUsageValue / limitValue) * 100) : 0;

        res.status(403).json({
          error: `${limitType} limit exceeded for your plan`,
          details: {
            plan,
            currentUsage: currentUsageValue,
            limit: limitValue === Infinity ? 'unlimited' : limitValue,
            utilization: `${utilization}%`,
            operation
          },
          options: {
            upgradeAvailable: plan !== 'enterprise',
            overageAllowed: planLimits.features.allowOverage,
            nextBillingDate: billing?.currentPeriodEnd
          },
          code: 'PLAN_LIMIT_EXCEEDED'
        });
        return;
      }

      // Add plan limits to request for use in controllers
      req.planLimits = {
        plan,
        limits: planLimits,
        usage: {
          certificates: currentUsage.certificates,
          votes: currentUsage.votes,
          apiCalls: currentUsage.apiCalls,
          storage: currentUsage.storage
        }
      };

      next();
    } catch (error: any) {
      logger.error('Plan limits middleware error:', error);
      if (error.statusCode) {
        next(error);
      } else {
        next(createAppError('Failed to check plan limits', 500, 'PLAN_LIMITS_ERROR'));
      }
    }
  };
}

/**
 * Middleware to check if user can perform Web3 operations
 */
export function requireWeb3Plan(req: PlanLimitsRequest, res: Response, next: NextFunction): void {
  const planLimits = req.planLimits;
  
  if (!planLimits?.limits.features.hasWeb3) {
    res.status(403).json({
      error: 'Web3 features require Growth plan or higher',
      currentPlan: planLimits?.plan || 'unknown',
      requiredPlans: ['growth', 'premium', 'enterprise'],
      code: 'WEB3_PLAN_REQUIRED'
    });
    return;
  }

  next();
}

/**
 * Middleware to check API key limits
 */
export async function enforceApiKeyLimits(req: PlanLimitsRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const businessId = req.userId || req.tenant?.business?.toString();
    if (!businessId) {
      throw createAppError('Business context required', 400, 'MISSING_BUSINESS_CONTEXT');
    }

    const brandSettings = await BrandSettings.findOne({ business: businessId });
    const plan = (brandSettings?.plan || 'foundation') as PlanKey;
    const planLimits = PLAN_DEFINITIONS[plan];

    // Get current API key count (you'll need to implement this)
    const currentApiKeys = await getCurrentApiKeyCount(businessId);
    const maxApiKeys = planLimits.features.maxApiKeys;

    if (maxApiKeys !== Infinity && currentApiKeys >= maxApiKeys) {
      res.status(403).json({
        error: 'API key limit reached for your plan',
        details: {
          plan,
          currentKeys: currentApiKeys,
          maxKeys: maxApiKeys
        },
        options: {
          upgradeAvailable: plan !== 'enterprise'
        },
        code: 'API_KEY_LIMIT_EXCEEDED'
      });
      return;
    }

    next();
  } catch (error: any) {
    logger.error('API key limits middleware error:', error);
    next(createAppError('Failed to check API key limits', 500, 'API_KEY_LIMITS_ERROR'));
  }
}

/**
 * Helper function to get current API key count
 */
async function getCurrentApiKeyCount(businessId: string): Promise<number> {
  // This should query your API key model
  // For now, return 0 as placeholder
  return 0;
}

/**
 * Utility function to get plan utilization percentage
 */
export function getPlanUtilization(usage: number, limit: number): number {
  if (limit === Infinity) return 0;
  return Math.round((usage / limit) * 100);
}

/**
 * Utility function to check if operation is allowed with overage
 */
export function isOverageAllowed(plan: PlanKey, operation: string): boolean {
  const planLimits = PLAN_DEFINITIONS[plan];
  return planLimits.features.allowOverage;
}



