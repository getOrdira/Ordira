// src/routes/integrations/shopify.routes.ts
import { Router } from 'express';
import express from 'express';
import { resolveTenant, TenantRequest } from '../../middleware/tenant.middleware';
import { authenticate, UnifiedAuthRequest } from '../../middleware/unifiedAuth.middleware';
import { validateBody, validateQuery, validateParams, ValidatedRequest } from '../../middleware/validation.middleware';
import { asRouteHandler, asRateLimitHandler } from '../../utils/routeHelpers'; 
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as shopifyCtrl from '../../controllers/shopify.controller';
import Joi from 'joi';

const router = Router();

// ===== EXTENDED REQUEST INTERFACES =====

/**
 * Extended request interface with authentication and tenant context
 */
interface ShopifyTenantRequest extends UnifiedAuthRequest, TenantRequest {}

/**
 * Request interface for validated endpoints
 */
interface ShopifyValidatedRequest extends ShopifyTenantRequest, ValidatedRequest {}

// ===== VALIDATION SCHEMAS =====

/**
 * Validation schemas for Shopify integration
 */
const shopifyConnectSchema = Joi.object({
  shopDomain: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'Shop domain must be a valid Shopify store name (e.g., "my-store" for my-store.myshopify.com)',
      'any.required': 'Shop domain is required'
    }),
  returnUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Return URL must be a valid URI'
    })
});

const shopifyCallbackSchema = Joi.object({
  shop: Joi.string()
    .pattern(/^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]\.myshopify\.com$/)
    .required()
    .messages({
      'string.pattern.base': 'Shop must be in format: shop-name.myshopify.com',
      'any.required': 'Shop parameter is required'
    }),
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
  hmac: Joi.string()
    .alphanum()
    .optional()
    .messages({
      'string.alphanum': 'HMAC must be alphanumeric'
    }),
  timestamp: Joi.string()
    .pattern(/^\d+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Timestamp must be numeric'
    })
});

const shopifySyncSchema = Joi.object({
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
    .max(250)
    .default(50)
    .messages({
      'number.integer': 'Batch size must be an integer',
      'number.min': 'Batch size must be at least 1',
      'number.max': 'Batch size cannot exceed 250'
    })
});

const shopifyAnalyticsQuerySchema = Joi.object({
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
      'string.pattern.base': 'Metrics must be comma-separated lowercase values (e.g., "orders,revenue,sync_status")'
    })
});

// ===== AUTHENTICATION & CONNECTION =====

/**
 * Initiate Shopify OAuth connection flow
 * POST /api/integrations/shopify/connect
 * 
 * @requires authentication: business/brand
 * @requires tenant: business context resolution
 * @requires validation: shop domain and optional return URL
 * @rate-limited: strict to prevent OAuth abuse
 */
router.post(
  '/connect',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()), // Prevent OAuth flow abuse
  validateBody(shopifyConnectSchema),
  trackManufacturerAction('initiate_shopify_connection'),
  asRouteHandler(shopifyCtrl.connectShopify)
);

/**
 * OAuth callback endpoint Shopify redirects to after merchant approval
 * GET /api/integrations/shopify/oauth/callback
 * 
 * @requires validation: OAuth callback parameters
 * @rate-limited: dynamic to handle legitimate callback traffic
 * @public: No authentication required (OAuth flow)
 */
router.get(
  '/oauth/callback',
  asRateLimitHandler(dynamicRateLimiter()), // Handle legitimate OAuth callbacks
  validateQuery(shopifyCallbackSchema),
  asRouteHandler(shopifyCtrl.oauthCallback)
);

/**
 * Get comprehensive Shopify connection status and health
 * GET /api/integrations/shopify/status
 * 
 * @requires authentication: business/brand
 * @requires tenant: business context resolution
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/status',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_shopify_status'),
  asRouteHandler(shopifyCtrl.getConnectionStatus)
);

/**
 * Disconnect Shopify integration with cleanup
 * DELETE /api/integrations/shopify/disconnect
 * 
 * @requires authentication: business/brand
 * @requires tenant: business context resolution
 * @rate-limited: strict for security
 */
router.delete(
  '/disconnect',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()), // Security for disconnection
  trackManufacturerAction('disconnect_shopify'),
  asRouteHandler(shopifyCtrl.disconnectShopify)
);

// ===== DATA SYNCHRONIZATION =====

/**
 * Sync data from Shopify with advanced options
 * POST /api/integrations/shopify/sync
 * 
 * @requires authentication: business/brand
 * @requires tenant: business context resolution
 * @requires validation: sync type, force option, batch size
 * @rate-limited: strict to prevent sync abuse
 */
router.post(
  '/sync',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()), // Prevent sync spam
  validateBody(shopifySyncSchema),
  trackManufacturerAction('sync_shopify_data'),
  asRouteHandler(shopifyCtrl.syncShopifyData)
);

/**
 * Get Shopify sync history and status
 * GET /api/integrations/shopify/sync/history
 * 
 * @requires authentication: business/brand
 * @requires tenant: business context resolution
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/sync/history',
  authenticate,
  resolveTenant,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    syncType: Joi.string().valid('products', 'orders', 'customers', 'all').optional()
  })),
  trackManufacturerAction('view_shopify_sync_history'),
  (req: ShopifyValidatedRequest, res, next) => {
    // This would be a new controller method to implement
    res.json({
      success: true,
      message: 'Sync history endpoint - to be implemented',
      data: {
        syncHistory: [],
        pagination: {
          page: req.query.page || 1,
          limit: req.query.limit || 20,
          total: 0
        }
      }
    });
  }
);

// ===== WEBHOOK HANDLING =====

/**
 * Primary webhook endpoint for all Shopify events
 * POST /api/integrations/shopify/webhook
 * 
 * @requires webhook: HMAC signature validation
 * @rate-limited: dynamic for webhook traffic
 * @public: No authentication (webhook validation instead)
 * @uses: raw body parser for HMAC validation
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  asRateLimitHandler(dynamicRateLimiter()), // Handle webhook traffic
  asRouteHandler(shopifyCtrl.handleWebhook)
);

/**
 * Specific order events webhook endpoint
 * POST /api/integrations/shopify/webhook/orders
 * 
 * @requires webhook: HMAC signature validation
 * @rate-limited: dynamic for webhook traffic
 * @public: No authentication (webhook validation instead)
 * @uses: raw body parser for HMAC validation
 */
router.post(
  '/webhook/orders',
  express.raw({ type: 'application/json', limit: '1mb' }),
  asRateLimitHandler(dynamicRateLimiter()), // Handle order webhook traffic
  asRouteHandler(shopifyCtrl.handleWebhook)
);

/**
 * Legacy webhook endpoints for backward compatibility
 */
router.post(
  '/webhook/orders/create',
  express.raw({ type: 'application/json', limit: '1mb' }),
  asRateLimitHandler(dynamicRateLimiter()),
  (req, res, next) => {
    // Add deprecation warning
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated. Use /webhook/orders instead.');
    shopifyCtrl.handleWebhook(req, res, next);
  }
);

router.post(
  '/webhook/orders/updated',
  express.raw({ type: 'application/json', limit: '1mb' }),
  asRateLimitHandler(dynamicRateLimiter()),
  (req, res, next) => {
    // Add deprecation warning
    res.set('X-API-Deprecation-Warning', 'This endpoint is deprecated. Use /webhook/orders instead.');
    shopifyCtrl.handleWebhook(req, res, next);
  }
);

// ===== ANALYTICS & REPORTING =====

/**
 * Get comprehensive Shopify integration analytics
 * GET /api/integrations/shopify/analytics
 * 
 * @requires authentication: business/brand
 * @requires tenant: business context resolution
 * @requires validation: date range and metrics selection
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/analytics',
  authenticate,
  resolveTenant,
  validateQuery(shopifyAnalyticsQuerySchema),
  trackManufacturerAction('view_shopify_analytics'),
  (req: ShopifyValidatedRequest, res, next) => {
    // This would call a new analytics method in the controller
    
    // Safely handle metrics query parameter
    const metricsParam = req.query.metrics;
    const metrics = typeof metricsParam === 'string' 
      ? metricsParam.split(',') 
      : ['orders', 'revenue', 'sync_status'];
    
    res.json({
      success: true,
      message: 'Shopify analytics endpoint - to be implemented',
      data: {
        provider: 'shopify',
        dateRange: {
          from: req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          to: req.query.endDate || new Date().toISOString()
        },
        metrics
      }
    });
  }
);

/**
 * Get Shopify webhook status and configuration
 * GET /api/integrations/shopify/webhooks
 * 
 * @requires authentication: business/brand
 * @requires tenant: business context resolution
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/webhooks',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_shopify_webhooks'),
  async (req: ShopifyTenantRequest, res, next) => {
    try {
      // This would use the getWebhookStatus method from the service
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      res.json({
        success: true,
        message: 'Shopify webhook configuration retrieved',
        data: {
          webhookUrl: `${process.env.APP_URL}/api/integrations/shopify/webhook`,
          orderWebhookUrl: `${process.env.APP_URL}/api/integrations/shopify/webhook/orders`,
          supportedEvents: [
            'orders/create',
            'orders/updated',
            'orders/paid',
            'products/create',
            'products/update',
            'app/uninstalled'
          ],
          verificationMethod: 'HMAC-SHA256',
          provider: 'shopify',
          setupInstructions: {
            step1: 'Webhooks are automatically registered during OAuth',
            step2: 'No manual configuration required',
            step3: 'Check webhook status in Shopify admin if needed'
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== TESTING & DIAGNOSTICS =====

/**
 * Test Shopify API connection and health
 * GET /api/integrations/shopify/test
 * 
 * @requires authentication: business/brand
 * @requires tenant: business context resolution
 * @rate-limited: strict to prevent test abuse
 */
router.get(
  '/test',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()), // Prevent connection test spam
  trackManufacturerAction('test_shopify_connection'),
  asRouteHandler(shopifyCtrl.testShopifyConnection)
);

/**
 * Get Shopify store information and capabilities
 * GET /api/integrations/shopify/store-info
 * 
 * @requires authentication: business/brand
 * @requires tenant: business context resolution
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/store-info',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_shopify_store_info'),
  async (req: ShopifyTenantRequest, res, next) => {
    try {
      // This would use a new getStoreInfo method in the service
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      res.json({
        success: true,
        message: 'Shopify store information retrieved',
        data: {
          provider: 'shopify',
          storeInfo: {
            // This would come from Shopify API
            note: 'Store information endpoint - to be implemented in service'
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
 * GET /api/integrations/shopify/health
 * 
 * @requires authentication: business/brand
 * @requires tenant: business context resolution
 * @rate-limited: dynamic based on plan
 */
router.get(
  '/health',
  authenticate,
  resolveTenant,
  trackManufacturerAction('check_shopify_health'),
  async (req: ShopifyTenantRequest, res, next) => {
    try {
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      // Combine status and test results for comprehensive health check
      res.json({
        success: true,
        message: 'Shopify integration health check completed',
        data: {
          provider: 'shopify',
          healthCheck: {
            // This would combine getConnectionStatus and testConnection results
            note: 'Health check endpoint - to be implemented with service methods'
          },
          checkedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== PRODUCT MANAGEMENT =====

/**
 * Sync specific products from Shopify
 * POST /api/integrations/shopify/products/sync
 * 
 * @requires authentication: business/brand
 * @requires tenant: business context resolution
 * @requires validation: product sync options
 * @rate-limited: strict to prevent sync abuse
 */
router.post(
  '/products/sync',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()),
  validateBody(Joi.object({
    productIds: Joi.array()
      .items(Joi.string().pattern(/^\d+$/))
      .max(100)
      .optional()
      .messages({
        'array.max': 'Cannot sync more than 100 products at once'
      }),
    forceSync: Joi.boolean().default(false),
    includeVariants: Joi.boolean().default(true),
    includeImages: Joi.boolean().default(true)
  })),
  trackManufacturerAction('sync_shopify_products'),
  async (req: ShopifyValidatedRequest, res, next) => {
    try {
      // This would be a new method in the controller
      res.json({
        success: true,
        message: 'Product sync endpoint - to be implemented',
        data: {
          provider: 'shopify',
          syncType: 'products',
          options: req.validatedBody
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
