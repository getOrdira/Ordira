// src/routes/integrations/ecommerce/ecommerceHealth.routes.ts
// Ecommerce health routes using modular ecommerce health controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { ecommerceHealthController } from '../../../controllers/integrations/ecommerce/ecommerceHealth.controller';

const objectIdSchema = Joi.string().hex().length(24);

const providerSchema = Joi.string().valid('shopify', 'wix', 'woocommerce');

const healthParamsSchema = Joi.object({
  businessId: objectIdSchema.optional(),
  provider: providerSchema.required()
});

const healthQuerySchema = Joi.object({
  includeWebhookDiff: Joi.boolean().optional()
});

const webhookDefinitionSchema = Joi.object({
  topic: Joi.string().required(),
  callbackUrl: Joi.string().uri().required(),
  metadata: Joi.object().optional()
});

const healthBodySchema = Joi.object({
  expectedWebhooks: Joi.array().items(webhookDefinitionSchema).optional()
});

const analyticsParamsSchema = Joi.object({
  businessId: objectIdSchema.optional(),
  provider: providerSchema.required()
});

const analyticsQuerySchema = Joi.object({
  includeHealthDetails: Joi.boolean().optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

// Get connection health report
builder.get(
  '/:provider/health',
  createHandler(ecommerceHealthController, 'getConnectionHealthReport'),
  {
    validateParams: healthParamsSchema,
    validateQuery: healthQuerySchema
  }
);

// Get connection health report with expected webhooks
builder.post(
  '/:provider/health',
  createHandler(ecommerceHealthController, 'getConnectionHealthReport'),
  {
    validateParams: healthParamsSchema,
    validateQuery: healthQuerySchema,
    validateBody: healthBodySchema
  }
);

// Get integration analytics
builder.get(
  '/:provider/analytics',
  createHandler(ecommerceHealthController, 'getIntegrationAnalytics'),
  {
    validateParams: analyticsParamsSchema,
    validateQuery: analyticsQuerySchema
  }
);

export default builder.getRouter();