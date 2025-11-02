// src/routes/features/media/mediaSearch.routes.ts
// Media search routes using modular media search controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { mediaSearchController } from '../../../controllers/features/media/mediaSearch.controller';

const searchMediaQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(200).required(),
  type: Joi.string().valid('image', 'video', 'gif', 'document').optional(),
  category: Joi.string().valid('profile', 'product', 'banner', 'certificate', 'document').optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  page: Joi.number().integer().min(1).optional()
});

const searchByTagsQuerySchema = Joi.object({
  tags: Joi.alternatives().try(
    Joi.string().trim(),
    Joi.array().items(Joi.string().trim().max(50))
  ).required(),
  type: Joi.string().valid('image', 'video', 'gif', 'document').optional(),
  category: Joi.string().valid('profile', 'product', 'banner', 'certificate', 'document').optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

// Search media with text query
builder.get(
  '/search',
  createHandler(mediaSearchController, 'searchMedia'),
  {
    validateQuery: searchMediaQuerySchema
  }
);

// Search media by tags
builder.get(
  '/search/tags',
  createHandler(mediaSearchController, 'searchByTags'),
  {
    validateQuery: searchByTagsQuerySchema
  }
);

export default builder.getRouter();

