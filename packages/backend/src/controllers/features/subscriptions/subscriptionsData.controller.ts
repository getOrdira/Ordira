// src/controllers/features/subscriptions/subscriptionsData.controller.ts
// Controller exposing subscription data operations

import { Response } from 'express';
import { SubscriptionsBaseController, SubscriptionsBaseRequest } from './subscriptionsBase.controller';

interface SubscriptionSummaryQuery extends SubscriptionsBaseRequest {
  validatedQuery?: {
    businessId?: string;
  };
}

interface ResetUsageRequest extends SubscriptionsBaseRequest {
  validatedBody?: {
    businessId?: string;
  };
}

/**
 * SubscriptionsDataController maps HTTP requests to subscription data service methods.
 */
export class SubscriptionsDataController extends SubscriptionsBaseController {
  /**
   * Retrieve subscription summary for the authenticated business.
   */
  async getSubscription(req: SubscriptionSummaryQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'GET_SUBSCRIPTION_SUMMARY');

        const summary = await this.getSubscriptionSummary(businessId);

        this.logAction(req, 'GET_SUBSCRIPTION_SUMMARY_SUCCESS', {
          businessId,
          tier: summary.tier,
          status: summary.status,
        });

        return { summary };
      });
    }, res, 'Subscription summary retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve raw usage counters for the active subscription.
   */
  async getSubscriptionUsage(req: SubscriptionSummaryQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'GET_SUBSCRIPTION_USAGE');

        const summary = await this.subscriptionDataService.getSummaryForBusiness(businessId);

        this.logAction(req, 'GET_SUBSCRIPTION_USAGE_SUCCESS', {
          businessId,
          usage: summary.usage,
        });

        return {
          usage: summary.usage,
          limits: summary.limits,
          usagePercentages: summary.usagePercentages,
        };
      });
    }, res, 'Subscription usage retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Reset monthly usage counters for the subscription (use with admin privileges).
   */
  async resetSubscriptionUsage(req: ResetUsageRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'RESET_SUBSCRIPTION_USAGE');

        const result = await this.subscriptionDataService.resetMonthlyUsage(businessId);

        this.logAction(req, 'RESET_SUBSCRIPTION_USAGE_SUCCESS', {
          businessId,
          reset: result.reset,
        });

        return {
          result,
          resetAt: new Date().toISOString(),
        };
      });
    }, res, 'Subscription usage reset successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve business billing contact associated with the subscription.
   */
  async getSubscriptionContact(req: SubscriptionSummaryQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'GET_SUBSCRIPTION_CONTACT');

        const contact = await this.subscriptionDataService.getBusinessContact(businessId);

        this.logAction(req, 'GET_SUBSCRIPTION_CONTACT_SUCCESS', {
          businessId,
          hasContact: Boolean(contact),
        });

        return { contact };
      });
    }, res, 'Subscription contact retrieved successfully', this.getRequestMeta(req));
  }
}

export const subscriptionsDataController = new SubscriptionsDataController();
