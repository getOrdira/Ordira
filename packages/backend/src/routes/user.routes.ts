// src/routes/user.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import * as userCtrl from '../controllers/user.controller';
import {
  registerUserSchema,
  verifyUserSchema,
  loginUserSchema,
  updateUserProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  userParamsSchema,
  listUsersQuerySchema
} from '../validation/user.validation';

const router = Router();

// Apply dynamic rate limiting to all user routes
router.use(dynamicRateLimiter());

// ===== PUBLIC AUTHENTICATION ROUTES =====

// User registration (strict rate limiting to prevent spam)
router.post(
  '/register',
  strictRateLimiter(), // Prevent registration abuse
  validateBody(registerUserSchema),
  userCtrl.registerUser
);

// User login (strict rate limiting to prevent brute force)
router.post(
  '/login',
  strictRateLimiter(), // Prevent brute force attacks
  validateBody(loginUserSchema),
  userCtrl.loginUser
);

// Verify user email (strict rate limiting)
router.post(
  '/verify',
  strictRateLimiter(), // Prevent verification spam
  validateBody(verifyUserSchema),
  userCtrl.verifyUser
);

// Forgot password (strict rate limiting)
router.post(
  '/forgot-password',
  strictRateLimiter(), // Prevent password reset abuse
  validateBody(forgotPasswordSchema),
  userCtrl.forgotPassword
);

// Reset password (strict rate limiting)
router.post(
  '/reset-password',
  strictRateLimiter(), // Prevent reset abuse
  validateBody(resetPasswordSchema),
  userCtrl.resetPassword
);

// Resend verification email (strict rate limiting)
router.post(
  '/resend-verification',
  strictRateLimiter(), // Prevent email spam
  validateBody(registerUserSchema.extract(['email'])),
  userCtrl.resendVerification
);

// ===== PROTECTED USER ROUTES =====

// All routes below require valid user authentication
router.use(authenticate);

// ===== USER PROFILE MANAGEMENT =====

// Get current user profile
router.get(
  '/profile',
  userCtrl.getUserProfile
);

// Update user profile
router.put(
  '/profile',
  validateBody(updateUserProfileSchema),
  userCtrl.updateUserProfile
);

// Upload profile picture
router.post(
  '/profile/picture',
  userCtrl.uploadProfilePicture
);

// Delete profile picture
router.delete(
  '/profile/picture',
  userCtrl.deleteProfilePicture
);

// ===== PASSWORD & SECURITY =====

// Change password (authenticated user)
router.put(
  '/password',
  strictRateLimiter(), // Security for password changes
  validateBody(changePasswordSchema),
  userCtrl.changePassword
);

// Enable two-factor authentication
router.post(
  '/2fa/enable',
  strictRateLimiter(), // Security for 2FA setup
  userCtrl.enableTwoFactor
);

// Disable two-factor authentication
router.post(
  '/2fa/disable',
  strictRateLimiter(), // Security for 2FA changes
  validateBody(verifyUserSchema.extract(['verificationCode'])),
  userCtrl.disableTwoFactor
);

// Verify two-factor authentication code
router.post(
  '/2fa/verify',
  strictRateLimiter(), // Security for 2FA verification
  validateBody(verifyUserSchema.extract(['verificationCode'])),
  userCtrl.verifyTwoFactor
);

// ===== ACCOUNT MANAGEMENT =====

// Get account settings
router.get(
  '/settings',
  userCtrl.getAccountSettings
);

// Update account settings
router.put(
  '/settings',
  validateBody(updateUserProfileSchema.extract([
    'notifications', 'privacy', 'language', 'timezone'
  ])),
  userCtrl.updateAccountSettings
);

// Get account activity log
router.get(
  '/activity',
  validateQuery(listUsersQuerySchema),
  userCtrl.getAccountActivity
);

// Get login sessions
router.get(
  '/sessions',
  validateQuery(listUsersQuerySchema),
  userCtrl.getActiveSessions
);

// Revoke session
router.delete(
  '/sessions/:sessionId',
  strictRateLimiter(), // Security for session management
  validateParams(userParamsSchema.extract(['sessionId'])),
  userCtrl.revokeSession
);

// Revoke all sessions (logout everywhere)
router.delete(
  '/sessions',
  strictRateLimiter(), // Security for bulk session revocation
  userCtrl.revokeAllSessions
);

// ===== ACCOUNT DELETION & DEACTIVATION =====

// Deactivate account (reversible)
router.post(
  '/deactivate',
  strictRateLimiter(), // Security for account changes
  validateBody(changePasswordSchema.extract(['currentPassword'])),
  userCtrl.deactivateAccount
);

// Reactivate account
router.post(
  '/reactivate',
  strictRateLimiter(), // Security for account changes
  validateBody(loginUserSchema),
  userCtrl.reactivateAccount
);

// Request account deletion (starts deletion process)
router.post(
  '/delete-request',
  strictRateLimiter(), // Security for deletion requests
  validateBody(changePasswordSchema.extract(['currentPassword'])),
  userCtrl.requestAccountDeletion
);

// Cancel account deletion request
router.delete(
  '/delete-request',
  strictRateLimiter(), // Security for deletion cancellation
  userCtrl.cancelAccountDeletion
);

// ===== USER PREFERENCES =====

// Get user preferences
router.get(
  '/preferences',
  userCtrl.getUserPreferences
);

// Update user preferences
router.put(
  '/preferences',
  validateBody(updateUserProfileSchema.extract([
    'theme', 'language', 'timezone', 'notifications'
  ])),
  userCtrl.updateUserPreferences
);

// ===== DATA EXPORT =====

// Request user data export (GDPR compliance)
router.post(
  '/export',
  strictRateLimiter(), // Prevent export abuse
  userCtrl.requestDataExport
);

// Get data export status
router.get(
  '/export/status',
  userCtrl.getDataExportStatus
);

// Download data export
router.get(
  '/export/download/:exportId',
  validateParams(userParamsSchema.extract(['exportId'])),
  userCtrl.downloadDataExport
);

export default router;