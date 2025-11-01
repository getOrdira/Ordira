// src/routes/integrations/ecommerce/ecommerceWebhooks.routes.ts
// Ecommerce webhooks routes using modular ecommerce webhooks controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { ecommerceWebhooksController } from '../../../controllers/integrations/ecommerce/ecommerceWebhooks.controller';

const objectIdSchema = Joi.string().hex().length(24);

const providerSchema = Joi.string().valid('shopify', 'wix', 'woocommerce');

const webhookParamsSchema = Joi.object({
  businessId: objectIdSchema.optional(),
  provider: providerSchema.required()
});

const webhookDefinitionSchema = Joi.object({
  topic: Joi.string().required(),
  callbackUrl: Joi.string().uri().required(),
  metadata: Joi.object().optional()
});

const webhookDiffBodySchema = Joi.object({
  expected: Joi.array().items(webhookDefinitionSchema).required()
});

const webhookReconcileBodySchema = Joi.object({
  expected: Joi.array().items(webhookDefinitionSchema).required(),
  dryRun: Joi.boolean().optional()
});

const callbackUrlBodySchema = Joi.object({
  appUrl: Joi.string().uri().required(),
  relativePath: Joi.string().required(),
  queryParams: Joi.object().pattern(Joi.string(), Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())).optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

// List provider webhooks
builder.get(
  '/:provider',
  createHandler(ecommerceWebhooksController, 'listProviderWebhooks'),
  {
    validateParams: webhookParamsSchema
  }
);

// Diff webhooks
builder.post(
  '/:provider/diff',
  createHandler(ecommerceWebhooksController, 'diffWebhooks'),
  {
    validateParams: webhookParamsSchema,
    validateBody: webhookDiffBodySchema
  }
);

// Reconcile webhooks
builder.post(
  '/:provider/reconcile',
  createHandler(ecommerceWebhooksController, 'reconcileWebhooks'),
  {
    validateParams: webhookParamsSchema,
    validateBody: webhookReconcileBodySchema
  }
);

// Build callback URL
builder.post(
  '/:provider/callback-url',
  createHandler(ecommerceWebhooksController, 'buildCallbackUrl'),
  {
    validateParams: Joi.object({
      provider: providerSchema.required()
    }),
    validateBody: callbackUrlBodySchema
  }
);

export default builder.getRouter();