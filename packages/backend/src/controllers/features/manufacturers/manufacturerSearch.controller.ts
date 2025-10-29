// src/controllers/features/manufacturers/manufacturerSearch.controller.ts
// Manufacturer search controller using modular manufacturer services

import { Response, NextFunction } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { manufacturerSearchService } from '../../../services/manufacturers/features/search.service';

/**
 * Manufacturer search request interfaces
 */
interface AdvancedSearchRequest extends BaseRequest {
  validatedBody: {
    name?: string;
    industry?: string;
    location?: string;
    verificationStatus?: 'verified' | 'pending' | 'unverified';
    size?: 'small' | 'medium' | 'large' | 'enterprise';
    establishedYear?: { min?: number; max?: number };
    certifications?: string[];
    productCategories?: string[];
    sustainabilityRating?: { min?: number; max?: number };
    revenueRange?: { min?: number; max?: number };
    employeeCount?: { min?: number; max?: number };
    supplyChainCompliance?: boolean;
    hasBlockchainIntegration?: boolean;
    geolocation?: {
      lat: number;
      lng: number;
      radius: number;
    };
  };
  validatedQuery?: {
    sortBy?: 'relevance' | 'name' | 'establishedYear' | 'verificationStatus' | 'sustainabilityRating' | 'distance';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    includeInactive?: boolean;
    fuzzySearch?: boolean;
    highlightMatches?: boolean;
  };
}

interface CompareManufacturersRequest extends BaseRequest {
  validatedBody: {
    manufacturerIds: string[];
    criteria?: {
      financialMetrics?: boolean;
      sustainabilityScores?: boolean;
      productPortfolio?: boolean;
      certifications?: boolean;
      supplyChainMetrics?: boolean;
      customerSatisfaction?: boolean;
      innovationIndex?: boolean;
    };
  };
}

interface GetTrendAnalysisRequest extends BaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
  validatedQuery: {
    metric: string;
    timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  };
}

interface GetIndustryBenchmarksRequest extends BaseRequest {
  validatedQuery: {
    industry: string;
  };
}

/**
 * Manufacturer search controller
 */
export class ManufacturerSearchController extends BaseController {
  private searchService = manufacturerSearchService;

  /**
   * POST /api/manufacturers/search/advanced
   * Advanced search manufacturers
   */
  async advancedSearch(req: AdvancedSearchRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'ADVANCED_MANUFACTURER_SEARCH');

        const filters = this.sanitizeInput(req.validatedBody);
        const options = {
          sortBy: req.validatedQuery?.sortBy || 'relevance',
          sortOrder: req.validatedQuery?.sortOrder || 'desc',
          page: req.validatedQuery?.page || 1,
          limit: req.validatedQuery?.limit || 20,
          includeInactive: req.validatedQuery?.includeInactive || false,
          fuzzySearch: req.validatedQuery?.fuzzySearch || false,
          highlightMatches: req.validatedQuery?.highlightMatches || false
        };

        const searchResult = await this.searchService.advancedSearch(filters, options);

        this.logAction(req, 'ADVANCED_MANUFACTURER_SEARCH_SUCCESS', {
          businessId: req.businessId,
          filters: Object.keys(filters),
          options: Object.keys(options),
          total: searchResult.total,
          resultsCount: searchResult.results.length,
          searchTime: searchResult.searchTime
        });

        return searchResult;
      });
    }, res, 'Advanced manufacturer search completed successfully', this.getRequestMeta(req));
  }

  /**
   * POST /api/manufacturers/compare
   * Compare manufacturers
   */
  async compareManufacturers(req: CompareManufacturersRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'COMPARE_MANUFACTURERS');

        const sanitizedCriteria = this.sanitizeInput(req.validatedBody.criteria || {});

        const comparison = await this.searchService.compareManufacturers(
          req.validatedBody.manufacturerIds,
          sanitizedCriteria
        );

        this.logAction(req, 'COMPARE_MANUFACTURERS_SUCCESS', {
          businessId: req.businessId,
          manufacturerIds: req.validatedBody.manufacturerIds,
          criteria: Object.keys(sanitizedCriteria),
          manufacturersCount: comparison.manufacturers.length,
          insightsCount: comparison.insights.length
        });

        return comparison;
      });
    }, res, 'Manufacturer comparison completed successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/:manufacturerId/trend-analysis
   * Get trend analysis
   */
  async getTrendAnalysis(req: GetTrendAnalysisRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_TREND_ANALYSIS');

        const trendAnalysis = await this.searchService.getTrendAnalysis(
          req.validatedParams.manufacturerId,
          req.validatedQuery.metric,
          req.validatedQuery.timeframe
        );

        this.logAction(req, 'GET_TREND_ANALYSIS_SUCCESS', {
          businessId: req.businessId,
          manufacturerId: req.validatedParams.manufacturerId,
          metric: req.validatedQuery.metric,
          timeframe: req.validatedQuery.timeframe,
          dataPoints: trendAnalysis.data.length,
          trend: trendAnalysis.trend,
          forecastPoints: trendAnalysis.forecast?.length || 0
        });

        return { trendAnalysis };
      });
    }, res, 'Trend analysis retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * GET /api/manufacturers/benchmarks/industry
   * Get industry benchmarks
   */
  async getIndustryBenchmarks(req: GetIndustryBenchmarksRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        this.recordPerformance(req, 'GET_INDUSTRY_BENCHMARKS');

        const benchmark = await this.searchService.getIndustryBenchmarks(req.validatedQuery.industry);

        this.logAction(req, 'GET_INDUSTRY_BENCHMARKS_SUCCESS', {
          businessId: req.businessId,
          industry: req.validatedQuery.industry,
          sampleSize: benchmark.sampleSize,
          metricsCount: Object.keys(benchmark.metrics).length,
          lastUpdated: benchmark.lastUpdated
        });

        return { benchmark };
      });
    }, res, 'Industry benchmarks retrieved successfully', this.getRequestMeta(req));
  }
}

// Export controller instance
export const manufacturerSearchController = new ManufacturerSearchController();
