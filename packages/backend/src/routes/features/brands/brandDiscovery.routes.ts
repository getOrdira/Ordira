// src/routes/features/brands/brandDiscovery.routes.ts
// Brand discovery routes using modular brand discovery controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { brandDiscoveryController } from '../../../controllers/features/brands/brandDiscovery.controller';

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.get(
  '/recommendations',
  createHandler(brandDiscoveryController, 'getPersonalizedRecommendations'),
  {
    validateQuery: Joi.object({
      limit: Joi.number().integer().min(1).max(50).optional(),
      categories: Joi.array().items(Joi.string().trim()).optional(),
      excludeIds: Joi.array().items(Joi.string().trim()).optional()
    })
  }
);

builder.get(
  '/opportunities',
  createHandler(brandDiscoveryController, 'getConnectionOpportunities'),
  {
    validateQuery: Joi.object({
      limit: Joi.number().integer().min(1).max(50).optional(),
      industry: Joi.string().trim().optional(),
      location: Joi.string().trim().optional(),
      minCompatibility: Joi.number().min(0).max(1).optional()
    })
  }
);

builder.post(
  '/compatibility',
  createHandler(brandDiscoveryController, 'calculateCompatibilityScore'),
  {
    validateBody: Joi.object({
      brandId1: Joi.string().trim().required(),
      brandId2: Joi.string().trim().required()
    })
  }
);

builder.get(
  '/suggestions',
  createHandler(brandDiscoveryController, 'getSearchSuggestions'),
  {
    validateQuery: Joi.object({
      query: Joi.string().trim().min(2).required(),
      limit: Joi.number().integer().min(1).max(25).optional()
    })
  }
);

builder.get(
  '/analytics',
  createHandler(brandDiscoveryController, 'getEcosystemAnalytics'),
  {
    validateQuery: Joi.object({
      timeframe: Joi.string().trim().optional(),
      industry: Joi.string().trim().optional(),
      region: Joi.string().trim().optional()
    })
  }
);

export default builder.getRouter();
