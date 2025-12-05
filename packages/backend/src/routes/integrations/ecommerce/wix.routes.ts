// src/routes/integrations/ecommerce/wix.routes.ts
// Wix integration routes

import Joi from 'joi';
import express from 'express';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { wixController } from '../../../controllers/integrations/ecommerce/wix.controller';

const connectBodySchema = Joi.object({
  returnUrl: Joi.string().uri().optional()
});

const callbackQuerySchema = Joi.object({
  code: Joi.string().required(),
  state: Joi.string().required(),
  instance_id: Joi.string().optional(),
  context: Joi.string().optional()
});

const syncBodySchema = Joi.object({
  syncType: Joi.string().valid('products', 'orders', 'customers', 'all').optional(),
  forceSync: Joi.boolean().optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Generate Wix OAuth installation URL
builder.post(
  '/connect',
  createHandler(wixController, 'generateInstallUrl'),
  {
    validateBody: connectBodySchema
  }
);

// Handle Wix OAuth callback
builder.get(
  '/callback',
  createHandler(wixController, 'handleOAuthCallback'),
  {
    validateQuery: callbackQuerySchema
  }
);

// Get connection status
builder.get(
  '/status',
  createHandler(wixController, 'getConnectionStatus')
);

// Test connection
builder.get(
  '/test',
  createHandler(wixController, 'testConnection')
);

// Sync products
builder.post(
  '/sync',
  createHandler(wixController, 'syncProducts'),
  {
    validateBody: syncBodySchema
  }
);

// Handle webhook
builder.post(
  '/webhook',
  createHandler(wixController, 'handleWebhook'),
  {
    middleware: [express.raw({ type: 'application/json', limit: '1mb' })]
  }
);

export default builder.getRouter();
