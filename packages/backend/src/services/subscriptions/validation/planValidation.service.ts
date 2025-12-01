import {
  BrandPlanKey,
  ManufacturerPlanKey,
  SubscriptionDocument,
  TierComparison
} from '../utils/types';
import {
  BRAND_PLAN_ORDER,
  MANUFACTURER_PLAN_ORDER,
  getBrandUsageLimits,
  getManufacturerUsageLimits,
  isBrandPlan,
  isManufacturerPlan,
  listManufacturerPlans
} from '../utils/planCatalog';

export interface TierValidationResult {
  allowed: boolean;
  reasons?: string[];
}

export class SubscriptionPlanValidationService {
  /**
   * Validate whether a subscription can move to the supplied tier.
   * Downgrades ensure current usage fits within the target tier limits.
   * Supports both brand and manufacturer plans.
   */
  validateTierChange(
    subscription: SubscriptionDocument,
    targetTier: string
  ): TierValidationResult {
    const planType = subscription.planType || (isBrandPlan(subscription.tier) ? 'brand' : 'manufacturer');
    
    // Validate tier matches plan type
    if (planType === 'brand' && !isBrandPlan(targetTier)) {
      return {
        allowed: false,
        reasons: [`Tier ${targetTier} is not a valid brand plan tier.`]
      };
    }
    
    if (planType === 'manufacturer' && !isManufacturerPlan(targetTier)) {
      return {
        allowed: false,
        reasons: [`Tier ${targetTier} is not a valid manufacturer plan tier.`]
      };
    }

    const currentTier = subscription.tier;
    if (currentTier === targetTier) {
      return { allowed: true };
    }

    // Get plan order based on plan type
    let currentIndex: number;
    let targetIndex: number;
    let planOrder: string[];
    
    if (planType === 'brand') {
      planOrder = BRAND_PLAN_ORDER;
      currentIndex = planOrder.indexOf(currentTier);
      targetIndex = planOrder.indexOf(targetTier);
    } else {
      planOrder = listManufacturerPlans();
      currentIndex = planOrder.indexOf(currentTier);
      targetIndex = planOrder.indexOf(targetTier);
    }

    if (targetIndex === -1) {
      return {
        allowed: false,
        reasons: [`Tier ${targetTier} is not part of the managed ${planType} plan catalogue.`]
      };
    }

    // Upgrades are always allowed from a usage perspective.
    if (targetIndex > currentIndex) {
      return { allowed: true };
    }

    // For downgrades, check usage limits
    const targetLimits = planType === 'brand' 
      ? getBrandUsageLimits(targetTier as BrandPlanKey)
      : getManufacturerUsageLimits(targetTier as ManufacturerPlanKey);
    
    const reasons: string[] = [];

    if (targetLimits.votes !== -1 && subscription.currentVoteUsage > targetLimits.votes) {
      const limitName = planType === 'brand' ? 'vote' : 'connection';
      reasons.push(
        `Current ${limitName} usage (${subscription.currentVoteUsage}) exceeds ${targetTier} limit (${targetLimits.votes}).`
      );
    }

    if (targetLimits.nfts !== -1 && subscription.currentNftUsage > targetLimits.nfts) {
      const limitName = planType === 'brand' ? 'NFT' : 'product';
      reasons.push(
        `Current ${limitName} usage (${subscription.currentNftUsage}) exceeds ${targetTier} limit (${targetLimits.nfts}).`
      );
    }

    if (targetLimits.api !== -1 && subscription.currentApiUsage > targetLimits.api) {
      const limitName = planType === 'brand' ? 'API' : 'endpoint';
      reasons.push(
        `Current ${limitName} usage (${subscription.currentApiUsage}) exceeds ${targetTier} limit (${targetLimits.api}).`
      );
    }

    return {
      allowed: reasons.length === 0,
      reasons: reasons.length ? reasons : undefined
    };
  }

  /**
   * Generate an overview of upgrade/downgrade options for UI decisions.
   * Supports both brand and manufacturer plan types.
   *
   * @param currentTier - The current tier
   * @param planType - The plan type (defaults to 'brand' for backward compatibility)
   */
  getTierComparison(
    currentTier: BrandPlanKey | ManufacturerPlanKey,
    planType: 'brand' | 'manufacturer' = 'brand'
  ): TierComparison {
    const planOrder = planType === 'brand' ? BRAND_PLAN_ORDER : MANUFACTURER_PLAN_ORDER;
    const index = planOrder.indexOf(currentTier as any);
    const upgradeOptions = index !== -1 ? planOrder.slice(index + 1) : [];
    const downgradeOptions = index === -1 ? [] : planOrder.slice(0, index);

    return {
      current: currentTier,
      canUpgrade: index !== -1 && index < planOrder.length - 1,
      canDowngrade: index > 0,
      nextTier: index !== -1 && index < planOrder.length - 1 ? planOrder[index + 1] : null,
      previousTier: index > 0 ? planOrder[index - 1] : null,
      upgradeOptions,
      downgradeOptions: downgradeOptions.reverse() // Show closest downgrade first
    };
  }
}

export const subscriptionPlanValidationService = new SubscriptionPlanValidationService();
