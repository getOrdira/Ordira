// src/routes/features/products/productsAggregation.routes.ts
// Product aggregation routes using modular product aggregation controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { productsAggregationController } from '../../../controllers/features/products/productsAggregation.controller';

const objectIdSchema = Joi.string().hex().length(24);

const productIdParamsSchema = Joi.object({
  productId: objectIdSchema.required()
});

const manufacturerIdParamsSchema = Joi.object({
  manufacturerId: objectIdSchema.required()
});

const aggregationListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string().valid('draft', 'active', 'archived').optional(),
  category: Joi.string().trim().max(100).optional(),
  query: Joi.string().trim().max(500).optional(),
  search: Joi.string().trim().max(500).optional(),
  sortBy: Joi.string().trim().max(50).optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  priceMin: Joi.number().min(0).optional(),
  priceMax: Joi.number().min(0).optional(),
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  cache: Joi.boolean().optional(),
  cacheTTL: Joi.number().integer().min(1000).max(600000).optional()
});

const productParamsQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional()
});

const categoryAggregationQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

// Get products with relations
builder.get(
  '/with-relations',
  createHandler(productsAggregationController, 'getProductsWithRelations'),
  {
    validateQuery: aggregationListQuerySchema
  }
);

// Get product with relations
builder.get(
  '/:productId/with-relations',
  createHandler(productsAggregationController, 'getProductWithRelations'),
  {
    validateParams: productIdParamsSchema,
    validateQuery: productParamsQuerySchema
  }
);

// Get manufacturer products with stats
builder.get(
  '/manufacturer/:manufacturerId/stats',
  createHandler(productsAggregationController, 'getManufacturerProductsWithStats'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Get products with media
builder.get(
  '/with-media',
  createHandler(productsAggregationController, 'getProductsWithMedia'),
  {
    validateQuery: aggregationListQuerySchema
  }
);

// Get products by category
builder.get(
  '/by-category',
  createHandler(productsAggregationController, 'getProductsByCategory'),
  {
    validateQuery: categoryAggregationQuerySchema
  }
);

export default builder.getRouter();