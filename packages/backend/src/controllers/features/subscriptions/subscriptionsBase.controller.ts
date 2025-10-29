// src/controllers/features/subscriptions/subscriptionsBase.controller.ts
// Shared helpers for subscription feature controllers

import { BaseController, BaseRequest } from '../../core/base.controller';
import {
  getSubscriptionServices,
  getSubscriptionDataService,
  getSubscriptionLifecycleService,
  getSubscriptionUsageLimitsService,
  getSubscriptionAnalyticsService,
  getSubscriptionTierManagementService,
  getSubscriptionPlanValidationService,
  getSubscriptionBillingService,
} from '../../../services/container.service';
import type {
  SubscriptionServices,
  SubscriptionSummary,
} from '../../../services/subscriptions';
import type { BrandPlanKey } from '../../../services/subscriptions/utils/types';

type NumberParseOptions = {
  min?: number;
  max?: number;
};

/**
 * Base controller with utilities used across subscription controllers.
 */
export abstract class SubscriptionsBaseController extends BaseController {
  protected subscriptionServices: SubscriptionServices = getSubscriptionServices();
  protected subscriptionDataService = getSubscriptionDataService();
  protected subscriptionLifecycleService = getSubscriptionLifecycleService();
  protected subscriptionUsageLimitsService = getSubscriptionUsageLimitsService();
  protected subscriptionAnalyticsService = getSubscriptionAnalyticsService();
  protected subscriptionTierManagementService = getSubscriptionTierManagementService();
  protected subscriptionPlanValidationService = getSubscriptionPlanValidationService();
  protected subscriptionBillingService = getSubscriptionBillingService();

  /**
   * Resolve the active business identifier for the current request.
   */
  protected resolveBusinessId(req: BaseRequest, allowFallback: boolean = true): string | undefined {
    if (req.businessId) {
      return req.businessId;
    }

    if (allowFallback) {
      const candidate =
        req.validatedBody?.businessId ??
        req.validatedParams?.businessId ??
        req.validatedQuery?.businessId ??
        req.body?.businessId ??
        req.query?.businessId;

      if (candidate && typeof candidate === 'string') {
        return candidate;
      }
    }

    return undefined;
  }

  /**
   * Retrieve a subscription summary for the provided business.
   */
  protected async getSubscriptionSummary(businessId: string): Promise<SubscriptionSummary> {
    return this.subscriptionDataService.getSummaryForBusiness(businessId);
  }

  /**
   * Parse numeric value with optional bounds.
   */
  protected parseNumber(value: unknown, fallback: number, options: NumberParseOptions = {}): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    let result = parsed;
    if (options.min !== undefined && result < options.min) {
      result = options.min;
    }
    if (options.max !== undefined && result > options.max) {
      result = options.max;
    }
    return result;
  }

  /**
   * Parse optional numeric value and return undefined when invalid.
   */
  protected parseOptionalNumber(value: unknown, options: NumberParseOptions = {}): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }

    if (options.min !== undefined && parsed < options.min) {
      return options.min;
    }
    if (options.max !== undefined && parsed > options.max) {
      return options.max;
    }

    return parsed;
  }

  /**
   * Parse boolean values from query/body parameters.
   */
  protected parseBoolean(value: unknown, fallback: boolean = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
    }

    return fallback;
  }

  /**
   * Parse plan identifiers safely.
   */
  protected parsePlanKey(value: unknown): BrandPlanKey | undefined {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return undefined;
    }
    return value.trim() as BrandPlanKey;
  }

  /**
   * Trim string values returning undefined when empty.
   */
  protected parseString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return undefined;
  }
}

export type SubscriptionsBaseRequest = BaseRequest;
