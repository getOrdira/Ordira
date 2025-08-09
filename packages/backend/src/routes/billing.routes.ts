// src/routes/billing.routes.ts
import { Router } from 'express';
import { validateBody } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  changePlan,
  getPlan,
  handleStripeWebhook,
  createCheckoutSession
} from '../controllers/billing.controller';
import {
  changePlanSchema,
  checkoutSessionSchema
} from '../validation/billing.validation';

const router = Router();

// Apply dynamic rate limiting to all billing routes (plan-based limits)
router.use(dynamicRateLimiter());

// Get current plan (requires auth)
router.get(
  '/plan',
  authenticate,
  getPlan
);

// Change plan (requires auth & validation, with strict rate limiting for security)
router.post(
  '/plan',
  strictRateLimiter(), // Extra protection for plan changes
  authenticate,
  validateBody(changePlanSchema),
  changePlan
);

// Create checkout session (requires auth & validation, with strict rate limiting)
router.post(
  '/checkout-session',
  strictRateLimiter(), // Prevent checkout session abuse
  authenticate,
  validateBody(checkoutSessionSchema),
  createCheckoutSession
);

// Stripe webhook (no auth, signature-protected, no rate limiting for webhooks)
router.post(
  '/webhook',
  handleStripeWebhook
);

export default router;


