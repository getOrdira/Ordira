// src/routes/billing.routes.ts
import { Router } from 'express';
import Joi from 'joi';
import { validateBody } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  changePlan,
  getPlan,
  handleStripeWebhook,
  createCheckoutSession
} from '../controllers/billing.controller';

const router = Router();

// Restrict plan to the current PlanKey values
const planSchema = Joi.object({
  plan: Joi.string()
    .valid('foundation', 'growth', 'premium', 'enterprise')
    .required()
});

// Change plan (requires auth & valid plan)
router.post(
  '/plan',
  authenticate,
  validateBody(planSchema),
  changePlan
);

// Get current plan (requires auth)
router.get(
  '/plan',
  authenticate,
  getPlan
);

// Stripe webhook (no auth; signature-protected)
router.post(
  '/webhook',
  handleStripeWebhook
);

router.post(
    '/checkout-session',
    authenticate,
    validateBody(Joi.object({ plan: Joi.string().valid('foundation','growth','premium','enterprise').required() })),
    createCheckoutSession
  );

export default router;


