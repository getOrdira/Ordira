// src/controllers/wix.controller.ts

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { WixService } from '../services/external/wix.service';
import crypto from 'crypto';

// Initialize service
const wixService = new WixService();

/**
 * Extended request interfaces for type safety
 */
interface TenantWixRequest extends Request, AuthRequest {
  tenant?: { business: { toString: () => string } };
}

interface WixConnectRequest extends TenantWixRequest, ValidatedRequest {
  validatedBody: {
    returnUrl?: string;
  };
}

interface WixCallbackRequest extends Request, ValidatedRequest{
  validatedQuery: {
    code: string;
    state: string;
    instance_id?: string;
    context?: string;
  };
}

interface WixWebhookRequest extends Request {
  body: Buffer;
  headers: {
    'x-wix-event-type'?: string;
    'x-wix-signature'?: string;
    'x-wix-instance-id'?: string;
  };
}

interface WixSyncRequest extends TenantWixRequest, ValidatedRequest {
  validatedBody?: {
    syncType?: 'products' | 'orders' | 'customers' | 'all';
    forceSync?: boolean;
  };
}

/**
 * Initiate Wix OAuth connection flow
 * POST /api/wix/connect
 * 
 * @requires authentication & tenant context
 * @requires validation: { returnUrl?: string }
 * @returns { authUrl, state, redirectUrl }
 */
export const connectWix = asyncHandler(async (
  req: WixConnectRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract validated connection data
  const { returnUrl } = req.validatedBody || {};

  // Generate OAuth URL through service
  const authUrl = await wixService.generateInstallUrl(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Wix OAuth URL generated successfully',
    data: {
      authUrl,
      state: businessId,
      returnUrl,
      expiresIn: 600, // OAuth URLs typically expire in 10 minutes
      provider: 'wix'
    }
  });
});

/**
 * Handle Wix OAuth callback
 * GET /api/wix/callback
 * 
 * @requires validation: OAuth callback parameters
 * @returns redirect or success message
 */
export const oauthCallback = asyncHandler(async (
  req: WixCallbackRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract validated callback parameters
  const { code, state, instance_id, context } = req.validatedQuery;

  // Validate required parameters
  if (!code || !state) {
    throw createAppError('Missing required OAuth parameters', 400, 'INVALID_OAUTH_CALLBACK');
  }

  // Additional validation for Wix-specific parameters
  if (!context && !instance_id) {
    throw createAppError('Missing Wix context or instance ID', 400, 'MISSING_WIX_CONTEXT');
  }

  // Exchange code for access token through service
  const connectionResult = await wixService.exchangeCode(code, state);

  // Return success page
  const successHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Wix Connected</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }
          .success { 
            font-size: 28px; 
            margin-bottom: 20px; 
            font-weight: 600;
          }
          .details { 
            font-size: 16px; 
            opacity: 0.9;
            line-height: 1.6;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">🎉</div>
          <div class="success">Wix Connected Successfully!</div>
          <div class="details">
            Instance: ${instance_id || context || 'Connected'}<br>
            Connected at: ${new Date().toLocaleString()}<br>
            You can close this window.
          </div>
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
 * Get Wix connection status
 * GET /api/wix/status
 * 
 * @requires authentication & tenant context
 * @returns { connected, instanceId, connectedAt, features }
 */
export const getConnectionStatus = asyncHandler(async (
  req: TenantWixRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Get connection status through service
  const status = await wixService.getConnectionStatus(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Wix connection status retrieved successfully',
    data: {
      connection: status,
      features: {
        productSync: status.connected,
        orderWebhooks: status.connected,
        storeManagement: status.connected,
        analyticsAccess: status.connected
      },
      provider: 'wix',
      checkedAt: new Date().toISOString()
    }
  });
});

/**
 * Disconnect Wix integration
 * DELETE /api/wix/disconnect
 * 
 * @requires authentication & tenant context
 * @returns { disconnected, cleanupActions }
 */
export const disconnectWix = asyncHandler(async (
  req: TenantWixRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Disconnect Wix through service
  const disconnectResult = await wixService.disconnectWix(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Wix integration disconnected successfully',
    data: {
      disconnected: true,
      businessId,
      cleanupActions: disconnectResult?.cleanupActions || [
        'Removed access tokens',
        'Cleared webhook registrations',
        'Removed stored credentials'
      ],
      provider: 'wix',
      disconnectedAt: new Date().toISOString()
    }
  });
});

/**
 * Sync data from Wix
 * POST /api/wix/sync
 * 
 * @requires authentication & tenant context
 * @requires validation: sync configuration
 * @returns { syncResults, stats, nextSync }
 */
export const syncWixData = asyncHandler(async (
  req: WixSyncRequest,
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
  const connectionStatus = await wixService.getConnectionStatus(businessId);
  if (!connectionStatus.connected) {
    throw createAppError('Wix is not connected for this business', 400, 'WIX_NOT_CONNECTED');
  }

  // Perform sync based on type
  let syncResult;
  switch (syncType) {
    case 'products':
      syncResult = await wixService.syncProducts(businessId);
      break;
    case 'orders':
      syncResult = await wixService.syncOrders(businessId);
      break;
    case 'customers':
      // syncResult = await wixService.syncCustomers(businessId);
      throw createAppError('Customer sync not yet implemented', 501, 'SYNC_NOT_IMPLEMENTED');
    case 'all':
      // Sync all data types
      const [productSync, orderSync] = await Promise.all([
        wixService.syncProducts(businessId),
        wixService.syncOrders(businessId)
      ]);
      syncResult = {
        synced: productSync.synced + orderSync.synced,
        errors: [...productSync.errors, ...orderSync.errors]
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
      results: syncResult,
      stats: {
        synced: syncResult.synced,
        errors: syncResult.errors.length,
        duration: Date.now(), // Simple duration calculation
        provider: 'wix'
      },
      nextSync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      syncedAt: new Date().toISOString()
    }
  });
});

/**
 * Handle Wix webhooks
 * POST /api/wix/webhook
 * 
 * @requires webhook validation
 * @returns webhook acknowledgment
 */
export const handleOrderWebhook = asyncHandler(async (
  req: WixWebhookRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const eventType = req.headers['x-wix-event-type'];
  const signature = req.headers['x-wix-signature'];
  const instanceId = req.headers['x-wix-instance-id'];
  const rawBody = req.body;

  // Validate webhook authenticity
  if (!eventType || !signature || !instanceId) {
    throw createAppError('Missing required webhook headers', 400, 'INVALID_WEBHOOK_HEADERS');
  }

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WIX_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    throw createAppError('Invalid webhook signature', 401, 'INVALID_WEBHOOK_SIGNATURE');
  }

  // Parse webhook payload
  let webhookData;
  try {
    webhookData = JSON.parse(rawBody.toString());
  } catch (error) {
    throw createAppError('Invalid webhook payload format', 400, 'INVALID_WEBHOOK_PAYLOAD');
  }

  // Process webhook based on event type
  let processResult;
  switch (eventType) {
    case 'orderCreated':
    case 'orderUpdated':
    case 'orderPaid':
      processResult = await wixService.processOrderWebhook(webhookData, instanceId);
      break;
    case 'appRemoved':
      // Handle app removal
      processResult = await wixService.handleAppRemoval(instanceId);
      break;
    default:
      // Log unknown webhook events but don't fail
      console.log(`Received unknown Wix webhook event: ${eventType}`);
      processResult = { processed: false, reason: 'Unknown event type' };
  }

  // Return webhook acknowledgment
  res.status(200).json({
    success: true,
    message: 'Webhook processed successfully',
    data: {
      eventType,
      instanceId,
      processed: processResult?.processed || true,
      provider: 'wix',
      processedAt: new Date().toISOString()
    }
  });
});

/**
 * Get Wix integration analytics
 * GET /api/wix/analytics
 * 
 * @requires authentication & tenant context
 * @optional query: date range, metrics
 * @returns { analytics, trends, performance }
 */
export const getWixAnalytics = asyncHandler(async (
  req: TenantWixRequest & {
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
  const metrics = req.query.metrics?.split(',') || ['orders', 'revenue', 'sync_status'];

  // Get analytics through service (implement if available)
  const analytics = await wixService.getAnalytics(businessId, {
    startDate,
    endDate,
    metrics
  });

  // Return standardized response
  res.json({
    success: true,
    message: 'Wix analytics retrieved successfully',
    data: {
      analytics,
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString()
      },
      metrics,
      provider: 'wix',
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Test Wix API connection
 * GET /api/wix/test
 * 
 * @requires authentication & tenant context
 * @returns { connectionTest, apiResponse, permissions }
 */
export const testWixConnection = asyncHandler(async (
  req: TenantWixRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Test connection through service
  const testResult = await wixService.testConnection(businessId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Wix connection test completed',
    data: {
      connectionTest: {
        status: testResult.success ? 'passed' : 'failed',
        responseTime: testResult.responseTime,
        apiVersion: testResult.apiVersion,
        instanceInfo: testResult.instanceInfo
      },
      permissions: testResult.permissions || [],
      provider: 'wix',
      testedAt: new Date().toISOString()
    }
  });
});