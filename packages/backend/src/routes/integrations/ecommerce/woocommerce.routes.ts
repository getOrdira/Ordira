// src/routes/integrations/ecommerce/woocommerce.routes.ts
// WooCommerce integration routes

import Joi from 'joi';
import express from 'express';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { woocommerceController } from '../../../controllers/integrations/ecommerce/woocommerce.controller';

const domainSchema = Joi.string().uri().required();
const consumerKeySchema = Joi.string().trim().min(1).required();
const consumerSecretSchema = Joi.string().trim().min(1).required();

const connectBodySchema = Joi.object({
  domain: domainSchema,
  consumerKey: consumerKeySchema,
  consumerSecret: consumerSecretSchema,
  version: Joi.string().optional(),
  verifySsl: Joi.boolean().optional()
});

const syncBodySchema = Joi.object({
  syncType: Joi.string().valid('products', 'orders', 'customers', 'all').optional(),
  forceSync: Joi.boolean().optional(),
  batchSize: Joi.number().integer().min(1).max(500).optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

// Connect WooCommerce with credentials
builder.post(
  '/connect',
  createHandler(woocommerceController, 'connect'),
  {
    validateBody: connectBodySchema
  }
);

// Get connection status
builder.get(
  '/status',
  createHandler(woocommerceController, 'getConnectionStatus')
);

// Disconnect WooCommerce
builder.delete(
  '/disconnect',
  createHandler(woocommerceController, 'disconnect')
);

// Test connection
builder.get(
  '/test',
  createHandler(woocommerceController, 'testConnection')
);

// Sync products
builder.post(
  '/sync',
  createHandler(woocommerceController, 'syncProducts'),
  {
    validateBody: syncBodySchema
  }
);

// Handle webhook
builder.post(
  '/webhook',
  createHandler(woocommerceController, 'handleWebhook'),
  {
    middleware: [express.raw({ type: 'application/json', limit: '1mb' })]
  }
);

export default builder.getRouter();
