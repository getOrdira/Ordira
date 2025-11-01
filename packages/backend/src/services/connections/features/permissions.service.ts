// src/services/connections/features/permissions.service.ts

import { Business } from '../../../models/deprecated/business.model';
import { Manufacturer } from '../../../models/deprecated/manufacturer.model';
import { connectionDataService } from '../core/connectionData.service';
import { logger } from '../../../utils/logger';

export interface ConnectionFeatureAccess {
  analytics: boolean;
  supplyChain: boolean;
  productData: boolean;
  messaging: boolean;
  fileSharing: boolean;
  recommendations: boolean;
}

export type ConnectionFeature = keyof ConnectionFeatureAccess;

export interface FeatureAccessResult {
  brandId: string;
  manufacturerId: string;
  brandPlan: string;
  manufacturerPlan: string;
  features: ConnectionFeatureAccess;
}

const BRAND_PLAN_RANK: Record<string, number> = {
  foundation: 1,
  growth: 2,
  premium: 3,
  enterprise: 4
};

const MANUFACTURER_PLAN_RANK: Record<string, number> = {
  starter: 1,
  professional: 2,
  enterprise: 3,
  unlimited: 4
};

const FEATURE_THRESHOLDS: Record<ConnectionFeature, { brand: number; manufacturer: number }> = {
  analytics: { brand: 2, manufacturer: 2 },
  supplyChain: { brand: 3, manufacturer: 2 },
  productData: { brand: 1, manufacturer: 1 },
  messaging: { brand: 1, manufacturer: 1 },
  fileSharing: { brand: 2, manufacturer: 1 },
  recommendations: { brand: 1, manufacturer: 1 }
};

/**
 * Permissions service responsible for determining which collaborative features
 * a brand and manufacturer can access together based on their subscription plans
 * and connection status.
 */
export class PermissionsService {
  /**
   * Retrieve the feature access matrix for a given connection.
   */
  async getFeatureAccess(brandId: string, manufacturerId: string): Promise<FeatureAccessResult> {
    const [business, manufacturer] = await Promise.all([
      Business.findById(brandId).select('plan isActive'),
      Manufacturer.findById(manufacturerId).select('plan isActive')
    ]);

    if (!business || business.isActive === false) {
      throw { statusCode: 404, message: 'Brand not found or inactive' };
    }

    if (!manufacturer || manufacturer.isActive === false) {
      throw { statusCode: 404, message: 'Manufacturer not found or inactive' };
    }

    const features = this.calculateFeatureAccess(
      business.plan || 'foundation',
      manufacturer.plan || 'starter'
    );

    return {
      brandId,
      manufacturerId,
      brandPlan: business.plan || 'foundation',
      manufacturerPlan: manufacturer.plan || 'starter',
      features
    };
  }

  /**
   * Determine whether a specific feature can be used by the connection.
   */
  async canUseFeature(
    brandId: string,
    manufacturerId: string,
    feature: ConnectionFeature,
    requireConnection: boolean = true
  ): Promise<boolean> {
    try {
      if (requireConnection) {
        const connected = await connectionDataService.areConnected(brandId, manufacturerId);
        if (!connected) {
          return false;
        }
      }

      const { features } = await this.getFeatureAccess(brandId, manufacturerId);
      return features[feature];
    } catch (error) {
      logger.warn('Failed to evaluate feature access', {
        brandId,
        manufacturerId,
        feature,
        error
      });
      return false;
    }
  }

  /**
   * Assert that the connection is allowed to use a feature, throwing a descriptive error otherwise.
   */
  async assertFeatureAccess(
    brandId: string,
    manufacturerId: string,
    feature: ConnectionFeature
  ): Promise<void> {
    const canUse = await this.canUseFeature(brandId, manufacturerId, feature);

    if (!canUse) {
      throw {
        statusCode: 403,
        message: `Connection does not have access to the ${feature} feature`
      };
    }
  }

  /**
   * Provide a human-readable explanation for why a feature is or is not available.
   */
  async explainFeatureAccess(
    brandId: string,
    manufacturerId: string,
    feature: ConnectionFeature
  ): Promise<{ allowed: boolean; reason: string }> {
    const [{ features, brandPlan, manufacturerPlan }, connected] = await Promise.all([
      this.getFeatureAccess(brandId, manufacturerId),
      connectionDataService.areConnected(brandId, manufacturerId)
    ]);

    if (!connected) {
      return {
        allowed: false,
        reason: 'Brand and manufacturer must be connected first'
      };
    }

    if (features[feature]) {
      return {
        allowed: true,
        reason: `Feature enabled (brand plan: ${brandPlan}, manufacturer plan: ${manufacturerPlan})`
      };
    }

    const threshold = FEATURE_THRESHOLDS[feature];
    const brandRank = this.getBrandPlanRank(brandPlan);
    const manufacturerRank = this.getManufacturerPlanRank(manufacturerPlan);

    if (brandRank < threshold.brand) {
      return {
        allowed: false,
        reason: `Upgrade brand plan to unlock ${feature}`
      };
    }

    if (manufacturerRank < threshold.manufacturer) {
      return {
        allowed: false,
        reason: `Manufacturer plan does not support ${feature}`
      };
    }

    return {
      allowed: false,
      reason: 'Feature unavailable due to plan limitations'
    };
  }

  /**
   * Internal helper: calculate access matrix based on plan tiers.
   */
  private calculateFeatureAccess(
    brandPlan: string,
    manufacturerPlan: string
  ): ConnectionFeatureAccess {
    const brandRank = this.getBrandPlanRank(brandPlan);
    const manufacturerRank = this.getManufacturerPlanRank(manufacturerPlan);

    const features = {} as ConnectionFeatureAccess;

    (Object.keys(FEATURE_THRESHOLDS) as ConnectionFeature[]).forEach(feature => {
      const threshold = FEATURE_THRESHOLDS[feature];
      features[feature] = brandRank >= threshold.brand && manufacturerRank >= threshold.manufacturer;
    });

    return features;
  }

  private getBrandPlanRank(plan?: string): number {
    return plan ? BRAND_PLAN_RANK[plan] ?? 0 : 0;
  }

  private getManufacturerPlanRank(plan?: string): number {
    return plan ? MANUFACTURER_PLAN_RANK[plan] ?? 0 : 0;
  }
}

export const permissionsService = new PermissionsService();
