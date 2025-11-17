// src/controllers/features/brands/brandDiscovery.controller.ts
// Brand discovery controller using modular brand services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { getBrandsServices } from '../../../services/container/container.getters';

/**
 * Brand discovery request interfaces
 */
interface GetPersonalizedRecommendationsRequest extends BaseRequest {
  validatedQuery?: {
    limit?: number;
    categories?: string[];
    excludeIds?: string[];
  };
}

interface GetConnectionOpportunitiesRequest extends BaseRequest {
  validatedQuery?: {
    limit?: number;
    industry?: string;
    location?: string;
    minCompatibility?: number;
  };
}

interface CalculateCompatibilityRequest extends BaseRequest {
  validatedBody: {
    brandId1: string;
    brandId2: string;
  };
}

interface GetSearchSuggestionsRequest extends BaseRequest {
  validatedQuery: {
    query: string;
    limit?: number;
  };
}

interface GetEcosystemAnalyticsRequest extends BaseRequest {
  validatedQuery?: {
    timeframe?: string;
    industry?: string;
    region?: string;
  };
}

/**
 * Brand discovery controller
 */
export class BrandDiscoveryController extends BaseController {
  private brandServices = getBrandsServices();

  /**
   * Get personalized recommendations for a business
   */
  async getPersonalizedRecommendations(req: GetPersonalizedRecommendationsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_PERSONALIZED_RECOMMENDATIONS');

        const options = {
          limit: req.validatedQuery?.limit || 10,
          categories: req.validatedQuery?.categories,
          excludeIds: req.validatedQuery?.excludeIds
        };

        const recommendations = await this.brandServices.discovery.getPersonalizedRecommendations(
          req.businessId!,
          options
        );
        
        this.logAction(req, 'GET_PERSONALIZED_RECOMMENDATIONS_SUCCESS', {
          businessId: req.businessId,
          recommendationCount: recommendations.length,
          categories: options.categories
        });

        return { recommendations };
      });
    }, res, 'Personalized recommendations retrieved', this.getRequestMeta(req));
  }

  /**
   * Get connection opportunities for networking
   */
  async getConnectionOpportunities(req: GetConnectionOpportunitiesRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_CONNECTION_OPPORTUNITIES');

        const options = {
          limit: req.validatedQuery?.limit || 10,
          industry: req.validatedQuery?.industry,
          location: req.validatedQuery?.location,
          minCompatibility: req.validatedQuery?.minCompatibility || 0.7
        };

        const opportunities = await this.brandServices.discovery.getConnectionOpportunities(
          req.businessId!,
          options
        );
        
        this.logAction(req, 'GET_CONNECTION_OPPORTUNITIES_SUCCESS', {
          businessId: req.businessId,
          opportunityCount: opportunities.length,
          industry: options.industry,
          minCompatibility: options.minCompatibility
        });

        return { opportunities };
      });
    }, res, 'Connection opportunities retrieved', this.getRequestMeta(req));
  }

  /**
   * Calculate compatibility score between two brands
   */
  async calculateCompatibilityScore(req: CalculateCompatibilityRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'CALCULATE_COMPATIBILITY_SCORE');

        const result = await this.brandServices.discovery.calculateCompatibilityScore(
          req.validatedBody.brandId1,
          req.validatedBody.brandId2
        );
        
        this.logAction(req, 'CALCULATE_COMPATIBILITY_SCORE_SUCCESS', {
          businessId: req.businessId,
          brandId1: req.validatedBody.brandId1,
          brandId2: req.validatedBody.brandId2,
          score: result.score
        });

        return { result };
      });
    }, res, 'Compatibility score calculated', this.getRequestMeta(req));
  }

  /**
   * Get search suggestions for brand discovery
   */
  async getSearchSuggestions(req: GetSearchSuggestionsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_SEARCH_SUGGESTIONS');

        const options = {
          limit: req.validatedQuery.limit || 10
        };

        const suggestions = await this.brandServices.discovery.getSearchSuggestions(
          req.validatedQuery.query,
          options
        );
        
        this.logAction(req, 'GET_SEARCH_SUGGESTIONS_SUCCESS', {
          businessId: req.businessId,
          query: req.validatedQuery.query,
          suggestionCount: suggestions.length
        });

        return { suggestions };
      });
    }, res, 'Search suggestions retrieved', this.getRequestMeta(req));
  }

  /**
   * Get ecosystem analytics for brand discovery insights
   */
  async getEcosystemAnalytics(req: GetEcosystemAnalyticsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_ECOSYSTEM_ANALYTICS');

        const options = {
          timeframe: req.validatedQuery?.timeframe || '30d',
          industry: req.validatedQuery?.industry,
          region: req.validatedQuery?.region
        };

        const analytics = await this.brandServices.discovery.getEcosystemAnalytics(options);
        
        this.logAction(req, 'GET_ECOSYSTEM_ANALYTICS_SUCCESS', {
          businessId: req.businessId,
          timeframe: options.timeframe,
          industry: options.industry,
          region: options.region
        });

        return { analytics };
      });
    }, res, 'Ecosystem analytics retrieved', this.getRequestMeta(req));
  }
}

// Export controller instance
export const brandDiscoveryController = new BrandDiscoveryController();