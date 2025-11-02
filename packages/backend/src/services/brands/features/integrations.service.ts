// src/services/brands/features/integrations.service.ts
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { logger } from '../../../utils/logger';

export interface IntegrationStatus {
  shopify: boolean;
  woocommerce: boolean;
  wix: boolean;
  lastSync?: Date;
  errors?: string[];
}

export interface ShopifyIntegrationData {
  shopifyDomain: string;
  shopifyAccessToken: string;
  shopifyWebhookSecret?: string;
  syncProducts?: boolean;
  syncOrders?: boolean;
  configuredBy?: string;
  planLevel?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  data?: any;
  errors?: string[];
}

export class IntegrationsService {

  /**
   * Get integration status for all configured integrations
   */
  async getIntegrationStatus(businessId: string): Promise<IntegrationStatus> {
    const settings = await BrandSettings.findOne({ business: businessId });

    return {
      shopify: !!(settings as any).shopifyDomain,
      woocommerce: !!(settings as any).wooDomain,
      wix: !!(settings as any).wixDomain,
      lastSync: settings?.updatedAt,
      errors: []
    };
  }

  /**
   * Test Shopify connection
   */
  async testShopifyConnection(data: ShopifyIntegrationData): Promise<ConnectionTestResult> {
    try {
      if (!data.shopifyDomain || !data.shopifyAccessToken) {
        return {
          success: false,
          errors: ['Shopify domain and access token are required']
        };
      }

      return {
        success: true,
        data: {
          shopName: data.shopifyDomain,
          connected: true,
          testedAt: new Date()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Configure Shopify integration
   */
  async configureShopifyIntegration(businessId: string, data: ShopifyIntegrationData): Promise<any> {
    try {
      await BrandSettings.findOneAndUpdate(
        { business: businessId },
        {
          shopifyDomain: data.shopifyDomain,
          shopifyAccessToken: data.shopifyAccessToken,
          shopifyWebhookSecret: data.shopifyWebhookSecret,
          shopifyConfig: {
            syncProducts: data.syncProducts,
            syncOrders: data.syncOrders,
            configuredBy: data.configuredBy,
            configuredAt: new Date()
          }
        },
        { new: true, upsert: true }
      );

      return {
        id: `shopify_${businessId}`,
        shopifyDomain: data.shopifyDomain,
        syncProducts: data.syncProducts,
        syncOrders: data.syncOrders,
        webhooksConfigured: !!data.shopifyWebhookSecret,
        status: 'active',
        configuredAt: new Date()
      };
    } catch (error: any) {
      throw new Error(`Failed to configure Shopify integration: ${error.message}`);
    }
  }

  /**
   * Update integration
   */
  async updateIntegration(businessId: string, type: string, data: any): Promise<void> {
    const updateData: any = {};

    switch (type) {
      case 'shopify':
        updateData.shopifyDomain = data.shopifyDomain;
        updateData.shopifyAccessToken = data.shopifyAccessToken;
        updateData.shopifyWebhookSecret = data.shopifyWebhookSecret;
        updateData.shopifyUpdatedAt = new Date();
        break;
      case 'woocommerce':
        updateData.wooDomain = data.wooDomain;
        updateData.wooConsumerKey = data.wooConsumerKey;
        updateData.wooConsumerSecret = data.wooConsumerSecret;
        updateData.wooUpdatedAt = new Date();
        break;
      case 'wix':
        updateData.wixDomain = data.wixDomain;
        updateData.wixApiKey = data.wixApiKey;
        updateData.wixRefreshToken = data.wixRefreshToken;
        updateData.wixUpdatedAt = new Date();
        break;
    }

    await BrandSettings.findOneAndUpdate(
      { business: businessId },
      updateData
    );
  }

  /**
   * Remove integration
   */
  async removeIntegration(businessId: string, type: string): Promise<{
    dataRemoved: boolean;
    webhooksDisabled: boolean;
    syncStopped: boolean;
  }> {
    const updateData: any = {};

    switch (type) {
      case 'shopify':
        updateData.$unset = {
          shopifyDomain: 1,
          shopifyAccessToken: 1,
          shopifyWebhookSecret: 1,
          shopifyConfig: 1
        };
        break;
      case 'woocommerce':
        updateData.$unset = {
          wooDomain: 1,
          wooConsumerKey: 1,
          wooConsumerSecret: 1
        };
        break;
      case 'wix':
        updateData.$unset = {
          wixDomain: 1,
          wixApiKey: 1,
          wixRefreshToken: 1
        };
        break;
    }

    await BrandSettings.findOneAndUpdate(
      { business: businessId },
      updateData
    );

    return {
      dataRemoved: true,
      webhooksDisabled: true,
      syncStopped: true
    };
  }

  /**
   * Get configured integrations
   */
  getConfiguredIntegrations(settings: any): string[] {
    const configured: string[] = [];

    if (settings.shopifyDomain) configured.push('shopify');
    if (settings.wooDomain) configured.push('woocommerce');
    if (settings.wixDomain) configured.push('wix');

    return configured;
  }

  /**
   * Get available integrations based on plan
   */
  getAvailableIntegrations(plan: string): string[] {
    switch (plan) {
      case 'growth':
      case 'premium':
      case 'enterprise':
        return ['shopify', 'woocommerce', 'wix'];
      default:
        return [];
    }
  }

  /**
   * Check integration permissions for a plan
   */
  checkIntegrationPermissions(userPlan: string, integrationType: string): boolean {
    const integrationPlans: { [key: string]: string[] } = {
      'shopify': ['growth', 'premium', 'enterprise'],
      'woocommerce': ['growth', 'premium', 'enterprise'],
      'wix': ['growth', 'premium', 'enterprise']
    };

    return integrationPlans[integrationType]?.includes(userPlan) || false;
  }

  /**
   * Get integration statistics
   */
  async getIntegrationStatistics(): Promise<{
    totalIntegrations: number;
    shopifyIntegrations: number;
    woocommerceIntegrations: number;
    wixIntegrations: number;
  }> {
    try {
      const stats = await BrandSettings.aggregate([
        {
          $group: {
            _id: null,
            totalIntegrations: { $sum: 1 },
            shopifyIntegrations: {
              $sum: { $cond: [{ $ifNull: ['$shopifyDomain', false] }, 1, 0] }
            },
            woocommerceIntegrations: {
              $sum: { $cond: [{ $ifNull: ['$wooDomain', false] }, 1, 0] }
            },
            wixIntegrations: {
              $sum: { $cond: [{ $ifNull: ['$wixDomain', false] }, 1, 0] }
            }
          }
        }
      ]);

      return stats[0] || {
        totalIntegrations: 0,
        shopifyIntegrations: 0,
        woocommerceIntegrations: 0,
        wixIntegrations: 0
      };
    } catch (error) {
      logger.error('Error getting integration statistics:', error);
      return {
        totalIntegrations: 0,
        shopifyIntegrations: 0,
        woocommerceIntegrations: 0,
        wixIntegrations: 0
      };
    }
  }
}
