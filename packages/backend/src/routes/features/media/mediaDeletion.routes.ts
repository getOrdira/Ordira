// src/routes/features/media/mediaDeletion.routes.ts
// Media deletion routes using modular media deletion controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { mediaDeletionController } from '../../../controllers/features/media/mediaDeletion.controller';

const objectIdSchema = Joi.string().hex().length(24);

const mediaIdParamsSchema = Joi.object({
  mediaId: objectIdSchema.required()
});

const deleteMultipleMediaBodySchema = Joi.object({
  mediaIds: Joi.array().items(objectIdSchema).min(1).max(100).required()
});

const deleteByCategoryQuerySchema = Joi.object({
  category: Joi.string().valid('profile', 'product', 'banner', 'certificate', 'document').required()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Delete a single media file
builder.delete(
  '/:mediaId',
  createHandler(mediaDeletionController, 'deleteMedia'),
  {
    validateParams: mediaIdParamsSchema
  }
);

// Delete multiple media files
builder.post(
  '/delete/batch',
  createHandler(mediaDeletionController, 'deleteMultipleMedia'),
  {
    validateBody: deleteMultipleMediaBodySchema
  }
);

// Delete all media for a category
builder.delete(
  '/category',
  createHandler(mediaDeletionController, 'deleteByCategory'),
  {
    validateQuery: deleteByCategoryQuerySchema
  }
);

// Clean up orphaned media files
builder.post(
  '/cleanup/orphaned',
  createHandler(mediaDeletionController, 'cleanupOrphanedMedia'),
  {}
);

export default builder.getRouter();

