// src/controllers/features/brands/brandProfile.controller.ts
// Brand profile controller using modular brand services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { BrandServices } from '../../../services/brands';

/**
 * Brand profile request interfaces
 */
interface ListBrandsRequest extends BaseRequest {
  validatedQuery: {
    page?: number;
    limit?: number;
    industry?: string;
    location?: string;
    verified?: boolean;
    plan?: string;
    sortBy?: 'name' | 'created' | 'popularity' | 'relevance';
    sortOrder?: 'asc' | 'desc';
    search?: string;
    filters?: string;
  };
}

interface GetBrandByIdRequest extends BaseRequest {
  validatedParams: {
    brandId: string;
  };
  validatedQuery?: {
    includeAnalytics?: boolean;
    includeConnections?: boolean;
  };
}

interface GetBrandByDomainRequest extends BaseRequest {
  validatedParams: {
    domain: string;
  };
}

interface GetBrandBySubdomainRequest extends BaseRequest {
  validatedParams: {
    subdomain: string;
  };
}

interface ManufacturerViewRequest extends BaseRequest {
  validatedParams: {
    brandId: string;
  };
  headers: {
    'user-agent'?: string;
  };
}

interface GetBrandAnalyticsRequest extends BaseRequest {
  validatedParams: {
    brandId: string;
  };
  validatedQuery: {
    timeframe?: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
    metrics?: string[];
  };
}

interface GetBrandConnectionsRequest extends BaseRequest {
  validatedParams: {
    brandId: string;
  };
  validatedQuery: {
    page?: number;
    limit?: number;
    type?: 'sent' | 'received' | 'accepted' | 'pending';
  };
}

interface GetBrandRecommendationsRequest extends BaseRequest {
  validatedParams: {
    brandId: string;
  };
  validatedQuery: {
    type?: 'connections' | 'products' | 'features';
    limit?: number;
  };
}

/**
 * Brand profile controller
 */
export class BrandProfileController extends BaseController {
  private brandServices = BrandServices;

  /**
   * GET /api/brands
   * List brand profiles with filtering and pagination
   */
  async listBrandProfiles(req: ListBrandsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'LIST_BRAND_PROFILES');

      const pagination = this.createPaginationMeta(
        req.validatedQuery.page || 1,
        req.validatedQuery.limit || 10,
        0 // Will be updated after query
      );

      // Get all brand profiles (service doesn't support filtering/pagination)
      const allBrands = await this.brandServices.profile.listBrandProfiles();
      
      // Apply client-side filtering and pagination
      let filteredBrands = allBrands;
      
      if (req.validatedQuery.search) {
        filteredBrands = filteredBrands.filter(brand => 
          brand.businessName.toLowerCase().includes(req.validatedQuery.search!.toLowerCase())
        );
      }
      
      const total = filteredBrands.length;
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const brands = {
        profiles: filteredBrands.slice(startIndex, endIndex),
        total
      };

      // Update pagination with actual total
      const updatedPagination = this.createPaginationMeta(
        pagination.page,
        pagination.limit,
        brands.total
      );

      this.logAction(req, 'LIST_BRAND_PROFILES_SUCCESS', {
        page: pagination.page,
        limit: pagination.limit,
        total: brands.total,
        filters: req.validatedQuery
      });

      this.sendPaginated(res, brands.profiles, updatedPagination, 'Brand profiles retrieved successfully', this.getRequestMeta(req));
    }, res);
  }

  /**
   * GET /api/brands/:brandId
   * Get brand profile by ID
   */
  async getBrandById(req: GetBrandByIdRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'GET_BRAND_BY_ID');

      const brand = await this.brandServices.profile.getBrandProfile(req.validatedParams.brandId);

      this.logAction(req, 'GET_BRAND_BY_ID_SUCCESS', {
        brandId: req.validatedParams.brandId,
        includeAnalytics: req.validatedQuery?.includeAnalytics
      });

      return { brand };
    }, res, 'Brand profile retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/brands/domain/:domain
   * Get brand profile by custom domain
   */
  async getBrandByDomain(req: GetBrandByDomainRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'GET_BRAND_BY_DOMAIN');

      const brand = await this.brandServices.profile.getBrandProfileByCustomDomain(req.validatedParams.domain);

      this.logAction(req, 'GET_BRAND_BY_DOMAIN_SUCCESS', {
        domain: req.validatedParams.domain,
        brandId: brand?.id
      });

      return { brand };
    }, res, 'Brand profile retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/brands/subdomain/:subdomain
   * Get brand profile by subdomain
   */
  async getBrandBySubdomain(req: GetBrandBySubdomainRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'GET_BRAND_BY_SUBDOMAIN');

      const brand = await this.brandServices.profile.getBrandProfileBySubdomain(req.validatedParams.subdomain);

      this.logAction(req, 'GET_BRAND_BY_SUBDOMAIN_SUCCESS', {
        subdomain: req.validatedParams.subdomain,
        brandId: brand?.id
      });

      return { brand };
    }, res, 'Brand profile retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/brands/:brandId/view (Manufacturer view)
   * Track brand profile view for manufacturers
   */
  async trackBrandView(req: ManufacturerViewRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateManufacturerUser(req, res, async () => {
        this.recordPerformance(req, 'TRACK_BRAND_VIEW');

        await this.brandServices.profile.trackProfileView(
          req.validatedParams.brandId,
          {
            userAgent: req.headers['user-agent'],
            timestamp: new Date(),
            ipAddress: req.ip
          }
        );

        this.logAction(req, 'TRACK_BRAND_VIEW_SUCCESS', {
          brandId: req.validatedParams.brandId,
          manufacturerId: req.manufacturerId
        });

        return { message: 'Brand view tracked successfully' };
      });
    }, res, 'Brand view tracked successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/brands/:brandId/analytics
   * Get brand analytics
   */
  async getBrandAnalytics(req: GetBrandAnalyticsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'GET_BRAND_ANALYTICS');

      const analytics = await this.brandServices.profile.getPublicAnalytics(req.validatedParams.brandId);

      this.logAction(req, 'GET_BRAND_ANALYTICS_SUCCESS', {
        brandId: req.validatedParams.brandId,
        timeframe: req.validatedQuery.timeframe
      });

      return { analytics };
    }, res, 'Brand analytics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/brands/:brandId/connections
   * Get brand connections
   */
  async getBrandConnections(req: GetBrandConnectionsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'GET_BRAND_CONNECTIONS');

      const pagination = this.createPaginationMeta(
        req.validatedQuery.page || 1,
        req.validatedQuery.limit || 10,
        0 // Will be updated after query
      );

      // Get related brands instead of connections (service doesn't have getBrandConnections)
      const relatedBrands = await this.brandServices.profile.getRelatedBrands(
        req.validatedParams.brandId,
        {
          limit: req.validatedQuery.limit || 10
        }
      );

      const connections = {
        connections: relatedBrands,
        total: relatedBrands.length
      };

      // Update pagination with actual total
      const updatedPagination = this.createPaginationMeta(
        pagination.page,
        pagination.limit,
        connections.total
      );

      this.logAction(req, 'GET_BRAND_CONNECTIONS_SUCCESS', {
        brandId: req.validatedParams.brandId,
        type: req.validatedQuery.type,
        total: connections.total
      });

      this.sendPaginated(res, connections.connections, updatedPagination, 'Brand connections retrieved successfully', this.getRequestMeta(req));
    }, res);
  }

  /**
   * GET /api/brands/:brandId/recommendations
   * Get brand recommendations
   */
  async getBrandRecommendations(req: GetBrandRecommendationsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'GET_BRAND_RECOMMENDATIONS');

      // Get personalized recommendations for manufacturers (service doesn't have brand recommendations)
      const recommendations = await this.brandServices.profile.getPersonalizedRecommendations(
        req.validatedParams.brandId, // Using brandId as manufacturerId for now
        {
          type: req.validatedQuery.type || 'connections',
          limit: req.validatedQuery.limit || 10
        }
      );

      this.logAction(req, 'GET_BRAND_RECOMMENDATIONS_SUCCESS', {
        brandId: req.validatedParams.brandId,
        type: req.validatedQuery.type,
        recommendationCount: recommendations.length
      });

      return { recommendations };
    }, res, 'Brand recommendations retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/brands/trending
   * Get trending brands
   */
  async getTrendingBrands(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'GET_TRENDING_BRANDS');

      const trendingBrands = await this.brandServices.profile.getTrendingBrands({
        limit: 20
      });

      this.logAction(req, 'GET_TRENDING_BRANDS_SUCCESS', {
        count: trendingBrands.length
      });

      return { brands: trendingBrands };
    }, res, 'Trending brands retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/brands/featured
   * Get featured brands
   */
  async getFeaturedBrands(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'GET_FEATURED_BRANDS');

      const featuredBrands = await this.brandServices.profile.getFeaturedBrands({
        limit: 10
      });

      this.logAction(req, 'GET_FEATURED_BRANDS_SUCCESS', {
        count: featuredBrands.length
      });

      return { brands: featuredBrands };
    }, res, 'Featured brands retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/brands/search
   * Search brands
   */
  async searchBrands(req: BaseRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'SEARCH_BRANDS');

      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!query) {
        throw new Error('Search query is required');
      }

      const pagination = this.createPaginationMeta(page, limit, 0);

      // Get search results (service doesn't support pagination/filters)
      const allSearchResults = await this.brandServices.profile.searchBrandProfiles(query);
      
      // Apply client-side filtering and pagination
      let filteredResults = allSearchResults;
      
      if (req.query.industry) {
        filteredResults = filteredResults.filter(brand => 
          brand.businessName.toLowerCase().includes(req.query.industry as string)
        );
      }
      
      const total = filteredResults.length;
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      
      const searchResults = {
        brands: filteredResults.slice(startIndex, endIndex),
        total
      };

      // Update pagination with actual total
      const updatedPagination = this.createPaginationMeta(
        pagination.page,
        pagination.limit,
        searchResults.total
      );

      this.logAction(req, 'SEARCH_BRANDS_SUCCESS', {
        query,
        total: searchResults.total,
        page: pagination.page
      });

      this.sendPaginated(res, searchResults.brands, updatedPagination, 'Brand search completed successfully', this.getRequestMeta(req));
    }, res);
  }
}

// Export controller instance
export const brandProfileController = new BrandProfileController();
