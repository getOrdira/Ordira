// src/routes/media/delete.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as mediaDeleteCtrl from '../../controllers/media/delete.controller';
import {
  mediaDeleteSchema,
  bulkDeleteSchema,
  trashSchema,
  permanentDeleteSchema
} from '../../validation/media/delete.validation';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(cleanupOnError);

/**
 * DELETE /api/media/:mediaId/delete
 * Delete media file (move to trash by default)
 */
router.delete(
  '/',
  strictRateLimiter(),
  validateBody(mediaDeleteSchema.basic),
  trackManufacturerAction('delete_media'),
  mediaDeleteCtrl.deleteMedia
);

/**
 * POST /api/media/:mediaId/delete/soft
 * Soft delete media (move to trash)
 */
router.post(
  '/soft',
  strictRateLimiter(),
  validateBody(mediaDeleteSchema.soft),
  trackManufacturerAction('soft_delete_media'),
  mediaDeleteCtrl.softDeleteMedia
);

/**
 * DELETE /api/media/:mediaId/delete/permanent
 * Permanently delete media file
 */
router.delete(
  '/permanent',
  strictRateLimiter(),
  validateBody(permanentDeleteSchema.single),
  trackManufacturerAction('permanent_delete_media'),
  mediaDeleteCtrl.permanentDeleteMedia
);

/**
 * POST /api/media/:mediaId/delete/restore
 * Restore media from trash
 */
router.post(
  '/restore',
  strictRateLimiter(),
  validateBody(trashSchema.restore),
  trackManufacturerAction('restore_media'),
  mediaDeleteCtrl.restoreMedia
);

/**
 * POST /api/media/:mediaId/delete/schedule
 * Schedule media for deletion
 */
router.post(
  '/schedule',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaDeleteSchema.schedule),
  trackManufacturerAction('schedule_media_deletion'),
  mediaDeleteCtrl.scheduleMediaDeletion
);

/**
 * DELETE /api/media/:mediaId/delete/schedule
 * Cancel scheduled deletion
 */
router.delete(
  '/schedule',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  trackManufacturerAction('cancel_scheduled_deletion'),
  mediaDeleteCtrl.cancelScheduledDeletion
);

/**
 * POST /api/media/delete/bulk
 * Bulk delete multiple media files
 */
router.post(
  '/bulk',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(bulkDeleteSchema.basic),
  trackManufacturerAction('bulk_delete_media'),
  mediaDeleteCtrl.bulkDeleteMedia
);

/**
 * POST /api/media/delete/bulk/soft
 * Bulk soft delete multiple media files
 */
router.post(
  '/bulk/soft',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(bulkDeleteSchema.soft),
  trackManufacturerAction('bulk_soft_delete_media'),
  mediaDeleteCtrl.bulkSoftDeleteMedia
);

/**
 * DELETE /api/media/delete/bulk/permanent
 * Bulk permanent delete multiple media files
 */
router.delete(
  '/bulk/permanent',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(bulkDeleteSchema.permanent),
  trackManufacturerAction('bulk_permanent_delete_media'),
  mediaDeleteCtrl.bulkPermanentDeleteMedia
);

/**
 * POST /api/media/delete/bulk/restore
 * Bulk restore multiple media files from trash
 */
router.post(
  '/bulk/restore',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(bulkDeleteSchema.restore),
  trackManufacturerAction('bulk_restore_media'),
  mediaDeleteCtrl.bulkRestoreMedia
);

/**
 * POST /api/media/delete/by-criteria
 * Delete media based on specific criteria
 */
router.post(
  '/by-criteria',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(mediaDeleteSchema.byCriteria),
  trackManufacturerAction('delete_media_by_criteria'),
  mediaDeleteCtrl.deleteMediaByCriteria
);

/**
 * GET /api/media/delete/trash
 * List deleted media in trash
 */
router.get(
  '/trash',
  validateQuery(trashSchema.list),
  trackManufacturerAction('view_media_trash'),
  mediaDeleteCtrl.getTrashMedia
);

/**
 * GET /api/media/delete/trash/stats
 * Get trash statistics
 */
router.get(
  '/trash/stats',
  trackManufacturerAction('view_trash_stats'),
  mediaDeleteCtrl.getTrashStats
);

/**
 * DELETE /api/media/delete/trash/empty
 * Empty entire trash
 */
router.delete(
  '/trash/empty',
  strictRateLimiter(),
  validateBody(trashSchema.empty),
  trackManufacturerAction('empty_media_trash'),
  mediaDeleteCtrl.emptyTrash
);

/**
 * POST /api/media/delete/trash/auto-cleanup
 * Configure automatic trash cleanup
 */
router.post(
  '/trash/auto-cleanup',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(trashSchema.autoCleanup),
  trackManufacturerAction('configure_auto_cleanup'),
  mediaDeleteCtrl.configureAutoCleanup
);

/**
 * GET /api/media/delete/scheduled
 * Get scheduled deletions
 */
router.get(
  '/scheduled',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(mediaDeleteSchema.scheduledList),
  trackManufacturerAction('view_scheduled_deletions'),
  mediaDeleteCtrl.getScheduledDeletions
);

/**
 * POST /api/media/delete/unused
 * Delete unused media files
 */
router.post(
  '/unused',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaDeleteSchema.unused),
  trackManufacturerAction('delete_unused_media'),
  mediaDeleteCtrl.deleteUnusedMedia
);

/**
 * POST /api/media/delete/duplicates
 * Delete duplicate media files
 */
router.post(
  '/duplicates',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaDeleteSchema.duplicates),
  trackManufacturerAction('delete_duplicate_media'),
  mediaDeleteCtrl.deleteDuplicateMedia
);

/**
 * POST /api/media/delete/old-versions
 * Delete old versions of media files
 */
router.post(
  '/old-versions',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaDeleteSchema.oldVersions),
  trackManufacturerAction('delete_old_versions'),
  mediaDeleteCtrl.deleteOldVersions
);

/**
 * POST /api/media/delete/by-size
 * Delete media files based on size criteria
 */
router.post(
  '/by-size',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaDeleteSchema.bySize),
  trackManufacturerAction('delete_media_by_size'),
  mediaDeleteCtrl.deleteMediaBySize
);

/**
 * POST /api/media/delete/by-age
 * Delete media files based on age
 */
router.post(
  '/by-age',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaDeleteSchema.byAge),
  trackManufacturerAction('delete_media_by_age'),
  mediaDeleteCtrl.deleteMediaByAge
);

/**
 * POST /api/media/delete/validate
 * Validate deletion request before executing
 */
router.post(
  '/validate',
  validateBody(mediaDeleteSchema.validate),
  trackManufacturerAction('validate_media_deletion'),
  mediaDeleteCtrl.validateDeletion
);

/**
 * GET /api/media/delete/impact-analysis
 * Analyze impact of deleting specific media
 */
router.get(
  '/impact-analysis',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(mediaDeleteSchema.impactAnalysis),
  trackManufacturerAction('analyze_deletion_impact'),
  mediaDeleteCtrl.analyzeDeletionImpact
);

/**
 * POST /api/media/delete/export-before-delete
 * Export media before deletion
 */
router.post(
  '/export-before-delete',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(mediaDeleteSchema.exportBeforeDelete),
  trackManufacturerAction('export_before_delete'),
  mediaDeleteCtrl.exportBeforeDelete
);

/**
 * GET /api/media/delete/recovery-options
 * Get available recovery options for deleted media
 */
router.get(
  '/recovery-options',
  requireTenantPlan(['enterprise']),
  validateQuery(mediaDeleteSchema.recoveryOptions),
  trackManufacturerAction('view_recovery_options'),
  mediaDeleteCtrl.getRecoveryOptions
);

/**
 * POST /api/media/delete/secure-delete
 * Securely delete media with multiple overwrites
 */
router.post(
  '/secure-delete',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(mediaDeleteSchema.secureDelete),
  trackManufacturerAction('secure_delete_media'),
  mediaDeleteCtrl.secureDeleteMedia
);

/**
 * GET /api/media/delete/audit-log
 * Get deletion audit log
 */
router.get(
  '/audit-log',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(mediaDeleteSchema.auditLog),
  trackManufacturerAction('view_deletion_audit_log'),
  mediaDeleteCtrl.getDeletionAuditLog
);

export default router;
  