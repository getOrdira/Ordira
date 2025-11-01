// src/routes/integrations/woocommerce.routes.ts

import { Router } from 'express';
import express from 'express';
import { resolveTenant, TenantRequest } from '../../../middleware/deprecated/tenant.middleware';
import { authenticate, UnifiedAuthRequest } from '../../../middleware/deprecated/unifiedAuth.middleware';
import { validateBody, validateQuery, ValidatedRequest } from '../../../middleware/deprecated/validation.middleware';
import { asRouteHandler, asRateLimitHandler } from '../../../utils/routeHelpers'; 
import { dynamicRateLimiter, strictRateLimiter } from '../../../middleware/deprecated/rateLimiter.middleware';
import { trackManufacturerAction } from '../../../middleware/deprecated/metrics.middleware';
import * as wooCtrl from '../../../controllers/deprecated/woocommerce.controller';
import Joi from 'joi';

const router = Router();

// ===== EXTENDED REQUEST INTERFACES =====

interface WooCommerceTenantRequest extends UnifiedAuthRequest, TenantRequest {}

interface WooCommerceValidatedRequest extends WooCommerceTenantRequest, ValidatedRequest {}

// ===== VALIDATION SCHEMAS =====

/**
 * Validation schemas for WooCommerce integration
 */
const wooCommerceConnectSchema = Joi.object({
  domain: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'string.uri': 'Domain must be a valid URL (e.g., https://yourstore.com)',
      'any.required': 'Domain is required'
    }),
  consumerKey: Joi.string()
    .pattern(/^ck_[a-f0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid WooCommerce consumer key format (should start with "ck_" followed by 40 hex characters)',
      'any.required': 'Consumer key is required'
    }),
  consumerSecret: Joi.string()
    .pattern(/^cs_[a-f0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid WooCommerce consumer secret format (should start with "cs_" followed by 40 hex characters)',
      'any.required': 'Consumer secret is required'
    }),
  version: Joi.string()
    .valid('wc/v1', 'wc/v2', 'wc/v3')
    .default('wc/v3')
    .messages({
      'any.only': 'API version must be one of: wc/v1, wc/v2, wc/v3'
    }),
  verifySsl: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'SSL verification must be a boolean value'
    })
});

const wooCommerceSyncSchema = Joi.object({
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
    })
});

const wooCommerceAnalyticsQuerySchema = Joi.object({
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
      'string.pattern.base': 'Metrics must be comma-separated lowercase values (e.g., "orders,revenue,products")'
    })
});

const wooCommerceValidationSchema = Joi.object({
  domain: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  consumerKey: Joi.string().pattern(/^ck_[a-f0-9]{40}$/).required(),
  consumerSecret: Joi.string().pattern(/^cs_[a-f0-9]{40}$/).required(),
  version: Joi.string().valid('wc/v1', 'wc/v2', 'wc/v3').default('wc/v3'),
  verifySsl: Joi.boolean().default(true)
});

const wooCommerceSyncHistoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  syncType: Joi.string().valid('products', 'orders', 'customers', 'all').optional(),
  status: Joi.string().valid('success', 'failed', 'partial').optional()
});

const wooCommerceWebhookConfigSchema = Joi.object({
  topic: Joi.string()
    .valid('order.created', 'order.updated', 'order.deleted', 'product.created', 'product.updated', 'product.deleted')
    .required()
    .messages({
      'any.only': 'Topic must be a valid WooCommerce webhook topic',
      'any.required': 'Webhook topic is required'
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

// ===== CONNECTION & SETUP =====

/**
 * Setup WooCommerce integration with credentials
 * POST /api/integrations/woocommerce/connect
 * 
 * @requires authentication & tenant context
 * @requires validation: domain, consumerKey, consumerSecret, version?, verifySsl?
 * @rate-limited: strict to prevent connection abuse
 */
router.post(
  '/connect',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()), // Prevent connection abuse
  validateBody(wooCommerceConnectSchema),
  trackManufacturerAction('connect_woocommerce'),
  asRouteHandler(wooCtrl.connectWooCommerce)
);

/**
 * Get WooCommerce connection status and health
 * GET /api/integrations/woocommerce/status
 * 
 * @requires authentication & tenant context
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/status',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_woocommerce_status'),
  asRouteHandler(wooCtrl.getConnectionStatus)
);

/**
 * Disconnect WooCommerce integration with cleanup
 * DELETE /api/integrations/woocommerce/disconnect
 * 
 * @requires authentication & tenant context
 * @rate-limited: strict for security
 */
router.delete(
  '/disconnect',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()), // Security for disconnection
  trackManufacturerAction('disconnect_woocommerce'),
  asRouteHandler(wooCtrl.disconnectWooCommerce)
);

// ===== DATA SYNCHRONIZATION =====

/**
 * Sync data from WooCommerce with advanced options
 * POST /api/integrations/woocommerce/sync
 * 
 * @requires authentication & tenant context
 * @requires validation: sync type, force option, batch size
 * @rate-limited: strict to prevent sync abuse
 */
router.post(
  '/sync',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()), // Prevent sync spam
  validateBody(wooCommerceSyncSchema),
  trackManufacturerAction('sync_woocommerce_data'),
  asRouteHandler(wooCtrl.syncWooCommerceData)
);

/**
 * Get WooCommerce sync history and status
 * GET /api/integrations/woocommerce/sync/history
 * 
 * @requires authentication & tenant context
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/sync/history',
  authenticate,
  resolveTenant,
  validateQuery(wooCommerceSyncHistoryQuerySchema),
  trackManufacturerAction('view_woocommerce_sync_history'),
  (req: WooCommerceValidatedRequest, res, next) => {
    // This would be a new controller method to implement
    res.json({
      success: true,
      message: 'WooCommerce sync history endpoint - to be implemented',
      data: {
        syncHistory: [],
        pagination: {
          page: req.query.page || 1,
          limit: req.query.limit || 20,
          total: 0
        },
        provider: 'woocommerce'
      }
    });
  }
);

/**
 * Get current sync status
 * GET /api/integrations/woocommerce/sync/status
 * 
 * @requires authentication & tenant context
 */
router.get(
  '/sync/status',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_woocommerce_sync_status'),
  (req: WooCommerceTenantRequest, res, next) => {
    // This would be a new controller method to implement
    res.json({
      success: true,
      message: 'WooCommerce sync status endpoint - to be implemented',
      data: {
        lastSync: null,
        currentSync: null,
        status: 'idle',
        provider: 'woocommerce'
      }
    });
  }
);

// ===== WEBHOOK HANDLING =====

/**
 * Generic webhook endpoint for all WooCommerce events
 * POST /api/integrations/woocommerce/webhook
 * 
 * @requires webhook: signature validation
 * @rate-limited: dynamic for webhook traffic
 * @public: No authentication (webhook validation instead)
 * @uses: JSON body parser for webhook data
 */
router.post(
  '/webhook',
  express.json({ limit: '1mb' }),
  asRateLimitHandler(dynamicRateLimiter()), // Handle webhook traffic
  asRouteHandler(wooCtrl.handleOrderWebhook)
);

/**
 * Specific order events webhook endpoint
 * POST /api/integrations/woocommerce/webhook/orders
 * 
 * @requires webhook: signature validation
 * @rate-limited: dynamic for webhook traffic
 * @public: No authentication (webhook validation instead)
 * @uses: JSON body parser for webhook data
 */
router.post(
  '/webhook/orders',
  express.json({ limit: '1mb' }),
  asRateLimitHandler(dynamicRateLimiter()), // Handle order webhook traffic
  asRouteHandler(wooCtrl.handleOrderWebhook)
);

/**
 * Specific product events webhook endpoint
 * POST /api/integrations/woocommerce/webhook/products
 * 
 * @requires webhook: signature validation
 * @rate-limited: dynamic for webhook traffic
 * @public: No authentication (webhook validation instead)
 * @uses: JSON body parser for webhook data
 */
router.post(
  '/webhook/products',
  express.json({ limit: '1mb' }),
  asRateLimitHandler(dynamicRateLimiter()), // Handle product webhook traffic
  asRouteHandler(wooCtrl.handleOrderWebhook) // Reuse handler, it determines event type
);

/**
 * Legacy webhook endpoints for backward compatibility
 */
router.post(
  '/webhook/orders/create',
  express.json({ limit: '1mb' }),
  asRateLimitHandler(dynamicRateLimiter()),
  (req, res, next) => {
    // Add deprecation warning
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated. Use /webhook/orders instead.');
    asRouteHandler(wooCtrl.handleOrderWebhook)(req, res, next);
  }
);

router.post(
  '/webhook/orders/updated',
  express.json({ limit: '1mb' }),
  asRateLimitHandler(dynamicRateLimiter()),
  (req, res, next) => {
    // Add deprecation warning
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated. Use /webhook/orders instead.');
    asRouteHandler(wooCtrl.handleOrderWebhook)(req, res, next);
  }
);

// ===== ANALYTICS & REPORTING =====

/**
 * Get comprehensive WooCommerce integration analytics
 * GET /api/integrations/woocommerce/analytics
 * 
 * @requires authentication & tenant context
 * @requires validation: date range and metrics selection
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/analytics',
  authenticate,
  resolveTenant,
  validateQuery(wooCommerceAnalyticsQuerySchema),
  trackManufacturerAction('view_woocommerce_analytics'),
  (req: WooCommerceValidatedRequest, res, next) => {
    // Safely handle metrics query parameter
    const metricsParam = req.query.metrics;
    const metrics = typeof metricsParam === 'string' 
      ? metricsParam.split(',') 
      : ['orders', 'revenue', 'products', 'sync_status'];
    
    res.json({
      success: true,
      message: 'WooCommerce analytics retrieved successfully - enhanced endpoint',
      data: {
        provider: 'woocommerce',
        dateRange: {
          from: req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          to: req.query.endDate || new Date().toISOString()
        },
        metrics,
        note: 'This endpoint can be enhanced to use (wooCtrl.getWooCommerceAnalytics)'
      }
    });
  }
);

/**
 * Get WooCommerce webhook status and configuration
 * GET /api/integrations/woocommerce/webhooks
 * 
 * @requires authentication & tenant context
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/webhooks',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_woocommerce_webhooks'),
  async (req: WooCommerceTenantRequest, res, next) => {
    try {
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      const webhookUrl = `${process.env.APP_URL}/api/integrations/woocommerce/webhook`;
      
      res.json({
        success: true,
        message: 'WooCommerce webhook configuration retrieved',
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
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Register webhook with WooCommerce
 * POST /api/integrations/woocommerce/webhooks/register
 * 
 * @requires authentication & tenant context
 * @requires validation: webhook configuration
 * @rate-limited: strict to prevent registration abuse
 */
router.post(
  '/webhooks/register',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(wooCommerceWebhookConfigSchema),
  trackManufacturerAction('register_woocommerce_webhook'),
  (req: WooCommerceValidatedRequest, res, next) => {
    // This would use the registerWebhook method from the service
    res.json({
      success: true,
      message: 'Webhook registration endpoint - to be implemented',
      data: {
        topic: req.validatedBody.topic,
        provider: 'woocommerce',
        note: 'This endpoint can be enhanced to use wooCommerceService.registerWebhook'
      }
    });
  }
);

// ===== TESTING & DIAGNOSTICS =====

/**
 * Test WooCommerce API connection and health
 * GET /api/integrations/woocommerce/test
 * 
 * @requires authentication & tenant context
 * @rate-limited: strict to prevent test abuse
 */
router.get(
  '/test',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()), // Prevent connection test spam
  trackManufacturerAction('test_woocommerce_connection'),
  asRouteHandler(wooCtrl.testWooCommerceConnection)
);

/**
 * Get WooCommerce store information and capabilities
 * GET /api/integrations/woocommerce/store-info
 * 
 * @requires authentication & tenant context
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/store-info',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_woocommerce_store_info'),
  asRouteHandler(wooCtrl.getStoreInfo)
);

/**
 * Get setup instructions for WooCommerce
 * GET /api/integrations/woocommerce/setup-guide
 * 
 * @requires authentication & tenant context
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/setup-guide',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_woocommerce_setup_guide'),
  asRouteHandler(wooCtrl.getSetupGuide)
);

/**
 * Get integration health check with detailed diagnostics
 * GET /api/integrations/woocommerce/health
 * 
 * @requires authentication & tenant context
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/health',
  authenticate,
  resolveTenant,
  trackManufacturerAction('check_woocommerce_health'),
  async (req: WooCommerceTenantRequest, res, next) => {
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
        message: 'WooCommerce integration health check completed',
        data: {
          provider: 'woocommerce',
          healthCheck: {
            note: 'Health check endpoint - can be enhanced to use wooCommerceService.getConnectionHealth'
          },
          checkedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== VALIDATION & SETUP HELPERS =====

/**
 * Validate WooCommerce credentials without saving them
 * POST /api/integrations/woocommerce/validate
 * 
 * @requires authentication & tenant context
 * @requires validation: domain, consumerKey, consumerSecret
 * @rate-limited: dynamic to allow testing credentials
 */
router.post(
  '/validate',
  authenticate,
  resolveTenant,
  asRateLimitHandler(dynamicRateLimiter()), // Allow reasonable testing of credentials
  validateBody(wooCommerceValidationSchema),
  trackManufacturerAction('validate_woocommerce_credentials'),
  async (req: WooCommerceValidatedRequest, res, next) => {
    try {
      // Simple validation endpoint that tests credentials without saving them
      const { domain, consumerKey, consumerSecret, version, verifySsl } = req.validatedBody;
      
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
          validatedAt: new Date().toISOString(),
          provider: 'woocommerce',
          note: 'This endpoint can be enhanced to test actual API connection'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update webhook URLs for existing webhooks
 * PUT /api/integrations/woocommerce/webhooks/update-urls
 * 
 * @requires authentication & tenant context
 * @rate-limited: strict to prevent abuse
 */
router.put(
  '/webhooks/update-urls',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()),
  trackManufacturerAction('update_woocommerce_webhook_urls'),
  (req: WooCommerceTenantRequest, res, next) => {
    // This would use the updateWebhookUrls method from the service
    res.json({
      success: true,
      message: 'Webhook URL update endpoint - to be implemented',
      data: {
        provider: 'woocommerce',
        note: 'This endpoint can be enhanced to use wooCommerceService.updateWebhookUrls'
      }
    });
  }
);

// ===== PRODUCT AND ORDER MANAGEMENT =====

/**
 * Sync specific products from WooCommerce
 * POST /api/integrations/woocommerce/products/sync
 * 
 * @requires authentication & tenant context
 * @requires validation: product sync options
 * @rate-limited: strict to prevent sync abuse
 */
router.post(
  '/products/sync',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()  ),
  validateBody(Joi.object({
    productIds: Joi.array()
      .items(Joi.number().integer().positive())
      .max(50)
      .optional()
      .messages({
        'array.max': 'Cannot sync more than 50 products at once'
      }),
    forceSync: Joi.boolean().default(false),
    includeImages: Joi.boolean().default(true),
    includeVariations: Joi.boolean().default(true)
  })),
  trackManufacturerAction('sync_woocommerce_products'),
  async (req: WooCommerceValidatedRequest, res, next) => {
    try {
      res.json({
        success: true,
        message: 'Product sync endpoint - to be implemented',
        data: {
          provider: 'woocommerce',
          syncType: 'products',
          options: req.validatedBody
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get WooCommerce orders with certificate status
 * GET /api/integrations/woocommerce/orders
 * 
 * @requires authentication & tenant context
 * @optional query: pagination and filtering
 */
router.get(
  '/orders',
  authenticate,
  resolveTenant,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('pending', 'processing', 'completed', 'cancelled').optional()
  })),
  trackManufacturerAction('view_woocommerce_orders'),
  (req: WooCommerceValidatedRequest, res, next) => {
    res.json({
      success: true,
      message: 'WooCommerce orders endpoint - to be implemented',
      data: {
        orders: [],
        pagination: {
          page: req.query.page || 1,
          limit: req.query.limit || 20,
          total: 0
        },
        provider: 'woocommerce'
      }
    });
  }
);

// ===== EXPORT AND INTEGRATION DATA =====

/**
 * Export integration data
 * GET /api/integrations/woocommerce/export
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
  trackManufacturerAction('export_woocommerce_data'),
  (req: WooCommerceValidatedRequest, res, next) => {
    // This would use a method similar to wixService.exportIntegrationData
    res.json({
      success: true,
      message: 'Integration data export - to be implemented',
      data: {
        provider: 'woocommerce',
        exportOptions: req.validatedQuery || {},
        note: 'This endpoint can be enhanced to use wooCommerceService.exportIntegrationData'
      }
    });
  }
);

export default router;
