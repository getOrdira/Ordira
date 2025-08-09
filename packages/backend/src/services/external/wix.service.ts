// src/services/external/wix.service.ts
import axios from 'axios';
import crypto from 'crypto';
import { BrandSettings } from '../../models/brandSettings.model';
import { CertificateService } from '../business/certificate.service';

const APP_URL = process.env.APP_URL!;

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

/**
 * Custom error class for Wix operations with status codes
 */
class WixError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'WixError';
    this.statusCode = statusCode;
  }
}

/**
 * Wix integration service for OAuth, webhook management, and product sync
 */
export class WixService {
  private certificateService = new CertificateService();

  /**
   * Generate Wix OAuth installation URL
   */
  async generateInstallUrl(businessId: string): Promise<string> {
    try {
      if (!businessId?.trim()) {
        throw new WixError('Business ID is required', 400);
      }

      // Validate environment variables
      const clientId = process.env.WIX_CLIENT_ID;
      if (!clientId) {
        throw new WixError('WIX_CLIENT_ID not configured', 500);
      }
      if (!APP_URL) {
        throw new WixError('APP_URL not configured', 500);
      }

      const redirectUri = `${APP_URL}/api/integrations/wix/oauth/callback`;
      const state = businessId;
      const scope = 'wix-stores.orders-read,wix-stores.products-read,wix-webhooks.webhooks-write';
      
      return `https://www.wix.com/oauth/authorize` +
             `?client_id=${clientId}` +
             `&redirect_uri=${encodeURIComponent(redirectUri)}` +
             `&state=${state}` +
             `&scope=${scope}` +
             `&response_type=code`;
    } catch (error: any) {
      if (error instanceof WixError) {
        throw error;
      }

      throw new WixError(`Failed to generate Wix install URL: ${error.message}`, 500);
    }
  }

  /**
   * Exchange OAuth code for access token and set up webhooks
   */
  async exchangeCode(code: string, state: string): Promise<void> {
    try {
      // Validate inputs
      if (!code?.trim()) {
        throw new WixError('Authorization code is required', 400);
      }
      if (!state?.trim()) {
        throw new WixError('State parameter is required', 400);
      }

      // Validate environment variables
      const clientId = process.env.WIX_CLIENT_ID;
      const clientSecret = process.env.WIX_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new WixError('Wix OAuth credentials not configured', 500);
      }
      if (!APP_URL) {
        throw new WixError('APP_URL not configured', 500);
      }
      
      const tokenResponse = await axios.post('https://www.wixapis.com/oauth/access', {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${APP_URL}/api/integrations/wix/oauth/callback`
      });

      const { access_token, refresh_token, instance_id } = tokenResponse.data;

      if (!access_token) {
        throw new WixError('No access token received from Wix', 400);
      }
      if (!instance_id) {
        throw new WixError('No instance ID received from Wix', 400);
      }

      // Register webhooks
      await this.registerWebhooks(access_token);

      // Persist credentials
      const updatedSettings = await BrandSettings.findOneAndUpdate(
        { business: state },
        {
          wixDomain: instance_id,
          wixApiKey: access_token,
          wixRefreshToken: refresh_token,
          wixConnectedAt: new Date()
        },
        { upsert: true, new: true }
      );

      if (!updatedSettings) {
        throw new WixError('Failed to save Wix credentials', 500);
      }

      console.log(`Wix integration completed for business ${state}`);
    } catch (error: any) {
      if (error instanceof WixError) {
        throw error;
      }

      // Handle Axios errors
      if (error.response?.status === 400) {
        throw new WixError('Invalid authorization code or credentials', 400);
      }
      if (error.response?.status === 401) {
        throw new WixError('Unauthorized - invalid Wix credentials', 401);
      }
      if (error.response?.status >= 500) {
        throw new WixError('Wix API is currently unavailable', 503);
      }

      // Handle network errors
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new WixError('Unable to connect to Wix API', 503);
      }

      throw new WixError(`Failed to complete Wix integration: ${error.message}`, 500);
    }
  }

  /**
   * Register Wix webhooks
   */
  private async registerWebhooks(accessToken: string): Promise<void> {
    try {
      if (!accessToken?.trim()) {
        throw new WixError('Access token is required for webhook registration', 400);
      }
      if (!APP_URL) {
        throw new WixError('APP_URL not configured for webhook registration', 500);
      }

      const webhooks = [
        {
          event: 'OrderCreated',
          url: `${APP_URL}/api/integrations/wix/webhook/orders/create`
        },
        {
          event: 'OrderUpdated', 
          url: `${APP_URL}/api/integrations/wix/webhook/orders/updated`
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
          console.warn(errorMsg);
        }
      }

      // If all webhooks failed, throw an error
      if (errors.length === webhooks.length) {
        throw new WixError(`Failed to register any webhooks: ${errors.join(', ')}`, 500);
      }
    } catch (error: any) {
      if (error instanceof WixError) {
        throw error;
      }

      throw new WixError(`Webhook registration failed: ${error.message}`, 500);
    }
  }

  /**
   * Process Wix order webhook
   */
  async processOrderWebhook(req: any): Promise<{
    processed: number;
    errors: string[];
  }> {
    try {
      const signature = req.get('wix-webhook-signature');
      const data = req.body;
      
      if (!signature?.trim()) {
        throw new WixError('Missing webhook signature', 400);
      }
      if (!data) {
        throw new WixError('Missing webhook payload', 400);
      }
      
      // Extract site ID from webhook data
      const siteId = data.instanceId || data.data?.instanceId;
      if (!siteId) {
        throw new WixError('No site ID found in webhook payload', 400);
      }

      const settings = await BrandSettings.findOne({ wixDomain: siteId });
      if (!settings) {
        throw new WixError('Wix integration not found for this site', 404);
      }

      if (!settings.wixApiKey) {
        throw new WixError('Wix API key not configured for this integration', 500);
      }

      // Validate webhook signature
      if (!this.validateWebhookSignature(JSON.stringify(req.body), signature, settings.wixApiKey)) {
        throw new WixError('Invalid Wix webhook signature', 401);
      }

      const orderData = data.data || data;
      if (!orderData) {
        throw new WixError('No order data found in webhook payload', 400);
      }

      const results = await this.processOrderCertificates(orderData, settings.business.toString());
      return results;
    } catch (error: any) {
      if (error instanceof WixError) {
        throw error;
      }

      throw new WixError(`Failed to process order webhook: ${error.message}`, 500);
    }
  }

  /**
   * Process certificates for order items
   */
  private async processOrderCertificates(orderData: any, businessId: string): Promise<{
    processed: number;
    errors: string[];
  }> {
    try {
      if (!orderData || !businessId?.trim()) {
        throw new WixError('Order data and business ID are required', 400);
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
      if (error instanceof WixError) {
        throw error;
      }

      throw new WixError(`Failed to process order certificates: ${error.message}`, 500);
    }
  }

  /**
   * Sync products from Wix
   */
  async syncProducts(businessId: string): Promise<{
    synced: number;
    errors: string[];
  }> {
    try {
      if (!businessId?.trim()) {
        throw new WixError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixApiKey) {
        throw new WixError('Wix not connected for this business', 404);
      }

      const response = await axios.get(
        'https://www.wixapis.com/stores/v1/products/query',
        {
          headers: { 
            'Authorization': `Bearer ${settings.wixApiKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            query: {
              limit: 100
            }
          }
        }
      );

      if (!response.data?.products || !Array.isArray(response.data.products)) {
        throw new WixError('Invalid response from Wix products API', 500);
      }

      const products: WixProduct[] = response.data.products;
      const errors: string[] = [];
      let synced = 0;

      // TODO: Implement product sync logic with ProductService
      
      // Update last sync timestamp
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { wixLastSync: new Date() }
      );

      return { synced, errors };
    } catch (error: any) {
      if (error instanceof WixError) {
        throw error;
      }

      // Handle Axios errors
      if (error.response?.status === 401) {
        throw new WixError('Wix access token is invalid or expired', 401);
      }
      if (error.response?.status === 403) {
        throw new WixError('Insufficient permissions to access Wix products', 403);
      }
      if (error.response?.status >= 500) {
        throw new WixError('Wix API is currently unavailable', 503);
      }

      throw new WixError(`Failed to sync Wix products: ${error.message}`, 500);
    }
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(businessId: string): Promise<{
    connected: boolean;
    siteId?: string;
    connectedAt?: Date;
    lastSync?: Date;
  }> {
    try {
      if (!businessId?.trim()) {
        throw new WixError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      
      return {
        connected: !!(settings?.wixApiKey),
        siteId: settings?.wixDomain,
        connectedAt: settings?.wixConnectedAt,
        lastSync: settings?.wixLastSync
      };
    } catch (error: any) {
      if (error instanceof WixError) {
        throw error;
      }

      throw new WixError(`Failed to get Wix connection status: ${error.message}`, 500);
    }
  }

  /**
   * Refresh Wix access token
   */
  async refreshAccessToken(businessId: string): Promise<void> {
    try {
      if (!businessId?.trim()) {
        throw new WixError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixRefreshToken) {
        throw new WixError('No refresh token available for this business', 404);
      }

      // Validate environment variables
      const clientId = process.env.WIX_CLIENT_ID;
      const clientSecret = process.env.WIX_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new WixError('Wix OAuth credentials not configured', 500);
      }

      const response = await axios.post('https://www.wixapis.com/oauth/access', {
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: settings.wixRefreshToken
      });

      const { access_token, refresh_token } = response.data;

      if (!access_token) {
        throw new WixError('No access token received during refresh', 400);
      }

      const updatedSettings = await BrandSettings.findOneAndUpdate(
        { business: businessId },
        {
          wixApiKey: access_token,
          wixRefreshToken: refresh_token || settings.wixRefreshToken // Keep old refresh token if new one not provided
        },
        { new: true }
      );

      if (!updatedSettings) {
        throw new WixError('Failed to update Wix credentials', 500);
      }
    } catch (error: any) {
      if (error instanceof WixError) {
        throw error;
      }

      // Handle token refresh errors
      if (error.response?.status === 400) {
        throw new WixError('Invalid refresh token - reconnection required', 401);
      }
      if (error.response?.status >= 500) {
        throw new WixError('Wix API is currently unavailable', 503);
      }

      throw new WixError(`Failed to refresh Wix token: ${error.message}`, 500);
    }
  }

  /**
   * Disconnect Wix integration
   */
  async disconnect(businessId: string): Promise<void> {
    try {
      if (!businessId?.trim()) {
        throw new WixError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixApiKey) {
        throw new WixError('Wix not connected for this business', 404);
      }

      try {
        // Revoke webhooks
        const webhooksResponse = await axios.get(
          'https://www.wixapis.com/webhooks/v1/webhooks',
          {
            headers: { 'Authorization': `Bearer ${settings.wixApiKey}` }
          }
        );

        if (webhooksResponse.data?.webhooks && Array.isArray(webhooksResponse.data.webhooks)) {
          for (const webhook of webhooksResponse.data.webhooks) {
            if (webhook.url && webhook.url.includes(APP_URL)) {
              try {
                await axios.delete(
                  `https://www.wixapis.com/webhooks/v1/webhooks/${webhook.id}`,
                  {
                    headers: { 'Authorization': `Bearer ${settings.wixApiKey}` }
                  }
                );
              } catch (deleteError: any) {
                console.warn(`Failed to delete webhook ${webhook.id}:`, deleteError.message);
              }
            }
          }
        }
      } catch (error: any) {
        console.warn('Failed to remove Wix webhooks:', error.message);
        // Don't fail the disconnect operation if webhook cleanup fails
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
            wixLastSync: 1
          }
        }
      );

      if (!result) {
        throw new WixError('Failed to clear Wix integration data', 500);
      }
    } catch (error: any) {
      if (error instanceof WixError) {
        throw error;
      }

      throw new WixError(`Failed to disconnect Wix integration: ${error.message}`, 500);
    }
  }

  /**
   * Validate webhook signature
   */
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
      console.error('Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * Test Wix API connection
   */
  async testConnection(businessId: string): Promise<boolean> {
    try {
      if (!businessId?.trim()) {
        return false;
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixApiKey) {
        return false;
      }

      await axios.get(
        'https://www.wixapis.com/site-properties/v4/properties',
        {
          headers: { 'Authorization': `Bearer ${settings.wixApiKey}` },
          timeout: 10000 // 10 second timeout
        }
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get webhook status for debugging
   */
  async getWebhookStatus(businessId: string): Promise<{
    webhooks: Array<{
      id: string;
      name: string;
      eventType: string;
      url: string;
    }>;
    total: number;
  }> {
    try {
      if (!businessId?.trim()) {
        throw new WixError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wixApiKey) {
        throw new WixError('Wix not connected for this business', 404);
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

      return {
        webhooks: ourWebhooks.map((webhook: any) => ({
          id: webhook.id,
          name: webhook.name,
          eventType: webhook.eventType,
          url: webhook.url
        })),
        total: ourWebhooks.length
      };
    } catch (error: any) {
      if (error instanceof WixError) {
        throw error;
      }

      // Handle API errors
      if (error.response?.status === 401) {
        throw new WixError('Wix access token is invalid or expired', 401);
      }

      throw new WixError(`Failed to get webhook status: ${error.message}`, 500);
    }
  }
}