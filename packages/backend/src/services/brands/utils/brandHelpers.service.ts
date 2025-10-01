// src/services/brands/utils/brandHelpers.service.ts

import { logger } from '../../../utils/logger';
import { Business } from '../../../models/business.model';
import { BrandSettings } from '../../../models/brandSettings.model';
import { ethers } from 'ethers';

/**
 * Brand utility functions and helpers
 * Extracted common functionality from brandProfile, brandSettings, and brandAccount services
 */
export class BrandHelpersService {

  // ===== Plan and Feature Management =====

  /**
   * Get features available for a specific plan
   */
  getPlanFeatures(plan: string): string[] {
    const features = {
      foundation: ['Basic Profile', 'Email Support', 'Basic Branding', 'Subdomain'],
      growth: ['Enhanced Profile', 'Basic Analytics', 'Priority Support', 'Enhanced Branding', 'Basic Integrations', 'Analytics'],
      premium: ['Advanced Profile', 'Detailed Analytics', 'Custom Branding', 'Phone Support', 'Custom Domain', 'Advanced Integrations', 'Web3 Features', 'Priority Support'],
      enterprise: ['Full Customization', 'Advanced Analytics', 'White-label', 'Dedicated Support', 'Custom Development', 'Advanced Analytics']
    };
    return features[plan as keyof typeof features] || features.foundation;
  }

  /**
   * Get plan limitations
   */
  getPlanLimitations(plan: string): string[] {
    const limitations = {
      foundation: ['Limited customization', 'Basic analytics only', 'No custom domain', 'No integrations', 'Basic analytics only'],
      growth: ['Standard customization', 'Limited integrations', 'Limited custom CSS', 'Basic Web3 features'],
      premium: ['Advanced features available', 'Limited custom development'],
      enterprise: ['No limitations']
    };
    return limitations[plan as keyof typeof limitations] || limitations.foundation;
  }

  /**
   * Get available integrations for a plan
   */
  getAvailableIntegrations(plan: string): string[] {
    const integrations = {
      foundation: ['webhooks'],
      growth: ['webhooks', 'zapier', 'shopify', 'woocommerce', 'wix'],
      premium: ['webhooks', 'zapier', 'slack', 'shopify', 'woocommerce', 'wix'],
      enterprise: ['webhooks', 'zapier', 'slack', 'custom_api', 'shopify', 'woocommerce', 'wix']
    };
    return integrations[plan as keyof typeof integrations] || integrations.foundation;
  }

  /**
   * Get customizable features for a plan
   */
  getCustomizableFeatures(plan: string): string[] {
    const features = {
      foundation: ['basic_settings'],
      growth: ['basic_settings', 'email_templates'],
      premium: ['basic_settings', 'email_templates', 'dashboard_layout'],
      enterprise: ['basic_settings', 'email_templates', 'dashboard_layout', 'api_responses']
    };
    return features[plan as keyof typeof features] || features.foundation;
  }

  /**
   * Get Web3 features available for a plan
   */
  getWeb3Features(plan: string): string[] {
    if (['premium', 'enterprise'].includes(plan)) {
      return ['NFT Minting', 'Token Discounts', 'Smart Contracts', 'Wallet Integration'];
    }
    return [];
  }

  /**
   * Get NFT capabilities for a plan
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
   * Get Shopify automation features for a plan
   */
  getShopifyAutomationFeatures(plan: string): string[] {
    switch (plan) {
      case 'enterprise':
        return ['Advanced Workflows', 'Custom Scripts', 'Real-time Sync', 'Bulk Operations'];
      case 'premium':
        return ['Basic Workflows', 'Product Sync' ];
      case 'growth':
        return ['Product Import', 'Basic Sync'];
      default:
        return [];
    }
  }

  // ===== Validation Helpers =====

  /**
   * Validate plan permissions for updates
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

  // ===== File and Media Validation =====

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

  // ===== Profile Completeness and Scoring =====

  /**
   * Calculate profile completeness percentage
   */
  calculateProfileCompleteness(profile: any, plan: string = 'foundation'): number {
    const requiredFields = ['businessName', 'email', 'industry', 'description', 'contactEmail'];
    const optionalFields = [
      'profilePictureUrl', 'walletAddress', 'socialUrls', 'headquarters',
      'businessInformation', 'certifications', 'bannerImages', 'customCss', 'subdomain'
    ];
    const premiumFields = ['customDomain', 'certificateWallet'];

    const completedRequired = requiredFields.filter(field =>
      profile[field] && profile[field] !== ''
    ).length;

    const completedOptional = optionalFields.filter(field => {
      const value = profile[field];
      return value && (
        typeof value === 'string' ? value !== '' :
        Array.isArray(value) ? value.length > 0 :
        typeof value === 'object' ? Object.keys(value).length > 0 :
        true
      );
    }).length;

    let total = requiredFields.length + optionalFields.length;
    let completed = completedRequired + completedOptional;

    // Add premium fields if plan allows
    if (['premium', 'enterprise'].includes(plan)) {
      total += premiumFields.length;

      premiumFields.forEach(field => {
        if (profile[field]) completed++;
      });
    }

    const requiredScore = (completedRequired / requiredFields.length) * 70;
    const optionalScore = (completedOptional / optionalFields.length) * 30;

    return Math.round(requiredScore + optionalScore);
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
   * Calculate account age
   */
  calculateAccountAge(createdAt: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  }

  // ===== Recommendation Systems =====

  /**
   * Generate profile recommendations
   */
  generateProfileRecommendations(profile: any, plan: string): string[] {
    const recommendations: string[] = [];
    const completeness = this.calculateProfileCompleteness(profile, plan);

    if (completeness < 80) {
      recommendations.push('Complete your profile to improve discoverability');
    }

    if (!profile.profilePictureUrl) {
      recommendations.push('Add a professional profile picture');
    }

    if (!profile.logoUrl) {
      recommendations.push('Upload a logo to complete your brand identity');
    }

    if (!profile.themeColor) {
      recommendations.push('Set your brand theme color');
    }

    if (!profile.subdomain) {
      recommendations.push('Configure a custom subdomain for your brand');
    }

    if (!profile.walletAddress && ['premium', 'enterprise'].includes(plan)) {
      recommendations.push('Connect your wallet to access Web3 features');
    }

    if (!profile.certifications || profile.certifications.length === 0) {
      recommendations.push('Add certifications to build trust with partners');
    }

    if (['premium', 'enterprise'].includes(plan) && !profile.customDomain) {
      recommendations.push('Set up a custom domain for professional branding');
    }

    if (['premium', 'enterprise'].includes(plan) && !profile.certificateWallet) {
      recommendations.push('Connect your Web3 wallet for NFT features');
    }

    return recommendations;
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

  // ===== Data Transformation and Utility =====

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
   * Get critical fields that require special handling
   */
  getCriticalFields(): string[] {
    return ['subdomain', 'customDomain', 'certificateWallet', 'plan', 'businessName', 'industry', 'contactEmail', 'walletAddress'];
  }

  /**
   * Check if update contains critical changes
   */
  hasCriticalChanges(updateData: any): boolean {
    const criticalFields = this.getCriticalFields();
    return Object.keys(updateData).some(field => criticalFields.includes(field));
  }

  /**
   * Get significant changes for notifications
   */
  getSignificantChanges(current: any, update: any): string[] {
    const significantFields = ['businessName', 'industry', 'contactEmail', 'walletAddress', 'certificateWallet', 'customDomain', 'subdomain'];
    return significantFields.filter(field =>
      update[field] && current[field] !== update[field]
    );
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

  // ===== Brand Analytics and Scoring =====

  /**
   * Calculate compatibility score between two brands
   */
  async calculateCompatibilityScore(brandId1: string, brandId2: string): Promise<{
    score: number;
    factors: any[];
    recommendations: string[];
  }> {
    try {
      const [brand1, brand2] = await Promise.all([
        Business.findById(brandId1),
        Business.findById(brandId2)
      ]);

      if (!brand1 || !brand2) {
        return {
          score: 0,
          factors: [],
          recommendations: ['Unable to calculate compatibility - brand not found']
        };
      }

      let score = 0;
      const factors: any[] = [];
      const recommendations: string[] = [];

      // Industry compatibility
      if (brand1.industry === brand2.industry) {
        score += 40;
        factors.push({
          factor: 'Industry Match',
          score: 40,
          description: `Both brands are in ${brand1.industry}`
        });
      } else {
        factors.push({
          factor: 'Industry Mismatch',
          score: 0,
          description: `Different industries: ${brand1.industry} vs ${brand2.industry}`
        });
        recommendations.push('Consider cross-industry collaboration opportunities');
      }

      // Verification status compatibility
      if (brand1.isEmailVerified && brand2.isEmailVerified) {
        score += 20;
        factors.push({
          factor: 'Both Verified',
          score: 20,
          description: 'Both brands have verified accounts'
        });
      } else {
        const verifiedCount = (brand1.isEmailVerified ? 1 : 0) + (brand2.isEmailVerified ? 1 : 0);
        const partialScore = verifiedCount * 10;
        score += partialScore;
        factors.push({
          factor: 'Partial Verification',
          score: partialScore,
          description: `${verifiedCount} out of 2 brands verified`
        });
        if (!brand1.isEmailVerified || !brand2.isEmailVerified) {
          recommendations.push('Complete account verification to increase trust');
        }
      }

      // Base compatibility
      score += 35;
      factors.push({
        factor: 'Base Compatibility',
        score: 35,
        description: 'General platform compatibility'
      });

      // Generate recommendations based on score
      if (score >= 80) {
        recommendations.push('Highly compatible - consider immediate partnership');
      } else if (score >= 60) {
        recommendations.push('Good compatibility - explore collaboration opportunities');
      } else if (score >= 40) {
        recommendations.push('Moderate compatibility - may require alignment efforts');
      } else {
        recommendations.push('Low compatibility - consider alternative partnerships');
      }

      return {
        score: Math.min(score, 100),
        factors,
        recommendations
      };
    } catch (error) {
      logger.error('Error calculating compatibility:', error);
      return {
        score: 0,
        factors: [],
        recommendations: ['Error calculating compatibility']
      };
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
   * Get integration changes
   */
  getIntegrationChanges(current: any, update: any): string[] {
    const changes: string[] = [];

    if (update.shopifyIntegration) changes.push('shopify');
    if (update.wooCommerceIntegration) changes.push('woocommerce');
    if (update.wixIntegration) changes.push('wix');

    return changes;
  }

  // ===== Format and Export Utilities =====

  /**
   * Get content type for export format
   */
  getContentType(format: string): string {
    switch (format.toLowerCase()) {
      case 'yaml': return 'application/x-yaml';
      case 'csv': return 'text/csv';
      case 'json': return 'application/json';
      case 'xml': return 'application/xml';
      default: return 'application/octet-stream';
    }
  }

  /**
   * Flatten nested object for CSV export
   */
  flattenObject(obj: any, prefix: string = ''): any {
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
  escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  /**
   * Anonymize business data for privacy-compliant exports
   */
  anonymizeBusinessData(businessData: any): any {
    if (!businessData) return null;

    return {
      ...businessData,
      email: this.maskEmail(businessData.email),
      contactEmail: businessData.contactEmail ? this.maskEmail(businessData.contactEmail) : null,
      businessName: businessData.businessName ? 'Business_' + businessData._id.toString().slice(-6) : null,
      // Keep non-sensitive fields
      industry: businessData.industry,
      createdAt: businessData.createdAt,
      isEmailVerified: businessData.isEmailVerified,
      // Remove sensitive fields
      password: undefined,
      resetTokens: undefined,
      verificationCodes: undefined
    };
  }

  /**
   * Mask email for privacy
   */
  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return 'REDACTED';

    const [local, domain] = email.split('@');
    const maskedLocal = local.charAt(0) + '*'.repeat(Math.max(local.length - 2, 0)) + local.charAt(local.length - 1);

    return `${maskedLocal}@${domain}`;
  }

  // ===== Connection and Discovery Helpers =====

  /**
   * Get connection reason between brands
   */
  getConnectionReason(brand1: any, brand2: any, manufacturerId?: string): string {
    if (manufacturerId) {
      return 'Similar industry focus - potential manufacturing partnership';
    }

    if (brand1.industry === brand2.industry) {
      return `Same industry: ${brand1.industry}`;
    }

    return 'Complementary business focus';
  }

  /**
   * Get required verification documents
   */
  getRequiredVerificationDocs(plan: string): string[] {
    const baseDocs = ['businessLicense'];

    if (['premium', 'enterprise'].includes(plan)) {
      return [...baseDocs, 'taxDocument', 'proofOfAddress'];
    }

    return baseDocs;
  }

  // ===== Validation Helpers =====

  /**
   * Validate subdomain format
   */
  validateSubdomainFormat(subdomain: string): boolean {
    // Basic validation: alphanumeric and hyphens only, 3-63 chars
    return /^[a-zA-Z0-9-]{3,63}$/.test(subdomain);
  }

  /**
   * Validate domain format
   */
  validateDomainFormat(domain: string): boolean {
    // Basic domain format validation
    return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/.test(domain);
  }

  /**
   * Validate wallet address format
   */
  validateWalletAddressFormat(address: string): boolean {
    return ethers.isAddress(address);
  }
}

export const brandHelpersService = new BrandHelpersService();