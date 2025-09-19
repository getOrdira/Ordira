// @ts-nocheck
// src/middleware/manufacturerPlanLimits.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { UnifiedAuthRequest } from './unifiedAuth.middleware';
import { Manufacturer } from '../models/manufacturer.model';
import { BrandSettings } from '../models/brandSettings.model';
import { MANUFACTURER_PLAN_DEFINITIONS, ManufacturerPlanKey } from '../constants/manufacturerPlans';
import { createAppError } from './error.middleware';

export interface ManufacturerPlanLimitsRequest extends UnifiedAuthRequest {
  manufacturerPlan?: ManufacturerPlanKey;
  planLimits?: {
    brandConnections: number;
    supplyChainProducts: number;
    supplyChainEndpoints: number;
    supplyChainEvents: number;
    profileViews: number;
  };
  currentUsage?: {
    brandConnections: number;
    supplyChainProducts: number;
    supplyChainEndpoints: number;
    supplyChainEvents: number;
    profileViews: number;
  };
}

/**
 * Middleware to enforce manufacturer plan limits
 */
export function enforceManufacturerPlanLimits() {
  return async (req: ManufacturerPlanLimitsRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const manufacturerId = req.userId;
      if (!manufacturerId) {
        throw createAppError('Manufacturer ID not found', 401, 'MISSING_MANUFACTURER_ID');
      }

      // Get manufacturer's plan
      const manufacturer = await Manufacturer.findById(manufacturerId).select('plan');
      const plan = manufacturer?.plan || 'starter';
      const planDef = MANUFACTURER_PLAN_DEFINITIONS[plan as ManufacturerPlanKey];

      // Get current usage
      const currentUsage = await getCurrentUsage(manufacturerId);

      // Add plan information to request
      req.manufacturerPlan = plan as ManufacturerPlanKey;
      req.planLimits = {
        brandConnections: planDef.brandConnections,
        supplyChainProducts: planDef.supplyChainProducts,
        supplyChainEndpoints: planDef.supplyChainEndpoints,
        supplyChainEvents: planDef.supplyChainEvents,
        profileViews: planDef.profileViews
      };
      req.currentUsage = currentUsage;

      next();
    } catch (error) {
      logger.error('Manufacturer plan limits middleware error:', error);
      next(error);
    }
  };
}

/**
 * Check if manufacturer can connect to a new brand
 */
export function requireBrandConnectionLimit() {
  return async (req: ManufacturerPlanLimitsRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const planLimits = req.planLimits!;
      const currentUsage = req.currentUsage!;

      if (planLimits.brandConnections !== Infinity && 
          currentUsage.brandConnections >= planLimits.brandConnections) {
        
        res.status(403).json({
          error: 'Brand connection limit reached',
          details: {
            currentConnections: currentUsage.brandConnections,
            limit: planLimits.brandConnections,
            plan: req.manufacturerPlan
          },
          options: {
            upgradeAvailable: req.manufacturerPlan !== 'unlimited',
            overageAllowed: false
          },
          recommendations: [
            'Consider upgrading your manufacturer plan for more brand connections',
            'Review and optimize your current brand relationships',
            'Contact support for custom solutions'
          ],
          code: 'BRAND_CONNECTION_LIMIT_REACHED'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Brand connection limit check error:', error);
      next(error);
    }
  };
}

/**
 * Check if manufacturer can add a new supply chain product
 */
export function requireSupplyChainProductLimit() {
  return async (req: ManufacturerPlanLimitsRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const planLimits = req.planLimits!;
      const currentUsage = req.currentUsage!;

      if (planLimits.supplyChainProducts !== Infinity && 
          currentUsage.supplyChainProducts >= planLimits.supplyChainProducts) {
        
        res.status(403).json({
          error: 'Supply chain product limit reached',
          details: {
            currentProducts: currentUsage.supplyChainProducts,
            limit: planLimits.supplyChainProducts,
            plan: req.manufacturerPlan
          },
          options: {
            upgradeAvailable: req.manufacturerPlan !== 'unlimited',
            overageAllowed: false
          },
          recommendations: [
            'Consider upgrading your manufacturer plan for more supply chain products',
            'Archive unused or completed products',
            'Contact support for custom solutions'
          ],
          code: 'SUPPLY_CHAIN_PRODUCT_LIMIT_REACHED'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Supply chain product limit check error:', error);
      next(error);
    }
  };
}

/**
 * Check if manufacturer can add a new supply chain endpoint
 */
export function requireSupplyChainEndpointLimit() {
  return async (req: ManufacturerPlanLimitsRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const planLimits = req.planLimits!;
      const currentUsage = req.currentUsage!;

      if (planLimits.supplyChainEndpoints !== Infinity && 
          currentUsage.supplyChainEndpoints >= planLimits.supplyChainEndpoints) {
        
        res.status(403).json({
          error: 'Supply chain endpoint limit reached',
          details: {
            currentEndpoints: currentUsage.supplyChainEndpoints,
            limit: planLimits.supplyChainEndpoints,
            plan: req.manufacturerPlan
          },
          options: {
            upgradeAvailable: req.manufacturerPlan !== 'unlimited',
            overageAllowed: false
          },
          recommendations: [
            'Consider upgrading your manufacturer plan for more supply chain endpoints',
            'Review and consolidate similar endpoints',
            'Contact support for custom solutions'
          ],
          code: 'SUPPLY_CHAIN_ENDPOINT_LIMIT_REACHED'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Supply chain endpoint limit check error:', error);
      next(error);
    }
  };
}

/**
 * Check if manufacturer can log a supply chain event
 */
export function requireSupplyChainEventLimit() {
  return async (req: ManufacturerPlanLimitsRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const planLimits = req.planLimits!;
      const currentUsage = req.currentUsage!;

      if (planLimits.supplyChainEvents !== Infinity && 
          currentUsage.supplyChainEvents >= planLimits.supplyChainEvents) {
        
        res.status(403).json({
          error: 'Supply chain event limit reached',
          details: {
            currentEvents: currentUsage.supplyChainEvents,
            limit: planLimits.supplyChainEvents,
            plan: req.manufacturerPlan
          },
          options: {
            upgradeAvailable: req.manufacturerPlan !== 'unlimited',
            overageAllowed: false
          },
          recommendations: [
            'Consider upgrading your manufacturer plan for more supply chain events',
            'Optimize event logging frequency',
            'Contact support for custom solutions'
          ],
          code: 'SUPPLY_CHAIN_EVENT_LIMIT_REACHED'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Supply chain event limit check error:', error);
      next(error);
    }
  };
}

/**
 * Get current usage for a manufacturer
 */
async function getCurrentUsage(manufacturerId: string): Promise<{
  brandConnections: number;
  supplyChainProducts: number;
  supplyChainEndpoints: number;
  supplyChainEvents: number;
  profileViews: number;
}> {
  try {
    // Get brand connections count
    const brandConnections = await BrandSettings.countDocuments({ 
      connectedManufacturers: manufacturerId 
    });

    // Get supply chain usage from manufacturer's supply chain settings
    const manufacturer = await Manufacturer.findById(manufacturerId).select('supplyChainSettings');
    const supplyChainSettings = manufacturer?.supplyChainSettings;

    const supplyChainProducts = supplyChainSettings?.products?.length || 0;
    const supplyChainEndpoints = supplyChainSettings?.endpoints?.length || 0;
    
    // Count events this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const supplyChainEvents = supplyChainSettings?.recentEvents?.filter(
      (event: any) => new Date(event.timestamp) >= thisMonth
    ).length || 0;

    // Get profile views (this would need to be tracked separately)
    const profileViews = manufacturer?.profileViews || 0;

    return {
      brandConnections,
      supplyChainProducts,
      supplyChainEndpoints,
      supplyChainEvents,
      profileViews
    };
  } catch (error) {
    logger.error('Error getting current usage:', error);
    // Return zero usage on error to prevent blocking
    return {
      brandConnections: 0,
      supplyChainProducts: 0,
      supplyChainEndpoints: 0,
      supplyChainEvents: 0,
      profileViews: 0
    };
  }
}

/**
 * Apply search visibility limits based on manufacturer plan
 */
export function applySearchVisibilityLimits() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit } = req.query;
      const requestedLimit = parseInt(limit as string) || 20;
      
      // Get all manufacturers in the search result
      const manufacturers = res.locals.searchResults || [];
      
      // Apply plan-based visibility limits
      const limitedResults = manufacturers.map((manufacturer: any) => {
        const planDef = MANUFACTURER_PLAN_DEFINITIONS[manufacturer.plan as ManufacturerPlanKey];
        const visibilityLimits = planDef?.searchVisibility;
        
        if (visibilityLimits) {
          // Apply ranking boost
          manufacturer.searchRankingBoost = visibilityLimits.rankingBoost;
          
          // Limit search keywords visibility
          if (visibilityLimits.searchKeywords !== Infinity && manufacturer.servicesOffered) {
            manufacturer.servicesOffered = manufacturer.servicesOffered.slice(0, visibilityLimits.searchKeywords);
          }
          
          // Add plan-based promotion flag
          manufacturer.isPromoted = visibilityLimits.profilePromotion;
        }
        
        return manufacturer;
      });
      
      // Sort by relevance first, then plan tier (more fair)
      limitedResults.sort((a: any, b: any) => {
        // First sort by match score (relevance)
        const aMatchScore = a.matchScore || 0;
        const bMatchScore = b.matchScore || 0;
        
        if (Math.abs(aMatchScore - bMatchScore) > 10) { // Significant difference in relevance
          return bMatchScore - aMatchScore;
        }
        
        // If relevance is similar, consider plan tier
        const planOrder = { unlimited: 4, enterprise: 3, professional: 2, starter: 1 };
        const aPlanOrder = planOrder[a.plan as keyof typeof planOrder] || 0;
        const bPlanOrder = planOrder[b.plan as keyof typeof planOrder] || 0;
        
        if (aPlanOrder !== bPlanOrder) {
          return bPlanOrder - aPlanOrder; // Higher plans first
        }
        
        // If same plan, sort by profile score
        return (b.profileScore || 0) - (a.profileScore || 0);
      });
      
      // Ensure starter plans get guaranteed visibility (fairness)
      const starterPlans = limitedResults.filter((m: any) => m.plan === 'starter');
      const otherPlans = limitedResults.filter((m: any) => m.plan !== 'starter');
      
      // Reserve 30% of results for starter plans if they exist
      const maxResults = Math.min(requestedLimit, 100);
      const starterReserve = Math.min(Math.floor(maxResults * 0.3), starterPlans.length);
      const otherReserve = maxResults - starterReserve;
      
      const finalResults = [
        ...starterPlans.slice(0, starterReserve),
        ...otherPlans.slice(0, otherReserve)
      ];
      
      res.locals.searchResults = finalResults;
      next();
    } catch (error) {
      logger.error('Search visibility limits error:', error);
      next(error);
    }
  };
}

/**
 * Get manufacturer plan information
 */
export async function getManufacturerPlanInfo(manufacturerId: string): Promise<{
  plan: ManufacturerPlanKey;
  limits: any;
  usage: any;
  utilization: any;
  recommendations: string[];
}> {
  const manufacturer = await Manufacturer.findById(manufacturerId).select('plan');
  const plan = manufacturer?.plan || 'starter';
  const planDef = MANUFACTURER_PLAN_DEFINITIONS[plan as ManufacturerPlanKey];
  const usage = await getCurrentUsage(manufacturerId);

  const utilization = {
    brandConnections: planDef.brandConnections === Infinity ? 0 : 
      Math.round((usage.brandConnections / planDef.brandConnections) * 100),
    supplyChainProducts: planDef.supplyChainProducts === Infinity ? 0 : 
      Math.round((usage.supplyChainProducts / planDef.supplyChainProducts) * 100),
    supplyChainEndpoints: planDef.supplyChainEndpoints === Infinity ? 0 : 
      Math.round((usage.supplyChainEndpoints / planDef.supplyChainEndpoints) * 100),
    supplyChainEvents: planDef.supplyChainEvents === Infinity ? 0 : 
      Math.round((usage.supplyChainEvents / planDef.supplyChainEvents) * 100),
    profileViews: planDef.profileViews === Infinity ? 0 : 
      Math.round((usage.profileViews / planDef.profileViews) * 100)
  };

  const recommendations = [];
  if (utilization.brandConnections > 80) {
    recommendations.push('Consider upgrading for more brand connections');
  }
  if (utilization.supplyChainProducts > 80) {
    recommendations.push('Consider upgrading for more supply chain products');
  }
  if (utilization.supplyChainEndpoints > 80) {
    recommendations.push('Consider upgrading for more supply chain endpoints');
  }
  if (utilization.supplyChainEvents > 80) {
    recommendations.push('Consider upgrading for more supply chain events');
  }

  return {
    plan: plan as ManufacturerPlanKey,
    limits: planDef,
    usage,
    utilization,
    recommendations
  };
}
