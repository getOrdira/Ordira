// src/routes/certificates/certificate-id.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as certificateCtrl from '../../controllers/certificates/certificate.controller';
import {
  certificateParamsSchema,
  certificateUpdateSchema,
  certificateTransferSchema,
  certificateRevocationSchema,
  certificateMetadataSchema
} from '../../validation/certificates/certificate.validation';

// Import sub-route files for nested functionality
import blockchainStatusRoutes from './certificate-id/blockchain-status.routes';
import downloadRoutes from './certificate-id/download.routes';
import verifyRoutes from './certificate-id/verify.routes';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);

// Mount sub-routes for certificate-id specific functionality
router.use('/:certificateId/blockchain-status', blockchainStatusRoutes);
router.use('/:certificateId/download', downloadRoutes);
router.use('/:certificateId/verify', verifyRoutes);

/**
 * GET /api/certificates/:certificateId
 * Get specific certificate details
 */
router.get(
  '/:certificateId',
  validateParams(certificateParamsSchema),
  certificateCtrl.getCertificateDetails
);

/**
 * PUT /api/certificates/:certificateId
 * Update certificate metadata and properties
 */
router.put(
  '/:certificateId',
  validateParams(certificateParamsSchema),
  validateBody(certificateUpdateSchema),
  certificateCtrl.updateCertificate
);

/**
 * DELETE /api/certificates/:certificateId
 * Revoke certificate (soft delete)
 */
router.delete(
  '/:certificateId',
  strictRateLimiter(),
  validateParams(certificateParamsSchema),
  validateBody(certificateRevocationSchema),
  certificateCtrl.revokeCertificate
);

/**
 * GET /api/certificates/:certificateId/related
 * Get related certificates (same product, recipient, etc.)
 */
router.get(
  '/:certificateId/related',
  validateParams(certificateParamsSchema),
  validateQuery(certificateParamsSchema.relatedQuery),
  certificateCtrl.getRelatedCertificates
);

/**
 * POST /api/certificates/:certificateId/duplicate
 * Create duplicate certificate with different recipient
 */
router.post(
  '/:certificateId/duplicate',
  validateParams(certificateParamsSchema),
  validateBody(certificateParamsSchema.duplicate),
  certificateCtrl.duplicateCertificate
);

/**
 * GET /api/certificates/:certificateId/audit-trail
 * Get certificate audit trail and change log
 */
router.get(
  '/:certificateId/audit-trail',
  requireTenantPlan(['enterprise']),
  validateParams(certificateParamsSchema),
  certificateCtrl.getCertificateAuditTrail
);

/**
 * POST /api/certificates/:certificateId/add-note
 * Add internal note to certificate
 */
router.post(
  '/:certificateId/add-note',
  validateParams(certificateParamsSchema),
  validateBody(certificateParamsSchema.addNote),
  certificateCtrl.addCertificateNote
);

/**
 * GET /api/certificates/:certificateId/compliance-status
 * Get certificate compliance and regulatory status
 */
router.get(
  '/:certificateId/compliance-status',
  requireTenantPlan(['enterprise']),
  validateParams(certificateParamsSchema),
  certificateCtrl.getComplianceStatus
);

router.get(
  '/:certificateId/metadata',
  validateParams(certificateParamsSchema),
  certificateCtrl.getCertificateMetadata
);

/**
 * PUT /api/certificates/:certificateId/metadata
 * Update certificate metadata
 */
router.put(
  '/:certificateId/metadata',
  validateParams(certificateParamsSchema),
  validateBody(certificateMetadataSchema),
  certificateCtrl.updateCertificateMetadata
);

/**
 * POST /api/certificates/:certificateId/transfer
 * Transfer certificate to new recipient
 */
router.post(
  '/:certificateId/transfer',
  requireTenantPlan(['premium', 'enterprise']), // Transfer requires premium+
  strictRateLimiter(),
  validateParams(certificateParamsSchema),
  validateBody(certificateTransferSchema),
  certificateCtrl.transferCertificate
);

/**
 * GET /api/certificates/:certificateId/transfer-status
 * Get certificate transfer status
 */
router.get(
  '/:certificateId/transfer-status',
  validateParams(certificateParamsSchema),
  certificateCtrl.getTransferStatus
);

/**
 * POST /api/certificates/:certificateId/retry-transfer
 * Retry failed certificate transfer
 */
router.post(
  '/:certificateId/retry-transfer',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(certificateParamsSchema),
  certificateCtrl.retryTransfer
);

/**
 * GET /api/certificates/:certificateId/ownership
 * Get certificate ownership information
 */
router.get(
  '/:certificateId/ownership',
  validateParams(certificateParamsSchema),
  certificateCtrl.getCertificateOwnership
);

/**
 * GET /api/certificates/:certificateId/history
 * Get certificate transaction history
 */
router.get(
  '/:certificateId/history',
  validateParams(certificateParamsSchema),
  validateQuery(certificateParamsSchema.historyQuery),
  certificateCtrl.getCertificateHistory
);

/**
 * GET /api/certificates/:certificateId/analytics
 * Get certificate-specific analytics
 */
router.get(
  '/:certificateId/analytics',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateParams(certificateParamsSchema),
  validateQuery(certificateParamsSchema.analyticsQuery),
  certificateCtrl.getCertificateAnalytics
);

/**
 * POST /api/certificates/:certificateId/resend-notification
 * Resend certificate notification to recipient
 */
router.post(
  '/:certificateId/resend-notification',
  strictRateLimiter(),
  validateParams(certificateParamsSchema),
  validateBody(certificateParamsSchema.resendNotification),
  certificateCtrl.resendNotification
);

/**
 * GET /api/certificates/:certificateId/qr-code
 * Generate QR code for certificate verification
 */
router.get(
  '/:certificateId/qr-code',
  validateParams(certificateParamsSchema),
  validateQuery(certificateParamsSchema.qrCodeQuery),
  certificateCtrl.generateQRCode
);

/**
 * POST /api/certificates/:certificateId/mark-viewed
 * Mark certificate as viewed (analytics)
 */
router.post(
  '/:certificateId/mark-viewed',
  validateParams(certificateParamsSchema),
  certificateCtrl.markCertificateViewed
);

/**
 * GET /api/certificates/:certificateId/share-link
 * Generate shareable link for certificate
 */
router.get(
  '/:certificateId/share-link',
  validateParams(certificateParamsSchema),
  validateQuery(certificateParamsSchema.shareLinkQuery),
  certificateCtrl.generateShareLink
);

/**
 * POST /api/certificates/:certificateId/regenerate
 * Regenerate certificate with updated data
 */
router.post(
  '/:certificateId/regenerate',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(certificateParamsSchema),
  validateBody(certificateUpdateSchema.regenerate),
  certificateCtrl.regenerateCertificate
);

/**
 * GET /api/certificates/:certificateId/