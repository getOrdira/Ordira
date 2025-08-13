// src/routes/users/profile/route.ts
import { Router } from 'express';
import { validateBody, validateQuery } from '../../../middleware/validation.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../../middleware/rateLimiter.middleware';
import { uploadMiddleware, cleanupOnError } from '../../../middleware/upload.middleware';
import { trackUserAction } from '../../../middleware/metrics.middleware';
import * as userProfileCtrl from '../../../controllers/users/profile.controller';
import {
  updateUserProfileSchema,
  userValidationSchemas
} from '../../../validation/user.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate); // Users must be authenticated to access profile
router.use(cleanupOnError);

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get(
  '/',
  trackUserAction('view_profile'),
  userProfileCtrl.getUserProfile
);

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put(
  '/',
  strictRateLimiter(),
  validateBody(updateUserProfileSchema),
  trackUserAction('update_profile'),
  userProfileCtrl.updateUserProfile
);

/**
 * PATCH /api/users/profile/basic
 * Update basic profile information
 */
router.patch(
  '/basic',
  validateBody(userValidationSchemas.updateBasicProfile),
  trackUserAction('update_basic_profile'),
  userProfileCtrl.updateBasicProfile
);

/**
 * POST /api/users/profile/avatar
 * Upload profile avatar
 */
router.post(
  '/avatar',
  strictRateLimiter(),
  uploadMiddleware.single('avatar'),
  trackUserAction('upload_avatar'),
  userProfileCtrl.uploadAvatar
);

/**
 * DELETE /api/users/profile/avatar
 * Remove profile avatar
 */
router.delete(
  '/avatar',
  trackUserAction('remove_avatar'),
  userProfileCtrl.removeAvatar
);

/**
 * GET /api/users/profile/voting-history
 * Get user's voting history
 */
router.get(
  '/voting-history',
  validateQuery(userValidationSchemas.votingHistoryQuery),
  trackUserAction('view_voting_history'),
  userProfileCtrl.getVotingHistory
);

/**
 * GET /api/users/profile/activity
 * Get user activity log
 */
router.get(
  '/activity',
  validateQuery(userValidationSchemas.activityQuery),
  trackUserAction('view_activity'),
  userProfileCtrl.getUserActivity
);

/**
 * GET /api/users/profile/stats
 * Get user statistics (votes count, participation rate, etc.)
 */
router.get(
  '/stats',
  trackUserAction('view_profile_stats'),
  userProfileCtrl.getUserStats
);

/**
 * POST /api/users/profile/verify-email
 * Request email verification
 */
router.post(
  '/verify-email',
  strictRateLimiter(),
  validateBody(userValidationSchemas.verifyEmail),
  trackUserAction('request_email_verification'),
  userProfileCtrl.requestEmailVerification
);

/**
 * POST /api/users/profile/verify-email/confirm
 * Confirm email verification with code
 */
router.post(
  '/verify-email/confirm',
  strictRateLimiter(),
  validateBody(userValidationSchemas.confirmEmailVerification),
  trackUserAction('confirm_email_verification'),
  userProfileCtrl.confirmEmailVerification
);

/**
 * POST /api/users/profile/change-email
 * Change email address
 */
router.post(
  '/change-email',
  strictRateLimiter(),
  validateBody(userValidationSchemas.changeEmail),
  trackUserAction('change_email'),
  userProfileCtrl.changeEmail
);

/**
 * POST /api/users/profile/deactivate
 * Deactivate user account
 */
router.post(
  '/deactivate',
  strictRateLimiter(),
  validateBody(userValidationSchemas.deactivateAccount),
  trackUserAction('deactivate_account'),
  userProfileCtrl.deactivateAccount
);

/**
 * POST /api/users/profile/reactivate
 * Reactivate user account
 */
router.post(
  '/reactivate',
  strictRateLimiter(),
  validateBody(userValidationSchemas.reactivateAccount),
  trackUserAction('reactivate_account'),
  userProfileCtrl.reactivateAccount
);

/**
 * GET /api/users/profile/export
 * Export user data (GDPR compliance)
 */
router.get(
  '/export',
  strictRateLimiter(),
  trackUserAction('export_data'),
  userProfileCtrl.exportUserData
);

/**
 * DELETE /api/users/profile
 * Delete user account permanently
 */
router.delete(
  '/',
  strictRateLimiter(),
  validateBody(userValidationSchemas.deleteAccount),
  trackUserAction('delete_account'),
  userProfileCtrl.deleteUserAccount
);

export default router;