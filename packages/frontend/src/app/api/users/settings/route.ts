// src/routes/users/settings/route.ts
import { Router } from 'express';
import { validateBody, validateQuery } from '../../../middleware/validation.middleware';
import { authenticate } from '../../../middleware/auth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../../middleware/upload.middleware';
import { trackUserAction } from '../../../middleware/metrics.middleware';
import * as userSettingsCtrl from '../../../controllers/users/settings.controller';
import {
  userSettingsSchema,
  userValidationSchemas
} from '../../../validation/user.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(cleanupOnError);

/**
 * GET /api/users/settings
 * Get all user settings
 */
router.get(
  '/',
  trackUserAction('view_settings'),
  userSettingsCtrl.getUserSettings
);

/**
 * PUT /api/users/settings
 * Update all user settings
 */
router.put(
  '/',
  strictRateLimiter(),
  validateBody(userSettingsSchema.all),
  trackUserAction('update_all_settings'),
  userSettingsCtrl.updateAllSettings
);

/**
 * GET /api/users/settings/notifications
 * Get notification preferences
 */
router.get(
  '/notifications',
  trackUserAction('view_notification_settings'),
  userSettingsCtrl.getNotificationSettings
);

/**
 * PUT /api/users/settings/notifications
 * Update notification preferences
 */
router.put(
  '/notifications',
  validateBody(userSettingsSchema.notifications),
  trackUserAction('update_notification_settings'),
  userSettingsCtrl.updateNotificationSettings
);

/**
 * GET /api/users/settings/privacy
 * Get privacy settings
 */
router.get(
  '/privacy',
  trackUserAction('view_privacy_settings'),
  userSettingsCtrl.getPrivacySettings
);

/**
 * PUT /api/users/settings/privacy
 * Update privacy settings
 */
router.put(
  '/privacy',
  validateBody(userSettingsSchema.privacy),
  trackUserAction('update_privacy_settings'),
  userSettingsCtrl.updatePrivacySettings
);

/**
 * GET /api/users/settings/voting-preferences
 * Get voting preferences
 */
router.get(
  '/voting-preferences',
  trackUserAction('view_voting_preferences'),
  userSettingsCtrl.getVotingPreferences
);

/**
 * PUT /api/users/settings/voting-preferences
 * Update voting preferences
 */
router.put(
  '/voting-preferences',
  validateBody(userSettingsSchema.votingPreferences),
  trackUserAction('update_voting_preferences'),
  userSettingsCtrl.updateVotingPreferences
);

/**
 * GET /api/users/settings/security
 * Get security settings
 */
router.get(
  '/security',
  trackUserAction('view_security_settings'),
  userSettingsCtrl.getSecuritySettings
);

/**
 * PUT /api/users/settings/security
 * Update security settings
 */
router.put(
  '/security',
  strictRateLimiter(),
  validateBody(userSettingsSchema.security),
  trackUserAction('update_security_settings'),
  userSettingsCtrl.updateSecuritySettings
);

/**
 * POST /api/users/settings/password
 * Change password
 */
router.post(
  '/password',
  strictRateLimiter(),
  validateBody(userValidationSchemas.changePassword),
  trackUserAction('change_password'),
  userSettingsCtrl.changePassword
);

/**
 * POST /api/users/settings/two-factor/setup
 * Setup two-factor authentication
 */
router.post(
  '/two-factor/setup',
  strictRateLimiter(),
  validateBody(userSettingsSchema.twoFactorSetup),
  trackUserAction('setup_two_factor'),
  userSettingsCtrl.setupTwoFactor
);

/**
 * POST /api/users/settings/two-factor/verify
 * Verify two-factor authentication setup
 */
router.post(
  '/two-factor/verify',
  strictRateLimiter(),
  validateBody(userSettingsSchema.twoFactorVerify),
  trackUserAction('verify_two_factor_setup'),
  userSettingsCtrl.verifyTwoFactorSetup
);

/**
 * POST /api/users/settings/two-factor/disable
 * Disable two-factor authentication
 */
router.post(
  '/two-factor/disable',
  strictRateLimiter(),
  validateBody(userValidationSchemas.disableTwoFactor),
  trackUserAction('disable_two_factor'),
  userSettingsCtrl.disableTwoFactor
);

/**
 * GET /api/users/settings/two-factor/backup-codes
 * Get backup codes for two-factor authentication
 */
router.get(
  '/two-factor/backup-codes',
  strictRateLimiter(),
  trackUserAction('view_backup_codes'),
  userSettingsCtrl.getBackupCodes
);

/**
 * POST /api/users/settings/two-factor/backup-codes/regenerate
 * Regenerate backup codes
 */
router.post(
  '/two-factor/backup-codes/regenerate',
  strictRateLimiter(),
  validateBody(userValidationSchemas.regenerateBackupCodes),
  trackUserAction('regenerate_backup_codes'),
  userSettingsCtrl.regenerateBackupCodes
);

/**
 * GET /api/users/settings/sessions
 * Get active sessions
 */
router.get(
  '/sessions',
  trackUserAction('view_active_sessions'),
  userSettingsCtrl.getActiveSessions
);

/**
 * DELETE /api/users/settings/sessions/:sessionId
 * Terminate specific session
 */
router.delete(
  '/sessions/:sessionId',
  strictRateLimiter(),
  trackUserAction('terminate_session'),
  userSettingsCtrl.terminateSession
);

/**
 * DELETE /api/users/settings/sessions
 * Terminate all other sessions
 */
router.delete(
  '/sessions',
  strictRateLimiter(),
  trackUserAction('terminate_all_sessions'),
  userSettingsCtrl.terminateAllOtherSessions
);

/**
 * GET /api/users/settings/connected-apps
 * Get connected applications and permissions
 */
router.get(
  '/connected-apps',
  trackUserAction('view_connected_apps'),
  userSettingsCtrl.getConnectedApps
);

/**
 * DELETE /api/users/settings/connected-apps/:appId
 * Revoke access for connected app
 */
router.delete(
  '/connected-apps/:appId',
  strictRateLimiter(),
  trackUserAction('revoke_app_access'),
  userSettingsCtrl.revokeAppAccess
);

/**
 * GET /api/users/settings/login-history
 * Get login history
 */
router.get(
  '/login-history',
  validateQuery(userValidationSchemas.loginHistoryQuery),
  trackUserAction('view_login_history'),
  userSettingsCtrl.getLoginHistory
);

/**
 * GET /api/users/settings/data-usage
 * Get data usage and storage information
 */
router.get(
  '/data-usage',
  trackUserAction('view_data_usage'),
  userSettingsCtrl.getDataUsage
);

/**
 * POST /api/users/settings/data/download
 * Request data download (GDPR)
 */
router.post(
  '/data/download',
  strictRateLimiter(),
  trackUserAction('request_data_download'),
  userSettingsCtrl.requestDataDownload
);

/**
 * POST /api/users/settings/data/portability
 * Request data portability
 */
router.post(
  '/data/portability',
  strictRateLimiter(),
  validateBody(userSettingsSchema.dataPortability),
  trackUserAction('request_data_portability'),
  userSettingsCtrl.requestDataPortability
);

/**
 * GET /api/users/settings/communication-preferences
 * Get communication preferences
 */
router.get(
  '/communication-preferences',
  trackUserAction('view_communication_preferences'),
  userSettingsCtrl.getCommunicationPreferences
);

/**
 * PUT /api/users/settings/communication-preferences
 * Update communication preferences
 */
router.put(
  '/communication-preferences',
  validateBody(userSettingsSchema.communicationPreferences),
  trackUserAction('update_communication_preferences'),
  userSettingsCtrl.updateCommunicationPreferences
);

/**
 * GET /api/users/settings/voting-reminders
 * Get voting reminder settings
 */
router.get(
  '/voting-reminders',
  trackUserAction('view_voting_reminders'),
  userSettingsCtrl.getVotingReminders
);

/**
 * PUT /api/users/settings/voting-reminders
 * Update voting reminder settings
 */
router.put(
  '/voting-reminders',
  validateBody(userSettingsSchema.votingReminders),
  trackUserAction('update_voting_reminders'),
  userSettingsCtrl.updateVotingReminders
);

/**
 * GET /api/users/settings/accessibility
 * Get accessibility preferences
 */
router.get(
  '/accessibility',
  trackUserAction('view_accessibility_settings'),
  userSettingsCtrl.getAccessibilitySettings
);

/**
 * PUT /api/users/settings/accessibility
 * Update accessibility preferences
 */
router.put(
  '/accessibility',
  validateBody(userSettingsSchema.accessibility),
  trackUserAction('update_accessibility_settings'),
  userSettingsCtrl.updateAccessibilitySettings
);

/**
 * POST /api/users/settings/reset
 * Reset all settings to default
 */
router.post(
  '/reset',
  strictRateLimiter(),
  validateBody(userValidationSchemas.resetSettings),
  trackUserAction('reset_settings'),
  userSettingsCtrl.resetAllSettings
);

export default router;