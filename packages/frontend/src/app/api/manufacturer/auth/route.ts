// src/routes/manufacturer/auth.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticateManufacturer } from '../../middleware/manufacturerAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as manufacturerAuthCtrl from '../../controllers/manufacturer/auth.controller';
import {
  manufacturerRegistrationSchema,
  manufacturerLoginSchema,
  manufacturerVerificationSchema,
  passwordResetSchema,
  accountSecuritySchema,
  sessionManagementSchema
} from '../../validation/manufacturer/auth.validation';

const router = Router();

// Apply dynamic rate limiting to all auth routes
router.use(dynamicRateLimiter());

/**
 * POST /api/manufacturer/auth/register
 * Register new manufacturer account
 */
router.post(
  '/register',
  strictRateLimiter(), // Prevent registration spam
  validateBody(manufacturerRegistrationSchema.register),
  manufacturerAuthCtrl.registerManufacturer
);

/**
 * POST /api/manufacturer/auth/login
 * Manufacturer login with enhanced security
 */
router.post(
  '/login',
  strictRateLimiter(), // Prevent brute force attacks
  validateBody(manufacturerLoginSchema.login),
  manufacturerAuthCtrl.loginManufacturer
);

/**
 * POST /api/manufacturer/auth/logout
 * Logout manufacturer and clear session
 */
router.post(
  '/logout',
  authenticateManufacturer,
  manufacturerAuthCtrl.logoutManufacturer
);

/**
 * POST /api/manufacturer/auth/logout-all
 * Logout from all sessions/devices
 */
router.post(
  '/logout-all',
  authenticateManufacturer,
  strictRateLimiter(),
  manufacturerAuthCtrl.logoutAllSessions
);

/**
 * POST /api/manufacturer/auth/verify-email
 * Verify manufacturer email address
 */
router.post(
  '/verify-email',
  strictRateLimiter(),
  validateBody(manufacturerVerificationSchema.verifyEmail),
  manufacturerAuthCtrl.verifyEmail
);

/**
 * POST /api/manufacturer/auth/resend-verification
 * Resend email verification code
 */
router.post(
  '/resend-verification',
  strictRateLimiter(),
  validateBody(manufacturerVerificationSchema.resendVerification),
  manufacturerAuthCtrl.resendEmailVerification
);

/**
 * POST /api/manufacturer/auth/forgot-password
 * Request password reset
 */
router.post(
  '/forgot-password',
  strictRateLimiter(),
  validateBody(passwordResetSchema.forgotPassword),
  manufacturerAuthCtrl.forgotPassword
);

/**
 * POST /api/manufacturer/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  strictRateLimiter(),
  validateBody(passwordResetSchema.resetPassword),
  manufacturerAuthCtrl.resetPassword
);

/**
 * POST /api/manufacturer/auth/change-password
 * Change password (authenticated)
 */
router.post(
  '/change-password',
  authenticateManufacturer,
  strictRateLimiter(),
  validateBody(passwordResetSchema.changePassword),
  manufacturerAuthCtrl.changePassword
);

/**
 * POST /api/manufacturer/auth/refresh-token
 * Refresh JWT token
 */
router.post(
  '/refresh-token',
  validateBody(sessionManagementSchema.refreshToken),
  manufacturerAuthCtrl.refreshToken
);

/**
 * GET /api/manufacturer/auth/me
 * Get current authenticated manufacturer info
 */
router.get(
  '/me',
  authenticateManufacturer,
  manufacturerAuthCtrl.getCurrentManufacturer
);

/**
 * GET /api/manufacturer/auth/session-info
 * Get current session information
 */
router.get(
  '/session-info',
  authenticateManufacturer,
  manufacturerAuthCtrl.getSessionInfo
);

/**
 * GET /api/manufacturer/auth/sessions
 * Get all active sessions
 */
router.get(
  '/sessions',
  authenticateManufacturer,
  validateQuery(sessionManagementSchema.sessionsQuery),
  manufacturerAuthCtrl.getActiveSessions
);

/**
 * DELETE /api/manufacturer/auth/sessions/:sessionId
 * Revoke specific session
 */
router.delete(
  '/sessions/:sessionId',
  authenticateManufacturer,
  strictRateLimiter(),
  validateParams(sessionManagementSchema.sessionParams),
  manufacturerAuthCtrl.revokeSession
);

/**
 * GET /api/manufacturer/auth/security
 * Get account security settings and status
 */
router.get(
  '/security',
  authenticateManufacturer,
  manufacturerAuthCtrl.getSecuritySettings
);

/**
 * PUT /api/manufacturer/auth/security
 * Update account security settings
 */
router.put(
  '/security',
  authenticateManufacturer,
  validateBody(accountSecuritySchema),
  manufacturerAuthCtrl.updateSecuritySettings
);

/**
 * POST /api/manufacturer/auth/enable-2fa
 * Enable two-factor authentication
 */
router.post(
  '/enable-2fa',
  authenticateManufacturer,
  strictRateLimiter(),
  validateBody(accountSecuritySchema.enable2FA),
  manufacturerAuthCtrl.enableTwoFactorAuth
);

/**
 * POST /api/manufacturer/auth/verify-2fa
 * Verify 2FA setup
 */
router.post(
  '/verify-2fa',
  authenticateManufacturer,
  strictRateLimiter(),
  validateBody(accountSecuritySchema.verify2FA),
  manufacturerAuthCtrl.verifyTwoFactorAuth
);

/**
 * POST /api/manufacturer/auth/disable-2fa
 * Disable two-factor authentication
 */
router.post(
  '/disable-2fa',
  authenticateManufacturer,
  strictRateLimiter(),
  validateBody(accountSecuritySchema.disable2FA),
  manufacturerAuthCtrl.disableTwoFactorAuth
);

/**
 * GET /api/manufacturer/auth/backup-codes
 * Get 2FA backup codes
 */
router.get(
  '/backup-codes',
  authenticateManufacturer,
  manufacturerAuthCtrl.getBackupCodes
);

/**
 * POST /api/manufacturer/auth/regenerate-backup-codes
 * Regenerate 2FA backup codes
 */
router.post(
  '/regenerate-backup-codes',
  authenticateManufacturer,
  strictRateLimiter(),
  manufacturerAuthCtrl.regenerateBackupCodes
);

/**
 * GET /api/manufacturer/auth/login-history
 * Get login history and security events
 */
router.get(
  '/login-history',
  authenticateManufacturer,
  validateQuery(accountSecuritySchema.loginHistory),
  manufacturerAuthCtrl.getLoginHistory
);

/**
 * POST /api/manufacturer/auth/verify-account
 * Submit account verification documents
 */
router.post(
  '/verify-account',
  authenticateManufacturer,
  strictRateLimiter(),
  validateBody(manufacturerVerificationSchema.accountVerification),
  manufacturerAuthCtrl.submitAccountVerification
);

/**
 * GET /api/manufacturer/auth/verification-status
 * Get account verification status
 */
router.get(
  '/verification-status',
  authenticateManufacturer,
  manufacturerAuthCtrl.getVerificationStatus
);

/**
 * POST /api/manufacturer/auth/update-verification
 * Update verification documents
 */
router.post(
  '/update-verification',
  authenticateManufacturer,
  strictRateLimiter(),
  validateBody(manufacturerVerificationSchema.updateVerification),
  manufacturerAuthCtrl.updateVerificationDocuments
);

/**
 * POST /api/manufacturer/auth/deactivate-account
 * Deactivate manufacturer account
 */
router.post(
  '/deactivate-account',
  authenticateManufacturer,
  strictRateLimiter(),
  validateBody(accountSecuritySchema.deactivateAccount),
  manufacturerAuthCtrl.deactivateAccount
);

/**
 * POST /api/manufacturer/auth/reactivate-account
 * Reactivate manufacturer account
 */
router.post(
  '/reactivate-account',
  strictRateLimiter(),
  validateBody(accountSecuritySchema.reactivateAccount),
  manufacturerAuthCtrl.reactivateAccount
);

/**
 * GET /api/manufacturer/auth/account-status
 * Get comprehensive account status
 */
router.get(
  '/account-status',
  authenticateManufacturer,
  manufacturerAuthCtrl.getAccountStatus
);

/**
 * POST /api/manufacturer/auth/report-suspicious-activity
 * Report suspicious account activity
 */
router.post(
  '/report-suspicious-activity',
  authenticateManufacturer,
  strictRateLimiter(),
  validateBody(accountSecuritySchema.reportSuspicious),
  manufacturerAuthCtrl.reportSuspiciousActivity
);

/**
 * GET /api/manufacturer/auth/security-recommendations
 * Get personalized security recommendations
 */
router.get(
  '/security-recommendations',
  authenticateManufacturer,
  manufacturerAuthCtrl.getSecurityRecommendations
);

export default router;