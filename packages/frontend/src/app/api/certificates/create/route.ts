// src/routes/certificates/create.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as createCtrl from '../../controllers/certificates/create.controller';
import {
  createCertificateSchema,
  batchCreateCertificateSchema,
  scheduledCreateSchema,
  importCertificatesSchema,
  validateCertificateDataSchema,
  previewCertificateSchema
} from '../../validation/certificates/create.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);

/**
 * POST /api/certificates/create
 * Create a single certificate with comprehensive options
 */
router.post(
  '/',
  strictRateLimiter(), // Prevent certificate spam
  validateBody(createCertificateSchema),
  createCtrl.createSingleCertificate
);

/**
 * POST /api/certificates/create/batch
 * Create multiple certificates in batch
 */
router.post(
  '/batch',
  requireTenantPlan(['growth', 'premium', 'enterprise']), // Batch requires growth+
  strictRateLimiter(),
  validateBody(batchCreateCertificateSchema),
  createCtrl.createBatchCertificates
);

/**
 * POST /api/certificates/create/scheduled
 * Schedule certificate creation for future date
 */
router.post(
  '/scheduled',
  requireTenantPlan(['premium', 'enterprise']), // Scheduling requires premium+
  strictRateLimiter(),
  validateBody(scheduledCreateSchema),
  createCtrl.scheduleeCertificateCreation
);

/**
 * POST /api/certificates/create/import
 * Import certificates from CSV/Excel file
 */
router.post(
  '/import',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(importCertificatesSchema),
  createCtrl.importCertificatesFromFile
);

/**
 * POST /api/certificates/create/preview
 * Preview certificate before creation
 */
router.post(
  '/preview',
  validateBody(previewCertificateSchema),
  createCtrl.previewCertificate
);

/**
 * POST /api/certificates/create/validate
 * Validate certificate data before creation
 */
router.post(
  '/validate',
  validateBody(validateCertificateDataSchema),
  createCtrl.validateCertificateData
);

/**
 * GET /api/certificates/create/estimate-cost
 * Estimate gas costs for certificate creation
 */
router.get(
  '/estimate-cost',
  validateQuery(createCertificateSchema.costEstimate),
  createCtrl.estimateCreationCost
);

/**
 * POST /api/certificates/create/bulk-import-status/:jobId
 * Check status of bulk import job
 */
router.get(
  '/bulk-import-status/:jobId',
  validateParams(importCertificatesSchema.jobParams),
  createCtrl.getBulkImportStatus
);

/**
 * GET /api/certificates/create/templates
 * Get available certificate templates for creation
 */
router.get(
  '/templates',
  createCtrl.getAvailableTemplates
);

/**
 * POST /api/certificates/create/from-template/:templateId
 * Create certificate from predefined template
 */
router.post(
  '/from-template/:templateId',
  validateParams(createCertificateSchema.templateParams),
  validateBody(createCertificateSchema.fromTemplate),
  createCtrl.createFromTemplate
);

/**
 * POST /api/certificates/create/webhook-triggered
 * Create certificate triggered by webhook (e-commerce integration)
 */
router.post(
  '/webhook-triggered',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(createCertificateSchema.webhookTriggered),
  createCtrl.createWebhookTriggered
);

/**
 * POST /api/certificates/create/api-triggered
 * Create certificate via external API call
 */
router.post(
  '/api-triggered',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(createCertificateSchema.apiTriggered),
  createCtrl.createApiTriggered
);

/**
 * GET /api/certificates/create/queue-status
 * Get current creation queue status
 */
router.get(
  '/queue-status',
  createCtrl.getCreationQueueStatus
);

/**
 * POST /api/certificates/create/retry-failed/:certificateId
 * Retry failed certificate creation
 */
router.post(
  '/retry-failed/:certificateId',
  strictRateLimiter(),
  validateParams(createCertificateSchema.retryParams),
  createCtrl.retryFailedCreation
);

/**
 * POST /api/certificates/create/duplicate/:certificateId
 * Duplicate existing certificate with new recipient
 */
router.post(
  '/duplicate/:certificateId',
  validateParams(createCertificateSchema.duplicateParams),
  validateBody(createCertificateSchema.duplicate),
  createCtrl.duplicateCertificate
);

/**
 * POST /api/certificates/create/cancel-scheduled/:scheduleId
 * Cancel scheduled certificate creation
 */
router.post(
  '/cancel-scheduled/:scheduleId',
  validateParams(scheduledCreateSchema.cancelParams),
  createCtrl.cancelScheduledCreation
);

export default router;