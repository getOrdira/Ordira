// src/routes/integrations/wix.routes.ts

import { Router } from 'express';
import express from 'express';
import { resolveTenant } from '../../middleware/tenant.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validation.middleware';
import { dynamicRateLimiter } from '../../middleware/rateLimiter.middleware';
import * as wixCtrl from '../../controllers/wix.controller';
import Joi from 'joi';

const router = Router();

/**
 * Validation schemas for Wix integration
 */
const wixConnectSchema = Joi.object({
  returnUrl: Joi.string().uri().optional()
});

const wixCallbackSchema = Joi.object({
  code: Joi.string().alphanum().min(20).required(),
  state: Joi.string().alphanum().required(),
  instance_id: Joi.string().optional(),
  context: Joi.string().optional()
});

const wixSyncSchema = Joi.object({
  syncType: Joi.string()
    .valid('products', 'orders', 'customers', 'all')
    .default('products'),
  forceSync: Joi.boolean().default(false),
  batchSize: Joi.number().integer().min(1).max(100).default(50)
});

const wixAnalyticsQuerySchema = Joi.object({
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
 * Initiate Wix OAuth connection flow
 * POST /api/integrations/wix/connect
 * 
 * @requires authentication & tenant context
 * @requires validation: returnUrl?
 */
router.post(
  '/connect',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), // 5 attempts per 15 minutes
  validateBody(wixConnectSchema),
  wixCtrl.connectWix
);

/**
 * OAuth callback endpoint Wix redirects to after merchant approval
 * GET /api/integrations/wix/oauth/callback
 * 
 * @requires validation: OAuth callback parameters
 * @public endpoint (no authentication required)
 */
router.get(
  '/oauth/callback',
  dynamicRateLimiter(), // 10 attempts per 5 minutes
  validateQuery(wixCallbackSchema),
  wixCtrl.oauthCallback
);

/**
 * Get Wix connection status
 * GET /api/integrations/wix/status
 * 
 * @requires authentication & tenant context
 */
router.get(
  '/status',
  resolveTenant,
  authenticate,
  wixCtrl.getConnectionStatus
);

/**
 * Disconnect Wix integration
 * DELETE /api/integrations/wix/disconnect
 * 
 * @requires authentication & tenant context
 */
router.delete(
  '/disconnect',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), // 3 attempts per 10 minutes
  wixCtrl.disconnectWix
);

/**
 * Sync data from Wix
 * POST /api/integrations/wix/sync
 * 
 * @requires authentication & tenant context
 * @requires validation: sync configuration
 */
router.post(
  '/sync',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), // 3 syncs per minute
  validateBody(wixSyncSchema),
  wixCtrl.syncWixData
);

/**
 * Get Wix integration analytics
 * GET /api/integrations/wix/analytics
 * 
 * @requires authentication & tenant context
 * @optional query: date range, metrics
 */
router.get(
  '/analytics',
  resolveTenant,
  authenticate,
  validateQuery(wixAnalyticsQuerySchema),
  wixCtrl.getWixAnalytics
);

/**
 * Test Wix API connection
 * GET /api/integrations/wix/test
 * 
 * @requires authentication & tenant context
 */
router.get(
  '/test',
  resolveTenant,
  authenticate,
  dynamicRateLimiter(), // 5 tests per 10 minutes
  wixCtrl.testWixConnection
);

/**
 * Webhook endpoint for Wix order events
 * POST /api/integrations/wix/webhook/orders
 * 
 * @requires webhook validation
 * @public endpoint with signature verification
 * @uses JSON body parser (Wix sends JSON)
 */
router.post(
  '/webhook/orders',
  express.json({ limit: '1mb' }),
  dynamicRateLimiter(), // 1000 webhooks per minute
  wixCtrl.handleOrderWebhook
);

/**
 * Generic webhook endpoint for all Wix events
 * POST /api/integrations/wix/webhook
 * 
 * @requires webhook validation
 * @public endpoint with signature verification
 * @uses JSON body parser (Wix sends JSON)
 */
router.post(
  '/webhook',
  express.json({ limit: '1mb' }),
  dynamicRateLimiter(), // 1000 webhooks per minute
  wixCtrl.handleOrderWebhook
);

/**
 * Legacy webhook endpoint for backward compatibility
 * POST /api/integrations/wix/webhook/orders/create
 * 
 * @deprecated Use /webhook/orders instead
 */
router.post(
  '/webhook/orders/create',
  express.json({ limit: '1mb' }),
  dynamicRateLimiter(),
  wixCtrl.handleOrderWebhook
);

/**
 * Get Wix webhook status and configuration
 * GET /api/integrations/wix/webhooks
 * 
 * @requires authentication & tenant context
 */
router.get(
  '/webhooks',
  resolveTenant,
  authenticate,
  async (req, res, next) => {
    // Simple webhook status endpoint - can be enhanced later
    res.json({
      success: true,
      message: 'Webhook configuration retrieved',
      data: {
        webhookUrl: `${process.env.APP_URL}/api/integrations/wix/webhook`,
        supportedEvents: [
          'orderCreated',
          'orderUpdated',
          'orderPaid',
          'appRemoved'
        ],
        verificationMethod: 'HMAC-SHA256',
        provider: 'wix'
      }
    });
  }
);

export default router;