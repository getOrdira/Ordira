/**
 * Plan Validation Service
 *
 * Validates subscription plans, tier changes, usage limits,
 * and billing-related operations for manufacturers based on
 * the manufacturer-specific plan definitions
 */

import { MANUFACTURER_PLAN_DEFINITIONS, ManufacturerPlanKey } from '../../../constants/manufacturerPlans';

export interface PlanValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface ManufacturerPlanLimits {
  brandConnections: number;
  supplyChainProducts: number;
  supplyChainEndpoints: number;
  supplyChainEvents: number;
  profileViews: number;
}

export interface ManufacturerPlanFeatures {
  profilePicture: boolean;
  basicProfile: boolean;
  advancedProfile: boolean;
  customBranding: boolean;
  basicVerification: boolean;
  premiumVerification: boolean;
  priorityReview: boolean;
  basicAnalytics: boolean;
  advancedAnalytics: boolean;
  customReports: boolean;
  exportData: boolean;
  basicMessaging: boolean;
  advancedMessaging: boolean;
  videoCalls: boolean;
  fileSharing: boolean;
  basicSearch: boolean;
  advancedSearch: boolean;
  featuredListing: boolean;
  priorityPlacement: boolean;
}

export class PlanValidationService {
  // Valid manufacturer plan tiers
  private readonly VALID_TIERS: ManufacturerPlanKey[] = ['starter', 'professional', 'enterprise', 'unlimited'];

  /**
   * Validate subscription tier
   */
  validateTier(tier: string): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!tier) {
      errors.push('Subscription tier is required');
    } else if (!this.VALID_TIERS.includes(tier as ManufacturerPlanKey)) {
      errors.push(`Invalid subscription tier. Must be one of: ${this.VALID_TIERS.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate tier upgrade
   */
  validateTierUpgrade(currentTier: ManufacturerPlanKey, newTier: ManufacturerPlanKey): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate tier hierarchy
    const tierOrder: ManufacturerPlanKey[] = ['starter', 'professional', 'enterprise', 'unlimited'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const newIndex = tierOrder.indexOf(newTier);

    if (currentIndex === -1) {
      errors.push('Invalid current tier');
    }
    if (newIndex === -1) {
      errors.push('Invalid new tier');
    }

    if (currentIndex >= 0 && newIndex >= 0) {
      if (newIndex <= currentIndex) {
        warnings.push('This is a downgrade, not an upgrade. Use downgrade validation instead.');
      } else {
        suggestions.push(this.getUpgradeRecommendation(currentTier, newTier));
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate tier downgrade
   */
  validateTierDowngrade(
    currentTier: ManufacturerPlanKey,
    newTier: ManufacturerPlanKey,
    currentUsage: Partial<ManufacturerPlanLimits>
  ): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate tier hierarchy
    const tierOrder: ManufacturerPlanKey[] = ['starter', 'professional', 'enterprise', 'unlimited'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const newIndex = tierOrder.indexOf(newTier);

    if (currentIndex === -1) {
      errors.push('Invalid current tier');
    }
    if (newIndex === -1) {
      errors.push('Invalid new tier');
    }

    if (currentIndex >= 0 && newIndex >= 0) {
      if (newIndex >= currentIndex) {
        errors.push('Cannot downgrade to a higher or same tier');
        return { isValid: false, errors, warnings, suggestions };
      }

      // Check if current usage exceeds new tier limits
      const newLimits = MANUFACTURER_PLAN_DEFINITIONS[newTier];

      if (currentUsage.brandConnections !== undefined && newLimits.brandConnections !== Infinity) {
        if (currentUsage.brandConnections > newLimits.brandConnections) {
          errors.push(
            `Current brand connections (${currentUsage.brandConnections}) exceeds ${newTier} tier limit (${newLimits.brandConnections})`
          );
        }
      }

      if (currentUsage.supplyChainProducts !== undefined && newLimits.supplyChainProducts !== Infinity) {
        if (currentUsage.supplyChainProducts > newLimits.supplyChainProducts) {
          errors.push(
            `Current supply chain products (${currentUsage.supplyChainProducts}) exceeds ${newTier} tier limit (${newLimits.supplyChainProducts})`
          );
        }
      }

      if (currentUsage.supplyChainEndpoints !== undefined && newLimits.supplyChainEndpoints !== Infinity) {
        if (currentUsage.supplyChainEndpoints > newLimits.supplyChainEndpoints) {
          errors.push(
            `Current supply chain endpoints (${currentUsage.supplyChainEndpoints}) exceeds ${newTier} tier limit (${newLimits.supplyChainEndpoints}). Please remove endpoints before downgrading.`
          );
        }
      }

      // Check feature loss
      const currentPlan = MANUFACTURER_PLAN_DEFINITIONS[currentTier];
      const newPlan = MANUFACTURER_PLAN_DEFINITIONS[newTier];

      const lostFeatures: string[] = [];
      if (currentPlan.advancedProfile && !newPlan.advancedProfile) lostFeatures.push('Advanced Profile');
      if (currentPlan.customBranding && !newPlan.customBranding) lostFeatures.push('Custom Branding');
      if (currentPlan.premiumVerification && !newPlan.premiumVerification) lostFeatures.push('Premium Verification');
      if (currentPlan.priorityReview && !newPlan.priorityReview) lostFeatures.push('Priority Review');
      if (currentPlan.advancedAnalytics && !newPlan.advancedAnalytics) lostFeatures.push('Advanced Analytics');
      if (currentPlan.customReports && !newPlan.customReports) lostFeatures.push('Custom Reports');
      if (currentPlan.exportData && !newPlan.exportData) lostFeatures.push('Data Export');
      if (currentPlan.advancedMessaging && !newPlan.advancedMessaging) lostFeatures.push('Advanced Messaging');
      if (currentPlan.videoCalls && !newPlan.videoCalls) lostFeatures.push('Video Calls');
      if (currentPlan.fileSharing && !newPlan.fileSharing) lostFeatures.push('File Sharing');
      if (currentPlan.advancedSearch && !newPlan.advancedSearch) lostFeatures.push('Advanced Search');
      if (currentPlan.featuredListing && !newPlan.featuredListing) lostFeatures.push('Featured Listing');
      if (currentPlan.priorityPlacement && !newPlan.priorityPlacement) lostFeatures.push('Priority Placement');

      if (lostFeatures.length > 0) {
        warnings.push(`You will lose access to: ${lostFeatures.join(', ')}`);
      }

      // Check support level downgrade
      if (currentPlan.supportLevel !== newPlan.supportLevel) {
        warnings.push(`Support level will change from ${currentPlan.supportLevel} to ${newPlan.supportLevel}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate usage against plan limits
   */
  validateUsage(tier: ManufacturerPlanKey, usage: Partial<ManufacturerPlanLimits>): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const limits = MANUFACTURER_PLAN_DEFINITIONS[tier];

    // Check brand connections
    if (usage.brandConnections !== undefined) {
      if (limits.brandConnections !== Infinity && usage.brandConnections > limits.brandConnections) {
        errors.push(`Brand connections (${usage.brandConnections}) exceeds plan limit (${limits.brandConnections})`);
        suggestions.push('Consider upgrading to a higher tier for more brand connections');
      } else if (limits.brandConnections !== Infinity && usage.brandConnections > limits.brandConnections * 0.8) {
        warnings.push(`Brand connections usage is at ${Math.round((usage.brandConnections / limits.brandConnections) * 100)}% of limit`);
      }
    }

    // Check supply chain products
    if (usage.supplyChainProducts !== undefined) {
      if (limits.supplyChainProducts !== Infinity && usage.supplyChainProducts > limits.supplyChainProducts) {
        errors.push(`Supply chain products (${usage.supplyChainProducts}) exceeds plan limit (${limits.supplyChainProducts})`);
        suggestions.push('Consider upgrading to a higher tier for more supply chain products');
      } else if (limits.supplyChainProducts !== Infinity && usage.supplyChainProducts > limits.supplyChainProducts * 0.8) {
        warnings.push(`Supply chain products usage is at ${Math.round((usage.supplyChainProducts / limits.supplyChainProducts) * 100)}% of limit`);
      }
    }

    // Check supply chain endpoints
    if (usage.supplyChainEndpoints !== undefined) {
      if (limits.supplyChainEndpoints !== Infinity && usage.supplyChainEndpoints > limits.supplyChainEndpoints) {
        errors.push(`Supply chain endpoints (${usage.supplyChainEndpoints}) exceeds plan limit (${limits.supplyChainEndpoints})`);
        suggestions.push('Consider upgrading to a higher tier for more supply chain endpoints');
      } else if (limits.supplyChainEndpoints !== Infinity && usage.supplyChainEndpoints > limits.supplyChainEndpoints * 0.8) {
        warnings.push(`Supply chain endpoints usage is at ${Math.round((usage.supplyChainEndpoints / limits.supplyChainEndpoints) * 100)}% of limit`);
      }
    }

    // Check supply chain events
    if (usage.supplyChainEvents !== undefined) {
      if (limits.supplyChainEvents !== Infinity && usage.supplyChainEvents > limits.supplyChainEvents) {
        errors.push(`Supply chain events (${usage.supplyChainEvents}) exceeds monthly limit (${limits.supplyChainEvents})`);
        suggestions.push('Consider upgrading to a higher tier for more supply chain events');
      } else if (limits.supplyChainEvents !== Infinity && usage.supplyChainEvents > limits.supplyChainEvents * 0.8) {
        warnings.push(`Supply chain events usage is at ${Math.round((usage.supplyChainEvents / limits.supplyChainEvents) * 100)}% of monthly limit`);
      }
    }

    // Check profile views
    if (usage.profileViews !== undefined) {
      if (limits.profileViews !== Infinity && usage.profileViews > limits.profileViews) {
        warnings.push(`Profile views (${usage.profileViews}) has reached monthly limit (${limits.profileViews})`);
        suggestions.push('Consider upgrading to increase visibility and profile view limits');
      } else if (limits.profileViews !== Infinity && usage.profileViews > limits.profileViews * 0.8) {
        warnings.push(`Profile views usage is at ${Math.round((usage.profileViews / limits.profileViews) * 100)}% of monthly limit`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate rate limits for supply chain events
   */
  validateRateLimits(
    tier: ManufacturerPlanKey,
    currentRates: {
      eventsThisMinute?: number;
      eventsThisHour?: number;
      eventsThisDay?: number;
    }
  ): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const limits = MANUFACTURER_PLAN_DEFINITIONS[tier].supplyChain;

    if (currentRates.eventsThisMinute !== undefined && currentRates.eventsThisMinute > limits.eventsPerMinute) {
      errors.push(`Rate limit exceeded: ${currentRates.eventsThisMinute} events per minute (limit: ${limits.eventsPerMinute})`);
    }

    if (currentRates.eventsThisHour !== undefined && currentRates.eventsThisHour > limits.eventsPerHour) {
      errors.push(`Rate limit exceeded: ${currentRates.eventsThisHour} events per hour (limit: ${limits.eventsPerHour})`);
    }

    if (currentRates.eventsThisDay !== undefined && currentRates.eventsThisDay > limits.eventsPerDay) {
      errors.push(`Rate limit exceeded: ${currentRates.eventsThisDay} events per day (limit: ${limits.eventsPerDay})`);
    }

    // Warning at 80% of limit
    if (currentRates.eventsThisMinute !== undefined && currentRates.eventsThisMinute > limits.eventsPerMinute * 0.8) {
      warnings.push(`Approaching per-minute rate limit (${currentRates.eventsThisMinute}/${limits.eventsPerMinute})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if feature is available in tier
   */
  isFeatureAvailable(tier: ManufacturerPlanKey, feature: keyof ManufacturerPlanFeatures): boolean {
    const plan = MANUFACTURER_PLAN_DEFINITIONS[tier];
    return plan[feature] === true;
  }

  /**
   * Get plan limits for tier
   */
  getPlanLimits(tier: ManufacturerPlanKey): ManufacturerPlanLimits {
    const plan = MANUFACTURER_PLAN_DEFINITIONS[tier];
    return {
      brandConnections: plan.brandConnections,
      supplyChainProducts: plan.supplyChainProducts,
      supplyChainEndpoints: plan.supplyChainEndpoints,
      supplyChainEvents: plan.supplyChainEvents,
      profileViews: plan.profileViews
    };
  }

  /**
   * Get plan features for tier
   */
  getPlanFeatures(tier: ManufacturerPlanKey): Partial<ManufacturerPlanFeatures> {
    const plan = MANUFACTURER_PLAN_DEFINITIONS[tier];
    return {
      profilePicture: plan.profilePicture,
      basicProfile: plan.basicProfile,
      advancedProfile: plan.advancedProfile,
      customBranding: plan.customBranding,
      basicVerification: plan.basicVerification,
      premiumVerification: plan.premiumVerification,
      priorityReview: plan.priorityReview,
      basicAnalytics: plan.basicAnalytics,
      advancedAnalytics: plan.advancedAnalytics,
      customReports: plan.customReports,
      exportData: plan.exportData,
      basicMessaging: plan.basicMessaging,
      advancedMessaging: plan.advancedMessaging,
      videoCalls: plan.videoCalls,
      fileSharing: plan.fileSharing,
      basicSearch: plan.basicSearch,
      advancedSearch: plan.advancedSearch,
      featuredListing: plan.featuredListing,
      priorityPlacement: plan.priorityPlacement
    };
  }

  /**
   * Get recommended tier based on usage
   */
  getRecommendedTier(usage: Partial<ManufacturerPlanLimits>): ManufacturerPlanKey {
    const tiers: ManufacturerPlanKey[] = ['starter', 'professional', 'enterprise', 'unlimited'];

    for (const tier of tiers) {
      const limits = MANUFACTURER_PLAN_DEFINITIONS[tier];

      // Check if tier can accommodate usage
      const canAccommodate =
        (limits.brandConnections === Infinity || !usage.brandConnections || usage.brandConnections <= limits.brandConnections) &&
        (limits.supplyChainProducts === Infinity || !usage.supplyChainProducts || usage.supplyChainProducts <= limits.supplyChainProducts) &&
        (limits.supplyChainEndpoints === Infinity || !usage.supplyChainEndpoints || usage.supplyChainEndpoints <= limits.supplyChainEndpoints) &&
        (limits.supplyChainEvents === Infinity || !usage.supplyChainEvents || usage.supplyChainEvents <= limits.supplyChainEvents) &&
        (limits.profileViews === Infinity || !usage.profileViews || usage.profileViews <= limits.profileViews);

      if (canAccommodate) {
        return tier;
      }
    }

    return 'unlimited';
  }

  /**
   * Calculate usage percentage
   */
  calculateUsagePercentage(tier: ManufacturerPlanKey, usage: Partial<ManufacturerPlanLimits>): Record<string, number> {
    const limits = MANUFACTURER_PLAN_DEFINITIONS[tier];
    const percentages: Record<string, number> = {};

    if (usage.brandConnections !== undefined && limits.brandConnections !== Infinity) {
      percentages.brandConnections = Math.round((usage.brandConnections / limits.brandConnections) * 100);
    }

    if (usage.supplyChainProducts !== undefined && limits.supplyChainProducts !== Infinity) {
      percentages.supplyChainProducts = Math.round((usage.supplyChainProducts / limits.supplyChainProducts) * 100);
    }

    if (usage.supplyChainEndpoints !== undefined && limits.supplyChainEndpoints !== Infinity) {
      percentages.supplyChainEndpoints = Math.round((usage.supplyChainEndpoints / limits.supplyChainEndpoints) * 100);
    }

    if (usage.supplyChainEvents !== undefined && limits.supplyChainEvents !== Infinity) {
      percentages.supplyChainEvents = Math.round((usage.supplyChainEvents / limits.supplyChainEvents) * 100);
    }

    if (usage.profileViews !== undefined && limits.profileViews !== Infinity) {
      percentages.profileViews = Math.round((usage.profileViews / limits.profileViews) * 100);
    }

    return percentages;
  }

  /**
   * Validate API key creation
   */
  validateApiKeyCreation(tier: ManufacturerPlanKey, currentApiKeys: number): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const maxApiKeys = MANUFACTURER_PLAN_DEFINITIONS[tier].features.maxApiKeys;

    if (maxApiKeys !== Infinity && currentApiKeys >= maxApiKeys) {
      errors.push(`API key limit reached. Current plan allows ${maxApiKeys} API key(s).`);
      suggestions.push('Upgrade to a higher tier to create more API keys');
    } else if (maxApiKeys !== Infinity && currentApiKeys >= maxApiKeys * 0.8) {
      warnings.push(`Approaching API key limit (${currentApiKeys}/${maxApiKeys})`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Private helper methods
   */

  private getUpgradeRecommendation(currentTier: ManufacturerPlanKey, newTier: ManufacturerPlanKey): string {
    const newPlan = MANUFACTURER_PLAN_DEFINITIONS[newTier];
    const currentPlan = MANUFACTURER_PLAN_DEFINITIONS[currentTier];

    const gainedFeatures: string[] = [];
    if (!currentPlan.advancedProfile && newPlan.advancedProfile) gainedFeatures.push('Advanced Profile');
    if (!currentPlan.customBranding && newPlan.customBranding) gainedFeatures.push('Custom Branding');
    if (!currentPlan.premiumVerification && newPlan.premiumVerification) gainedFeatures.push('Premium Verification');
    if (!currentPlan.priorityReview && newPlan.priorityReview) gainedFeatures.push('Priority Review');
    if (!currentPlan.advancedAnalytics && newPlan.advancedAnalytics) gainedFeatures.push('Advanced Analytics');
    if (!currentPlan.customReports && newPlan.customReports) gainedFeatures.push('Custom Reports');
    if (!currentPlan.videoCalls && newPlan.videoCalls) gainedFeatures.push('Video Calls');
    if (!currentPlan.featuredListing && newPlan.featuredListing) gainedFeatures.push('Featured Listing');
    if (!currentPlan.priorityPlacement && newPlan.priorityPlacement) gainedFeatures.push('Priority Placement');

    if (gainedFeatures.length > 0) {
      return `Upgrading to ${newTier} will give you access to: ${gainedFeatures.join(', ')}`;
    }

    return `Upgrading to ${newTier} will provide higher usage limits and better support`;
  }
}

export const planValidationService = new PlanValidationService();
