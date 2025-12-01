// src/services/collaboration/validation/featureAccess.service.ts

import { PLAN_DEFINITIONS, PlanKey } from '../../../constants/plans';
import { MANUFACTURER_PLAN_DEFINITIONS, ManufacturerPlanKey } from '../../../constants/manufacturerPlans';
import { CollaborationFeatureKey, IFeatureAccessCheck } from '../../../models/collaboration/types';

/**
 * Feature to Plan Mapping
 * Defines minimum plan tier required for each collaboration feature
 */
export const COLLABORATION_FEATURE_REQUIREMENTS: Record<
  CollaborationFeatureKey,
  {
    brand: {
      minTier: PlanKey;
      description: string;
    };
    manufacturer: {
      minTier: ManufacturerPlanKey;
      description: string;
    };
  }
> = {
  fileSharing: {
    brand: {
      minTier: 'growth',
      description: 'File sharing requires Growth plan or higher'
    },
    manufacturer: {
      minTier: 'professional',
      description: 'File sharing requires Professional plan or higher'
    }
  },
  realTimeUpdates: {
    brand: {
      minTier: 'premium',
      description: 'Real-time updates require Premium plan or higher'
    },
    manufacturer: {
      minTier: 'professional',
      description: 'Real-time updates require Professional plan or higher'
    }
  },
  taskManagement: {
    brand: {
      minTier: 'growth',
      description: 'Task management requires Growth plan or higher'
    },
    manufacturer: {
      minTier: 'professional',
      description: 'Task management requires Professional plan or higher'
    }
  },
  designReview: {
    brand: {
      minTier: 'growth',
      description: 'Design review requires Growth plan or higher'
    },
    manufacturer: {
      minTier: 'professional',
      description: 'Design review requires Professional plan or higher'
    }
  },
  supplyChainTracking: {
    brand: {
      minTier: 'growth',
      description: 'Supply chain tracking requires Growth plan or higher'
    },
    manufacturer: {
      minTier: 'starter',
      description: 'Supply chain tracking is available on all plans'
    }
  },
  videoUpdates: {
    brand: {
      minTier: 'premium',
      description: 'Video updates require Premium plan or higher'
    },
    manufacturer: {
      minTier: 'professional',
      description: 'Video updates require Professional plan or higher'
    }
  },
  automatedNotifications: {
    brand: {
      minTier: 'premium',
      description: 'Automated notifications require Premium plan or higher'
    },
    manufacturer: {
      minTier: 'professional',
      description: 'Automated notifications require Professional plan or higher'
    }
  }
};

/**
 * Plan hierarchy for brands
 */
export const BRAND_PLAN_HIERARCHY: Record<PlanKey, number> = {
  foundation: 0,
  growth: 1,
  premium: 2,
  enterprise: 3
};

/**
 * Plan hierarchy for manufacturers
 */
export const MANUFACTURER_PLAN_HIERARCHY: Record<ManufacturerPlanKey, number> = {
  starter: 0,
  professional: 1,
  enterprise: 2,
  unlimited: 3
};

/**
 * Feature Access Service
 * Handles all collaboration feature access validation
 */
export class FeatureAccessService {
  /**
   * Check if a brand plan tier has access to a feature
   */
  public brandHasFeature(
    brandTier: PlanKey,
    feature: CollaborationFeatureKey
  ): boolean {
    const requirement = COLLABORATION_FEATURE_REQUIREMENTS[feature].brand;
    return BRAND_PLAN_HIERARCHY[brandTier] >= BRAND_PLAN_HIERARCHY[requirement.minTier];
  }

  /**
   * Check if a manufacturer plan tier has access to a feature
   */
  public manufacturerHasFeature(
    manufacturerTier: ManufacturerPlanKey,
    feature: CollaborationFeatureKey
  ): boolean {
    const requirement = COLLABORATION_FEATURE_REQUIREMENTS[feature].manufacturer;
    return MANUFACTURER_PLAN_HIERARCHY[manufacturerTier] >= MANUFACTURER_PLAN_HIERARCHY[requirement.minTier];
  }

  /**
   * Check if both parties have access to a feature
   * BOTH brand and manufacturer must have the required tier
   */
  public checkFeatureAccess(
    brandTier: PlanKey,
    manufacturerTier: ManufacturerPlanKey,
    feature: CollaborationFeatureKey
  ): IFeatureAccessCheck {
    const brandHasAccess = this.brandHasFeature(brandTier, feature);
    const manufacturerHasAccess = this.manufacturerHasFeature(manufacturerTier, feature);

    if (brandHasAccess && manufacturerHasAccess) {
      return {
        hasAccess: true,
        brandPlanTier: brandTier,
        manufacturerPlanTier: manufacturerTier
      };
    }

    // Determine who's blocking access
    let blockedBy: 'brand' | 'manufacturer' | undefined;
    let reason: string | undefined;

    if (!brandHasAccess && !manufacturerHasAccess) {
      reason = `Both parties need to upgrade. ${COLLABORATION_FEATURE_REQUIREMENTS[feature].brand.description}. ${COLLABORATION_FEATURE_REQUIREMENTS[feature].manufacturer.description}`;
      blockedBy = 'brand'; // Default to brand for UI purposes
    } else if (!brandHasAccess) {
      blockedBy = 'brand';
      reason = COLLABORATION_FEATURE_REQUIREMENTS[feature].brand.description;
    } else {
      blockedBy = 'manufacturer';
      reason = COLLABORATION_FEATURE_REQUIREMENTS[feature].manufacturer.description;
    }

    return {
      hasAccess: false,
      reason,
      brandPlanTier: brandTier,
      manufacturerPlanTier: manufacturerTier,
      requiredTier: !brandHasAccess
        ? COLLABORATION_FEATURE_REQUIREMENTS[feature].brand.minTier
        : COLLABORATION_FEATURE_REQUIREMENTS[feature].manufacturer.minTier,
      blockedBy
    };
  }

  /**
   * Get all available features for a brand-manufacturer pair
   */
  public getAvailableFeatures(
    brandTier: PlanKey,
    manufacturerTier: ManufacturerPlanKey
  ): Record<CollaborationFeatureKey, boolean> {
    const features: Record<string, boolean> = {};

    for (const feature of Object.keys(COLLABORATION_FEATURE_REQUIREMENTS) as CollaborationFeatureKey[]) {
      const access = this.checkFeatureAccess(brandTier, manufacturerTier, feature);
      features[feature] = access.hasAccess;
    }

    return features as Record<CollaborationFeatureKey, boolean>;
  }

  /**
   * Get detailed feature access breakdown
   */
  public getFeatureAccessBreakdown(
    brandTier: PlanKey,
    manufacturerTier: ManufacturerPlanKey
  ): Record<CollaborationFeatureKey, IFeatureAccessCheck> {
    const breakdown: Record<string, IFeatureAccessCheck> = {};

    for (const feature of Object.keys(COLLABORATION_FEATURE_REQUIREMENTS) as CollaborationFeatureKey[]) {
      breakdown[feature] = this.checkFeatureAccess(brandTier, manufacturerTier, feature);
    }

    return breakdown as Record<CollaborationFeatureKey, IFeatureAccessCheck>;
  }

  /**
   * Get upgrade recommendations for a specific feature
   */
  public getUpgradeRecommendation(
    brandTier: PlanKey,
    manufacturerTier: ManufacturerPlanKey,
    feature: CollaborationFeatureKey
  ): {
    needsUpgrade: boolean;
    whoNeedsUpgrade: Array<'brand' | 'manufacturer'>;
    brandUpgradeTo?: PlanKey;
    manufacturerUpgradeTo?: ManufacturerPlanKey;
    message: string;
  } {
    const access = this.checkFeatureAccess(brandTier, manufacturerTier, feature);

    if (access.hasAccess) {
      return {
        needsUpgrade: false,
        whoNeedsUpgrade: [],
        message: 'Feature is already available'
      };
    }

    const whoNeedsUpgrade: Array<'brand' | 'manufacturer'> = [];
    let brandUpgradeTo: PlanKey | undefined;
    let manufacturerUpgradeTo: ManufacturerPlanKey | undefined;
    let message = '';

    const brandHasAccess = this.brandHasFeature(brandTier, feature);
    const manufacturerHasAccess = this.manufacturerHasFeature(manufacturerTier, feature);

    if (!brandHasAccess) {
      whoNeedsUpgrade.push('brand');
      brandUpgradeTo = COLLABORATION_FEATURE_REQUIREMENTS[feature].brand.minTier;
      message += `Brand needs to upgrade to ${brandUpgradeTo} plan. `;
    }

    if (!manufacturerHasAccess) {
      whoNeedsUpgrade.push('manufacturer');
      manufacturerUpgradeTo = COLLABORATION_FEATURE_REQUIREMENTS[feature].manufacturer.minTier;
      message += `Manufacturer needs to upgrade to ${manufacturerUpgradeTo} plan.`;
    }

    return {
      needsUpgrade: true,
      whoNeedsUpgrade,
      brandUpgradeTo,
      manufacturerUpgradeTo,
      message: message.trim()
    };
  }

  /**
   * Get all features that would unlock with an upgrade
   */
  public getUnlockableFeatures(
    currentBrandTier: PlanKey,
    currentManufacturerTier: ManufacturerPlanKey,
    targetBrandTier?: PlanKey,
    targetManufacturerTier?: ManufacturerPlanKey
  ): CollaborationFeatureKey[] {
    const currentFeatures = this.getAvailableFeatures(currentBrandTier, currentManufacturerTier);
    const targetFeatures = this.getAvailableFeatures(
      targetBrandTier || currentBrandTier,
      targetManufacturerTier || currentManufacturerTier
    );

    const unlockable: CollaborationFeatureKey[] = [];

    for (const feature of Object.keys(COLLABORATION_FEATURE_REQUIREMENTS) as CollaborationFeatureKey[]) {
      if (!currentFeatures[feature] && targetFeatures[feature]) {
        unlockable.push(feature);
      }
    }

    return unlockable;
  }

  /**
   * Validate if a plan tier exists
   */
  public isValidBrandTier(tier: string): tier is PlanKey {
    return tier in PLAN_DEFINITIONS;
  }

  /**
   * Validate if a manufacturer plan tier exists
   */
  public isValidManufacturerTier(tier: string): tier is ManufacturerPlanKey {
    return tier in MANUFACTURER_PLAN_DEFINITIONS;
  }

  /**
   * Get the next upgrade tier for a brand
   */
  public getNextBrandTier(currentTier: PlanKey): PlanKey | null {
    const currentLevel = BRAND_PLAN_HIERARCHY[currentTier];
    const tiers = Object.keys(BRAND_PLAN_HIERARCHY) as PlanKey[];

    for (const tier of tiers) {
      if (BRAND_PLAN_HIERARCHY[tier] === currentLevel + 1) {
        return tier;
      }
    }

    return null; // Already at highest tier
  }

  /**
   * Get the next upgrade tier for a manufacturer
   */
  public getNextManufacturerTier(currentTier: ManufacturerPlanKey): ManufacturerPlanKey | null {
    const currentLevel = MANUFACTURER_PLAN_HIERARCHY[currentTier];
    const tiers = Object.keys(MANUFACTURER_PLAN_HIERARCHY) as ManufacturerPlanKey[];

    for (const tier of tiers) {
      if (MANUFACTURER_PLAN_HIERARCHY[tier] === currentLevel + 1) {
        return tier;
      }
    }

    return null; // Already at highest tier
  }

  /**
   * Calculate feature availability percentage
   */
  public calculateFeatureAvailability(
    brandTier: PlanKey,
    manufacturerTier: ManufacturerPlanKey
  ): {
    availableFeatures: number;
    totalFeatures: number;
    percentage: number;
  } {
    const features = this.getAvailableFeatures(brandTier, manufacturerTier);
    const availableFeatures = Object.values(features).filter(Boolean).length;
    const totalFeatures = Object.keys(COLLABORATION_FEATURE_REQUIREMENTS).length;

    return {
      availableFeatures,
      totalFeatures,
      percentage: Math.round((availableFeatures / totalFeatures) * 100)
    };
  }
}

// Export singleton instance
export const featureAccessService = new FeatureAccessService();
