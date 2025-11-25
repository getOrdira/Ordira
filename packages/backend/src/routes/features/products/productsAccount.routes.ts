// src/routes/features/products/productsAccount.routes.ts
// Product account routes using modular product account controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { productsAccountController } from '../../../controllers/features/products/productsAccount.controller';

const objectIdSchema = Joi.string().hex().length(24);

const productIdParamsSchema = Joi.object({
  productId: objectIdSchema.required()
});

const analyticsQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  start: Joi.string().isoDate().optional(),
  end: Joi.string().isoDate().optional()
});

const ownerQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
  status: Joi.string().valid('draft', 'active', 'archived').optional()
});

const bulkStatusBodySchema = Joi.object({
  productIds: Joi.array().items(objectIdSchema).min(1).max(100).required(),
  status: Joi.string().valid('draft', 'active', 'archived').required(),
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional()
});

const ownershipQuerySchema = Joi.object({
  productId: objectIdSchema.required(),
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get product analytics
builder.get(
  '/analytics',
  createHandler(productsAccountController, 'getProductAnalytics'),
  {
    validateQuery: analyticsQuerySchema
  }
);

// Get product categories
builder.get(
  '/categories',
  createHandler(productsAccountController, 'getProductCategories'),
  {
    validateQuery: ownerQuerySchema
  }
);

// Get product stats
builder.get(
  '/stats',
  createHandler(productsAccountController, 'getProductStats'),
  {
    validateQuery: ownerQuerySchema
  }
);

// Get recent products
builder.get(
  '/recent',
  createHandler(productsAccountController, 'getRecentProducts'),
  {
    validateQuery: ownerQuerySchema
  }
);

// Get popular products
builder.get(
  '/popular',
  createHandler(productsAccountController, 'getPopularProducts'),
  {
    validateQuery: ownerQuerySchema
  }
);

// Get top voted products
builder.get(
  '/top-voted',
  createHandler(productsAccountController, 'getTopVotedProducts'),
  {
    validateQuery: ownerQuerySchema
  }
);

// Increment view count
builder.post(
  '/:productId/increment-view',
  createHandler(productsAccountController, 'incrementViewCount'),
  {
    validateParams: productIdParamsSchema
  }
);

// Increment vote count
builder.post(
  '/:productId/increment-vote',
  createHandler(productsAccountController, 'incrementVoteCount'),
  {
    validateParams: productIdParamsSchema
  }
);

// Increment certificate count
builder.post(
  '/:productId/increment-certificate',
  createHandler(productsAccountController, 'incrementCertificateCount'),
  {
    validateParams: productIdParamsSchema
  }
);

// Check product ownership
builder.get(
  '/ownership',
  createHandler(productsAccountController, 'isProductOwner'),
  {
    validateQuery: ownershipQuerySchema
  }
);

// Bulk update product status
builder.post(
  '/bulk-update-status',
  createHandler(productsAccountController, 'bulkUpdateStatus'),
  {
    validateBody: bulkStatusBodySchema
  }
);

export default builder.getRouter();