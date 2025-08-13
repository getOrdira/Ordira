// src/routes/media/list.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { cleanupOnError, validateUploadOrigin } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as mediaListCtrl from '../../controllers/media/list.controller';
import {
  mediaListSchema,
  mediaSearchSchema,
  mediaFilterSchema,
  mediaAnalyticsSchema
} from '../../validation/media/list.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(cleanupOnError);

/**
 * GET /api/media/list
 * List all media files with pagination and filtering
 */
router.get(
  '/',
  validateQuery(mediaListSchema.basic),
  trackManufacturerAction('view_media_list'),
  mediaListCtrl.listAllMedia
);

/**
 * GET /api/media/list/recent
 * Get recently uploaded media
 */
router.get(
  '/recent',
  validateQuery(mediaListSchema.recent),
  trackManufacturerAction('view_recent_media'),
  mediaListCtrl.getRecentMedia
);

/**
 * GET /api/media/list/popular
 * Get most accessed/downloaded media
 */
router.get(
  '/popular',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(mediaListSchema.popular),
  trackManufacturerAction('view_popular_media'),
  mediaListCtrl.getPopularMedia
);

/**
 * GET /api/media/list/category/:category
 * List media by specific category
 */
router.get(
  '/category/:category',
  validateParams(mediaListSchema.categoryParams),
  validateQuery(mediaListSchema.basic),
  trackManufacturerAction('view_media_by_category'),
  mediaListCtrl.getMediaByCategory
);

/**
 * GET /api/media/list/type/:type
 * List media by file type (image, video, document, etc.)
 */
router.get(
  '/type/:type',
  validateParams(mediaListSchema.typeParams),
  validateQuery(mediaListSchema.basic),
  trackManufacturerAction('view_media_by_type'),
  mediaListCtrl.getMediaByType
);

/**
 * GET /api/media/list/search
 * Search media files with advanced filters
 */
router.get(
  '/search',
  validateQuery(mediaSearchSchema.advanced),
  trackManufacturerAction('search_media'),
  mediaListCtrl.searchMedia
);

/**
 * POST /api/media/list/search/saved
 * Save search query for later use
 */
router.post(
  '/search/saved',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaSearchSchema.saveQuery),
  trackManufacturerAction('save_media_search'),
  mediaListCtrl.saveSearchQuery
);

/**
 * GET /api/media/list/search/saved
 * Get saved search queries
 */
router.get(
  '/search/saved',
  requireTenantPlan(['premium', 'enterprise']),
  trackManufacturerAction('view_saved_searches'),
  mediaListCtrl.getSavedSearchQueries
);

/**
 * DELETE /api/media/list/search/saved/:queryId
 * Delete saved search query
 */
router.delete(
  '/search/saved/:queryId',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(mediaSearchSchema.savedParams),
  trackManufacturerAction('delete_saved_search'),
  mediaListCtrl.deleteSavedSearchQuery
);

/**
 * GET /api/media/list/filter/tags
 * Get all available tags for filtering
 */
router.get(
  '/filter/tags',
  trackManufacturerAction('view_media_tags'),
  mediaListCtrl.getAvailableTags
);

/**
 * GET /api/media/list/filter/categories
 * Get media count by categories
 */
router.get(
  '/filter/categories',
  trackManufacturerAction('view_category_counts'),
  mediaListCtrl.getCategoryCounts
);

/**
 * GET /api/media/list/filter/sizes
 * Get media files by size ranges
 */
router.get(
  '/filter/sizes',
  validateQuery(mediaFilterSchema.sizeRange),
  trackManufacturerAction('filter_media_by_size'),
  mediaListCtrl.getMediaBySizeRange
);

/**
 * GET /api/media/list/filter/dates
 * Get media files by date ranges
 */
router.get(
  '/filter/dates',
  validateQuery(mediaFilterSchema.dateRange),
  trackManufacturerAction('filter_media_by_date'),
  mediaListCtrl.getMediaByDateRange
);

/**
 * GET /api/media/list/duplicates
 * Find potential duplicate files
 */
router.get(
  '/duplicates',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(mediaListSchema.duplicates),
  trackManufacturerAction('find_duplicate_media'),
  mediaListCtrl.findDuplicateMedia
);

/**
 * GET /api/media/list/unused
 * Find unused media files
 */
router.get(
  '/unused',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(mediaListSchema.unused),
  trackManufacturerAction('find_unused_media'),
  mediaListCtrl.findUnusedMedia
);

/**
 * GET /api/media/list/large-files
 * Find large files consuming storage
 */
router.get(
  '/large-files',
  validateQuery(mediaListSchema.largeFiles),
  trackManufacturerAction('view_large_files'),
  mediaListCtrl.getLargeFiles
);

/**
 * GET /api/media/list/broken-links
 * Find media files with broken or missing files
 */
router.get(
  '/broken-links',
  requireTenantPlan(['premium', 'enterprise']),
  trackManufacturerAction('find_broken_media'),
  mediaListCtrl.findBrokenMediaLinks
);

/**
 * GET /api/media/list/public
 * List publicly accessible media
 */
router.get(
  '/public',
  validateQuery(mediaListSchema.basic),
  trackManufacturerAction('view_public_media'),
  mediaListCtrl.getPublicMedia
);

/**
 * GET /api/media/list/private
 * List private media files
 */
router.get(
  '/private',
  validateQuery(mediaListSchema.basic),
  trackManufacturerAction('view_private_media'),
  mediaListCtrl.getPrivateMedia
);

/**
 * GET /api/media/list/shared
 * Get media shared with other brands/manufacturers
 */
router.get(
  '/shared',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(mediaListSchema.shared),
  trackManufacturerAction('view_shared_media'),
  mediaListCtrl.getSharedMedia
);

/**
 * GET /api/media/list/favorites
 * Get favorited media files
 */
router.get(
  '/favorites',
  validateQuery(mediaListSchema.basic),
  trackManufacturerAction('view_favorite_media'),
  mediaListCtrl.getFavoriteMedia
);

/**
 * POST /api/media/list/favorites/:mediaId
 * Add media to favorites
 */
router.post(
  '/favorites/:mediaId',
  validateParams(mediaListSchema.mediaParams),
  trackManufacturerAction('add_media_favorite'),
  mediaListCtrl.addToFavorites
);

/**
 * DELETE /api/media/list/favorites/:mediaId
 * Remove media from favorites
 */
router.delete(
  '/favorites/:mediaId',
  validateParams(mediaListSchema.mediaParams),
  trackManufacturerAction('remove_media_favorite'),
  mediaListCtrl.removeFromFavorites
);

/**
 * GET /api/media/list/stats
 * Get comprehensive media statistics
 */
router.get(
  '/stats',
  validateQuery(mediaAnalyticsSchema.stats),
  trackManufacturerAction('view_media_stats'),
  mediaListCtrl.getMediaStatistics
);

/**
 * GET /api/media/list/storage-usage
 * Get detailed storage usage breakdown
 */
router.get(
  '/storage-usage',
  trackManufacturerAction('view_storage_usage'),
  mediaListCtrl.getStorageUsage
);

/**
 * GET /api/media/list/timeline
 * Get media upload timeline
 */
router.get(
  '/timeline',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(mediaAnalyticsSchema.timeline),
  trackManufacturerAction('view_media_timeline'),
  mediaListCtrl.getMediaTimeline
);

/**
 * GET /api/media/list/export
 * Export media list as CSV/JSON
 */
router.get(
  '/export',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(mediaListSchema.export),
  trackManufacturerAction('export_media_list'),
  mediaListCtrl.exportMediaList
);

/**
 * POST /api/media/list/bulk-action
 * Perform bulk actions on selected media
 */
router.post(
  '/bulk-action',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaListSchema.bulkAction),
  trackManufacturerAction('bulk_media_action'),
  mediaListCtrl.performBulkAction
);

/**
 * GET /api/media/list/collections
 * Get media organized in collections
 */
router.get(
  '/collections',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(mediaListSchema.collections),
  trackManufacturerAction('view_media_collections'),
  mediaListCtrl.getMediaCollections
);

/**
 * POST /api/media/list/collections
 * Create new media collection
 */
router.post(
  '/collections',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaListSchema.createCollection),
  trackManufacturerAction('create_media_collection'),
  mediaListCtrl.createMediaCollection
);

/**
 * GET /api/media/list/auto-categorize
 * Auto-categorize media using AI
 */
router.get(
  '/auto-categorize',
  requireTenantPlan(['enterprise']),
  validateQuery(mediaListSchema.autoCategorize),
  trackManufacturerAction('auto_categorize_media'),
  mediaListCtrl.autoCategorizeMedia
);

export default router;