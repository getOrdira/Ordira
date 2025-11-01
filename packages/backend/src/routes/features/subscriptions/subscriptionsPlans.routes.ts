// src/routes/features/subscriptions/subscriptionsPlans.routes.ts
// Subscription plans routes using modular subscription plans controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { subscriptionsPlansController } from '../../../controllers/features/subscriptions/subscriptionsPlans.controller';

const planQuerySchema = Joi.object({
  tier: Joi.string().trim().max(100).optional()
});

const planComparisonQuerySchema = Joi.object({
  currentTier: Joi.string().trim().max(100).optional(),
  targetTier: Joi.string().trim().max(100).optional()
});

const analyzeChangeBodySchema = Joi.object({
  tier: Joi.string().trim().max(100).optional(),
  billingCycle: Joi.string().valid('monthly', 'yearly').optional(),
  status: Joi.string().valid('active', 'inactive', 'past_due', 'canceled', 'paused').optional()
}).min(1);

const builder = createRouteBuilder(RouteConfigs.tenant);

// Get available tiers
builder.get(
  '/tiers',
  createHandler(subscriptionsPlansController, 'getAvailableTiers')
);

// Get tier features
builder.get(
  '/features',
  createHandler(subscriptionsPlansController, 'getTierFeatures'),
  {
    validateQuery: planQuerySchema
  }
);

// Get onboarding steps
builder.get(
  '/onboarding',
  createHandler(subscriptionsPlansController, 'getOnboardingSteps'),
  {
    validateQuery: planQuerySchema
  }
);

// Get tier comparison
builder.get(
  '/comparison',
  createHandler(subscriptionsPlansController, 'getTierComparison'),
  {
    validateQuery: planComparisonQuerySchema
  }
);

// Analyze subscription changes
builder.post(
  '/analyze-changes',
  createHandler(subscriptionsPlansController, 'analyzeSubscriptionChanges'),
  {
    validateBody: analyzeChangeBodySchema
  }
);

// Get plan metadata
builder.get(
  '/metadata',
  createHandler(subscriptionsPlansController, 'getPlanMetadata'),
  {
    validateQuery: planQuerySchema
  }
);

export default builder.getRouter();