// src/routes/features/subscriptions/subscriptionsLifecycle.routes.ts
// Subscription lifecycle routes using modular subscription lifecycle controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { subscriptionsLifecycleController } from '../../../controllers/features/subscriptions/subscriptionsLifecycle.controller';

const objectIdSchema = Joi.string().hex().length(24);

const createSubscriptionBodySchema = Joi.object({
  businessId: objectIdSchema.required(),
  tier: Joi.string().trim().max(100).required(),
  billingCycle: Joi.string().valid('monthly', 'yearly').optional(),
  stripeSubscriptionId: Joi.string().trim().max(200).optional(),
  isTrialPeriod: Joi.boolean().optional(),
  planType: Joi.string().valid('brand', 'manufacturer').optional()
});

const updateSubscriptionBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  tier: Joi.string().trim().max(100).optional(),
  status: Joi.string().valid('active', 'inactive', 'past_due', 'canceled', 'paused').optional(),
  billingCycle: Joi.string().valid('monthly', 'yearly').optional(),
  cancelAtPeriodEnd: Joi.boolean().optional()
}).min(1);

const cancelSubscriptionBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  cancelImmediately: Joi.boolean().optional(),
  reason: Joi.string().trim().max(1000).optional()
});

const reactivateSubscriptionBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  tier: Joi.string().trim().max(100).optional(),
  status: Joi.string().valid('active', 'inactive', 'past_due', 'canceled', 'paused').optional(),
  billingCycle: Joi.string().valid('monthly', 'yearly').optional(),
  cancelAtPeriodEnd: Joi.boolean().optional()
}).min(1);

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Create subscription
builder.post(
  '/',
  createHandler(subscriptionsLifecycleController, 'createSubscription'),
  {
    validateBody: createSubscriptionBodySchema
  }
);

// Update subscription
builder.put(
  '/',
  createHandler(subscriptionsLifecycleController, 'updateSubscription'),
  {
    validateBody: updateSubscriptionBodySchema
  }
);

// Cancel subscription
builder.post(
  '/cancel',
  createHandler(subscriptionsLifecycleController, 'cancelSubscription'),
  {
    validateBody: cancelSubscriptionBodySchema
  }
);

// Reactivate subscription
builder.post(
  '/reactivate',
  createHandler(subscriptionsLifecycleController, 'reactivateSubscription'),
  {
    validateBody: reactivateSubscriptionBodySchema
  }
);

export default builder.getRouter();