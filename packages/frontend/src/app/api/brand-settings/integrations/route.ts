// src/routes/brandSettings/integrations.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as integrationsCtrl from '../../controllers/brandSettings/integrations.controller';
import {
  integrationConfigSchema,
  webhookConfigSchema,
  apiConfigSchema,
  analyticsConfigSchema,
  ecommerceConfigSchema,
  web3ConfigSchema
} from '../../validation/brandSettings/integrations.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);

/**
 * GET /api/brand-settings/integrations
 * Get all integration configurations and status
 */
router.get(
  '/',
  integrationsCtrl.getIntegrations
);

/**
 * GET /api/brand-settings/integrations/available
 * Get available integrations based on current plan
 */
router.get(
  '/available',
  integrationsCtrl.getAvailableIntegrations
);

/**
 * GET /api/brand-settings/integrations/status
 * Get integration health and connection status
 */
router.get(
  '/status',
  integrationsCtrl.getIntegrationStatus
);

// === WEBHOOK CONFIGURATION ===

/**
 * GET /api/brand-settings/integrations/webhooks
 * Get webhook configuration
 */
router.get(
  '/webhooks',
  integrationsCtrl.getWebhooks
);

/**
 * PUT /api/brand-settings/integrations/webhooks
 * Configure webhooks
 */
router.put(
  '/webhooks',
  validateBody(webhookConfigSchema),
  integrationsCtrl.updateWebhooks
);

/**
 * POST /api/brand-settings/integrations/webhooks/test
 * Test webhook endpoint
 */
router.post(
  '/webhooks/test',
  strictRateLimiter(),
  validateBody(webhookConfigSchema.test),
  integrationsCtrl.testWebhook
);

/**
 * GET /api/brand-settings/integrations/webhooks/logs
 * Get webhook delivery logs
 */
router.get(
  '/webhooks/logs',
  validateQuery(webhookConfigSchema.logs),
  integrationsCtrl.getWebhookLogs
);

// === API CONFIGURATION ===

/**
 * GET /api/brand-settings/integrations/api
 * Get API configuration and keys
 */
router.get(
  '/api',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  integrationsCtrl.getApiConfig
);

/**
 * PUT /api/brand-settings/integrations/api
 * Update API configuration
 */
router.put(
  '/api',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(apiConfigSchema),
  integrationsCtrl.updateApiConfig
);

/**
 * POST /api/brand-settings/integrations/api/keys/generate
 * Generate new API key
 */
router.post(
  '/api/keys/generate',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(apiConfigSchema.generateKey),
  integrationsCtrl.generateApiKey
);

/**
 * DELETE /api/brand-settings/integrations/api/keys/:keyId
 * Revoke API key
 */
router.delete(
  '/api/keys/:keyId',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateParams(apiConfigSchema.keyParams),
  integrationsCtrl.revokeApiKey
);

// === E-COMMERCE INTEGRATIONS ===

/**
 * GET /api/brand-settings/integrations/ecommerce
 * Get e-commerce integration status
 */
router.get(
  '/ecommerce',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  integrationsCtrl.getEcommerceIntegrations
);

/**
 * PUT /api/brand-settings/integrations/ecommerce/shopify
 * Configure Shopify integration
 */
router.put(
  '/ecommerce/shopify',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(ecommerceConfigSchema.shopify),
  integrationsCtrl.updateShopifyIntegration
);

/**
 * PUT /api/brand-settings/integrations/ecommerce/woocommerce
 * Configure WooCommerce integration
 */
router.put(
  '/ecommerce/woocommerce',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(ecommerceConfigSchema.woocommerce),
  integrationsCtrl.updateWooCommerceIntegration
);

/**
 * PUT /api/brand-settings/integrations/ecommerce/wix
 * Configure Wix integration
 */
router.put(
  '/ecommerce/wix',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(ecommerceConfigSchema.wix),
  integrationsCtrl.updateWixIntegration
);

/**
 * POST /api/brand-settings/integrations/ecommerce/:platform/test
 * Test e-commerce platform connection
 */
router.post(
  '/ecommerce/:platform/test',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateParams(ecommerceConfigSchema.platformParams),
  integrationsCtrl.testEcommerceConnection
);

/**
 * POST /api/brand-settings/integrations/ecommerce/:platform/sync
 * Trigger manual sync with e-commerce platform
 */
router.post(
  '/ecommerce/:platform/sync',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(ecommerceConfigSchema.platformParams),
  validateBody(ecommerceConfigSchema.sync),
  integrationsCtrl.syncEcommercePlatform
);

// === ANALYTICS INTEGRATIONS ===

/**
 * GET /api/brand-settings/integrations/analytics
 * Get analytics integration configuration
 */
router.get(
  '/analytics',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  integrationsCtrl.getAnalyticsIntegrations
);

/**
 * PUT /api/brand-settings/integrations/analytics/google
 * Configure Google Analytics integration
 */
router.put(
  '/analytics/google',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(analyticsConfigSchema.google),
  integrationsCtrl.updateGoogleAnalytics
);

/**
 * PUT /api/brand-settings/integrations/analytics/facebook
 * Configure Facebook Pixel integration
 */
router.put(
  '/analytics/facebook',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(analyticsConfigSchema.facebook),
  integrationsCtrl.updateFacebookPixel
);

/**
 * PUT /api/brand-settings/integrations/analytics/mixpanel
 * Configure Mixpanel integration
 */
router.put(
  '/analytics/mixpanel',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(analyticsConfigSchema.mixpanel),
  integrationsCtrl.updateMixpanelIntegration
);

// === WEB3 INTEGRATIONS ===

/**
 * GET /api/brand-settings/integrations/web3
 * Get Web3 integration configuration
 */
router.get(
  '/web3',
  requireTenantPlan(['premium', 'enterprise']),
  integrationsCtrl.getWeb3Integrations
);

/**
 * PUT /api/brand-settings/integrations/web3/wallet
 * Configure wallet connection
 */
router.put(
  '/web3/wallet',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateBody(web3ConfigSchema.wallet),
  integrationsCtrl.updateWalletConnection
);

/**
 * PUT /api/brand-settings/integrations/web3/contracts
 * Configure smart contracts
 */
router.put(
  '/web3/contracts',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(web3ConfigSchema.contracts),
  integrationsCtrl.updateSmartContracts
);

/**
 * POST /api/brand-settings/integrations/web3/contracts/deploy
 * Deploy new smart contracts
 */
router.post(
  '/web3/contracts/deploy',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(web3ConfigSchema.deploy),
  integrationsCtrl.deploySmartContracts
);

/**
 * GET /api/brand-settings/integrations/web3/transactions
 * Get Web3 transaction history
 */
router.get(
  '/web3/transactions',
  requireTenantPlan(['premium', 'enterprise']),
  validateQuery(web3ConfigSchema.transactions),
  integrationsCtrl.getWeb3Transactions
);

// === GENERAL INTEGRATION MANAGEMENT ===

/**
 * POST /api/brand-settings/integrations/:platform/disconnect
 * Disconnect from an integration platform
 */
router.post(
  '/:platform/disconnect',
  validateParams(integrationConfigSchema.platformParams),
  validateBody(integrationConfigSchema.disconnect),
  integrationsCtrl.disconnectIntegration
);

/**
 * POST /api/brand-settings/integrations/:platform/reset
 * Reset integration configuration
 */
router.post(
  '/:platform/reset',
  strictRateLimiter(),
  validateParams(integrationConfigSchema.platformParams),
  integrationsCtrl.resetIntegration
);

/**
 * GET /api/brand-settings/integrations/export
 * Export integration configurations
 */
router.get(
  '/export',
  validateQuery(integrationConfigSchema.export),
  integrationsCtrl.exportIntegrations
);

/**
 * POST /api/brand-settings/integrations/import
 * Import integration configurations
 */
router.post(
  '/import',
  strictRateLimiter(),
  validateBody(integrationConfigSchema.import),
  integrationsCtrl.importIntegrations
);

export default router;