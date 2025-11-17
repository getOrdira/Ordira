// src/routes/features/brands/brandProfile.routes.ts
// Brand profile routes using modular brand profile controller

import Joi from 'joi';
import { createRouteBuilder, createHandler } from '../../core/base.routes';
import { brandProfileController } from '../../../controllers/features/brands/brandProfile.controller';
import { authenticate } from '../../../middleware/auth/unifiedAuth.middleware';

const builder = createRouteBuilder({ requireAuth: false, rateLimit: 'dynamic' });

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  industry: Joi.string().trim().optional(),
  location: Joi.string().trim().optional(),
  verified: Joi.boolean().optional(),
  plan: Joi.string().trim().optional(),
  sortBy: Joi.string().valid('name', 'created', 'popularity', 'relevance').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  search: Joi.string().trim().optional(),
  filters: Joi.string().trim().optional()
});

const brandIdParamSchema = Joi.object({
  brandId: Joi.string().trim().required()
});

const analyticsQuerySchema = Joi.object({
  timeframe: Joi.string().valid('24h', '7d', '30d', '90d', '1y', 'all').optional(),
  metrics: Joi.array().items(Joi.string().trim()).optional()
});

const connectionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  type: Joi.string().valid('sent', 'received', 'accepted', 'pending').optional()
});

const recommendationsQuerySchema = Joi.object({
  type: Joi.string().valid('connections', 'products', 'features').optional(),
  limit: Joi.number().integer().min(1).max(50).optional()
});

builder.get(
  '/trending',
  createHandler(brandProfileController, 'getTrendingBrands')
);

builder.get(
  '/featured',
  createHandler(brandProfileController, 'getFeaturedBrands')
);

builder.get(
  '/search',
  createHandler(brandProfileController, 'searchBrands')
);

builder.get(
  '/',
  createHandler(brandProfileController, 'listBrandProfiles'),
  {
    validateQuery: listQuerySchema
  }
);

builder.get(
  '/domain/:domain',
  createHandler(brandProfileController, 'getBrandByDomain'),
  {
    validateParams: Joi.object({
      domain: Joi.string().trim().required()
    })
  }
);

builder.get(
  '/subdomain/:subdomain',
  createHandler(brandProfileController, 'getBrandBySubdomain'),
  {
    validateParams: Joi.object({
      subdomain: Joi.string().trim().required()
    })
  }
);

builder.get(
  '/:brandId/analytics',
  createHandler(brandProfileController, 'getBrandAnalytics'),
  {
    validateParams: brandIdParamSchema,
    validateQuery: analyticsQuerySchema
  }
);

builder.get(
  '/:brandId/connections',
  createHandler(brandProfileController, 'getBrandConnections'),
  {
    validateParams: brandIdParamSchema,
    validateQuery: connectionsQuerySchema
  }
);

builder.get(
  '/:brandId/recommendations',
  createHandler(brandProfileController, 'getBrandRecommendations'),
  {
    validateParams: brandIdParamSchema,
    validateQuery: recommendationsQuerySchema
  }
);

builder.get(
  '/:brandId/view',
  createHandler(brandProfileController, 'trackBrandView'),
  {
    validateParams: brandIdParamSchema,
    middleware: [authenticate]
  }
);

builder.get(
  '/:brandId',
  createHandler(brandProfileController, 'getBrandById'),
  {
    validateParams: brandIdParamSchema,
    validateQuery: Joi.object({
      includeAnalytics: Joi.boolean().optional(),
      includeConnections: Joi.boolean().optional()
    })
  }
);

export default builder.getRouter();
