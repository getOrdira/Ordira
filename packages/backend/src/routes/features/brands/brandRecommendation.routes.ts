// src/routes/features/brands/brandRecommendation.routes.ts
// Brand recommendation routes using modular brand recommendation controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { brandRecommendationController } from '../../../controllers/features/brands/brandRecommendation.controller';

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

const recommendationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).optional(),
  categories: Joi.array().items(Joi.string().trim()).optional(),
  excludeIds: Joi.array().items(Joi.string().trim()).optional(),
  context: Joi.string().trim().optional()
});

builder.post(
  '/personalized/generate',
  createHandler(brandRecommendationController, 'generatePersonalizedRecommendations'),
  {
    validateQuery: recommendationQuerySchema
  }
);

builder.get(
  '/personalized',
  createHandler(brandRecommendationController, 'getPersonalizedRecommendations'),
  {
    validateQuery: recommendationQuerySchema
  }
);

builder.get(
  '/improvements',
  createHandler(brandRecommendationController, 'generateImprovementRecommendations'),
  {
    validateQuery: Joi.object({
      limit: Joi.number().integer().min(1).max(50).optional(),
      focusAreas: Joi.array().items(Joi.string().trim()).optional()
    })
  }
);

export default builder.getRouter();
