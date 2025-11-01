// src/routes/features/connections/connectionsRecommendations.routes.ts
// Connection recommendations routes using modular connections recommendations controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { connectionsRecommendationsController } from '../../../controllers/features/connections/connectionsRecommendations.controller';

const objectIdSchema = Joi.string().hex().length(24);

const booleanLike = Joi.alternatives(
  Joi.boolean(),
  Joi.string().valid('true', 'false', '1', '0', 'yes', 'no', 'on', 'off').insensitive()
);

const recommendationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).optional(),
  requireVerified: booleanLike.optional(),
  excludeConnected: booleanLike.optional(),
  excludePending: booleanLike.optional()
});

const manufacturerRecommendationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).optional()
});

const compatibilityParamsSchema = Joi.object({
  brandId: objectIdSchema.required(),
  manufacturerId: objectIdSchema.required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.get(
  '/manufacturers',
  createHandler(connectionsRecommendationsController, 'getManufacturerRecommendations'),
  {
    validateQuery: recommendationQuerySchema
  }
);

builder.get(
  '/brands',
  createHandler(connectionsRecommendationsController, 'getBrandRecommendations'),
  {
    validateQuery: manufacturerRecommendationQuerySchema
  }
);

builder.get(
  '/compatibility/:brandId/:manufacturerId',
  createHandler(connectionsRecommendationsController, 'getCompatibilityReport'),
  {
    validateParams: compatibilityParamsSchema
  }
);

export default builder.getRouter();
