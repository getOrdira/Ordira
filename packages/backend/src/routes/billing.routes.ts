// src/routes/billing.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/unifiedAuth.middleware';
import { resolveTenant, requireTenantSetup } from '../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  changePlan,
  getPlan,
  getUsageStats,
  handleStripeWebhook,
  createCheckoutSession,
  updatePaymentMethod,
  cancelSubscription
} from '../controllers/billing.controller';
import {
  changePlanSchema,
  checkoutSessionSchema,
  updatePaymentMethodSchema,
  cancelSubscriptionSchema,
  usageStatsQuerySchema
} from '../validation/billing.validation';
import { asRouteHandler } from '../utils/routeHelpers';

const router = Router();

// Apply dynamic rate limiting to all billing routes (plan-based limits)
router.use(dynamicRateLimiter());

// Apply authentication and tenant resolution to all routes except webhooks
router.use('/webhook', (req, res, next) => next()); // Skip middleware for webhooks
router.use(authenticate);
router.use(resolveTenant);
router.use(requireTenantSetup);

// Get current plan and comprehensive billing info (requires auth & tenant)
router.get(
  '/plan',
  asRouteHandler(getPlan)
);

// Change plan (requires auth, tenant & validation, with strict rate limiting for security)
router.put(
  '/plan',
  strictRateLimiter(), // Extra protection for plan changes
  validateBody(changePlanSchema),
  asRouteHandler(changePlan)
);

// Get detailed usage statistics (requires auth & tenant)
router.get(
  '/usage',
  validateQuery(usageStatsQuerySchema),
  asRouteHandler(getUsageStats)
);

// Create checkout session (requires auth, tenant & validation, with strict rate limiting)
router.post(
  '/checkout-session',
  strictRateLimiter(), // Prevent checkout session abuse
  validateBody(checkoutSessionSchema),
  asRouteHandler(createCheckoutSession)
);

// Update payment method (requires auth, tenant & validation, with strict rate limiting)
router.put(
  '/payment-method',
  strictRateLimiter(), // Prevent payment method abuse
  validateBody(updatePaymentMethodSchema),
  asRouteHandler(updatePaymentMethod)
);

// Cancel subscription (requires auth, tenant & validation, with strict rate limiting)
router.post(
  '/cancel',
  strictRateLimiter(), // Prevent cancellation abuse
  validateBody(cancelSubscriptionSchema),
  asRouteHandler(cancelSubscription)
);

// Stripe webhook (no auth, signature-protected, no rate limiting for webhooks)
router.post(
  '/webhook',
  asRouteHandler(handleStripeWebhook)
);

export default router;


