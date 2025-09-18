
// src/routes/media.routes.ts
import { Router, RequestHandler } from 'express';
import Joi from 'joi';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { asRouteHandler, asRateLimitHandler } from '../utils/routeHelpers'; 
import { authenticate, requireManufacturer } from '../middleware/unifiedAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { uploadMiddleware, cleanupOnError, validateUploadOrigin } from '../middleware/upload.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import * as mediaCtrl from '../controllers/media.controller';
import {
  uploadMediaSchema,
  listMediaQuerySchema,
  mediaParamsSchema,
  updateMediaMetadataSchema,
  bulkDeleteMediaSchema
} from '../validation/media.validation';


const router = Router();
const safeUploadMiddleware = {
  singleImage: uploadMiddleware.singleImage as RequestHandler[],
  multipleImages: uploadMiddleware.multipleImages as RequestHandler[]
};

// Apply dynamic rate limiting to all media routes
router.use(asRateLimitHandler(dynamicRateLimiter()));

// ===== AUTHENTICATION MIDDLEWARE =====

// Apply flexible authentication to all routes (supports both brand and manufacturer)
router.use((req: any, res, next) => {
  // Try brand authentication first
  authenticate(req, res, (brandErr) => {
    if (!brandErr) {
      req.userType = 'brand';
      return next();
    }
    
    // If brand auth fails, try manufacturer authentication
    requireManufacturer(req, res, (mfgErr) => {
      if (!mfgErr) {
        req.userType = 'manufacturer';
        return next();
      }
      
      // Both authentications failed
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Valid brand or manufacturer authentication required',
        code: 'AUTH_REQUIRED'
      });
    });
  });
});

// ===== FILE UPLOAD ROUTES =====

// Upload single media file (strict rate limiting to prevent abuse)
router.post(
  '/upload',
  asRateLimitHandler(strictRateLimiter()), // Prevent upload spam
  validateUploadOrigin,
  ...safeUploadMiddleware.singleImage, // Use predefined single image middleware
  validateBody(uploadMediaSchema),
  trackManufacturerAction('upload_media'),
  asRouteHandler(mediaCtrl.uploadMedia),
  cleanupOnError
);

// Upload multiple media files (extra strict rate limiting)
router.post(
  '/upload/batch',
  asRateLimitHandler(strictRateLimiter()), // Very strict for batch uploads
  validateUploadOrigin,
  ...safeUploadMiddleware.multipleImages, // Use predefined multiple images middleware
  validateBody(uploadMediaSchema),
  trackManufacturerAction('batch_upload_media'),
  asRouteHandler(mediaCtrl.uploadMultipleMedia),
  cleanupOnError
);

// ===== MEDIA MANAGEMENT ROUTES =====

// List all media with filtering and pagination
router.get(
  '/',
  validateQuery(listMediaQuerySchema),
  trackManufacturerAction('list_media'),
  asRouteHandler(mediaCtrl.listMedia)
);


// Get specific media file details
router.get(
  '/:mediaId',
  validateParams(mediaParamsSchema),
  trackManufacturerAction('view_media_details'),
  asRouteHandler(mediaCtrl.getMediaDetails)
);

// Update media metadata
router.put(
  '/:mediaId',
  validateParams(mediaParamsSchema),
  validateBody(updateMediaMetadataSchema),
  trackManufacturerAction('update_media'),
  asRouteHandler(mediaCtrl.updateMediaMetadata)
);

// Delete single media file (strict rate limiting)
router.delete(
  '/:mediaId',
  asRateLimitHandler(strictRateLimiter()), // Security for deletions
  validateParams(mediaParamsSchema),
  trackManufacturerAction('delete_media'),
  asRouteHandler(mediaCtrl.deleteMedia)
);

// ===== SPECIALIZED ROUTES =====

// Get media by category
router.get(
  '/category/:category',
  validateParams(Joi.object({
    category: Joi.string()
      .valid('profile', 'product', 'banner', 'certificate', 'document')
      .required()
      .messages({
        'any.only': 'Category must be one of: profile, product, banner, certificate, document',
        'any.required': 'Category is required'
      })
  })),
  trackManufacturerAction('browse_media_by_category'),
  asRouteHandler(mediaCtrl.getMediaByCategory)
);

// Download media file
router.get(
  '/:mediaId/download',
  validateParams(mediaParamsSchema),
  trackManufacturerAction('download_media'),
  asRouteHandler(mediaCtrl.downloadMedia)
);

// ===== BULK OPERATIONS =====

// Bulk delete media files (extra strict rate limiting)
router.delete(
  '/bulk',
  asRateLimitHandler(strictRateLimiter()), // Very strict for bulk operations
  validateBody(bulkDeleteMediaSchema),
  trackManufacturerAction('bulk_delete_media'),
  async (req: any, res, next) => {
    // Since bulk delete isn't in controller, we'll use individual delete in a loop
    try {
      const { mediaIds } = req.body;
      const businessId = (req as any).tenant?.business?.toString();
      
      if (!businessId) {
        return res.status(400).json({
          error: 'Business context not found',
          code: 'MISSING_BUSINESS_CONTEXT'
        });
      }

      const results = { deleted: 0, errors: [] };
      
      for (const mediaId of mediaIds) {
        try {
          // Use the service directly for bulk operations
          await require('../services/business/media.service').MediaService.prototype.deleteMedia.call(
            new (require('../services/business/media.service').MediaService)(),
            mediaId,
            businessId
          );
          results.deleted++;
        } catch (error: any) {
          results.errors.push(`Failed to delete ${mediaId}: ${error.message}`);
        }
      }

      res.json({
        success: true,
        message: `Bulk delete completed: ${results.deleted} files deleted`,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== SEARCH & ANALYTICS =====

// Search media by filename or tags
router.get(
  '/search',
  validateQuery(Joi.object({
    q: Joi.string().trim().min(2).max(100).required().messages({
      'string.min': 'Search query must be at least 2 characters',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),
    category: Joi.string()
      .valid('profile', 'product', 'banner', 'certificate', 'document')
      .optional(),
    type: Joi.string()
      .valid('image', 'video', 'gif', 'document')
      .optional(),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  trackManufacturerAction('search_media'),
  async (req: any, res, next) => {
    try {
      const businessId = (req as any).tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          error: 'Business context not found',
          code: 'MISSING_BUSINESS_CONTEXT'
        });
      }

      const { q, category, type, limit } = req.query;
      const mediaService = new (require('../services/business/media.service').MediaService)();
      
      const results = await mediaService.searchMedia(businessId, q as string, {
        category: category as any,
        type: type as any,
        limit: parseInt(limit as string) || 20
      });

      res.json({
        success: true,
        message: 'Media search completed successfully',
        data: {
          query: q,
          results: results.media,
          total: results.total,
          filters: { category, type }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get recent uploads
router.get(
  '/recent',
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  trackManufacturerAction('view_recent_media'),
  async (req: any, res, next) => {
    try {
      const businessId = (req as any).tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          error: 'Business context not found',
          code: 'MISSING_BUSINESS_CONTEXT'
        });
      }

      const { limit } = req.query;
      const mediaService = new (require('../services/business/media.service').MediaService)();
      
      const recentMedia = await mediaService.getRecentMedia(businessId, parseInt(limit as string) || 10);

      res.json({
        success: true,
        message: 'Recent media retrieved successfully',
        data: {
          media: recentMedia,
          total: recentMedia.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get storage analytics
router.get(
  '/analytics/storage',
  trackManufacturerAction('view_storage_analytics'),
  async (req: any, res, next) => {
    try {
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          error: 'Business context not found',
          code: 'MISSING_BUSINESS_CONTEXT'
        });
      }

      const mediaService = new (require('../services/business/media.service').MediaService)();
      const stats = await mediaService.getStorageStatistics(businessId);

      res.json({
        success: true,
        message: 'Storage analytics retrieved successfully',
        data: {
          storage: stats,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
