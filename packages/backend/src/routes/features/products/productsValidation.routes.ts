// src/routes/features/products/productsValidation.routes.ts
// Product validation routes using modular product validation controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { productsValidationController } from '../../../controllers/features/products/productsValidation.controller';

const objectIdSchema = Joi.string().hex().length(24);

const validateCreateBodySchema = Joi.object({
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

const validateUpdateBodySchema = Joi.object({
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

const validateBulkBodySchema = Joi.object({
  productIds: Joi.array().items(objectIdSchema).min(1).max(100).required(),
  maxBulkSize: Joi.number().integer().min(1).max(500).optional()
});

const validatePriceQuerySchema = Joi.object({
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional()
});

const validateSearchQuerySchema = Joi.object({
  query: Joi.string().trim().optional()
});

const sanitizeBodySchema = Joi.object({
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

const builder = createRouteBuilder(RouteConfigs.tenant);

// Validate create product
builder.post(
  '/validate-create',
  createHandler(productsValidationController, 'validateCreateProduct'),
  {
    validateBody: validateCreateBodySchema
  }
);

// Validate update product
builder.post(
  '/validate-update',
  createHandler(productsValidationController, 'validateUpdateProduct'),
  {
    validateBody: validateUpdateBodySchema
  }
);

// Validate bulk operation
builder.post(
  '/validate-bulk',
  createHandler(productsValidationController, 'validateBulkOperation'),
  {
    validateBody: validateBulkBodySchema
  }
);

// Validate price range
builder.get(
  '/validate-price',
  createHandler(productsValidationController, 'validatePriceRange'),
  {
    validateQuery: validatePriceQuerySchema
  }
);

// Validate search query
builder.get(
  '/validate-search',
  createHandler(productsValidationController, 'validateSearchQuery'),
  {
    validateQuery: validateSearchQuerySchema
  }
);

// Sanitize product payload
builder.post(
  '/sanitize',
  createHandler(productsValidationController, 'sanitizeProductPayload'),
  {
    validateBody: sanitizeBodySchema
  }
);

export default builder.getRouter();