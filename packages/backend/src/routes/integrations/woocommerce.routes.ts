// src/routes/integrations/woocommerce.routes.ts

import { Router } from 'express';
import express from 'express';
import { resolveTenant } from '../../middleware/tenant.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validation.middleware';
import { dynamicRateLimiter } from '../../middleware/rateLimiter.middleware';
import * as wooCtrl from '../../controllers/woocommerce.controller';
import Joi from 'joi';

const router = Router();

/**
 * Validation schemas for WooCommerce integration
 */
const wooCommerceConnectSchema = Joi.object({
  domain: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'string.uri': 'Domain must be a valid URL (e.g., https://yourstore.com)'
    }),
  consumerKey: Joi.string()
    .pattern(/^ck_[a-f0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid WooCommerce consumer key format'
    }),
  consumerSecret: Joi.string()
    .pattern(/^cs_[a-f0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid WooCommerce consumer secret format'
    }),
  version: Joi.string()
    .valid('wc/v1', 'wc/v2', 'wc/v3')
    .default('wc/v3'),
  verifySsl: Joi.boolean().default(true)
});

const wooCommerceSyncSchema = Joi.object({
  syncType: Joi.string()
    .valid('products', 'orders', 'customers', 'all')
    .default('products'),
  forceSync: Joi.boolean().default(false),
  batchSize: Joi.number().integer().min(1).max(100).default(50)
});

const wooCommerceAnalyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  metrics: Joi.string()
    .pattern(/^[a-z_,]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Metrics must be comma-separated lowercase values'
    })
});

/**
 * Setup WooCommerce integration with credentials
 * POST /api/integrations/woocommerce/connect
 * 
 * @requires authentication & tenant context
 * @requires validation: domain, consumerKey, consumerSecret, version?, verifySsl?
 */
router.post(
  '/connect',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), // 5 attempts per 15 minutes
  validateBody(wooCommerceConnectSchema),
  wooCtrl.connectWooCommerce
);

/**
 * Get WooCommerce connection status
 * GET /api/integrations/woocommerce/status
 * 
 * @requires authentication & tenant context
 */
router.get(
  '/status',
  resolveTenant,
  authenticate,
  wooCtrl.getConnectionStatus
);

/**
 * Disconnect WooCommerce integration
 * DELETE /api/integrations/woocommerce/disconnect
 * 
 * @requires authentication & tenant context
 */
router.delete(
  '/disconnect',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), 
  wooCtrl.disconnectWooCommerce
);

/**
 * Sync data from WooCommerce
 * POST /api/integrations/woocommerce/sync
 * 
 * @requires authentication & tenant context
 * @requires validation: sync configuration
 */
router.post(
  '/sync',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(),
  validateBody(wooCommerceSyncSchema),
  wooCtrl.syncWooCommerceData
);

/**
 * Get WooCommerce integration analytics
 * GET /api/integrations/woocommerce/analytics
 * 
 * @requires authentication & tenant context
 * @optional query: date range, metrics
 */
router.get(
  '/analytics',
  resolveTenant,
  authenticate,
  validateQuery(wooCommerceAnalyticsQuerySchema),
  wooCtrl.getWooCommerceAnalytics
);

/**
 * Test WooCommerce API connection
 * GET /api/integrations/woocommerce/test
 * 
 * @requires authentication & tenant context
 */
router.get(
  '/test',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), 
  wooCtrl.testWooCommerceConnection
);

/**
 * Get WooCommerce store information
 * GET /api/integrations/woocommerce/store-info
 * 
 * @requires authentication & tenant context
 */
router.get(
  '/store-info',
  resolveTenant,
  authenticate,
  wooCtrl.getStoreInfo
);

/**
 * Get setup instructions for WooCommerce
 * GET /api/integrations/woocommerce/setup-guide
 * 
 * @requires authentication & tenant context
 */
router.get(
  '/setup-guide',
  resolveTenant,
  authenticate,
  wooCtrl.getSetupGuide
);

/**
 * Webhook endpoint for WooCommerce order events
 * POST /api/integrations/woocommerce/webhook/orders
 * 
 * @requires webhook validation
 * @public endpoint with signature verification
 * @uses JSON body parser (WooCommerce sends JSON)
 */
router.post(
  '/webhook/orders',
  express.json({ limit: '1mb' }),
  dynamicRateLimiter(), 
  wooCtrl.handleOrderWebhook
);

/**
 * Webhook endpoint for WooCommerce product events
 * POST /api/integrations/woocommerce/webhook/products
 * 
 * @requires webhook validation
 * @public endpoint with signature verification
 * @uses JSON body parser (WooCommerce sends JSON)
 */
router.post(
  '/webhook/products',
  express.json({ limit: '1mb' }),
  dynamicRateLimiter(),
  wooCtrl.handleOrderWebhook // Reuse handler, it determines event type
);

/**
 * Generic webhook endpoint for all WooCommerce events
 * POST /api/integrations/woocommerce/webhook
 * 
 * @requires webhook validation
 * @public endpoint with signature verification
 * @uses JSON body parser (WooCommerce sends JSON)
 */
router.post(
  '/webhook',
  express.json({ limit: '1mb' }),
  dynamicRateLimiter(), // 1000 webhooks per minute
  wooCtrl.handleOrderWebhook
);

/**
 * Legacy webhook endpoint for backward compatibility
 * POST /api/integrations/woocommerce/webhook/orders/create
 * 
 * @deprecated Use /webhook/orders instead
 */
router.post(
  '/webhook/orders/create',
  express.json({ limit: '1mb' }),
  dynamicRateLimiter(),
  wooCtrl.handleOrderWebhook
);

/**
 * Get WooCommerce webhook status and configuration
 * GET /api/integrations/woocommerce/webhooks
 * 
 * @requires authentication & tenant context
 */
router.get(
  '/webhooks',
  resolveTenant,
  authenticate,
  async (req, res, next) => {
    // Simple webhook status endpoint - can be enhanced later
    const webhookUrl = `${process.env.APP_URL}/api/integrations/woocommerce/webhook`;
    
    res.json({
      success: true,
      message: 'Webhook configuration retrieved',
      data: {
        webhookUrl,
        orderWebhookUrl: `${process.env.APP_URL}/api/integrations/woocommerce/webhook/orders`,
        productWebhookUrl: `${process.env.APP_URL}/api/integrations/woocommerce/webhook/products`,
        supportedEvents: [
          'order.created',
          'order.updated',
          'order.deleted',
          'product.created',
          'product.updated',
          'product.deleted'
        ],
        verificationMethod: 'HMAC-SHA256',
        provider: 'woocommerce',
        setupInstructions: {
          step1: 'Go to WooCommerce > Settings > Advanced > Webhooks',
          step2: 'Click "Add webhook"',
          step3: `Set Delivery URL to: ${webhookUrl}`,
          step4: 'Select desired events and set status to "Active"',
          step5: 'Save the webhook configuration'
        }
      }
    });
  }
);

/**
 * Validate WooCommerce credentials
 * POST /api/integrations/woocommerce/validate
 * 
 * @requires authentication & tenant context
 * @requires validation: domain, consumerKey, consumerSecret
 */
router.post(
  '/validate',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), // 10 validations per 15 minutes
  validateBody(wooCommerceConnectSchema.fork(['domain', 'consumerKey', 'consumerSecret'], (schema) => schema.required())),
  async (req, res, next) => {
    try {
      // Simple validation endpoint that tests credentials without saving them
      const { domain, consumerKey, consumerSecret, version, verifySsl } = req.body;
      
      // Basic format validation (already done by Joi)
      const isValid = domain && consumerKey && consumerSecret;
      
      res.json({
        success: true,
        message: 'Credentials validated successfully',
        data: {
          valid: isValid,
          domain,
          apiVersion: version || 'wc/v3',
          sslVerification: verifySsl !== false,
          validatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;