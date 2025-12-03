// src/middleware/collaboration/requireFeature.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { CollaborationFeatureKey } from '../../models/collaboration/types';
import { featureAccessService } from '../../services/collaboration/validation/featureAccess.service';
import { PlanKey } from '../../constants/plans';
import { ManufacturerPlanKey } from '../../constants/manufacturerPlans';

/**
 * Extended Request with subscription context
 */
export interface IFeatureRequest extends Request {
  collaboration?: {
    brandId: Types.ObjectId;
    manufacturerId: Types.ObjectId;
    userId: Types.ObjectId;
    userType: 'brand' | 'manufacturer';
    workspaceId?: Types.ObjectId;
  };
  subscriptions?: {
    brandTier: PlanKey;
    manufacturerTier: ManufacturerPlanKey;
  };
}

/**
 * Middleware factory to require a specific collaboration feature
 *
 * Usage:
 * router.post('/workspaces/:id/files', requireFeature('fileSharing'), uploadFile);
 * router.post('/workspaces/:id/updates', requireFeature('realTimeUpdates'), createUpdate);
 *
 * Prerequisites:
 * - Request must have req.subscriptions.brandTier
 * - Request must have req.subscriptions.manufacturerTier
 * - Request must have req.collaboration context (for error details)
 */
export const requireFeature = (feature: CollaborationFeatureKey) => {
  return async (
    req: IFeatureRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { brandTier, manufacturerTier } = req.subscriptions || {};

      // If subscriptions aren't available, skip middleware check.
      // The service layer will verify feature access via workspace.enabledFeatures
      // which handles both subscription-based and explicitly-enabled features.
      if (!brandTier || !manufacturerTier) {
        next();
        return;
      }

      // Validate plan tiers
      if (!featureAccessService.isValidBrandTier(brandTier)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BRAND_TIER',
            message: `Invalid brand plan tier: ${brandTier}`
          }
        });
        return;
      }

      if (!featureAccessService.isValidManufacturerTier(manufacturerTier)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_MANUFACTURER_TIER',
            message: `Invalid manufacturer plan tier: ${manufacturerTier}`
          }
        });
        return;
      }

      // Check feature access
      const featureAccess = featureAccessService.checkFeatureAccess(
        brandTier,
        manufacturerTier,
        feature
      );

      if (!featureAccess.hasAccess) {
        const upgradeRec = featureAccessService.getUpgradeRecommendation(
          brandTier,
          manufacturerTier,
          feature
        );

        res.status(403).json({
          success: false,
          error: {
            code: 'FEATURE_ACCESS_DENIED',
            message: featureAccess.reason || 'You do not have access to this feature',
            feature,
            details: {
              blockedBy: featureAccess.blockedBy,
              currentPlans: {
                brand: brandTier,
                manufacturer: manufacturerTier
              },
              requiredTier: featureAccess.requiredTier,
              upgrade: upgradeRec
            }
          }
        });
        return;
      }

      // Feature access granted, proceed
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FEATURE_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate feature access'
        }
      });
    }
  };
};

/**
 * Middleware to require multiple features (all must be available)
 *
 * Usage:
 * router.post('/workspaces/:id/review', requireAllFeatures(['fileSharing', 'designReview']), createReview);
 */
export const requireAllFeatures = (features: CollaborationFeatureKey[]) => {
  return async (
    req: IFeatureRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { brandTier, manufacturerTier } = req.subscriptions || {};

      // If subscriptions aren't available, skip middleware check.
      // The service layer will verify feature access via workspace.enabledFeatures
      if (!brandTier || !manufacturerTier) {
        next();
        return;
      }

      const deniedFeatures: Array<{
        feature: CollaborationFeatureKey;
        reason: string;
        blockedBy?: 'brand' | 'manufacturer' | 'connection';
      }> = [];

      for (const feature of features) {
        const featureAccess = featureAccessService.checkFeatureAccess(
          brandTier,
          manufacturerTier,
          feature
        );

        if (!featureAccess.hasAccess) {
          deniedFeatures.push({
            feature,
            reason: featureAccess.reason || 'Access denied',
            blockedBy: featureAccess.blockedBy
          });
        }
      }

      if (deniedFeatures.length > 0) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FEATURES_ACCESS_DENIED',
            message: `Access denied to ${deniedFeatures.length} required feature(s)`,
            requiredFeatures: features,
            deniedFeatures,
            currentPlans: {
              brand: brandTier,
              manufacturer: manufacturerTier
            }
          }
        });
        return;
      }

      // All features available, proceed
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FEATURES_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate features access'
        }
      });
    }
  };
};

/**
 * Middleware to require at least one of the specified features
 *
 * Usage:
 * router.post('/workspaces/:id/communication', requireAnyFeature(['realTimeUpdates', 'videoUpdates']), sendCommunication);
 */
export const requireAnyFeature = (features: CollaborationFeatureKey[]) => {
  return async (
    req: IFeatureRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { brandTier, manufacturerTier } = req.subscriptions || {};

      // If subscriptions aren't available, skip middleware check.
      // The service layer will verify feature access via workspace.enabledFeatures
      if (!brandTier || !manufacturerTier) {
        next();
        return;
      }

      let hasAnyAccess = false;

      for (const feature of features) {
        const featureAccess = featureAccessService.checkFeatureAccess(
          brandTier,
          manufacturerTier,
          feature
        );

        if (featureAccess.hasAccess) {
          hasAnyAccess = true;
          break;
        }
      }

      if (!hasAnyAccess) {
        res.status(403).json({
          success: false,
          error: {
            code: 'NO_FEATURE_ACCESS',
            message: `You need access to at least one of these features: ${features.join(', ')}`,
            requiredFeatures: features,
            currentPlans: {
              brand: brandTier,
              manufacturer: manufacturerTier
            }
          }
        });
        return;
      }

      // At least one feature available, proceed
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FEATURE_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate feature access'
        }
      });
    }
  };
};

/**
 * Middleware to attach available features to the request
 * This doesn't block access, just provides feature information
 *
 * Usage:
 * router.get('/workspaces/:id', attachAvailableFeatures, getWorkspace);
 */
export const attachAvailableFeatures = async (
  req: IFeatureRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { brandTier, manufacturerTier } = req.subscriptions || {};

    if (brandTier && manufacturerTier) {
      const availableFeatures = featureAccessService.getAvailableFeatures(
        brandTier,
        manufacturerTier
      );

      // Attach to request for use in controllers
      (req as any).availableFeatures = availableFeatures;
    }

    next();
  } catch (error) {
    // Don't block request on error, just log and continue
    console.error('Failed to attach available features:', error);
    next();
  }
};
