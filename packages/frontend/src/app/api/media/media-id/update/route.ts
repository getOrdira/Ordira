// src/routes/media/update.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { uploadMiddleware, cleanupOnError } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as mediaUpdateCtrl from '../../controllers/media/update.controller';
import {
  mediaUpdateSchema,
  metadataUpdateSchema,
  batchUpdateSchema,
  mediaReplaceSchema
} from '../../validation/media/update.validation';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(cleanupOnError);

/**
 * PUT /api/media/:mediaId/update
 * Update media metadata and properties
 */
router.put(
  '/',
  strictRateLimiter(),
  validateBody(mediaUpdateSchema.metadata),
  trackManufacturerAction('update_media_metadata'),
  mediaUpdateCtrl.updateMediaMetadata
);

/**
 * PATCH /api/media/:mediaId/update/title
 * Update media title only
 */
router.patch(
  '/title',
  validateBody(metadataUpdateSchema.title),
  trackManufacturerAction('update_media_title'),
  mediaUpdateCtrl.updateMediaTitle
);

/**
 * PATCH /api/media/:mediaId/update/description
 * Update media description only
 */
router.patch(
  '/description',
  validateBody(metadataUpdateSchema.description),
  trackManufacturerAction('update_media_description'),
  mediaUpdateCtrl.updateMediaDescription
);

/**
 * PATCH /api/media/:mediaId/update/tags
 * Update media tags
 */
router.patch(
  '/tags',
  validateBody(metadataUpdateSchema.tags),
  trackManufacturerAction('update_media_tags'),
  mediaUpdateCtrl.updateMediaTags
);

/**
 * POST /api/media/:mediaId/update/tags/add
 * Add tags to media
 */
router.post(
  '/tags/add',
  validateBody(metadataUpdateSchema.addTags),
  trackManufacturerAction('add_media_tags'),
  mediaUpdateCtrl.addMediaTags
);

/**
 * POST /api/media/:mediaId/update/tags/remove
 * Remove specific tags from media
 */
router.post(
  '/tags/remove',
  validateBody(metadataUpdateSchema.removeTags),
  trackManufacturerAction('remove_media_tags'),
  mediaUpdateCtrl.removeMediaTags
);

/**
 * PATCH /api/media/:mediaId/update/category
 * Update media category
 */
router.patch(
  '/category',
  validateBody(metadataUpdateSchema.category),
  trackManufacturerAction('update_media_category'),
  mediaUpdateCtrl.updateMediaCategory
);

/**
 * PATCH /api/media/:mediaId/update/visibility
 * Update media visibility (public/private)
 */
router.patch(
  '/visibility',
  validateBody(metadataUpdateSchema.visibility),
  trackManufacturerAction('update_media_visibility'),
  mediaUpdateCtrl.updateMediaVisibility
);

/**
 * PATCH /api/media/:mediaId/update/alt-text
 * Update media alt text for accessibility
 */
router.patch(
  '/alt-text',
  validateBody(metadataUpdateSchema.altText),
  trackManufacturerAction('update_media_alt_text'),
  mediaUpdateCtrl.updateMediaAltText
);

/**
 * PATCH /api/media/:mediaId/update/caption
 * Update media caption
 */
router.patch(
  '/caption',
  validateBody(metadataUpdateSchema.caption),
  trackManufacturerAction('update_media_caption'),
  mediaUpdateCtrl.updateMediaCaption
);

/**
 * PATCH /api/media/:mediaId/update/copyright
 * Update media copyright information
 */
router.patch(
  '/copyright',
  validateBody(metadataUpdateSchema.copyright),
  trackManufacturerAction('update_media_copyright'),
  mediaUpdateCtrl.updateMediaCopyright
);

/**
 * PATCH /api/media/:mediaId/update/location
 * Update media location/GPS data
 */
router.patch(
  '/location',
  validateBody(metadataUpdateSchema.location),
  trackManufacturerAction('update_media_location'),
  mediaUpdateCtrl.updateMediaLocation
);

/**
 * PATCH /api/media/:mediaId/update/custom-fields
 * Update custom metadata fields
 */
router.patch(
  '/custom-fields',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(metadataUpdateSchema.customFields),
  trackManufacturerAction('update_media_custom_fields'),
  mediaUpdateCtrl.updateCustomFields
);

/**
 * POST /api/media/:mediaId/update/replace-file
 * Replace media file while keeping metadata
 */
router.post(
  '/replace-file',
  strictRateLimiter(),
  uploadMiddleware.mixed,
  validateBody(mediaReplaceSchema.file),
  trackManufacturerAction('replace_media_file'),
  mediaUpdateCtrl.replaceMediaFile
);

/**
 * POST /api/media/:mediaId/update/crop
 * Crop image media
 */
router.post(
  '/crop',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaUpdateSchema.crop),
  trackManufacturerAction('crop_media'),
  mediaUpdateCtrl.cropMedia
);

/**
 * POST /api/media/:mediaId/update/resize
 * Resize media file
 */
router.post(
  '/resize',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaUpdateSchema.resize),
  trackManufacturerAction('resize_media'),
  mediaUpdateCtrl.resizeMedia
);

/**
 * POST /api/media/:mediaId/update/rotate
 * Rotate image media
 */
router.post(
  '/rotate',
  strictRateLimiter(),
  validateBody(mediaUpdateSchema.rotate),
  trackManufacturerAction('rotate_media'),
  mediaUpdateCtrl.rotateMedia
);

/**
 * POST /api/media/:mediaId/update/filters
 * Apply filters to image media
 */
router.post(
  '/filters',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaUpdateSchema.filters),
  trackManufacturerAction('apply_media_filters'),
  mediaUpdateCtrl.applyFilters
);

/**
 * POST /api/media/:mediaId/update/adjust
 * Adjust brightness, contrast, saturation, etc.
 */
router.post(
  '/adjust',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaUpdateSchema.adjust),
  trackManufacturerAction('adjust_media'),
  mediaUpdateCtrl.adjustMedia
);

/**
 * POST /api/media/:mediaId/update/enhance
 * AI-enhance media quality
 */
router.post(
  '/enhance',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(mediaUpdateSchema.enhance),
  trackManufacturerAction('enhance_media'),
  mediaUpdateCtrl.enhanceMedia
);

/**
 * POST /api/media/:mediaId/update/background-remove
 * Remove background from image
 */
router.post(
  '/background-remove',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(mediaUpdateSchema.backgroundRemove),
  trackManufacturerAction('remove_media_background'),
  mediaUpdateCtrl.removeBackground
);

/**
 * POST /api/media/:mediaId/update/upscale
 * Upscale image resolution using AI
 */
router.post(
  '/upscale',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(mediaUpdateSchema.upscale),
  trackManufacturerAction('upscale_media'),
  mediaUpdateCtrl.upscaleMedia
);

/**
 * POST /api/media/:mediaId/update/auto-tag
 * Auto-generate tags using AI
 */
router.post(
  '/auto-tag',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(mediaUpdateSchema.autoTag),
  trackManufacturerAction('auto_tag_media'),
  mediaUpdateCtrl.autoTagMedia
);

/**
 * POST /api/media/:mediaId/update/auto-description
 * Auto-generate description using AI
 */
router.post(
  '/auto-description',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(mediaUpdateSchema.autoDescription),
  trackManufacturerAction('auto_describe_media'),
  mediaUpdateCtrl.autoDescribeMedia
);

/**
 * POST /api/media/:mediaId/update/batch-apply
 * Apply same updates to multiple media files
 */
router.post(
  '/batch-apply',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(batchUpdateSchema.apply),
  trackManufacturerAction('batch_update_media'),
  mediaUpdateCtrl.batchApplyUpdates
);

/**
 * POST /api/media/:mediaId/update/revert
 * Revert to previous version
 */
router.post(
  '/revert',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaUpdateSchema.revert),
  trackManufacturerAction('revert_media'),
  mediaUpdateCtrl.revertMedia
);

/**
 * GET /api/media/:mediaId/update/preview
 * Preview changes before applying
 */
router.get(
  '/preview',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(mediaUpdateSchema.preview),
  trackManufacturerAction('preview_media_update'),
  mediaUpdateCtrl.previewUpdate
);

/**
 * POST /api/media/:mediaId/update/schedule
 * Schedule update for later execution
 */
router.post(
  '/schedule',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(mediaUpdateSchema.schedule),
  trackManufacturerAction('schedule_media_update'),
  mediaUpdateCtrl.scheduleUpdate
);

/**
 * GET /api/media/:mediaId/update/history
 * Get update history
 */
router.get(
  '/history',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(mediaUpdateSchema.history),
  trackManufacturerAction('view_media_update_history'),
  mediaUpdateCtrl.getUpdateHistory
);

/**
 * POST /api/media/:mediaId/update/validate
 * Validate update data before applying
 */
router.post(
  '/validate',
  validateBody(mediaUpdateSchema.validate),
  trackManufacturerAction('validate_media_update'),
  mediaUpdateCtrl.validateUpdate
);

export default router;