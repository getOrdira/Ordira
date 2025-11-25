// src/routes/features/media/mediaData.routes.ts
// Media data routes using modular media data controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { mediaDataController } from '../../../controllers/features/media/mediaData.controller';

const objectIdSchema = Joi.string().hex().length(24);

const mediaIdParamsSchema = Joi.object({
  mediaId: objectIdSchema.required()
});

const listMediaQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  type: Joi.string().valid('image', 'video', 'gif', 'document').optional(),
  category: Joi.string().valid('profile', 'product', 'banner', 'certificate', 'document').optional(),
  tags: Joi.string().trim().optional(),
  search: Joi.string().trim().max(200).optional(),
  isPublic: Joi.boolean().optional(),
  sortBy: Joi.string().valid('createdAt', 'filename', 'size', 'category').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

const updateMediaMetadataSchema = Joi.object({
  category: Joi.string().valid('profile', 'product', 'banner', 'certificate', 'document').optional(),
  description: Joi.string().trim().max(500).optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(20).optional(),
  isPublic: Joi.boolean().optional()
}).min(1);

const categoryQuerySchema = Joi.object({
  category: Joi.string().valid('profile', 'product', 'banner', 'certificate', 'document').required()
});

const recentMediaQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get media by ID
builder.get(
  '/:mediaId',
  createHandler(mediaDataController, 'getMediaById'),
  {
    validateParams: mediaIdParamsSchema
  }
);

// List media with filters and pagination
builder.get(
  '/',
  createHandler(mediaDataController, 'listMedia'),
  {
    validateQuery: listMediaQuerySchema
  }
);

// Update media metadata
builder.put(
  '/:mediaId',
  createHandler(mediaDataController, 'updateMediaMetadata'),
  {
    validateParams: mediaIdParamsSchema,
    validateBody: updateMediaMetadataSchema
  }
);

// Get media by category
builder.get(
  '/category',
  createHandler(mediaDataController, 'getMediaByCategory'),
  {
    validateQuery: categoryQuerySchema
  }
);

// Get recent media
builder.get(
  '/recent',
  createHandler(mediaDataController, 'getRecentMedia'),
  {
    validateQuery: recentMediaQuerySchema
  }
);

export default builder.getRouter();

