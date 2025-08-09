// src/controllers/shopify.controller.ts

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { ShopifyService } from '../services/external/shopify.service';
import crypto from 'crypto';

// Initialize service
const shopifyService = new ShopifyService();

/**
 * Extended request interfaces for type safety
 */
interface TenantShopifyRequest extends AuthRequest {
  tenant?: { business: { toString: () => string } };
}

interface ShopifyConnectRequest extends TenantShopifyRequest, ValidatedRequest {
  validatedBody: {
    shopDomain: string;
    returnUrl?: string;
  };
}

interface ShopifyCallbackRequest extends Request, ValidatedRequest {
  validatedQuery: {
    shop: string;
    code: string;
    state: string;
    hmac?: string;
    timestamp?: string;
  };
}

interface ShopifyWebhookRequest extends Request {
  body: Buffer;
  headers: {
    'x-shopify-topic'?: string;
    'x-shopify-hmac-sha256'?: string;
    'x-shopify-shop-domain'?: string;
  };
}

interface ShopifySyncRequest extends TenantShopifyRequest, ValidatedRequest {
  validatedBody?: {
    syncType?: 'products' | 'orders' | 'customers' | 'all';
    forceSync?: boolean;
  };
}

/**
 * Initiate Shopify OAuth connection flow
 * POST /api/shopify/connect
 * 
 * @requires authentication & tenant context
 * @requires validation: { shopDomain: string, returnUrl?: string }
 * @returns { authUrl, state, shopDomain }
 */
export const connectShopify = asyncHandler(async (
  req: ShopifyConnectRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract validated connection data
  const { shopDomain, returnUrl } = req.validatedBody;

  // Validate shop domain format
  const shopDomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
  if (!shopDomainRegex.test(shopDomain)) {
    throw createAppError('Invalid Shopify domain format. Must be in format: shop-name.myshopify.com', 400, 'INVALID_SHOP_DOMAIN');
  }

  // Generate OAuth URL through service
  const authUrl = await shopifyService.generateInstallUrl(businessId, shopDomain, returnUrl);

  // Return standardized response
  res.json({
    success: true,
    message: 'Shopify OAuth URL generated successfully',
    data: {
      authUrl,
      shopDomain,
      returnUrl,
      expiresIn: 600 // OAuth URLs typically expire in 10 minutes
    }
  });
});

/**
 * Handle Shopify OAuth callback
 * GET /api/shopify/callback
 * 
 * @requires validation: OAuth callback parameters
 * @returns redirect or success message
 */
export const oauthCallback = asyncHandler(async (
  req: ShopifyCallbackRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract validated callback parameters
  const { shop, code, state, hmac, timestamp } = req.validatedQuery;

  // Validate required parameters
  if (!shop || !code || !state) {
    throw createAppError('Missing required OAuth parameters', 400, 'INVALID_OAUTH_CALLBACK');
  }

  // Verify HMAC if provided (additional security)
  if (hmac && timestamp) {
    const expectedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
      .update(`code=${code}&shop=${shop}&state=${state}&timestamp=${timestamp}`)
      .digest('hex');
    
    if (hmac !== expectedHmac) {
      throw createAppError('Invalid HMAC signature', 401, 'INVALID_HMAC');
    }
  }

  // Exchange code for access token through service
  const connectionResult = await shopifyService.exchangeCode(shop, code, state);

  // Return success page or redirect
  const successHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Shopify Connected</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
          .details { color: #6c757d; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="success">✅ Shopify Connected Successfully!</div>
        <div class="details">
          Shop: ${shop}<br>
          Connected at: ${new Date().toLocaleString()}<br>
          You can close this window.
        </div>
        <script>
          // Auto-close window after 5 seconds
          setTimeout(() => { window.close(); }, 5000);
        </script>
      </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(successHtml);
});

/**
 * Get Shopify connection status
 * GET /api/shopify/status
 * 
 * @requires authentication & tenant context
 * @returns { connected, shopDomain, connectedAt, features }
 */
export const getConnectionStatus = asyncHandler(async (
  req: TenantShopifyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Get connection status through service
  const status = await shopifyService.getConnectionStatus(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Shopify connection status retrieved successfully',
    data: {
      connection: status,
      features: {
        productSync: status.connected,
        orderWebhooks: status.connected,
        inventorySync: status.connected,
        customerSync: status.connected
      },
      checkedAt: new Date().toISOString()
    }
  });
});

/**
 * Disconnect Shopify integration
 * DELETE /api/shopify/disconnect
 * 
 * @requires authentication & tenant context
 * @returns { disconnected, cleanupActions }
 */
export const disconnectShopify = asyncHandler(async (
  req: TenantShopifyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Disconnect Shopify through service
  const disconnectResult = await shopifyService.disconnectShopify(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Shopify integration disconnected successfully',
    data: {
      disconnected: true,
      businessId,
      cleanupActions: disconnectResult.cleanupActions || [],
      disconnectedAt: new Date().toISOString()
    }
  });
});

/**
 * Sync data from Shopify
 * POST /api/shopify/sync
 * 
 * @requires authentication & tenant context
 * @requires validation: sync configuration
 * @returns { syncResults, stats, nextSync }
 */
export const syncShopifyData = asyncHandler(async (
  req: ShopifySyncRequest,
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

  // Validate sync type
  const validSyncTypes = ['products', 'orders', 'customers', 'all'];
  if (!validSyncTypes.includes(syncType)) {
    throw createAppError(`Invalid sync type. Valid types: ${validSyncTypes.join(', ')}`, 400, 'INVALID_SYNC_TYPE');
  }

  // Check connection status first
  const connectionStatus = await shopifyService.getConnectionStatus(businessId);
  if (!connectionStatus.connected) {
    throw createAppError('Shopify is not connected for this business', 400, 'SHOPIFY_NOT_CONNECTED');
  }

  // Perform sync based on type
  let syncResult;
  switch (syncType) {
    case 'products':
      syncResult = await shopifyService.syncProducts(businessId);
      break;
    case 'orders':
      // syncResult = await shopifyService.syncOrders(businessId);
      throw createAppError('Order sync not yet implemented', 501, 'SYNC_NOT_IMPLEMENTED');
    case 'customers':
      // syncResult = await shopifyService.syncCustomers(businessId);
      throw createAppError('Customer sync not yet implemented', 501, 'SYNC_NOT_IMPLEMENTED');
    case 'all':
      // Sync all data types
      syncResult = await shopifyService.syncProducts(businessId);
      // Add other sync operations when implemented
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
      results: syncResult,
      stats: {
        synced: syncResult.synced,
        errors: syncResult.errors.length,
        duration: Date.now() // Simple duration calculation
      },
      nextSync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      syncedAt: new Date().toISOString()
    }
  });
});

/**
 * Handle Shopify webhooks
 * POST /api/shopify/webhook
 * 
 * @requires webhook validation
 * @returns webhook acknowledgment
 */
export const handleOrderWebhook = asyncHandler(async (
  req: ShopifyWebhookRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const topic = req.headers['x-shopify-topic'];
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const rawBody = req.body;

  // Validate webhook authenticity
  if (!hmac || !topic || !shopDomain) {
    throw createAppError('Missing required webhook headers', 400, 'INVALID_WEBHOOK_HEADERS');
  }

  // Verify webhook HMAC
  const expectedHmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('base64');

  if (hmac !== expectedHmac) {
    throw createAppError('Invalid webhook HMAC signature', 401, 'INVALID_WEBHOOK_HMAC');
  }

  // Parse webhook payload
  let webhookData;
  try {
    webhookData = JSON.parse(rawBody.toString());
  } catch (error) {
    throw createAppError('Invalid webhook payload format', 400, 'INVALID_WEBHOOK_PAYLOAD');
  }

  // Process webhook based on topic
  let processResult;
  switch (topic) {
    case 'orders/create':
    case 'orders/updated':
    case 'orders/paid':
      processResult = await shopifyService.processOrderWebhook(webhookData, shopDomain);
      break;
    case 'app/uninstalled':
      // Handle app uninstallation
      processResult = await shopifyService.handleAppUninstall(shopDomain);
      break;
    default:
      // Log unknown webhook topics but don't fail
      console.log(`Received unknown Shopify webhook topic: ${topic}`);
      processResult = { processed: false, reason: 'Unknown topic' };
  }

  // Return webhook acknowledgment
  res.status(200).json({
    success: true,
    message: 'Webhook processed successfully',
    data: {
      topic,
      shopDomain,
      processed: processResult?.processed || true,
      processedAt: new Date().toISOString()
    }
  });
});

/**
 * Get Shopify integration analytics
 * GET /api/shopify/analytics
 * 
 * @requires authentication & tenant context
 * @optional query: date range, metrics
 * @returns { analytics, trends, performance }
 */
export const getShopifyAnalytics = asyncHandler(async (
  req: TenantShopifyRequest & {
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
  const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  const metrics = req.query.metrics?.split(',') || ['orders', 'revenue', 'sync_status'];

  // Get analytics through service (implement if available)
  // For now, we'll return basic analytics structure
  const analytics = {
    summary: {
      totalOrders: 0,
      totalRevenue: 0,
      lastSyncAt: null,
      syncStatus: 'unknown'
    },
    trends: {
      ordersOverTime: [],
      revenueOverTime: [],
      syncPerformance: []
    },
    performance: {
      averageSyncTime: 0,
      syncSuccessRate: 0,
      errorRate: 0
    }
  };

  // Return standardized response
  res.json({
    success: true,
    message: 'Shopify analytics retrieved successfully',
    data: {
      analytics,
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      },
      metrics,
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Test Shopify API connection
 * GET /api/shopify/test
 * 
 * @requires authentication & tenant context
 * @returns { connectionTest, apiResponse, permissions }
 */
export const testShopifyConnection = asyncHandler(async (
  req: TenantShopifyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Test connection through service
  const testResult = await shopifyService.testConnection(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Shopify connection test completed',
    data: {
      connectionTest: {
        status: testResult.success ? 'passed' : 'failed',
        responseTime: testResult.responseTime,
        apiVersion: testResult.apiVersion,
        shopInfo: testResult.shopInfo
      },
      permissions: testResult.permissions || [],
      testedAt: new Date().toISOString()
    }
  });
});