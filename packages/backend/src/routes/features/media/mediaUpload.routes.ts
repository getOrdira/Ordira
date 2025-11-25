// src/routes/features/media/mediaUpload.routes.ts
// Media upload routes using modular media upload controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { mediaUploadController } from '../../../controllers/features/media/mediaUpload.controller';
import { uploadMiddleware } from '../../../middleware/upload/upload.middleware';
import { validateBody } from '../../../middleware/validation/validation.middleware';

const uploadMediaBodySchema = Joi.object({
  category: Joi.string().valid('profile', 'product', 'banner', 'certificate', 'document').optional(),
  description: Joi.string().trim().max(500).optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(20).optional(),
  resourceId: Joi.string().trim().optional(),
  isPublic: Joi.boolean().optional(),
  allowedTypes: Joi.array().items(Joi.string()).optional(),
  maxFileSize: Joi.number().integer().min(1).optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Upload single media file
builder.post(
  '/upload',
  createHandler(mediaUploadController, 'uploadMedia'),
  {
    middleware: [
      ...(uploadMiddleware.singleImage as any),
      validateBody(uploadMediaBodySchema)
    ]
  }
);

// Upload multiple media files (batch)
builder.post(
  '/upload/batch',
  createHandler(mediaUploadController, 'uploadBatchMedia'),
  {
    middleware: [
      ...(uploadMiddleware.multipleImages as any),
      validateBody(uploadMediaBodySchema)
    ]
  }
);

export default builder.getRouter();

