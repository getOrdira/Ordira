// src/controllers/features/subscriptions/subscriptionsAnalytics.controller.ts
// Controller exposing subscription analytics utilities

import { Response } from 'express';
import { SubscriptionsBaseController, SubscriptionsBaseRequest } from './subscriptionsBase.controller';

interface AnalyticsQuery extends SubscriptionsBaseRequest {
  validatedQuery?: {
    businessId?: string;
    timeframe?: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
  };
}

interface InsightsQuery extends SubscriptionsBaseRequest {
  validatedQuery?: {
    businessId?: string;
  };
}

interface WinBackRequest extends SubscriptionsBaseRequest {
  validatedBody?: {
    businessId?: string;
    reason?: string;
  };
}

/**
 * SubscriptionsAnalyticsController maps analytics service operations to HTTP responses.
 */
export class SubscriptionsAnalyticsController extends SubscriptionsBaseController {
  /**
   * Retrieve subscription overview summary.
   */
  async getSubscriptionOverview(req: AnalyticsQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = req.validatedQuery?.businessId ?? this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        const overview = await this.subscriptionAnalyticsService.getOverview(businessId);

        this.logAction(req, 'GET_SUBSCRIPTION_OVERVIEW_SUCCESS', {
          businessId,
          tier: overview.tier,
        });

        return { overview };
      });
    }, res, 'Subscription overview retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve usage analytics including trends and projections.
   */
  async getUsageAnalytics(req: AnalyticsQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = req.validatedQuery?.businessId ?? this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        const analytics = await this.subscriptionAnalyticsService.getUsageAnalytics(businessId);

        this.logAction(req, 'GET_USAGE_ANALYTICS_SUCCESS', {
          businessId,
          recommendations: analytics.recommendations.length,
        });

        return analytics;
      });
    }, res, 'Subscription usage analytics retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve actionable subscription insights.
   */
  async getSubscriptionInsights(req: InsightsQuery, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = req.validatedQuery?.businessId ?? this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        const insights = await this.subscriptionAnalyticsService.buildInsights(businessId);

        this.logAction(req, 'GET_SUBSCRIPTION_INSIGHTS_SUCCESS', {
          businessId,
          healthScore: insights.health.score,
        });

        return { insights };
      });
    }, res, 'Subscription insights generated', this.getRequestMeta(req));
  }

  /**
   * Generate win-back offers given a cancellation reason.
   */
  async generateWinBackOffers(req: WinBackRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = req.validatedBody?.businessId ?? this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        const summary = await this.subscriptionAnalyticsService.getOverview(businessId);
        const offers = this.subscriptionAnalyticsService.generateWinBackOffers(
          summary,
          req.validatedBody?.reason,
        );

        this.logAction(req, 'GENERATE_WINBACK_OFFERS_SUCCESS', {
          businessId,
          offerCount: offers.length,
        });

        return {
          offers,
          reason: req.validatedBody?.reason,
        };
      });
    }, res, 'Win-back offers generated', this.getRequestMeta(req));
  }
}

export const subscriptionsAnalyticsController = new SubscriptionsAnalyticsController();
