// src/routes/features/subscriptions/subscriptionsData.routes.ts
// Subscription data routes using modular subscription data controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { subscriptionsDataController } from '../../../controllers/features/subscriptions/subscriptionsData.controller';

const objectIdSchema = Joi.string().hex().length(24);

const subscriptionSummaryQuerySchema = Joi.object({
  businessId: objectIdSchema.optional()
});

const resetUsageBodySchema = Joi.object({
  businessId: objectIdSchema.optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get subscription summary
builder.get(
  '/summary',
  createHandler(subscriptionsDataController, 'getSubscription'),
  {
    validateQuery: subscriptionSummaryQuerySchema
  }
);

// Get subscription usage
builder.get(
  '/usage',
  createHandler(subscriptionsDataController, 'getSubscriptionUsage'),
  {
    validateQuery: subscriptionSummaryQuerySchema
  }
);

// Reset subscription usage
builder.post(
  '/reset-usage',
  createHandler(subscriptionsDataController, 'resetSubscriptionUsage'),
  {
    validateBody: resetUsageBodySchema
  }
);

// Get subscription contact
builder.get(
  '/contact',
  createHandler(subscriptionsDataController, 'getSubscriptionContact'),
  {
    validateQuery: subscriptionSummaryQuerySchema
  }
);

export default builder.getRouter();