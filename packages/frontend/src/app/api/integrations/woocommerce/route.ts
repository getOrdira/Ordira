// src/routes/integrations/woocommerce.routes.ts
import { Router } from 'express';
import express from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as wooCommerceCtrl from '../../controllers/integrations/woocommerce.controller';
import {
  wooCommerceConnectionSchema,
  wooCommerceSyncSchema,
  wooCommerceWebhookSchema,
  wooCommerceAnalyticsSchema,
  wooCommerceConfigSchema
} from '../../validation/integrations/woocommerce.validation';

const router = Router();

// Apply middleware to most routes (webhooks handled separately)
router.use(dynamicRateLimiter());

/**
 * GET /api/integrations/woocommerce
 * Get WooCommerce integration overview and status
 */
router.get(
  '/',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wooCommerceCtrl.getWooCommerceOverview
);

/**
 * POST /api/integrations/woocommerce/connect
 * Connect WooCommerce store with API credentials
 */
router.post(
  '/connect',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(wooCommerceConnectionSchema.connect),
  wooCommerceCtrl.connectWooCommerceStore
);

/**
 * GET /api/integrations/woocommerce/status
 * Get detailed connection status and health
 */
router.get(
  '/status',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wooCommerceCtrl.getConnectionStatus
);

/**
 * PUT /api/integrations/woocommerce/config
 * Update WooCommerce integration configuration
 */
router.put(
  '/config',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(wooCommerceConfigSchema),
  wooCommerceCtrl.updateWooCommerceConfig
);

/**
 * DELETE /api/integrations/woocommerce/disconnect
 * Disconnect WooCommerce integration
 */
router.delete(
  '/disconnect',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  wooCommerceCtrl.disconnectWooCommerce
);

/**
 * POST /api/integrations/woocommerce/test-connection
 * Test WooCommerce API connection
 */
router.post(
  '/test-connection',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  wooCommerceCtrl.testConnection
);

/**
 * GET /api/integrations/woocommerce/store-info
 * Get WooCommerce store information
 */
router.get(
  '/store-info',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wooCommerceCtrl.getStoreInfo
);

/**
 * POST /api/integrations/woocommerce/sync
 * Manually trigger data synchronization
 */
router.post(
  '/sync',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(wooCommerceSyncSchema),
  wooCommerceCtrl.syncWooCommerceData
);

/**
 * GET /api/integrations/woocommerce/sync/status
 * Get synchronization status
 */
router.get(
  '/sync/status',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wooCommerceCtrl.getSyncStatus
);

/**
 * GET /api/integrations/woocommerce/sync/history
 * Get synchronization history
 */
router.get(
  '/sync/history',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(wooCommerceSyncSchema.history),
  wooCommerceCtrl.getSyncHistory
);

/**
 * GET /api/integrations/woocommerce/products
 * Get synchronized products from WooCommerce
 */
router.get(
  '/products',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(wooCommerceSyncSchema.products),
  wooCommerceCtrl.getWooCommerceProducts
);

/**
 * POST /api/integrations/woocommerce/products/sync
 * Sync specific products
 */
router.post(
  '/products/sync',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(wooCommerceSyncSchema.productSync),
  wooCommerceCtrl.syncSpecificProducts
);

/**
 * GET /api/integrations/woocommerce/orders
 * Get orders from WooCommerce with certificate status
 */
router.get(
  '/orders',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(wooCommerceSyncSchema.orders),
  wooCommerceCtrl.getWooCommerceOrders
);

/**
 * POST /api/integrations/woocommerce/orders/:orderId/certificates
 * Manually create certificates for specific order
 */
router.post(
  '/orders/:orderId/certificates',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(wooCommerceSyncSchema.orderParams),
  wooCommerceCtrl.createOrderCertificates
);

/**
 * GET /api/integrations/woocommerce/webhooks
 * Get webhook configuration and status
 */
router.get(
  '/webhooks',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wooCommerceCtrl.getWebhookConfig
);

/**
 * POST /api/integrations/woocommerce/webhooks/register
 * Register/update webhooks with WooCommerce
 */
router.post(
  '/webhooks/register',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(wooCommerceWebhookSchema.register),
  wooCommerceCtrl.registerWebhooks
);

/**
 * DELETE /api/integrations/woocommerce/webhooks/:webhookId
 * Unregister specific webhook
 */
router.delete(
  '/webhooks/:webhookId',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(wooCommerceWebhookSchema.params),
  wooCommerceCtrl.unregisterWebhook
);

/**
 * POST /api/integrations/woocommerce/webhook/orders
 * WooCommerce order webhook endpoint (public, signature verified)
 */
router.post(
  '/webhook/orders',
  express.json({ limit: '1mb' }),
  validateBody(wooCommerceWebhookSchema.orderWebhook),
  wooCommerceCtrl.handleOrderWebhook
);

/**
 * POST /api/integrations/woocommerce/webhook/products
 * WooCommerce product webhook endpoint (public, signature verified)
 */
router.post(
  '/webhook/products',
  express.json({ limit: '1mb' }),
  validateBody(wooCommerceWebhookSchema.productWebhook),
  wooCommerceCtrl.handleProductWebhook
);

/**
 * POST /api/integrations/woocommerce/webhook/customers
 * WooCommerce customer webhook endpoint (public, signature verified)
 */
router.post(
  '/webhook/customers',
  express.json({ limit: '1mb' }),
  validateBody(wooCommerceWebhookSchema.customerWebhook),
  wooCommerceCtrl.handleCustomerWebhook
);

/**
 * GET /api/integrations/woocommerce/analytics
 * Get WooCommerce integration analytics
 */
router.get(
  '/analytics',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(wooCommerceAnalyticsSchema),
  wooCommerceCtrl.getWooCommerceAnalytics
);

/**
 * GET /api/integrations/woocommerce/certificate-mapping
 * Get product-to-certificate mapping configuration
 */
router.get(
  '/certificate-mapping',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wooCommerceCtrl.getCertificateMapping
);

/**
 * PUT /api/integrations/woocommerce/certificate-mapping
 * Update product-to-certificate mapping
 */
router.put(
  '/certificate-mapping',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(wooCommerceConfigSchema.certificateMapping),
  wooCommerceCtrl.updateCertificateMapping
);

/**
 * GET /api/integrations/woocommerce/plugin-status
 * Check WooCommerce plugin status and compatibility
 */
router.get(
  '/plugin-status',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wooCommerceCtrl.getPluginStatus
);

/**
 * POST /api/integrations/woocommerce/certificate-rules/test
 * Test certificate creation rules
 */
router.post(
  '/certificate-rules/test',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(wooCommerceConfigSchema.testRules),
  wooCommerceCtrl.testCertificateRules
);

/**
 * GET /api/integrations/woocommerce/setup-guide
 * Get WooCommerce integration setup instructions
 */
router.get(
  '/setup-guide',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wooCommerceCtrl.getSetupGuide
);

/**
 * GET /api/integrations/woocommerce/troubleshooting
 * Get troubleshooting information and diagnostics
 */
router.get(
  '/troubleshooting',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  wooCommerceCtrl.getTroubleshootingInfo
);

/**
 * POST /api/integrations/woocommerce/bulk-operations
 * Trigger bulk operations (certificate creation, etc.)
 */
router.post(
  '/bulk-operations',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(wooCommerceSyncSchema.bulkOps),
  wooCommerceCtrl.triggerBulkOperations
);

/**
 * GET /api/integrations/woocommerce/system-status
 * Get comprehensive system status for WooCommerce integration
 */
router.get(
  '/system-status',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  wooCommerceCtrl.getSystemStatus
);

/**
 * POST /api/integrations/woocommerce/migrate-data
 * Migrate data from other platforms to WooCommerce integration
 */
router.post(
  '/migrate-data',
  authenticate,
  resolveTenant,
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(wooCommerceConfigSchema.dataMigration),
  wooCommerceCtrl.migrateIntegrationData
);

export default router;