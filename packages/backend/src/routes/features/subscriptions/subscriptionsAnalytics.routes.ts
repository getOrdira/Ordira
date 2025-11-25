// src/routes/features/subscriptions/subscriptionsAnalytics.routes.ts
// Subscription analytics routes using modular subscription analytics controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { subscriptionsAnalyticsController } from '../../../controllers/features/subscriptions/subscriptionsAnalytics.controller';

const objectIdSchema = Joi.string().hex().length(24);

const analyticsQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  timeframe: Joi.string().valid('24h', '7d', '30d', '90d', '1y', 'all').optional()
});

const insightsQuerySchema = Joi.object({
  businessId: objectIdSchema.optional()
});

const winBackBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  reason: Joi.string().trim().max(1000).optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get subscription overview
builder.get(
  '/overview',
  createHandler(subscriptionsAnalyticsController, 'getSubscriptionOverview'),
  {
    validateQuery: analyticsQuerySchema
  }
);

// Get usage analytics
builder.get(
  '/usage',
  createHandler(subscriptionsAnalyticsController, 'getUsageAnalytics'),
  {
    validateQuery: analyticsQuerySchema
  }
);

// Get subscription insights
builder.get(
  '/insights',
  createHandler(subscriptionsAnalyticsController, 'getSubscriptionInsights'),
  {
    validateQuery: insightsQuerySchema
  }
);

// Generate win-back offers
builder.post(
  '/win-back',
  createHandler(subscriptionsAnalyticsController, 'generateWinBackOffers'),
  {
    validateBody: winBackBodySchema
  }
);

export default builder.getRouter();