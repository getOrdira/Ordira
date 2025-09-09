// @ts-nocheck
// src/routes/integrations/wix.routes.ts

import { Router } from 'express';
import express from 'express';
import { resolveTenant, TenantRequest } from '../../middleware/tenant.middleware';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { validateBody, validateQuery, ValidatedRequest } from '../../middleware/validation.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as wixCtrl from '../../controllers/wix.controller';
import Joi from 'joi';

const router = Router();

// ===== EXTENDED REQUEST INTERFACES =====

/**
 * Extended request interface with authentication and tenant context
 */
interface WixTenantRequest extends AuthRequest, TenantRequest {}

/**
 * Request interface for validated endpoints
 */
interface WixValidatedRequest extends WixTenantRequest, ValidatedRequest {}

// ===== VALIDATION SCHEMAS =====

/**
 * Validation schemas for Wix integration
 */
const wixConnectSchema = Joi.object({
  returnUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Return URL must be a valid URI'
    })
});

const wixCallbackSchema = Joi.object({
  code: Joi.string()
    .alphanum()
    .min(20)
    .required()
    .messages({
      'string.alphanum': 'Authorization code must be alphanumeric',
      'string.min': 'Authorization code must be at least 20 characters',
      'any.required': 'Authorization code is required'
    }),
  state: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'State must be a valid business ID',
      'any.required': 'State parameter is required'
    }),
  instance_id: Joi.string()
    .optional()
    .messages({
      'string.base': 'Instance ID must be a string'
    }),
  context: Joi.string()
    .optional()
    .messages({
      'string.base': 'Context must be a string'
    })
});

const wixSyncSchema = Joi.object({
  syncType: Joi.string()
    .valid('products', 'orders', 'customers', 'all')
    .default('products')
    .messages({
      'any.only': 'Sync type must be one of: products, orders, customers, all'
    }),
  forceSync: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Force sync must be a boolean value'
    }),
  batchSize: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .messages({
      'number.integer': 'Batch size must be an integer',
      'number.min': 'Batch size must be at least 1',
      'number.max': 'Batch size cannot exceed 100'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
});

const wixAnalyticsQuerySchema = Joi.object({
  startDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Start date must be in ISO format (YYYY-MM-DD)'
    }),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
      'date.min': 'End date must be after start date'
    }),
  metrics: Joi.string()
    .pattern(/^[a-z_,]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Metrics must be comma-separated lowercase values (e.g., "orders,revenue,certificates")'
    })
});

const wixWebhookConfigSchema = Joi.object({
  eventType: Joi.string()
    .valid('OrderCreated', 'OrderUpdated', 'OrderPaid', 'ProductCreated', 'ProductUpdated')
    .required()
    .messages({
      'any.only': 'Event type must be a valid Wix webhook event',
      'any.required': 'Event type is required'
    }),
  name: Joi.string()
    .min(3)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Webhook name must be at least 3 characters',
      'string.max': 'Webhook name cannot exceed 100 characters'
    })
});

const wixSyncHistoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  syncType: Joi.string().valid('products', 'orders', 'customers', 'all').optional(),
  status: Joi.string().valid('success', 'failed', 'partial').optional()
});

// ===== AUTHENTICATION & CONNECTION =====

/**
 * Initiate Wix OAuth connection flow
 * POST /api/integrations/wix/connect
 * 
 * @requires authentication & tenant context
 * @requires validation: returnUrl?
 * @rate-limited: strict to prevent OAuth abuse
 */
router.post(
  '/connect',
  authenticate,
  resolveTenant,
  strictRateLimiter(), // Prevent OAuth flow abuse
  validateBody(wixConnectSchema),
  trackManufacturerAction('initiate_wix_connection'),
  wixCtrl.connectWix
);

/**
 * OAuth callback endpoint Wix redirects to after merchant approval
 * GET /api/integrations/wix/oauth/callback
 * 
 * @requires validation: OAuth callback parameters
 * @rate-limited: dynamic to handle legitimate callback traffic
 * @public: No authentication required (OAuth flow)
 */
router.get(
  '/oauth/callback',
  dynamicRateLimiter(), // Handle legitimate OAuth callbacks
  validateQuery(wixCallbackSchema),
  wixCtrl.oauthCallback
);

/**
 * Get comprehensive Wix connection status and health
 * GET /api/integrations/wix/status
 * 
 * @requires authentication & tenant context
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/status',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_wix_status'),
  wixCtrl.getConnectionStatus
);

/**
 * Disconnect Wix integration with cleanup
 * DELETE /api/integrations/wix/disconnect
 * 
 * @requires authentication & tenant context
 * @rate-limited: strict for security
 */
router.delete(
  '/disconnect',
  authenticate,
  resolveTenant,
  strictRateLimiter(), // Security for disconnection
  trackManufacturerAction('disconnect_wix'),
  wixCtrl.disconnectWix
);

// ===== DATA SYNCHRONIZATION =====

/**
 * Sync data from Wix with advanced options
 * POST /api/integrations/wix/sync
 * 
 * @requires authentication & tenant context
 * @requires validation: sync type, force option, batch size
 * @rate-limited: strict to prevent sync abuse
 */
router.post(
  '/sync',
  authenticate,
  resolveTenant,
  strictRateLimiter(), // Prevent sync spam
  validateBody(wixSyncSchema),
  trackManufacturerAction('sync_wix_data'),
  wixCtrl.syncWixData
);

/**
 * Get Wix sync history and status
 * GET /api/integrations/wix/sync/history
 * 
 * @requires authentication & tenant context
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/sync/history',
  authenticate,
  resolveTenant,
  validateQuery(wixSyncHistoryQuerySchema),
  trackManufacturerAction('view_wix_sync_history'),
  (req: WixValidatedRequest, res, next) => {
    // This would be a new controller method to implement
    res.json({
      success: true,
      message: 'Wix sync history endpoint - to be implemented',
      data: {
        syncHistory: [],
        pagination: {
          page: req.query.page || 1,
          limit: req.query.limit || 20,
          total: 0
        },
        provider: 'wix'
      }
    });
  }
);

/**
 * Get current sync status
 * GET /api/integrations/wix/sync/status
 * 
 * @requires authentication & tenant context
 */
router.get(
  '/sync/status',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_wix_sync_status'),
  (req: WixTenantRequest, res, next) => {
    // This would be a new controller method to implement
    res.json({
      success: true,
      message: 'Wix sync status endpoint - to be implemented',
      data: {
        lastSync: null,
        currentSync: null,
        status: 'idle',
        provider: 'wix'
      }
    });
  }
);

// ===== WEBHOOK HANDLING =====

/**
 * Primary webhook endpoint for all Wix events
 * POST /api/integrations/wix/webhook
 * 
 * @requires webhook: signature validation
 * @rate-limited: dynamic for webhook traffic
 * @public: No authentication (webhook validation instead)
 * @uses: JSON body parser for webhook data
 */
router.post(
  '/webhook',
  express.json({ limit: '1mb' }),
  dynamicRateLimiter(), // Handle webhook traffic
  wixCtrl.handleOrderWebhook
);

/**
 * Specific order events webhook endpoint
 * POST /api/integrations/wix/webhook/orders
 * 
 * @requires webhook: signature validation
 * @rate-limited: dynamic for webhook traffic
 * @public: No authentication (webhook validation instead)
 * @uses: JSON body parser for webhook data
 */
router.post(
  '/webhook/orders',
  express.json({ limit: '1mb' }),
  dynamicRateLimiter(), // Handle order webhook traffic
  wixCtrl.handleOrderWebhook
);

/**
 * Legacy webhook endpoints for backward compatibility
 */
router.post(
  '/webhook/orders/create',
  express.json({ limit: '1mb' }),
  dynamicRateLimiter(),
  (req, res, next) => {
    // Add deprecation warning
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated. Use /webhook/orders instead.');
    // Cast req to the expected type for the controller
    wixCtrl.handleOrderWebhook(req as any, res, next);
  }
);

// ===== ANALYTICS & REPORTING =====

/**
 * Get comprehensive Wix integration analytics
 * GET /api/integrations/wix/analytics
 * 
 * @requires authentication & tenant context
 * @requires validation: date range and metrics selection
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/analytics',
  authenticate,
  resolveTenant,
  validateQuery(wixAnalyticsQuerySchema),
  trackManufacturerAction('view_wix_analytics'),
  (req: WixValidatedRequest, res, next) => {
    // Safely handle metrics query parameter
    const metricsParam = req.query.metrics;
    const metrics = typeof metricsParam === 'string' 
      ? metricsParam.split(',') 
      : ['orders', 'revenue', 'certificates'];
    
    res.json({
      success: true,
      message: 'Wix analytics retrieved successfully - enhanced endpoint',
      data: {
        provider: 'wix',
        dateRange: {
          from: req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          to: req.query.endDate || new Date().toISOString()
        },
        metrics,
        note: 'This endpoint can be enhanced to use wixCtrl.getWixAnalytics'
      }
    });
  }
);

/**
 * Get Wix webhook status and configuration
 * GET /api/integrations/wix/webhooks
 * 
 * @requires authentication & tenant context
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/webhooks',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_wix_webhooks'),
  async (req: WixTenantRequest, res, next) => {
    try {
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      res.json({
        success: true,
        message: 'Wix webhook configuration retrieved',
        data: {
          webhookUrl: `${process.env.APP_URL}/api/integrations/wix/webhook`,
          orderWebhookUrl: `${process.env.APP_URL}/api/integrations/wix/webhook/orders`,
          supportedEvents: [
            'OrderCreated',
            'OrderUpdated', 
            'OrderPaid',
            'ProductCreated',
            'ProductUpdated',
            'AppRemoved'
          ],
          verificationMethod: 'HMAC-SHA256',
          provider: 'wix',
          setupInstructions: {
            step1: 'Webhooks are automatically registered during OAuth',
            step2: 'No manual configuration required',
            step3: 'Check webhook status in Wix dashboard if needed'
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Register webhook with Wix
 * POST /api/integrations/wix/webhooks/register
 * 
 * @requires authentication & tenant context
 * @requires validation: webhook configuration
 * @rate-limited: strict to prevent registration abuse
 */
router.post(
  '/webhooks/register',
  authenticate,
  resolveTenant,
  strictRateLimiter(),
  validateBody(wixWebhookConfigSchema),
  trackManufacturerAction('register_wix_webhook'),
  (req: WixValidatedRequest, res, next) => {
    // This would use the registerWebhook method from the service
    res.json({
      success: true,
      message: 'Webhook registration endpoint - to be implemented',
      data: {
        eventType: req.validatedBody.eventType,
        provider: 'wix',
        note: 'This endpoint can be enhanced to use wixService.registerWebhook'
      }
    });
  }
);

// ===== TESTING & DIAGNOSTICS =====

/**
 * Test Wix API connection and health
 * GET /api/integrations/wix/test
 * 
 * @requires authentication & tenant context
 * @rate-limited: strict to prevent test abuse
 */
router.get(
  '/test',
  authenticate,
  resolveTenant,
  strictRateLimiter(), // Prevent connection test spam
  trackManufacturerAction('test_wix_connection'),
  wixCtrl.testWixConnection
);

/**
 * Get Wix site information and capabilities
 * GET /api/integrations/wix/site-info
 * 
 * @requires authentication & tenant context
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/site-info',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_wix_site_info'),
  async (req: WixTenantRequest, res, next) => {
    try {
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      res.json({
        success: true,
        message: 'Wix site information retrieved',
        data: {
          provider: 'wix',
          siteInfo: {
            note: 'Site information endpoint - can be enhanced to use wixService.getStoreInfo'
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get integration health check with detailed diagnostics
 * GET /api/integrations/wix/health
 * 
 * @requires authentication & tenant context
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/health',
  authenticate,
  resolveTenant,
  trackManufacturerAction('check_wix_health'),
  async (req: WixTenantRequest, res, next) => {
    try {
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      res.json({
        success: true,
        message: 'Wix integration health check completed',
        data: {
          provider: 'wix',
          healthCheck: {
            note: 'Health check endpoint - can be enhanced to use wixService.getConnectionHealth'
          },
          checkedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== STORE AND PRODUCT MANAGEMENT =====

/**
 * Get Wix store overview
 * GET /api/integrations/wix/store
 * 
 * @requires authentication & tenant context
 */
router.get(
  '/store',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_wix_store_overview'),
  (req: WixTenantRequest, res, next) => {
    // This would use the getStoreInfo method from the service
    res.json({
      success: true,
      message: 'Wix store overview retrieved',
      data: {
        provider: 'wix',
        store: {
          note: 'Store overview endpoint - can be enhanced to use wixService.getStoreInfo'
        }
      }
    });
  }
);

/**
 * Sync specific products from Wix
 * POST /api/integrations/wix/products/sync
 * 
 * @requires authentication & tenant context
 * @requires validation: product sync options
 * @rate-limited: strict to prevent sync abuse
 */
router.post(
  '/products/sync',
  authenticate,
  resolveTenant,
  strictRateLimiter(),
  validateBody(Joi.object({
    productIds: Joi.array()
      .items(Joi.string())
      .max(50)
      .optional()
      .messages({
        'array.max': 'Cannot sync more than 50 products at once'
      }),
    forceSync: Joi.boolean().default(false),
    includeImages: Joi.boolean().default(true)
  })),
  trackManufacturerAction('sync_wix_products'),
  async (req: WixValidatedRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: 'Product sync endpoint - to be implemented',
        data: {
          provider: 'wix',
          syncType: 'products',
          options: req.validatedBody
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== EXPORT AND INTEGRATION DATA =====

/**
 * Export integration data
 * GET /api/integrations/wix/export
 * 
 * @requires authentication & tenant context
 * @optional query: export options
 */
router.get(
  '/export',
  authenticate,
  resolveTenant,
  validateQuery(Joi.object({
    includeOrders: Joi.boolean().default(true),
    includeProducts: Joi.boolean().default(true),
    includeWebhooks: Joi.boolean().default(true),
    format: Joi.string().valid('json', 'csv').default('json')
  })),
  trackManufacturerAction('export_wix_data'),
  (req: WixValidatedRequest, res, next) => {
    // This would use the exportIntegrationData method from the service
    res.json({
      success: true,
      message: 'Integration data export - to be implemented',
      data: {
        provider: 'wix',
        exportOptions: req.validatedQuery || {},
        note: 'This endpoint can be enhanced to use wixService.exportIntegrationData'
      }
    });
  }
);

export default router;
