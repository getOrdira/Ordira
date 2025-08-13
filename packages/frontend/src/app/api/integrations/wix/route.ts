// src/routes/integrations/wix.routes.ts
import { Router } from 'express';
import express from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as wixCtrl from '../../controllers/integrations/wix.controller';
import {
  wixConnectionSchema,
  wixOAuthSchema,
  wixSyncSchema,
  wixWebhookSchema,
  wixAnalyticsSchema,
  wixConfigSchema
} from '../../validation/integrations/wix.validation';

const router = Router();

// Apply middleware to most routes (webhooks handled separately)
router.use(dynamicRateLimiter());

/**
 * GET /api/integrations/wix
 * Get Wix integration overview and status
 */
router.get(
  '/',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(wixSyncSchema.history),
  wixCtrl.getSyncHistory
);

/**
 * GET /api/integrations/wix/products
 * Get synchronized products from Wix
 */
router.get(
  '/products',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(wixSyncSchema.products),
  wixCtrl.getWixProducts
);

/**
 * POST /api/integrations/wix/products/sync
 * Sync specific products
 */
router.post(
  '/products/sync',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(wixSyncSchema.productSync),
  wixCtrl.syncSpecificProducts
);

/**
 * GET /api/integrations/wix/orders
 * Get orders from Wix with certificate status
 */
router.get(
  '/orders',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(wixSyncSchema.orders),
  wixCtrl.getWixOrders
);

/**
 * POST /api/integrations/wix/orders/:orderId/certificates
 * Manually create certificates for specific order
 */
router.post(
  '/orders/:orderId/certificates',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(wixSyncSchema.orderParams),
  wixCtrl.createOrderCertificates
);

/**
 * GET /api/integrations/wix/webhooks
 * Get webhook configuration and status
 */
router.get(
  '/webhooks',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wixCtrl.getWebhookConfig
);

/**
 * POST /api/integrations/wix/webhooks/register
 * Register/update webhooks with Wix
 */
router.post(
  '/webhooks/register',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(wixWebhookSchema.register),
  wixCtrl.registerWebhooks
);

/**
 * DELETE /api/integrations/wix/webhooks/:webhookId
 * Unregister specific webhook
 */
router.delete(
  '/webhooks/:webhookId',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(wixWebhookSchema.params),
  wixCtrl.unregisterWebhook
);

/**
 * POST /api/integrations/wix/webhook/orders
 * Wix order webhook endpoint (public, signature verified)
 */
router.post(
  '/webhook/orders',
  express.json({ limit: '1mb' }),
  validateBody(wixWebhookSchema.orderWebhook),
  wixCtrl.handleOrderWebhook
);

/**
 * POST /api/integrations/wix/webhook/products
 * Wix product webhook endpoint (public, signature verified)
 */
router.post(
  '/webhook/products',
  express.json({ limit: '1mb' }),
  validateBody(wixWebhookSchema.productWebhook),
  wixCtrl.handleProductWebhook
);

/**
 * POST /api/integrations/wix/webhook/app/removed
 * Wix app removal webhook (public, signature verified)
 */
router.post(
  '/webhook/app/removed',
  express.json({ limit: '1mb' }),
  validateBody(wixWebhookSchema.appWebhook),
  wixCtrl.handleAppRemoval
);

/**
 * GET /api/integrations/wix/analytics
 * Get Wix integration analytics
 */
router.get(
  '/analytics',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(wixAnalyticsSchema),
  wixCtrl.getWixAnalytics
);

/**
 * GET /api/integrations/wix/certificate-mapping
 * Get product-to-certificate mapping configuration
 */
router.get(
  '/certificate-mapping',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wixCtrl.getCertificateMapping
);

/**
 * PUT /api/integrations/wix/certificate-mapping
 * Update product-to-certificate mapping
 */
router.put(
  '/certificate-mapping',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(wixConfigSchema.certificateMapping),
  wixCtrl.updateCertificateMapping
);

/**
 * GET /api/integrations/wix/app-status
 * Check Wix app status and permissions
 */
router.get(
  '/app-status',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wixCtrl.getAppStatus
);

/**
 * POST /api/integrations/wix/certificate-rules/test
 * Test certificate creation rules
 */
router.post(
  '/certificate-rules/test',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(wixConfigSchema.testRules),
  wixCtrl.testCertificateRules
);

/**
 * GET /api/integrations/wix/setup-guide
 * Get Wix integration setup instructions
 */
router.get(
  '/setup-guide',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wixCtrl.getSetupGuide
);

/**
 * GET /api/integrations/wix/troubleshooting
 * Get troubleshooting information and diagnostics
 */
router.get(
  '/troubleshooting',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wixCtrl.getTroubleshootingInfo
);

/**
 * POST /api/integrations/wix/bulk-operations
 * Trigger bulk operations (certificate creation, etc.)
 */
router.post(
  '/bulk-operations',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(wixSyncSchema.bulkOps),
  wixCtrl.triggerBulkOperations
);

/**
 * GET /api/integrations/wix/permissions
 * Get current Wix app permissions and scopes
 */
router.get(
  '/permissions',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wixCtrl.getAppPermissions
);

/**
 * POST /api/integrations/wix/permissions/upgrade
 * Request additional permissions from Wix
 */
router.post(
  '/permissions/upgrade',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(wixConfigSchema.permissionUpgrade),
  wixCtrl.requestPermissionUpgrade
);



/**
 * POST /api/integrations/wix/connect
 * Initiate Wix OAuth connection flow
 */
router.post(
  '/connect',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(wixConnectionSchema.connect),
  wixCtrl.initiateWixConnection
);

/**
 * GET /api/integrations/wix/oauth/callback
 * Handle Wix OAuth callback
 */
router.get(
  '/oauth/callback',
  validateQuery(wixOAuthSchema.callback),
  wixCtrl.handleOAuthCallback
);

/**
 * GET /api/integrations/wix/status
 * Get detailed connection status and health
 */
router.get(
  '/status',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wixCtrl.getConnectionStatus
);

/**
 * PUT /api/integrations/wix/config
 * Update Wix integration configuration
 */
router.put(
  '/config',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(wixConfigSchema),
  wixCtrl.updateWixConfig
);

/**
 * DELETE /api/integrations/wix/disconnect
 * Disconnect Wix integration
 */
router.delete(
  '/disconnect',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  wixCtrl.disconnectWix
);

/**
 * POST /api/integrations/wix/test-connection
 * Test Wix API connection
 */
router.post(
  '/test-connection',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  wixCtrl.testConnection
);

/**
 * GET /api/integrations/wix/site-info
 * Get Wix site information
 */
router.get(
  '/site-info',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wixCtrl.getSiteInfo
);

/**
 * POST /api/integrations/wix/sync
 * Manually trigger data synchronization
 */
router.post(
  '/sync',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(wixSyncSchema),
  wixCtrl.syncWixData
);

/**
 * GET /api/integrations/wix/sync/status
 * Get synchronization status
 */
router.get(
  '/sync/status',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wixCtrl.getSyncStatus
);

/**
 * GET /api/integrations/wix/sync/history
 * Get synchronization history
 */
router.get(
  '/sync/history',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprisee']),
  wixCtrl.getSyncStatus
);

export default router; (
  wixCtrl.getWixOverview
);