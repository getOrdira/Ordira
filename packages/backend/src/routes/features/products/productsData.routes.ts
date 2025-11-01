// src/routes/features/products/productsData.routes.ts
// Product data routes using modular product data controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { productsDataController } from '../../../controllers/features/products/productsData.controller';

const objectIdSchema = Joi.string().hex().length(24);

const productIdParamsSchema = Joi.object({
  productId: objectIdSchema.required()
});

const createProductBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  title: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().max(2000).optional(),
  media: Joi.array().items(objectIdSchema).optional(),
  category: Joi.string().trim().max(100).optional(),
  status: Joi.string().valid('draft', 'active', 'archived').optional(),
  sku: Joi.string().trim().max(100).optional(),
  price: Joi.number().min(0).max(1000000000).optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(20).optional(),
  specifications: Joi.object().unknown(true).optional(),
  manufacturingDetails: Joi.object({
    materials: Joi.array().items(Joi.string().trim().max(200)).optional(),
    dimensions: Joi.string().trim().max(200).optional(),
    weight: Joi.string().trim().max(200).optional(),
    origin: Joi.string().trim().max(200).optional()
  }).optional()
});

const updateProductBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  title: Joi.string().trim().min(2).max(200).optional(),
  description: Joi.string().trim().max(2000).optional(),
  media: Joi.array().items(objectIdSchema).optional(),
  category: Joi.string().trim().max(100).optional(),
  status: Joi.string().valid('draft', 'active', 'archived').optional(),
  sku: Joi.string().trim().max(100).optional(),
  price: Joi.number().min(0).max(1000000000).optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(20).optional(),
  specifications: Joi.object().unknown(true).optional(),
  manufacturingDetails: Joi.object({
    materials: Joi.array().items(Joi.string().trim().max(200)).optional(),
    dimensions: Joi.string().trim().max(200).optional(),
    weight: Joi.string().trim().max(200).optional(),
    origin: Joi.string().trim().max(200).optional()
  }).optional()
}).min(1);

const listProductsQuerySchema = Joi.object({
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
  manufacturerId: objectIdSchema.optional()
});

const ownerQuerySchema = Joi.object({
  status: Joi.string().valid('draft', 'active', 'archived').optional(),
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional()
});

const productExistsQuerySchema = Joi.object({
  productId: objectIdSchema.required(),
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

// Create product
builder.post(
  '/',
  createHandler(productsDataController, 'createProduct'),
  {
    validateBody: createProductBodySchema
  }
);

// Get product by ID
builder.get(
  '/:productId',
  createHandler(productsDataController, 'getProductById'),
  {
    validateParams: productIdParamsSchema
  }
);

// List products
builder.get(
  '/',
  createHandler(productsDataController, 'listProducts'),
  {
    validateQuery: listProductsQuerySchema
  }
);

// Update product
builder.put(
  '/:productId',
  createHandler(productsDataController, 'updateProduct'),
  {
    validateParams: productIdParamsSchema,
    validateBody: updateProductBodySchema
  }
);

// Delete product
builder.delete(
  '/:productId',
  createHandler(productsDataController, 'deleteProduct'),
  {
    validateParams: productIdParamsSchema
  }
);

// List products by owner
builder.get(
  '/owner/list',
  createHandler(productsDataController, 'listProductsByOwner'),
  {
    validateQuery: ownerQuerySchema
  }
);

// Get product count
builder.get(
  '/owner/count',
  createHandler(productsDataController, 'getProductCount'),
  {
    validateQuery: ownerQuerySchema
  }
);

// Check if product exists
builder.get(
  '/exists',
  createHandler(productsDataController, 'productExists'),
  {
    validateQuery: productExistsQuerySchema
  }
);

export default builder.getRouter();