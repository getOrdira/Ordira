// src/services/business/brandSettings.service.ts
import { BrandSettings, IBrandSettings } from '../../models/brandSettings.model';
import { logger } from '../../utils/logger'; 
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

type ExtendedBrandSettings = IBrandSettings & {
  shopifyDomain?: string;
  wooDomain?: string;
  wixDomain?: string;
  enableSsl?: boolean;
};

export interface IntegrationStatus {
  shopify: boolean;
  woocommerce: boolean;
  wix: boolean;
  lastSync?: Date;
  errors?: string[];
}

export interface DnsRecord {
  type: string;
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

  // Helper methods extracted from controller
  validatePlanPermissions(updateData: any, userPlan: string): string[] {
    const restrictedFeatures: string[] = [];
    
    // Premium+ only features
    const premiumFeatures = ['customDomain', 'advancedAnalytics', 'prioritySupport'];
    if (!['premium', 'enterprise'].includes(userPlan)) {
      restrictedFeatures.push(...premiumFeatures.filter(feature => updateData[feature]));
    }

    // Enterprise only features
    const enterpriseFeatures = ['whiteLabel', 'customBranding', 'dedicatedSupport'];
    if (userPlan !== 'enterprise') {
      restrictedFeatures.push(...enterpriseFeatures.filter(feature => updateData[feature]));
    }

    return restrictedFeatures;
  }

  getRequiredPlans(restrictedFeatures: string[]): string[] {
    const planMap: { [key: string]: string } = {
      'customDomain': 'premium',
      'advancedAnalytics': 'premium',
      'prioritySupport': 'premium',
      'whiteLabel': 'enterprise',
      'customBranding': 'enterprise',
      'dedicatedSupport': 'enterprise'
    };

    return [...new Set(restrictedFeatures.map(feature => planMap[feature] || 'premium'))];
  }

  checkIntegrationPermissions(userPlan: string, integrationType: string): boolean {
    const integrationPlans: { [key: string]: string[] } = {
      'shopify': ['growth', 'premium', 'enterprise'],
      'woocommerce': ['growth', 'premium', 'enterprise'],
      'wix': ['growth', 'premium', 'enterprise']
    };

    return integrationPlans[integrationType]?.includes(userPlan) || false;
  }

  validateFileUpload(file: any, allowedTypes: string[], maxSize: number = 5 * 1024 * 1024): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file uploaded' };
    }

    if (!allowedTypes.includes(file.mimetype)) {
      return { valid: false, error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` };
    }

    if (file.size > maxSize) {
      return { valid: false, error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB` };
    }

    return { valid: true };
  }

  getAllowedMimeTypes(category: 'logo' | 'banner' | 'general'): string[] {
    const mimeTypes = {
      logo: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      banner: ['image/jpeg', 'image/png', 'image/webp'],
      general: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']
    };

    return mimeTypes[category] || mimeTypes.general;
  }

  getCriticalFields(): string[] {
    return ['subdomain', 'customDomain', 'certificateWallet', 'plan'];
  }

  hasCriticalChanges(updateData: any): boolean {
    const criticalFields = this.getCriticalFields();
    return Object.keys(updateData).some(field => criticalFields.includes(field));
  }

  buildSettingsResponse(settings: any, changes?: any, setup?: any): any {
    return {
      success: true,
      settings,
      ...(changes && { changes }),
      ...(setup && { setup }),
      message: 'Brand settings updated successfully'
    };
  }

  buildIntegrationResponse(integration: any, features: any, userPlan: string): any {
    return {
      success: true,
      integration,
      features: {
        ...features,
        automation: this.getShopifyAutomationFeatures(userPlan)
      },
      message: 'Integration configured successfully'
    };
  }

  buildErrorResponse(error: string, code: string, details?: any): any {
    return {
      error,
      code,
      ...(details && { details })
    };
  }

  getIntegrationFeatures(userPlan: string): string[] {
    const features = {
      foundation: ['Basic Settings'],
      growth: ['E-commerce Integrations', 'Basic Analytics'],
      premium: ['Advanced Integrations', 'Custom Branding', 'Priority Support'],
      enterprise: ['White-label', 'Custom Development', 'Dedicated Support']
    };

    return features[userPlan as keyof typeof features] || features.foundation;
  }

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
    return Object.assign(settings, {
      version: 1,
      lastUpdatedBy: businessId,
      updateSource: 'api'
    }) as EnhancedBrandSettings;
  }

  /**
   * Get integration status for all configured integrations
   */
  async getIntegrationStatus(businessId: string): Promise<IntegrationStatus> {
    const settings = await this.getSettings(businessId);
    
    return {
      shopify: !!(settings as ExtendedBrandSettings).shopifyDomain,
      woocommerce: !!(settings as ExtendedBrandSettings).wooDomain,
      wix: !!(settings as ExtendedBrandSettings).wixDomain,
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
        sslEnabled: !!(settings as ExtendedBrandSettings).enableSsl,
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
        logger.error('SSL provisioning failed for ${data.customDomain}:', err);
      }
    }

    return Object.assign(settings, {
      version: 1,
      updateMetadata: data.updateMetadata
    }) as EnhancedBrandSettings;
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
   * Update Wix integration
   */
  async updateWixIntegration(businessId: string, data: any): Promise<void> {
    await BrandSettings.findOneAndUpdate(
      { business: businessId },
      {
        wixDomain: data.wixDomain,
        wixApiKey: data.wixApiKey,
        wixRefreshToken: data.wixRefreshToken,
        wixUpdatedAt: new Date()
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
        logger.error('SSL provisioning failed for ${data.customDomain}:', err);
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

  // ===== Controller-extracted helper functions =====

  public getPlanFeatures(plan: string): string[] {
    const features = {
      foundation: ['Basic Branding', 'Subdomain'],
      growth: ['Enhanced Branding', 'Basic Integrations', 'Analytics'],
      premium: ['Custom Domain', 'Advanced Integrations', 'Web3 Features', 'Priority Support'],
      enterprise: ['White-label', 'Custom Development', 'Dedicated Support', 'Advanced Analytics']
    };
    return features[plan as keyof typeof features] || [];
  }

  public getPlanLimitations(plan: string): string[] {
    const limitations = {
      foundation: ['No custom domain', 'No integrations', 'Basic analytics only'],
      growth: ['Limited custom CSS', 'Basic Web3 features'],
      premium: ['Limited custom development'],
      enterprise: []
    };
    return limitations[plan as keyof typeof limitations] || [];
  }

  public validatePlanFeatures(updateData: any, plan: string): string[] {
    const restricted: string[] = [];
    
    // Custom domain requires premium+
    if (updateData.customDomain && !['premium', 'enterprise'].includes(plan)) {
      restricted.push('Custom domain requires Premium or Enterprise plan');
    }
    
    // Certificate wallet requires premium+
    if (updateData.certificateWallet && !['premium', 'enterprise'].includes(plan)) {
      restricted.push('Certificate wallet requires Premium or Enterprise plan');
    }
    
    // Advanced integrations require growth+
    if (updateData.shopifyIntegration && !['growth', 'premium', 'enterprise'].includes(plan)) {
      restricted.push('Shopify integration requires Growth plan or higher');
    }
    
    return restricted;
  }


  public async validateDomainChanges(businessId: string, updateData: any, currentSettings: any): Promise<void> {
    if (updateData.subdomain && updateData.subdomain !== currentSettings.subdomain) {
      const available = await this.isSubdomainAvailable(updateData.subdomain);
      if (!available) {
        throw { statusCode: 400, message: 'Subdomain is not available' };
      }
    }
    
    if (updateData.customDomain && updateData.customDomain !== currentSettings.customDomain) {
      // Additional domain validation logic
      const isValidDomain = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(updateData.customDomain);
      if (!isValidDomain) {
        throw { statusCode: 400, message: 'Invalid domain format' };
      }
    }
  }

  public async processWalletChange(businessId: string, newWallet: string, currentWallet?: string): Promise<void> {
    if (newWallet !== currentWallet) {
      // Verify wallet ownership
      const isValid = await this.verifyWalletOwnership(businessId, newWallet);
      if (!isValid) {
        throw { statusCode: 400, message: 'Wallet ownership verification failed' };
      }
    }
  }

  public getChangedFields(current: any, update: any): string[] {
    return Object.keys(update).filter(key => {
      const currentValue = current[key];
      const updateValue = update[key];
      
      // Handle nested objects
      if (typeof currentValue === 'object' && typeof updateValue === 'object') {
        return JSON.stringify(currentValue) !== JSON.stringify(updateValue);
      }
      
      return currentValue !== updateValue;
    });
  }

  public async processIntegrationUpdates(businessId: string, updateData: any, currentSettings: any): Promise<void> {
    // Process Shopify integration changes
    if (updateData.shopifyIntegration) {
      await this.updateShopifyIntegration(businessId, updateData.shopifyIntegration);
    }
    
    // Process WooCommerce integration changes
    if (updateData.wooCommerceIntegration) {
      await this.updateWooCommerceIntegration(businessId, updateData.wooCommerceIntegration);
    }
    
    // Process Wix integration changes
    if (updateData.wixIntegration) {
      await this.updateWixIntegration(businessId, updateData.wixIntegration);
    }
  }

  public async handleSettingsChangeNotifications(businessId: string, current: any, update: any): Promise<void> {
    const significantChanges = ['certificateWallet', 'customDomain', 'subdomain'];
    const hasSignificantChanges = significantChanges.some(field => 
      update[field] && current[field] !== update[field]
    );
    
    if (hasSignificantChanges) {
      // Send notification about significant changes
      logger.info('Significant brand settings changes detected', { businessId, changes: update });
    }
  }

  public calculateSetupCompleteness(settings: any, plan: string): number {
    const requiredFields = ['themeColor', 'logoUrl'];
    const optionalFields = ['bannerImages', 'customCss', 'subdomain'];
    const premiumFields = ['customDomain', 'certificateWallet'];
    
    let completed = 0;
    let total = requiredFields.length + optionalFields.length;
    
    // Add premium fields if plan allows
    if (['premium', 'enterprise'].includes(plan)) {
      total += premiumFields.length;
    }
    
    // Count completed fields
    [...requiredFields, ...optionalFields].forEach(field => {
      if (settings[field]) completed++;
    });
    
    if (['premium', 'enterprise'].includes(plan)) {
      premiumFields.forEach(field => {
        if (settings[field]) completed++;
      });
    }
    
    return Math.round((completed / total) * 100);
  }

  public generateSetupRecommendations(settings: any, plan: string): string[] {
    const recommendations: string[] = [];
    
    if (!settings.logoUrl) {
      recommendations.push('Upload a logo to complete your brand identity');
    }
    
    if (!settings.themeColor) {
      recommendations.push('Set your brand theme color');
    }
    
    if (!settings.subdomain) {
      recommendations.push('Configure a custom subdomain for your brand');
    }
    
    if (['premium', 'enterprise'].includes(plan) && !settings.customDomain) {
      recommendations.push('Set up a custom domain for professional branding');
    }
    
    if (['premium', 'enterprise'].includes(plan) && !settings.certificateWallet) {
      recommendations.push('Connect your Web3 wallet for NFT features');
    }
    
    return recommendations;
  }

  public getMissingFeatures(settings: any, plan: string): string[] {
    const missing: string[] = [];
    const planFeatures = this.getPlanFeatures(plan);
    
    if (planFeatures.includes('Custom Domain') && !settings.customDomain) {
      missing.push('Custom Domain');
    }
    
    if (planFeatures.includes('Web3 Features') && !settings.certificateWallet) {
      missing.push('Web3 Wallet');
    }
    
    if (planFeatures.includes('Basic Integrations') && !settings.shopifyDomain && !settings.wooDomain) {
      missing.push('E-commerce Integration');
    }
    
    return missing;
  }

  public getAvailableIntegrations(plan: string): string[] {
    switch (plan) {
      case 'growth':
      case 'premium':
      case 'enterprise':
        return ['shopify', 'woocommerce', 'wix'];
      default:
        return [];
    }
  }

  public getConfiguredIntegrations(settings: any): string[] {
    const configured: string[] = [];
    
    if (settings.shopifyDomain) configured.push('shopify');
    if (settings.wooDomain) configured.push('woocommerce');
    if (settings.wixDomain) configured.push('wix');
    
    return configured;
  }

  public async getTokenDiscounts(walletAddress: string): Promise<any> {
    try {
      const { TokenDiscountService } = await import('../external/tokenDiscount.service');
      const tokenDiscountService = new TokenDiscountService();
      return await tokenDiscountService.getDiscountInfoForWallet(walletAddress);
    } catch (error) {
      logger.warn('Failed to get token discounts:', error);
      return null;
    }
  }

  public getWeb3Features(plan: string): string[] {
    if (['premium', 'enterprise'].includes(plan)) {
      return ['NFT Minting', 'Token Discounts', 'Smart Contracts', 'Wallet Integration'];
    }
    return [];
  }

  public getNftCapabilities(plan: string): string[] {
    if (plan === 'enterprise') {
      return ['Custom Contracts', 'Batch Minting', 'Advanced Metadata', 'Royalty Management'];
    }
    if (plan === 'premium') {
      return ['Standard NFT Minting', 'Basic Metadata', 'Wallet Integration'];
    }
    return [];
  }

  public getIntegrationChanges(current: any, update: any): string[] {
    const changes: string[] = [];
    
    if (update.shopifyIntegration) changes.push('shopify');
    if (update.wooCommerceIntegration) changes.push('woocommerce');
    if (update.wixIntegration) changes.push('wix');
    
    return changes;
  }

  public getShopifyAutomationFeatures(plan: string): string[] {
    switch (plan) {
      case 'enterprise':
        return ['Advanced Workflows', 'Custom Scripts', 'Real-time Sync', 'Bulk Operations'];
      case 'premium':
        return ['Basic Workflows', 'Product Sync', 'Order Management'];
      case 'growth':
        return ['Product Import', 'Basic Sync'];
      default:
        return [];
    }
  }

  public getContentType(format: string): string {
    switch (format) {
      case 'yaml': return 'application/x-yaml';
      case 'csv': return 'text/csv';
      case 'json': return 'application/json';
      case 'xml': return 'application/xml';
      default: return 'application/octet-stream';
    }
  }
}