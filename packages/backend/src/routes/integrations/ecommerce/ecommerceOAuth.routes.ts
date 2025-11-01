// src/routes/integrations/ecommerce/ecommerceOAuth.routes.ts
// Ecommerce OAuth routes using modular ecommerce OAuth controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { ecommerceOAuthController } from '../../../controllers/integrations/ecommerce/ecommerceOAuth.controller';

const objectIdSchema = Joi.string().hex().length(24);

const providerSchema = Joi.string().valid('shopify', 'wix', 'woocommerce');

const oauthParamsSchema = Joi.object({
  businessId: objectIdSchema.optional(),
  provider: providerSchema.required()
});

const stateTokenBodySchema = Joi.object({
  ttlSeconds: Joi.number().integer().min(30).max(1800).optional(),
  metadata: Joi.object().optional()
});

const stateTokenQuerySchema = Joi.object({
  state: Joi.string().required(),
  consume: Joi.boolean().optional()
});

const invalidateStateQuerySchema = Joi.object({
  state: Joi.string().required()
});

const authorizationUrlBodySchema = Joi.object({
  baseAuthorizeUrl: Joi.string().uri().required(),
  params: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(Joi.string(), Joi.number(), Joi.valid(null))
  ).optional()
});

const builder = createRouteBuilder({
  requireAuth: true,
  requireTenant: false,
  rateLimit: 'strict'
});

// Generate OAuth state token
builder.post(
  '/:provider/state',
  createHandler(ecommerceOAuthController, 'generateStateToken'),
  {
    validateParams: oauthParamsSchema,
    validateBody: stateTokenBodySchema
  }
);

// Validate OAuth state token
builder.get(
  '/:provider/validate',
  createHandler(ecommerceOAuthController, 'validateStateToken'),
  {
    validateParams: Joi.object({
      provider: providerSchema.required()
    }),
    validateQuery: stateTokenQuerySchema
  }
);

// Invalidate OAuth state token
builder.delete(
  '/state',
  createHandler(ecommerceOAuthController, 'invalidateStateToken'),
  {
    validateQuery: invalidateStateQuerySchema
  }
);

// Build authorization URL
builder.post(
  '/:provider/authorize-url',
  createHandler(ecommerceOAuthController, 'buildAuthorizationUrl'),
  {
    validateParams: Joi.object({
      provider: providerSchema.required()
    }),
    validateBody: authorizationUrlBodySchema
  }
);

export default builder.getRouter();