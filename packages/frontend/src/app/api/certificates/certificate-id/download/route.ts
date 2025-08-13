// src/routes/certificates/certificate-id/download.routes.ts
import { Router } from 'express';
import { validateQuery, validateParams, validateBody } from '../../../middleware/validation.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../../middleware/metrics.middleware';
import * as downloadCtrl from '../../../controllers/certificates/download.controller';
import {
  downloadOptionsSchema,
  downloadFormatSchema,
  bulkDownloadSchema,
  downloadTrackingSchema,
  watermarkOptionsSchema
} from '../../../validation/certificates/download.validation';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);

/**
 * GET /api/certificates/:certificateId/download
 * Download certificate in default format (PDF)
 */
router.get(
  '/',
  validateParams(downloadOptionsSchema.params),
  validateQuery(downloadOptionsSchema.query),
  downloadCtrl.downloadCertificate
);

/**
 * GET /api/certificates/:certificateId/download/pdf
 * Download certificate as PDF
 */
router.get(
  '/pdf',
  validateParams(downloadOptionsSchema.params),
  validateQuery(downloadFormatSchema.pdf),
  downloadCtrl.downloadCertificatePDF
);

/**
 * GET /api/certificates/:certificateId/download/image
 * Download certificate as image (PNG/JPG)
 */
router.get(
  '/image',
  validateParams(downloadOptionsSchema.params),
  validateQuery(downloadFormatSchema.image),
  downloadCtrl.downloadCertificateImage
);

/**
 * GET /api/certificates/:certificateId/download/json
 * Download certificate metadata as JSON
 */
router.get(
  '/json',
  validateParams(downloadOptionsSchema.params),
  validateQuery(downloadFormatSchema.json),
  downloadCtrl.downloadCertificateJSON
);

/**
 * GET /api/certificates/:certificateId/download/xml
 * Download certificate data as XML
 */
router.get(
  '/xml',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(downloadOptionsSchema.params),
  validateQuery(downloadFormatSchema.xml),
  downloadCtrl.downloadCertificateXML
);

/**
 * GET /api/certificates/:certificateId/download/blockchain-proof
 * Download blockchain verification proof
 */
router.get(
  '/blockchain-proof',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(downloadOptionsSchema.params),
  validateQuery(downloadFormatSchema.blockchainProof),
  downloadCtrl.downloadBlockchainProof
);

/**
 * POST /api/certificates/:certificateId/download/custom
 * Generate custom download with specific options
 */
router.post(
  '/custom',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(downloadOptionsSchema.params),
  validateBody(downloadOptionsSchema.custom),
  downloadCtrl.generateCustomDownload
);

/**
 * GET /api/certificates/:certificateId/download/preview
 * Preview certificate before download
 */
router.get(
  '/preview',
  validateParams(downloadOptionsSchema.params),
  validateQuery(downloadOptionsSchema.preview),
  downloadCtrl.previewCertificate
);

/**
 * POST /api/certificates/:certificateId/download/watermarked
 * Download certificate with custom watermark
 */
router.post(
  '/watermarked',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(downloadOptionsSchema.params),
  validateBody(watermarkOptionsSchema),
  downloadCtrl.downloadWatermarkedCertificate
);

/**
 * GET /api/certificates/:certificateId/download/thumbnail
 * Download certificate thumbnail
 */
router.get(
  '/thumbnail',
  validateParams(downloadOptionsSchema.params),
  validateQuery(downloadFormatSchema.thumbnail),
  downloadCtrl.downloadCertificateThumbnail
);

/**
 * GET /api/certificates/:certificateId/download/qr-code
 * Download QR code for certificate verification
 */
router.get(
  '/qr-code',
  validateParams(downloadOptionsSchema.params),
  validateQuery(downloadFormatSchema.qrCode),
  downloadCtrl.downloadQRCode
);

/**
 * POST /api/certificates/:certificateId/download/branded
 * Download certificate with custom branding
 */
router.post(
  '/branded',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateParams(downloadOptionsSchema.params),
  validateBody(downloadOptionsSchema.branded),
  downloadCtrl.downloadBrandedCertificate
);

/**
 * GET /api/certificates/:certificateId/download/formats
 * Get available download formats for certificate
 */
router.get(
  '/formats',
  validateParams(downloadOptionsSchema.params),
  downloadCtrl.getAvailableFormats
);

/**
 * POST /api/certificates/:certificateId/download/email
 * Email certificate to recipient
 */
router.post(
  '/email',
  strictRateLimiter(),
  validateParams(downloadOptionsSchema.params),
  validateBody(downloadOptionsSchema.email),
  downloadCtrl.emailCertificate
);

/**
 * GET /api/certificates/:certificateId/download/history
 * Get download history and analytics
 */
router.get(
  '/history',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateParams(downloadOptionsSchema.params),
  validateQuery(downloadTrackingSchema.history),
  downloadCtrl.getDownloadHistory
);

/**
 * POST /api/certificates/:certificateId/download/bulk-prepare
 * Prepare bulk download package
 */
router.post(
  '/bulk-prepare',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(downloadOptionsSchema.params),
  validateBody(bulkDownloadSchema.prepare),
  downloadCtrl.prepareBulkDownload
);

/**
 * GET /api/certificates/:certificateId/download/bulk-status/:jobId
 * Check bulk download preparation status
 */
router.get(
  '/bulk-status/:jobId',
  validateParams(bulkDownloadSchema.statusParams),
  downloadCtrl.getBulkDownloadStatus
);

/**
 * GET /api/certificates/:certificateId/download/archive
 * Download certificate with all related files as archive
 */
router.get(
  '/archive',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(downloadOptionsSchema.params),
  validateQuery(downloadFormatSchema.archive),
  downloadCtrl.downloadCertificateArchive
);

/**
 * POST /api/certificates/:certificateId/download/schedule
 * Schedule certificate download for later
 */
router.post(
  '/schedule',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(downloadOptionsSchema.params),
  validateBody(downloadOptionsSchema.schedule),
  downloadCtrl.scheduleDownload
);

/**
 * GET /api/certificates/:certificateId/download/analytics
 * Get download analytics and metrics
 */
router.get(
  '/analytics',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(downloadOptionsSchema.params),
  validateQuery(downloadTrackingSchema.analytics),
  downloadCtrl.getDownloadAnalytics
);

/**
 * POST /api/certificates/:certificateId/download/track-view
 * Track certificate view for analytics
 */
router.post(
  '/track-view',
  validateParams(downloadOptionsSchema.params),
  validateBody(downloadTrackingSchema.view),
  downloadCtrl.trackCertificateView
);

export default router;