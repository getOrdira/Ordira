
// src/routes/brandAccount.routes.ts
import { Router, RequestHandler } from 'express';
import { validateBody, validateQuery } from '../../middleware/deprecated/validation.middleware';
import { authenticate } from '../../middleware/deprecated/unifiedAuth.middleware';
import { resolveTenant, requireTenantSetup } from '../../middleware/deprecated/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/deprecated/rateLimiter.middleware';
import { uploadMiddleware } from '../../middleware/deprecated/upload.middleware';
import { trackManufacturerAction } from '../../middleware/deprecated/metrics.middleware';
import * as ctrl from '../../controllers/deprecated/brandAccount.controller';
import { 
  updateBrandAccountSchema,
  submitVerificationSchema,
  deactivateAccountSchema,
  exportAccountDataSchema,
  analyticsQuerySchema
} from '../../validation/brandAccount.validation';
import { asRouteHandler, asRateLimitHandler } from '../../utils/routeHelpers';

const router = Router();
const safeUploadMiddleware = {
  singleImage: uploadMiddleware.singleImage as RequestHandler[]
};

// Apply dynamic rate limiting to all brand account routes
router.use(asRateLimitHandler(dynamicRateLimiter()));

// Apply authentication to all routes
router.use(authenticate);

// Apply tenant resolution (needed for plan-based features)
router.use(resolveTenant);
router.use(requireTenantSetup);

// ===== PROFILE MANAGEMENT =====

/**
 * GET /api/brand/account/profile
 * Get comprehensive brand profile with metadata
 */
router.get(
  '/profile',
  asRouteHandler(ctrl.getBrandProfile)
);

/**
 * PUT /api/brand/account/profile
 * Update brand profile with validation and plan restrictions
 */
router.put(
  '/profile',
  validateBody(updateBrandAccountSchema),
  asRouteHandler(ctrl.updateBrandProfile)
);

/**
 * POST /api/brand/account/profile-picture
 * Upload brand profile picture
 */
router.post(
  '/profile-picture',
  ...safeUploadMiddleware.singleImage,
  trackManufacturerAction('upload_brand_profile_picture'),
  asRouteHandler(ctrl.uploadProfilePicture)
);

// ===== VERIFICATION MANAGEMENT =====

/**
 * POST /api/brand/account/verification
 * Submit brand verification documents
 */
router.post(
  '/verification',
  asRateLimitHandler(strictRateLimiter()), // Prevent verification spam
  validateBody(submitVerificationSchema),
  asRouteHandler(ctrl.submitVerification)
);

/**
 * GET /api/brand/account/verification/status
 * Get current verification status with detailed information
 */
router.get(
  '/verification/status',
  asRouteHandler(ctrl.getVerificationStatus)
);

// ===== ACCOUNT MANAGEMENT =====

/**
 * POST /api/brand/account/deactivate
 * Deactivate brand account with feedback collection
 */
router.post(
  '/deactivate',
  asRateLimitHandler(strictRateLimiter()), // Prevent accidental deactivation spam
  validateBody(deactivateAccountSchema),
  asRouteHandler(ctrl.deactivateAccount)
);

// ===== ANALYTICS & INSIGHTS =====

/**
 * GET /api/brand/account/analytics
 * Get brand account analytics and insights (Growth+ plans)
 */
router.get(
  '/analytics',
  validateQuery(analyticsQuerySchema),
  asRouteHandler(ctrl.getAccountAnalytics)
);

// ===== DATA EXPORT =====

/**
 * POST /api/brand/account/export
 * Export brand account data in various formats
 */
router.post(
  '/export',
  asRateLimitHandler(strictRateLimiter()), // Prevent export abuse
  validateBody(exportAccountDataSchema),
  asRouteHandler(ctrl.exportAccountData)
);

export default router;
