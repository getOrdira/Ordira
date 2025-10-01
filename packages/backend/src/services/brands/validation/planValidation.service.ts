// src/services/brands/validation/plan-validation.service.ts
import { logger } from '../../../utils/logger';

export interface PlanFeatures {
  foundation: string[];
  growth: string[];
  premium: string[];
  enterprise: string[];
}

export interface PlanValidationResult {
  valid: boolean;
  restrictedFeatures: string[];
  requiredPlans: string[];
  message?: string;
}

export interface PlanLimitations {
  [plan: string]: string[];
}

export class PlanValidationService {
  private readonly planFeatures: PlanFeatures = {
    foundation: [
      'Basic Profile',
      'Email Support',
      'Basic Settings',
      'Subdomain'
    ],
    growth: [
      'Enhanced Profile',
      'Basic Analytics',
      'Priority Support',
      'E-commerce Integrations',
      'Basic Integrations'
    ],
    premium: [
      'Advanced Profile',
      'Detailed Analytics',
      'Custom Branding',
      'Phone Support',
      'Custom Domain',
      'Advanced Integrations',
      'Web3 Features',
      'Priority Support'
    ],
    enterprise: [
      'Full Customization',
      'Advanced Analytics',
      'White-label',
      'Dedicated Support',
      'Custom Development',
      'Custom Integrations',
      'Advanced Analytics'
    ]
  };

  private readonly planLimitations: PlanLimitations = {
    foundation: [
      'No custom domain',
      'No integrations',
      'Basic analytics only',
      'Limited customization'
    ],
    growth: [
      'Limited custom CSS',
      'Basic Web3 features',
      'Standard customization',
      'Limited integrations'
    ],
    premium: [
      'Limited custom development',
      'Advanced features available'
    ],
    enterprise: []
  };

  private readonly featurePlanMapping: { [feature: string]: string } = {
    // Domain features
    customDomain: 'premium',

    // Analytics features
    advancedAnalytics: 'premium',

    // Support features
    prioritySupport: 'premium',
    dedicatedSupport: 'enterprise',

    // Branding features
    customBranding: 'premium',
    whiteLabel: 'enterprise',

    // Web3 features
    certificateWallet: 'premium',
    web3Features: 'premium',

    // Integration features
    shopifyIntegration: 'growth',
    wooCommerceIntegration: 'growth',
    wixIntegration: 'growth',
    advancedIntegrations: 'premium',
    customIntegrations: 'enterprise'
  };

  /**
   * Validate if a plan allows specific update data
   */
  validatePlanPermissions(updateData: any, userPlan: string): PlanValidationResult {
    const restrictedFeatures: string[] = [];

    // Check premium+ only features
    const premiumFeatures = ['customDomain', 'advancedAnalytics', 'prioritySupport', 'certificateWallet'];
    if (!this.isPremiumOrHigher(userPlan)) {
      restrictedFeatures.push(...premiumFeatures.filter(feature => updateData[feature]));
    }

    // Check enterprise only features
    const enterpriseFeatures = ['whiteLabel', 'customBranding', 'dedicatedSupport'];
    if (!this.isEnterprise(userPlan)) {
      restrictedFeatures.push(...enterpriseFeatures.filter(feature => updateData[feature]));
    }

    // Check integration features
    const integrationFeatures = ['shopifyIntegration', 'wooCommerceIntegration', 'wixIntegration'];
    if (!this.isGrowthOrHigher(userPlan)) {
      restrictedFeatures.push(...integrationFeatures.filter(feature => updateData[feature]));
    }

    const requiredPlans = this.getRequiredPlans(restrictedFeatures);

    return {
      valid: restrictedFeatures.length === 0,
      restrictedFeatures,
      requiredPlans,
      message: restrictedFeatures.length > 0
        ? `The following features require a higher plan: ${restrictedFeatures.join(', ')}`
        : undefined
    };
  }

  /**
   * Validate plan-specific features for brand settings
   */
  validatePlanFeatures(updateData: any, plan: string): string[] {
    const restricted: string[] = [];

    // Custom domain requires premium+
    if (updateData.customDomain && !this.isPremiumOrHigher(plan)) {
      restricted.push('Custom domain requires Premium or Enterprise plan');
    }

    // Certificate wallet requires premium+
    if (updateData.certificateWallet && !this.isPremiumOrHigher(plan)) {
      restricted.push('Certificate wallet requires Premium or Enterprise plan');
    }

    // Advanced integrations require growth+
    if (updateData.shopifyIntegration && !this.isGrowthOrHigher(plan)) {
      restricted.push('Shopify integration requires Growth plan or higher');
    }

    if (updateData.wooCommerceIntegration && !this.isGrowthOrHigher(plan)) {
      restricted.push('WooCommerce integration requires Growth plan or higher');
    }

    if (updateData.wixIntegration && !this.isGrowthOrHigher(plan)) {
      restricted.push('Wix integration requires Growth plan or higher');
    }

    return restricted;
  }

  /**
   * Check if a plan allows specific integration types
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
   * Get features available for a specific plan
   */
  getPlanFeatures(plan: string): string[] {
    return this.planFeatures[plan as keyof PlanFeatures] || this.planFeatures.foundation;
  }

  /**
   * Get limitations for a specific plan
   */
  getPlanLimitations(plan: string): string[] {
    return this.planLimitations[plan] || this.planLimitations.foundation;
  }

  /**
   * Get required plans for restricted features
   */
  getRequiredPlans(restrictedFeatures: string[]): string[] {
    const requiredPlans = restrictedFeatures.map(feature =>
      this.featurePlanMapping[feature] || 'premium'
    );

    return [...new Set(requiredPlans)];
  }

  /**
   * Get integration features available for a plan
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

  /**
   * Get available integrations for a plan
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
   * Get Web3 features available for a plan
   */
  getWeb3Features(plan: string): string[] {
    if (this.isPremiumOrHigher(plan)) {
      return ['NFT Minting', 'Token Discounts', 'Smart Contracts', 'Wallet Integration'];
    }
    return [];
  }

  /**
   * Get NFT capabilities for a plan
   */
  getNftCapabilities(plan: string): string[] {
    if (this.isEnterprise(plan)) {
      return ['Custom Contracts', 'Batch Minting', 'Advanced Metadata', 'Royalty Management'];
    }
    if (this.isPremium(plan)) {
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
        return ['Basic Workflows', 'Product Sync', 'Order Management'];
      case 'growth':
        return ['Product Import', 'Basic Sync'];
      default:
        return [];
    }
  }

  /**
   * Get required verification documents for a plan
   */
  getRequiredVerificationDocs(plan: string): string[] {
    const baseDocs = ['businessLicense'];

    if (this.isPremiumOrHigher(plan)) {
      return [...baseDocs, 'taxDocument', 'proofOfAddress'];
    }

    return baseDocs;
  }

  /**
   * Get features that require upgrade from current plan
   */
  getUpgradeRequiredFeatures(plan: string): string[] {
    if (plan === 'foundation') {
      return ['Custom branding', 'Advanced analytics', 'Priority support'];
    }
    if (plan === 'growth') {
      return ['Custom domain', 'White label', 'Dedicated support'];
    }
    if (plan === 'premium') {
      return ['Custom integrations', 'White label'];
    }
    return [];
  }

  /**
   * Check if plan is foundation
   */
  isFoundation(plan: string): boolean {
    return plan === 'foundation';
  }

  /**
   * Check if plan is growth or higher
   */
  isGrowthOrHigher(plan: string): boolean {
    return ['growth', 'premium', 'enterprise'].includes(plan);
  }

  /**
   * Check if plan is premium
   */
  isPremium(plan: string): boolean {
    return plan === 'premium';
  }

  /**
   * Check if plan is premium or higher
   */
  isPremiumOrHigher(plan: string): boolean {
    return ['premium', 'enterprise'].includes(plan);
  }

  /**
   * Check if plan is enterprise
   */
  isEnterprise(plan: string): boolean {
    return plan === 'enterprise';
  }

  /**
   * Validate plan upgrade path
   */
  validateUpgradePath(currentPlan: string, targetPlan: string): {
    valid: boolean;
    message?: string;
    benefits?: string[];
  } {
    const planHierarchy = ['foundation', 'growth', 'premium', 'enterprise'];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    const targetIndex = planHierarchy.indexOf(targetPlan);

    if (currentIndex === -1 || targetIndex === -1) {
      return {
        valid: false,
        message: 'Invalid plan specified'
      };
    }

    if (targetIndex <= currentIndex) {
      return {
        valid: false,
        message: 'Cannot downgrade or select the same plan'
      };
    }

    const newFeatures = this.getPlanFeatures(targetPlan).filter(
      feature => !this.getPlanFeatures(currentPlan).includes(feature)
    );

    return {
      valid: true,
      benefits: newFeatures
    };
  }

  /**
   * Get plan comparison data
   */
  getPlanComparison(): {
    plans: { [plan: string]: { features: string[]; limitations: string[] } }
  } {
    const plans: { [plan: string]: { features: string[]; limitations: string[] } } = {};

    Object.keys(this.planFeatures).forEach(plan => {
      plans[plan] = {
        features: this.getPlanFeatures(plan),
        limitations: this.getPlanLimitations(plan)
      };
    });

    return { plans };
  }

  /**
   * Log plan validation attempt
   */
  private logValidationAttempt(
    businessId: string,
    userPlan: string,
    requestedFeatures: string[],
    result: PlanValidationResult
  ): void {
    logger.info('Plan validation attempt', {
      businessId,
      userPlan,
      requestedFeatures,
      valid: result.valid,
      restrictedFeatures: result.restrictedFeatures,
      requiredPlans: result.requiredPlans
    });
  }

  /**
   * Public method to validate with logging
   */
  validateWithLogging(
    businessId: string,
    updateData: any,
    userPlan: string
  ): PlanValidationResult {
    const result = this.validatePlanPermissions(updateData, userPlan);

    this.logValidationAttempt(
      businessId,
      userPlan,
      Object.keys(updateData),
      result
    );

    return result;
  }
}