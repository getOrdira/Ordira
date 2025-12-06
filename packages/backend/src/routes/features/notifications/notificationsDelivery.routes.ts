// src/routes/features/notifications/notificationsDelivery.routes.ts
// Notification delivery routes using modular notification delivery controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { notificationsDeliveryController } from '../../../controllers/features/notifications/notificationsDelivery.controller';

const objectIdSchema = Joi.string().hex().length(24);

const deliverNotificationBodySchema = Joi.object({
  event: Joi.object({
    type: Joi.string().trim().max(100).required(),
    recipient: Joi.object({
      businessId: objectIdSchema.optional(),
      manufacturerId: objectIdSchema.optional(),
      email: Joi.string().email().max(255).optional(),
      webhookUrl: Joi.string().uri().max(500).optional()
    }).required(),
    payload: Joi.object().unknown(true).optional(),
    timestamp: Joi.date().optional()
  }).required(),
  options: Joi.object({
    channels: Joi.array().items(Joi.string().valid('email', 'sms', 'push', 'inApp', 'webhook')).optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
    delayUntil: Joi.date().optional(),
    retryOnFailure: Joi.boolean().optional(),
    maxRetries: Joi.number().integer().min(0).max(10).optional()
  }).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Deliver notification
builder.post(
  '/deliver',
  createHandler(notificationsDeliveryController, 'deliverNotification'),
  {
    validateBody: deliverNotificationBodySchema
  }
);

// Test channel configurations
builder.post(
  '/test-channels',
  createHandler(notificationsDeliveryController, 'testChannelConfigurations')
);

export default builder.getRouter();