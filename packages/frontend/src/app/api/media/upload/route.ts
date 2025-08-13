// src/routes/media/upload.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { uploadMiddleware, cleanupOnError, validateUploadOrigin } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as mediaUploadCtrl from '../../controllers/media/upload.controller';
import {
  mediaUploadSchema,
  uploadConfigSchema,
  uploadValidationSchema,
  uploadMetadataSchema
} from '../../validation/media/upload.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(validateUploadOrigin);
router.use(cleanupOnError);

/**
 * POST /api/media/upload/single
 * Upload a single media file
 */
router.post(
  '/single',
  strictRateLimiter(),
  uploadMiddleware.singleImage,
  validateBody(mediaUploadSchema.single),
  mediaUploadCtrl.uploadSingleFile
);

/**
 * POST /api/media/upload/image
 * Upload single image file
 */
router.post(
  '/image',
  strictRateLimiter(),
  uploadMiddleware.singleImage,
  validateBody(mediaUploadSchema.image),
  mediaUploadCtrl.uploadImage
);

/**
 * POST /api/media/upload/images
 * Upload multiple images
 */
router.post(
  '/images',
  strictRateLimiter(),
  uploadMiddleware.multipleImages,
  validateBody(mediaUploadSchema.multipleImages),
  mediaUploadCtrl.uploadMultipleImages
);

/**
 * POST /api/media/upload/video
 * Upload video file
 */
router.post(
  '/video',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  uploadMiddleware.singleVideo,
  validateBody(mediaUploadSchema.video),
  mediaUploadCtrl.uploadVideo
);

/**
 * POST /api/media/upload/document
 * Upload document file
 */
router.post(
  '/document',
  strictRateLimiter(),
  uploadMiddleware.document,
  validateBody(mediaUploadSchema.document),
  mediaUploadCtrl.uploadDocument
);

/**
 * POST /api/media/upload/certificate
 * Upload certificate document
 */
router.post(
  '/certificate',
  strictRateLimiter(),
  uploadMiddleware.certificate,
  validateBody(mediaUploadSchema.certificate),
  mediaUploadCtrl.uploadCertificate
);

/**
 * POST /api/media/upload/profile-assets
 * Upload profile-related assets (logo, banner, etc.)
 */
router.post(
  '/profile-assets',
  strictRateLimiter(),
  uploadMiddleware.mixed,
  validateBody(mediaUploadSchema.profileAssets),
  mediaUploadCtrl.uploadProfileAssets
);

/**
 * POST /api/media/upload/product-images
 * Upload product images for voting/catalog
 */
router.post(
  '/product-images',
  strictRateLimiter(),
  uploadMiddleware.multipleImages,
  validateBody(mediaUploadSchema.productImages),
  mediaUploadCtrl.uploadProductImages
);

/**
 * POST /api/media/upload/voting-media
 * Upload media for voting proposals
 */
router.post(
  '/voting-media',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  uploadMiddleware.mixed,
  validateBody(mediaUploadSchema.votingMedia),
  mediaUploadCtrl.uploadVotingMedia
);

/**
 * POST /api/media/upload/portfolio
 * Upload portfolio/showcase media
 */
router.post(
  '/portfolio',
  strictRateLimiter(),
  uploadMiddleware.mixed,
  validateBody(mediaUploadSchema.portfolio),
  mediaUploadCtrl.uploadPortfolioMedia
);

/**
 * POST /api/media/upload/verification-docs
 * Upload verification documents
 */
router.post(
  '/verification-docs',
  strictRateLimiter(),
  uploadMiddleware.document,
  validateBody(mediaUploadSchema.verificationDocs),
  mediaUploadCtrl.uploadVerificationDocuments
);

/**
 * POST /api/media/upload/temporary
 * Upload temporary file (expires after 24 hours)
 */
router.post(
  '/temporary',
  strictRateLimiter(),
  uploadMiddleware.mixed,
  validateBody(mediaUploadSchema.temporary),
  mediaUploadCtrl.uploadTemporaryFile
);

/**
 * POST /api/media/upload/url
 * Upload file from URL
 */
router.post(
  '/url',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaUploadSchema.fromUrl),
  mediaUploadCtrl.uploadFromUrl
);

/**
 * POST /api/media/upload/base64
 * Upload file from base64 data
 */
router.post(
  '/base64',
  strictRateLimiter(),
  validateBody(mediaUploadSchema.fromBase64),
  mediaUploadCtrl.uploadFromBase64
);

/**
 * GET /api/media/upload/config
 * Get upload configuration and limits
 */
router.get(
  '/config',
  mediaUploadCtrl.getUploadConfig
);

/**
 * GET /api/media/upload/presigned-url
 * Get presigned URL for direct uploads (enterprise)
 */
router.get(
  '/presigned-url',
  requireTenantPlan(['enterprise']),
  validateQuery(uploadConfigSchema.presignedUrl),
  mediaUploadCtrl.getPresignedUploadUrl
);

/**
 * POST /api/media/upload/validate
 * Validate file before upload
 */
router.post(
  '/validate',
  validateBody(uploadValidationSchema),
  mediaUploadCtrl.validateFileForUpload
);

/**
 * GET /api/media/upload/quota
 * Get storage quota and usage information
 */
router.get(
  '/quota',
  mediaUploadCtrl.getStorageQuota
);

/**
 * POST /api/media/upload/chunked/init
 * Initialize chunked upload for large files
 */
router.post(
  '/chunked/init',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(uploadConfigSchema.chunkedInit),
  mediaUploadCtrl.initializeChunkedUpload
);

/**
 * POST /api/media/upload/chunked/:uploadId/chunk/:chunkNumber
 * Upload chunk for chunked upload
 */
router.post(
  '/chunked/:uploadId/chunk/:chunkNumber',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(uploadConfigSchema.chunkParams),
  uploadMiddleware.mixed,
  mediaUploadCtrl.uploadChunk
);

/**
 * POST /api/media/upload/chunked/:uploadId/complete
 * Complete chunked upload
 */
router.post(
  '/chunked/:uploadId/complete',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(uploadConfigSchema.chunkParams),
  validateBody(uploadConfigSchema.completeChunked),
  mediaUploadCtrl.completeChunkedUpload
);

/**
 * DELETE /api/media/upload/chunked/:uploadId
 * Cancel chunked upload
 */
router.delete(
  '/chunked/:uploadId',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(uploadConfigSchema.chunkParams),
  mediaUploadCtrl.cancelChunkedUpload
);

/**
 * POST /api/media/upload/replace/:mediaId
 * Replace existing media file
 */
router.post(
  '/replace/:mediaId',
  strictRateLimiter(),
  validateParams(uploadMetadataSchema.mediaParams),
  uploadMiddleware.mixed,
  validateBody(mediaUploadSchema.replace),
  mediaUploadCtrl.replaceMediaFile
);

/**
 * POST /api/media/upload/duplicate-check
 * Check for duplicate files before upload
 */
router.post(
  '/duplicate-check',
  validateBody(uploadValidationSchema.duplicateCheck),
  mediaUploadCtrl.checkForDuplicates
);

/**
 * GET /api/media/upload/supported-formats
 * Get supported file formats and specifications
 */
router.get(
  '/supported-formats',
  mediaUploadCtrl.getSupportedFormats
);

/**
 * POST /api/media/upload/optimize
 * Optimize uploaded media (compress, resize, etc.)
 */
router.post(
  '/optimize',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(uploadConfigSchema.optimize),
  mediaUploadCtrl.optimizeMedia
);

/**
 * GET /api/media/upload/analytics
 * Get upload analytics and insights
 */
router.get(
  '/analytics',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(uploadMetadataSchema.analytics),
  mediaUploadCtrl.getUploadAnalytics
);

export default router;