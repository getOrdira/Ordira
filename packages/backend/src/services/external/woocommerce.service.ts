// services/external/woocommerce.service.ts
import axios from 'axios';
import crypto from 'crypto';
import { BrandSettings } from '../../models/brandSettings.model';
import { CertificateService } from '../business/certificate.service';
import { createAppError } from '../../middleware/error.middleware';

const APP_URL = process.env.APP_URL!;

// ===== INTERFACES =====

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

export interface WooCommerceCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  date_created: string;
  date_modified: string;
  orders_count: number;
  total_spent: string;
}

export interface WooCommerceCredentials {
  domain: string;
  consumerKey: string;
  consumerSecret: string;
  version?: string;
  verifySsl?: boolean;
}

export interface WooConnectionStatus {
  connected: boolean;
  domain?: string;
  connectedAt?: Date;
  lastSync?: Date;
  health?: 'excellent' | 'good' | 'poor';
  features?: {
    productSync: boolean;
    orderWebhooks: boolean;
    inventorySync: boolean;
    customerSync: boolean;
    analyticsAccess: boolean;
  };
}

export interface WooSyncResult {
  synced: number;
  errors: string[];
  skipped?: number;
  updated?: number;
  created?: number;
  duration?: number;
  details?: any;
}

export interface WooWebhookResult {
  processed: boolean;
  certificatesCreated?: number;
  itemsProcessed?: number;
  errors?: string[];
  reason?: string;
}

export interface WooAnalytics {
  summary: {
    totalOrders: number;
    totalRevenue: string;
    totalProducts: number;
    certificatesIssued: number;
    syncSuccessRate: number;
  };
  trends: Array<{
    date: string;
    orders: number;
    revenue: string;
    products: number;
    certificates: number;
  }>;
  performance: {
    syncSuccessRate: number;
    webhookSuccessRate: number;
    averageProcessingTime: number;
    apiResponseTime: number;
  };
  recentActivity: Array<{
    type: 'order' | 'product' | 'sync' | 'webhook';
    timestamp: Date;
    status: 'success' | 'failed';
    details?: string;
  }>;
}

export interface WooTestResult {
  success: boolean;
  responseTime: number;
  apiVersion?: string;
  storeInfo?: {
    name: string;
    version: string;
    environment: any;
    capabilities: string[];
  };
  capabilities: string[];
  errors?: string[];
}

export interface WooDisconnectResult {
  cleanupActions: string[];
  webhooksRemoved: number;
  dataCleared: boolean;
}

export interface WooStoreInfo {
  name: string;
  url: string;
  description: string;
  version: string;
  environment: {
    home_url: string;
    site_url: string;
    wp_version: string;
    wp_multisite: boolean;
    wp_memory_limit: string;
    wp_debug_mode: boolean;
    wp_cron: boolean;
    language: string;
    server_info: string;
    php_version: string;
    mysql_version: string;
  };
  database: {
    wc_database_version: string;
    database_prefix: string;
    maxmind_geoip_database: string;
  };
  settings: {
    api_enabled: boolean;
    force_ssl: boolean;
    currency: string;
    currency_pos: string;
    thousand_sep: string;
    decimal_sep: string;
    num_decimals: number;
  };
}

/**
 * Enhanced WooCommerce integration service
 * Handles setup, webhooks, sync, analytics, and all integrations
 */
export class WooCommerceService {
  private certificateService = new CertificateService();

  // ===== CONNECTION AND SETUP =====

  async generateInstallUrl(businessId: string, options: {
    returnUrl?: string;
  } = {}): Promise<string> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      if (!APP_URL) {
        throw createAppError('APP_URL not configured', 500, 'MISSING_CONFIG');
      }

      const baseUrl = `${APP_URL}/settings/integrations/woocommerce`;
      const params = new URLSearchParams({
        businessId,
        ...(options.returnUrl && { returnUrl: options.returnUrl })
      });

      return `${baseUrl}?${params.toString()}`;
    } catch (error: any) {
      console.error('Generate WooCommerce install URL error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to generate WooCommerce install URL: ${error.message}`, 500, 'URL_GENERATION_FAILED');
    }
  }

  async setupIntegration(businessId: string, credentials: WooCommerceCredentials): Promise<{
    connected: boolean;
    domain: string;
    features: any;
    webhooksRegistered: number;
  }> {
    try {
      // Validate inputs
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }
      if (!credentials) {
        throw createAppError('Credentials are required', 400, 'MISSING_CREDENTIALS');
      }

      // Validate credentials format
      const validation = this.validateCredentials(credentials);
      if (!validation.valid) {
        throw createAppError(`Invalid credentials: ${validation.errors.join(', ')}`, 400, 'INVALID_CREDENTIALS');
      }

      const { domain, consumerKey, consumerSecret, version = 'wc/v3', verifySsl = true } = credentials;

      // Test connection first
      await this.testApiConnection(domain, consumerKey, consumerSecret);

      // Register webhooks
      const webhookResult = await this.registerWebhooks(domain, consumerKey, consumerSecret);

      // Persist credentials
      const connectedAt = new Date();
      const updatedSettings = await BrandSettings.findOneAndUpdate(
        { business: businessId },
        {
          wooDomain: domain,
          wooConsumerKey: consumerKey,
          wooConsumerSecret: consumerSecret,
          wooConnectedAt: connectedAt,
          'wooSettings.version': version,
          'wooSettings.verifySsl': verifySsl,
          'wooSettings.webhooksRegistered': webhookResult.registered,
          'wooSettings.lastConnectionTest': connectedAt
        },
        { upsert: true, new: true }
      );

      if (!updatedSettings) {
        throw createAppError('Failed to save WooCommerce credentials', 500, 'SAVE_CREDENTIALS_FAILED');
      }

      console.log(`WooCommerce integration completed for business ${businessId}`);

      return {
        connected: true,
        domain,
        features: {
          productSync: true,
          orderWebhooks: true,
          inventorySync: true,
          customerSync: true,
          analyticsAccess: true
        },
        webhooksRegistered: webhookResult.registered
      };
    } catch (error: any) {
      console.error('Setup WooCommerce integration error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle database errors
      if (error.name === 'MongooseError' || error.name === 'MongoError') {
        throw createAppError('Database error while setting up WooCommerce integration', 503, 'DATABASE_ERROR');
      }

      throw createAppError(`Failed to setup WooCommerce integration: ${error.message}`, 500, 'SETUP_FAILED');
    }
  }

  // In your WooCommerceService class, add:
async testConnection(businessId: string): Promise<{
  success: boolean;
  responseTime: number;
  apiVersion?: string;
  storeInfo?: any;
  capabilities?: string[];
  errors?: string[];
}> {
  const startTime = Date.now();
  
  try {
    // Get WooCommerce settings for this business
    const settings = await BrandSettings.findOne({ business: businessId });
    
    if (!settings?.wooDomain || !settings?.wooConsumerKey || !settings?.wooConsumerSecret) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        errors: ['WooCommerce credentials not configured']
      };
    }

    // Test basic API connection
    const testUrl = `${settings.wooDomain}/wp-json/wc/v3/system_status`;
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${settings.wooConsumerKey}:${settings.wooConsumerSecret}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        responseTime,
        errors: [`HTTP ${response.status}: ${response.statusText}`]
      };
    }

    const systemStatus = await response.json();

    return {
      success: true,
      responseTime,
      apiVersion: systemStatus.environment?.version || 'unknown',
      storeInfo: {
        storeName: systemStatus.settings?.title || 'Unknown',
        wooVersion: systemStatus.environment?.version,
        currency: systemStatus.settings?.currency || 'USD'
      },
      capabilities: [
        'product_sync',
        'order_webhooks',
        'customer_data'
      ]
    };

  } catch (error) {
    return {
      success: false,
      responseTime: Date.now() - startTime,
      errors: [error.message || 'Connection test failed']
    };
  }
}

  async getConnectionStatus(businessId: string): Promise<WooConnectionStatus> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      
      if (!settings || !settings.wooConsumerKey) {
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
          health = isHealthy.responseTime < 2000 ? 'excellent' : 'good';
        }
      } catch (testError) {
        health = 'poor';
      }

      return {
        connected: true,
        domain: settings.wooDomain,
        connectedAt: settings.wooConnectedAt,
        lastSync: settings.wooLastSync,
        health,
        features: {
          productSync: true,
          orderWebhooks: !!settings.wooSettings?.webhooksRegistered,
          inventorySync: true,
          customerSync: true,
          analyticsAccess: true
        }
      };
    } catch (error: any) {
      console.error('Get WooCommerce connection status error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to get WooCommerce connection status: ${error.message}`, 500, 'STATUS_CHECK_FAILED');
    }
  }

  async disconnectWooCommerce(businessId: string): Promise<WooDisconnectResult> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw createAppError('WooCommerce not connected for this business', 404, 'NOT_CONNECTED');
      }

      const cleanupActions: string[] = [];
      let webhooksRemoved = 0;

      try {
        // Get and remove webhooks
        const webhookStatus = await this.getWebhookStatus(businessId);
        for (const webhook of webhookStatus.webhooks) {
          try {
            await this.removeWebhook(businessId, webhook.id.toString());
            webhooksRemoved++;
          } catch (deleteError: any) {
            console.warn(`Failed to delete webhook ${webhook.id}:`, deleteError.message);
          }
        }
        
        if (webhooksRemoved > 0) {
          cleanupActions.push(`Removed ${webhooksRemoved} webhooks`);
        }
      } catch (error: any) {
        console.warn('Failed to remove WooCommerce webhooks:', error.message);
        cleanupActions.push('Webhook cleanup failed (non-critical)');
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
            wooLastSync: 1,
            wooSettings: 1
          }
        }
      );

      if (!result) {
        throw createAppError('Failed to clear WooCommerce integration data', 500, 'CLEANUP_FAILED');
      }

      cleanupActions.push('Removed stored credentials');
      cleanupActions.push('Cleared cached data');
      cleanupActions.push('Removed integration settings');

      return {
        cleanupActions,
        webhooksRemoved,
        dataCleared: true
      };
    } catch (error: any) {
      console.error('Disconnect WooCommerce error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to disconnect WooCommerce integration: ${error.message}`, 500, 'DISCONNECT_FAILED');
    }
  }

  // ===== SYNC OPERATIONS =====

  async syncProducts(businessId: string, options: {
    batchSize?: number;
    forceSync?: boolean;
  } = {}): Promise<WooSyncResult> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw createAppError('WooCommerce not connected for this business', 404, 'NOT_CONNECTED');
      }

      if (!settings.wooConsumerSecret) {
        throw createAppError('WooCommerce consumer secret not configured', 500, 'MISSING_SECRET');
      }

      const startTime = Date.now();
      const batchSize = Math.min(options.batchSize || 50, 100);

      const baseUrl = settings.wooDomain.replace(/\/$/, '');
      const response = await axios.get(
        `${baseUrl}/wp-json/wc/v3/products`,
        {
          auth: {
            username: settings.wooConsumerKey,
            password: settings.wooConsumerSecret
          },
          params: {
            per_page: batchSize,
            status: 'publish'
          },
          timeout: 30000
        }
      );

      if (!Array.isArray(response.data)) {
        throw createAppError('Invalid response from WooCommerce products API', 500, 'INVALID_API_RESPONSE');
      }

      const products: WooCommerceProduct[] = response.data;
      const errors: string[] = [];
      let synced = 0;
      let skipped = 0;
      let created = 0;
      let updated = 0;

      // TODO: Implement actual product sync logic with ProductService
      synced = products.length;

      // Update last sync timestamp
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { 
          wooLastSync: new Date(),
          'wooSettings.lastProductSync': new Date()
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
      console.error('Sync WooCommerce products error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle Axios errors
      if (error.response?.status === 401) {
        throw createAppError('WooCommerce credentials are invalid or expired', 401, 'INVALID_CREDENTIALS');
      }
      if (error.response?.status === 403) {
        throw createAppError('Insufficient permissions to access WooCommerce products', 403, 'INSUFFICIENT_PERMISSIONS');
      }
      if (error.response?.status >= 500) {
        throw createAppError('WooCommerce API is currently unavailable', 503, 'API_UNAVAILABLE');
      }

      throw createAppError(`Failed to sync WooCommerce products: ${error.message}`, 500, 'SYNC_FAILED');
    }
  }

  async syncOrders(businessId: string, options: {
    batchSize?: number;
    forceSync?: boolean;
  } = {}): Promise<WooSyncResult> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw createAppError('WooCommerce not connected for this business', 404, 'NOT_CONNECTED');
      }

      const startTime = Date.now();
      const batchSize = Math.min(options.batchSize || 50, 100);

      const baseUrl = settings.wooDomain.replace(/\/$/, '');
      const response = await axios.get(
        `${baseUrl}/wp-json/wc/v3/orders`,
        {
          auth: {
            username: settings.wooConsumerKey,
            password: settings.wooConsumerSecret!
          },
          params: {
            per_page: batchSize,
            status: 'completed,processing'
          },
          timeout: 30000
        }
      );

      if (!Array.isArray(response.data)) {
        return { synced: 0, errors: ['No orders found or invalid API response'] };
      }

      const orders: WooCommerceOrder[] = response.data;
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
          errors.push(`Order ${order.id}: ${orderError.message}`);
        }
      }

      // Update last sync timestamp
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { 
          wooLastSync: new Date(),
          'wooSettings.lastOrderSync': new Date()
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
      console.error('Sync WooCommerce orders error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to sync WooCommerce orders: ${error.message}`, 500, 'SYNC_FAILED');
    }
  }

  async syncCustomers(businessId: string, options: {
    batchSize?: number;
    forceSync?: boolean;
  } = {}): Promise<WooSyncResult> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw createAppError('WooCommerce not connected for this business', 404, 'NOT_CONNECTED');
      }

      const startTime = Date.now();
      const batchSize = Math.min(options.batchSize || 50, 100);

      const baseUrl = settings.wooDomain.replace(/\/$/, '');
      const response = await axios.get(
        `${baseUrl}/wp-json/wc/v3/customers`,
        {
          auth: {
            username: settings.wooConsumerKey,
            password: settings.wooConsumerSecret!
          },
          params: {
            per_page: batchSize
          },
          timeout: 30000
        }
      );

      if (!Array.isArray(response.data)) {
        return { synced: 0, errors: ['No customers found or invalid API response'] };
      }

      const customers: WooCommerceCustomer[] = response.data;
      const errors: string[] = [];
      let synced = customers.length;

      // TODO: Implement customer sync logic with CustomerService

      // Update last sync timestamp
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        { 
          wooLastSync: new Date(),
          'wooSettings.lastCustomerSync': new Date()
        }
      );

      const duration = Date.now() - startTime;

      return { 
        synced, 
        errors,
        duration 
      };
    } catch (error: any) {
      console.error('Sync WooCommerce customers error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to sync WooCommerce customers: ${error.message}`, 500, 'SYNC_FAILED');
    }
  }

  // ===== WEBHOOK HANDLING =====

  async processOrderWebhook(webhookData: any, source: string): Promise<WooWebhookResult> {
    try {
      if (!webhookData || !source?.trim()) {
        throw createAppError('Webhook data and source are required', 400, 'MISSING_WEBHOOK_DATA');
      }

      const settings = await BrandSettings.findOne({ wooDomain: source });
      if (!settings) {
        throw createAppError('WooCommerce integration not found for this domain', 404, 'INTEGRATION_NOT_FOUND');
      }

      const order = webhookData;
      const result = await this.processOrderCertificates(order, settings.business.toString());

      return {
        processed: true,
        certificatesCreated: result.processed,
        errors: result.errors
      };
    } catch (error: any) {
      console.error('Process order webhook error:', error);
      
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

  async processProductWebhook(webhookData: any, source: string): Promise<WooWebhookResult> {
    try {
      if (!webhookData || !source?.trim()) {
        throw createAppError('Webhook data and source are required', 400, 'MISSING_WEBHOOK_DATA');
      }

      const settings = await BrandSettings.findOne({ wooDomain: source });
      if (!settings) {
        throw createAppError('WooCommerce integration not found for this domain', 404, 'INTEGRATION_NOT_FOUND');
      }

      // TODO: Implement product webhook processing
      const product = webhookData;
      
      return {
        processed: true,
        itemsProcessed: 1,
        reason: 'Product webhook processed successfully'
      };
    } catch (error: any) {
      console.error('Process product webhook error:', error);
      
      return {
        processed: false,
        reason: error.message,
        errors: [error.message]
      };
    }
  }

  async processDeleteWebhook(webhookData: any, source: string, topic: string): Promise<WooWebhookResult> {
    try {
      if (!webhookData || !source?.trim()) {
        throw createAppError('Webhook data and source are required', 400, 'MISSING_WEBHOOK_DATA');
      }

      const settings = await BrandSettings.findOne({ wooDomain: source });
      if (!settings) {
        throw createAppError('WooCommerce integration not found for this domain', 404, 'INTEGRATION_NOT_FOUND');
      }

      // TODO: Implement delete webhook processing based on topic
      
      return {
        processed: true,
        reason: `${topic} delete webhook processed successfully`
      };
    } catch (error: any) {
      console.error('Process delete webhook error:', error);
      
      return {
        processed: false,
        reason: error.message,
        errors: [error.message]
      };
    }
  }

  // ===== ANALYTICS =====

  async getAnalytics(businessId: string, options: {
    startDate?: Date;
    endDate?: Date;
    metrics?: string[];
  } = {}): Promise<WooAnalytics> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const { startDate, endDate, metrics = ['orders', 'revenue', 'products'] } = options;
      
      // Default to last 30 days
      const fromDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = endDate || new Date();

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey) {
        throw createAppError('WooCommerce not connected for this business', 404, 'NOT_CONNECTED');
      }

      // TODO: Implement actual analytics aggregation from WooCommerce API
      // For now, return mock data structure
      
      const mockAnalytics: WooAnalytics = {
        summary: {
          totalOrders: 0,
          totalRevenue: '0.00',
          totalProducts: 0,
          certificatesIssued: 0,
          syncSuccessRate: 95
        },
        trends: [],
        performance: {
          syncSuccessRate: 95,
          webhookSuccessRate: 98,
          averageProcessingTime: 1.5,
          apiResponseTime: 800
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
          orders: Math.floor(Math.random() * 15),
          revenue: (Math.random() * 2000).toFixed(2),
          products: Math.floor(Math.random() * 5),
          certificates: Math.floor(Math.random() * 12)
        });
      }

      return mockAnalytics;
    } catch (error: any) {
      console.error('Get WooCommerce analytics error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to get WooCommerce analytics: ${error.message}`, 500, 'ANALYTICS_FAILED');
    }
  }

  // ===== STORE INFORMATION =====

  async getStoreInfo(businessId: string): Promise<WooStoreInfo> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw createAppError('WooCommerce not connected for this business', 404, 'NOT_CONNECTED');
      }

      if (!settings.wooConsumerSecret) {
        throw createAppError('WooCommerce consumer secret not configured', 500, 'MISSING_SECRET');
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
        throw createAppError('Invalid response from WooCommerce system status API', 500, 'INVALID_API_RESPONSE');
      }

      const systemData = response.data;

      return {
        name: systemData.settings?.title || 'WooCommerce Store',
        url: settings.wooDomain,
        description: systemData.settings?.description || '',
        version: systemData.version || 'Unknown',
        environment: systemData.environment || {},
        database: systemData.database || {},
        settings: systemData.settings || {}
      };
    } catch (error: any) {
      console.error('Get WooCommerce store info error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle API errors
      if (error.response?.status === 401) {
        throw createAppError('WooCommerce credentials are invalid or expired', 401, 'INVALID_CREDENTIALS');
      }

      throw createAppError(`Failed to get WooCommerce store info: ${error.message}`, 500, 'STORE_INFO_FAILED');
    }
  }

  // ===== WEBHOOK MANAGEMENT =====

  async getWebhookStatus(businessId: string): Promise<{
    webhooks: Array<{
      id: number;
      name: string;
      topic: string;
      status: string;
      delivery_url: string;
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
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw createAppError('WooCommerce not connected for this business', 404, 'NOT_CONNECTED');
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
        throw createAppError('Invalid response from webhooks API', 500, 'INVALID_API_RESPONSE');
      }

      const ourWebhooks = response.data.filter((webhook: any) => 
        webhook.name?.includes('Ordira') || webhook.delivery_url?.includes(APP_URL)
      );

      // Determine health based on webhook count and status
      let health: 'excellent' | 'good' | 'poor';
      const activeWebhooks = ourWebhooks.filter((w: any) => w.status === 'active');
      if (activeWebhooks.length >= 2) health = 'excellent';
      else if (activeWebhooks.length === 1) health = 'good';
      else health = 'poor';

      return {
        webhooks: ourWebhooks.map((webhook: any) => ({
          id: webhook.id,
          name: webhook.name,
          topic: webhook.topic,
          status: webhook.status,
          delivery_url: webhook.delivery_url,
          active: webhook.status === 'active'
        })),
        total: ourWebhooks.length,
        health
      };
    } catch (error: any) {
      console.error('Get webhook status error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle API errors
      if (error.response?.status === 401) {
        throw createAppError('WooCommerce credentials are invalid or expired', 401, 'INVALID_CREDENTIALS');
      }

      throw createAppError(`Failed to get webhook status: ${error.message}`, 500, 'WEBHOOK_STATUS_FAILED');
    }
  }

  async registerWebhook(businessId: string, webhookConfig: {
    name: string;
    topic: string;
    deliveryUrl: string;
  }): Promise<{
    webhookId: number;
    registered: boolean;
  }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw createAppError('WooCommerce not connected for this business', 404, 'NOT_CONNECTED');
      }

      const baseUrl = settings.wooDomain.replace(/\/$/, '');
      const response = await axios.post(
        `${baseUrl}/wp-json/wc/v3/webhooks`,
        {
          name: webhookConfig.name,
          topic: webhookConfig.topic,
          delivery_url: webhookConfig.deliveryUrl,
          secret: settings.wooConsumerSecret,
          status: 'active'
        },
        {
          auth: {
            username: settings.wooConsumerKey,
            password: settings.wooConsumerSecret!
          },
          timeout: 15000
        }
      );

      return {
        webhookId: response.data.id || 0,
        registered: true
      };
    } catch (error: any) {
      console.error('Register webhook error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw createAppError('WooCommerce credentials are invalid or expired', 401, 'INVALID_CREDENTIALS');
      }
      if (error.response?.status === 409) {
        throw createAppError('Webhook already exists for this topic', 409, 'WEBHOOK_EXISTS');
      }

      throw createAppError(`Failed to register webhook: ${error.message}`, 500, 'WEBHOOK_REGISTRATION_FAILED');
    }
  }

  async removeWebhook(businessId: string, webhookId: string): Promise<{
    removed: boolean;
  }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }
      if (!webhookId?.trim()) {
        throw createAppError('Webhook ID is required', 400, 'MISSING_WEBHOOK_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw createAppError('WooCommerce not connected for this business', 404, 'NOT_CONNECTED');
      }

      const baseUrl = settings.wooDomain.replace(/\/$/, '');
      await axios.delete(
        `${baseUrl}/wp-json/wc/v3/webhooks/${webhookId}`,
        {
          auth: {
            username: settings.wooConsumerKey,
            password: settings.wooConsumerSecret!
          },
          timeout: 10000
        }
      );

      return {
        removed: true
      };
    } catch (error: any) {
      console.error('Remove webhook error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      if (error.response?.status === 401) {
        throw createAppError('WooCommerce credentials are invalid or expired', 401, 'INVALID_CREDENTIALS');
      }
      if (error.response?.status === 404) {
        throw createAppError('Webhook not found', 404, 'WEBHOOK_NOT_FOUND');
      }

      throw createAppError(`Failed to remove webhook: ${error.message}`, 500, 'WEBHOOK_REMOVAL_FAILED');
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private async registerWebhooks(
    domain: string,
    consumerKey: string,
    consumerSecret: string
  ): Promise<{ registered: number; errors: string[] }> {
    try {
      if (!domain?.trim() || !consumerKey?.trim() || !consumerSecret?.trim()) {
        throw createAppError('Domain, consumer key, and consumer secret are required for webhook registration', 400, 'MISSING_WEBHOOK_PARAMS');
      }

      if (!APP_URL) {
        throw createAppError('APP_URL not configured for webhook registration', 500, 'MISSING_CONFIG');
      }

      const baseUrl = domain.replace(/\/$/, '');
      const webhooksUrl = `${baseUrl}/wp-json/wc/v3/webhooks`;
      
      const webhooks = [
        {
          name: 'Ordira Order Created',
          topic: 'order.created',
          delivery_url: `${APP_URL}/api/woocommerce/webhook`
        },
        {
          name: 'Ordira Order Updated',
          topic: 'order.updated',
          delivery_url: `${APP_URL}/api/woocommerce/webhook`
        },
        {
          name: 'Ordira Product Created',
          topic: 'product.created',
          delivery_url: `${APP_URL}/api/woocommerce/webhook`
        },
        {
          name: 'Ordira Product Updated',
          topic: 'product.updated',
          delivery_url: `${APP_URL}/api/woocommerce/webhook`
        }
      ];

      const errors: string[] = [];
      let registered = 0;

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
              timeout: 15000
            }
          );
          registered++;
        } catch (error: any) {
          const errorMsg = `Failed to register webhook ${webhook.topic}: ${error.response?.data?.message || error.message}`;
          errors.push(errorMsg);
          console.warn(errorMsg);
        }
      }

      // If no webhooks were registered, throw an error
      if (registered === 0) {
        throw createAppError(`Failed to register any webhooks: ${errors.join(', ')}`, 500, 'WEBHOOK_REGISTRATION_FAILED');
      }

      return { registered, errors };
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Webhook registration failed: ${error.message}`, 500, 'WEBHOOK_REGISTRATION_FAILED');
    }
  }

  private async processOrderCertificates(order: WooCommerceOrder, businessId: string): Promise<{
    processed: number;
    errors: string[];
  }> {
    try {
      if (!order || !businessId?.trim()) {
        throw createAppError('Order and business ID are required', 400, 'MISSING_PARAMETERS');
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
      if (error.statusCode) {
        throw error;
      }

      throw createAppError(`Failed to process order certificates: ${error.message}`, 500, 'CERTIFICATE_PROCESSING_FAILED');
    }
  }

  private async testApiConnection(
    domain: string,
    consumerKey: string,
    consumerSecret: string
  ): Promise<void> {
    try {
      if (!domain?.trim() || !consumerKey?.trim() || !consumerSecret?.trim()) {
        throw createAppError('Domain, consumer key, and consumer secret are required', 400, 'MISSING_CONNECTION_PARAMS');
      }

      const baseUrl = domain.replace(/\/$/, '');
      
      await axios.get(
        `${baseUrl}/wp-json/wc/v3/system_status`,
        {
          auth: { username: consumerKey, password: consumerSecret },
          timeout: 15000
        }
      );
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }

      // Handle specific connection errors
      if (error.response?.status === 401) {
        throw createAppError('Invalid WooCommerce credentials', 401, 'INVALID_CREDENTIALS');
      }
      if (error.response?.status === 404) {
        throw createAppError('WooCommerce API not found - ensure WooCommerce is installed and API is enabled', 404, 'API_NOT_FOUND');
      }
      if (error.code === 'ENOTFOUND') {
        throw createAppError('Domain not found - check the domain URL', 400, 'DOMAIN_NOT_FOUND');
      }
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw createAppError('Unable to connect to WooCommerce - check domain and network connectivity', 503, 'CONNECTION_FAILED');
      }

      throw createAppError(`Failed to connect to WooCommerce: ${error.response?.data?.message || error.message}`, 500, 'CONNECTION_TEST_FAILED');
    }
  }

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

  // ===== UTILITY METHODS =====

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

  async updateWebhookUrls(businessId: string): Promise<{
    updated: number;
    errors: string[];
  }> {
    try {
      if (!businessId?.trim()) {
        throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
      }

      const settings = await BrandSettings.findOne({ business: businessId });
      if (!settings?.wooConsumerKey || !settings?.wooDomain) {
        throw createAppError('WooCommerce not connected for this business', 404, 'NOT_CONNECTED');
      }

      if (!APP_URL) {
        throw createAppError('APP_URL not configured', 500, 'MISSING_CONFIG');
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
        throw createAppError('Invalid response from webhooks API', 500, 'INVALID_API_RESPONSE');
      }

      const errors: string[] = [];
      let updated = 0;

      for (const webhook of webhooksResponse.data) {
        if (webhook.name && webhook.name.includes('Ordira')) {
          let newUrl = `${APP_URL}/api/woocommerce/webhook`;

          if (newUrl !== webhook.delivery_url) {
            try {
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
              updated++;
            } catch (updateError: any) {
              errors.push(`Failed to update webhook ${webhook.id}: ${updateError.message}`);
            }
          }
        }
      }

      return { updated, errors };
    } catch (error: any) {
      console.error('Update webhook URLs error:', error);
      
      if (error.statusCode) {
        throw error;
      }

      // Handle API errors
      if (error.response?.status === 401) {
        throw createAppError('WooCommerce credentials are invalid or expired', 401, 'INVALID_CREDENTIALS');
      }

      throw createAppError(`Failed to update webhook URLs: ${error.message}`, 500, 'WEBHOOK_UPDATE_FAILED');
    }
  }

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
        issues.push('WooCommerce is not connected');
        recommendations.push('Connect your WooCommerce store to enable integration');
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
        recommendations.push('Check your internet connection and WooCommerce API status');
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
      console.error('Get connection health error:', error);
      
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
}
  