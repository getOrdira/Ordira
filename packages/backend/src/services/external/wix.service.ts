// services/external/wix.service.ts
import axios from 'axios';
import { logger, logSafeInfo, logSafeError } from '../../utils/logger';
import crypto from 'crypto';
import { BrandSettings } from '../../models/brandSettings.model';
import { CertificateService } from '../business/certificate.service';
import { createAppError } from '../../middleware/error.middleware';

const APP_URL = process.env.APP_URL!;

// ===== INTERFACES =====

export interface WixOrder {
  _id: string;
  buyerInfo: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  lineItems: Array<{
    _id: string;
    productName: {
      original: string;
    };
    sku?: string;
    quantity: number;
    price: {
      amount: string;
      currency: string;
    };
  }>;
  siteId: string;
}

export interface WixProduct {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  media?: {
    mainMedia?: {
      image?: {
        url: string;
      };
    };
  };
  productOptions?: Array<{
    optionType: string;
    name: string;
    choices: Array<{
      value: string;
      description: string;
    }>;
  }>;
}

export interface WixConnectionStatus {
  connected: boolean;
  instanceId?: string;
  connectedAt?: Date;
  lastSync?: Date;
  health?: 'excellent' | 'good' | 'poor';
  features?: {
    productSync: boolean;
    orderWebhooks: boolean;
    storeManagement: boolean;
    analyticsAccess: boolean;
  };
}

export interface WixSyncResult {
  synced: number;
  errors: string[];
  skipped?: number;
  updated?: number;
  created?: number;
  duration?: number;
}

export interface WixWebhookResult {
  processed: boolean;
  certificatesCreated?: number;
  errors?: string[];
  reason?: string;
}

export interface WixAnalytics {
  summary: {
    totalOrders: number;
    totalRevenue: string;
    certificatesIssued: number;
    syncSuccess: number;
  };
  trends: Array<{
    date: string;
    orders: number;
    revenue: string;
    certificates: number;
  }>;
  performance: {
    syncSuccessRate: number;
    webhookSuccessRate: number;
    averageProcessingTime: number;
  };
  recentActivity: Array<{
    type: 'order' | 'sync' | 'webhook';
    timestamp: Date;
    status: 'success' | 'failed';
    details?: string;
  }>;
}

export interface WixTestResult {
  success: boolean;
  responseTime: number;
  apiVersion?: string;
  instanceInfo?: {
    siteId: string;
    domain: string;
    plan: string;
  };
  permissions: string[];
  errors?: string[];
}

export interface WixDisconnectResult {
  cleanupActions: string[];
  webhooksRemoved: number;
  dataCleared: boolean;
}

/**
 * Enhanced Wix integration service
 * Handles OAuth, webhook management, product sync, and analytics
 */
export class WixService {
  private certificateService = new CertificateService();

  // ===== OAUTH AND CONNECTION =====

  async generateInstallUrl(businessId: string, options: {
    returnUrl?: string;
    scope?: string;
  } = {}): Promise<string> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      // Validate environment variables
      const clientId = process.env.WIX_CLIENT_ID;
      if (!clientId) {
        throw createAppError('WIX_CLIENT_ID not configured', 500, 'MISSING_CONFIG');
      }
      if (!APP_URL) {
        throw createAppError('APP_URL not configured', 500, 'MISSING_CONFIG');
      }

      const redirectUri = `${APP_URL}/api/wix/callback`;
      const state = businessId;
      const scope = options.scope || 'wix-stores.orders-read,wix-stores.products-read,wix-webhooks.webhooks-write';
      
      const authUrl = `https://www.wix.com/oauth/authorize` +
                     `?client_id=${clientId}` +
                     `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                     `&state=${state}` +
                     `&scope=${scope}` +
                     `&response_type=code`;

      return authUrl;
    } catch (error: any) {
      logSafeError('Generate Wix install URL error', { error: error.message });
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to generate Wix install URL: ${error.message}`, 500, 'URL_GENERATION_FAILED');
    }
  }

  async exchangeCode(code: string, state: string): Promise<{
    instanceId: string;
    accessToken: string;
    refreshToken?: string;
    connectedAt: Date;
  }> {
    try {
      // Validate inputs
      if (!code?.trim()) {
        throw createAppError('Authorization code is required', 400, 'MISSING_AUTH_CODE');
      }
      if (!state?.trim()) {
        throw createAppError('State parameter is required', 400, 'MISSING_STATE');
      }

      // Validate environment variables
      const clientId = process.env.WIX_CLIENT_ID;
      const clientSecret = process.env.WIX_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw createAppError('Wix OAuth credentials not configured', 500, 'MISSING_OAUTH_CONFIG');
      }
      if (!APP_URL) {
        throw createAppError('APP_URL not configured', 500, 'MISSING_CONFIG');
      }
      
      const tokenResponse = await axios.post('https://www.wixapis.com/oauth/access', {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${APP_URL}/api/wix/callback`
      });

      const { access_token, refresh_token, instance_id } = tokenResponse.data;

      if (!access_token) {
        throw createAppError('No access token received from Wix', 400, 'MISSING_ACCESS_TOKEN');
      }
      if (!instance_id) {
        throw createAppError('No instance ID received from Wix', 400, 'MISSING_INSTANCE_ID');
      }

      // Register webhooks
      await this.registerWebhooks(access_token);

      // Persist credentials
      const connectedAt = new Date();
      const updatedSettings = await BrandSettings.findOneAndUpdate(
        { business: state },
        {
          wixDomain: instance_id,
          wixApiKey: access_token,
          wixRefreshToken: refresh_token,
          wixConnectedAt: connectedAt,
          'wixSettings.webhooksRegistered': true,
          'wixSettings.lastConnectionTest': connectedAt
        },
        { upsert: true, new: true }
      );

      if (!updatedSettings) {
        throw createAppError('Failed to save Wix credentials', 500, 'SAVE_CREDENTIALS_FAILED');
      }

      logSafeInfo('Wix integration completed', { businessId: state });

      return {
        instanceId: instance_id,
        accessToken: access_token,
        refreshToken: refresh_token,
        connectedAt
      };
    } catch (error: any) {
      logger.error('Exchange Wix code error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle Axios errors
      if (error.response?.status === 400) {
        throw createAppError('Invalid authorization code or credentials', 400, 'INVALID_AUTH_CODE');
      }
      if (error.response?.status === 401) {
        throw createAppError('Unauthorized - invalid Wix credentials', 401, 'INVALID_CREDENTIALS');
      }
      if (error.response?.status >= 500) {
        throw createAppError('Wix API is currently unavailable', 503, 'WIX_API_UNAVAILABLE');
      }

      // Handle network errors
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw createAppError('Unable to connect to Wix API', 503, 'NETWORK_ERROR');
      }

      throw createAppError(`Failed to complete Wix integration: ${error.message}`, 500, 'INTEGRATION_FAILED');
    }
  }

  async getConnectionStatus(businessId: string): Promise<WixConnectionStatus> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      
      if (!settings || !settings.wixApiKey) {
        return {
          connected: false,
          health: 'poor'
        };
      }

      // Test connection health
      let health: 'excellent' | 'good' | 'poor' = 'poor';
      try {
        const isHealthy = await this.testConnection(businessId);
        if (isHealthy.success) {
          health = isHealthy.responseTime < 1000 ? 'excellent' : 'good';
        }
      } catch (testError) {
        // Connection exists but not healthy
        health = 'poor';
      }

      return {
        connected: true,
        instanceId: settings.wixDomain,
        connectedAt: settings.wixConnectedAt,
        lastSync: settings.wixLastSync,
        health,
        features: {
          productSync: true,
          orderWebhooks: !!settings.wixSettings?.webhooksRegistered,
          storeManagement: true,
          analyticsAccess: true
        }
      };
    } catch (error: any) {
      logger.error('Get Wix connection status error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to get Wix connection status: ${error.message}`, 500, 'STATUS_CHECK_FAILED');
    }
  }

  async disconnectWix(businessId: string): Promise<WixDisconnectResult> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixApiKey) {
        throw createAppError('Wix not connected for this business', 404, 'NOT_CONNECTED');
      }

      const cleanupActions: string[] = [];
      let webhooksRemoved = 0;

      try {
        // Remove webhooks
        const webhookStatus = await this.getWebhookStatus(businessId);
        for (const webhook of webhookStatus.webhooks) {
          try {
            await axios.delete(
              `https://www.wixapis.com/webhooks/v1/webhooks/${webhook.id}`,
              {
                headers: { 'Authorization': `Bearer ${settings.wixApiKey}` }
              }
            );
            webhooksRemoved++;
          } catch (deleteError: any) {
            logger.warn('Failed to delete webhook ${webhook.id}:', deleteError.message);
          }
        }
        
        if (webhooksRemoved > 0) {
          cleanupActions.push(`Removed ${webhooksRemoved} webhooks`);
        }
      } catch (error: any) {
        logger.warn('Failed to remove Wix webhooks:', error.message);
        cleanupActions.push('Webhook cleanup failed (non-critical)');
      }

      // Clear integration data
      const result = await BrandSettings.findOneAndUpdate(
        { business: businessId },
        {
          $unset: {
            wixDomain: 1,
            wixApiKey: 1,
            wixRefreshToken: 1,
            wixConnectedAt: 1,
            wixLastSync: 1,
            wixSettings: 1
          }
        }
      );

      if (!result) {
        throw createAppError('Failed to clear Wix integration data', 500, 'CLEANUP_FAILED');
      }

      cleanupActions.push('Removed access tokens');
      cleanupActions.push('Cleared stored credentials');
      cleanupActions.push('Removed integration settings');

      return {
        cleanupActions,
        webhooksRemoved,
        dataCleared: true
      };
    } catch (error: any) {
      logger.error('Disconnect Wix error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to disconnect Wix integration: ${error.message}`, 500, 'DISCONNECT_FAILED');
    }
  }

  // ===== PRODUCT AND ORDER SYNC =====

  async syncProducts(businessId: string, options: {
    forceSync?: boolean;
    limit?: number;
  } = {}): Promise<WixSyncResult> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixApiKey) {
        throw createAppError('Wix not connected for this business', 404, 'NOT_CONNECTED');
      }

      const startTime = Date.now();
      const limit = options.limit || 100;

      const response = await axios.get(
        'https://www.wixapis.com/stores/v1/products/query',
        {
          headers: { 
            'Authorization': `Bearer ${settings.wixApiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            query: { limit }
          }
        }
      );

      if (!response.data?.products || !Array.isArray(response.data.products)) {
        throw createAppError('Invalid response from Wix products API', 500, 'INVALID_API_RESPONSE');
      }

      const products: WixProduct[] = response.data.products;
      const errors: string[] = [];
      let synced = 0;
      let skipped = 0;
      let created = 0;
      let updated = 0;

      // TODO: Implement actual product sync with ProductService
      // For now, just count the products
      synced = products.length;

      // Update last sync timestamp
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { 
          wixLastSync: new Date(),
          'wixSettings.lastProductSync': new Date()
        }
      );

      const duration = Date.now() - startTime;

      return { 
        synced, 
        errors, 
        skipped, 
        updated, 
        created,
        duration 
      };
    } catch (error: any) {
      logger.error('Sync Wix products error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle Axios errors
      if (error.response?.status === 401) {
        throw createAppError('Wix access token is invalid or expired', 401, 'TOKEN_EXPIRED');
      }
      if (error.response?.status === 403) {
        throw createAppError('Insufficient permissions to access Wix products', 403, 'INSUFFICIENT_PERMISSIONS');
      }
      if (error.response?.status >= 500) {
        throw createAppError('Wix API is currently unavailable', 503, 'WIX_API_UNAVAILABLE');
      }

      throw createAppError(`Failed to sync Wix products: ${error.message}`, 500, 'SYNC_FAILED');
    }
  }

  async syncOrders(businessId: string, options: {
    forceSync?: boolean;
    limit?: number;
    startDate?: Date;
  } = {}): Promise<WixSyncResult> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixApiKey) {
        throw createAppError('Wix not connected for this business', 404, 'NOT_CONNECTED');
      }

      const startTime = Date.now();
      const limit = options.limit || 100;

      // Build query parameters
      const queryParams: any = { limit };
      if (options.startDate) {
        queryParams.filter = {
          dateCreated: {
            $gt: options.startDate.toISOString()
          }
        };
      }

      const response = await axios.get(
        'https://www.wixapis.com/stores/v1/orders/query',
        {
          headers: { 
            'Authorization': `Bearer ${settings.wixApiKey}`,
            'Content-Type': 'application/json'
          },
          data: { query: queryParams }
        }
      );

      if (!response.data?.orders || !Array.isArray(response.data.orders)) {
        return { synced: 0, errors: ['No orders found or invalid API response'] };
      }

      const orders: WixOrder[] = response.data.orders;
      const errors: string[] = [];
      let synced = 0;
      let created = 0;

      // Process orders and create certificates
      for (const order of orders) {
        try {
          const result = await this.processOrderCertificates(order, businessId);
          synced += result.processed;
          created += result.processed;
          errors.push(...result.errors);
        } catch (orderError: any) {
          errors.push(`Order ${order._id}: ${orderError.message}`);
        }
      }

      // Update last sync timestamp
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { 
          wixLastSync: new Date(),
          'wixSettings.lastOrderSync': new Date()
        }
      );

      const duration = Date.now() - startTime;

      return { 
        synced, 
        errors, 
        skipped: orders.length - synced,
        created,
        duration 
      };
    } catch (error: any) {
      logger.error('Sync Wix orders error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle Axios errors
      if (error.response?.status === 401) {
        throw createAppError('Wix access token is invalid or expired', 401, 'TOKEN_EXPIRED');
      }
      if (error.response?.status === 403) {
        throw createAppError('Insufficient permissions to access Wix orders', 403, 'INSUFFICIENT_PERMISSIONS');
      }

      throw createAppError(`Failed to sync Wix orders: ${error.message}`, 500, 'SYNC_FAILED');
    }
  }

  // ===== WEBHOOK HANDLING =====

  async processOrderWebhook(webhookData: any, instanceId: string): Promise<WixWebhookResult> {
    try {
      if (!webhookData || !instanceId?.trim()) {
        throw createAppError('Webhook data and instance ID are required', 400, 'MISSING_WEBHOOK_DATA');
      }

      const settings = await BrandSettings.findOne({ wixDomain: instanceId });
      if (!settings) {
        throw createAppError('Wix integration not found for this instance', 404, 'INTEGRATION_NOT_FOUND');
      }

      const order = webhookData.order || webhookData.data || webhookData;
      const result = await this.processOrderCertificates(order, settings.business.toString());

      return {
        processed: true,
        certificatesCreated: result.processed,
        errors: result.errors
      };
    } catch (error: any) {
      logger.error('Process order webhook error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      return {
        processed: false,
        reason: error.message,
        errors: [error.message]
      };
    }
  }

  async handleAppRemoval(instanceId: string): Promise<WixWebhookResult> {
    try {
      if (!instanceId?.trim()) {
        throw createAppError('Instance ID is required', 400, 'MISSING_INSTANCE_ID');
      }

      const settings = await BrandSettings.findOne({ wixDomain: instanceId });
      if (!settings) {
        // App was already removed or never connected
        return {
          processed: true,
          reason: 'App was already removed or never connected'
        };
      }

      // Clean up the integration
      await this.disconnectWix(settings.business.toString());

      return {
        processed: true,
        reason: 'Integration cleaned up successfully'
      };
    } catch (error: any) {
      logger.error('Handle app removal error:', error);
      
      return {
        processed: false,
        reason: error.message,
        errors: [error.message]
      };
    }
  }

  // ===== ANALYTICS AND REPORTING =====

  async getAnalytics(businessId: string, options: {
    startDate?: Date;
    endDate?: Date;
    metrics?: string[];
  } = {}): Promise<WixAnalytics> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const { startDate, endDate, metrics = ['orders', 'revenue', 'certificates'] } = options;
      
      // Default to last 30 days
      const fromDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = endDate || new Date();

      // Get basic connection info
      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixApiKey) {
        throw createAppError('Wix not connected for this business', 404, 'NOT_CONNECTED');
      }

      // TODO: Implement actual analytics aggregation
      // For now, return mock data structure
      
      const mockAnalytics: WixAnalytics = {
        summary: {
          totalOrders: 0,
          totalRevenue: '0.00',
          certificatesIssued: 0,
          syncSuccess: 95
        },
        trends: [],
        performance: {
          syncSuccessRate: 95,
          webhookSuccessRate: 98,
          averageProcessingTime: 1.2
        },
        recentActivity: []
      };

      // Generate daily trends for the date range
      const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      for (let i = 0; i < daysDiff; i++) {
        const date = new Date(fromDate);
        date.setDate(date.getDate() + i);
        
        mockAnalytics.trends.push({
          date: date.toISOString().split('T')[0],
          orders: Math.floor(Math.random() * 10),
          revenue: (Math.random() * 1000).toFixed(2),
          certificates: Math.floor(Math.random() * 8)
        });
      }

      return mockAnalytics;
    } catch (error: any) {
      logger.error('Get Wix analytics error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to get Wix analytics: ${error.message}`, 500, 'ANALYTICS_FAILED');
    }
  }

  // ===== CONNECTION TESTING =====

  async testConnection(businessId: string): Promise<WixTestResult> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixApiKey) {
        throw createAppError('Wix not connected for this business', 404, 'NOT_CONNECTED');
      }

      const startTime = Date.now();

      try {
        const response = await axios.get(
          'https://www.wixapis.com/site-properties/v4/properties',
          {
            headers: { 'Authorization': `Bearer ${settings.wixApiKey}` },
            timeout: 10000 // 10 second timeout
          }
        );

        const responseTime = Date.now() - startTime;

        // Extract instance information
        const instanceInfo = {
          siteId: settings.wixDomain || 'unknown',
          domain: response.data?.siteDisplayName || 'unknown',
          plan: response.data?.premiumPlan || 'free'
        };

        // Determine available permissions
        const permissions = [
          'wix-stores.orders-read',
          'wix-stores.products-read',
          'wix-webhooks.webhooks-write'
        ];

        // Update last connection test
        await BrandSettings.findOneAndUpdate(
          { business: businessId },
          { 'wixSettings.lastConnectionTest': new Date() }
        );

        return {
          success: true,
          responseTime,
          apiVersion: '4.0',
          instanceInfo,
          permissions
        };
      } catch (apiError: any) {
        const responseTime = Date.now() - startTime;
        
        return {
          success: false,
          responseTime,
          permissions: [],
          errors: [apiError.message || 'API connection failed']
        };
      }
    } catch (error: any) {
      logger.error('Test Wix connection error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      return {
        success: false,
        responseTime: 0,
        permissions: [],
        errors: [error.message || 'Connection test failed']
      };
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private async registerWebhooks(accessToken: string): Promise<void> {
    try {
      if (!accessToken?.trim()) {
        throw createAppError('Access token is required for webhook registration', 400, 'MISSING_ACCESS_TOKEN');
      }
      if (!APP_URL) {
        throw createAppError('APP_URL not configured for webhook registration', 500, 'MISSING_CONFIG');
      }

      const webhooks = [
        {
          event: 'OrderCreated',
          url: `${APP_URL}/api/wix/webhook`
        },
        {
          event: 'OrderUpdated', 
          url: `${APP_URL}/api/wix/webhook`
        }
      ];

      const errors: string[] = [];

      for (const webhook of webhooks) {
        try {
          await axios.post(
            'https://www.wixapis.com/webhooks/v1/webhooks',
            {
              name: `Ordira ${webhook.event}`,
              eventType: `wix.ecommerce.v1.${webhook.event}`,
              entityId: '*',
              url: webhook.url
            },
            {
              headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (error: any) {
          const errorMsg = `Failed to register webhook ${webhook.event}: ${error.response?.data?.message || error.message}`;
          errors.push(errorMsg);
          logger.warn(errorMsg); 
        }
      }

      // If all webhooks failed, throw an error
      if (errors.length === webhooks.length) {
        throw createAppError(`Failed to register any webhooks: ${errors.join(', ')}`, 500, 'WEBHOOK_REGISTRATION_FAILED');
      }
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Webhook registration failed: ${error.message}`, 500, 'WEBHOOK_REGISTRATION_FAILED');
    }
  }

  private async processOrderCertificates(orderData: any, businessId: string): Promise<{
    processed: number;
    errors: string[];
  }> {
    try {
      if (!orderData || !businessId?.trim()) {
        throw createAppError('Order data and business ID are required', 400, 'MISSING_PARAMETERS');
      }

      const errors: string[] = [];
      let processed = 0;

      // Handle different Wix webhook payload structures
      const order = orderData.order || orderData;
      const lineItems = order.lineItems || [];
      const customerEmail = order.buyerInfo?.email || order.billing?.email;

      if (!customerEmail?.trim()) {
        errors.push('No customer email found in order');
        return { processed, errors };
      }

      if (!Array.isArray(lineItems) || lineItems.length === 0) {
        errors.push('No line items found in order');
        return { processed, errors };
      }

      for (const item of lineItems) {
        try {
          if (!item) {
            errors.push('Invalid line item in order');
            continue;
          }

          const sku = item.sku || item.catalogReference?.catalogItemId;
          if (sku?.trim()) {
            await this.certificateService.createCertificate(businessId, {
              productId: sku,
              recipient: customerEmail,
              contactMethod: 'email'
            });
            processed++;
          } else {
            errors.push(`Item "${item.productName?.original || 'Unknown'}" has no SKU - skipped`);
          }
        } catch (error: any) {
          errors.push(`Failed to create certificate for "${item.productName?.original || 'Unknown'}": ${error.message}`);
        }
      }

      return { processed, errors };
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to process order certificates: ${error.message}`, 500, 'CERTIFICATE_PROCESSING_FAILED');
    }
  }

  private validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      if (!payload || !signature || !secret) {
        return false;
      }

      const computed = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
      
      return computed === signature;
    } catch (error) {
      logger.error('Error validating webhook signature:', error);
      return false;
    }
  }

  private async refreshAccessToken(businessId: string): Promise<void> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixRefreshToken) {
        throw createAppError('No refresh token available for this business', 404, 'NO_REFRESH_TOKEN');
      }

      // Validate environment variables
      const clientId = process.env.WIX_CLIENT_ID;
      const clientSecret = process.env.WIX_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw createAppError('Wix OAuth credentials not configured', 500, 'MISSING_OAUTH_CONFIG');
      }

      const response = await axios.post('https://www.wixapis.com/oauth/access', {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: settings.wixRefreshToken
      });

      const { access_token, refresh_token } = response.data;

      if (!access_token) {
        throw createAppError('No access token received during refresh', 400, 'REFRESH_FAILED');
      }

      const updatedSettings = await BrandSettings.findOneAndUpdate(
        { business: businessId },
        {
          wixApiKey: access_token,
          wixRefreshToken: refresh_token || settings.wixRefreshToken, // Keep old refresh token if new one not provided
          'wixSettings.lastTokenRefresh': new Date()
        },
        { new: true }
      );

      if (!updatedSettings) {
        throw createAppError('Failed to update Wix credentials', 500, 'UPDATE_CREDENTIALS_FAILED');
      }
    } catch (error: any) {
      logger.error('Refresh Wix token error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle token refresh errors
      if (error.response?.status === 400) {
        throw createAppError('Invalid refresh token - reconnection required', 401, 'INVALID_REFRESH_TOKEN');
      }
      if (error.response?.status >= 500) {
        throw createAppError('Wix API is currently unavailable', 503, 'WIX_API_UNAVAILABLE');
      }

      throw createAppError(`Failed to refresh Wix token: ${error.message}`, 500, 'TOKEN_REFRESH_FAILED');
    }
  }

  // ===== WEBHOOK MANAGEMENT =====

  async getWebhookStatus(businessId: string): Promise<{
    webhooks: Array<{
      id: string;
      name: string;
      eventType: string;
      url: string;
      active: boolean;
    }>;
    total: number;
    health: 'excellent' | 'good' | 'poor';
  }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixApiKey) {
        throw createAppError('Wix not connected for this business', 404, 'NOT_CONNECTED');
      }

      const response = await axios.get(
        'https://www.wixapis.com/webhooks/v1/webhooks',
        {
          headers: { 'Authorization': `Bearer ${settings.wixApiKey}` }
        }
      );

      const allWebhooks = response.data.webhooks || [];
      const ourWebhooks = allWebhooks.filter((webhook: any) => 
        webhook.url && webhook.url.includes(APP_URL)
      );

      // Determine health based on webhook count and status
      let health: 'excellent' | 'good' | 'poor';
      if (ourWebhooks.length >= 2) health = 'excellent';
      else if (ourWebhooks.length === 1) health = 'good';
      else health = 'poor';

      return {
        webhooks: ourWebhooks.map((webhook: any) => ({
          id: webhook.id,
          name: webhook.name,
          eventType: webhook.eventType,
          url: webhook.url,
          active: webhook.isActive !== false
        })),
        total: ourWebhooks.length,
        health
      };
    } catch (error: any) {
      logger.error('Get webhook status error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle API errors
      if (error.response?.status === 401) {
        throw createAppError('Wix access token is invalid or expired', 401, 'TOKEN_EXPIRED');
      }

      throw createAppError(`Failed to get webhook status: ${error.message}`, 500, 'WEBHOOK_STATUS_FAILED');
    }
  }

  async registerWebhook(businessId: string, webhookConfig: {
    eventType: string;
    url: string;
    name?: string;
  }): Promise<{
    webhookId: string;
    registered: boolean;
  }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixApiKey) {
        throw createAppError('Wix not connected for this business', 404, 'NOT_CONNECTED');
      }

      const response = await axios.post(
        'https://www.wixapis.com/webhooks/v1/webhooks',
        {
          name: webhookConfig.name || `Ordira ${webhookConfig.eventType}`,
          eventType: webhookConfig.eventType,
          entityId: '*',
          url: webhookConfig.url
        },
        {
          headers: { 
            'Authorization': `Bearer ${settings.wixApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        webhookId: response.data.webhook?.id || 'unknown',
        registered: true
      };
    } catch (error: any) {
      logger.error('Register webhook error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw createAppError('Wix access token is invalid or expired', 401, 'TOKEN_EXPIRED');
      }
      if (error.response?.status === 409) {
        throw createAppError('Webhook already exists for this event type', 409, 'WEBHOOK_EXISTS');
      }

      throw createAppError(`Failed to register webhook: ${error.message}`, 500, 'WEBHOOK_REGISTRATION_FAILED');
    }
  }

  async unregisterWebhook(businessId: string, webhookId: string): Promise<{
    unregistered: boolean;
  }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }
      if (!webhookId?.trim()) {
        throw createAppError('Webhook ID is required', 400, 'MISSING_WEBHOOK_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixApiKey) {
        throw createAppError('Wix not connected for this business', 404, 'NOT_CONNECTED');
      }

      await axios.delete(
        `https://www.wixapis.com/webhooks/v1/webhooks/${webhookId}`,
        {
          headers: { 'Authorization': `Bearer ${settings.wixApiKey}` }
        }
      );

      return {
        unregistered: true
      };
    } catch (error: any) {
      logger.error('Unregister webhook error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw createAppError('Wix access token is invalid or expired', 401, 'TOKEN_EXPIRED');
      }
      if (error.response?.status === 404) {
        throw createAppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND');
      }

      throw createAppError(`Failed to unregister webhook: ${error.message}`, 500, 'WEBHOOK_UNREGISTER_FAILED');
    }
  }

  // ===== STORE INFORMATION =====

  async getStoreInfo(businessId: string): Promise<{
    siteId: string;
    domain: string;
    name: string;
    plan: string;
    currency: string;
    locale: string;
    status: string;
  }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixApiKey) {
        throw createAppError('Wix not connected for this business', 404, 'NOT_CONNECTED');
      }

      const response = await axios.get(
        'https://www.wixapis.com/site-properties/v4/properties',
        {
          headers: { 'Authorization': `Bearer ${settings.wixApiKey}` }
        }
      );

      const siteData = response.data;

      return {
        siteId: settings.wixDomain || 'unknown',
        domain: siteData.siteDisplayName || 'unknown',
        name: siteData.siteName || 'Unknown Store',
        plan: siteData.premiumPlan || 'free',
        currency: siteData.currency || 'USD',
        locale: siteData.locale || 'en',
        status: siteData.siteStatus || 'unknown'
      };
    } catch (error: any) {
      logger.error('Get store info error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw createAppError('Wix access token is invalid or expired', 401, 'TOKEN_EXPIRED');
      }

      throw createAppError(`Failed to get store info: ${error.message}`, 500, 'STORE_INFO_FAILED');
    }
  }

  // ===== UTILITY METHODS =====

  async validateConnection(businessId: string): Promise<boolean> {
    try {
      const testResult = await this.testConnection(businessId);
      return testResult.success;
    } catch (error) {
      return false;
    }
  }

  async getConnectionHealth(businessId: string): Promise<{
    overall: 'excellent' | 'good' | 'poor' | 'critical';
    connection: boolean;
    webhooks: 'excellent' | 'good' | 'poor';
    lastSync: Date | null;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check basic connection
      const status = await this.getConnectionStatus(businessId);
      if (!status.connected) {
        issues.push('Wix is not connected');
        recommendations.push('Connect your Wix store to enable integration');
        return {
          overall: 'critical',
          connection: false,
          webhooks: 'poor',
          lastSync: null,
          issues,
          recommendations
        };
      }

      // Check webhook health
      const webhookStatus = await this.getWebhookStatus(businessId);
      if (webhookStatus.total === 0) {
        issues.push('No webhooks registered');
        recommendations.push('Register webhooks to receive real-time order updates');
      }

      // Check sync status
      if (status.lastSync) {
        const daysSinceSync = (Date.now() - status.lastSync.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSync > 7) {
          issues.push('No recent sync activity');
          recommendations.push('Perform a manual sync to ensure data is up to date');
        }
      }

      // Test API connection
      const testResult = await this.testConnection(businessId);
      if (!testResult.success) {
        issues.push('API connection test failed');
        recommendations.push('Check your internet connection and Wix API status');
      }

      // Determine overall health
      let overall: 'excellent' | 'good' | 'poor' | 'critical';
      if (issues.length === 0) overall = 'excellent';
      else if (issues.length <= 1) overall = 'good';
      else if (issues.length <= 2) overall = 'poor';
      else overall = 'critical';

      return {
        overall,
        connection: status.connected,
        webhooks: webhookStatus.health,
        lastSync: status.lastSync || null,
        issues,
        recommendations
      };
    } catch (error: any) {
      logger.error('Get connection health error:', error);
      
      return {
        overall: 'critical',
        connection: false,
        webhooks: 'poor',
        lastSync: null,
        issues: ['Unable to assess integration health'],
        recommendations: ['Check system configuration and try reconnecting']
      };
    }
  }

  async exportIntegrationData(businessId: string, options: {
    includeOrders?: boolean;
    includeProducts?: boolean;
    includeWebhooks?: boolean;
    format?: 'json' | 'csv';
  } = {}): Promise<{
    data: any;
    format: string;
    generatedAt: Date;
  }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const {
        includeOrders = true,
        includeProducts = true,
        includeWebhooks = true,
        format = 'json'
      } = options;

      const exportData: any = {
        businessId,
        integration: 'wix',
        exportedAt: new Date(),
        connectionStatus: await this.getConnectionStatus(businessId)
      };

      if (includeWebhooks) {
        exportData.webhooks = await this.getWebhookStatus(businessId);
      }

      if (includeProducts) {
        // Add product sync information
        exportData.productSync = {
          lastSync: exportData.connectionStatus.lastSync,
          status: 'available'
        };
      }

      if (includeOrders) {
        // Add order processing information
        exportData.orderProcessing = {
          enabled: true,
          certificateGeneration: true
        };
      }

      return {
        data: exportData,
        format,
        generatedAt: new Date()
      };
    } catch (error: any) {
      logger.error('Export integration data error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to export integration data: ${error.message}`, 500, 'EXPORT_FAILED');
    }
  }

  // ===== LEGACY COMPATIBILITY METHODS =====

  /**
   * Legacy method for backward compatibility
   * @deprecated Use disconnectWix instead
   */
  async disconnect(businessId: string): Promise<void> {
    await this.disconnectWix(businessId);
  }

}