
// src/routes/integrations.routes.ts
import { Router } from 'express';
import { logger } from '../utils/logger';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/unifiedAuth.middleware';
import { resolveTenant, TenantRequest } from '../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { asRouteHandler, asRateLimitHandler } from '../utils/routeHelpers';

// Import individual integration routers
import shopifyRouter from './integrations/shopify.routes';
import wooRouter from './integrations/woocommerce.routes';
import wixRouter from './integrations/wix.routes';

// Import joi for validation
import Joi from 'joi';

const integrationsRouter = Router();

// ===== EXTENDED REQUEST INTERFACES =====

/**
 * Extended request interface with authentication and tenant context
 */
interface IntegrationsTenantRequest extends TenantRequest {
  userId?: string;
}

// ===== VALIDATION SCHEMAS =====

const integrationsOverviewQuerySchema = Joi.object({
  includeHealth: Joi.boolean().default(true),
  includeAnalytics: Joi.boolean().default(false),
  includeWebhooks: Joi.boolean().default(false)
});

const integrationTestSchema = Joi.object({
  providers: Joi.array()
    .items(Joi.string().valid('shopify', 'woocommerce', 'wix'))
    .min(1)
    .default(['shopify', 'woocommerce', 'wix']),
  includeWebhooks: Joi.boolean().default(false)
});

const bulkSyncSchema = Joi.object({
  providers: Joi.array()
    .items(Joi.string().valid('shopify', 'woocommerce', 'wix'))
    .min(1)
    .required(),
  syncType: Joi.string()
    .valid('products', 'orders', 'customers', 'all')
    .default('products'),
  forceSync: Joi.boolean().default(false)
});

// ===== GLOBAL MIDDLEWARE =====

// Apply dynamic rate limiting to all integration routes
integrationsRouter.use(asRateLimitHandler(dynamicRateLimiter()));

// ===== INTEGRATION OVERVIEW & MANAGEMENT =====

/**
 * Get comprehensive integrations overview
 * GET /api/integrations
 * 
 * @requires authentication & tenant context
 * @optional query: includeHealth, includeAnalytics, includeWebhooks
 * @returns overview of all integrations with status and health
 */
integrationsRouter.get(
  '/',
  authenticate,
  resolveTenant,
  validateQuery(integrationsOverviewQuerySchema),
  trackManufacturerAction('view_integrations_overview'),
  async (req: IntegrationsTenantRequest, res, next) => {
    try {
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      const { includeHealth, includeAnalytics, includeWebhooks } = req.query;

      // This would aggregate data from all integration services
      // For now, returning a structured response that can be enhanced
      res.json({
        success: true,
        message: 'Integrations overview retrieved successfully',
        data: {
          businessId,
          overview: {
            total: 3,
            connected: 0, // This would be calculated from actual services
            available: 3,
            health: 'unknown' // This would be aggregated from health checks
          },
          integrations: {
            shopify: {
              provider: 'shopify',
              name: 'Shopify',
              description: 'Sync products and orders from your Shopify store',
              category: 'ecommerce',
              status: 'available', // 'connected', 'available', 'disconnected'
              features: ['product_sync', 'order_webhooks', 'inventory_sync'],
              setupUrl: '/api/integrations/shopify/connect',
              docsUrl: '/docs/integrations/shopify'
            },
            woocommerce: {
              provider: 'woocommerce',
              name: 'WooCommerce',
              description: 'Connect your WooCommerce store for automated certificate generation',
              category: 'ecommerce',
              status: 'available',
              features: ['product_sync', 'order_webhooks', 'customer_sync'],
              setupUrl: '/api/integrations/woocommerce/connect',
              docsUrl: '/docs/integrations/woocommerce'
            },
            wix: {
              provider: 'wix',
              name: 'Wix',
              description: 'Integrate with your Wix store for seamless order processing',
              category: 'ecommerce',
              status: 'available',
              features: ['product_sync', 'order_webhooks', 'store_management'],
              setupUrl: '/api/integrations/wix/connect',
              docsUrl: '/docs/integrations/wix'
            }
          },
          categories: {
            ecommerce: {
              name: 'E-commerce',
              description: 'Connect your online store platforms',
              providers: ['shopify', 'woocommerce', 'wix'],
              totalAvailable: 3,
              totalConnected: 0
            }
          },
          ...(includeHealth && {
            health: {
              overall: 'unknown',
              lastChecked: new Date().toISOString(),
              issues: [],
              recommendations: [
                'Connect at least one e-commerce integration to start generating certificates automatically'
              ]
            }
          }),
          ...(includeAnalytics && {
            analytics: {
              summary: {
                totalSyncs: 0,
                successRate: 0,
                lastSync: null
              },
              note: 'Analytics will be available after connecting integrations'
            }
          }),
          ...(includeWebhooks && {
            webhooks: {
              total: 0,
              active: 0,
              providers: [],
              note: 'Webhook status will be available after connecting integrations'
            }
          }),
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get integrations health status
 * GET /api/integrations/health
 * 
 * @requires authentication & tenant context
 * @returns health status of all connected integrations
 */
integrationsRouter.get(
  '/health',
  authenticate,
  resolveTenant,
  trackManufacturerAction('check_integrations_health'),
  async (req: IntegrationsTenantRequest, res, next) => {
    try {
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      // This would aggregate health status from all integration services
      res.json({
        success: true,
        message: 'Integrations health check completed',
        data: {
          overall: {
            status: 'unknown', // 'healthy', 'degraded', 'critical', 'unknown'
            connectedIntegrations: 0,
            healthyIntegrations: 0,
            issuesFound: 0
          },
          providers: {
            shopify: {
              status: 'not_connected',
              lastChecked: null,
              responseTime: null,
              issues: []
            },
            woocommerce: {
              status: 'not_connected', 
              lastChecked: null,
              responseTime: null,
              issues: []
            },
            wix: {
              status: 'not_connected',
              lastChecked: null,
              responseTime: null,
              issues: []
            }
          },
          recommendations: [
            'Connect your e-commerce platforms to enable automated certificate generation',
            'Set up webhooks for real-time order processing',
            'Configure regular sync schedules for optimal performance'
          ],
          checkedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Test all connected integrations
 * POST /api/integrations/test
 * 
 * @requires authentication & tenant context
 * @requires validation: providers list, test options
 * @rate-limited: strict to prevent test abuse
 */
integrationsRouter.post(
  '/test',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()), // Prevent connection test spam
  validateBody(integrationTestSchema),
  trackManufacturerAction('test_all_integrations'),
  async (req: IntegrationsTenantRequest, res, next) => {
    try {
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      const { providers, includeWebhooks } = req.body;

      // This would test connections to all specified providers
      const testResults = {
        shopify: providers.includes('shopify') ? { 
          tested: true, 
          success: false, 
          reason: 'Not connected',
          responseTime: null 
        } : { tested: false },
        woocommerce: providers.includes('woocommerce') ? { 
          tested: true, 
          success: false, 
          reason: 'Not connected',
          responseTime: null 
        } : { tested: false },
        wix: providers.includes('wix') ? { 
          tested: true, 
          success: false, 
          reason: 'Not connected',
          responseTime: null 
        } : { tested: false }
      };

      const successfulTests = Object.values(testResults).filter(r => r.tested && r.success).length;
      const totalTests = Object.values(testResults).filter(r => r.tested).length;

      res.json({
        success: true,
        message: 'Integration connection tests completed',
        data: {
          summary: {
            totalTested: totalTests,
            successful: successfulTests,
            failed: totalTests - successfulTests,
            successRate: totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : 0
          },
          results: testResults,
          ...(includeWebhooks && {
            webhooks: {
              note: 'Webhook testing will be available for connected integrations'
            }
          }),
          testedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Perform bulk sync across multiple integrations
 * POST /api/integrations/sync
 * 
 * @requires authentication & tenant context
 * @requires validation: providers, sync type, options
 * @rate-limited: strict to prevent sync abuse
 */
integrationsRouter.post(
  '/sync',
  authenticate,
  resolveTenant,
  asRateLimitHandler(strictRateLimiter()), // Prevent bulk sync spam
  validateBody(bulkSyncSchema),
  trackManufacturerAction('bulk_sync_integrations'),
  async (req: IntegrationsTenantRequest, res, next) => {
    try {
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      const { providers, syncType, forceSync } = req.body;

      // This would trigger sync across all specified providers
      res.json({
        success: true,
        message: 'Bulk sync initiated - to be implemented',
        data: {
          syncId: `bulk_${Date.now()}`,
          providers,
          syncType,
          forceSync,
          status: 'queued',
          estimatedDuration: providers.length * 30, // 30 seconds per provider estimate
          results: {
            shopify: providers.includes('shopify') ? { queued: true, reason: 'Not connected' } : { skipped: true },
            woocommerce: providers.includes('woocommerce') ? { queued: true, reason: 'Not connected' } : { skipped: true },
            wix: providers.includes('wix') ? { queued: true, reason: 'Not connected' } : { skipped: true }
          },
          startedAt: new Date().toISOString(),
          note: 'Bulk sync functionality will be enhanced when integrations are connected'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get integration analytics across all platforms
 * GET /api/integrations/analytics
 * 
 * @requires authentication & tenant context
 * @optional query: date range
 * @returns aggregated analytics from all integrations
 */
integrationsRouter.get(
  '/analytics',
  authenticate,
  resolveTenant,
  validateQuery(Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    granularity: Joi.string().valid('day', 'week', 'month').default('day')
  })),
  trackManufacturerAction('view_integrations_analytics'),
  async (req: IntegrationsTenantRequest, res, next) => {
    try {
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      const { startDate, endDate, granularity } = req.query;
      const fromDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const toDate = endDate || new Date().toISOString();

      // This would aggregate analytics from all integration services
      res.json({
        success: true,
        message: 'Integration analytics retrieved successfully',
        data: {
          summary: {
            totalOrders: 0,
            totalRevenue: '0.00',
            certificatesGenerated: 0,
            syncOperations: 0,
            avgSyncSuccessRate: 0
          },
          providers: {
            shopify: { connected: false, orders: 0, revenue: '0.00', certificates: 0 },
            woocommerce: { connected: false, orders: 0, revenue: '0.00', certificates: 0 },
            wix: { connected: false, orders: 0, revenue: '0.00', certificates: 0 }
          },
          trends: [], // Daily/weekly/monthly trends would be populated here
          performance: {
            avgResponseTime: 0,
            syncSuccessRate: 0,
            webhookSuccessRate: 0,
            uptime: 100
          },
          dateRange: {
            from: fromDate,
            to: toDate,
            granularity
          },
          generatedAt: new Date().toISOString(),
          note: 'Analytics will be populated as integrations are connected and used'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get webhook status across all integrations
 * GET /api/integrations/webhooks
 * 
 * @requires authentication & tenant context
 * @returns webhook configuration and status from all providers
 */
integrationsRouter.get(
  '/webhooks',
  authenticate,
  resolveTenant,
  trackManufacturerAction('view_integrations_webhooks'),
  async (req: IntegrationsTenantRequest, res, next) => {
    try {
      const businessId = req.tenant?.business?.toString();
      if (!businessId) {
        return res.status(400).json({
          success: false,
          error: 'Business context not found'
        });
      }

      // This would aggregate webhook status from all integration services
      res.json({
        success: true,
        message: 'Integration webhook status retrieved successfully',
        data: {
          summary: {
            totalWebhooks: 0,
            activeWebhooks: 0,
            connectedProviders: 0,
            lastActivity: null
          },
          providers: {
            shopify: {
              connected: false,
              webhooks: 0,
              events: ['orders/create', 'orders/updated', 'orders/paid'],
              baseUrl: `${process.env.APP_URL}/api/integrations/shopify/webhook`
            },
            woocommerce: {
              connected: false,
              webhooks: 0, 
              events: ['order.created', 'order.updated', 'product.created'],
              baseUrl: `${process.env.APP_URL}/api/integrations/woocommerce/webhook`
            },
            wix: {
              connected: false,
              webhooks: 0,
              events: ['OrderCreated', 'OrderUpdated', 'OrderPaid'],
              baseUrl: `${process.env.APP_URL}/api/integrations/wix/webhook`
            }
          },
          health: 'unknown', // 'healthy', 'degraded', 'critical'
          recommendations: [
            'Connect integrations to enable webhook functionality',
            'Test webhook endpoints after setup',
            'Monitor webhook delivery logs for issues'
          ],
          checkedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== INTEGRATION SUB-ROUTERS =====

/**
 * Shopify integration routes
 * All Shopify-specific endpoints under /api/integrations/shopify/*
 */
integrationsRouter.use('/shopify', shopifyRouter);

/**
 * WooCommerce integration routes  
 * All WooCommerce-specific endpoints under /api/integrations/woocommerce/*
 */
integrationsRouter.use('/woocommerce', wooRouter);

/**
 * Wix integration routes
 * All Wix-specific endpoints under /api/integrations/wix/*
 */
integrationsRouter.use('/wix', wixRouter);

// ===== ERROR HANDLING =====

/**
 * Integration-specific error handler
 */
integrationsRouter.use((error: any, req: any, res: any, next: any) => {
  // Log integration-specific errors
  logger.error('Integration Error:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
    businessId: req.tenant?.business?.toString(),
    timestamp: new Date().toISOString()
  });

  // Pass to global error handler
  next(error);
});

export default integrationsRouter;
