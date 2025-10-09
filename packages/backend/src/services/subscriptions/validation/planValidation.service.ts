import {
  BrandPlanKey,
  SubscriptionDocument,
  TierComparison
} from '../utils/types';
import {
  BRAND_PLAN_ORDER,
  getBrandUsageLimits,
  isBrandPlan
} from '../utils/planCatalog';

export interface TierValidationResult {
  allowed: boolean;
  reasons?: string[];
}

export class SubscriptionPlanValidationService {
  /**
   * Validate whether a subscription can move to the supplied tier.
   * Downgrades ensure current usage fits within the target tier limits.
   */
  validateTierChange(
    subscription: SubscriptionDocument,
    targetTier: string
  ): TierValidationResult {
    if (!isBrandPlan(targetTier)) {
      return {
        allowed: false,
        reasons: [`Unknown subscription tier: ${targetTier}`]
      };
    }

    const currentTier = subscription.tier as BrandPlanKey;
    if (currentTier === targetTier) {
      return { allowed: true };
    }

    const currentIndex = BRAND_PLAN_ORDER.indexOf(currentTier);
    const targetIndex = BRAND_PLAN_ORDER.indexOf(targetTier);

    if (targetIndex === -1) {
      return {
        allowed: false,
        reasons: [`Tier ${targetTier} is not part of the managed brand plan catalogue.`]
      };
    }

    // Upgrades are always allowed from a usage perspective.
    if (targetIndex > currentIndex) {
      return { allowed: true };
    }

    const targetLimits = getBrandUsageLimits(targetTier);
    const reasons: string[] = [];

    if (targetLimits.votes !== -1 && subscription.currentVoteUsage > targetLimits.votes) {
      reasons.push(
        `Current vote usage (${subscription.currentVoteUsage}) exceeds ${targetTier} limit (${targetLimits.votes}).`
      );
    }

    if (targetLimits.nfts !== -1 && subscription.currentNftUsage > targetLimits.nfts) {
      reasons.push(
        `Current NFT usage (${subscription.currentNftUsage}) exceeds ${targetTier} limit (${targetLimits.nfts}).`
      );
    }

    if (targetLimits.api !== -1 && subscription.currentApiUsage > targetLimits.api) {
      reasons.push(
        `Current API usage (${subscription.currentApiUsage}) exceeds ${targetTier} limit (${targetLimits.api}).`
      );
    }

    return {
      allowed: reasons.length === 0,
      reasons: reasons.length ? reasons : undefined
    };
  }

  /**
   * Generate an overview of upgrade/downgrade options for UI decisions.
   */
  getTierComparison(currentTier: BrandPlanKey): TierComparison {
    const index = BRAND_PLAN_ORDER.indexOf(currentTier);
    const upgradeOptions = BRAND_PLAN_ORDER.slice(index + 1);
    const downgradeOptions = index === -1 ? [] : BRAND_PLAN_ORDER.slice(0, index);

    return {
      current: currentTier,
      canUpgrade: index < BRAND_PLAN_ORDER.length - 1,
      canDowngrade: index > 0,
      nextTier: index < BRAND_PLAN_ORDER.length - 1 ? BRAND_PLAN_ORDER[index + 1] : null,
      previousTier: index > 0 ? BRAND_PLAN_ORDER[index - 1] : null,
      upgradeOptions,
      downgradeOptions: downgradeOptions.reverse() // Show closest downgrade first
    };
  }
}

export const subscriptionPlanValidationService = new SubscriptionPlanValidationService();
