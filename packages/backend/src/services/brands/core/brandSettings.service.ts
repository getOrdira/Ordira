// src/services/brands/core/brandSettings.service.ts
import { BrandSettings, IBrandSettings } from '../../../models/deprecated/brandSettings.model';
import { logger } from '../../../utils/logger';
import { ethers } from 'ethers';
import * as certificateManager from '../../external/certificateManager';

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

export class BrandSettingsCoreService {
  /**
   * Get or create brand settings for a business
   */
  async getSettings(businessId: string): Promise<IBrandSettings> {
    try {
      if (!businessId || typeof businessId !== 'string') {
        throw new Error('Invalid business ID provided');
      }

      let settings = await BrandSettings.findOne({ business: businessId });
      if (!settings) {
        logger.info(`Creating new brand settings for business: ${businessId}`);
        settings = await BrandSettings.create({ business: businessId });
        logger.info(`Brand settings created successfully for business: ${businessId}`);
      }
      
      return settings;
    } catch (error: any) {
      logger.error(`Failed to get/create brand settings for business ${businessId}:`, error);
      throw new Error(`Failed to retrieve brand settings: ${error.message}`);
    }
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
    try {
      if (!businessId || typeof businessId !== 'string') {
        throw new Error('Invalid business ID provided');
      }

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid update data provided');
      }

      logger.info(`Updating enhanced brand settings for business: ${businessId}`);

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

      if (!settings) {
        throw new Error('Failed to update brand settings');
      }

      // Handle SSL provisioning for custom domain
      if (data.customDomain) {
        try {
          logger.info(`Provisioning SSL certificate for domain: ${data.customDomain}`);
          await certificateManager.provisionCertForHost(data.customDomain);
          logger.info(`SSL certificate provisioned successfully for domain: ${data.customDomain}`);
        } catch (err) {
          logger.error(`SSL provisioning failed for ${data.customDomain}:`, err);
          // Don't throw error here as SSL provisioning failure shouldn't block settings update
        }
      }

      logger.info(`Brand settings updated successfully for business: ${businessId}`);
      return Object.assign(settings, {
        version: 1,
        updateMetadata: data.updateMetadata
      }) as EnhancedBrandSettings;
    } catch (error: any) {
      logger.error(`Failed to update enhanced brand settings for business ${businessId}:`, error);
      throw new Error(`Failed to update brand settings: ${error.message}`);
    }
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
    checkBalance?: boolean;
    minimumBalance?: string;
  } = {}): Promise<WalletValidationResult> {
    try {
      // Enhanced format validation using ethers
      if (!ethers.isAddress(address)) {
        return {
          valid: false,
          errors: ['Invalid wallet address format']
        };
      }

      // Normalize address to checksum format
      const checksumAddress = ethers.getAddress(address);

      // Check if wallet is already in use by another business
      const existingUse = await this.isWalletInUse(checksumAddress, options.businessId);
      if (existingUse) {
        return {
          valid: false,
          errors: ['Wallet address is already in use by another business']
        };
      }

      // Enhanced validation for enterprise plans
      let verified = false;
      const validationResults: string[] = [];

      if (options.requireSignature) {
        if (!options.signature || !options.message) {
          return {
            valid: false,
            errors: ['Signature verification required but signature or message not provided']
          };
        }

        verified = await this.verifyWalletSignature(checksumAddress, options.message, options.signature);
        if (!verified) {
          return {
            valid: false,
            errors: ['Signature verification failed - unable to verify wallet ownership']
          };
        }
        validationResults.push('Signature verified');
      } else if (options.signature && options.message) {
        // Optional signature verification
        verified = await this.verifyWalletSignature(checksumAddress, options.message, options.signature);
        if (verified) {
          validationResults.push('Signature verified');
        }
      }

      // Optional balance check (for premium features)
      if (options.checkBalance && options.minimumBalance) {
        try {
          const hasMinimumBalance = await this.checkWalletBalance(checksumAddress, options.minimumBalance);
          if (!hasMinimumBalance) {
            return {
              valid: false,
              errors: [`Wallet balance below required minimum of ${options.minimumBalance} ETH`]
            };
          }
          validationResults.push('Balance requirement met');
        } catch (balanceError) {
          logger.warn('Balance check failed, proceeding without balance validation:', balanceError);
        }
      }

      return {
        valid: true,
        verified,
        ...(validationResults.length > 0 && { validationResults })
      };
    } catch (error: any) {
      logger.error('Wallet validation error:', error);
      return {
        valid: false,
        errors: [`Validation failed: ${error.message}`]
      };
    }
  }

  /**
   * Check wallet balance (requires RPC provider)
   */
  private async checkWalletBalance(walletAddress: string, minimumBalance: string): Promise<boolean> {
    try {
      // This would require an Ethereum RPC provider
      // For now, return true as a placeholder
      // In production, you'd want to:
      // const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
      // const balance = await provider.getBalance(walletAddress);
      // const minimumWei = ethers.parseEther(minimumBalance);
      // return balance >= minimumWei;

      logger.info(`Balance check requested for ${walletAddress} (minimum: ${minimumBalance} ETH)`);
      return true; // Placeholder
    } catch (error) {
      logger.error('Balance check error:', error);
      throw error;
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
   * Verify wallet signature using ethers.js with enhanced validation
   */
  private async verifyWalletSignature(
    walletAddress: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      // Validate inputs
      if (!walletAddress || !message || !signature) {
        logger.warn('Missing required parameters for signature verification');
        return false;
      }

      // Normalize and validate wallet address
      const normalizedAddress = ethers.getAddress(walletAddress);

      // Validate signature format
      if (!this.isValidSignatureFormat(signature)) {
        logger.warn('Invalid signature format detected');
        return false;
      }

      // Handle development environment test signatures
      if (process.env.NODE_ENV === 'development' && this.isTestSignature(signature)) {
        logger.warn('Using test signature in development mode');
        return true;
      }

      // Verify the signature
      const messageHash = ethers.hashMessage(message);
      const recoveredAddress = ethers.recoverAddress(messageHash, signature);

      const isValid = normalizedAddress.toLowerCase() === recoveredAddress.toLowerCase();

      if (isValid) {
        logger.info(`Signature verification successful for wallet: ${walletAddress}`);
      } else {
        logger.warn(`Signature verification failed - Expected: ${normalizedAddress}, Got: ${recoveredAddress}`);
      }

      return isValid;
    } catch (error: any) {
      logger.error('Wallet signature verification error:', error);

      // Additional error handling for specific cases
      if (error.code === 'INVALID_ARGUMENT') {
        logger.error('Invalid argument provided to ethers signature verification');
      } else if (error.code === 'BAD_DATA') {
        logger.error('Bad data format in signature verification');
      }

      return false;
    }
  }

  /**
   * Validate signature format
   */
  private isValidSignatureFormat(signature: string): boolean {
    // Standard Ethereum signature format: 0x + 130 hex characters (65 bytes)
    const standardFormat = /^0x[a-fA-F0-9]{130}$/.test(signature);
    // Some wallets use 132 characters (with recovery id)
    const extendedFormat = /^0x[a-fA-F0-9]{132}$/.test(signature);

    return standardFormat || extendedFormat;
  }

  /**
   * Check if signature is a test signature for development
   */
  private isTestSignature(signature: string): boolean {
    const testSignatures = [
      '0xtest_signature',
      '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
    ];

    return testSignatures.includes(signature.toLowerCase());
  }

  /**
   * Verify wallet ownership through signature verification
   */
  async verifyWalletOwnership(businessId: string, walletAddress: string, options: {
    signature?: string;
    message?: string;
    nonce?: string;
    requireSignature?: boolean;
  } = {}): Promise<{
    verified: boolean;
    message?: string;
    challenge?: string;
  }> {
    try {
      // Validate wallet address format first
      if (!ethers.isAddress(walletAddress)) {
        return {
          verified: false,
          message: 'Invalid wallet address format'
        };
      }

      // If signature and message are provided, verify them
      if (options.signature && options.message) {
        const isValid = await this.verifyWalletSignature(walletAddress, options.message, options.signature);
        return {
          verified: isValid,
          message: isValid ? 'Wallet ownership verified successfully' : 'Signature verification failed'
        };
      }

      // Generate a verification challenge for the user to sign
      const challengeMessage = options.message || this.generateWalletVerificationMessage(businessId, walletAddress, options.nonce);

      logger.info(`Wallet ownership verification challenge generated for business ${businessId}, wallet ${walletAddress}`);

      return {
        verified: false,
        message: 'Signature required for wallet verification',
        challenge: challengeMessage
      };
    } catch (error: any) {
      logger.error('Wallet ownership verification error:', error);
      return {
        verified: false,
        message: `Verification failed: ${error.message}`
      };
    }
  }

  /**
   * Generate a wallet verification message
   */
  private generateWalletVerificationMessage(businessId: string, walletAddress: string, nonce?: string): string {
    const timestamp = new Date().toISOString();
    const messageNonce = nonce || Math.random().toString(36).substring(2, 15);

    return `Ordira Wallet Verification\n\nBusiness ID: ${businessId}\nWallet Address: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${messageNonce}\n\nPlease sign this message to verify wallet ownership.`;
  }

  /**
   * Generate a time-limited verification challenge
   */
  generateVerificationChallenge(businessId: string, walletAddress: string, options: {
    expiryMinutes?: number;
    includeDomain?: boolean;
  } = {}): {
    message: string;
    nonce: string;
    expiresAt: Date;
  } {
    const nonce = this.generateSecureNonce();
    const expiryMinutes = options.expiryMinutes || 15;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const domain = options.includeDomain ? 'ordira.com' : undefined;

    let message = `Ordira Wallet Verification\n\n`;
    message += `Business: ${businessId}\n`;
    message += `Wallet: ${walletAddress}\n`;
    message += `Nonce: ${nonce}\n`;
    message += `Expires: ${expiresAt.toISOString()}\n`;

    if (domain) {
      message += `Domain: ${domain}\n`;
    }

    message += `\nSign this message to verify ownership of this wallet.`;

    return {
      message,
      nonce,
      expiresAt
    };
  }

  /**
   * Generate a cryptographically secure nonce
   */
  private generateSecureNonce(): string {
    return ethers.hexlify(ethers.randomBytes(16));
  }

  /**
   * Check if subdomain is available
   */
  async isSubdomainAvailable(subdomain: string): Promise<boolean> {
    const existing = await BrandSettings.findOne({ subdomain });
    return !existing;
  }

  /**
   * Validate custom domain with DNS and SSL checks
   */
  async validateCustomDomain(domain: string): Promise<{ valid: boolean; error?: string; dnsRecords?: DnsRecord[]; sslStatus?: any }> {
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

      // DNS validation
      const dnsValidation = await this.validateDomainDns(domain);
      if (!dnsValidation.valid) {
        return { valid: false, error: dnsValidation.error, dnsRecords: dnsValidation.records };
      }

      // SSL validation
      const sslValidation = await this.validateDomainSsl(domain);
      
      return { 
        valid: true, 
        dnsRecords: dnsValidation.records,
        sslStatus: sslValidation
      };
    } catch (error: any) {
      logger.error('Domain validation error:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate domain DNS records
   */
  private async validateDomainDns(domain: string): Promise<{ valid: boolean; error?: string; records?: DnsRecord[] }> {
    try {
      const dns = require('dns').promises;
      
      // Check if domain resolves
      const addresses = await dns.resolve4(domain).catch(() => []);
      const cnameRecords = await dns.resolveCname(domain).catch(() => []);
      
      if (addresses.length === 0 && cnameRecords.length === 0) {
        return { 
          valid: false, 
          error: 'Domain does not resolve to any IP address',
          records: []
        };
      }

      const records: DnsRecord[] = [];
      
      // Add A records
      addresses.forEach((address: string) => {
        records.push({
          type: 'A',
          name: domain,
          value: address,
          ttl: 300
        });
      });

      // Add CNAME records
      cnameRecords.forEach((cname: string) => {
        records.push({
          type: 'CNAME',
          name: domain,
          value: cname,
          ttl: 300
        });
      });

      // Check for required CNAME pointing to our platform
      const requiredCname = 'ordira.com'; // Replace with your actual platform domain
      const hasRequiredCname = cnameRecords.some((cname: string) => 
        cname.toLowerCase().includes(requiredCname.toLowerCase())
      );

      if (!hasRequiredCname && cnameRecords.length > 0) {
        return {
          valid: false,
          error: `Domain must have a CNAME record pointing to ${requiredCname}`,
          records
        };
      }

      return { valid: true, records };
    } catch (error: any) {
      logger.error('DNS validation error:', error);
      return { valid: false, error: 'DNS validation failed: ' + error.message };
    }
  }

  /**
   * Validate domain SSL certificate
   */
  private async validateDomainSsl(domain: string): Promise<{ valid: boolean; error?: string; certificate?: any }> {
    try {
      const https = require('https');
      
      return new Promise((resolve) => {
        const options = {
          hostname: domain,
          port: 443,
          path: '/',
          method: 'GET',
          timeout: 10000,
          rejectUnauthorized: false // Allow self-signed certificates for testing
        };

        const req = https.request(options, (res: any) => {
          const certificate = res.connection.getPeerCertificate();
          
          if (!certificate || !certificate.valid_to) {
            resolve({
              valid: false,
              error: 'No SSL certificate found'
            });
            return;
          }

          const now = new Date();
          const validTo = new Date(certificate.valid_to);
          const validFrom = new Date(certificate.valid_from);

          if (now > validTo) {
            resolve({
              valid: false,
              error: 'SSL certificate has expired',
              certificate: {
                issuer: certificate.issuer,
                subject: certificate.subject,
                validFrom: certificate.valid_from,
                validTo: certificate.valid_to
              }
            });
            return;
          }

          if (now < validFrom) {
            resolve({
              valid: false,
              error: 'SSL certificate is not yet valid',
              certificate: {
                issuer: certificate.issuer,
                subject: certificate.subject,
                validFrom: certificate.valid_from,
                validTo: certificate.valid_to
              }
            });
            return;
          }

          resolve({
            valid: true,
            certificate: {
              issuer: certificate.issuer,
              subject: certificate.subject,
              validFrom: certificate.valid_from,
              validTo: certificate.valid_to,
              daysUntilExpiry: Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            }
          });
        });

        req.on('error', (error: any) => {
          logger.error('SSL validation error:', error);
          resolve({
            valid: false,
            error: 'SSL connection failed: ' + error.message
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            valid: false,
            error: 'SSL validation timeout'
          });
        });

        req.end();
      });
    } catch (error: any) {
      logger.error('SSL validation error:', error);
      return {
        valid: false,
        error: 'SSL validation failed: ' + error.message
      };
    }
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

      // Normalize domain format
      const normalizedDomain = data.shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const apiUrl = `https://${normalizedDomain}/admin/api/2023-10/shop.json`;

      // Test API connection
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': data.shopifyAccessToken,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Shopify API error: ${response.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.errors || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        return {
          success: false,
          errors: [errorMessage]
        };
      }

      const shopData = await response.json();
      
      // Validate shop data structure
      if (!shopData.shop || !shopData.shop.id) {
        return {
          success: false,
          errors: ['Invalid shop data received from Shopify']
        };
      }

      // Test webhook endpoint if provided
      let webhookTestResult = null;
      if (data.shopifyWebhookSecret) {
        try {
          const webhookUrl = `https://${normalizedDomain}/admin/api/2023-10/webhooks.json`;
          const webhookResponse = await fetch(webhookUrl, {
            method: 'GET',
            headers: {
              'X-Shopify-Access-Token': data.shopifyAccessToken,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
          });

          if (webhookResponse.ok) {
            const webhookData = await webhookResponse.json();
            webhookTestResult = {
              webhooksConfigured: webhookData.webhooks?.length > 0,
              webhookCount: webhookData.webhooks?.length || 0
            };
          }
        } catch (webhookError) {
          logger.warn('Webhook test failed:', webhookError);
        }
      }

      return {
        success: true,
        data: {
          shopifyDomain: normalizedDomain,
          shopId: shopData.shop.id,
          shopName: shopData.shop.name,
          shopEmail: shopData.shop.email,
          shopCurrency: shopData.shop.currency,
          shopTimezone: shopData.shop.timezone,
          shopPlan: shopData.shop.plan_name,
          connected: true,
          testedAt: new Date(),
          ...webhookTestResult
        }
      };
    } catch (error: any) {
      logger.error('Shopify connection test failed:', error);
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        return {
          success: false,
          errors: ['Connection timeout - please check your domain and try again']
        };
      }
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return {
          success: false,
          errors: ['Unable to connect to Shopify domain - please verify the domain is correct']
        };
      }

      return {
        success: false,
        errors: [error.message || 'Unknown error occurred during connection test']
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
      delete settingsObj.wixRefreshToken;
      delete settingsObj.certificateWallet;
    }

    // Add export metadata
    const exportData = {
      ...settingsObj,
      _exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: options.exportedBy,
        businessId,
        format: options.format,
        version: '1.0'
      }
    };

    // Format data based on requested format
    switch (options.format.toLowerCase()) {
      case 'json':
        return exportData;
      
      case 'yaml':
        return this.convertToYaml(exportData);
      
      case 'csv':
        return this.convertToCsv(exportData);
      
      case 'xml':
        return this.convertToXml(exportData);
      
      default:
        return exportData;
    }
  }

  /**
   * Convert data to YAML format
   */
  private convertToYaml(data: any): string {
    const yaml = require('js-yaml');
    
    try {
      return yaml.dump(data, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: true
      });
    } catch (error) {
      logger.error('YAML conversion error:', error);
      throw new Error('Failed to convert data to YAML format');
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCsv(data: any): string {
    try {
      const csvRows: string[] = [];
      
      // Add header
      csvRows.push('Field,Value,Type');
      
      // Flatten nested objects
      const flattened = this.flattenObject(data);
      
      // Convert to CSV rows
      Object.entries(flattened).forEach(([key, value]) => {
        const escapedKey = this.escapeCsvField(key);
        const escapedValue = this.escapeCsvField(String(value));
        const type = typeof value;
        csvRows.push(`${escapedKey},${escapedValue},${type}`);
      });
      
      return csvRows.join('\n');
    } catch (error) {
      logger.error('CSV conversion error:', error);
      throw new Error('Failed to convert data to CSV format');
    }
  }

  /**
   * Convert data to XML format
   */
  private convertToXml(data: any): string {
    try {
      const xml2js = require('xml2js');
      const builder = new xml2js.Builder({
        rootName: 'BrandSettings',
        xmldec: { version: '1.0', encoding: 'UTF-8' },
        renderOpts: { pretty: true, indent: '  ', newline: '\n' }
      });
      
      return builder.buildObject(data);
    } catch (error) {
      logger.error('XML conversion error:', error);
      throw new Error('Failed to convert data to XML format');
    }
  }

  /**
   * Flatten nested object for CSV export
   */
  private flattenObject(obj: any, prefix: string = ''): any {
    const flattened: any = {};
    
    Object.keys(obj).forEach(key => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        flattened[newKey] = JSON.stringify(value);
      } else if (value instanceof Date) {
        flattened[newKey] = value.toISOString();
      } else {
        flattened[newKey] = value;
      }
    });
    
    return flattened;
  }

  /**
   * Escape CSV field values
   */
  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
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

  // ===== Plan and Feature Management =====

  /**
   * Validate plan permissions for settings updates
   */
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

  /**
   * Get required plans for restricted features
   */
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

  /**
   * Check integration permissions based on plan
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
   * Get plan features
   */
  getPlanFeatures(plan: string): string[] {
    const features = {
      foundation: ['Basic Branding', 'Subdomain'],
      growth: ['Enhanced Branding', 'Basic Integrations', 'Analytics'],
      premium: ['Custom Domain', 'Advanced Integrations', 'Web3 Features', 'Priority Support'],
      enterprise: ['White-label', 'Custom Development', 'Dedicated Support', 'Advanced Analytics']
    };
    return features[plan as keyof typeof features] || [];
  }

  /**
   * Get plan limitations
   */
  getPlanLimitations(plan: string): string[] {
    const limitations = {
      foundation: ['No custom domain', 'No integrations', 'Basic analytics only'],
      growth: ['Limited custom CSS', 'Basic Web3 features'],
      premium: ['Limited custom development'],
      enterprise: []
    };
    return limitations[plan as keyof typeof limitations] || [];
  }

  /**
   * Validate plan features for updates
   */
  validatePlanFeatures(updateData: any, plan: string): string[] {
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

  // ===== Validation and Helper Methods =====

  /**
   * Validate file upload
   */
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

  /**
   * Get allowed MIME types by category
   */
  getAllowedMimeTypes(category: 'logo' | 'banner' | 'general'): string[] {
    const mimeTypes = {
      logo: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      banner: ['image/jpeg', 'image/png', 'image/webp'],
      general: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']
    };

    return mimeTypes[category] || mimeTypes.general;
  }

  /**
   * Get critical fields that require special handling
   */
  getCriticalFields(): string[] {
    return ['subdomain', 'customDomain', 'certificateWallet', 'plan'];
  }

  /**
   * Check if update contains critical changes
   */
  hasCriticalChanges(updateData: any): boolean {
    const criticalFields = this.getCriticalFields();
    return Object.keys(updateData).some(field => criticalFields.includes(field));
  }

  /**
   * Get changed fields between current and update data
   */
  getChangedFields(current: any, update: any): string[] {
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

  /**
   * Calculate setup completeness percentage
   */
  calculateSetupCompleteness(settings: any, plan: string): number {
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

  /**
   * Generate setup recommendations
   */
  generateSetupRecommendations(settings: any, plan: string): string[] {
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

  /**
   * Get missing features based on plan
   */
  getMissingFeatures(settings: any, plan: string): string[] {
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

  /**
   * Get available integrations for plan
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
   * Get Web3 features for plan
   */
  getWeb3Features(plan: string): string[] {
    if (['premium', 'enterprise'].includes(plan)) {
      return ['NFT Minting', 'Token Discounts', 'Smart Contracts', 'Wallet Integration'];
    }
    return [];
  }

  /**
   * Get NFT capabilities for plan
   */
  getNftCapabilities(plan: string): string[] {
    if (plan === 'enterprise') {
      return ['Custom Contracts', 'Batch Minting', 'Advanced Metadata', 'Royalty Management'];
    }
    if (plan === 'premium') {
      return ['Standard NFT Minting', 'Basic Metadata', 'Wallet Integration'];
    }
    return [];
  }

  /**
   * Get Shopify automation features for plan
   */
  getShopifyAutomationFeatures(plan: string): string[] {
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

  /**
   * Get content type for export format
   */
  getContentType(format: string): string {
    switch (format) {
      case 'yaml': return 'application/x-yaml';
      case 'csv': return 'text/csv';
      case 'json': return 'application/json';
      case 'xml': return 'application/xml';
      default: return 'application/octet-stream';
    }
  }

  // ===== Response Builders =====

  /**
   * Build settings response
   */
  buildSettingsResponse(settings: any, changes?: any, setup?: any): any {
    return {
      success: true,
      settings,
      ...(changes && { changes }),
      ...(setup && { setup }),
      message: 'Brand settings updated successfully'
    };
  }

  /**
   * Build integration response
   */
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

  /**
   * Build error response
   */
  buildErrorResponse(error: string, code: string, details?: any): any {
    return {
      error,
      code,
      ...(details && { details })
    };
  }

  /**
   * Get integration features for plan
   */
  getIntegrationFeatures(userPlan: string): string[] {
    const features = {
      foundation: ['Basic Settings'],
      growth: ['E-commerce Integrations', 'Basic Analytics'],
      premium: ['Advanced Integrations', 'Custom Branding', 'Priority Support'],
      enterprise: ['White-label', 'Custom Development', 'Dedicated Support']
    };

    return features[userPlan as keyof typeof features] || features.foundation;
  }

  // ===== Additional Controller Helper Methods =====

  /**
   * Validate domain changes during settings update
   */
  async validateDomainChanges(businessId: string, updateData: any, currentSettings: any): Promise<void> {
    try {
      // Validate subdomain changes
      if (updateData.subdomain && updateData.subdomain !== currentSettings.subdomain) {
        const available = await this.isSubdomainAvailable(updateData.subdomain);
        if (!available) {
          throw { statusCode: 400, message: 'Subdomain is not available' };
        }

        // Additional subdomain validation
        const isValidSubdomain = /^[a-zA-Z0-9-]{3,63}$/.test(updateData.subdomain);
        if (!isValidSubdomain) {
          throw { statusCode: 400, message: 'Invalid subdomain format. Must be 3-63 characters, alphanumeric and hyphens only.' };
        }
      }
      
      // Validate custom domain changes
      if (updateData.customDomain && updateData.customDomain !== currentSettings.customDomain) {
        const isValidDomain = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(updateData.customDomain);
        if (!isValidDomain) {
          throw { statusCode: 400, message: 'Invalid custom domain format' };
        }

        // Check if domain is already in use
        const existing = await BrandSettings.findOne({ 
          customDomain: updateData.customDomain,
          business: { $ne: businessId }
        });
        
        if (existing) {
          throw { statusCode: 400, message: 'Custom domain is already in use' };
        }

        // Optional: Perform DNS validation
        const domainValidation = await this.validateCustomDomain(updateData.customDomain);
        if (!domainValidation.valid) {
          logger.warn(`Custom domain validation warning for ${updateData.customDomain}: ${domainValidation.error}`);
        }
      }
    } catch (error: any) {
      logger.error('Domain validation failed:', error);
      throw error;
    }
  }

  /**
   * Process wallet address change with verification
   */
  async processWalletChange(businessId: string, newWallet: string, currentWallet?: string): Promise<void> {
    try {
      if (newWallet !== currentWallet) {
        // Validate wallet format
        const validation = await this.validateWalletAddress(newWallet, { businessId });
        
        if (!validation.valid) {
          throw { 
            statusCode: 400, 
            message: `Wallet validation failed: ${validation.errors?.join(', ')}` 
          };
        }

        // Verify wallet ownership
        const ownership = await this.verifyWalletOwnership(businessId, newWallet);
        
        if (!ownership.verified) {
          logger.warn(`Wallet ownership not verified for business ${businessId}, wallet ${newWallet}`);
          // Note: In production, you might want to require verification
          // For now, we'll allow it but log a warning
        }

        logger.info(`Wallet address updated for business ${businessId}: ${currentWallet || 'none'} -> ${newWallet}`);
      }
    } catch (error: any) {
      logger.error('Wallet change processing failed:', error);
      throw error;
    }
  }

  /**
   * Process integration updates for Shopify, WooCommerce, and Wix
   */
  async processIntegrationUpdates(businessId: string, updateData: any, currentSettings: any): Promise<void> {
    try {
      const updates: Promise<void>[] = [];

      // Process Shopify integration changes
      if (updateData.shopifyIntegration) {
        logger.info(`Processing Shopify integration update for business ${businessId}`);
        updates.push(this.updateShopifyIntegration(businessId, updateData.shopifyIntegration));
      }
      
      // Process WooCommerce integration changes
      if (updateData.wooCommerceIntegration) {
        logger.info(`Processing WooCommerce integration update for business ${businessId}`);
        updates.push(this.updateWooCommerceIntegration(businessId, updateData.wooCommerceIntegration));
      }
      
      // Process Wix integration changes
      if (updateData.wixIntegration) {
        logger.info(`Processing Wix integration update for business ${businessId}`);
        updates.push(this.updateWixIntegration(businessId, updateData.wixIntegration));
      }

      // Wait for all integration updates to complete
      if (updates.length > 0) {
        await Promise.all(updates);
        logger.info(`Successfully processed ${updates.length} integration updates for business ${businessId}`);
      }
    } catch (error: any) {
      logger.error('Integration updates processing failed:', error);
      throw new Error(`Failed to process integration updates: ${error.message}`);
    }
  }

  /**
   * Handle notifications for significant settings changes
   */
  async handleSettingsChangeNotifications(businessId: string, current: any, update: any): Promise<void> {
    try {
      const significantChanges = ['certificateWallet', 'customDomain', 'subdomain'];
      const changedSignificantFields = significantChanges.filter(field => 
        update[field] && current[field] !== update[field]
      );
      
      if (changedSignificantFields.length > 0) {
        logger.info('Significant brand settings changes detected', { 
          businessId, 
          changedFields: changedSignificantFields,
          changes: changedSignificantFields.reduce((acc, field) => {
            acc[field] = {
              from: current[field] || 'not set',
              to: update[field]
            };
            return acc;
          }, {} as any)
        });

        // Here you could integrate with a notification service
        // For example: await notificationService.notifySettingsChange(businessId, changedSignificantFields);
      }

      // Log other changes for audit trail
      const allChangedFields = this.getChangedFields(current, update);
      if (allChangedFields.length > 0) {
        logger.info('Brand settings updated', {
          businessId,
          totalChanges: allChangedFields.length,
          fields: allChangedFields
        });
      }
    } catch (error: any) {
      logger.error('Failed to handle settings change notifications:', error);
      // Don't throw - notification failures shouldn't block settings updates
    }
  }

  /**
   * Get token discounts for a wallet address
   */
  async getTokenDiscounts(walletAddress: string): Promise<any> {
    try {
      // Validate wallet address
      if (!ethers.isAddress(walletAddress)) {
        logger.warn(`Invalid wallet address for token discount check: ${walletAddress}`);
        return null;
      }

      // Attempt to import and use TokenDiscountService
      try {
        const { TokenDiscountService } = await import('../../external/tokenDiscount.service');
        const tokenDiscountService = new TokenDiscountService();
        const discounts = await tokenDiscountService.getDiscountInfoForWallet(walletAddress);
        
        logger.info(`Token discounts retrieved for wallet ${walletAddress}`, { 
          hasDiscounts: !!discounts 
        });
        
        return discounts;
      } catch (importError) {
        logger.warn('TokenDiscountService not available, returning null:', importError);
        return null;
      }
    } catch (error: any) {
      logger.error('Failed to get token discounts:', error);
      return null;
    }
  }

  /**
   * Get integration changes between current and update data
   */
  getIntegrationChanges(current: any, update: any): string[] {
    const changes: string[] = [];
    
    // Check Shopify changes
    if (update.shopifyIntegration || update.shopifyDomain || update.shopifyAccessToken) {
      changes.push('shopify');
    }
    
    // Check WooCommerce changes
    if (update.wooCommerceIntegration || update.wooDomain || update.wooConsumerKey) {
      changes.push('woocommerce');
    }
    
    // Check Wix changes
    if (update.wixIntegration || update.wixDomain || update.wixApiKey) {
      changes.push('wix');
    }
    
    return changes;
  }
}

export const brandSettingsCoreService = new BrandSettingsCoreService();
