// src/routes/features/subscriptions/subscriptionsBilling.routes.ts
// Subscription billing routes using modular subscription billing controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { subscriptionsBillingController } from '../../../controllers/features/subscriptions/subscriptionsBilling.controller';

const checkoutSessionBodySchema = Joi.object({
  plan: Joi.string().trim().required(),
  couponCode: Joi.string().trim().max(100).optional(),
  addons: Joi.array().items(Joi.string().trim().max(100)).optional(),
  metadata: Joi.object().unknown(true).optional()
});

const paymentMethodBodySchema = Joi.object({
  paymentMethodId: Joi.string().trim().required(),
  setAsDefault: Joi.boolean().optional()
});

const billingProfileBodySchema = Joi.object({
  billingAddress: Joi.object({
    line1: Joi.string().trim().max(200).required(),
    city: Joi.string().trim().max(100).required(),
    state: Joi.string().trim().max(100).required(),
    postalCode: Joi.string().trim().max(20).required(),
    country: Joi.string().trim().max(100).required(),
    line2: Joi.string().trim().max(200).optional()
  }).optional(),
  taxId: Joi.string().trim().max(100).optional(),
  companyName: Joi.string().trim().max(200).optional(),
  additionalMetadata: Joi.object().unknown(true).optional()
}).min(1);

const tokenDiscountUpdateBodySchema = Joi.object({
  walletAddress: Joi.string().trim().max(200).optional()
});

const pricingSummaryQuerySchema = Joi.object({
  plan: Joi.string().trim().required(),
  couponCode: Joi.string().trim().max(100).optional(),
  addons: Joi.string().optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get billing info
builder.get(
  '/info',
  createHandler(subscriptionsBillingController, 'getBillingInfo')
);

// Get comprehensive billing info
builder.get(
  '/comprehensive',
  createHandler(subscriptionsBillingController, 'getComprehensiveBillingInfo')
);

// Create checkout session
builder.post(
  '/checkout',
  createHandler(subscriptionsBillingController, 'createCheckoutSession'),
  {
    validateBody: checkoutSessionBodySchema
  }
);

// Update payment method
builder.put(
  '/payment-method',
  createHandler(subscriptionsBillingController, 'updatePaymentMethod'),
  {
    validateBody: paymentMethodBodySchema
  }
);

// Update billing profile
builder.put(
  '/profile',
  createHandler(subscriptionsBillingController, 'updateBillingProfile'),
  {
    validateBody: billingProfileBodySchema
  }
);

// Refresh token discounts
builder.post(
  '/refresh-token-discounts',
  createHandler(subscriptionsBillingController, 'refreshTokenDiscounts'),
  {
    validateBody: tokenDiscountUpdateBodySchema
  }
);

// Remove token discounts
builder.post(
  '/remove-token-discounts',
  createHandler(subscriptionsBillingController, 'removeTokenDiscounts')
);

// Calculate pricing summary
builder.get(
  '/calculate-pricing',
  createHandler(subscriptionsBillingController, 'calculatePricingSummary'),
  {
    validateQuery: pricingSummaryQuerySchema
  }
);

// Get overage billing status
builder.get(
  '/overage-status',
  createHandler(subscriptionsBillingController, 'getOverageBillingStatus')
);

export default builder.getRouter();