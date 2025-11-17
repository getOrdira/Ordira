// src/routes/features/manufacturers/manufacturerMedia.routes.ts
// Manufacturer media routes using modular manufacturer media controller

import Joi from 'joi';
import { RequestHandler } from 'express';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { manufacturerMediaController } from '../../../controllers/features/manufacturers/manufacturerMedia.controller';
import { uploadMiddleware } from '../../../middleware/upload/upload.middleware';

const objectIdSchema = Joi.string().hex().length(24);

const manufacturerIdParamsSchema = Joi.object({
  manufacturerId: objectIdSchema.required()
});

const uploadFileBodySchema = Joi.object({
  allowedTypes: Joi.array().items(Joi.string().trim().max(50)).optional(),
  maxSizeInMB: Joi.number().integer().min(1).max(100).optional(),
  destination: Joi.string().trim().max(200).optional(),
  generateThumbnail: Joi.boolean().optional(),
  watermark: Joi.boolean().optional()
});

const fileIdParamsSchema = Joi.object({
  manufacturerId: objectIdSchema.required(),
  fileId: objectIdSchema.required()
});

const processImageBodySchema = Joi.object({
  resize: Joi.object({
    width: Joi.number().integer().min(1).optional(),
    height: Joi.number().integer().min(1).optional(),
    fit: Joi.string().valid('cover', 'contain', 'fill').optional()
  }).optional(),
  quality: Joi.number().integer().min(1).max(100).optional(),
  format: Joi.string().valid('jpeg', 'png', 'webp', 'avif').optional(),
  watermark: Joi.object({
    text: Joi.string().trim().max(200).optional(),
    image: Joi.string().trim().max(200).optional(),
    position: Joi.string().valid('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center').optional(),
    opacity: Joi.number().min(0).max(1).optional()
  }).optional(),
  filters: Joi.object({
    blur: Joi.number().min(0).max(10).optional(),
    sharpen: Joi.number().min(0).max(10).optional(),
    brightness: Joi.number().min(-1).max(1).optional(),
    contrast: Joi.number().min(-1).max(1).optional(),
    saturation: Joi.number().min(-1).max(1).optional()
  }).optional()
});

const qrCodeBodySchema = Joi.object({
  data: Joi.string().trim().min(1).max(2000).required(),
  format: Joi.string().valid('png', 'svg', 'pdf').optional(),
  size: Joi.string().valid('small', 'medium', 'large', 'custom').optional(),
  customSize: Joi.number().integer().min(50).max(2000).optional(),
  errorCorrectionLevel: Joi.string().valid('L', 'M', 'Q', 'H').optional(),
  margin: Joi.number().integer().min(0).max(10).optional(),
  color: Joi.object({
    dark: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
    light: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional()
  }).optional(),
  logo: Joi.object({
    path: Joi.string().trim().max(500).required(),
    size: Joi.number().integer().min(1).max(100).optional()
  }).optional()
});

const createGalleryBodySchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  fileIds: Joi.array().items(objectIdSchema).min(1).max(100).required(),
  description: Joi.string().trim().max(2000).optional(),
  isPublic: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string().trim().max(100)).optional(),
  coverImageId: objectIdSchema.optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Upload file
builder.post(
  '/:manufacturerId/upload',
  createHandler(manufacturerMediaController, 'uploadFile'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: uploadFileBodySchema,
    middleware: uploadMiddleware.memoryOnly.singleFile as unknown as RequestHandler[]
  }
);

// Process image
builder.post(
  '/:manufacturerId/:fileId/process',
  createHandler(manufacturerMediaController, 'processImage'),
  {
    validateParams: fileIdParamsSchema,
    validateBody: processImageBodySchema
  }
);

// Generate QR code
builder.post(
  '/:manufacturerId/qr-code',
  createHandler(manufacturerMediaController, 'generateQRCode'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: qrCodeBodySchema
  }
);

// Create media gallery
builder.post(
  '/:manufacturerId/gallery',
  createHandler(manufacturerMediaController, 'createMediaGallery'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: createGalleryBodySchema
  }
);

// Get brand assets
builder.get(
  '/:manufacturerId/brand-assets',
  createHandler(manufacturerMediaController, 'getBrandAssets'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Get media analytics
builder.get(
  '/:manufacturerId/media-analytics',
  createHandler(manufacturerMediaController, 'getMediaAnalytics'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Delete file
builder.delete(
  '/:manufacturerId/:fileId',
  createHandler(manufacturerMediaController, 'deleteFile'),
  {
    validateParams: fileIdParamsSchema
  }
);

export default builder.getRouter();