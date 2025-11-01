// src/routes/features/notifications/notificationsTriggers.routes.ts
// Notification triggers routes using modular notification triggers controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { notificationsTriggersController } from '../../../controllers/features/notifications/notificationsTriggers.controller';

const objectIdSchema = Joi.string().hex().length(24);

const triggerEventBodySchema = Joi.object({
  type: Joi.string().trim().max(100).required(),
  recipient: Joi.object({
    businessId: objectIdSchema.optional(),
    manufacturerId: objectIdSchema.optional(),
    email: Joi.string().email().max(255).optional(),
    webhookUrl: Joi.string().uri().max(500).optional()
  }).required(),
  payload: Joi.object().unknown(true).optional(),
  timestamp: Joi.date().optional(),
  dryRun: Joi.boolean().optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Handle notification event
builder.post(
  '/event',
  createHandler(notificationsTriggersController, 'handleEvent'),
  {
    validateBody: triggerEventBodySchema
  }
);

export default builder.getRouter();