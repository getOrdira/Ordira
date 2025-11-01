// src/routes/manufacturerAccount.routes.ts
import { Router, RequestHandler } from 'express';
import Joi from 'joi';
import { validateBody, validateQuery } from '../../middleware/deprecated/validation.middleware';
import { authenticate, requireManufacturer } from '../../middleware/deprecated/unifiedAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/deprecated/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/deprecated/metrics.middleware';
import { uploadMiddleware } from '../../middleware/deprecated/upload.middleware';
import * as ctrl from '../../controllers/deprecated/manufacturerAccount.controller';
import {
  updateManufacturerAccountSchema,
  quickUpdateManufacturerSchema,
  manufacturerVerificationSchema
} from '../../validation/manufacturerAccount.validation';
import { asRouteHandler, asRateLimitHandler } from '../../utils/routeHelpers';	

const router = Router();
const safeUploadMiddleware = {
  singleImage: uploadMiddleware.singleImage as RequestHandler[],
  multipleImages: uploadMiddleware.multipleImages as RequestHandler[]
};

// Apply dynamic rate limiting to all manufacturer account routes
router.use(asRateLimitHandler(dynamicRateLimiter()));

// Apply manufacturer authentication to all routes
router.use(authenticate, requireManufacturer);

// ===== PROFILE MANAGEMENT =====

// Get manufacturer profile/account details
router.get(
  '/',
  trackManufacturerAction('view_account'),
  ctrl.getManufacturerProfile
);

// Update complete manufacturer profile/account
router.put(
  '/',
  validateBody(updateManufacturerAccountSchema),
  trackManufacturerAction('update_account'),
  asRouteHandler(ctrl.updateManufacturerProfile)
);

// Delete manufacturer account (soft delete)
router.delete(
  '/',
  asRateLimitHandler(strictRateLimiter()), // Strict rate limiting for account deletion
  trackManufacturerAction('delete_account'),
  ctrl.deleteManufacturerAccount
);

// ===== PROFILE PICTURE MANAGEMENT =====

// Upload manufacturer profile picture
router.post(
  '/profile-picture',
  ...safeUploadMiddleware.singleImage, // Use the predefined singleImage middleware
  trackManufacturerAction('upload_profile_picture'),
  ctrl.uploadProfilePicture
);

// ===== VERIFICATION & COMPLIANCE =====

// Get verification status and requirements
router.get(
  '/verification',
  trackManufacturerAction('check_verification_status'),
  ctrl.getVerificationStatus
);

// Submit verification documents
router.post(
  '/verification/submit',
  asRateLimitHandler(strictRateLimiter()), // Prevent verification spam
  ...safeUploadMiddleware.multipleImages, // Use predefined multipleImages middleware
  trackManufacturerAction('submit_verification'),
  ctrl.submitVerificationDocuments
);

// ===== ACCOUNT ACTIVITY & LOGS =====

// Get account activity log
router.get(
  '/activity',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    type: Joi.string().valid(
      'login', 'profile_update', 'verification_submitted', 
      'document_uploaded', 'password_changed', 'notification_sent',
      'account_activated', 'account_deactivated'
    ).optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().greater(Joi.ref('startDate')).optional()
  })),
  trackManufacturerAction('view_activity_log'),
  asRouteHandler(ctrl.getAccountActivity)
);

// ===== NOTIFICATION PREFERENCES =====

// Update notification preferences
router.put(
  '/notifications',
  validateBody(Joi.object({
    emailNotifications: Joi.object({
      invitations: Joi.boolean().optional(),
      orderUpdates: Joi.boolean().optional(),
      systemUpdates: Joi.boolean().optional(),
      marketing: Joi.boolean().optional()
    }).optional(),
    pushNotifications: Joi.object({
      invitations: Joi.boolean().optional(),
      orderUpdates: Joi.boolean().optional(),
      systemUpdates: Joi.boolean().optional()
    }).optional(),
    smsNotifications: Joi.object({
      criticalUpdates: Joi.boolean().optional(),
      orderAlerts: Joi.boolean().optional()
    }).optional()
  })),
  trackManufacturerAction('update_notification_preferences'),
  asRouteHandler(ctrl.updateNotificationPreferences)
);

// ===== DATA EXPORT (GDPR COMPLIANCE) =====

// Export account data
router.get(
  '/export',
  asRateLimitHandler(strictRateLimiter()), // Limit data export requests
  trackManufacturerAction('request_data_export'),
  asRouteHandler(ctrl.exportAccountData)  
);

export default router;
