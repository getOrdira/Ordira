// src/routes/brands/settings.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as settingsCtrl from '../../controllers/brands/settings.controller';
import {
  brandSettingsUpdateSchema,
  accountSettingsSchema,
  notificationSettingsSchema,
  securitySettingsSchema,
  billingSettingsSchema,
  privacySettingsSchema,
  apiSettingsSchema
} from '../../validation/brands/settings.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);

/**
 * GET /api/brands/settings
 * Get all brand settings and configurations
 */
router.get(
  '/',
  settingsCtrl.getAllSettings
);

/**
 * PUT /api/brands/settings
 * Update general brand settings
 */
router.put(
  '/',
  validateBody(brandSettingsUpdateSchema),
  settingsCtrl.updateGeneralSettings
);

/**
 * GET /api/brands/settings/account
 * Get account-level settings
 */
router.get(
  '/account',
  settingsCtrl.getAccountSettings
);

/**
 * PUT /api/brands/settings/account
 * Update account settings
 */
router.put(
  '/account',
  validateBody(accountSettingsSchema),
  settingsCtrl.updateAccountSettings
);

/**
 * GET /api/brands/settings/notifications
 * Get notification preferences
 */
router.get(
  '/notifications',
  settingsCtrl.getNotificationSettings
);

/**
 * PUT /api/brands/settings/notifications
 * Update notification preferences
 */
router.put(
  '/notifications',
  validateBody(notificationSettingsSchema),
  settingsCtrl.updateNotificationSettings
);

/**
 * POST /api/brands/settings/notifications/test
 * Test notification delivery
 */
router.post(
  '/notifications/test',
  strictRateLimiter(),
  validateBody(notificationSettingsSchema.test),
  settingsCtrl.testNotificationDelivery
);

/**
 * GET /api/brands/settings/security
 * Get security settings and configurations
 */
router.get(
  '/security',
  settingsCtrl.getSecuritySettings
);

/**
 * PUT /api/brands/settings/security
 * Update security settings
 */
router.put(
  '/security',
  validateBody(securitySettingsSchema),
  settingsCtrl.updateSecuritySettings
);

/**
 * POST /api/brands/settings/security/2fa/enable
 * Enable two-factor authentication
 */
router.post(
  '/security/2fa/enable',
  strictRateLimiter(),
  validateBody(securitySettingsSchema.enable2FA),
  settingsCtrl.enableTwoFactorAuth
);

/**
 * POST /api/brands/settings/security/2fa/disable
 * Disable two-factor authentication
 */
router.post(
  '/security/2fa/disable',
  strictRateLimiter(),
  validateBody(securitySettingsSchema.disable2FA),
  settingsCtrl.disableTwoFactorAuth
);

/**
 * GET /api/brands/settings/security/sessions
 * Get active sessions
 */
router.get(
  '/security/sessions',
  settingsCtrl.getActiveSessions
);

/**
 * DELETE /api/brands/settings/security/sessions/:sessionId
 * Revoke specific session
 */
router.delete(
  '/security/sessions/:sessionId',
  validateParams(securitySettingsSchema.sessionParams),
  settingsCtrl.revokeSession
);

/**
 * POST /api/brands/settings/security/sessions/revoke-all
 * Revoke all sessions except current
 */
router.post(
  '/security/sessions/revoke-all',
  strictRateLimiter(),
  settingsCtrl.revokeAllSessions
);

/**
 * GET /api/brands/settings/billing
 * Get billing and subscription settings
 */
router.get(
  '/billing',
  settingsCtrl.getBillingSettings
);

/**
 * PUT /api/brands/settings/billing
 * Update billing settings
 */
router.put(
  '/billing',
  validateBody(billingSettingsSchema),
  settingsCtrl.updateBillingSettings
);

/**
 * GET /api/brands/settings/billing/invoices
 * Get billing invoices and payment history
 */
router.get(
  '/billing/invoices',
  validateQuery(billingSettingsSchema.invoicesQuery),
  settingsCtrl.getBillingInvoices
);

/**
 * GET /api/brands/settings/billing/usage
 * Get current usage and plan limits
 */
router.get(
  '/billing/usage',
  settingsCtrl.getUsageMetrics
);

/**
 * POST /api/brands/settings/billing/change-plan
 * Initiate plan change process
 */
router.post(
  '/billing/change-plan',
  strictRateLimiter(),
  validateBody(billingSettingsSchema.changePlan),
  settingsCtrl.changeBillingPlan
);

/**
 * GET /api/brands/settings/privacy
 * Get privacy settings and data handling preferences
 */
router.get(
  '/privacy',
  settingsCtrl.getPrivacySettings
);

/**
 * PUT /api/brands/settings/privacy
 * Update privacy settings
 */
router.put(
  '/privacy',
  validateBody(privacySettingsSchema),
  settingsCtrl.updatePrivacySettings
);

/**
 * POST /api/brands/settings/privacy/data-export
 * Request data export
 */
router.post(
  '/privacy/data-export',
  strictRateLimiter(),
  validateBody(privacySettingsSchema.dataExport),
  settingsCtrl.requestDataExport
);

/**
 * POST /api/brands/settings/privacy/data-deletion
 * Request account and data deletion
 */
router.post(
  '/privacy/data-deletion',
  strictRateLimiter(),
  validateBody(privacySettingsSchema.dataDeletion),
  settingsCtrl.requestDataDeletion
);

/**
 * GET /api/brands/settings/api
 * Get API settings and configurations
 */
router.get(
  '/api',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  settingsCtrl.getApiSettings
);

/**
 * PUT /api/brands/settings/api
 * Update API settings
 */
router.put(
  '/api',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(apiSettingsSchema),
  settingsCtrl.updateApiSettings
);

/**
 * GET /api/brands/settings/api/keys
 * Get API keys and access tokens
 */
router.get(
  '/api/keys',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  settingsCtrl.getApiKeys
);

/**
 * POST /api/brands/settings/api/keys/generate
 * Generate new API key
 */
router.post(
  '/api/keys/generate',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(apiSettingsSchema.generateKey),
  settingsCtrl.generateApiKey
);

/**
 * PUT /api/brands/settings/api/keys/:keyId
 * Update API key settings
 */
router.put(
  '/api/keys/:keyId',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateParams(apiSettingsSchema.keyParams),
  validateBody(apiSettingsSchema.updateKey),
  settingsCtrl.updateApiKey
);

/**
 * DELETE /api/brands/settings/api/keys/:keyId
 * Revoke API key
 */
router.delete(
  '/api/keys/:keyId',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateParams(apiSettingsSchema.keyParams),
  settingsCtrl.revokeApiKey
);

/**
 * GET /api/brands/settings/integrations
 * Get integration settings overview
 */
router.get(
  '/integrations',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  settingsCtrl.getIntegrationSettings
);

/**
 * GET /api/brands/settings/team
 * Get team and user management settings
 */
router.get(
  '/team',
  requireTenantPlan(['premium', 'enterprise']),
  settingsCtrl.getTeamSettings
);

/**
 * PUT /api/brands/settings/team
 * Update team settings
 */
router.put(
  '/team',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(accountSettingsSchema.teamSettings),
  settingsCtrl.updateTeamSettings
);

/**
 * POST /api/brands/settings/team/invite
 * Invite team member
 */
router.post(
  '/team/invite',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(accountSettingsSchema.inviteTeamMember),
  settingsCtrl.inviteTeamMember
);

/**
 * DELETE /api/brands/settings/team/:userId
 * Remove team member
 */
router.delete(
  '/team/:userId',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(accountSettingsSchema.teamMemberParams),
  settingsCtrl.removeTeamMember
);

/**
 * GET /api/brands/settings/audit-log
 * Get settings change audit log
 */
router.get(
  '/audit-log',
  requireTenantPlan(['enterprise']),
  validateQuery(securitySettingsSchema.auditLogQuery),
  settingsCtrl.getAuditLog
);

/**
 * POST /api/brands/settings/backup
 * Create settings backup
 */
router.post(
  '/backup',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  settingsCtrl.createSettingsBackup
);

/**
 * GET /api/brands/settings/backup/history
 * Get settings backup history
 */
router.get(
  '/backup/history',
  requireTenantPlan(['premium', 'enterprise']),
  settingsCtrl.getBackupHistory
);

/**
 * POST /api/brands/settings/restore/:backupId
 * Restore from settings backup
 */
router.post(
  '/restore/:backupId',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(accountSettingsSchema.backupParams),
  settingsCtrl.restoreFromBackup
);

/**
 * POST /api/brands/settings/reset
 * Reset settings to defaults
 */
router.post(
  '/reset',
  strictRateLimiter(),
  validateBody(brandSettingsUpdateSchema.reset),
  settingsCtrl.resetToDefaults
);

/**
 * GET /api/brands/settings/export
 * Export all settings configuration
 */
router.get(
  '/export',
  validateQuery(brandSettingsUpdateSchema.export),
  settingsCtrl.exportSettings
);

/**
 * POST /api/brands/settings/import
 * Import settings configuration
 */
router.post(
  '/import',
  strictRateLimiter(),
  validateBody(brandSettingsUpdateSchema.import),
  settingsCtrl.importSettings
);

export default router;