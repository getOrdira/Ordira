// src/routes/media/media-id.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as mediaDetailsCtrl from '../../controllers/media/details.controller';
import {
  mediaDetailsSchema,
  mediaMetadataSchema,
  mediaPermissionsSchema,
  mediaVersionsSchema
} from '../../validation/media/details.validation';

// Import sub-routes
import updateRoutes from './update.routes';
import deleteRoutes from './delete.routes';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(validateParams(mediaDetailsSchema.params));
router.use(cleanupOnError);

/**
 * GET /api/media/:mediaId
 * Get detailed media information
 */
router.get(
  '/',
  trackManufacturerAction('view_media_details'),
  mediaDetailsCtrl.getMediaDetails
);

/**
 * GET /api/media/:mediaId/metadata
 * Get comprehensive media metadata
 */
router.get(
  '/metadata',
  validateQuery(mediaMetadataSchema.query),
  trackManufacturerAction('view_media_metadata'),
  mediaDetailsCtrl.getMediaMetadata
);

/**
 * GET /api/media/:mediaId/analytics
 * Get media analytics and usage statistics
 */
router.get(
  '/analytics',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(mediaDetailsSchema.analytics),
  trackManufacturerAction('view_media_analytics'),
  mediaDetailsCtrl.getMediaAnalytics
);

/**
 * GET /api/media/:mediaId/download
 * Download media file
 */
router.get(
  '/download',
  strictRateLimiter(),
  validateQuery(mediaDetailsSchema.download),
  trackManufacturerAction('download_media'),
  mediaDetailsCtrl.downloadMedia
);

/**
 * GET /api/media/:mediaId/download/original
 * Download original unprocessed file
 */
router.get(
  '/download/original',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  trackManufacturerAction('download_original_media'),
  mediaDetailsCtrl.downloadOriginalMedia
);

/**
 * GET /api/media/:mediaId/preview
 * Get media preview/thumbnail
 */
router.get(
  '/preview',
  validateQuery(mediaDetailsSchema.preview),
  trackManufacturerAction('view_media_preview'),
  mediaDetailsCtrl.getMediaPreview
);

/**
 * GET /api/media/:mediaId/thumbnails
 * Get all available thumbnails
 */
router.get(
  '/thumbnails',
  validateQuery(mediaDetailsSchema.thumbnails),
  trackManufacturerAction('view_media_thumbnails'),
  mediaDetailsCtrl.getMediaThumbnails
);

/**
 * POST /api/media/:mediaId/thumbnails/generate
 * Generate new thumbnails
 */
router.post(
  '/thumbnails/generate',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaDetailsSchema.generateThumbnails),
  trackManufacturerAction('generate_media_thumbnails'),
  mediaDetailsCtrl.generateThumbnails
);

/**
 * GET /api/media/:mediaId/related
 * Get related/similar media files
 */
router.get(
  '/related',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(mediaDetailsSchema.related),
  trackManufacturerAction('view_related_media'),
  mediaDetailsCtrl.getRelatedMedia
);

/**
 * GET /api/media/:mediaId/usage
 * Get where this media is being used
 */
router.get(
  '/usage',
  validateQuery(mediaDetailsSchema.usage),
  trackManufacturerAction('view_media_usage'),
  mediaDetailsCtrl.getMediaUsage
);

/**
 * GET /api/media/:mediaId/versions
 * Get all versions of this media file
 */
router.get(
  '/versions',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(mediaVersionsSchema.list),
  trackManufacturerAction('view_media_versions'),
  mediaDetailsCtrl.getMediaVersions
);

/**
 * POST /api/media/:mediaId/versions
 * Create new version of media file
 */
router.post(
  '/versions',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaVersionsSchema.create),
  trackManufacturerAction('create_media_version'),
  mediaDetailsCtrl.createMediaVersion
);

/**
 * GET /api/media/:mediaId/versions/:versionId
 * Get specific version details
 */
router.get(
  '/versions/:versionId',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(mediaVersionsSchema.params),
  trackManufacturerAction('view_media_version'),
  mediaDetailsCtrl.getMediaVersion
);

/**
 * POST /api/media/:mediaId/versions/:versionId/restore
 * Restore to specific version
 */
router.post(
  '/versions/:versionId/restore',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(mediaVersionsSchema.params),
  trackManufacturerAction('restore_media_version'),
  mediaDetailsCtrl.restoreMediaVersion
);

/**
 * GET /api/media/:mediaId/permissions
 * Get media access permissions
 */
router.get(
  '/permissions',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  trackManufacturerAction('view_media_permissions'),
  mediaDetailsCtrl.getMediaPermissions
);

/**
 * PUT /api/media/:mediaId/permissions
 * Update media access permissions
 */
router.put(
  '/permissions',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaPermissionsSchema.update),
  trackManufacturerAction('update_media_permissions'),
  mediaDetailsCtrl.updateMediaPermissions
);

/**
 * POST /api/media/:mediaId/share
 * Share media with specific users/brands
 */
router.post(
  '/share',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaPermissionsSchema.share),
  trackManufacturerAction('share_media'),
  mediaDetailsCtrl.shareMedia
);

/**
 * GET /api/media/:mediaId/share/link
 * Get shareable public link
 */
router.get(
  '/share/link',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(mediaPermissionsSchema.shareLink),
  trackManufacturerAction('get_media_share_link'),
  mediaDetailsCtrl.getShareableLink
);

/**
 * POST /api/media/:mediaId/share/link
 * Create new shareable link
 */
router.post(
  '/share/link',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaPermissionsSchema.createShareLink),
  trackManufacturerAction('create_media_share_link'),
  mediaDetailsCtrl.createShareableLink
);

/**
 * DELETE /api/media/:mediaId/share/link/:linkId
 * Revoke shareable link
 */
router.delete(
  '/share/link/:linkId',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(mediaPermissionsSchema.linkParams),
  trackManufacturerAction('revoke_media_share_link'),
  mediaDetailsCtrl.revokeShareableLink
);

/**
 * POST /api/media/:mediaId/convert
 * Convert media to different format
 */
router.post(
  '/convert',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaDetailsSchema.convert),
  trackManufacturerAction('convert_media'),
  mediaDetailsCtrl.convertMedia
);

/**
 * POST /api/media/:mediaId/optimize
 * Optimize media file (compress, resize, etc.)
 */
router.post(
  '/optimize',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaDetailsSchema.optimize),
  trackManufacturerAction('optimize_media'),
  mediaDetailsCtrl.optimizeMedia
);

/**
 * POST /api/media/:mediaId/extract-text
 * Extract text from document/image (OCR)
 */
router.post(
  '/extract-text',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(mediaDetailsSchema.extractText),
  trackManufacturerAction('extract_media_text'),
  mediaDetailsCtrl.extractTextFromMedia
);

/**
 * POST /api/media/:mediaId/ai-analysis
 * Analyze media using AI (tags, description, etc.)
 */
router.post(
  '/ai-analysis',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(mediaDetailsSchema.aiAnalysis),
  trackManufacturerAction('ai_analyze_media'),
  mediaDetailsCtrl.analyzeMediaWithAI
);

/**
 * POST /api/media/:mediaId/duplicate
 * Create duplicate of media file
 */
router.post(
  '/duplicate',
  strictRateLimiter(),
  validateBody(mediaDetailsSchema.duplicate),
  trackManufacturerAction('duplicate_media'),
  mediaDetailsCtrl.duplicateMedia
);

/**
 * POST /api/media/:mediaId/move
 * Move media to different category/folder
 */
router.post(
  '/move',
  strictRateLimiter(),
  validateBody(mediaDetailsSchema.move),
  trackManufacturerAction('move_media'),
  mediaDetailsCtrl.moveMedia
);

/**
 * GET /api/media/:mediaId/history
 * Get media modification history
 */
router.get(
  '/history',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(mediaDetailsSchema.history),
  trackManufacturerAction('view_media_history'),
  mediaDetailsCtrl.getMediaHistory
);

/**
 * POST /api/media/:mediaId/watermark
 * Add watermark to media
 */
router.post(
  '/watermark',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaDetailsSchema.watermark),
  trackManufacturerAction('add_media_watermark'),
  mediaDetailsCtrl.addWatermark
);

/**
 * POST /api/media/:mediaId/backup
 * Create backup of media file
 */
router.post(
  '/backup',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  trackManufacturerAction('backup_media'),
  mediaDetailsCtrl.backupMedia
);

// Mount sub-routes
router.use('/update', updateRoutes);
router.use('/delete', deleteRoutes);

export default router;