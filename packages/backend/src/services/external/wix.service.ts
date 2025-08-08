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
 * Wix integration service for OAuth, webhook management, and product sync
 */
export class WixService {
  private certificateService = new CertificateService();

  /**
   * Generate Wix OAuth installation URL
   */
  async generateInstallUrl(businessId: string): Promise<string> {
    const clientId = process.env.WIX_CLIENT_ID!;
    const redirectUri = `${APP_URL}/api/integrations/wix/oauth/callback`;
    const state = businessId;
    const scope = 'wix-stores.orders-read,wix-stores.products-read,wix-webhooks.webhooks-write';
    
    return `https://www.wix.com/oauth/authorize` +
           `?client_id=${clientId}` +
           `&redirect_uri=${encodeURIComponent(redirectUri)}` +
           `&state=${state}` +
           `&scope=${scope}` +
           `&response_type=code`;
  }

  /**
   * Exchange OAuth code for access token and set up webhooks
   */
  async exchangeCode(code: string, state: string): Promise<void> {
    const clientId = process.env.WIX_CLIENT_ID!;
    const clientSecret = process.env.WIX_CLIENT_SECRET!;
    
    try {
      const tokenResponse = await axios.post('https://www.wixapis.com/oauth/access', {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${APP_URL}/api/integrations/wix/oauth/callback`
      });

      const { access_token, refresh_token, instance_id } = tokenResponse.data;

      // Register webhooks
      await this.registerWebhooks(access_token);

      // Persist credentials
      await BrandSettings.findOneAndUpdate(
        { business: state },
        {
          wixDomain: instance_id,
          wixApiKey: access_token,
          wixRefreshToken: refresh_token,
          wixConnectedAt: new Date()
        },
        { upsert: true }
      );

      console.log(`Wix integration completed for business ${state}`);
    } catch (error) {
      console.error('Wix OAuth exchange failed:', error);
      throw new Error(`Failed to complete Wix integration: ${error.message}`);
    }
  }

  /**
   * Register Wix webhooks
   */
  private async registerWebhooks(accessToken: string): Promise<void> {
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

    for (const webhook of webhooks) {
      try {
        await axios.post(
          'https://www.wixapis.com/webhooks/v1/webhooks',
          {
            name: `Despoke ${webhook.event}`,
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
      } catch (error) {
        console.warn(`Failed to register Wix webhook ${webhook.event}:`, error.response?.data);
      }
    }
  }

  /**
   * Process Wix order webhook
   */
  async processOrderWebhook(req: any): Promise<{
    processed: number;
    errors: string[];
  }> {
    const signature = req.get('wix-webhook-signature');
    const data = req.body;
    
    // Extract site ID from webhook data
    const siteId = data.instanceId || data.data?.instanceId;
    const settings = await BrandSettings.findOne({ wixDomain: siteId });
    
    if (!settings) {
      throw { statusCode: 404, message: 'Wix integration not found.' };
    }

    // Validate webhook signature
    if (!this.validateWebhookSignature(JSON.stringify(req.body), signature, settings.wixApiKey!)) {
      throw { statusCode: 401, message: 'Invalid Wix webhook signature.' };
    }

    const orderData = data.data || data;
    const results = await this.processOrderCertificates(orderData, settings.business.toString());

    return results;
  }

  /**
   * Process certificates for order items
   */
  private async processOrderCertificates(orderData: any, businessId: string): Promise<{
    processed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;

    // Handle different Wix webhook payload structures
    const order = orderData.order || orderData;
    const lineItems = order.lineItems || [];
    const customerEmail = order.buyerInfo?.email || order.billing?.email;

    if (!customerEmail) {
      errors.push('No customer email found in order');
      return { processed, errors };
    }

    for (const item of lineItems) {
      try {
        const sku = item.sku || item.catalogReference?.catalogItemId;
        if (sku) {
          await this.certificateService.createCertificate(businessId, {
            productId: sku,
            recipient: customerEmail,
            contactMethod: 'email'
          });
          processed++;
        } else {
          errors.push(`Item ${item.productName?.original || 'Unknown'} has no SKU - skipped`);
        }
      } catch (error) {
        errors.push(`Failed to create certificate for item: ${error.message}`);
      }
    }

    return { processed, errors };
  }

  /**
   * Sync products from Wix
   */
  async syncProducts(businessId: string): Promise<{
    synced: number;
    errors: string[];
  }> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.wixApiKey) {
      throw new Error('Wix not connected for this business');
    }

    try {
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

      const products: WixProduct[] = response.data.products || [];
      const errors: string[] = [];
      let synced = 0;

      // TODO: Implement product sync logic with ProductService
      
      return { synced, errors };
    } catch (error) {
      throw new Error(`Failed to sync Wix products: ${error.message}`);
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
    const settings = await BrandSettings.findOne({ business: businessId });
    
    return {
      connected: !!(settings?.wixApiKey),
      siteId: settings?.wixDomain,
      connectedAt: settings?.wixConnectedAt,
      lastSync: settings?.wixLastSync
    };
  }

  /**
   * Refresh Wix access token
   */
  async refreshAccessToken(businessId: string): Promise<void> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.wixRefreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post('https://www.wixapis.com/oauth/access', {
        grant_type: 'refresh_token',
        client_id: process.env.WIX_CLIENT_ID!,
        client_secret: process.env.WIX_CLIENT_SECRET!,
        refresh_token: settings.wixRefreshToken
      });

      const { access_token, refresh_token } = response.data;

      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        {
          wixApiKey: access_token,
          wixRefreshToken: refresh_token
        }
      );
    } catch (error) {
      throw new Error(`Failed to refresh Wix token: ${error.message}`);
    }
  }

  /**
   * Disconnect Wix integration
   */
  async disconnect(businessId: string): Promise<void> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.wixApiKey) {
      throw new Error('Wix not connected for this business');
    }

    try {
      // Revoke webhooks
      const webhooksResponse = await axios.get(
        'https://www.wixapis.com/webhooks/v1/webhooks',
        {
          headers: { 'Authorization': `Bearer ${settings.wixApiKey}` }
        }
      );

      for (const webhook of webhooksResponse.data.webhooks || []) {
        if (webhook.url.includes(APP_URL)) {
          await axios.delete(
            `https://www.wixapis.com/webhooks/v1/webhooks/${webhook.id}`,
            {
              headers: { 'Authorization': `Bearer ${settings.wixApiKey}` }
            }
          );
        }
      }
    } catch (error) {
      console.warn('Failed to remove Wix webhooks:', error);
    }

    // Clear integration data
    await BrandSettings.findOneAndUpdate(
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
  }

  /**
   * Validate webhook signature
   */
  private validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const computed = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    return computed === signature;
  }

  /**
   * Test Wix API connection
   */
  async testConnection(businessId: string): Promise<boolean> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.wixApiKey) {
      return false;
    }

    try {
      await axios.get(
        'https://www.wixapis.com/site-properties/v4/properties',
        {
          headers: { 'Authorization': `Bearer ${settings.wixApiKey}` }
        }
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}