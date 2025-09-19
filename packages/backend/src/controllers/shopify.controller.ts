// src/controllers/shopify.controller.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { ShopifyService } from '../services/external/shopify.service';
import crypto from 'crypto';

// Initialize service
const shopifyService = new ShopifyService();

/**
 * Extended request interfaces for type safety
 */
interface TenantShopifyRequest extends Request, UnifiedAuthRequest {
  tenant?: { business: { toString: () => string } };
}

interface ShopifyConnectRequest extends TenantShopifyRequest, ValidatedRequest {
  validatedBody: {
    shopDomain: string;
    returnUrl?: string;
  };
}

interface ShopifyCallbackRequest extends Request, ValidatedRequest{
  validatedQuery: {
    shop: string;
    code: string;
    state: string;
    hmac?: string;
    timestamp?: string;
  };
}

interface ShopifyWebhookRequest extends Request {
  rawBody?: Buffer | string;
  headers: {
    'x-shopify-topic'?: string;
    'x-shopify-hmac-sha256'?: string;
    'x-shopify-shop-domain'?: string;
    [key: string]: any;
  };
}

interface ShopifySyncRequest extends TenantShopifyRequest, ValidatedRequest {
  validatedBody?: {
    syncType?: 'products' | 'orders' | 'customers' | 'all';
    forceSync?: boolean;
    batchSize?: number;
  };
}

/**
 * Initiate Shopify OAuth connection flow
 * POST /api/shopify/connect
 */
export const connectShopify = asyncHandler(async (
  req: ShopifyConnectRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const { shopDomain, returnUrl } = req.validatedBody;

  let shopName = shopDomain;
  if (shopDomain.includes('.myshopify.com')) {
    shopName = shopDomain.replace('.myshopify.com', '');
  }

  const shopNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  if (!shopNameRegex.test(shopName)) {
    throw createAppError('Invalid shop name format. Use only letters, numbers, and hyphens', 400, 'INVALID_SHOP_NAME');
  }

  const authUrl = await shopifyService.generateInstallUrl(businessId, shopName);

  res.json({
    success: true,
    message: 'Shopify OAuth URL generated successfully',
    data: {
      authUrl,
      shopDomain: `${shopName}.myshopify.com`,
      shopName,
      returnUrl,
      businessId,
      expiresIn: 600,
      instructions: {
        step1: 'Click the provided URL to authorize the app',
        step2: 'Sign in to your Shopify admin if not already logged in',
        step3: 'Click "Install app" to complete the connection'
      }
    }
  });
});

/**
 * Handle Shopify OAuth callback
 * GET /api/shopify/callback
 */
export const oauthCallback = asyncHandler(async (
  req: ShopifyCallbackRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { shop, code, state, hmac, timestamp } = req.validatedQuery;

  if (!shop || !code || !state) {
    throw createAppError('Missing required OAuth parameters', 400, 'INVALID_OAUTH_CALLBACK');
  }

  const shopName = shop.replace('.myshopify.com', '');

  if (hmac && timestamp) {
    const expectedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
      .update(`code=${code}&shop=${shop}&state=${state}&timestamp=${timestamp}`)
      .digest('hex');
    
    if (hmac !== expectedHmac) {
      throw createAppError('Invalid HMAC signature', 401, 'INVALID_HMAC');
    }
  }

  try {
    await shopifyService.exchangeCode(shop, code, state);

    const successHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Shopify Connected Successfully</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              text-align: center; 
              padding: 50px 20px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: rgba(255, 255, 255, 0.1);
              padding: 40px;
              border-radius: 20px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.2);
              max-width: 500px;
              width: 100%;
            }
            .success { 
              color: #4CAF50; 
              font-size: 48px; 
              margin-bottom: 20px; 
            }
            .title {
              font-size: 28px;
              font-weight: 600;
              margin-bottom: 20px;
            }
            .details { 
              font-size: 16px; 
              line-height: 1.6;
              margin-bottom: 30px;
            }
            .shop-info {
              background: rgba(255, 255, 255, 0.1);
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
            }
            .countdown {
              font-size: 14px;
              opacity: 0.8;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅</div>
            <div class="title">Shopify Connected Successfully!</div>
            <div class="shop-info">
              <strong>Shop:</strong> ${shopName}<br>
              <strong>Connected at:</strong> ${new Date().toLocaleString()}<br>
              <strong>Status:</strong> Active
            </div>
            <div class="details">
              Your Shopify store is now connected to our platform.<br>
              You can now sync products and receive order notifications.
            </div>
            <div class="countdown">
              This window will close automatically in <span id="countdown">10</span> seconds.
            </div>
          </div>
          <script>
            let countdown = 10;
            const countdownElement = document.getElementById('countdown');
            const timer = setInterval(() => {
              countdown--;
              countdownElement.textContent = countdown;
              if (countdown <= 0) {
                clearInterval(timer);
                window.close();
              }
            }, 1000);
            
            document.addEventListener('click', () => window.close());
          </script>
        </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(successHtml);
  } catch (error: any) {
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Shopify Connection Failed</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              text-align: center; 
              padding: 50px 20px; 
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
              color: white;
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: rgba(255, 255, 255, 0.1);
              padding: 40px;
              border-radius: 20px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.2);
              max-width: 500px;
              width: 100%;
            }
            .error { 
              color: #ffeb3b; 
              font-size: 48px; 
              margin-bottom: 20px; 
            }
            .title {
              font-size: 28px;
              font-weight: 600;
              margin-bottom: 20px;
            }
            .details { 
              font-size: 16px; 
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">⚠️</div>
            <div class="title">Connection Failed</div>
            <div class="details">
              ${error.message || 'An error occurred while connecting to Shopify'}<br><br>
              Please try again or contact support if the issue persists.
            </div>
          </div>
          <script>
            setTimeout(() => window.close(), 10000);
            document.addEventListener('click', () => window.close());
          </script>
        </body>
      </html>
    `;

    res.status(400).setHeader('Content-Type', 'text/html');
    res.send(errorHtml);
  }
});

/**
 * Get Shopify connection status and overview
 * GET /api/shopify/status
 */
export const getConnectionStatus = asyncHandler(async (
  req: TenantShopifyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const [status, connectionTest, webhookStatus] = await Promise.all([
    shopifyService.getConnectionStatus(businessId),
    shopifyService.getConnectionStatus(businessId).then(s => 
      s.connected ? shopifyService.testConnection(businessId) : Promise.resolve(false)
    ),
    shopifyService.getConnectionStatus(businessId).then(s =>
      s.connected ? shopifyService.getWebhookStatus(businessId).catch(() => ({ webhooks: [], total: 0 })) : Promise.resolve({ webhooks: [], total: 0 })
    )
  ]);

  const health = {
    status: status.connected ? (connectionTest ? 'healthy' : 'degraded') : 'disconnected',
    issues: [] as string[]
  };

  if (status.connected && !connectionTest) {
    health.issues.push('API connection test failed');
  }

  if (status.connected && webhookStatus.total === 0) {
    health.issues.push('No webhooks registered');
  }

  res.json({
    success: true,
    message: 'Shopify connection status retrieved successfully',
    data: {
      connection: {
        ...status,
        health: health.status,
        issues: health.issues
      },
      features: {
        productSync: status.connected,
        orderWebhooks: status.connected && webhookStatus.total > 0,
        inventorySync: status.connected,
        customerSync: status.connected,
        apiAccess: connectionTest
      },
      webhooks: {
        registered: webhookStatus.total,
        details: webhookStatus.webhooks
      },
      recommendations: status.connected ? 
        (health.issues.length > 0 ? ['Fix identified issues for optimal performance'] : ['Connection is healthy']) :
        ['Connect your Shopify store to enable product sync and order notifications'],
      checkedAt: new Date().toISOString()
    }
  });
});

/**
 * Disconnect Shopify integration
 * DELETE /api/shopify/disconnect
 */
export const disconnectShopify = asyncHandler(async (
  req: TenantShopifyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const status = await shopifyService.getConnectionStatus(businessId);
  if (!status.connected) {
    throw createAppError('Shopify is not connected for this business', 400, 'SHOPIFY_NOT_CONNECTED');
  }

  let webhookCount = 0;
  try {
    const webhookStatus = await shopifyService.getWebhookStatus(businessId);
    webhookCount = webhookStatus.total;
  } catch (error) {
    // Ignore webhook status errors during disconnection
  }

  await shopifyService.disconnect(businessId);

  const cleanupActions = [
    'Removed Shopify access token',
    'Cleared shop domain configuration',
    'Reset connection timestamps'
  ];

  if (webhookCount > 0) {
    cleanupActions.push(`Removed ${webhookCount} webhook(s)`);
  }

  res.json({
    success: true,
    message: 'Shopify integration disconnected successfully',
    data: {
      disconnected: true,
      businessId,
      shopDomain: status.shopDomain,
      cleanupActions,
      impact: {
        productSync: 'Disabled - products will no longer sync automatically',
        orderWebhooks: 'Disabled - order notifications will stop',
        existingData: 'Preserved - your existing product data remains intact'
      },
      nextSteps: [
        'You can reconnect at any time to restore functionality',
        'Existing synced products will remain in your account',
        'Consider exporting data before permanently removing access'
      ],
      disconnectedAt: new Date().toISOString()
    }
  });
});

/**
 * Sync data from Shopify
 * POST /api/shopify/sync
 */
export const syncShopifyData = asyncHandler(async (
  req: ShopifySyncRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const syncConfig = req.validatedBody || {};
  const syncType = syncConfig.syncType || 'products';
  const forceSync = syncConfig.forceSync || false;
  const batchSize = syncConfig.batchSize || 50;

  const validSyncTypes = ['products', 'orders', 'customers', 'all'];
  if (!validSyncTypes.includes(syncType)) {
    throw createAppError(`Invalid sync type. Valid types: ${validSyncTypes.join(', ')}`, 400, 'INVALID_SYNC_TYPE');
  }

  const connectionStatus = await shopifyService.getConnectionStatus(businessId);
  if (!connectionStatus.connected) {
    throw createAppError('Shopify is not connected for this business', 400, 'SHOPIFY_NOT_CONNECTED');
  }

  const apiHealthy = await shopifyService.testConnection(businessId);
  if (!apiHealthy) {
    throw createAppError('Shopify API connection is not healthy', 503, 'API_CONNECTION_FAILED');
  }

  const syncStartTime = Date.now();

  let syncResult;
  const syncResults: {
    products: any;
    orders: any;
    customers: any;
  } = {
    products: null,
    orders: null,
    customers: null
  };

  try {
    switch (syncType) {
      case 'products':
        syncResult = await shopifyService.syncProducts(businessId);
        syncResults.products = syncResult;
        break;
      case 'orders':
        throw createAppError('Order sync not yet implemented', 501, 'SYNC_NOT_IMPLEMENTED');
      case 'customers':
        throw createAppError('Customer sync not yet implemented', 501, 'SYNC_NOT_IMPLEMENTED');
      case 'all':
        syncResults.products = await shopifyService.syncProducts(businessId);
        syncResult = {
          synced: syncResults.products.synced,
          errors: syncResults.products.errors
        };
        break;
      default:
        throw createAppError('Unknown sync type', 400, 'UNKNOWN_SYNC_TYPE');
    }
  } catch (error: any) {
    const syncDuration = Date.now() - syncStartTime;
    
    res.status(error.statusCode || 500).json({
      success: false,
      message: `${syncType} sync failed: ${error.message}`,
      error: {
        code: error.code || 'SYNC_FAILED',
        type: syncType,
        duration: syncDuration,
        businessId,
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  const syncDuration = Date.now() - syncStartTime;
  const nextSyncDelay = syncResult.errors.length > 0 ? 2 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const nextSync = new Date(Date.now() + nextSyncDelay);

  res.json({
    success: true,
    message: `${syncType} sync completed successfully`,
    data: {
      sync: {
        type: syncType,
        forceSync,
        batchSize,
        duration: syncDuration,
        startedAt: new Date(syncStartTime).toISOString(),
        completedAt: new Date().toISOString()
      },
      results: syncType === 'all' ? syncResults : syncResult,
      stats: {
        synced: syncResult.synced,
        errors: syncResult.errors.length,
        successRate: syncResult.synced > 0 ? Math.round((syncResult.synced / (syncResult.synced + syncResult.errors.length)) * 100) : 0,
        itemsPerSecond: syncDuration > 0 ? Math.round((syncResult.synced / syncDuration) * 1000) : 0
      },
      recommendations: {
        nextSync: nextSync.toISOString(),
        frequency: syncResult.errors.length > 0 ? 'Check and retry in 2 hours' : 'Daily automatic sync recommended',
        optimization: syncDuration > 30000 ? 'Consider reducing batch size for faster syncs' : 'Sync performance is optimal'
      },
      errors: syncResult.errors.length > 0 ? syncResult.errors.slice(0, 10) : [],
      hasMoreErrors: syncResult.errors.length > 10
    }
  });
});

/**
 * Handle Shopify webhooks
 * POST /api/shopify/webhook
 */
export const handleWebhook = asyncHandler(async (
  req: ShopifyWebhookRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const topic = req.headers['x-shopify-topic'];
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const shopDomain = req.headers['x-shopify-shop-domain'];
  const rawBody = req.rawBody || req.body;

  if (!hmac || !topic || !shopDomain) {
    throw createAppError('Missing required webhook headers', 400, 'INVALID_WEBHOOK_HEADERS');
  }

  const expectedHmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('base64');

  if (hmac !== expectedHmac) {
    throw createAppError('Invalid webhook HMAC signature', 401, 'INVALID_WEBHOOK_HMAC');
  }

  let webhookData;
  try {
    webhookData = JSON.parse(rawBody.toString());
  } catch (error) {
    throw createAppError('Invalid webhook payload format', 400, 'INVALID_WEBHOOK_PAYLOAD');
  }

  const processStartTime = Date.now();
  let processResult;

  try {
    switch (topic) {
      case 'orders/create':
      case 'orders/updated':
      case 'orders/paid':
        const mockReq = {
          get: (header: string) => req.headers[header.toLowerCase().replace(/_/g, '-')],
          rawBody
        };
        processResult = await shopifyService.processOrderWebhook(mockReq);
        break;
      
      case 'app/uninstalled':
        const shopName = shopDomain.replace('.myshopify.com', '');
        processResult = { 
          processed: true, 
          action: 'app_uninstalled',
          shop: shopName,
          cleanup: 'Automatic disconnection triggered'
        };
        break;
        
      case 'products/create':
      case 'products/update':
        processResult = { 
          processed: true, 
          action: 'product_sync_triggered',
          recommendation: 'Consider running a product sync to update your catalog'
        };
        break;
        
      default:
        logger.info('Received unknown Shopify webhook topic: ${topic}', {
          shop: shopDomain,
          timestamp: new Date().toISOString()
        });
        processResult = { 
          processed: false, 
          reason: `Unknown topic: ${topic}`,
          action: 'logged'
        };
    }
  } catch (error: any) {
    logger.error('Failed to process Shopify webhook ${topic}:', error);
    processResult = {
      processed: false,
      error: error.message,
      action: 'error_logged'
    };
  }

  const processingTime = Date.now() - processStartTime;

  res.status(200).json({
    success: true,
    message: 'Webhook received and processed',
    data: {
      webhook: {
        topic,
        shopDomain,
        processed: processResult?.processed || false,
        processingTime,
        receivedAt: new Date(processStartTime).toISOString(),
        processedAt: new Date().toISOString()
      },
      result: processResult,
      meta: {
        payloadSize: rawBody.length,
        source: 'shopify',
        version: '2024-01'
      }
    }
  });
});

/**
 * Test Shopify API connection
 * GET /api/shopify/test
 */
export const testShopifyConnection = asyncHandler(async (
  req: TenantShopifyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  const connectionStatus = await shopifyService.getConnectionStatus(businessId);
  if (!connectionStatus.connected) {
    throw createAppError('Shopify is not connected for this business', 400, 'SHOPIFY_NOT_CONNECTED');
  }

  const testStartTime = Date.now();
  const connectionTest = await shopifyService.testConnection(businessId);
  const testDuration = Date.now() - testStartTime;

  let additionalInfo = {};
  if (connectionTest) {
    try {
      const webhookStatus = await shopifyService.getWebhookStatus(businessId);
      additionalInfo = {
        webhooks: {
          total: webhookStatus.total,
          active: webhookStatus.webhooks.length,
          topics: webhookStatus.webhooks.map(w => w.topic)
        }
      };
    } catch (error) {
      // Ignore errors when getting additional info
    }
  }

  res.json({
    success: true,
    message: 'Shopify connection test completed',
    data: {
      connectionTest: {
        status: connectionTest ? 'passed' : 'failed',
        responseTime: testDuration,
        shopDomain: connectionStatus.shopDomain,
        connectedAt: connectionStatus.connectedAt,
        lastSync: connectionStatus.lastSync
      },
      apiHealth: {
        accessible: connectionTest,
        latency: `${testDuration}ms`,
        quality: testDuration < 1000 ? 'excellent' : testDuration < 3000 ? 'good' : 'poor'
      },
      permissions: connectionTest ? [
        'read_products',
        'read_orders', 
        'read_customers',
        'write_webhooks',
        'read_inventory'
      ] : [],
      additionalInfo,
      recommendations: connectionTest ? 
        ['Connection is healthy and ready for use'] : 
        ['Check your Shopify access token', 'Verify your shop domain', 'Try reconnecting if issues persist'],
      testedAt: new Date().toISOString()
    }
  });
});
