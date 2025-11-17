// src/controllers/features/brands/brandRecommendation.controller.ts
// Brand recommendation controller using modular brand services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { getBrandsServices } from '../../../services/container/container.getters';  

/**
 * Brand recommendation request interfaces
 */
interface GeneratePersonalizedRecommendationsRequest extends BaseRequest {
  validatedQuery?: {
    limit?: number;
    categories?: string[];
    excludeIds?: string[];
    context?: string;
  };
}

interface GetPersonalizedRecommendationsRequest extends BaseRequest {
  validatedQuery?: {
    limit?: number;
    categories?: string[];
    excludeIds?: string[];
    context?: string;
  };
}

interface GenerateImprovementRecommendationsRequest extends BaseRequest {
  validatedQuery?: {
    limit?: number;
    focusAreas?: string[];
  };
}

/**
 * Brand recommendation controller
 */
export class BrandRecommendationController extends BaseController {
  private brandServices = getBrandsServices();

  /**
   * Generate personalized recommendations for a business
   */
  async generatePersonalizedRecommendations(req: GeneratePersonalizedRecommendationsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GENERATE_PERSONALIZED_RECOMMENDATIONS');

        const plan = req.query.plan as string || 'foundation';
        const context = {
          businessId: req.businessId!,
          plan,
          limit: req.validatedQuery?.limit || 10
        };

        const options = {
          limit: req.validatedQuery?.limit || 10,
          types: req.validatedQuery?.categories,
          minPriority: req.validatedQuery?.context
        };

        const recommendations = await this.brandServices.recommendations.generatePersonalizedRecommendations(context, options);
        
        this.logAction(req, 'GENERATE_PERSONALIZED_RECOMMENDATIONS_SUCCESS', {
          businessId: req.businessId,
          recommendationCount: recommendations.recommendations.length,
          categories: options.types,
          plan
        });

        return { recommendations };
      });
    }, res, 'Personalized recommendations generated', this.getRequestMeta(req));
  }

  /**
   * Get personalized recommendations for a business
   */
  async getPersonalizedRecommendations(req: GetPersonalizedRecommendationsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_PERSONALIZED_RECOMMENDATIONS');

        const options = {
          limit: req.validatedQuery?.limit || 10,
          type: req.validatedQuery?.context
        };

        const recommendations = await this.brandServices.recommendations.getPersonalizedRecommendations(req.businessId!, options);
        
        this.logAction(req, 'GET_PERSONALIZED_RECOMMENDATIONS_SUCCESS', {
          businessId: req.businessId,
          recommendationCount: recommendations.length,
          categories: req.validatedQuery?.categories,
          context: req.validatedQuery?.context
        });

        return { recommendations };
      });
    }, res, 'Personalized recommendations retrieved', this.getRequestMeta(req));
  }

  /**
   * Generate improvement recommendations for a business
   */
  async generateImprovementRecommendations(req: GenerateImprovementRecommendationsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GENERATE_IMPROVEMENT_RECOMMENDATIONS');

        const profile = await this.brandServices.profile.getBrandProfile(req.businessId!);
        const recommendations = this.brandServices.recommendations.generateImprovementRecommendations(profile);
        
        this.logAction(req, 'GENERATE_IMPROVEMENT_RECOMMENDATIONS_SUCCESS', {
          businessId: req.businessId,
          recommendationCount: recommendations.length,
          focusAreas: req.validatedQuery?.focusAreas
        });

        return { recommendations };
      });
    }, res, 'Improvement recommendations generated', this.getRequestMeta(req));
  }
}

// Export controller instance
export const brandRecommendationController = new BrandRecommendationController();