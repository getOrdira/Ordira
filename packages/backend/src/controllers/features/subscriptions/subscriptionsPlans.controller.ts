// src/controllers/features/subscriptions/subscriptionsPlans.controller.ts
// Controller exposing subscription tier and plan utilities

import { Response } from 'express';
import { SubscriptionsBaseController, SubscriptionsBaseRequest } from './subscriptionsBase.controller';
import { billingPlanUtils } from '../../../services/subscriptions/utils/billingPlan.utils';
import type { BrandPlanKey } from '../../../services/subscriptions/utils/types';

interface PlanQuery extends SubscriptionsBaseRequest {
  validatedQuery?: {
    tier?: string;
  };
}

interface PlanComparisonQuery extends SubscriptionsBaseRequest {
  validatedQuery?: {
    currentTier?: string;
    targetTier?: string;
  };
}

interface AnalyzeChangeRequest extends SubscriptionsBaseRequest {
  validatedBody: {
    tier?: string;
    billingCycle?: 'monthly' | 'yearly';
    status?: 'active' | 'inactive' | 'past_due' | 'canceled' | 'paused';
  };
}

/**
 * SubscriptionsPlansController surfaces tier information, comparisons, and guidance.
 */
export class SubscriptionsPlansController extends SubscriptionsBaseController {
  /**
   * Retrieve available tier catalogue with pricing.
   */
  async getAvailableTiers(_req: SubscriptionsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const tiers = this.subscriptionTierManagementService.getAvailableTiers();
      return { tiers };
    }, res, 'Available tiers retrieved successfully');
  }

  /**
   * Retrieve feature list for a specific tier.
   */
  async getTierFeatures(req: PlanQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const tierKey = this.parsePlanKey(req.validatedQuery?.tier);
      if (!tierKey) {
        throw { statusCode: 400, message: 'Tier identifier is required' };
      }

      const features = this.subscriptionTierManagementService.getTierFeatures(tierKey);
      const pricing = billingPlanUtils.getPlanPricing(tierKey);

      return {
        tier: tierKey,
        name: billingPlanUtils.formatPlanName(tierKey),
        pricing,
        features,
        limits: billingPlanUtils.getPublicPlanLimits(tierKey),
      };
    }, res, 'Tier features retrieved successfully');
  }

  /**
   * Generate onboarding steps for a tier.
   */
  async getOnboardingSteps(req: PlanQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const tierKey = this.parsePlanKey(req.validatedQuery?.tier) ?? 'foundation';
      const steps = this.subscriptionTierManagementService.generateOnboardingSteps(tierKey);

      return {
        tier: tierKey,
        steps,
      };
    }, res, 'Onboarding steps generated');
  }

  /**
   * Generate tier comparison information for current subscription.
   */
  async getTierComparison(req: PlanComparisonQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        const currentTier = this.parsePlanKey(req.validatedQuery?.currentTier);
        const summary = await this.getSubscriptionSummary(businessId);
        const comparison = this.subscriptionTierManagementService.generateTierComparison(
          currentTier ?? (summary.tier as string),
        );

        return {
          businessId,
          comparison,
        };
      });
    }, res, 'Tier comparison retrieved', this.getRequestMeta(req));
  }

  /**
   * Analyse the impact of proposed subscription changes.
   */
  async analyzeSubscriptionChanges(req: AnalyzeChangeRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        const summary = await this.getSubscriptionSummary(businessId);
        const analysis = this.subscriptionTierManagementService.analyzeSubscriptionChanges(
          summary,
          req.validatedBody,
        );

        return { analysis };
      });
    }, res, 'Subscription change analysis generated', this.getRequestMeta(req));
  }

  /**
   * Retrieve pricing and limit metadata for a tier.
   */
  async getPlanMetadata(req: PlanQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const tierKey = this.parsePlanKey(req.validatedQuery?.tier) ?? 'foundation';
      const pricing = billingPlanUtils.getPlanPricing(tierKey);
      const limits = billingPlanUtils.getPublicPlanLimits(tierKey);
      const features = billingPlanUtils.getPlanFeatures(tierKey);

      return {
        tier: tierKey,
        pricing,
        limits,
        features,
      };
    }, res, 'Plan metadata retrieved');
  }
}

export const subscriptionsPlansController = new SubscriptionsPlansController();
