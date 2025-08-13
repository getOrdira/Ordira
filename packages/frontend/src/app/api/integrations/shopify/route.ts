// src/routes/integrations/shopify.routes.ts
import { Router } from 'express';
import express from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as shopifyCtrl from '../../controllers/integrations/shopify.controller';
import {
  shopifyConnectionSchema,
  shopifyOAuthSchema,
  shopifySyncSchema,
  shopifyWebhookSchema,
  shopifyAnalyticsSchema,
  shopifyConfigSchema
} from '../../validation/integrations/shopify.validation';

const router = Router();

// Apply middleware to most routes (webhooks handled separately)
router.use(dynamicRateLimiter());

/**
 * GET /api/integrations/shopify
 * Get Shopify integration overview and status
 */
router.get(
  '/',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  shopifyCtrl.getShopifyOverview
);

/**
 * POST /api/integrations/shopify/connect
 * Initiate Shopify OAuth connection flow
 */
router.post(
  '/connect',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(shopifyConnectionSchema.connect),
  shopifyCtrl.initiateShopifyConnection
);

/**
 * GET /api/integrations/shopify/oauth/callback
 * Handle Shopify OAuth callback
 */
router.get(
  '/oauth/callback',
  validateQuery(shopifyOAuthSchema.callback),
  shopifyCtrl.handleOAuthCallback
);

/**
 * GET /api/integrations/shopify/status
 * Get detailed connection status and health
 */
router.get(
  '/status',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  shopifyCtrl.getConnectionStatus
);

/**
 * PUT /api/integrations/shopify/config
 * Update Shopify integration configuration
 */
router.put(
  '/config',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(shopifyConfigSchema),
  shopifyCtrl.updateShopifyConfig
);

/**
 * DELETE /api/integrations/shopify/disconnect
 * Disconnect Shopify integration
 */
router.delete(
  '/disconnect',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  shopifyCtrl.disconnectShopify
);

/**
 * POST /api/integrations/shopify/test-connection
 * Test Shopify API connection
 */
router.post(
  '/test-connection',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  shopifyCtrl.testConnection
);

/**
 * GET /api/integrations/shopify/store-info
 * Get Shopify store information
 */
router.get(
  '/store-info',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  shopifyCtrl.getStoreInfo
);

/**
 * POST /api/integrations/shopify/sync
 * Manually trigger data synchronization
 */
router.post(
  '/sync',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(shopifySyncSchema),
  shopifyCtrl.syncShopifyData
);

/**
 * GET /api/integrations/shopify/sync/status
 * Get synchronization status
 */
router.get(
  '/sync/status',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  shopifyCtrl.getSyncStatus
);

/**
 * GET /api/integrations/shopify/sync/history
 * Get synchronization history
 */
router.get(
  '/sync/history',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(shopifySyncSchema.history),
  shopifyCtrl.getSyncHistory
);

/**
 * GET /api/integrations/shopify/products
 * Get synchronized products from Shopify
 */
router.get(
  '/products',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(shopifySyncSchema.products),
  shopifyCtrl.getShopifyProducts
);

/**
 * POST /api/integrations/shopify/products/sync
 * Sync specific products
 */
router.post(
  '/products/sync',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(shopifySyncSchema.productSync),
  shopifyCtrl.syncSpecificProducts
);

/**
 * GET /api/integrations/shopify/orders
 * Get orders from Shopify with certificate status
 */
router.get(
  '/orders',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateQuery(shopifySyncSchema.orders),
  shopifyCtrl.getShopifyOrders
);

/**
 * POST /api/integrations/shopify/orders/:orderId/certificates
 * Manually create certificates for specific order
 */
router.post(
  '/orders/:orderId/certificates',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(shopifySyncSchema.orderParams),
  shopifyCtrl.createOrderCertificates
);

/**
 * GET /api/integrations/shopify/webhooks
 * Get webhook configuration and status
 */
router.get(
  '/webhooks',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  shopifyCtrl.getWebhookConfig
);

/**
 * POST /api/integrations/shopify/webhooks/register
 * Register/update webhooks with Shopify
 */
router.post(
  '/webhooks/register',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(shopifyWebhookSchema.register),
  shopifyCtrl.registerWebhooks
);

/**
 * DELETE /api/integrations/shopify/webhooks/:webhookId
 * Unregister specific webhook
 */
router.delete(
  '/webhooks/:webhookId',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(shopifyWebhookSchema.params),
  shopifyCtrl.unregisterWebhook
);

/**
 * POST /api/integrations/shopify/webhook/orders
 * Shopify order webhook endpoint (public, signature verified)
 */
router.post(
  '/webhook/orders',
  express.raw({ type: 'application/json', limit: '1mb' }),
  validateBody(shopifyWebhookSchema.orderWebhook),
  shopifyCtrl.handleOrderWebhook
);

/**
 * POST /api/integrations/shopify/webhook/products
 * Shopify product webhook endpoint (public, signature verified)
 */
router.post(
  '/webhook/products',
  express.raw({ type: 'application/json', limit: '1mb' }),
  validateBody(shopifyWebhookSchema.productWebhook),
  shopifyCtrl.handleProductWebhook
);

/**
 * POST /api/integrations/shopify/webhook/app/uninstalled
 * Shopify app uninstall webhook (public, signature verified)
 */
router.post(
  '/webhook/app/uninstalled',
  express.raw({ type: 'application/json', limit: '1mb' }),
  validateBody(shopifyWebhookSchema.appWebhook),
  shopifyCtrl.handleAppUninstall
);

/**
 * GET /api/integrations/shopify/analytics
 * Get Shopify integration analytics
 */
router.get(
  '/analytics',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(shopifyAnalyticsSchema),
  shopifyCtrl.getShopifyAnalytics
);

/**
 * GET /api/integrations/shopify/certificate-mapping
 * Get product-to-certificate mapping configuration
 */
router.get(
  '/certificate-mapping',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  shopifyCtrl.getCertificateMapping
);

/**
 * PUT /api/integrations/shopify/certificate-mapping
 * Update product-to-certificate mapping
 */
router.put(
  '/certificate-mapping',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(shopifyConfigSchema.certificateMapping),
  shopifyCtrl.updateCertificateMapping
);

/**
 * POST /api/integrations/shopify/certificate-rules/test
 * Test certificate creation rules
 */
router.post(
  '/certificate-rules/test',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(shopifyConfigSchema.testRules),
  shopifyCtrl.testCertificateRules
);

/**
 * GET /api/integrations/shopify/setup-guide
 * Get Shopify integration setup instructions
 */
router.get(
  '/setup-guide',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  shopifyCtrl.getSetupGuide
);

/**
 * GET /api/integrations/shopify/troubleshooting
 * Get troubleshooting information and diagnostics
 */
router.get(
  '/troubleshooting',
  authenticate,
  resolveTenant,
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  shopifyCtrl.getTroubleshootingInfo
);

/**
 * POST /api/integrations/shopify/bulk-operations
 * Trigger bulk operations (certificate creation, etc.)
 */
router.post(
  '/bulk-operations',
  authenticate,
  resolveTenant,
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(shopifySyncSchema.bulkOps),
  shopifyCtrl.triggerBulkOperations
);

export default router;