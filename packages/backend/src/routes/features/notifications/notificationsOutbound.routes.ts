// src/routes/features/notifications/notificationsOutbound.routes.ts
// Notification outbound routes using modular notification outbound controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { notificationsOutboundController } from '../../../controllers/features/notifications/notificationsOutbound.controller';

const objectIdSchema = Joi.string().hex().length(24);

const planChangeBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  email: Joi.string().email().max(255).required(),
  oldPlan: Joi.string().trim().max(100).required(),
  newPlan: Joi.string().trim().max(100).required()
});

const cancellationBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  email: Joi.string().email().max(255).required(),
  plan: Joi.string().trim().max(100).required()
});

const renewalBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  email: Joi.string().email().max(255).required(),
  plan: Joi.string().trim().max(100).required(),
  amount: Joi.number().min(0).required()
});

const paymentFailedBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  email: Joi.string().email().max(255).required(),
  invoiceId: Joi.string().trim().max(200).required()
});

const subscriptionWelcomeBodySchema = Joi.object({
  businessId: objectIdSchema.required(),
  tier: Joi.string().trim().max(100).required()
});

const accountDeletionBodySchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  reason: Joi.string().trim().max(500).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Send plan change notification
builder.post(
  '/plan-change',
  createHandler(notificationsOutboundController, 'sendPlanChange'),
  {
    validateBody: planChangeBodySchema
  }
);

// Send subscription cancellation notification
builder.post(
  '/cancellation',
  createHandler(notificationsOutboundController, 'sendCancellation'),
  {
    validateBody: cancellationBodySchema
  }
);

// Send subscription renewal notification
builder.post(
  '/renewal',
  createHandler(notificationsOutboundController, 'sendRenewal'),
  {
    validateBody: renewalBodySchema
  }
);

// Send payment failed notification
builder.post(
  '/payment-failed',
  createHandler(notificationsOutboundController, 'sendPaymentFailed'),
  {
    validateBody: paymentFailedBodySchema
  }
);

// Send subscription welcome notification
builder.post(
  '/subscription-welcome',
  createHandler(notificationsOutboundController, 'sendSubscriptionWelcome'),
  {
    validateBody: subscriptionWelcomeBodySchema
  }
);

// Send account deletion confirmation
builder.post(
  '/account-deletion',
  createHandler(notificationsOutboundController, 'sendAccountDeletionConfirmation'),
  {
    validateBody: accountDeletionBodySchema
  }
);

export default builder.getRouter();