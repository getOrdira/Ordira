// src/routes/media/bulk-upload.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { uploadMiddleware, cleanupOnError, validateUploadOrigin } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as bulkUploadCtrl from '../../controllers/media/bulkUpload.controller';
import {
  bulkUploadSchema,
  bulkJobSchema,
  bulkValidationSchema,
  bulkAnalyticsSchema
} from '../../validation/media/bulkUpload.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(validateUploadOrigin);
router.use(cleanupOnError);

/**
 * POST /api/media/bulk-upload
 * Upload multiple files in bulk
 */
router.post(
  '/',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  uploadMiddleware.mixed,
  validateBody(bulkUploadSchema.basic),
  bulkUploadCtrl.uploadBulkFiles
);

/**
 * POST /api/media/bulk-upload/product-catalog
 * Bulk upload product images with metadata
 */
router.post(
  '/product-catalog',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  uploadMiddleware.multipleImages,
  validateBody(bulkUploadSchema.productCatalog),
  bulkUploadCtrl.uploadProductCatalog
);

/**
 * POST /api/media/bulk-upload/portfolio
 * Bulk upload portfolio/showcase media
 */
router.post(
  '/portfolio',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  uploadMiddleware.mixed,
  validateBody(bulkUploadSchema.portfolio),
  bulkUploadCtrl.uploadPortfolioBulk
);

/**
 * POST /api/media/bulk-upload/archive
 * Upload and extract archive file (ZIP, RAR, etc.)
 */
router.post(
  '/archive',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  uploadMiddleware.document,
  validateBody(bulkUploadSchema.archive),
  bulkUploadCtrl.uploadAndExtractArchive
);

/**
 * POST /api/media/bulk-upload/csv-metadata
 * Upload files with CSV metadata mapping
 */
router.post(
  '/csv-metadata',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  uploadMiddleware.mixed,
  validateBody(bulkUploadSchema.csvMetadata),
  bulkUploadCtrl.uploadWithCsvMetadata
);

/**
 * POST /api/media/bulk-upload/from-urls
 * Bulk upload from URL list
 */
router.post(
  '/from-urls',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(bulkUploadSchema.fromUrls),
  bulkUploadCtrl.bulkUploadFromUrls
);

/**
 * POST /api/media/bulk-upload/sync-external
 * Sync/import from external storage (Google Drive, Dropbox, etc.)
 */
router.post(
  '/sync-external',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(bulkUploadSchema.syncExternal),
  bulkUploadCtrl.syncFromExternalStorage
);

/**
 * GET /api/media/bulk-upload/jobs
 * Get bulk upload job history
 */
router.get(
  '/jobs',
  validateQuery(bulkJobSchema.list),
  bulkUploadCtrl.getBulkUploadJobs
);

/**
 * GET /api/media/bulk-upload/jobs/:jobId
 * Get specific bulk upload job status
 */
router.get(
  '/jobs/:jobId',
  validateParams(bulkJobSchema.params),
  bulkUploadCtrl.getBulkUploadJobStatus
);

/**
 * POST /api/media/bulk-upload/jobs/:jobId/retry
 * Retry failed bulk upload job
 */
router.post(
  '/jobs/:jobId/retry',
  strictRateLimiter(),
  validateParams(bulkJobSchema.params),
  validateBody(bulkJobSchema.retry),
  bulkUploadCtrl.retryBulkUploadJob
);

/**
 * DELETE /api/media/bulk-upload/jobs/:jobId
 * Cancel running bulk upload job
 */
router.delete(
  '/jobs/:jobId',
  strictRateLimiter(),
  validateParams(bulkJobSchema.params),
  bulkUploadCtrl.cancelBulkUploadJob
);

/**
 * GET /api/media/bulk-upload/jobs/:jobId/progress
 * Get real-time progress of bulk upload job
 */
router.get(
  '/jobs/:jobId/progress',
  validateParams(bulkJobSchema.params),
  bulkUploadCtrl.getBulkUploadProgress
);

/**
 * GET /api/media/bulk-upload/jobs/:jobId/logs
 * Get detailed logs for bulk upload job
 */
router.get(
  '/jobs/:jobId/logs',
  validateParams(bulkJobSchema.params),
  validateQuery(bulkJobSchema.logs),
  bulkUploadCtrl.getBulkUploadLogs
);

/**
 * POST /api/media/bulk-upload/validate
 * Validate files before bulk upload
 */
router.post(
  '/validate',
  uploadMiddleware.mixed,
  validateBody(bulkValidationSchema),
  bulkUploadCtrl.validateBulkUpload
);

/**
 * GET /api/media/bulk-upload/quota-check
 * Check if bulk upload fits within quota
 */
router.get(
  '/quota-check',
  validateQuery(bulkUploadSchema.quotaCheck),
  bulkUploadCtrl.checkBulkUploadQuota
);

/**
 * POST /api/media/bulk-upload/optimize-batch
 * Optimize multiple files in batch
 */
router.post(
  '/optimize-batch',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(bulkUploadSchema.optimizeBatch),
  bulkUploadCtrl.optimizeBulkFiles
);

/**
 * POST /api/media/bulk-upload/auto-tag
 * Auto-tag uploaded files using AI
 */
router.post(
  '/auto-tag',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(bulkUploadSchema.autoTag),
  bulkUploadCtrl.autoTagBulkFiles
);

/**
 * POST /api/media/bulk-upload/duplicate-resolution
 * Resolve duplicate files in bulk upload
 */
router.post(
  '/duplicate-resolution',
  validateBody(bulkUploadSchema.duplicateResolution),
  bulkUploadCtrl.resolveBulkDuplicates
);

/**
 * GET /api/media/bulk-upload/templates
 * Get bulk upload templates and configurations
 */
router.get(
  '/templates',
  bulkUploadCtrl.getBulkUploadTemplates
);

/**
 * POST /api/media/bulk-upload/templates
 * Create custom bulk upload template
 */
router.post(
  '/templates',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(bulkUploadSchema.createTemplate),
  bulkUploadCtrl.createBulkUploadTemplate
);

/**
 * PUT /api/media/bulk-upload/templates/:templateId
 * Update bulk upload template
 */
router.put(
  '/templates/:templateId',
  requireTenantPlan(['enterprise']),
  validateParams(bulkUploadSchema.templateParams),
  validateBody(bulkUploadSchema.updateTemplate),
  bulkUploadCtrl.updateBulkUploadTemplate
);

/**
 * DELETE /api/media/bulk-upload/templates/:templateId
 * Delete bulk upload template
 */
router.delete(
  '/templates/:templateId',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateParams(bulkUploadSchema.templateParams),
  bulkUploadCtrl.deleteBulkUploadTemplate
);

/**
 * POST /api/media/bulk-upload/schedule
 * Schedule bulk upload for later execution
 */
router.post(
  '/schedule',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(bulkUploadSchema.schedule),
  bulkUploadCtrl.scheduleBulkUpload
);

/**
 * GET /api/media/bulk-upload/scheduled
 * Get scheduled bulk uploads
 */
router.get(
  '/scheduled',
  requireTenantPlan(['enterprise']),
  validateQuery(bulkJobSchema.scheduled),
  bulkUploadCtrl.getScheduledBulkUploads
);

/**
 * POST /api/media/bulk-upload/import-existing
 * Import existing files into media library
 */
router.post(
  '/import-existing',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(bulkUploadSchema.importExisting),
  bulkUploadCtrl.importExistingFiles
);

/**
 * GET /api/media/bulk-upload/analytics
 * Get bulk upload analytics
 */
router.get(
  '/analytics',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(bulkAnalyticsSchema),
  bulkUploadCtrl.getBulkUploadAnalytics
);

/**
 * POST /api/media/bulk-upload/webhook
 * Configure webhook for bulk upload completion
 */
router.post(
  '/webhook',
  requireTenantPlan(['enterprise']),
  validateBody(bulkUploadSchema.webhook),
  bulkUploadCtrl.configureBulkUploadWebhook
);

/**
 * GET /api/media/bulk-upload/performance
 * Get bulk upload performance metrics
 */
router.get(
  '/performance',
  requireTenantPlan(['enterprise']),
  validateQuery(bulkAnalyticsSchema.performance),
  bulkUploadCtrl.getBulkUploadPerformance
);

export default router;