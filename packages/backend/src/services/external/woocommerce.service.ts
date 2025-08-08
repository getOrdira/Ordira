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
 * WooCommerce integration service
 */
export class WooCommerceService {
  private certificateService = new CertificateService();

  /**
   * Generate setup URL (returns UI page for manual credential entry)
   */
  async generateInstallUrl(businessId: string): Promise<string> {
    return `${APP_URL}/settings/integrations/woocommerce?businessId=${businessId}`;
  }

  /**
   * Store WooCommerce credentials and set up webhooks
   */
  async setupIntegration(
    credentials: WooCommerceCredentials,
    businessId: string
  ): Promise<void> {
    const { domain, consumerKey, consumerSecret } = credentials;

    try {
      // Test connection first
      await this.testApiConnection(domain, consumerKey, consumerSecret);

      // Register webhooks
      await this.registerWebhooks(domain, consumerKey, consumerSecret);

      // Persist credentials
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        {
          wooDomain: domain,
          wooConsumerKey: consumerKey,
          wooConsumerSecret: consumerSecret,
          wooConnectedAt: new Date()
        },
        { upsert: true }
      );

      console.log(`WooCommerce integration completed for business ${businessId}`);
    } catch (error) {
      console.error('WooCommerce setup failed:', error);
      throw new Error(`Failed to setup WooCommerce integration: ${error.message}`);
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
    const baseUrl = domain.replace(/\/$/, '');
    const webhooksUrl = `${baseUrl}/wp-json/wc/v3/webhooks`;
    
    const webhooks = [
      {
        name: 'Despoke Order Created',
        topic: 'order.created',
        delivery_url: `${APP_URL}/api/integrations/woocommerce/webhook/orders/create`
      },
      {
        name: 'Despoke Order Updated',
        topic: 'order.updated',
        delivery_url: `${APP_URL}/api/integrations/woocommerce/webhook/orders/updated`
      }
    ];

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
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } catch (error) {
        console.warn(`Failed to register WooCommerce webhook ${webhook.topic}:`, error.response?.data);
      }
    }
  }

  /**
   * Process WooCommerce order webhook
   */
  async processOrderWebhook(req: any): Promise<{
    processed: number;
    errors: string[];
  }> {
    const hmacHeader = req.get('X-WC-Webhook-Signature');
    const domain = req.get('X-WC-Webhook-Source');
    
    const settings = await BrandSettings.findOne({ wooDomain: domain });
    if (!settings) {
      throw { statusCode: 404, message: 'WooCommerce integration not found.' };
    }

    // Validate webhook signature
    if (!this.validateWebhookSignature(req.rawBody, hmacHeader, settings.wooConsumerSecret!)) {
      throw { statusCode: 401, message: 'Invalid WooCommerce webhook signature.' };
    }

    const order: WooCommerceOrder = JSON.parse(req.rawBody.toString());
    const results = await this.processOrderCertificates(order, settings.business.toString());

    return results;
  }

  /**
   * Process certificates for order line items
   */
  private async processOrderCertificates(order: WooCommerceOrder, businessId: string): Promise<{
    processed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;

    // Only process completed/processing orders
    if (!['completed', 'processing'].includes(order.status)) {
      return { processed: 0, errors: [`Order status ${order.status} - skipping certificate creation`] };
    }

    for (const item of order.line_items) {
      try {
        if (item.sku) {
          await this.certificateService.createCertificate(businessId, {
            productId: item.sku,
            recipient: order.billing.email,
            contactMethod: 'email'
          });
          processed++;
        } else {
          errors.push(`Item ${item.name} has no SKU - skipped certificate creation`);
        }
      } catch (error) {
        errors.push(`Failed to create certificate for ${item.name}: ${error.message}`);
      }
    }

    return { processed, errors };
  }

  /**
   * Sync products from WooCommerce
   */
  async syncProducts(businessId: string): Promise<{
    synced: number;
    errors: string[];
  }> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.wooConsumerKey || !settings?.wooDomain) {
      throw new Error('WooCommerce not connected for this business');
    }

    try {
      const baseUrl = settings.wooDomain.replace(/\/$/, '');
      const response = await axios.get(
        `${baseUrl}/wp-json/wc/v3/products`,
        {
          auth: {
            username: settings.wooConsumerKey,
            password: settings.wooConsumerSecret!
          },
          params: {
            per_page: 100,
            status: 'publish'
          }
        }
      );

      const products: WooCommerceProduct[] = response.data;
      const errors: string[] = [];
      let synced = 0;

      // TODO: Implement product sync logic with ProductService
      // This would create/update products in your platform database
      
      return { synced, errors };
    } catch (error) {
      throw new Error(`Failed to sync WooCommerce products: ${error.message}`);
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
    const settings = await BrandSettings.findOne({ business: businessId });
    
    return {
      connected: !!(settings?.wooConsumerKey),
      domain: settings?.wooDomain,
      connectedAt: settings?.wooConnectedAt,
      lastSync: settings?.wooLastSync
    };
  }

  /**
   * Test WooCommerce API connection
   */
  private async testApiConnection(
    domain: string,
    consumerKey: string,
    consumerSecret: string
  ): Promise<void> {
    const baseUrl = domain.replace(/\/$/, '');
    
    try {
      await axios.get(
        `${baseUrl}/wp-json/wc/v3/system_status`,
        {
          auth: { username: consumerKey, password: consumerSecret }
        }
      );
    } catch (error) {
      throw new Error(`Failed to connect to WooCommerce: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get WooCommerce store info
   */
  async getStoreInfo(businessId: string): Promise<any> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.wooConsumerKey || !settings?.wooDomain) {
      throw new Error('WooCommerce not connected for this business');
    }

    try {
      const baseUrl = settings.wooDomain.replace(/\/$/, '');
      const response = await axios.get(
        `${baseUrl}/wp-json/wc/v3/system_status`,
        {
          auth: {
            username: settings.wooConsumerKey,
            password: settings.wooConsumerSecret!
          }
        }
      );

      return {
        version: response.data.version,
        environment: response.data.environment,
        database: response.data.database
      };
    } catch (error) {
      throw new Error(`Failed to get WooCommerce store info: ${error.message}`);
    }
  }

  /**
   * Disconnect WooCommerce integration
   */
  async disconnect(businessId: string): Promise<void> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.wooConsumerKey || !settings?.wooDomain) {
      throw new Error('WooCommerce not connected for this business');
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
          }
        }
      );

      for (const webhook of webhooksResponse.data) {
        if (webhook.delivery_url.includes(APP_URL)) {
          await axios.delete(
            `${baseUrl}/wp-json/wc/v3/webhooks/${webhook.id}`,
            {
              auth: {
                username: settings.wooConsumerKey,
                password: settings.wooConsumerSecret!
              }
            }
          );
        }
      }
    } catch (error) {
      console.warn('Failed to remove WooCommerce webhooks:', error);
    }

    // Clear integration data
    await BrandSettings.findOneAndUpdate(
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
  }

  /**
   * Update webhook URLs (useful for environment changes)
   */
  async updateWebhookUrls(businessId: string): Promise<void> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.wooConsumerKey || !settings?.wooDomain) {
      throw new Error('WooCommerce not connected for this business');
    }

    try {
      const baseUrl = settings.wooDomain.replace(/\/$/, '');
      const webhooksResponse = await axios.get(
        `${baseUrl}/wp-json/wc/v3/webhooks`,
        {
          auth: {
            username: settings.wooConsumerKey,
            password: settings.wooConsumerSecret!
          }
        }
      );

      for (const webhook of webhooksResponse.data) {
        if (webhook.name.includes('Despoke')) {
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
                }
              }
            );
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to update webhook URLs: ${error.message}`);
    }
  }

  /**
   * Test connection for existing integration
   */
  async testConnection(businessId: string): Promise<boolean> {
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.wooConsumerKey || !settings?.wooDomain) {
      return false;
    }

    try {
      await this.testApiConnection(
        settings.wooDomain,
        settings.wooConsumerKey,
        settings.wooConsumerSecret!
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
    const settings = await BrandSettings.findOne({ business: businessId });
    if (!settings?.wooConsumerKey || !settings?.wooDomain) {
      throw new Error('WooCommerce not connected for this business');
    }

    try {
      const baseUrl = settings.wooDomain.replace(/\/$/, '');
      const response = await axios.get(
        `${baseUrl}/wp-json/wc/v3/webhooks`,
        {
          auth: {
            username: settings.wooConsumerKey,
            password: settings.wooConsumerSecret!
          }
        }
      );

      const despokeWebhooks = response.data.filter((webhook: any) => 
        webhook.name.includes('Despoke') || webhook.delivery_url.includes(APP_URL)
      );

      return {
        webhooks: despokeWebhooks.map((webhook: any) => ({
          id: webhook.id,
          name: webhook.name,
          topic: webhook.topic,
          status: webhook.status,
          delivery_url: webhook.delivery_url
        })),
        total: despokeWebhooks.length
      };
    } catch (error) {
      throw new Error(`Failed to get webhook status: ${error.message}`);
    }
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
   * Validate WooCommerce credentials format
   */
  validateCredentials(credentials: WooCommerceCredentials): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!credentials.domain) {
      errors.push('Domain is required');
    } else if (!credentials.domain.startsWith('http')) {
      errors.push('Domain must include protocol (http:// or https://)');
    }

    if (!credentials.consumerKey) {
      errors.push('Consumer key is required');
    } else if (credentials.consumerKey.length < 10) {
      errors.push('Consumer key appears to be too short');
    }

    if (!credentials.consumerSecret) {
      errors.push('Consumer secret is required');
    } else if (credentials.consumerSecret.length < 10) {
      errors.push('Consumer secret appears to be too short');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}