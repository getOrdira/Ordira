// src/routes/integrations/ecommerce/shopify.routes.ts
// Shopify integration routes

import Joi from 'joi';
import express from 'express';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { shopifyController } from '../../../controllers/integrations/ecommerce/shopify.controller';

const shopDomainSchema = Joi.string().trim().min(1).max(200);

const connectBodySchema = Joi.object({
  shopDomain: shopDomainSchema.required(),
  returnUrl: Joi.string().uri().optional()
});

const callbackQuerySchema = Joi.object({
  shop: Joi.string().required(),
  code: Joi.string().required(),
  state: Joi.string().required(),
  hmac: Joi.string().optional(),
  timestamp: Joi.string().optional()
});

const syncBodySchema = Joi.object({
  syncType: Joi.string().valid('products', 'orders', 'customers', 'all').optional(),
  forceSync: Joi.boolean().optional(),
  batchSize: Joi.number().integer().min(1).max(500).optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

// Generate Shopify OAuth installation URL
builder.post(
  '/connect',
  createHandler(shopifyController, 'generateInstallUrl'),
  {
    validateBody: connectBodySchema
  }
);

// Handle Shopify OAuth callback
builder.get(
  '/callback',
  createHandler(shopifyController, 'handleOAuthCallback'),
  {
    validateQuery: callbackQuerySchema
  }
);

// Get connection status
builder.get(
  '/status',
  createHandler(shopifyController, 'getConnectionStatus')
);

// Test connection
builder.get(
  '/test',
  createHandler(shopifyController, 'testConnection')
);

// Sync products
builder.post(
  '/sync',
  createHandler(shopifyController, 'syncProducts'),
  {
    validateBody: syncBodySchema
  }
);

// Handle webhook
builder.post(
  '/webhook',
  createHandler(shopifyController, 'handleWebhook'),
  {
    middleware: [express.raw({ type: 'application/json', limit: '1mb' })]
  }
);

export default builder.getRouter();
