// src/routes/features/notifications/notificationsPreferences.routes.ts
// Notification preferences routes using modular notification preferences controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { notificationsPreferencesController } from '../../../controllers/features/notifications/notificationsPreferences.controller';

const preferencesBodySchema = Joi.object({
  channel: Joi.object({
    email: Joi.object({
      enabled: Joi.boolean().optional(),
      address: Joi.string().email().max(255).optional()
    }).optional(),
    sms: Joi.object({
      enabled: Joi.boolean().optional(),
      number: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
    }).optional(),
    push: Joi.object({
      enabled: Joi.boolean().optional(),
      token: Joi.string().trim().max(500).optional()
    }).optional(),
    inApp: Joi.object({
      enabled: Joi.boolean().optional()
    }).optional(),
    webhook: Joi.object({
      enabled: Joi.boolean().optional(),
      url: Joi.string().uri().max(500).optional()
    }).optional()
  }).optional(),
  categories: Joi.object({
    billing: Joi.object({
      enabled: Joi.boolean().optional(),
      channels: Joi.array().items(Joi.string().valid('email', 'sms', 'push', 'inApp', 'webhook')).optional()
    }).optional(),
    account: Joi.object({
      enabled: Joi.boolean().optional(),
      channels: Joi.array().items(Joi.string().valid('email', 'sms', 'push', 'inApp', 'webhook')).optional()
    }).optional(),
    security: Joi.object({
      enabled: Joi.boolean().optional(),
      channels: Joi.array().items(Joi.string().valid('email', 'sms', 'push', 'inApp', 'webhook')).optional()
    }).optional(),
    marketing: Joi.object({
      enabled: Joi.boolean().optional(),
      channels: Joi.array().items(Joi.string().valid('email', 'sms', 'push', 'inApp', 'webhook')).optional()
    }).optional(),
    updates: Joi.object({
      enabled: Joi.boolean().optional(),
      channels: Joi.array().items(Joi.string().valid('email', 'sms', 'push', 'inApp', 'webhook')).optional()
    }).optional()
  }).optional(),
  frequency: Joi.string().valid('immediate', 'daily', 'weekly', 'never').optional(),
  timezone: Joi.string().trim().max(100).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get preferences
builder.get(
  '/',
  createHandler(notificationsPreferencesController, 'getPreferences')
);

// Update preferences
builder.put(
  '/',
  createHandler(notificationsPreferencesController, 'updatePreferences'),
  {
    validateBody: preferencesBodySchema
  }
);

export default builder.getRouter();