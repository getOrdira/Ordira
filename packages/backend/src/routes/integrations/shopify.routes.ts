// src/routes/integrations/shopify.routes.ts

import { Router } from 'express';
import express from 'express';
import { resolveTenant } from '../../middleware/tenant.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { dynamicRateLimiter } from '../../middleware/rateLimiter.middleware';
import * as shopifyCtrl from '../../controllers/shopify.controller';
import Joi from 'joi';

const router = Router();

/**
 * Validation schemas for Shopify integration
 */
const shopifyConnectSchema = Joi.object({
  shopDomain: Joi.string()
    .pattern(/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/)
    .required()
    .messages({
      'string.pattern.base': 'Shop domain must be in format: shop-name.myshopify.com'
    }),
  returnUrl: Joi.string().uri().optional()
});

const shopifyCallbackSchema = Joi.object({
  shop: Joi.string()
    .pattern(/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/)
    .required(),
  code: Joi.string().alphanum().min(20).required(),
  state: Joi.string().alphanum().required(),
  hmac: Joi.string().alphanum().optional(),
  timestamp: Joi.string().optional()
});

const shopifySyncSchema = Joi.object({
  syncType: Joi.string()
    .valid('products', 'orders', 'customers', 'all')
    .default('products'),
  forceSync: Joi.boolean().default(false),
  batchSize: Joi.number().integer().min(1).max(250).default(50)
});

const shopifyAnalyticsQuerySchema = Joi.object({
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
 * Initiate Shopify OAuth connection flow
 * POST /api/integrations/shopify/connect
 * 
 * @requires authentication & tenant context
 * @requires validation: shopDomain, returnUrl?
 */
router.post(
  '/connect',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), // 5 attempts per 15 minutes
  validateBody(shopifyConnectSchema),
  shopifyCtrl.connectShopify
);

/**
 * OAuth callback endpoint Shopify redirects to after merchant approval
 * GET /api/integrations/shopify/oauth/callback
 * 
 * @requires validation: OAuth callback parameters
 * @public endpoint (no authentication required)
 */
router.get(
  '/oauth/callback',
  dynamicRateLimiter(), // 10 attempts per 5 minutes
  validateQuery(shopifyCallbackSchema),
  shopifyCtrl.oauthCallback
);

/**
 * Get Shopify connection status
 * GET /api/integrations/shopify/status
 * 
 * @requires authentication & tenant context
 */
router.get(
  '/status',
  resolveTenant,
  authenticate,
  shopifyCtrl.getConnectionStatus
);

/**
 * Disconnect Shopify integration
 * DELETE /api/integrations/shopify/disconnect
 * 
 * @requires authentication & tenant context
 */
router.delete(
  '/disconnect',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), 
  shopifyCtrl.disconnectShopify
);

/**
 * Sync data from Shopify
 * POST /api/integrations/shopify/sync
 * 
 * @requires authentication & tenant context
 * @requires validation: sync configuration
 */
router.post(
  '/sync',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), 
  validateBody(shopifySyncSchema),
  shopifyCtrl.syncShopifyData
);

/**
 * Get Shopify integration analytics
 * GET /api/integrations/shopify/analytics
 * 
 * @requires authentication & tenant context
 * @optional query: date range, metrics
 */
router.get(
  '/analytics',
  resolveTenant,
  authenticate,
  validateQuery(shopifyAnalyticsQuerySchema),
  shopifyCtrl.getShopifyAnalytics
);

/**
 * Test Shopify API connection
 * GET /api/integrations/shopify/test
 * 
 * @requires authentication & tenant context
 */
router.get(
  '/test',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), 
  shopifyCtrl.testShopifyConnection
);

/**
 * Webhook endpoint for Shopify order events
 * POST /api/integrations/shopify/webhook/orders
 * 
 * @requires webhook validation
 * @public endpoint with HMAC verification
 * @uses raw body parser for HMAC validation
 */
router.post(
  '/webhook/orders',
  express.raw({ type: 'application/json', limit: '1mb' }),
  dynamicRateLimiter(), 
  shopifyCtrl.handleOrderWebhook
);

/**
 * Generic webhook endpoint for all Shopify events
 * POST /api/integrations/shopify/webhook
 * 
 * @requires webhook validation
 * @public endpoint with HMAC verification
 * @uses raw body parser for HMAC validation
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  dynamicRateLimiter(), 
  shopifyCtrl.handleOrderWebhook
);

/**
 * Legacy webhook endpoint for backward compatibility
 * POST /api/integrations/shopify/webhook/orders/create
 * 
 * @deprecated Use /webhook/orders instead
 */
router.post(
  '/webhook/orders/create',
  express.raw({ type: 'application/json', limit: '1mb' }),
  dynamicRateLimiter(),
  shopifyCtrl.handleOrderWebhook
);

export default router;