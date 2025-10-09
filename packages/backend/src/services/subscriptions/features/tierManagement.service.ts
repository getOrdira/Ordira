import { subscriptionPlanValidationService } from '../validation/planValidation.service';
import {
  BrandPlanKey,
  SubscriptionSummary,
  TierChangeAnalysis,
  TierComparison
} from '../utils/types';
import {
  BRAND_PLAN_ORDER,
  getBrandPlanDefinition,
  getBrandFeatureFlags,
  isBrandPlan
} from '../utils/planCatalog';

interface SubscriptionChangePayload {
  tier?: string;
  billingCycle?: 'monthly' | 'yearly';
  status?: 'active' | 'inactive' | 'past_due' | 'canceled' | 'paused';
}

export class SubscriptionTierManagementService {
  /**
   * Provide high-level metadata for available subscription tiers.
   */
  getAvailableTiers() {
    return BRAND_PLAN_ORDER.map((tier) => {
      const definition = getBrandPlanDefinition(tier);
      return {
        id: tier,
        name: this.capitalize(tier),
        price: definition.price,
        stripePriceId: definition.stripePriceId,
        features: definition.features
      };
    });
  }

  /**
   * Generate a human-friendly feature list for UI presentation.
   */
  getTierFeatures(tier: string): string[] {
    if (!isBrandPlan(tier)) {
      return [];
    }

    const brandTier = tier as BrandPlanKey;
    const definition = getBrandPlanDefinition(brandTier);
    const featureFlags = getBrandFeatureFlags(brandTier);
    const features: string[] = ['Analytics dashboard access', 'API access'];

    if (featureFlags.customBranding) {
      features.push('Custom branding');
    }

    if (definition.features.allowOverage) {
      features.push('Optional overage billing');
    }

    if (definition.features.hasWeb3) {
      features.push('Web3 integrations enabled');
    }

    features.push(`Support level: ${definition.features.supportLevel}`);
    features.push(`Max API keys: ${definition.features.maxApiKeys === Infinity ? 'Unlimited' : definition.features.maxApiKeys}`);

    return features;
  }

  /**
   * Provide contextual onboarding steps tailored by tier complexity.
   */
  generateOnboardingSteps(tier: string): string[] {
    const steps = [
      'Complete profile setup',
      'Upload your first product',
      'Explore analytics dashboard'
    ];

    if (tier === 'enterprise') {
      steps.push('Schedule onboarding call', 'Configure custom features');
    }

    return steps;
  }

  /**
   * Evaluate upgrade/downgrade options for current tier.
   */
  generateTierComparison(currentTier: string): TierComparison {
    if (!isBrandPlan(currentTier)) {
      return {
        current: currentTier,
        canUpgrade: false,
        canDowngrade: false,
        nextTier: null,
        previousTier: null,
        upgradeOptions: [],
        downgradeOptions: []
      };
    }

    return subscriptionPlanValidationService.getTierComparison(
      currentTier as BrandPlanKey
    );
  }

  /**
   * Summarise the impact of requested subscription changes.
   */
  analyzeSubscriptionChanges(
    current: SubscriptionSummary,
    changes: SubscriptionChangePayload
  ): TierChangeAnalysis {
    const analysis: TierChangeAnalysis = {
      tierChange: Boolean(changes.tier && changes.tier !== current.tier),
      billingChange: Boolean(changes.billingCycle && changes.billingCycle !== current.billing.billingCycle),
      statusChange: Boolean(changes.status && changes.status !== current.status),
      immediate: [],
      billing: [],
      additionalSteps: []
    };

    if (analysis.tierChange) {
      analysis.immediate.push(`Tier change from ${current.tier} to ${changes.tier}`);
      analysis.billing.push('New tier pricing applies from next billing cycle.');
      analysis.additionalSteps.push('Review updated usage limits and feature access.');
    }

    if (analysis.billingChange) {
      analysis.billing.push(`Billing cycle updated to ${changes.billingCycle}.`);
    }

    if (analysis.statusChange) {
      analysis.immediate.push(`Subscription status changing to ${changes.status}.`);
    }

    return analysis;
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}

export const subscriptionTierManagementService = new SubscriptionTierManagementService();
