// src/routes/manufacturerAccount.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { authenticateManufacturer, requireVerifiedManufacturer } from '../middleware/manufacturerAuth.middleware';
import { dynamicRateLimiter } from '../middleware/rateLimiter.middleware';
import * as ctrl from '../controllers/manufacturerAccount.controller';
import {
  updateManufacturerAccountSchema,
  quickUpdateManufacturerSchema,
  manufacturerVerificationSchema,
  capabilityAssessmentSchema,
  listManufacturerQuerySchema
} from '../validation/manufacturerAccount.validation';

const router = Router();

// Apply dynamic rate limiting to all manufacturer account routes
router.use(dynamicRateLimiter());

// Apply manufacturer authentication to all routes
router.use(authenticateManufacturer);

// ===== PROFILE MANAGEMENT =====

// Get manufacturer profile
router.get(
  '/profile',
  ctrl.getManufacturerProfile
);

// Update complete manufacturer profile
router.put(
  '/profile',
  validateBody(updateManufacturerAccountSchema),
  ctrl.updateManufacturerProfile
);

// Quick profile updates (basic info only)
router.put(
  '/profile/quick',
  validateBody(quickUpdateManufacturerSchema),
  ctrl.quickUpdateProfile
);

// ===== VERIFICATION & COMPLIANCE =====

// Submit verification documents
router.post(
  '/verification',
  validateBody(manufacturerVerificationSchema),
  ctrl.submitVerification
);

// Get verification status
router.get(
  '/verification/status',
  ctrl.getVerificationStatus
);

// Update verification documents
router.put(
  '/verification',
  validateBody(manufacturerVerificationSchema),
  ctrl.updateVerification
);

// ===== CAPABILITIES & SERVICES =====

// Submit capability assessment
router.post(
  '/capabilities',
  validateBody(capabilityAssessmentSchema),
  ctrl.submitCapabilityAssessment
);

// Get capability assessment
router.get(
  '/capabilities',
  ctrl.getCapabilityAssessment
);

// Update capabilities
router.put(
  '/capabilities',
  validateBody(capabilityAssessmentSchema),
  ctrl.updateCapabilities
);

// ===== ACCOUNT SETTINGS =====

// Get account settings
router.get(
  '/settings',
  ctrl.getAccountSettings
);

// Update account settings
router.put(
  '/settings',
  validateBody(updateManufacturerAccountSchema.extract([
    'notifications', 'privacy', 'communication'
  ])),
  ctrl.updateAccountSettings
);

// ===== ANALYTICS & INSIGHTS =====

// Get manufacturer analytics (verified manufacturers only)
router.get(
  '/analytics',
  requireVerifiedManufacturer,
  validateQuery(listManufacturerQuerySchema),
  ctrl.getManufacturerAnalytics
);

// Get performance metrics
router.get(
  '/metrics',
  validateQuery(listManufacturerQuerySchema),
  ctrl.getPerformanceMetrics
);

// ===== SUBSCRIPTION & BILLING =====

// Get subscription information
router.get(
  '/subscription',
  ctrl.getSubscriptionInfo
);

// Update billing information
router.put(
  '/billing',
  validateBody(updateManufacturerAccountSchema.extract([
    'billingAddress', 'paymentMethod'
  ])),
  ctrl.updateBillingInfo
);

export default router;
