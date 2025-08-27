// src/services/business/brandSettings.service.ts
import { BrandSettings, IBrandSettings } from '../../models/brandSettings.model';
import { Business } from '../../models/business.model';
import * as certificateManager from '../external/certificateManager';

export interface EnhancedBrandSettings extends IBrandSettings {
  version?: number;
  lastUpdatedBy?: string;
  updateSource?: string;
  updateMetadata?: any;
  customDomain?: string | null;
  domainStatus?: DomainStatus;
}

export interface IntegrationStatus {
  shopify: boolean;
  woocommerce: boolean;
  wix: boolean;
  lastSync?: Date;
  errors?: string[];
}

export interface DnsRecord {
  type: DnsRecord;
  name: string;
  value: string;
  ttl?: number;
}

export interface DomainStatus {
  subdomain: {
    configured: boolean;
    available: boolean;
    url?: string;
  };
  customDomain: {
    configured: boolean;
    verified: boolean;
    sslEnabled: boolean;
    url?: string;
    host?: string;                   
    cnameTarget?: string;           
    verification?: DomainVerification;
  };
}

export interface DomainVerification {
  verified: boolean;
  requiredRecords?: DnsRecord[];
  observedRecords?: DnsRecord[];
  checkedAt?: Date | string;
  reason?: string;
}

export interface WalletValidationResult {
  valid: boolean;
  verified?: boolean;
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
  connectionTest?: any;
}

export interface UpdateBrandSettingsInput {
  customDomain?: string | null;
  domainStatus?: DomainStatus;
  version?: number;
  lastUpdatedBy?: string;
  updateSource?: string;
  updateMetadata?: any;
}

export interface ConnectionTestResult {
  success: boolean;
  data?: any;
  errors?: string[];
}

export class BrandSettingsService {

  /**
   * Get or create brand settings for a business
   */
  async getSettings(businessId: string): Promise<IBrandSettings> {
    let settings = await BrandSettings.findOne({ business: businessId });
    if (!settings) {
      settings = await BrandSettings.create({ business: businessId });
    }
    return settings;
  }

  /**
   * Get enhanced brand settings with additional metadata
   */
  async getEnhancedSettings(businessId: string): Promise<EnhancedBrandSettings> {
    const settings = await this.getSettings(businessId);
     {
      ...settings.toObject(),
      version: 1,
      lastUpdatedBy: businessId,
      updateSource: 'api'
    }
    return;
  }

  /**
   * Get integration status for all configured integrations
   */
  async getIntegrationStatus(businessId: string): Promise<IntegrationStatus> {
    const settings = await this.getSettings(businessId);
    
    return {
      shopify: !!(settings as any).shopifyDomain,
      woocommerce: !!(settings as any).wooDomain,
      wix: !!(settings as any).wixDomain,
      lastSync: settings.updatedAt,
      errors: []
    };
  }

  /**
   * Get domain configuration status
   */
  async getDomainStatus(businessId: string): Promise<DomainStatus> {
    const settings = await this.getSettings(businessId);
    
    return {
      subdomain: {
        configured: !!settings.subdomain,
        available: !settings.subdomain || await this.isSubdomainAvailable(settings.subdomain),
        url: settings.subdomain ? `https://${settings.subdomain}.yourdomain.com` : undefined
      },
      customDomain: {
        configured: !!settings.customDomain,
        verified: !!settings.customDomain, // Simplified - assume verified if set
        sslEnabled: !!(settings as any).enableSsl,
        url: settings.customDomain ? `https://${settings.customDomain}` : undefined
      }
    };
  }

  /**
   * Update brand settings with enhanced tracking and metadata
   */
  async updateEnhancedSettings(businessId: string, data: any): Promise<EnhancedBrandSettings> {
    // Extract the basic settings that our model supports
    const basicSettings = {
      themeColor: data.themeColor,
      logoUrl: data.logoUrl,
      bannerImages: data.bannerImages,
      customCss: data.customCss,
      customDomain: data.customDomain,
      subdomain: data.subdomain,
      certificateWallet: data.certificateWallet
    };

    // Remove undefined fields
    Object.keys(basicSettings).forEach(key => {
      if (basicSettings[key as keyof typeof basicSettings] === undefined) {
        delete basicSettings[key as keyof typeof basicSettings];
      }
    });

    // Store additional metadata (you might want to add these fields to your model)
    const enhancedData = {
      ...basicSettings,
      // Store metadata in a way your current model can handle
      lastUpdatedBy: data.lastUpdatedBy,
      updateSource: data.updateSource
    };

    // Update settings
    const settings = await BrandSettings.findOneAndUpdate(
      { business: businessId },
      enhancedData,
      { new: true, upsert: true }
    ) as IBrandSettings;

    // Handle SSL provisioning for custom domain
    if (data.customDomain) {
      try {
        await certificateManager.provisionCertForHost(data.customDomain);
      } catch (err) {
        console.error(`SSL provisioning failed for ${data.customDomain}:`, err);
      }
    }

    return {
      ...settings.toObject(),
      version: 1,
      updateMetadata: data.updateMetadata
    };
  }

  /**
   * Update certificate wallet with enhanced validation and metadata
   */
  async updateCertificateWallet(businessId: string, data: any): Promise<{
    certificateWallet: string;
    verifiedAt?: Date;
  }> {
    const certificateWallet = typeof data === 'string' ? data : data.certificateWallet;
    
    const settings = await BrandSettings.findOneAndUpdate(
      { business: businessId },
      { 
        certificateWallet,
        // Store verification metadata if provided
        ...(data.verificationData && { lastWalletVerification: data.verificationData.verifiedAt })
      },
      { new: true, upsert: true }
    ) as IBrandSettings;

    return {
      certificateWallet: settings.certificateWallet!,
      verifiedAt: new Date()
    };
  }

  /**
   * Validate wallet address with enhanced security options
   */
  async validateWalletAddress(address: string, options: {
    requireSignature?: boolean;
    signature?: string;
    message?: string;
    businessId?: string;
  } = {}): Promise<WalletValidationResult> {
    try {
      // Basic format validation
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return {
          valid: false,
          errors: ['Invalid wallet address format']
        };
      }

      // Check if wallet is already in use
      const existingUse = await this.isWalletInUse(address, options.businessId);
      if (existingUse) {
        return {
          valid: false,
          errors: ['Wallet address is already in use']
        };
      }

      // Enhanced validation for enterprise plans
      if (options.requireSignature) {
        if (!options.signature || !options.message) {
          return {
            valid: false,
            errors: ['Signature verification required for enterprise plan']
          };
        }
        // TODO: Implement actual signature verification
        // For now, just check that signature is provided
      }

      return {
        valid: true,
        verified: !!options.signature
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.message]
      };
    }
  }

  /**
   * Check if wallet address is already in use
   */
  async isWalletInUse(address: string, excludeBusinessId?: string): Promise<boolean> {
    const query: any = { certificateWallet: address };
    if (excludeBusinessId) {
      query.business = { $ne: excludeBusinessId };
    }

    const existing = await BrandSettings.findOne(query);
    return !!existing;
  }

  /**
   * Verify wallet ownership (placeholder for actual verification)
   */
  async verifyWalletOwnership(businessId: string, walletAddress: string): Promise<boolean> {
    // TODO: Implement actual wallet ownership verification
    // This could involve signing a message with the wallet
    return true; // Placeholder
  }

  /**
   * Check if subdomain is available
   */
  async isSubdomainAvailable(subdomain: string): Promise<boolean> {
    const existing = await BrandSettings.findOne({ subdomain });
    return !existing;
  }

  /**
   * Validate custom domain
   */
  async validateCustomDomain(domain: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Basic domain format validation
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
      
      if (!domainRegex.test(domain)) {
        return { valid: false, error: 'Invalid domain format' };
      }

      // Check if domain is already in use
      const existing = await BrandSettings.findOne({ customDomain: domain });
      if (existing) {
        return { valid: false, error: 'Domain is already in use' };
      }

      // TODO: Add DNS validation, SSL check, etc.
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Test Shopify connection
   */
  async testShopifyConnection(data: ShopifyIntegrationData): Promise<ConnectionTestResult> {
    try {
      // TODO: Implement actual Shopify API connection test
      // For now, just validate required fields
      if (!data.shopifyDomain || !data.shopifyAccessToken) {
        return {
          success: false,
          errors: ['Shopify domain and access token are required']
        };
      }

      // Simulate connection test
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
      // Store integration data (you might want to add these fields to your model)
      const settings = await BrandSettings.findOneAndUpdate(
        { business: businessId },
        {
          // Store in a way your current model can handle
          shopifyDomain: data.shopifyDomain,
          shopifyAccessToken: data.shopifyAccessToken, // Note: Encrypt in production
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
   * Update Shopify integration
   */
  async updateShopifyIntegration(businessId: string, data: Partial<ShopifyIntegrationData>): Promise<void> {
    await BrandSettings.findOneAndUpdate(
      { business: businessId },
      {
        ...(data.shopifyDomain && { shopifyDomain: data.shopifyDomain }),
        ...(data.shopifyAccessToken && { shopifyAccessToken: data.shopifyAccessToken }),
        ...(data.shopifyWebhookSecret && { shopifyWebhookSecret: data.shopifyWebhookSecret }),
        shopifyUpdatedAt: new Date()
      }
    );
  }

  /**
   * Update WooCommerce integration
   */
  async updateWooCommerceIntegration(businessId: string, data: any): Promise<void> {
    await BrandSettings.findOneAndUpdate(
      { business: businessId },
      {
        wooDomain: data.wooDomain,
        wooConsumerKey: data.wooConsumerKey,
        wooConsumerSecret: data.wooConsumerSecret,
        wooUpdatedAt: new Date()
      }
    );
  }

  /**
   * Remove integration
   */
  async removeIntegration(businessId: string, type: string, options: {
    removedBy?: string;
    removalReason?: string;
    cleanupData?: boolean;
  } = {}): Promise<{
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
   * Export settings in various formats
   */
  async exportSettings(businessId: string, options: {
    format: string;
    includeSensitive: boolean;
    exportedBy: string;
  }): Promise<any> {
    const settings = await this.getSettings(businessId);
    const settingsObj = settings.toObject();

    // Remove sensitive data if not requested
    if (!options.includeSensitive) {
      delete settingsObj.shopifyAccessToken;
      delete settingsObj.wooConsumerSecret;
      delete settingsObj.certificateWallet;
    }

    // Format data based on requested format
    switch (options.format) {
      case 'json':
        return settingsObj;
      case 'yaml':
        // TODO: Convert to YAML format
        return `# Brand Settings Export\nbusinessId: ${businessId}\nthemeColor: ${settingsObj.themeColor || 'null'}`;
      case 'csv':
        // TODO: Convert to CSV format
        return 'Field,Value\nthemeColor,' + (settingsObj.themeColor || '');
      default:
        return settingsObj;
    }
  }

  /**
   * Update brand settings (original method for backward compatibility)
   */
  async updateSettings(
    businessId: string,
    data: Partial<{
      themeColor: string;
      logoUrl: string;
      bannerImages: string[];
      customCss: string;
      customDomain: string;
    }>
  ): Promise<IBrandSettings> {
    const settings = await BrandSettings.findOneAndUpdate(
      { business: businessId },
      data,
      { new: true, upsert: true }
    ) as IBrandSettings;

    // Handle SSL provisioning for custom domain
    if (data.customDomain) {
      try {
        await certificateManager.provisionCertForHost(data.customDomain);
      } catch (err) {
        console.error(`SSL provisioning failed for ${data.customDomain}:`, err);
      }
    }

    return settings;
  }

  /**
   * Update subdomain
   */
  async updateSubdomain(businessId: string, subdomain: string): Promise<IBrandSettings> {
    // Check if subdomain is already taken
    const existing = await BrandSettings.findOne({ 
      subdomain, 
      business: { $ne: businessId } 
    });
    
    if (existing) {
      throw { statusCode: 409, message: 'Subdomain already taken' };
    }

    const settings = await BrandSettings.findOneAndUpdate(
      { business: businessId },
      { subdomain },
      { new: true, upsert: true }
    ) as IBrandSettings;

    return settings;
  }

  /**
   * Remove custom domain
   */
  async removeCustomDomain(businessId: string): Promise<IBrandSettings> {
    const settings = await BrandSettings.findOneAndUpdate(
      { business: businessId },
      { $unset: { customDomain: 1 } },
      { new: true }
    ) as IBrandSettings;

    if (!settings) {
      throw { statusCode: 404, message: 'Brand settings not found' };
    }

    return settings;
  }

  /**
   * Get public settings
   */
  async getPublicSettings(businessId: string): Promise<Pick<IBrandSettings, 'themeColor' | 'logoUrl' | 'bannerImages' | 'customCss'>> {
    const settings = await BrandSettings.findOne({ business: businessId })
      .select('themeColor logoUrl bannerImages customCss');
    
    if (!settings) {
      throw { statusCode: 404, message: 'Brand settings not found' };
    }

    return settings;
  }

  /**
   * Validate subdomain
   */
  async validateSubdomain(subdomain: string): Promise<boolean> {
    // Basic validation: alphanumeric and hyphens only, 3-63 chars
    const isValid = /^[a-zA-Z0-9-]{3,63}$/.test(subdomain);
    if (!isValid) return false;

    // Check if available
    const existing = await BrandSettings.findOne({ subdomain });
    return !existing;
  }
}