// src/controllers/woocommerce.controller.ts

import { Request, Response, NextFunction } from 'express';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { WooCommerceService } from '../services/external/woocommerce.service';
import crypto from 'crypto';

// Initialize service
const wooCommerceService = new WooCommerceService();

/**
 * Extended request interfaces for type safety
 */
interface TenantWooRequest extends Request, UnifiedAuthRequest {
  tenant?: { business: { toString: () => string } };
}

interface WooConnectRequest extends TenantWooRequest, ValidatedRequest {
  validatedBody: {
    domain: string;
    consumerKey: string;
    consumerSecret: string;
    version?: string;
    verifySsl?: boolean;
  };
}

interface WooWebhookRequest extends Request {
  body: any; // WooCommerce sends JSON, not Buffer
  headers: {
    'x-wc-webhook-event'?: string;
    'x-wc-webhook-signature'?: string;
    'x-wc-webhook-source'?: string;
    'x-wc-webhook-topic'?: string;
  };
}

interface WooSyncRequest extends TenantWooRequest, ValidatedRequest {
  validatedBody?: {
    syncType?: 'products' | 'orders' | 'customers' | 'all';
    forceSync?: boolean;
    batchSize?: number;
  };
}

/**
 * Setup WooCommerce integration with credentials
 * POST /api/woocommerce/connect
 * 
 * @requires authentication & tenant context
 * @requires validation: WooCommerce credentials
 * @returns { connected, domain, features }
 */
export const connectWooCommerce = asyncHandler(async (
  req: WooConnectRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract validated connection credentials
  const { domain, consumerKey, consumerSecret, version, verifySsl } = req.validatedBody;

  // Validate domain format
  const domainRegex = /^https?:\/\/[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\/?$/;
  if (!domainRegex.test(domain)) {
    throw createAppError('Invalid domain format. Must be a valid URL (e.g., https://yourstore.com)', 400, 'INVALID_DOMAIN_FORMAT');
  }

  // Validate credentials format
  if (!consumerKey || consumerKey.length < 20) {
    throw createAppError('Consumer key must be at least 20 characters', 400, 'INVALID_CONSUMER_KEY');
  }

  if (!consumerSecret || consumerSecret.length < 20) {
    throw createAppError('Consumer secret must be at least 20 characters', 400, 'INVALID_CONSUMER_SECRET');
  }

  // Setup WooCommerce integration through service
  const credentials = {
    domain: domain.replace(/\/$/, ''), // Remove trailing slash
    consumerKey,
    consumerSecret,
    version: version || 'wc/v3',
    verifySsl: verifySsl !== false // Default to true
  };

  const connectionResult = await wooCommerceService.setupIntegration(businessId, credentials);

  // Return standardized response
  res.json({
    success: true,
    message: 'WooCommerce integration setup successfully',
    data: {
      connected: true,
      businessId,
      domain: credentials.domain,
      version: credentials.version,
      features: {
        productSync: true,
        orderWebhooks: true,
        inventorySync: true,
        customerSync: true
      },
      webhookUrl: `${process.env.APP_URL}/api/woocommerce/webhook`,
      connectedAt: new Date().toISOString(),
      provider: 'woocommerce'
    }
  });
});

/**
 * Get WooCommerce connection status
 * GET /api/woocommerce/status
 * 
 * @requires authentication & tenant context
 * @returns { connected, domain, connectedAt, features }
 */
export const getConnectionStatus = asyncHandler(async (
  req: TenantWooRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Get connection status through service
  const status = await wooCommerceService.getConnectionStatus(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'WooCommerce connection status retrieved successfully',
    data: {
      connection: status,
      features: {
        productSync: status.connected,
        orderWebhooks: status.connected,
        inventorySync: status.connected,
        customerSync: status.connected,
        analyticsAccess: status.connected
      },
      provider: 'woocommerce',
      checkedAt: new Date().toISOString()
    }
  });
});

/**
 * Disconnect WooCommerce integration
 * DELETE /api/woocommerce/disconnect
 * 
 * @requires authentication & tenant context
 * @returns { disconnected, cleanupActions }
 */
export const disconnectWooCommerce = asyncHandler(async (
  req: TenantWooRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Disconnect WooCommerce through service
  const disconnectResult = await wooCommerceService.disconnectWooCommerce(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'WooCommerce integration disconnected successfully',
    data: {
      disconnected: true,
      businessId,
      cleanupActions: disconnectResult?.cleanupActions || [
        'Removed stored credentials',
        'Cleared webhook registrations',
        'Removed cached data'
      ],
      provider: 'woocommerce',
      disconnectedAt: new Date().toISOString()
    }
  });
});

/**
 * Sync data from WooCommerce
 * POST /api/woocommerce/sync
 * 
 * @requires authentication & tenant context
 * @requires validation: sync configuration
 * @returns { syncResults, stats, nextSync }
 */
export const syncWooCommerceData = asyncHandler(async (
  req: WooSyncRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract sync configuration
  const syncConfig = req.validatedBody || {};
  const syncType = syncConfig.syncType || 'products';
  const forceSync = syncConfig.forceSync || false;
  const batchSize = Math.min(syncConfig.batchSize || 50, 100); // Max 100 items per batch

  // Validate sync type
  const validSyncTypes = ['products', 'orders', 'customers', 'all'];
  if (!validSyncTypes.includes(syncType)) {
    throw createAppError(`Invalid sync type. Valid types: ${validSyncTypes.join(', ')}`, 400, 'INVALID_SYNC_TYPE');
  }

  // Check connection status first
  const connectionStatus = await wooCommerceService.getConnectionStatus(businessId);
  if (!connectionStatus.connected) {
    throw createAppError('WooCommerce is not connected for this business', 400, 'WOOCOMMERCE_NOT_CONNECTED');
  }

  // Perform sync based on type
  let syncResult;
  switch (syncType) {
    case 'products':
      syncResult = await wooCommerceService.syncProducts(businessId, { batchSize });
      break;
    case 'orders':
      syncResult = await wooCommerceService.syncOrders(businessId, { batchSize });
      break;
    case 'customers':
      syncResult = await wooCommerceService.syncCustomers(businessId, { batchSize });
      break;
    case 'all':
      // Sync all data types
      const [productSync, orderSync, customerSync] = await Promise.all([
        wooCommerceService.syncProducts(businessId, { batchSize }),
        wooCommerceService.syncOrders(businessId, { batchSize }),
        wooCommerceService.syncCustomers(businessId, { batchSize })
      ]);
      syncResult = {
        synced: productSync.synced + orderSync.synced + customerSync.synced,
        errors: [...productSync.errors, ...orderSync.errors, ...customerSync.errors],
        details: {
          products: productSync,
          orders: orderSync,
          customers: customerSync
        }
      };
      break;
    default:
      throw createAppError('Unknown sync type', 400, 'UNKNOWN_SYNC_TYPE');
  }

  // Return standardized response
  res.json({
    success: true,
    message: `${syncType} sync completed successfully`,
    data: {
      syncType,
      forceSync,
      batchSize,
      results: syncResult,
      stats: {
        synced: syncResult.synced,
        errors: syncResult.errors.length,
        duration: Date.now(), // Simple duration calculation
        provider: 'woocommerce'
      },
      nextSync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      syncedAt: new Date().toISOString()
    }
  });
});

/**
 * Handle WooCommerce webhooks
 * POST /api/woocommerce/webhook
 * 
 * @requires webhook validation
 * @returns webhook acknowledgment
 */
export const handleOrderWebhook = asyncHandler(async (
  req: WooWebhookRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const event = req.headers['x-wc-webhook-event'];
  const signature = req.headers['x-wc-webhook-signature'];
  const source = req.headers['x-wc-webhook-source'];
  const topic = req.headers['x-wc-webhook-topic'];
  const webhookData = req.body;

  // Validate webhook authenticity
  if (!event || !signature || !source) {
    throw createAppError('Missing required webhook headers', 400, 'INVALID_WEBHOOK_HEADERS');
  }

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WOOCOMMERCE_WEBHOOK_SECRET!)
    .update(JSON.stringify(webhookData))
    .digest('base64');

  if (signature !== expectedSignature) {
    throw createAppError('Invalid webhook signature', 401, 'INVALID_WEBHOOK_SIGNATURE');
  }

  // Process webhook based on event type
  let processResult;
  switch (event) {
    case 'created':
    case 'updated':
      if (topic?.includes('order')) {
        processResult = await wooCommerceService.processOrderWebhook(webhookData, source);
      } else if (topic?.includes('product')) {
        processResult = await wooCommerceService.processProductWebhook(webhookData, source);
      } else {
        processResult = { processed: false, reason: 'Unsupported webhook topic' };
      }
      break;
    case 'deleted':
      processResult = await wooCommerceService.processDeleteWebhook(webhookData, source, topic);
      break;
    default:
      // Log unknown webhook events but don't fail
      console.log(`Received unknown WooCommerce webhook event: ${event} for topic: ${topic}`);
      processResult = { processed: false, reason: 'Unknown event type' };
  }

  // Return webhook acknowledgment
  res.status(200).json({
    success: true,
    message: 'Webhook processed successfully',
    data: {
      event,
      topic,
      source,
      processed: processResult?.processed || true,
      provider: 'woocommerce',
      processedAt: new Date().toISOString()
    }
  });
});

/**
 * Get WooCommerce integration analytics
 * GET /api/woocommerce/analytics
 * 
 * @requires authentication & tenant context
 * @optional query: date range, metrics
 * @returns { analytics, trends, performance }
 */
export const getWooCommerceAnalytics = asyncHandler(async (
  req: TenantWooRequest & {
    query: {
      startDate?: string;
      endDate?: string;
      metrics?: string;
    };
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Parse query parameters
  const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  const metrics = req.query.metrics?.split(',') || ['orders', 'revenue', 'products', 'sync_status'];

  // Get analytics through service
  const analytics = await wooCommerceService.getAnalytics(businessId, {
    startDate,
    endDate,
    metrics
  });

  // Return standardized response
  res.json({
    success: true,
    message: 'WooCommerce analytics retrieved successfully',
    data: {
      analytics,
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      },
      metrics,
      provider: 'woocommerce',
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Test WooCommerce API connection
 * GET /api/woocommerce/test
 * 
 * @requires authentication & tenant context
 * @returns { connectionTest, apiResponse, storeInfo }
 */
export const testWooCommerceConnection = asyncHandler(async (
  req: TenantWooRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Test connection through service
  const testResult = await wooCommerceService.testConnection(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'WooCommerce connection test completed',
    data: {
      connectionTest: {
        status: testResult.success ? 'passed' : 'failed',
        responseTime: testResult.responseTime,
        apiVersion: testResult.apiVersion,
        storeInfo: testResult.storeInfo
      },
      capabilities: testResult.capabilities || [],
      provider: 'woocommerce',
      testedAt: new Date().toISOString()
    }
  });
});

/**
 * Get WooCommerce store information
 * GET /api/woocommerce/store-info
 * 
 * @requires authentication & tenant context
 * @returns { storeInfo, settings, capabilities }
 */
export const getStoreInfo = asyncHandler(async (
  req: TenantWooRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Get store information through service
  const storeInfo = await wooCommerceService.getStoreInfo(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'WooCommerce store information retrieved successfully',
    data: {
      storeInfo,
      provider: 'woocommerce',
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Generate setup instructions for WooCommerce
 * GET /api/woocommerce/setup-guide
 * 
 * @requires authentication & tenant context
 * @returns { instructions, steps, webhookUrl }
 */
export const getSetupGuide = asyncHandler(async (
  req: TenantWooRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const webhookUrl = `${process.env.APP_URL}/api/woocommerce/webhook`;

  const setupInstructions = {
    title: 'WooCommerce Integration Setup Guide',
    description: 'Follow these steps to connect your WooCommerce store',
    steps: [
      {
        step: 1,
        title: 'Access WooCommerce Admin',
        description: 'Go to your WooCommerce admin dashboard',
        action: 'Navigate to WooCommerce > Settings > Advanced > REST API'
      },
      {
        step: 2,
        title: 'Create API Key',
        description: 'Create a new API key with read/write permissions',
        action: 'Click "Add Key" and set permissions to "Read/Write"'
      },
      {
        step: 3,
        title: 'Copy Credentials',
        description: 'Copy the Consumer Key and Consumer Secret',
        action: 'Save these credentials securely - they won\'t be shown again'
      },
      {
        step: 4,
        title: 'Configure Webhooks',
        description: 'Set up webhooks for real-time data sync',
        action: `Use webhook URL: ${webhookUrl}`,
        webhookEvents: [
          'order.created',
          'order.updated',
          'product.created',
          'product.updated'
        ]
      },
      {
        step: 5,
        title: 'Connect Integration',
        description: 'Use the credentials to connect your store',
        action: 'Enter domain, consumer key, and consumer secret in the form'
      }
    ],
    requirements: [
      'WooCommerce 3.0 or higher',
      'WordPress admin access',
      'HTTPS enabled on your store',
      'REST API enabled'
    ],
    troubleshooting: [
      'Ensure your store URL includes https://',
      'Check that REST API is enabled in WooCommerce settings',
      'Verify the API credentials have correct permissions',
      'Test the connection after setup'
    ]
  };

  // Return standardized response
  res.json({
    success: true,
    message: 'WooCommerce setup guide retrieved successfully',
    data: {
      businessId,
      instructions: setupInstructions,
      webhookUrl,
      provider: 'woocommerce',
      generatedAt: new Date().toISOString()
    }
  });
});
