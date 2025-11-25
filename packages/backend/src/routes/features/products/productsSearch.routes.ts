// src/routes/features/products/productsSearch.routes.ts
// Product search routes using modular product search controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { productsSearchController } from '../../../controllers/features/products/productsSearch.controller';

const objectIdSchema = Joi.string().hex().length(24);

const productIdParamsSchema = Joi.object({
  productId: objectIdSchema.required()
});

const searchProductsQuerySchema = Joi.object({
  query: Joi.string().trim().required(),
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  category: Joi.string().trim().max(100).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const categorySearchQuerySchema = Joi.object({
  category: Joi.string().trim().required(),
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const tagsSearchQuerySchema = Joi.object({
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(50)),
    Joi.string()
  ).required(),
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const priceSearchQuerySchema = Joi.object({
  minPrice: Joi.number().min(0).required(),
  maxPrice: Joi.number().min(0).required(),
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const similarProductsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).optional()
});

const autocompleteQuerySchema = Joi.object({
  query: Joi.string().trim().required(),
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  limit: Joi.number().integer().min(1).max(50).optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Search products
builder.get(
  '/search',
  createHandler(productsSearchController, 'searchProducts'),
  {
    validateQuery: searchProductsQuerySchema
  }
);

// Search by category
builder.get(
  '/by-category',
  createHandler(productsSearchController, 'searchByCategory'),
  {
    validateQuery: categorySearchQuerySchema
  }
);

// Search by tags
builder.get(
  '/by-tags',
  createHandler(productsSearchController, 'searchByTags'),
  {
    validateQuery: tagsSearchQuerySchema
  }
);

// Search by price range
builder.get(
  '/by-price',
  createHandler(productsSearchController, 'searchByPriceRange'),
  {
    validateQuery: priceSearchQuerySchema
  }
);

// Get similar products
builder.get(
  '/:productId/similar',
  createHandler(productsSearchController, 'getSimilarProducts'),
  {
    validateParams: productIdParamsSchema,
    validateQuery: similarProductsQuerySchema
  }
);

// Autocomplete
builder.get(
  '/autocomplete',
  createHandler(productsSearchController, 'autocomplete'),
  {
    validateQuery: autocompleteQuerySchema
  }
);

export default builder.getRouter();