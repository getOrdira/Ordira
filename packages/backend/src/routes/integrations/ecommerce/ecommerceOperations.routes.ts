// src/routes/integrations/ecommerce/ecommerceOperations.routes.ts
// Ecommerce operations routes using modular ecommerce operations controller

import Joi from 'joi';
import express from 'express';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { ecommerceOperationsController } from '../../../controllers/integrations/ecommerce/ecommerceOperations.controller';

const objectIdSchema = Joi.string().hex().length(24);

const providerSchema = Joi.string().valid('shopify', 'wix', 'woocommerce');

const productSyncParamsSchema = Joi.object({
  businessId: objectIdSchema.optional(),
  provider: providerSchema.required()
});

const productSyncBodySchema = Joi.object({
  fullSync: Joi.boolean().optional(),
  batchSize: Joi.number().integer().min(1).max(500).optional(),
  cursor: Joi.string().allow(null).optional(),
  metadata: Joi.object().optional(),
  recordSyncTimestamp: Joi.boolean().optional()
});

const productSyncQuerySchema = Joi.object({
  fullSync: Joi.boolean().optional(),
  batchSize: Joi.number().integer().min(1).max(500).optional(),
  cursor: Joi.string().optional(),
  recordSyncTimestamp: Joi.boolean().optional()
});

const orderProcessingParamsSchema = Joi.object({
  businessId: objectIdSchema.optional(),
  provider: providerSchema.required(),
  orderId: Joi.string().required()
});

const orderProcessingBodySchema = Joi.object({
  skipCertificateCreation: Joi.boolean().optional(),
  metadata: Joi.object().optional(),
  source: Joi.string().valid('webhook', 'manual', 'api').optional()
});

const orderWebhookParamsSchema = Joi.object({
  businessId: objectIdSchema.optional(),
  provider: providerSchema.required()
});

const orderWebhookQuerySchema = Joi.object({
  signature: Joi.string().optional(),
  timestamp: Joi.string().optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Sync products
builder.post(
  '/:provider/products/sync',
  createHandler(ecommerceOperationsController, 'syncProducts'),
  {
    validateParams: productSyncParamsSchema,
    validateBody: productSyncBodySchema
  }
);

// Sync products via query params
builder.get(
  '/:provider/products/sync',
  createHandler(ecommerceOperationsController, 'syncProducts'),
  {
    validateParams: productSyncParamsSchema,
    validateQuery: productSyncQuerySchema
  }
);

// Process order by ID
builder.post(
  '/:provider/orders/:orderId/process',
  createHandler(ecommerceOperationsController, 'processOrderById'),
  {
    validateParams: orderProcessingParamsSchema,
    validateBody: orderProcessingBodySchema
  }
);

// Process order webhook
// Note: This endpoint requires raw body for signature validation
builder.post(
  '/webhook/:provider/order',
  createHandler(ecommerceOperationsController, 'processOrderWebhook'),
  {
    validateParams: orderWebhookParamsSchema,
    validateQuery: orderWebhookQuerySchema,
    middleware: [express.raw({ type: 'application/json', limit: '1mb' })]
  }
);

export default builder.getRouter();