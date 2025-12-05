// src/routes/integrations/ecommerce/ecommerceIntegrationData.routes.ts
// Ecommerce integration data routes using modular ecommerce integration data controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { ecommerceIntegrationDataController } from '../../../controllers/integrations/ecommerce/ecommerceIntegrationData.controller';

const objectIdSchema = Joi.string().hex().length(24);

const providerSchema = Joi.string().valid('shopify', 'wix', 'woocommerce');

const statusParamsSchema = Joi.object({
  businessId: objectIdSchema.optional(),
  provider: providerSchema.required()
});

const statusQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  provider: providerSchema.optional(),
  includeSecrets: Joi.boolean().optional()
});

const upsertParamsSchema = Joi.object({
  businessId: objectIdSchema.optional(),
  provider: providerSchema.required()
});

const upsertBodySchema = Joi.object({
  domain: Joi.alternatives().try(
    Joi.string().uri(),
    Joi.string().hostname()
  ).optional(),
  accessToken: Joi.string().optional(),
  refreshToken: Joi.string().optional(),
  secret: Joi.string().optional(),
  additionalSecrets: Joi.object().optional(),
  connectedAt: Joi.date().iso().optional(),
  lastSyncAt: Joi.date().iso().optional(),
  metadata: Joi.object().optional()
});

const clearParamsSchema = Joi.object({
  businessId: objectIdSchema.optional(),
  provider: providerSchema.required()
});

const syncParamsSchema = Joi.object({
  businessId: objectIdSchema.optional(),
  provider: providerSchema.required()
});

const syncBodySchema = Joi.object({
  metadata: Joi.object().optional()
});

const lookupQuerySchema = Joi.object({
  provider: providerSchema.required(),
  identifier: Joi.string().required()
});

const listQuerySchema = Joi.object({
  provider: providerSchema.optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get integration status
builder.get(
  '/:provider/status',
  createHandler(ecommerceIntegrationDataController, 'getIntegrationStatus'),
  {
    validateParams: statusParamsSchema,
    validateQuery: statusQuerySchema
  }
);

// Upsert integration credentials
builder.post(
  '/:provider/credentials',
  createHandler(ecommerceIntegrationDataController, 'upsertIntegrationCredentials'),
  {
    validateParams: upsertParamsSchema,
    validateBody: upsertBodySchema
  }
);

// Clear integration
builder.delete(
  '/:provider',
  createHandler(ecommerceIntegrationDataController, 'clearIntegration'),
  {
    validateParams: clearParamsSchema
  }
);

// Record successful sync
builder.post(
  '/:provider/sync',
  createHandler(ecommerceIntegrationDataController, 'recordSuccessfulSync'),
  {
    validateParams: syncParamsSchema,
    validateBody: syncBodySchema
  }
);

// Find business by provider identifier
builder.get(
  '/lookup',
  createHandler(ecommerceIntegrationDataController, 'findBusinessByProviderIdentifier'),
  {
    validateQuery: lookupQuerySchema
  }
);

// List connected businesses
builder.get(
  '/connected',
  createHandler(ecommerceIntegrationDataController, 'listConnectedBusinesses'),
  {
    validateQuery: listQuerySchema
  }
);

export default builder.getRouter();