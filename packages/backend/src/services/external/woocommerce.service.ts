// src/services/external/woocommerce.service.ts
import axios from 'axios';
import crypto from 'crypto';
import { BrandSettings } from '../../models/brandSettings.model';
import { CertificateService } from '../business/certificate.service';

const APP_URL = process.env.APP_URL!;

export interface WooCommerceOrder {
  id: number;
  status: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    total: string;
  }>;
  customer_id: number;
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  images: Array<{
    id: number;
    src: string;
    name: string;
    alt: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  status: 'draft' | 'pending' | 'private' | 'publish';
}

export interface WooCommerceCredentials {
  domain: string;
  consumerKey: string;
  consumerSecret: string;
}

/**
 * Custom error class for WooCommerce operations with status codes
 */
class WooCommerceError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'WooCommerceError';
    this.statusCode = statusCode;
  }
}

/**
 * WooCommerce integration service
 */
export class WooCommerceService {
  private certificateService = new CertificateService();

  /**
   * Generate setup URL (returns UI page for manual credential entry)
   */
  async generateInstallUrl(businessId: string): Promise<string> {
    try {
      if (!businessId?.trim()) {
        throw new WooCommerceError('Business ID is required', 400);
      }

      if (!APP_URL) {
        throw new WooCommerceError('APP_URL not configured', 500);
      }

      return `${APP_URL}/settings/integrations/woocommerce?businessId=${businessId}`;
    } catch (error: any) {
      if (error instanceof WooCommerceError) {
        throw error;
      }

      throw new WooCommerceError(`Failed to generate WooCommerce install URL: ${error.message}`, 500);
    }
  }

  /**
   * Store WooCommerce credentials and set up webhooks
   */
  async setupIntegration(
    credentials: WooCommerceCredentials,
    businessId: string
  ): Promise<void> {
    try {
      // Validate inputs
      if (!businessId?.trim()) {
        throw new WooCommerceError('Business ID is required', 400);
      }
      if (!credentials) {
        throw new WooCommerceError('Credentials are required', 400);
      }

      // Validate credentials format
      const validation = this.validateCredentials(credentials);
      if (!validation.valid) {
        throw new WooCommerceError(`Invalid credentials: ${validation.errors.join(', ')}`, 400);
      }

      const { domain, consumerKey, consumerSecret } = credentials;

      // Test connection first
      await this.testApiConnection(domain, consumerKey, consumerSecret);

      // Register webhooks
      await this.registerWebhooks(domain, consumerKey, consumerSecret);

      // Persist credentials
      const updatedSettings = await BrandSettings.findOneAndUpdate(
        { business: businessId },
        {
          wooDomain: domain,
          wooConsumerKey: consumerKey,
          wooConsumerSecret: consumerSecret,
          wooConnectedAt: new Date()
        },
        { upsert: true, new: true }
      );

      if (!updatedSettings) {
        throw new WooCommerceError('Failed to save WooCommerce credentials', 500);
      }

      console.log(`WooCommerce integration completed for business ${businessId}`);
    } catch (error: any) {
      if (error instanceof WooCommerceError) {
        throw error;
      }

      // Handle database errors
      if (error.name === 'MongooseError' || error.name === 'MongoError') {
        throw new WooCommerceError('Database error while setting up WooCommerce integration', 503);
      }

      throw new WooCommerceError(`Failed to setup WooCommerce integration: ${error.message}`, 500);
    }
  }

  /**
   * Register WooCommerce webhooks
   */
  private async registerWebhooks(
    domain: string,
    consumerKey: string,
    consumerSecret: string
  ): Promise<void> {
    try {
      if (!domain?.trim() || !consumerKey?.trim() || !consumerSecret?.trim()) {
        throw new WooCommerceError('Domain, consumer key, and consumer secret are required for webhook registration', 400);
      }

      if (!APP_URL) {
        throw new WooCommerceError('APP_URL not configured for webhook registration', 500);
      }

      const baseUrl = domain.replace(/\/$/, '');
      const webhooksUrl = `${baseUrl}/wp-json/wc/v3/webhooks`;
      
      const webhooks = [
        {
          name: 'Ordira Order Created',
          topic: 'order.created',
          delivery_url: `${APP_URL}/api/integrations/woocommerce/webhook/orders/create`
        },
        {
          name: 'Ordira Order Updated',
          topic: 'order.updated',
          delivery_url: `${APP_URL}/api/integrations/woocommerce/webhook/orders/updated`
        }
      ];

      const errors: string[] = [];

      for (const webhook of webhooks) {
        try {
          await axios.post(
            webhooksUrl,
            {
              ...webhook,
              secret: consumerSecret,
              status: 'active'
            },
            {
              auth: { username: consumerKey, password: consumerSecret },
              headers: { 'Content-Type': 'application/json' },
              timeout: 15000 // 15 second timeout
            }
          );
        } catch (error: any) {
          const errorMsg = `Failed to register webhook ${webhook.topic}: ${error.response?.data?.message || error.message}`;
          errors.push(errorMsg);
          console.warn(errorMsg);
        }
      }

      // If all webhooks failed, throw an error
      if (errors.length === webhooks.length) {
        throw new WooCommerceError(`Failed to register any webhooks: ${errors.join(', ')}`, 500);
      }
    } catch (error: any) {
      if (error instanceof WooCommerceError) {
        throw error;
      }

      throw new WooCommerceError(`Webhook registration failed: ${error.message}`, 500);
    }
  }

  /**
   * Process WooCommerce order webhook
   */
  async processOrderWebhook(req: any): Promise<{
    processed: number;
    errors: string[];
  }> {
    try {
      const hmacHeader = req.get('X-WC-Webhook-Signature');
      const domain = req.get('X-WC-Webhook-Source');
      
      if (!hmacHeader?.trim()) {
        throw new WooCommerceError('Missing webhook signature', 400);
      }
      if (!domain?.trim()) {
        throw new WooCommerceError('Missing webhook source domain', 400);
      }
      if (!req.rawBody) {
        throw new WooCommerceError('Missing request body in webhook', 400);
      }

      const settings = await BrandSettings.findOne({ wooDomain: domain });
      if (!settings) {
        throw new WooCommerceError('WooCommerce integration not found for this domain', 404);
      }

      if (!settings.wooConsumerSecret) {
        throw new WooCommerceError('Webhook secret not configured for this integration', 500);
      }

      // Validate webhook signature
      if (!this.validateWebhookSignature(req.rawBody, hmacHeader, settings.wooConsumerSecret)) {
        throw new WooCommerceError('Invalid WooCommerce webhook signature', 401);
      }

      let order: WooCommerceOrder;
      try {
        order = JSON.parse(req.rawBody.toString());
      } catch (parseError) {
        throw new WooCommerceError('Invalid JSON in webhook payload', 400);
      }

      // Validate order structure
      if (!order.id || !order.billing?.email || !Array.isArray(order.line_items)) {
        throw new WooCommerceError('Invalid order structure in webhook payload', 400);
      }

      const results = await this.processOrderCertificates(order, settings.business.toString());
      return results;
    } catch (error: any) {
      if (error instanceof WooCommerceError) {
        throw error;
      }

      throw new WooCommerceError(`Failed to process order webhook: ${error.message}`, 500);
    }
  }

  /**
   * Process certificates for order line items
   */
  private async processOrderCertificates(order: WooCommerceOrder, businessId: string): Promise<{
    processed: number;
    errors: string[];
  }> {
    try {
      if (!order || !businessId?.trim()) {
        throw new WooCommerceError('Order and business ID are required', 400);
      }

      const errors: string[] = [];
      let processed = 0;

      // Only process completed/processing orders
      if (!['completed', 'processing'].includes(order.status)) {
        return { processed: 0, errors: [`Order status ${order.status} - skipping certificate creation`] };
      }

      if (!Array.isArray(order.line_items) || order.line_items.length === 0) {
        return { processed: 0, errors: ['No line items found in order'] };
      }

      if (!order.billing?.email?.trim()) {
        return { processed: 0, errors: ['No customer email found in order'] };
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
              recipient: order.billing.email,
              contactMethod: 'email'
            });
            processed++;
          } else {
            errors.push(`Item "${item.name || 'Unknown'}" has no SKU - skipped certificate creation`);
          }
        } catch (error: any) {
          errors.push(`Failed to create certificate for "${item.name || 'Unknown'}": ${error.message}`);
        }
      }

      return { processed, errors };
    } catch (error: any) {
      if (error instanceof WooCommerceError) {
        throw error;
      }

      throw new WooCommerceError(`Failed to process order certificates: ${error.message}`, 500);
    }
  }

  /**
   * Sync products from WooCommerce
   */
  async syncProducts(businessId: string): Promise<{
    synced: number;
    errors: string[];
  }> {
    try {
      if (!businessId?.trim()) {
        throw new WooCommerceError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw new WooCommerceError('WooCommerce not connected for this business', 404);
      }

      if (!settings.wooConsumerSecret) {
        throw new WooCommerceError('WooCommerce consumer secret not configured', 500);
      }

      const baseUrl = settings.wooDomain.replace(/\/$/, '');
      const response = await axios.get(
        `${baseUrl}/wp-json/wc/v3/products`,
        {
          auth: {
            username: settings.wooConsumerKey,
            password: settings.wooConsumerSecret
          },
          params: {
            per_page: 100,
            status: 'publish'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      if (!Array.isArray(response.data)) {
        throw new WooCommerceError('Invalid response from WooCommerce products API', 500);
      }

      const products: WooCommerceProduct[] = response.data;
      const errors: string[] = [];
      let synced = 0;

      // TODO: Implement product sync logic with ProductService
      // This would create/update products in your platform database
      
      // Update last sync timestamp
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { wooLastSync: new Date() }
      );

      return { synced, errors };
    } catch (error: any) {
      if (error instanceof WooCommerceError) {
        throw error;
      }

      // Handle Axios errors
      if (error.response?.status === 401) {
        throw new WooCommerceError('WooCommerce credentials are invalid or expired', 401);
      }
      if (error.response?.status === 403) {
        throw new WooCommerceError('Insufficient permissions to access WooCommerce products', 403);
      }
      if (error.response?.status >= 500) {
        throw new WooCommerceError('WooCommerce API is currently unavailable', 503);
      }

      throw new WooCommerceError(`Failed to sync WooCommerce products: ${error.message}`, 500);
    }
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(businessId: string): Promise<{
    connected: boolean;
    domain?: string;
    connectedAt?: Date;
    lastSync?: Date;
  }> {
    try {
      if (!businessId?.trim()) {
        throw new WooCommerceError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      
      return {
        connected: !!(settings?.wooConsumerKey),
        domain: settings?.wooDomain,
        connectedAt: settings?.wooConnectedAt,
        lastSync: settings?.wooLastSync
      };
    } catch (error: any) {
      if (error instanceof WooCommerceError) {
        throw error;
      }

      throw new WooCommerceError(`Failed to get WooCommerce connection status: ${error.message}`, 500);
    }
  }

  /**
   * Test WooCommerce API connection
   */
  private async testApiConnection(
    domain: string,
    consumerKey: string,
    consumerSecret: string
  ): Promise<void> {
    try {
      if (!domain?.trim() || !consumerKey?.trim() || !consumerSecret?.trim()) {
        throw new WooCommerceError('Domain, consumer key, and consumer secret are required', 400);
      }

      const baseUrl = domain.replace(/\/$/, '');
      
      await axios.get(
        `${baseUrl}/wp-json/wc/v3/system_status`,
        {
          auth: { username: consumerKey, password: consumerSecret },
          timeout: 15000 // 15 second timeout
        }
      );
    } catch (error: any) {
      if (error instanceof WooCommerceError) {
        throw error;
      }

      // Handle specific connection errors
      if (error.response?.status === 401) {
        throw new WooCommerceError('Invalid WooCommerce credentials', 401);
      }
      if (error.response?.status === 404) {
        throw new WooCommerceError('WooCommerce API not found - ensure WooCommerce is installed and API is enabled', 404);
      }
      if (error.code === 'ENOTFOUND') {
        throw new WooCommerceError('Domain not found - check the domain URL', 400);
      }
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new WooCommerceError('Unable to connect to WooCommerce - check domain and network connectivity', 503);
      }

      throw new WooCommerceError(`Failed to connect to WooCommerce: ${error.response?.data?.message || error.message}`, 500);
    }
  }

  /**
   * Get WooCommerce store info
   */
  async getStoreInfo(businessId: string): Promise<any> {
    try {
      if (!businessId?.trim()) {
        throw new WooCommerceError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw new WooCommerceError('WooCommerce not connected for this business', 404);
      }

      if (!settings.wooConsumerSecret) {
        throw new WooCommerceError('WooCommerce consumer secret not configured', 500);
      }

      const baseUrl = settings.wooDomain.replace(/\/$/, '');
      const response = await axios.get(
        `${baseUrl}/wp-json/wc/v3/system_status`,
        {
          auth: {
            username: settings.wooConsumerKey,
            password: settings.wooConsumerSecret
          },
          timeout: 15000
        }
      );

      if (!response.data) {
        throw new WooCommerceError('Invalid response from WooCommerce system status API', 500);
      }

      return {
        version: response.data.version,
        environment: response.data.environment,
        database: response.data.database
      };
    } catch (error: any) {
      if (error instanceof WooCommerceError) {
        throw error;
      }

      // Handle API errors
      if (error.response?.status === 401) {
        throw new WooCommerceError('WooCommerce credentials are invalid or expired', 401);
      }

      throw new WooCommerceError(`Failed to get WooCommerce store info: ${error.message}`, 500);
    }
  }

  /**
   * Disconnect WooCommerce integration
   */
  async disconnect(businessId: string): Promise<void> {
    try {
      if (!businessId?.trim()) {
        throw new WooCommerceError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw new WooCommerceError('WooCommerce not connected for this business', 404);
      }

      try {
        // Get and remove webhooks
        const baseUrl = settings.wooDomain.replace(/\/$/, '');
        const webhooksResponse = await axios.get(
          `${baseUrl}/wp-json/wc/v3/webhooks`,
          {
            auth: {
              username: settings.wooConsumerKey,
              password: settings.wooConsumerSecret!
            },
            timeout: 15000
          }
        );

        if (Array.isArray(webhooksResponse.data)) {
          for (const webhook of webhooksResponse.data) {
            if (webhook.delivery_url && webhook.delivery_url.includes(APP_URL)) {
              try {
                await axios.delete(
                  `${baseUrl}/wp-json/wc/v3/webhooks/${webhook.id}`,
                  {
                    auth: {
                      username: settings.wooConsumerKey,
                      password: settings.wooConsumerSecret!
                    },
                    timeout: 10000
                  }
                );
              } catch (deleteError: any) {
                console.warn(`Failed to delete webhook ${webhook.id}:`, deleteError.message);
              }
            }
          }
        }
      } catch (error: any) {
        console.warn('Failed to remove WooCommerce webhooks:', error.message);
        // Don't fail the disconnect operation if webhook cleanup fails
      }

      // Clear integration data
      const result = await BrandSettings.findOneAndUpdate(
        { business: businessId },
        {
          $unset: {
            wooDomain: 1,
            wooConsumerKey: 1,
            wooConsumerSecret: 1,
            wooConnectedAt: 1,
            wooLastSync: 1
          }
        }
      );

      if (!result) {
        throw new WooCommerceError('Failed to clear WooCommerce integration data', 500);
      }
    } catch (error: any) {
      if (error instanceof WooCommerceError) {
        throw error;
      }

      throw new WooCommerceError(`Failed to disconnect WooCommerce integration: ${error.message}`, 500);
    }
  }

  /**
   * Update webhook URLs (useful for environment changes)
   */
  async updateWebhookUrls(businessId: string): Promise<void> {
    try {
      if (!businessId?.trim()) {
        throw new WooCommerceError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw new WooCommerceError('WooCommerce not connected for this business', 404);
      }

      if (!APP_URL) {
        throw new WooCommerceError('APP_URL not configured', 500);
      }

      const baseUrl = settings.wooDomain.replace(/\/$/, '');
      const webhooksResponse = await axios.get(
        `${baseUrl}/wp-json/wc/v3/webhooks`,
        {
          auth: {
            username: settings.wooConsumerKey,
            password: settings.wooConsumerSecret!
          },
          timeout: 15000
        }
      );

      if (!Array.isArray(webhooksResponse.data)) {
        throw new WooCommerceError('Invalid response from webhooks API', 500);
      }

      for (const webhook of webhooksResponse.data) {
        if (webhook.name && webhook.name.includes('Ordira')) {
          let newUrl = '';
          if (webhook.topic === 'order.created') {
            newUrl = `${APP_URL}/api/integrations/woocommerce/webhook/orders/create`;
          } else if (webhook.topic === 'order.updated') {
            newUrl = `${APP_URL}/api/integrations/woocommerce/webhook/orders/updated`;
          }

          if (newUrl && newUrl !== webhook.delivery_url) {
            await axios.put(
              `${baseUrl}/wp-json/wc/v3/webhooks/${webhook.id}`,
              { delivery_url: newUrl },
              {
                auth: {
                  username: settings.wooConsumerKey,
                  password: settings.wooConsumerSecret!
                },
                timeout: 10000
              }
            );
          }
        }
      }
    } catch (error: any) {
      if (error instanceof WooCommerceError) {
        throw error;
      }

      // Handle API errors
      if (error.response?.status === 401) {
        throw new WooCommerceError('WooCommerce credentials are invalid or expired', 401);
      }

      throw new WooCommerceError(`Failed to update webhook URLs: ${error.message}`, 500);
    }
  }

  /**
   * Test connection for existing integration
   */
  async testConnection(businessId: string): Promise<boolean> {
    try {
      if (!businessId?.trim()) {
        return false;
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain || !settings?.wooConsumerSecret) {
        return false;
      }

      await this.testApiConnection(
        settings.wooDomain,
        settings.wooConsumerKey,
        settings.wooConsumerSecret
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get webhook status
   */
  async getWebhookStatus(businessId: string): Promise<{
    webhooks: Array<{
      id: number;
      name: string;
      topic: string;
      status: string;
      delivery_url: string;
    }>;
    total: number;
  }> {
    try {
      if (!businessId?.trim()) {
        throw new WooCommerceError('Business ID is required', 400);
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw new WooCommerceError('WooCommerce not connected for this business', 404);
      }

      const baseUrl = settings.wooDomain.replace(/\/$/, '');
      const response = await axios.get(
        `${baseUrl}/wp-json/wc/v3/webhooks`,
        {
          auth: {
            username: settings.wooConsumerKey,
            password: settings.wooConsumerSecret!
          },
          timeout: 15000
        }
      );

      if (!Array.isArray(response.data)) {
        throw new WooCommerceError('Invalid response from webhooks API', 500);
      }

      const ordiraWebhooks = response.data.filter((webhook: any) => 
        webhook.name.includes('Ordira') || webhook.delivery_url.includes(APP_URL)
      );

      return {
        webhooks: ordiraWebhooks.map((webhook: any) => ({
          id: webhook.id,
          name: webhook.name,
          topic: webhook.topic,
          status: webhook.status,
          delivery_url: webhook.delivery_url
        })),
        total: ordiraWebhooks.length
      };
    } catch (error: any) {
      if (error instanceof WooCommerceError) {
        throw error;
      }

      // Handle API errors
      if (error.response?.status === 401) {
        throw new WooCommerceError('WooCommerce credentials are invalid or expired', 401);
      }

      throw new WooCommerceError(`Failed to get webhook status: ${error.message}`, 500);
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
      console.error('Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * Validate WooCommerce credentials format
   */
  validateCredentials(credentials: WooCommerceCredentials): { valid: boolean; errors: string[] } {
    try {
      const errors: string[] = [];

      if (!credentials) {
        errors.push('Credentials object is required');
        return { valid: false, errors };
      }

      if (!credentials.domain?.trim()) {
        errors.push('Domain is required');
      } else {
        const domain = credentials.domain.trim();
        if (!domain.startsWith('http')) {
          errors.push('Domain must include protocol (http:// or https://)');
        } else {
          try {
            new URL(domain);
          } catch {
            errors.push('Domain must be a valid URL');
          }
        }
      }

      if (!credentials.consumerKey?.trim()) {
        errors.push('Consumer key is required');
      } else if (credentials.consumerKey.trim().length < 10) {
        errors.push('Consumer key appears to be too short (minimum 10 characters)');
      }

      if (!credentials.consumerSecret?.trim()) {
        errors.push('Consumer secret is required');
      } else if (credentials.consumerSecret.trim().length < 10) {
        errors.push('Consumer secret appears to be too short (minimum 10 characters)');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  }
}