// src/routes/certificates/certificate-id/verify.routes.ts
import { Router } from 'express';
import { validateQuery, validateParams, validateBody } from '../../../middleware/validation.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../../middleware/metrics.middleware';
import * as verifyCtrl from '../../../controllers/certificates/verify.controller';
import {
  verificationOptionsSchema,
  blockchainVerificationSchema,
  bulkVerificationSchema,
  verificationReportSchema,
  publicVerificationSchema
} from '../../../validation/certificates/verify.validation';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());

// Some verification endpoints don't require authentication (public verification)
// Authentication will be applied selectively

/**
 * GET /api/certificates/:certificateId/verify
 * Public certificate verification (no auth required)
 */
router.get(
  '/',
  validateParams(publicVerificationSchema.params),
  validateQuery(publicVerificationSchema.query),
  verifyCtrl.verifyPublicCertificate
);

/**
 * POST /api/certificates/:certificateId/verify/quick
 * Quick verification check (no auth required)
 */
router.post(
  '/quick',
  strictRateLimiter(),
  validateParams(publicVerificationSchema.params),
  validateBody(publicVerificationSchema.quick),
  verifyCtrl.quickVerification
);

/**
 * GET /api/certificates/:certificateId/verify/details
 * Detailed verification with full information
 */
router.get(
  '/details',
  authenticate,
  resolveTenant,
  validateParams(verificationOptionsSchema.params),
  validateQuery(verificationOptionsSchema.details),
  verifyCtrl.getDetailedVerification
);

/**
 * GET /api/certificates/:certificateId/verify/blockchain
 * Blockchain-specific verification
 */
router.get(
  '/blockchain',
  validateParams(blockchainVerificationSchema.params),
  validateQuery(blockchainVerificationSchema.query),
  verifyCtrl.verifyBlockchainIntegrity
);

/**
 * POST /api/certificates/:certificateId/verify/cryptographic
 * Cryptographic signature verification
 */
router.post(
  '/cryptographic',
  strictRateLimiter(),
  validateParams(blockchainVerificationSchema.params),
  validateBody(blockchainVerificationSchema.cryptographic),
  verifyCtrl.verifyCryptographicSignature
);

/**
 * GET /api/certificates/:certificateId/verify/metadata
 * Verify certificate metadata integrity
 */
router.get(
  '/metadata',
  validateParams(verificationOptionsSchema.params),
  validateQuery(verificationOptionsSchema.metadata),
  verifyCtrl.verifyMetadataIntegrity
);

/**
 * GET /api/certificates/:certificateId/verify/authenticity
 * Comprehensive authenticity verification
 */
router.get(
  '/authenticity',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(verificationOptionsSchema.params),
  validateQuery(verificationOptionsSchema.authenticity),
  verifyCtrl.verifyAuthenticity
);

/**
 * POST /api/certificates/:certificateId/verify/batch-check
 * Batch verification against multiple sources
 */
router.post(
  '/batch-check',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(verificationOptionsSchema.params),
  validateBody(bulkVerificationSchema.batchCheck),
  verifyCtrl.performBatchVerification
);

/**
 * GET /api/certificates/:certificateId/verify/compliance
 * Regulatory compliance verification
 */
router.get(
  '/compliance',
  authenticate,
  resolveTenant,
  requireTenantPlan(['enterprise']),
  validateParams(verificationOptionsSchema.params),
  validateQuery(verificationOptionsSchema.compliance),
  verifyCtrl.verifyCompliance
);

/**
 * POST /api/certificates/:certificateId/verify/third-party
 * Third-party verification service integration
 */
router.post(
  '/third-party',
  authenticate,
  resolveTenant,
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateParams(verificationOptionsSchema.params),
  validateBody(verificationOptionsSchema.thirdParty),
  verifyCtrl.performThirdPartyVerification
);

/**
 * GET /api/certificates/:certificateId/verify/qr-scan
 * Verify certificate via QR code scan
 */
router.get(
  '/qr-scan',
  validateParams(publicVerificationSchema.params),
  validateQuery(publicVerificationSchema.qrScan),
  verifyCtrl.verifyViaQRCode
);

/**
 * POST /api/certificates/:certificateId/verify/challenge
 * Generate verification challenge for advanced security
 */
router.post(
  '/challenge',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(verificationOptionsSchema.params),
  validateBody(verificationOptionsSchema.challenge),
  verifyCtrl.generateVerificationChallenge
);

/**
 * POST /api/certificates/:certificateId/verify/challenge-response
 * Respond to verification challenge
 */
router.post(
  '/challenge-response',
  strictRateLimiter(),
  validateParams(verificationOptionsSchema.params),
  validateBody(verificationOptionsSchema.challengeResponse),
  verifyCtrl.verifyChallengeResponse
);

/**
 * GET /api/certificates/:certificateId/verify/history
 * Get verification history and attempts
 */
router.get(
  '/history',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateParams(verificationOptionsSchema.params),
  validateQuery(verificationOptionsSchema.history),
  verifyCtrl.getVerificationHistory
);

/**
 * POST /api/certificates/:certificateId/verify/report
 * Generate comprehensive verification report
 */
router.post(
  '/report',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(verificationOptionsSchema.params),
  validateBody(verificationReportSchema),
  verifyCtrl.generateVerificationReport
);

/**
 * GET /api/certificates/:certificateId/verify/trust-score
 * Calculate certificate trust score
 */
router.get(
  '/trust-score',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(verificationOptionsSchema.params),
  validateQuery(verificationOptionsSchema.trustScore),
  verifyCtrl.calculateTrustScore
);

/**
 * POST /api/certificates/:certificateId/verify/mark-suspicious
 * Mark certificate as suspicious or fraudulent
 */
router.post(
  '/mark-suspicious',
  authenticate,
  resolveTenant,
  strictRateLimiter(),
  validateParams(verificationOptionsSchema.params),
  validateBody(verificationOptionsSchema.markSuspicious),
  verifyCtrl.markAsSuspicious
);

/**
 * GET /api/certificates/:certificateId/verify/external-validators
 * Get available external validation services
 */
router.get(
  '/external-validators',
  authenticate,
  resolveTenant,
  requireTenantPlan(['enterprise']),
  validateParams(verificationOptionsSchema.params),
  verifyCtrl.getExternalValidators
);

/**
 * POST /api/certificates/:certificateId/verify/bulk-external
 * Verify against multiple external services
 */
router.post(
  '/bulk-external',
  authenticate,
  resolveTenant,
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateParams(verificationOptionsSchema.params),
  validateBody(bulkVerificationSchema.external),
  verifyCtrl.verifyAgainstExternalServices
);

/**
 * GET /api/certificates/:certificateId/verify/analytics
 * Get verification analytics and patterns
 */
router.get(
  '/analytics',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(verificationOptionsSchema.params),
  validateQuery(verificationOptionsSchema.analytics),
  verifyCtrl.getVerificationAnalytics
);

/**
 * POST /api/certificates/:certificateId/verify/api-key
 * Verify certificate using API key (for external integrations)
 */
router.post(
  '/api-key',
  strictRateLimiter(),
  validateParams(verificationOptionsSchema.params),
  validateBody(verificationOptionsSchema.apiKey),
  verifyCtrl.verifyWithApiKey
);

/**
 * GET /api/certificates/:certificateId/verify/public-embed
 * Get embeddable verification widget
 */
router.get(
  '/public-embed',
  validateParams(publicVerificationSchema.params),
  validateQuery(publicVerificationSchema.embed),
  verifyCtrl.getEmbeddableVerificationWidget
);

export default router;