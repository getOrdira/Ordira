// src/services/external/shopify.service.ts
import axios from 'axios';
import { logger, logSafeInfo, logSafeError } from '../../utils/logger';
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
 * Custom error class for Shopify operations with status codes
 */
class ShopifyError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'ShopifyError';
    this.statusCode = statusCode;
  }
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
    try {
      if (!businessId?.trim()) {
        throw new ShopifyError('Business ID is required', 400);
      }

      let shop = shopDomain;
      
      if (!shop) {
        const settings = await BrandSettings.findOne({ business: businessId });
        shop = settings?.shopifyDomain;
      }

      if (!shop?.trim()) {
        throw new ShopifyError('Shop domain is required for Shopify installation', 400);
      }

      // Validate shop domain format
      if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]$/.test(shop)) {
        throw new ShopifyError('Invalid shop domain format', 400);
      }

      // Validate environment variables
      if (!SHOPIFY_API_KEY) {
        throw new ShopifyError('SHOPIFY_API_KEY not configured', 500);
      }
      if (!APP_URL) {
        throw new ShopifyError('APP_URL not configured', 500);
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
    } catch (error: any) {
      if (error instanceof ShopifyError) {
        throw error;
      }

      // Handle database errors
      if (error.name === 'MongooseError' || error.name === 'MongoError') {
        throw new ShopifyError('Database error while generating install URL', 503);
      }

      throw new ShopifyError(`Failed to generate Shopify install URL: ${error.message}`, 500);
    }
  }

  /**
   * Handles OAuth callback and sets up webhooks
   */
  async exchangeCode(shop: string, code: string, state: string): Promise<void> {
    try {
      // Validate inputs
      if (!shop?.trim()) {
        throw new ShopifyError('Shop domain is required', 400);
      }
      if (!code?.trim()) {
        throw new ShopifyError('Authorization code is required', 400);
      }
      if (!state?.trim()) {
        throw new ShopifyError('State parameter is required', 400);
      }

      // Validate environment variables
      if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
        throw new ShopifyError('Shopify API credentials not configured', 500);
      }

      // 1) Exchange code for access token
      const tokenRes = await axios.post(`https://${shop}/admin/oauth/access_token`, {
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code
      });

      if (!tokenRes.data?.access_token) {
        throw new ShopifyError('No access token received from Shopify', 400);
      }

      const accessToken = tokenRes.data.access_token;

      // 2) Register webhooks
      await this.registerWebhooks(shop, accessToken);

      // 3) Persist credentials
      const updatedSettings = await BrandSettings.findOneAndUpdate(
        { business: state },
        {
          shopifyDomain: shop,
          shopifyAccessToken: accessToken,
          shopifyWebhookSecret: SHOPIFY_API_SECRET,
          shopifyConnectedAt: new Date()
        },
        { upsert: true, new: true }
      );

      if (!updatedSettings) {
        throw new ShopifyError('Failed to save Shopify credentials', 500);
      }

      logSafeInfo('Shopify integration completed', { businessId: state });
    } catch (error: any) {
      if (error instanceof ShopifyError) {
        throw error;
      }

      // Handle Axios errors
      if (error.response?.status === 400) {
        throw new ShopifyError('Invalid authorization code or credentials', 400);
      }
      if (error.response?.status === 401) {
        throw new ShopifyError('Unauthorized - invalid Shopify credentials', 401);
      }
      if (error.response?.status >= 500) {
        throw new ShopifyError('Shopify API is currently unavailable', 503);
      }

      // Handle network errors
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new ShopifyError('Unable to connect to Shopify API', 503);
      }

      throw new ShopifyError(`Failed to complete Shopify integration: ${error.message}`, 500);
    }
  }

  /**
   * Register required webhooks
   */
  private async registerWebhooks(shop: string, accessToken: string): Promise<void> {
    try {
      if (!shop?.trim() || !accessToken?.trim()) {
        throw new ShopifyError('Shop domain and access token are required for webhook registration', 400);
      }

      if (!APP_URL) {
        throw new ShopifyError('APP_URL not configured for webhook registration', 500);
      }

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

      const errors: string[] = [];

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
        } catch (error: any) {
          const errorMsg = `Failed to register webhook ${webhook.topic}: ${error.response?.data?.errors || error.message}`;
          errors.push(errorMsg);
          logger.warn(errorMsg);
        }
      }

      // If all webhooks failed, throw an error
      if (errors.length === webhooks.length) {
        throw new ShopifyError(`Failed to register any webhooks: ${errors.join(', ')}`, 500);
      }
    } catch (error: any) {
      if (error instanceof ShopifyError) {
        throw error;
      }

      throw new ShopifyError(`Webhook registration failed: ${error.message}`, 500);
    }
  }

  /**
   * Process order creation webhook
   */
  async processOrderWebhook(req: any): Promise<{
    processed: number;
    errors: string[];
  }> {
    try {
      const shop = req.get('X-Shopify-Shop-Domain');
      const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
      
      if (!shop?.trim()) {
        throw new ShopifyError('Missing shop domain in webhook headers', 400);
      }
      if (!hmacHeader?.trim()) {
        throw new ShopifyError('Missing HMAC signature in webhook headers', 400);
      }
      if (!req.rawBody) {
        throw new ShopifyError('Missing request body in webhook', 400);
      }

      const settings = await BrandSettings.findOne({ shopifyDomain: shop });
      if (!settings) {
        throw new ShopifyError('Shop not connected to our platform', 404);
      }

      if (!settings.shopifyWebhookSecret) {
        throw new ShopifyError('Webhook secret not configured for this shop', 500);
      }

      // Validate webhook signature
      if (!this.validateWebhookSignature(req.rawBody, hmacHeader, settings.shopifyWebhookSecret)) {
        throw new ShopifyError('Invalid Shopify webhook signature', 401);
      }

      let order: ShopifyOrder;
      try {
        order = JSON.parse(req.rawBody.toString());
      } catch (parseError) {
        throw new ShopifyError('Invalid JSON in webhook payload', 400);
      }

      // Validate order structure
      if (!order.id || !order.email || !Array.isArray(order.line_items)) {
        throw new ShopifyError('Invalid order structure in webhook payload', 400);
      }

      const results = await this.processOrderCertificates(order, settings.business.toString());
      return results;
    } catch (error: any) {
      if (error instanceof ShopifyError) {
        throw error;
      }

      throw new ShopifyError(`Failed to process order webhook: ${error.message}`, 500);
    }
  }

  /**
   * Process certificates for order items
   */
  private async processOrderCertificates(order: ShopifyOrder, businessId: string): Promise<{
    processed: number;
    errors: string[];
  }> {
    try {
      if (!order || !businessId?.trim()) {
        throw new ShopifyError('Order and business ID are required', 400);
      }

      const errors: string[] = [];
      let processed = 0;

      if (!order.line_items || order.line_items.length === 0) {
        return { processed: 0, errors: ['No line items found in order'] };
      }

      for (const item of order.line_items) {
        try {
          if (!item) {
            errors.push('Invalid line item in order');
            continue;
          }

          if (item.sku?.trim()) {
            await this.certificateService.createCertificate(businessId, {
              productId: item.sku,
              recipient: order.email,
              contactMethod: 'email'
            });
            processed++;
          } else {
            errors.push(`Item "${item.title || 'Unknown'}" has no SKU - skipped certificate creation`);
          }
        } catch (error: any) {
          errors.push(`Failed to create certificate for "${item.title || 'Unknown'}": ${error.message}`);
        }
      }

      return { processed, errors };
    } catch (error: any) {
      if (error instanceof ShopifyError) {
        throw error;
      }

      throw new ShopifyError(`Failed to process order certificates: ${error.message}`, 500);
    }
  }

  /**
   * Sync products from Shopify to platform
   */
  async syncProducts(businessId: string): Promise<{
    synced: number;
    errors: string[];
  }> {
    try {
      if (!businessId?.trim()) {
        throw new ShopifyError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.shopifyAccessToken) {
        throw new ShopifyError('Shopify not connected for this business', 404);
      }

      if (!settings.shopifyDomain) {
        throw new ShopifyError('Shopify domain not configured for this business', 500);
      }

      const response = await axios.get(
        `https://${settings.shopifyDomain}/admin/api/2024-01/products.json`,
        {
          headers: { 'X-Shopify-Access-Token': settings.shopifyAccessToken },
          params: { limit: 250 }
        }
      );

      if (!response.data?.products || !Array.isArray(response.data.products)) {
        throw new ShopifyError('Invalid response from Shopify products API', 500);
      }

      const products: ShopifyProduct[] = response.data.products;
      const errors: string[] = [];
      let synced = 0;

      // TODO: Implement product sync logic with ProductService
      // This would create/update products in your platform database

      // Update last sync timestamp
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { shopifyLastSync: new Date() }
      );

      return { synced, errors };
    } catch (error: any) {
      if (error instanceof ShopifyError) {
        throw error;
      }

      // Handle Axios errors
      if (error.response?.status === 401) {
        throw new ShopifyError('Shopify access token is invalid or expired', 401);
      }
      if (error.response?.status === 403) {
        throw new ShopifyError('Insufficient permissions to access Shopify products', 403);
      }
      if (error.response?.status >= 500) {
        throw new ShopifyError('Shopify API is currently unavailable', 503);
      }

      throw new ShopifyError(`Failed to sync Shopify products: ${error.message}`, 500);
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
    try {
      if (!businessId?.trim()) {
        throw new ShopifyError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      
      return {
        connected: !!(settings?.shopifyAccessToken),
        shopDomain: settings?.shopifyDomain,
        connectedAt: settings?.shopifyConnectedAt,
        lastSync: settings?.shopifyLastSync
      };
    } catch (error: any) {
      if (error instanceof ShopifyError) {
        throw error;
      }

      throw new ShopifyError(`Failed to get Shopify connection status: ${error.message}`, 500);
    }
  }

  /**
   * Disconnect Shopify integration
   */
  async disconnect(businessId: string): Promise<void> {
    try {
      if (!businessId?.trim()) {
        throw new ShopifyError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.shopifyAccessToken) {
        throw new ShopifyError('Shopify not connected for this business', 404);
      }

      try {
        // Remove webhooks
        const webhooksResponse = await axios.get(
          `https://${settings.shopifyDomain}/admin/api/2024-01/webhooks.json`,
          {
            headers: { 'X-Shopify-Access-Token': settings.shopifyAccessToken }
          }
        );

        if (webhooksResponse.data?.webhooks && Array.isArray(webhooksResponse.data.webhooks)) {
          for (const webhook of webhooksResponse.data.webhooks) {
            if (webhook.address && webhook.address.includes(APP_URL)) {
              try {
                await axios.delete(
                  `https://${settings.shopifyDomain}/admin/api/2024-01/webhooks/${webhook.id}.json`,
                  {
                    headers: { 'X-Shopify-Access-Token': settings.shopifyAccessToken }
                  }
                );
              } catch (deleteError: any) {
                logger.warn('Failed to delete webhook ${webhook.id}:', deleteError.message);
              }
            }
          }
        }
      } catch (error: any) {
        logger.warn('Failed to remove Shopify webhooks:', error.message);
        // Don't fail the disconnect operation if webhook cleanup fails
      }

      // Clear integration data
      const result = await BrandSettings.findOneAndUpdate(
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

      if (!result) {
        throw new ShopifyError('Failed to clear Shopify integration data', 500);
      }
    } catch (error: any) {
      if (error instanceof ShopifyError) {
        throw error;
      }

      throw new ShopifyError(`Failed to disconnect Shopify integration: ${error.message}`, 500);
    }
  }

  /**
   * Validate webhook signature
   */
  private validateWebhookSignature(rawBody: Buffer, hmacHeader: string, secret: string): boolean {
    try {
      if (!rawBody || !hmacHeader || !secret) {
        return false;
      }

      const computed = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('base64');
      
      return computed === hmacHeader;
    } catch (error) {
      logSafeError('Error validating webhook signature', { error: error.message });
      return false;
    }
  }

  /**
   * Test Shopify API connection
   */
  async testConnection(businessId: string): Promise<boolean> {
    try {
      if (!businessId?.trim()) {
        return false;
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.shopifyAccessToken || !settings.shopifyDomain) {
        return false;
      }

      await axios.get(
        `https://${settings.shopifyDomain}/admin/api/2024-01/shop.json`,
        {
          headers: { 'X-Shopify-Access-Token': settings.shopifyAccessToken },
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
      id: number;
      topic: string;
      address: string;
      created_at: string;
    }>;
    total: number;
  }> {
    try {
      if (!businessId?.trim()) {
        throw new ShopifyError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.shopifyAccessToken) {
        throw new ShopifyError('Shopify not connected for this business', 404);
      }

      const response = await axios.get(
        `https://${settings.shopifyDomain}/admin/api/2024-01/webhooks.json`,
        {
          headers: { 'X-Shopify-Access-Token': settings.shopifyAccessToken }
        }
      );

      const allWebhooks = response.data.webhooks || [];
      const ourWebhooks = allWebhooks.filter((webhook: any) => 
        webhook.address && webhook.address.includes(APP_URL)
      );

      return {
        webhooks: ourWebhooks.map((webhook: any) => ({
          id: webhook.id,
          topic: webhook.topic,
          address: webhook.address,
          created_at: webhook.created_at
        })),
        total: ourWebhooks.length
      };
    } catch (error: any) {
      if (error instanceof ShopifyError) {
        throw error;
      }

      // Handle API errors
      if (error.response?.status === 401) {
        throw new ShopifyError('Shopify access token is invalid or expired', 401);
      }

      throw new ShopifyError(`Failed to get webhook status: ${error.message}`, 500);
    }
  }
}