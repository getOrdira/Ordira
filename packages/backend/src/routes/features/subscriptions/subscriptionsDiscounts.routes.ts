// src/routes/features/subscriptions/subscriptionsDiscounts.routes.ts
// Subscription discounts routes using modular subscription discounts controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { subscriptionsDiscountsController } from '../../../controllers/features/subscriptions/subscriptionsDiscounts.controller';

const walletQuerySchema = Joi.object({
  walletAddress: Joi.string().trim().max(200).optional(),
  timeframe: Joi.string().valid('last_30_days', 'last_90_days', 'all_time').optional(),
  subscriptionAmount: Joi.number().min(0).optional(),
  billingCycle: Joi.string().valid('monthly', 'yearly').optional()
});

const applyDiscountBodySchema = Joi.object({
  customerId: Joi.string().trim().required(),
  walletAddress: Joi.string().trim().max(200).required(),
  subscriptionId: Joi.string().trim().max(200).optional(),
  validateBalance: Joi.boolean().optional()
});

const removeDiscountBodySchema = Joi.object({
  customerId: Joi.string().trim().required(),
  subscriptionId: Joi.string().trim().max(200).optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get wallet balance
builder.get(
  '/wallet-balance',
  createHandler(subscriptionsDiscountsController, 'getWalletBalance'),
  {
    validateQuery: walletQuerySchema
  }
);

// Get available discounts
builder.get(
  '/available',
  createHandler(subscriptionsDiscountsController, 'getAvailableDiscounts'),
  {
    validateQuery: walletQuerySchema
  }
);

// Check discount eligibility
builder.get(
  '/eligibility',
  createHandler(subscriptionsDiscountsController, 'checkDiscountEligibility'),
  {
    validateQuery: walletQuerySchema
  }
);

// Apply token discount
builder.post(
  '/apply',
  createHandler(subscriptionsDiscountsController, 'applyTokenDiscount'),
  {
    validateBody: applyDiscountBodySchema
  }
);

// Remove token discount
builder.post(
  '/remove',
  createHandler(subscriptionsDiscountsController, 'removeTokenDiscount'),
  {
    validateBody: removeDiscountBodySchema
  }
);

// Validate Stripe coupons
builder.post(
  '/validate-coupons',
  createHandler(subscriptionsDiscountsController, 'validateStripeCoupons')
);

// Create missing coupons
builder.post(
  '/create-coupons',
  createHandler(subscriptionsDiscountsController, 'createMissingCoupons')
);

// Get discount usage stats
builder.get(
  '/usage-stats',
  createHandler(subscriptionsDiscountsController, 'getDiscountUsageStats'),
  {
    validateQuery: walletQuerySchema
  }
);

// Calculate potential savings
builder.get(
  '/potential-savings',
  createHandler(subscriptionsDiscountsController, 'calculatePotentialSavings'),
  {
    validateQuery: walletQuerySchema
  }
);

// Get wallet discount info
builder.get(
  '/wallet-info',
  createHandler(subscriptionsDiscountsController, 'getWalletDiscountInfo'),
  {
    validateQuery: walletQuerySchema
  }
);

export default builder.getRouter();