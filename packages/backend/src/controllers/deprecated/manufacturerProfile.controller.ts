
// src/controllers/manufacturerProfile.controller.ts

import { Request, Response, NextFunction } from 'express';
import { UnifiedAuthRequest } from '../../middleware/deprecated/unifiedAuth.middleware';
import { ValidatedRequest } from '../../middleware/deprecated/validation.middleware';
import { asyncHandler, createAppError } from '../../middleware/deprecated/error.middleware';
import { getManufacturerProfileService } from '../../services/container.service';

// Initialize service via container
const manufacturerProfileService = getManufacturerProfileService();

/**
 * Extended request interfaces for type safety
 */
interface SearchRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  validatedQuery: {
    query?: string;
    industry?: string;
    services?: string[];
    minMoq?: number;
    maxMoq?: number;
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'industry' | 'moq' | 'profileCompleteness';
    sortOrder?: 'asc' | 'desc';
  };
}

interface ProfileDetailRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  validatedParams: { id: string };
}

/**
 * List all active manufacturer profiles (public endpoint for brands)
 * GET /api/manufacturer-profiles
 * 
 * @requires authentication (brand)
 * @optional query: search filters, pagination, sorting
 * @returns { manufacturers[], pagination, filters }
 */
export const listManufacturerProfiles = asyncHandler(async (
  req: SearchRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract search parameters from validated query
  const searchParams = req.validatedQuery || {};
  
  // Set default pagination
  const page = searchParams.page || 1;
  const limit = Math.min(searchParams.limit || 20, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  // Build search parameters
  const searchOptions = {
    ...searchParams,
    limit,
    offset
  };

  // Get manufacturer profiles through service
  const result = await manufacturerProfileService.searchManufacturers(searchOptions);

  // Return standardized response
  res.json({
    success: true,
    message: 'Manufacturer profiles retrieved successfully',
    data: {
      manufacturers: result.manufacturers,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page < Math.ceil(result.total / limit),
        hasPrev: page > 1
      },
      filters: {
        query: searchParams.query,
        industry: searchParams.industry,
        services: searchParams.services,
        moqRange: {
          min: searchParams.minMoq,
          max: searchParams.maxMoq
        }
      },
      aggregations: result.aggregations
    }
  });
});

/**
 * Get detailed manufacturer profile by ID
 * GET /api/manufacturer-profiles/:id
 * 
 * @requires authentication (brand)
 * @requires params: { id: string }
 * @returns { manufacturer, connectionStatus, analytics }
 */
export const getManufacturerProfile = asyncHandler(async (
  req: ProfileDetailRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract manufacturer ID from validated params
  const { id } = req.validatedParams;

  // Get detailed profile through service
  const manufacturer = await manufacturerProfileService.getManufacturerProfile(id);

  if (!manufacturer) {
    throw createAppError('Manufacturer profile not found', 404, 'MANUFACTURER_NOT_FOUND');
  }

  // Get additional context (connection status, etc.)
  const brandId = req.userId; // Authenticated brand ID
  const additionalData = await manufacturerProfileService.getProfileContext(id, brandId);

  // Return standardized response
  res.json({
    success: true,
    message: 'Manufacturer profile retrieved successfully',
    data: {
      manufacturer: {
        ...manufacturer,
        connectionStatus: additionalData.connectionStatus,
        canConnect: additionalData.canConnect,
        lastInteraction: additionalData.lastInteraction
      },
      analytics: additionalData.analytics,
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Get manufacturer profiles by industry
 * GET /api/manufacturer-profiles/industry/:industry
 * 
 * @requires authentication (brand)
 * @requires params: { industry: string }
 * @returns { manufacturers[], industryStats }
 */
export const getManufacturersByIndustry = asyncHandler(async (
  req: UnifiedAuthRequest & { params: { industry: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { industry } = req.params;

  if (!industry || industry.trim().length === 0) {
    throw createAppError('Industry parameter is required', 400, 'MISSING_INDUSTRY');
  }

  // Get manufacturers by industry through service
  const result = await manufacturerProfileService.getManufacturersByIndustry(industry);

  // Return standardized response
  res.json({
    success: true,
    message: `Manufacturers in ${industry} industry retrieved successfully`,
    data: {
      industry,
      manufacturers: result.manufacturers,
      stats: {
        total: result.manufacturers.length,
        verified: result.manufacturers.filter(m => m.isVerified).length,
        averageProfileCompleteness: result.averageCompleteness,
        topServices: result.topServices
      }
    }
  });
});

/**
 * Search manufacturers with advanced filters
 * POST /api/manufacturer-profiles/search
 * 
 * @requires authentication (brand)
 * @requires validation: advanced search criteria
 * @returns { manufacturers[], suggestions, savedSearch }
 */
export const advancedManufacturerSearch = asyncHandler(async (
  req: UnifiedAuthRequest & {
    validatedBody: {
      query?: string;
      industries?: string[];
      services?: string[];
      moqRange?: { min?: number; max?: number };
      location?: {
        country?: string;
        city?: string;
        radius?: number;
      };
      certifications?: string[];
      rating?: { min?: number };
      verified?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      saveSearch?: boolean;
      searchName?: string;
    };
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract search criteria from validated body
  const searchCriteria = req.validatedBody;
  const brandId = req.userId;

  // Perform advanced search through service
  const result = await manufacturerProfileService.advancedSearch(searchCriteria, brandId);

  // Save search if requested
  let savedSearchId;
  if (searchCriteria.saveSearch && searchCriteria.searchName) {
    savedSearchId = await manufacturerProfileService.saveSearch(
      brandId,
      searchCriteria.searchName,
      searchCriteria
    );
  }

  // Return standardized response
  res.json({
    success: true,
    message: 'Advanced search completed successfully',
    data: {
      manufacturers: result.manufacturers,
      total: result.total,
      suggestions: result.suggestions,
      filters: result.appliedFilters,
      searchId: savedSearchId,
      executionTime: result.executionTime
    }
  });
});

/**
 * Get featured/recommended manufacturers
 * GET /api/manufacturer-profiles/featured
 * 
 * @requires authentication (brand)
 * @optional query: { limit?: number, industry?: string }
 * @returns { featured[], criteria }
 */
export const getFeaturedManufacturers = asyncHandler(async (
  req: UnifiedAuthRequest & { query: { limit?: string; industry?: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit || '10'), 50);
  const industry = req.query.industry;
  const brandId = req.userId;

  // Get featured manufacturers through service
  const result = await manufacturerProfileService.getFeaturedManufacturers(brandId, {
    limit,
    industry
  });

  // Return standardized response
  res.json({
    success: true,
    message: 'Featured manufacturers retrieved successfully',
    data: {
      featured: result.manufacturers,
      criteria: result.selectionCriteria,
      personalized: result.isPersonalized,
      refreshedAt: new Date().toISOString()
    }
  });
});

/**
 * Get manufacturer profile statistics/analytics
 * GET /api/manufacturer-profiles/stats
 * 
 * @requires authentication (brand)
 * @returns { globalStats, industryBreakdown, trends }
 */
export const getManufacturerStats = asyncHandler(async (
  req: UnifiedAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get comprehensive manufacturer statistics
  const stats = await manufacturerProfileService.getManufacturerStatistics();

  // Return standardized response
  res.json({
    success: true,
    message: 'Manufacturer statistics retrieved successfully',
    data: {
      global: stats.globalStats,
      byIndustry: stats.industryBreakdown,
      trends: stats.trends,
      topServices: stats.topServices,
      averageMetrics: stats.averageMetrics,
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Compare multiple manufacturers
 * POST /api/manufacturer-profiles/compare
 * 
 * @requires authentication (brand)
 * @requires validation: { manufacturerIds: string[] }
 * @returns { comparison, recommendations }
 */
export const compareManufacturers = asyncHandler(async (
  req: UnifiedAuthRequest & { validatedBody: { manufacturerIds: string[] } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { manufacturerIds } = req.validatedBody;

  if (!manufacturerIds || manufacturerIds.length < 2) {
    throw createAppError('At least 2 manufacturer IDs required for comparison', 400, 'INSUFFICIENT_MANUFACTURERS');
  }

  if (manufacturerIds.length > 5) {
    throw createAppError('Maximum 5 manufacturers can be compared at once', 400, 'TOO_MANY_MANUFACTURERS');
  }

  // Perform comparison through service
  const comparison = await manufacturerProfileService.compareManufacturers(manufacturerIds);

  // Return standardized response
  res.json({
    success: true,
    message: 'Manufacturer comparison completed successfully',
    data: {
      manufacturers: comparison.manufacturers,
      comparison: comparison.comparisonMatrix,
      recommendations: comparison.recommendations,
      strengths: comparison.strengths,
      weaknesses: comparison.weaknesses,
      comparedAt: new Date().toISOString()
    }
  });
});
