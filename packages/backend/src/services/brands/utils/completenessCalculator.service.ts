// src/services/brands/utils/completenessCalculator.service.ts

import { logger } from '../../../utils/logger';

export interface CompletenessConfig {
  requiredFields: string[];
  optionalFields: string[];
  premiumFields?: string[];
  enterpriseFields?: string[];
  bonusFields?: string[];
  weights?: {
    required: number;
    optional: number;
    premium: number;
    enterprise: number;
    bonus: number;
  };
}

export interface CompletenessResult {
  score: number;
  percentage: number;
  breakdown: {
    required: {
      completed: number;
      total: number;
      score: number;
      missing: string[];
    };
    optional: {
      completed: number;
      total: number;
      score: number;
      missing: string[];
    };
    premium?: {
      completed: number;
      total: number;
      score: number;
      missing: string[];
    };
    enterprise?: {
      completed: number;
      total: number;
      score: number;
      missing: string[];
    };
    bonus?: {
      completed: number;
      total: number;
      score: number;
      available: string[];
    };
  };
  recommendations: string[];
  nextSteps: string[];
}

/**
 * Comprehensive completeness calculation service
 * Extracted from brandProfile, brandSettings, and brandAccount services
 */
export class CompletenessCalculatorService {

  // ===== Profile Completeness Configurations =====

  /**
   * Get business profile completeness configuration
   */
  getBusinessProfileConfig(plan: string = 'foundation'): CompletenessConfig {
    const config: CompletenessConfig = {
      requiredFields: [
        'businessName',
        'email',
        'industry',
        'description',
        'contactEmail'
      ],
      optionalFields: [
        'profilePictureUrl',
        'socialUrls',
        'headquarters',
        'businessInformation',
        'certifications',
        'website',
        'phoneNumber'
      ],
      weights: {
        required: 70,
        optional: 25,
        premium: 3,
        enterprise: 2,
        bonus: 5
      }
    };

    // Add plan-specific fields
    if (['premium', 'enterprise'].includes(plan)) {
      config.premiumFields = ['walletAddress', 'certificateWallet', 'customDomain'];
    }

    if (plan === 'enterprise') {
      config.enterpriseFields = ['apiKeySettings', 'whitelabelConfig', 'dedicatedSupport'];
    }

    // Bonus fields that give extra points
    config.bonusFields = [
      'verifiedBusinessDocuments',
      'partnershipCount',
      'certificatesIssued',
      'communityEngagement'
    ];

    return config;
  }

  /**
   * Get brand settings completeness configuration
   */
  getBrandSettingsConfig(plan: string = 'foundation'): CompletenessConfig {
    const config: CompletenessConfig = {
      requiredFields: [
        'themeColor',
        'logoUrl'
      ],
      optionalFields: [
        'bannerImages',
        'customCss',
        'subdomain',
        'socialMediaLinks',
        'brandGuidelines'
      ],
      weights: {
        required: 60,
        optional: 30,
        premium: 8,
        enterprise: 2,
        bonus: 5
      }
    };

    // Add plan-specific fields
    if (['premium', 'enterprise'].includes(plan)) {
      config.premiumFields = ['customDomain', 'certificateWallet', 'advancedBranding'];
    }

    if (plan === 'enterprise') {
      config.enterpriseFields = ['whiteLabel', 'customBranding', 'dedicatedSupport'];
    }

    // Bonus fields
    config.bonusFields = [
      'sslCertificate',
      'domainVerification',
      'brandConsistencyScore',
      'designQualityScore'
    ];

    return config;
  }

  /**
   * Get integration completeness configuration
   */
  getIntegrationConfig(plan: string = 'foundation'): CompletenessConfig {
    const config: CompletenessConfig = {
      requiredFields: [],
      optionalFields: [
        'webhookEndpoints',
        'apiDocumentation'
      ],
      weights: {
        required: 0,
        optional: 40,
        premium: 40,
        enterprise: 15,
        bonus: 5
      }
    };

    // Add plan-specific integrations
    if (['growth', 'premium', 'enterprise'].includes(plan)) {
      config.premiumFields = [
        'shopifyIntegration',
        'woocommerceIntegration',
        'wixIntegration',
        'zapierIntegration'
      ];
    }

    if (plan === 'enterprise') {
      config.enterpriseFields = [
        'customApiIntegrations',
        'slackIntegration',
        'enterpriseWebhooks'
      ];
    }

    config.bonusFields = [
      'automationWorkflows',
      'realTimeSyncEnabled',
      'advancedWebhooks'
    ];

    return config;
  }

  // ===== Core Completeness Calculation =====

  /**
   * Calculate completeness score with detailed breakdown
   */
  calculateCompleteness(
    data: any,
    config: CompletenessConfig,
    plan: string = 'foundation'
  ): CompletenessResult {
    try {
      const weights = config.weights || {
        required: 70,
        optional: 25,
        premium: 3,
        enterprise: 1,
        bonus: 1
      };

      // Calculate required fields
      const requiredResult = this.calculateFieldGroup(
        data,
        config.requiredFields,
        'required'
      );

      // Calculate optional fields
      const optionalResult = this.calculateFieldGroup(
        data,
        config.optionalFields,
        'optional'
      );

      const breakdown: CompletenessResult['breakdown'] = {
        required: requiredResult,
        optional: optionalResult
      };

      let totalScore = 0;
      let totalWeight = weights.required + weights.optional;

      // Add required and optional scores
      totalScore += (requiredResult.completed / requiredResult.total) * weights.required;
      totalScore += (optionalResult.completed / optionalResult.total) * weights.optional;

      // Calculate premium fields if applicable
      if (config.premiumFields && ['premium', 'enterprise'].includes(plan)) {
        const premiumResult = this.calculateFieldGroup(
          data,
          config.premiumFields,
          'premium'
        );
        breakdown.premium = premiumResult;
        totalScore += (premiumResult.completed / premiumResult.total) * weights.premium;
        totalWeight += weights.premium;
      }

      // Calculate enterprise fields if applicable
      if (config.enterpriseFields && plan === 'enterprise') {
        const enterpriseResult = this.calculateFieldGroup(
          data,
          config.enterpriseFields,
          'enterprise'
        );
        breakdown.enterprise = enterpriseResult;
        totalScore += (enterpriseResult.completed / enterpriseResult.total) * weights.enterprise;
        totalWeight += weights.enterprise;
      }

      // Calculate bonus fields
      if (config.bonusFields) {
        const bonusResult = this.calculateBonusFields(data, config.bonusFields);
        breakdown.bonus = bonusResult;
        // Bonus points are additive but capped
        const bonusScore = Math.min(
          (bonusResult.completed / bonusResult.total) * weights.bonus,
          weights.bonus
        );
        totalScore += bonusScore;
        totalWeight += weights.bonus;
      }

      // Normalize to 100
      const percentage = Math.round((totalScore / totalWeight) * 100);
      const finalScore = Math.min(percentage, 100);

      // Generate recommendations and next steps
      const recommendations = this.generateRecommendations(breakdown, plan);
      const nextSteps = this.generateNextSteps(breakdown, plan);

      return {
        score: finalScore,
        percentage: finalScore,
        breakdown,
        recommendations,
        nextSteps
      };
    } catch (error) {
      logger.error('Error calculating completeness:', error);
      return this.getDefaultCompletenessResult();
    }
  }

  /**
   * Calculate completeness for a specific field group
   */
  private calculateFieldGroup(
    data: any,
    fields: string[],
    groupType: string
  ): {
    completed: number;
    total: number;
    score: number;
    missing: string[];
  } {
    if (!fields || fields.length === 0) {
      return {
        completed: 0,
        total: 0,
        score: 0,
        missing: []
      };
    }

    const missing: string[] = [];
    let completed = 0;

    fields.forEach(field => {
      if (this.isFieldCompleted(data, field)) {
        completed++;
      } else {
        missing.push(field);
      }
    });

    const score = fields.length > 0 ? (completed / fields.length) * 100 : 0;

    return {
      completed,
      total: fields.length,
      score: Math.round(score),
      missing
    };
  }

  /**
   * Calculate bonus fields (special handling for bonus scoring)
   */
  private calculateBonusFields(
    data: any,
    bonusFields: string[]
  ): {
    completed: number;
    total: number;
    score: number;
    available: string[];
  } {
    if (!bonusFields || bonusFields.length === 0) {
      return {
        completed: 0,
        total: 0,
        score: 0,
        available: []
      };
    }

    const available: string[] = [];
    let completed = 0;

    bonusFields.forEach(field => {
      available.push(field);
      if (this.isFieldCompleted(data, field)) {
        completed++;
      }
    });

    const score = bonusFields.length > 0 ? (completed / bonusFields.length) * 100 : 0;

    return {
      completed,
      total: bonusFields.length,
      score: Math.round(score),
      available
    };
  }

  /**
   * Check if a field is completed
   */
  private isFieldCompleted(data: any, field: string): boolean {
    const value = this.getNestedValue(data, field);

    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim() !== '';
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }

    if (typeof value === 'boolean') {
      return value === true;
    }

    if (typeof value === 'number') {
      return value > 0;
    }

    return true;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // ===== Specialized Completeness Calculators =====

  /**
   * Calculate business profile completeness
   */
  calculateBusinessProfileCompleteness(profile: any, plan: string = 'foundation'): CompletenessResult {
    const config = this.getBusinessProfileConfig(plan);
    return this.calculateCompleteness(profile, config, plan);
  }

  /**
   * Calculate brand settings completeness
   */
  calculateBrandSettingsCompleteness(settings: any, plan: string = 'foundation'): CompletenessResult {
    const config = this.getBrandSettingsConfig(plan);
    return this.calculateCompleteness(settings, config, plan);
  }

  /**
   * Calculate integration completeness
   */
  calculateIntegrationCompleteness(integrations: any, plan: string = 'foundation'): CompletenessResult {
    const config = this.getIntegrationConfig(plan);
    return this.calculateCompleteness(integrations, config, plan);
  }

  /**
   * Calculate overall account completeness (combines all areas)
   */
  calculateOverallCompleteness(
    profile: any,
    settings: any,
    integrations: any,
    plan: string = 'foundation'
  ): CompletenessResult {
    try {
      const profileResult = this.calculateBusinessProfileCompleteness(profile, plan);
      const settingsResult = this.calculateBrandSettingsCompleteness(settings, plan);
      const integrationsResult = this.calculateIntegrationCompleteness(integrations, plan);

      // Weight the different areas
      const weights = {
        profile: 50,  // Most important
        settings: 35, // Important for branding
        integrations: 15  // Nice to have
      };

      const totalWeight = weights.profile + weights.settings + weights.integrations;
      const weightedScore = (
        (profileResult.score * weights.profile) +
        (settingsResult.score * weights.settings) +
        (integrationsResult.score * weights.integrations)
      ) / totalWeight;

      // Combine recommendations
      const allRecommendations = [
        ...profileResult.recommendations,
        ...settingsResult.recommendations,
        ...integrationsResult.recommendations
      ].slice(0, 10); // Limit to top 10

      // Combine next steps
      const allNextSteps = [
        ...profileResult.nextSteps,
        ...settingsResult.nextSteps,
        ...integrationsResult.nextSteps
      ].slice(0, 8); // Limit to top 8

      return {
        score: Math.round(weightedScore),
        percentage: Math.round(weightedScore),
        breakdown: {
          required: {
            completed: profileResult.breakdown.required.completed + settingsResult.breakdown.required.completed,
            total: profileResult.breakdown.required.total + settingsResult.breakdown.required.total,
            score: Math.round((profileResult.breakdown.required.score + settingsResult.breakdown.required.score) / 2),
            missing: [...profileResult.breakdown.required.missing, ...settingsResult.breakdown.required.missing]
          },
          optional: {
            completed: profileResult.breakdown.optional.completed + settingsResult.breakdown.optional.completed,
            total: profileResult.breakdown.optional.total + settingsResult.breakdown.optional.total,
            score: Math.round((profileResult.breakdown.optional.score + settingsResult.breakdown.optional.score) / 2),
            missing: [...profileResult.breakdown.optional.missing, ...settingsResult.breakdown.optional.missing]
          }
        },
        recommendations: allRecommendations,
        nextSteps: allNextSteps
      };
    } catch (error) {
      logger.error('Error calculating overall completeness:', error);
      return this.getDefaultCompletenessResult();
    }
  }

  // ===== Recommendation Generation =====

  /**
   * Generate recommendations based on completeness breakdown
   */
  private generateRecommendations(
    breakdown: CompletenessResult['breakdown'],
    plan: string
  ): string[] {
    const recommendations: string[] = [];

    // Required field recommendations
    if (breakdown.required.missing.length > 0) {
      recommendations.push(`Complete ${breakdown.required.missing.length} required fields to boost your profile`);

      // Prioritize the most important missing fields
      const priorityFields = ['businessName', 'email', 'industry', 'description', 'themeColor', 'logoUrl'];
      const missingPriority = breakdown.required.missing.filter(field => priorityFields.includes(field));

      if (missingPriority.length > 0) {
        recommendations.push(`Priority: Add ${missingPriority.slice(0, 3).join(', ')}`);
      }
    }

    // Optional field recommendations
    if (breakdown.optional.missing.length > 0 && breakdown.required.missing.length === 0) {
      recommendations.push(`Add ${Math.min(3, breakdown.optional.missing.length)} optional fields to enhance your profile`);
    }

    // Premium recommendations
    if (breakdown.premium && breakdown.premium.missing.length > 0 && ['premium', 'enterprise'].includes(plan)) {
      recommendations.push(`Utilize premium features: ${breakdown.premium.missing.slice(0, 2).join(', ')}`);
    }

    // Enterprise recommendations
    if (breakdown.enterprise && breakdown.enterprise.missing.length > 0 && plan === 'enterprise') {
      recommendations.push(`Configure enterprise features: ${breakdown.enterprise.missing.slice(0, 2).join(', ')}`);
    }

    // General recommendations based on score
    const totalScore = breakdown.required.score;
    if (totalScore < 50) {
      recommendations.push('Focus on completing basic profile information first');
    } else if (totalScore < 80) {
      recommendations.push('Add optional information to improve discoverability');
    } else {
      recommendations.push('Great profile! Consider exploring advanced features');
    }

    return recommendations.slice(0, 6); // Limit to 6 recommendations
  }

  /**
   * Generate next steps based on completeness
   */
  private generateNextSteps(
    breakdown: CompletenessResult['breakdown'],
    plan: string
  ): string[] {
    const nextSteps: string[] = [];

    // Immediate actions for required fields
    if (breakdown.required.missing.length > 0) {
      breakdown.required.missing.slice(0, 3).forEach(field => {
        nextSteps.push(this.getFieldActionText(field));
      });
    }

    // Next actions for optional fields
    if (breakdown.required.missing.length === 0 && breakdown.optional.missing.length > 0) {
      breakdown.optional.missing.slice(0, 2).forEach(field => {
        nextSteps.push(this.getFieldActionText(field));
      });
    }

    // Plan-specific next steps
    if (['premium', 'enterprise'].includes(plan) && breakdown.premium) {
      if (breakdown.premium.missing.length > 0) {
        nextSteps.push(`Set up ${breakdown.premium.missing[0]} to unlock premium features`);
      }
    }

    // Default next steps if completeness is high
    if (breakdown.required.missing.length === 0 && breakdown.optional.missing.length <= 2) {
      nextSteps.push('Explore integration options to connect your tools');
      nextSteps.push('Review and update your brand settings');
      nextSteps.push('Consider upgrading your plan for more features');
    }

    return nextSteps.slice(0, 5); // Limit to 5 next steps
  }

  /**
   * Get user-friendly action text for a field
   */
  private getFieldActionText(field: string): string {
    const actionMap: { [key: string]: string } = {
      businessName: 'Add your business name',
      email: 'Verify your email address',
      industry: 'Select your industry',
      description: 'Write a compelling business description',
      contactEmail: 'Add a contact email',
      profilePictureUrl: 'Upload a professional profile picture',
      logoUrl: 'Upload your company logo',
      themeColor: 'Choose your brand theme color',
      bannerImages: 'Add banner images to showcase your brand',
      customCss: 'Customize your brand styling',
      subdomain: 'Set up a custom subdomain',
      customDomain: 'Configure a custom domain',
      certificateWallet: 'Connect your Web3 wallet',
      socialUrls: 'Add your social media links',
      certifications: 'Upload business certifications',
      website: 'Add your website URL',
      headquarters: 'Add your business location'
    };

    return actionMap[field] || `Complete ${field}`;
  }

  /**
   * Get default completeness result for error cases
   */
  private getDefaultCompletenessResult(): CompletenessResult {
    return {
      score: 0,
      percentage: 0,
      breakdown: {
        required: {
          completed: 0,
          total: 0,
          score: 0,
          missing: []
        },
        optional: {
          completed: 0,
          total: 0,
          score: 0,
          missing: []
        }
      },
      recommendations: ['Please try again or contact support'],
      nextSteps: ['Check your data and retry']
    };
  }

  // ===== Legacy Support Methods =====

  /**
   * Simple profile completeness calculation (legacy support)
   */
  calculateSimpleProfileCompleteness(profile: any): number {
    const result = this.calculateBusinessProfileCompleteness(profile, 'foundation');
    return result.score;
  }

  /**
   * Simple setup completeness calculation (legacy support)
   */
  calculateSimpleSetupCompleteness(settings: any): number {
    const result = this.calculateBrandSettingsCompleteness(settings, 'foundation');
    return result.score;
  }
}

export const completenessCalculatorService = new CompletenessCalculatorService();