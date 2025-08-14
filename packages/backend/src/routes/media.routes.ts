// src/routes/media.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authenticateManufacturer } from '../middleware/manufacturerAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { uploadMiddleware, cleanupOnError, validateUploadOrigin } from '../middleware/upload.middleware';
import {
  uploadMedia,
  listMedia,
  getMedia,
  deleteMedia,
  updateMediaMetadata,
  getMediaAnalytics,
  bulkDeleteMedia
} from '../controllers/media.controller';
import {
  uploadMediaSchema,
  listMediaQuerySchema,
  mediaParamsSchema,
  updateMediaMetadataSchema,
  bulkDeleteMediaSchema
} from '../validation/media.validation';

const router = Router();

// Apply dynamic rate limiting to all media routes
router.use(dynamicRateLimiter());

// ===== AUTHENTICATION MIDDLEWARE =====

// Apply authentication to all routes (supports both brand and manufacturer)
router.use((req, res, next) => {
  // Try brand authentication first
  authenticate(req, res, (brandErr) => {
    if (!brandErr) {
      req.userType = 'brand';
      return next();
    }
    
    // If brand auth fails, try manufacturer authentication
    authenticateManufacturer(req, res, (mfgErr) => {
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
  strictRateLimiter(), // Prevent upload spam
  validateUploadOrigin,
  uploadMiddleware.single('file'),
  validateBody(uploadMediaSchema),
  uploadMedia,
  cleanupOnError
);

// Upload multiple media files (extra strict rate limiting)
router.post(
  '/upload/batch',
  strictRateLimiter(), // Very strict for batch uploads
  validateUploadOrigin,
  uploadMiddleware.array('files', 10), // Max 10 files
  validateBody(uploadMediaSchema),
  uploadMedia,
  cleanupOnError
);

// ===== MEDIA MANAGEMENT ROUTES =====

// List all media with filtering and pagination
router.get(
  '/',
  validateQuery(listMediaQuerySchema),
  listMedia
);

// Get specific media file details
router.get(
  '/:id',
  validateParams(mediaParamsSchema),
  getMedia
);

// Update media metadata
router.put(
  '/:id',
  validateParams(mediaParamsSchema),
  validateBody(updateMediaMetadataSchema),
  updateMediaMetadata
);

// Delete single media file (strict rate limiting)
router.delete(
  '/:id',
  strictRateLimiter(), // Security for deletions
  validateParams(mediaParamsSchema),
  deleteMedia
);

// ===== BULK OPERATIONS =====

// Bulk delete media files (extra strict rate limiting)
router.delete(
  '/bulk',
  strictRateLimiter(), // Very strict for bulk operations
  validateBody(bulkDeleteMediaSchema),
  bulkDeleteMedia
);

// ===== ANALYTICS & INSIGHTS =====

// Get media usage analytics
router.get(
  '/analytics/usage',
  validateQuery(listMediaQuerySchema),
  getMediaAnalytics
);

// Get storage analytics
router.get(
  '/analytics/storage',
  validateQuery(listMediaQuerySchema),
  getMediaAnalytics
);

// ===== SPECIALIZED ROUTES =====

// Get media by type (images, videos, documents)
router.get(
  '/type/:mediaType',
  validateParams(mediaParamsSchema.extract(['mediaType'])),
  validateQuery(listMediaQuerySchema),
  listMedia
);

// Get recent uploads
router.get(
  '/recent',
  validateQuery(listMediaQuerySchema),
  listMedia
);

// Search media by filename or tags
router.get(
  '/search',
  validateQuery(listMediaQuerySchema),
  listMedia
);

export default router;