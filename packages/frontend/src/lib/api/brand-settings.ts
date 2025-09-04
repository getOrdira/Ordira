// src/lib/api/brand-settings.ts

import { api } from './client';
import { ApiError } from '@/lib/types/common';

// Enhanced response interfaces matching backend controller responses
export interface BrandSettingsResponse {
  settings: BrandSettings & {
    lastUpdated: Date;
    settingsVersion: number;
  };
  features: {
    available: string[];
    currentPlan: string;
    limitations: any;
  };
  integrations: {
    status: any;
    available: string[];
    configured: string[];
  };
  domains: {
    status: any;
    configuration: {
      subdomain?: string;
      customDomain?: string;
      ssl?: boolean;
    };
  };
  web3: {
    walletConnected: boolean;
    contracts: {
      vote?: string;
      nft?: string;
    };
    discounts?: any;
  };
}

export interface WalletVerificationResponse {
  certificateWallet: string;
  verifiedAt: Date;
}

export interface WalletValidationResult {
  valid: boolean;
  verified?: boolean;
  errors?: string[];
}

export interface DomainValidationResult {
  valid: boolean;
  error?: string;
  dnsRecords?: Array<{
    type: string;
    name: string;
    value: string;
    status: 'valid' | 'invalid' | 'pending';
  }>;
}

export interface IntegrationTestResult {
  success: boolean;
  type: 'shopify' | 'woocommerce' | 'wix';
  connectionStatus: 'connected' | 'failed' | 'partial';
  errors?: string[];
  warnings?: string[];
}

export interface BrandSettings {
  _id: string;
  business: string;
  themeColor?: string;
  logoUrl?: string;
  bannerImages?: string[];
  customCss?: string;
  subdomain?: string;
  customDomain?: string;
  enableSsl?: boolean;
  certificateWallet?: string;
  emailGating?: {
    enabled: boolean;
    mode: 'whitelist' | 'blacklist' | 'disabled';
    allowUnregistered: boolean;
    requireApproval: boolean;
    autoSyncEnabled: boolean;
    syncSources: ('shopify' | 'woocommerce' | 'csv' | 'api')[];
    welcomeEmailEnabled: boolean;
    accessDeniedMessage: string;
    gatingRules?: {
      domainWhitelist?: string[];
      domainBlacklist?: string[];
      emailPatterns?: string[];
      maxVotesPerEmail?: number;
      votingWindow?: {
        enabled: boolean;
        startDate?: Date;
        endDate?: Date;
        timezone?: string;
      };
      geographicRestrictions?: {
        enabled: boolean;
        allowedCountries?: string[];
        blockedCountries?: string[];
      };
      ipWhitelist?: string[];
      ipBlacklist?: string[];
    };
    gatingAnalytics?: {
      totalEmailsChecked: number;
      totalEmailsAllowed: number;
      totalEmailsDenied: number;
      lastResetDate?: Date;
      dailyStats?: Array<{
        date: string;
        checked: number;
        allowed: number;
        denied: number;
        topDenialReasons: string[];
      }>;
    };
    integrationSettings?: {
      syncWithCRM?: boolean;
      crmWebhookUrl?: string;
      notifyOnDenial?: boolean;
      notifyOnApproval?: boolean;
      customWebhookUrl?: string;
      slackNotifications?: {
        enabled: boolean;
        webhookUrl?: string;
        channel?: string;
        notifyOnDenial?: boolean;
        notifyOnApproval?: boolean;
      };
    };
  };
  shopifyDomain?: string;
  shopifyAccessToken?: string;
  shopifyWebhookSecret?: string;
  shopifyConfig?: {
    syncProducts?: boolean;
    syncOrders?: boolean;
    configuredBy?: string;
    configuredAt?: Date;
  };
  shopifyUpdatedAt?: Date;
  wooDomain?: string;
  wooConsumerKey?: string;
  wooConsumerSecret?: string;
  wooUpdatedAt?: Date;
  wixDomain?: string;
  wixApiKey?: string;
  wixRefreshToken?: string;
  web3Settings?: {
    certificateWallet?: string;
    walletType?: 'metamask' | 'walletconnect' | 'coinbase' | 'hardware' | 'other';
    walletVerified?: boolean;
    walletVerifiedAt?: Date;
    walletSignature?: string;
    voteContract?: string;
    transferHealth?: string;
    nftContract?: string;
    chainId?: number;
    networkName?: string;
    gasSettings?: {
      maxGasPrice?: number;
      gasLimit?: number;
      priorityFee?: number;
      useGasOptimization?: boolean;
    };
    securitySettings?: {
      requireSignatureForTransfers?: boolean;
      enableMultisig?: boolean;
      multisigThreshold?: number;
      allowedSigners?: string[];
      sessionTimeout?: number;
    };
  };
  transferPreferences?: {
    autoTransfer?: boolean;
    transferDelay?: number;
    transferTimeout?: number;
    batchTransfer?: boolean;
    batchSize?: number;
    batchInterval?: number;
    retryFailedTransfers?: boolean;
    maxRetryAttempts?: number;
    retryBackoffStrategy?: 'linear' | 'exponential' | 'custom';
    retryDelayBase?: number;
    retryDelayMax?: number;
    notificationSettings?: {
      notifyOnTransfer?: boolean;
      notifyOnFailure?: boolean;
      notifyOnRetry?: boolean;
      notifyOnSuccess?: boolean;
      emailNotifications?: boolean;
      webhookNotifications?: boolean;
      webhookUrl?: string;
      slackIntegration?: {
        webhookUrl?: string;
        channel?: string;
        enabled?: boolean;
      };
    };
    transferRules?: {
      businessHoursOnly?: boolean;
      businessHoursStart?: string;
      businessHoursEnd?: string;
      timezone?: string;
      excludeWeekends?: boolean;
      excludeHolidays?: boolean;
      minimumValueThreshold?: string;
      requireCustomerConfirmation?: boolean;
      autoTransferWhitelist?: string[];
      autoTransferBlacklist?: string[];
      maxTransfersPerHour?: number;
      maxTransfersPerDay?: number;
      cooldownPeriod?: number;
    };
  };
  shopifyIntegration?: {
    shopifyDomain?: string;
    shopifyAccessToken?: string;
    shopifyWebhookSecret?: string;
    syncProducts?: boolean;
    syncOrders?: boolean;
    autoMintOnPurchase?: boolean;
    lastSyncAt?: Date;
  };
  plan?: 'foundation' | 'growth' | 'premium' | 'enterprise';
  transferAnalytics?: {
    totalTransfers: number;
    successfulTransfers: number;
    failedTransfers: number;
    totalGasUsed: string;
    averageTransferTime: number;
    monthlyStats: Array<{
      month: string;
      transfers: number;
      successRate: number;
    }>;
  };
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandProfile {
  description?: string;
  industry?: string;
  contactEmail?: string;
  socialUrls?: string[];
  profilePictureUrl?: string;
  website?: string;
  phoneNumber?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  yearEstablished?: number;
}

export interface BrandAccount {
  lastLoginAt?: Date;
  loginAttempts?: number;
  lockUntil?: Date;
  passwordResetCode?: string;
  passwordResetExpires?: Date;
  passwordResetAttempts?: number;
  lastPasswordResetAttempt?: Date;
  lastPasswordChangeAt?: Date;
}

export const brandSettingsApi = {
  
  // ===== MAIN BRAND SETTINGS =====
  
  /**
   * Get comprehensive brand settings with enhanced metadata
   * GET /api/brand-settings
   */
  getBrandSettings: async (): Promise<BrandSettingsResponse> => {
    try {
      const response = await api.get<BrandSettingsResponse>('/api/brand-settings');
      return response;
    } catch (error) {
      console.error('Get brand settings error:', error);
      throw error;
    }
  },

  /**
   * Update brand settings with plan validation
   * PATCH /api/brand-settings
   */
  updateBrandSettings: async (data: Partial<BrandSettings>): Promise<BrandSettingsResponse> => {
    try {
      const response = await api.patch<BrandSettingsResponse>('/api/brand-settings', data);
      return response;
    } catch (error) {
      console.error('Update brand settings error:', error);
      throw error;
    }
  },

  /**
   * Quick branding update (theme and logo only)
   * PATCH /api/brand-settings/quick
   */
  updateQuickBranding: async (data: {
    themeColor?: string;
    logoUrl?: string;
  }): Promise<BrandSettings> => {
    try {
      const response = await api.patch<BrandSettings>('/api/brand-settings/quick', data);
      return response;
    } catch (error) {
      console.error('Update quick branding error:', error);
      throw error;
    }
  },

  // ===== WALLET MANAGEMENT =====
  
  /**
   * Update certificate wallet with verification
   * PATCH /api/brand-settings/wallet
   */
  updateWallet: async (data: {
    certificateWallet: string;
    signature?: string;
    message?: string;
  }): Promise<WalletVerificationResponse> => {
    try {
      const response = await api.patch<WalletVerificationResponse>('/api/brand-settings/wallet', data);
      return response;
    } catch (error) {
      console.error('Update wallet error:', error);
      throw error;
    }
  },

  /**
   * Validate wallet address
   * POST /api/brand-settings/wallet/validate
   */
  validateWallet: async (walletAddress: string): Promise<WalletValidationResult> => {
    try {
      const response = await api.post<WalletValidationResult>('/api/brand-settings/wallet/validate', {
        walletAddress
      });
      return response;
    } catch (error) {
      console.error('Validate wallet error:', error);
      throw error;
    }
  },

  /**
   * Verify wallet ownership
   * POST /api/brand-settings/wallet/verify
   */
  verifyWalletOwnership: async (data: {
    walletAddress: string;
    signature: string;
    message: string;
  }): Promise<{ verified: boolean }> => {
    try {
      const response = await api.post<{ verified: boolean }>('/api/brand-settings/wallet/verify', data);
      return response;
    } catch (error) {
      console.error('Verify wallet ownership error:', error);
      throw error;
    }
  },

  // ===== DOMAIN MANAGEMENT =====
  
  /**
   * Update subdomain
   * PUT /api/brand-settings/domain-mapping/subdomain
   */
  updateSubdomain: async (subdomain: string): Promise<BrandSettings> => {
    try {
      const response = await api.put<BrandSettings>('/api/brand-settings/domain-mapping/subdomain', {
        subdomain
      });
      return response;
    } catch (error) {
      console.error('Update subdomain error:', error);
      throw error;
    }
  },

  /**
   * Check subdomain availability
   * POST /api/brand-settings/domain-mapping/subdomain/check
   */
  checkSubdomainAvailability: async (subdomain: string): Promise<{
    available: boolean;
    suggestions?: string[];
  }> => {
    try {
      const response = await api.post<{
        available: boolean;
        suggestions?: string[];
      }>('/api/brand-settings/domain-mapping/subdomain/check', { subdomain });
      return response;
    } catch (error) {
      console.error('Check subdomain availability error:', error);
      throw error;
    }
  },

  /**
   * Update custom domain
   * PUT /api/brand-settings/domain-mapping/custom
   */
  updateCustomDomain: async (customDomain: string): Promise<BrandSettings> => {
    try {
      const response = await api.put<BrandSettings>('/api/brand-settings/domain-mapping/custom', {
        customDomain
      });
      return response;
    } catch (error) {
      console.error('Update custom domain error:', error);
      throw error;
    }
  },

  /**
   * Validate custom domain
   * POST /api/brand-settings/domain-mapping/custom/validate
   */
  validateCustomDomain: async (domain: string): Promise<DomainValidationResult> => {
    try {
      const response = await api.post<DomainValidationResult>('/api/brand-settings/domain-mapping/custom/validate', {
        domain
      });
      return response;
    } catch (error) {
      console.error('Validate custom domain error:', error);
      throw error;
    }
  },

  /**
   * Get domain configuration status
   * GET /api/brand-settings/domain-mapping/status
   */
  getDomainStatus: async (): Promise<{
    subdomain: {
      configured: boolean;
      active: boolean;
      url?: string;
    };
    customDomain: {
      configured: boolean;
      verified: boolean;
      sslEnabled: boolean;
      url?: string;
      dnsStatus?: any;
    };
  }> => {
    try {
      const response = await api.get<{
        subdomain: {
          configured: boolean;
          active: boolean;
          url?: string;
        };
        customDomain: {
          configured: boolean;
          verified: boolean;
          sslEnabled: boolean;
          url?: string;
          dnsStatus?: any;
        };
      }>('/api/brand-settings/domain-mapping/status');
      return response;
    } catch (error) {
      console.error('Get domain status error:', error);
      throw error;
    }
  },

  // ===== INTEGRATION MANAGEMENT =====
  
  /**
   * Connect Shopify integration
   * POST /api/brand-settings/integrations/shopify
   */
  connectShopifyIntegration: async (data: {
    shopifyDomain: string;
    shopifyAccessToken: string;
    shopifyWebhookSecret?: string;
    syncProducts?: boolean;
    syncOrders?: boolean;
  }): Promise<BrandSettings> => {
    try {
      const response = await api.post<BrandSettings>('/api/brand-settings/integrations/shopify', data);
      return response;
    } catch (error) {
      console.error('Connect Shopify integration error:', error);
      throw error;
    }
  },

  /**
   * Test Shopify integration connection
   * POST /api/brand-settings/integrations/shopify/test
   */
  testShopifyIntegration: async (): Promise<IntegrationTestResult> => {
    try {
      const response = await api.post<IntegrationTestResult>('/api/brand-settings/integrations/shopify/test', {});
      return response;
    } catch (error) {
      console.error('Test Shopify integration error:', error);
      throw error;
    }
  },

  /**
   * Connect WooCommerce integration
   * POST /api/brand-settings/integrations/woocommerce
   */
  connectWooCommerceIntegration: async (data: {
    wooDomain: string;
    wooConsumerKey: string;
    wooConsumerSecret: string;
    apiVersion?: string;
    syncInterval?: number;
  }): Promise<BrandSettings> => {
    try {
      const response = await api.post<BrandSettings>('/api/brand-settings/integrations/woocommerce', data);
      return response;
    } catch (error) {
      console.error('Connect WooCommerce integration error:', error);
      throw error;
    }
  },

  /**
   * Test WooCommerce integration connection
   * POST /api/brand-settings/integrations/woocommerce/test
   */
  testWooCommerceIntegration: async (): Promise<IntegrationTestResult> => {
    try {
      const response = await api.post<IntegrationTestResult>('/api/brand-settings/integrations/woocommerce/test', {});
      return response;
    } catch (error) {
      console.error('Test WooCommerce integration error:', error);
      throw error;
    }
  },

  /**
   * Connect Wix integration
   * POST /api/brand-settings/integrations/wix
   */
  connectWixIntegration: async (data: {
    wixDomain: string;
    wixApiKey: string;
    wixRefreshToken?: string;
  }): Promise<BrandSettings> => {
    try {
      const response = await api.post<BrandSettings>('/api/brand-settings/integrations/wix', data);
      return response;
    } catch (error) {
      console.error('Connect Wix integration error:', error);
      throw error;
    }
  },

  /**
   * Test Wix integration connection
   * POST /api/brand-settings/integrations/wix/test
   */
  testWixIntegration: async (): Promise<IntegrationTestResult> => {
    try {
      const response = await api.post<IntegrationTestResult>('/api/brand-settings/integrations/wix/test', {});
      return response;
    } catch (error) {
      console.error('Test Wix integration error:', error);
      throw error;
    }
  },

  /**
   * Disconnect integration
   * DELETE /api/brand-settings/integrations/:type
   */
  disconnectIntegration: async (type: 'shopify' | 'woocommerce' | 'wix'): Promise<BrandSettings> => {
    try {
      const response = await api.delete<BrandSettings>(`/api/brand-settings/integrations/${type}`);
      return response;
    } catch (error) {
      console.error('Disconnect integration error:', error);
      throw error;
    }
  },

  /**
   * Get integration status overview
   * GET /api/brand-settings/integrations/status
   */
  getIntegrationStatus: async (): Promise<{
    shopify: {
      connected: boolean;
      lastSync?: Date;
      health: 'healthy' | 'warning' | 'error';
    };
    woocommerce: {
      connected: boolean;
      lastSync?: Date;
      health: 'healthy' | 'warning' | 'error';
    };
    wix: {
      connected: boolean;
      lastSync?: Date;
      health: 'healthy' | 'warning' | 'error';
    };
  }> => {
    try {
      const response = await api.get<{
        shopify: {
          connected: boolean;
          lastSync?: Date;
          health: 'healthy' | 'warning' | 'error';
        };
        woocommerce: {
          connected: boolean;
          lastSync?: Date;
          health: 'healthy' | 'warning' | 'error';
        };
        wix: {
          connected: boolean;
          lastSync?: Date;
          health: 'healthy' | 'warning' | 'error';
        };
      }>('/api/brand-settings/integrations/status');
      return response;
    } catch (error) {
      console.error('Get integration status error:', error);
      throw error;
    }
  },

  // ===== EMAIL GATING =====
  
  /**
   * Sync email gating customers from integration source
   * POST /api/brand-settings/email-gating/sync
   */
  syncEmailGatingCustomers: async (source: 'shopify' | 'woocommerce' | 'csv' | 'api'): Promise<{
    synced: number;
    errors: string[];
    summary: {
      added: number;
      updated: number;
      skipped: number;
    };
  }> => {
    try {
      const response = await api.post<{
        synced: number;
        errors: string[];
        summary: {
          added: number;
          updated: number;
          skipped: number;
        };
      }>('/api/brand-settings/email-gating/sync', { source });
      return response;
    } catch (error) {
      console.error('Sync email gating customers error:', error);
      throw error;
    }
  },

  /**
   * Test email gating rules
   * POST /api/brand-settings/email-gating/test
   */
  testEmailGatingRules: async (testEmail: string): Promise<{
    allowed: boolean;
    reason?: string;
    matchedRule?: string;
  }> => {
    try {
      const response = await api.post<{
        allowed: boolean;
        reason?: string;
        matchedRule?: string;
      }>('/api/brand-settings/email-gating/test', { testEmail });
      return response;
    } catch (error) {
      console.error('Test email gating rules error:', error);
      throw error;
    }
  },

  // ===== WEB3 CONTRACTS =====
  
  /**
   * Update Web3 contracts (vote and NFT)
   * PATCH /api/brand-settings/contracts
   */
  updateContracts: async (data: {
    voteContract?: string;
    nftContract?: string;
  }): Promise<BrandSettings> => {
    try {
      const response = await api.patch<BrandSettings>('/api/brand-settings/contracts', data);
      return response;
    } catch (error) {
      console.error('Update contracts error:', error);
      throw error;
    }
  },

  /**
   * Validate contract addresses
   * POST /api/brand-settings/contracts/validate
   */
  validateContracts: async (data: {
    voteContract?: string;
    nftContract?: string;
  }): Promise<{
    voteContract?: { valid: boolean; error?: string };
    nftContract?: { valid: boolean; error?: string };
  }> => {
    try {
      const response = await api.post<{
        voteContract?: { valid: boolean; error?: string };
        nftContract?: { valid: boolean; error?: string };
      }>('/api/brand-settings/contracts/validate', data);
      return response;
    } catch (error) {
      console.error('Validate contracts error:', error);
      throw error;
    }
  },

  // ===== ANALYTICS AND TRACKING =====
  
  /**
   * Update analytics settings
   * PATCH /api/brand-settings/analytics
   */
  updateAnalyticsSettings: async (data: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    enableHeatmaps?: boolean;
    enableSessionRecording?: boolean;
  }): Promise<BrandSettings> => {
    try {
      const response = await api.patch<BrandSettings>('/api/brand-settings/analytics', data);
      return response;
    } catch (error) {
      console.error('Update analytics settings error:', error);
      throw error;
    }
  },

  // ===== SEO SETTINGS =====
  
  /**
   * Update SEO settings
   * PATCH /api/brand-settings/seo
   */
  updateSeoSettings: async (data: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
  }): Promise<BrandSettings> => {
    try {
      const response = await api.patch<BrandSettings>('/api/brand-settings/seo', data);
      return response;
    } catch (error) {
      console.error('Update SEO settings error:', error);
      throw error;
    }
  },
};

// ===== BRAND PROFILE API =====

export const brandProfileApi = {
  
  /**
   * Get brand profile
   * GET /api/brand/profile
   */
  getBrandProfile: async (): Promise<BrandProfile> => {
    try {
      const response = await api.get<BrandProfile>('/api/brand/profile');
      return response;
    } catch (error) {
      console.error('Get brand profile error:', error);
      throw error;
    }
  },

  /**
   * Update brand profile
   * PATCH /api/brand/profile
   */
  updateBrandProfile: async (data: Partial<BrandProfile>): Promise<BrandProfile> => {
    try {
      const response = await api.patch<BrandProfile>('/api/brand/profile', data);
      return response;
    } catch (error) {
      console.error('Update brand profile error:', error);
      throw error;
    }
  },
};

// ===== BRAND ACCOUNT API =====

export const brandAccountApi = {
  
  /**
   * Get brand account settings
   * GET /api/brand/account
   */
  getBrandAccount: async (): Promise<BrandAccount> => {
    try {
      const response = await api.get<BrandAccount>('/api/brand/account');
      return response;
    } catch (error) {
      console.error('Get brand account error:', error);
      throw error;
    }
  },

  /**
   * Update brand account settings
   * PATCH /api/brand/account
   */
  updateBrandAccount: async (data: Partial<BrandAccount>): Promise<BrandAccount> => {
    try {
      const response = await api.patch<BrandAccount>('/api/brand/account', data);
      return response;
    } catch (error) {
      console.error('Update brand account error:', error);
      throw error;
    }
  },
};

// ===== STANDALONE FUNCTIONS =====

/**
 * Legacy function - use brandSettingsApi.updateWallet instead
 * @deprecated
 */
export const verifyWallet = async (signature: string): Promise<BrandSettings> => {
  console.warn('verifyWallet is deprecated, use brandSettingsApi.updateWallet instead');
  return brandSettingsApi.updateWallet({
    certificateWallet: '', // This function signature doesn't make sense - needs wallet address
    signature
  }).then(response => response as unknown as BrandSettings);
};

/**
 * Legacy function - use brandSettingsApi.syncEmailGatingCustomers instead  
 * @deprecated
 */
export const syncEmailGatingCustomers = async (source: string): Promise<{ synced: number; errors: string[] }> => {
  console.warn('syncEmailGatingCustomers is deprecated, use brandSettingsApi.syncEmailGatingCustomers instead');
  return brandSettingsApi.syncEmailGatingCustomers(source as any);
};

/**
 * Legacy function - use brandSettingsApi.connectShopifyIntegration instead
 * @deprecated
 */
export const connectIntegration = async (type: 'shopify' | 'woocommerce' | 'wix', data: any): Promise<BrandSettings> => {
  console.warn('connectIntegration is deprecated, use specific integration methods instead');
  switch (type) {
    case 'shopify':
      return brandSettingsApi.connectShopifyIntegration(data);
    case 'woocommerce':
      return brandSettingsApi.connectWooCommerceIntegration(data);
    case 'wix':
      return brandSettingsApi.connectWixIntegration(data);
    default:
      throw new ApiError('Invalid integration type', { statusCode: 400 });
  }
};

/**
 * Legacy function - use brandSettingsApi.updateContracts instead
 * @deprecated  
 */
export const updateContracts = async (data: { voteContract?: string; nftContract?: string }): Promise<BrandSettings> => {
  console.warn('updateContracts is deprecated, use brandSettingsApi.updateContracts instead');
  return brandSettingsApi.updateContracts(data);
};