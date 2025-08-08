// src/services/external/shopify.service.ts
import axios from 'axios';
import crypto from 'crypto';
import { BrandSettings } from '../../models/brandSettings.model';
import { CertificateService } from '../business/certificate.service';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;
const APP_URL = process.env.APP_URL!;

export interface ShopifyOrder {
  id: number;
  email: string;
  line_items: Array<{
    id: number;
    sku: string;
    title: string;
    quantity: number;
    price: string;
  }>;
  shipping_address?: {
    first_name: string;
    last_name: string;
    email?: string;
  };
  customer?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  images: Array<{
    id: number;
    src: string;
  }>;
  variants: Array<{
    id: number;
    sku: string;
    title: string;
    price: string;
  }>;
}

/**
 * Shopify integration service for OAuth, webhook management, and product sync
 */
export class ShopifyService {
  private certificateService = new CertificateService();

  /**
   * Constructs the OAuth install URL for Shopify
   */
  async generateInstallUrl(businessId: string, shopDomain?: string): Promise<string> {
    let shop = shopDomain;
    
    if (!shop) {
      const settings = await BrandSettings.findOne({ business: businessId });
      shop = settings?.shopifyDomain;
    }

    if (!shop) {
      throw new Error('Shop domain is required for Shopify installation');
    }

    const state = businessId;
    const scopes = [
      'read_products', 
      'write_webhooks', 
      'read_orders', 
      'read_customers',
      'read_inventory'
    ];
    const redirectUri = `${APP_URL}/api/integrations/shopify/oauth/callback`;

    return `https://${shop}.myshopify.com/admin/oauth/authorize` +
           `?client_id=${SHOPIFY_API_KEY}` +
           `&scope=${scopes.join(',')}` +
           `&redirect_uri=${encodeURIComponent(redirectUri)}` +
           `&state=${state}`;
  }

  /**
   * Handles OAuth callback and sets up webhooks
   */
  async exchangeCode(shop: string, code: string, state: string): Promise<void> {
    try {
      // 1) Exchange code for access token
      const tokenRes = await axios.post(`https://${shop}/admin/oauth/access_token`, {
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code
      });
      const accessToken = tokenRes.data.access_token;

      // 2) Register webhooks
      await this.registerWebhooks(shop, accessToken);

      // 3) Persist credentials
      await BrandSettings.findOneAndUpdate(
        { business: state },
        {
          shopifyDomain: shop,
          shopifyAccessToken: accessToken,
          shopifyWebhookSecret: SHOPIFY_API_SECRET,
          shopifyConnectedAt: new Date()
        },
        { upsert: true }
      );

      console.log(`Shopify integration completed for business ${state}`);
    } catch (error) {
      console.error('Shopify OAuth exchange failed:', error);
      throw new Error(`Failed to complete Shopify integration: ${error.message}`);
    }
  }

  /**
   * Register required webhooks
   */
  private async registerWebhooks(shop: string, accessToken: string): Promise<void> {
    const webhooks = [
      {
        topic: 'orders/create',
        address: `${APP_URL}/api/integrations/shopify/webhook/orders/create`
      },
      {
        topic: 'orders/updated',
        address: `${APP_URL}/api/integrations/shopify/webhook/orders/updated`
      },
      {
        topic: 'app/uninstalled',
        address: `${APP_URL}/api/integrations/shopify/webhook/app/uninstalled`
      }
    ];

    for (const webhook of webhooks) {
      try {
        await axios.post(
          `https://${shop}/admin/api/2024-01/webhooks.json`,
          {
            webhook: {
              topic: webhook.topic,
              address: webhook.address,
              format: 'json'
            }
          },
          {
            headers: { 'X-Shopify-Access-Token': accessToken }
          }
        );
      } catch (error) {
        console.warn(`Failed to register webhook ${webhook.topic}:`, error.response?.data);
      }
    }
  }

  /**
   * Process order creation webhook
   */
  async processOrderWebhook(req: any): Promise<{
    processed: number;
    errors: string[];
  }> {
    const shop = req.get('X-Shopify-Shop-Domain');
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
    
    const settings = await BrandSettings.findOne({ shopifyDomain: shop });
    if (!settings) {
      throw { statusCode: 404, message: 'Shop not connected.' };
    }

    // Validate webhook signature
    if (!this.validateWebhookSignature(req.rawBody, hmacHeader, settings.shopifyWebhookSecret!)) {
      throw { statusCode: 401, message: 'Invalid Shopify webhook signature.' };
    }

    const order: ShopifyOrder = JSON.parse(req.rawBody.toString());
    const results = await this.processOrderCertificates(order, settings.business.toString());

    return results;
  }

  /**
   * Process certificates for order items
   */
  private async processOrderCertificates(order: ShopifyOrder, businessId: string): Promise<{
    processed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;

    for (const item of order.line_items) {
      try {
        if (item.sku) {
          await this.certificateService.createCertificate(businessId, {
            productId: item.sku,
            recipient: order.email,
            contactMethod: 'email'
          });
          processed++;
        } else {
          errors.push(`Item ${item.title} has no SKU - skipped certificate creation`);
        }
      } catch (error) {
        errors.push(`Failed to create certificate for ${item.title}: ${error.message}`);
      }
    }

    return { processed, errors };
  }

  /**
   * Sync products from Shopify to platform
   */
  async syncProducts(businessId: string): Promise<{
    synced: number;
    errors: string[];
  }> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.shopifyAccessToken) {
      throw new Error('Shopify not connected for this business');
    }

    try {
      const response = await axios.get(
        `https://${settings.shopifyDomain}/admin/api/2024-01/products.json`,
        {
          headers: { 'X-Shopify-Access-Token': settings.shopifyAccessToken },
          params: { limit: 250 }
        }
      );

      const products: ShopifyProduct[] = response.data.products;
      const errors: string[] = [];
      let synced = 0;

      // TODO: Implement product sync logic with ProductService
      // This would create/update products in your platform database

      return { synced, errors };
    } catch (error) {
      throw new Error(`Failed to sync Shopify products: ${error.message}`);
    }
  }

  /**
   * Get Shopify connection status
   */
  async getConnectionStatus(businessId: string): Promise<{
    connected: boolean;
    shopDomain?: string;
    connectedAt?: Date;
    lastSync?: Date;
  }> {
    const settings = await BrandSettings.findOne({ business: businessId });
    
    return {
      connected: !!(settings?.shopifyAccessToken),
      shopDomain: settings?.shopifyDomain,
      connectedAt: settings?.shopifyConnectedAt,
      lastSync: settings?.shopifyLastSync
    };
  }

  /**
   * Disconnect Shopify integration
   */
  async disconnect(businessId: string): Promise<void> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.shopifyAccessToken) {
      throw new Error('Shopify not connected for this business');
    }

    try {
      // Remove webhooks
      const webhooksResponse = await axios.get(
        `https://${settings.shopifyDomain}/admin/api/2024-01/webhooks.json`,
        {
          headers: { 'X-Shopify-Access-Token': settings.shopifyAccessToken }
        }
      );

      for (const webhook of webhooksResponse.data.webhooks) {
        if (webhook.address.includes(APP_URL)) {
          await axios.delete(
            `https://${settings.shopifyDomain}/admin/api/2024-01/webhooks/${webhook.id}.json`,
            {
              headers: { 'X-Shopify-Access-Token': settings.shopifyAccessToken }
            }
          );
        }
      }
    } catch (error) {
      console.warn('Failed to remove Shopify webhooks:', error);
    }

    // Clear integration data
    await BrandSettings.findOneAndUpdate(
      { business: businessId },
      {
        $unset: {
          shopifyDomain: 1,
          shopifyAccessToken: 1,
          shopifyWebhookSecret: 1,
          shopifyConnectedAt: 1,
          shopifyLastSync: 1
        }
      }
    );
  }

  /**
   * Validate webhook signature
   */
  private validateWebhookSignature(rawBody: Buffer, hmacHeader: string, secret: string): boolean {
    const computed = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');
    
    return computed === hmacHeader;
  }

  /**
   * Test Shopify API connection
   */
  async testConnection(businessId: string): Promise<boolean> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.shopifyAccessToken) {
      return false;
    }

    try {
      await axios.get(
        `https://${settings.shopifyDomain}/admin/api/2024-01/shop.json`,
        {
          headers: { 'X-Shopify-Access-Token': settings.shopifyAccessToken }
        }
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}