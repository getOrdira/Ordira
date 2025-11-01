// src/controllers/brandProfile.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { UnifiedAuthRequest } from '../../middleware/deprecated/unifiedAuth.middleware';
import { ValidatedRequest } from '../../middleware/deprecated/validation.middleware';
import { trackManufacturerAction } from '../../middleware/deprecated/metrics.middleware';
import { BrandServices } from '../../services/brands';
import { isUnifiedAuthRequest, safeString } from '../../utils/typeGuards';

// Enhanced request interfaces
interface BrandProfileRequest extends Request, UnifiedAuthRequest, ValidatedRequest{
  params: {
    id?: string;
    brandId?: string;
    domain?: string;
    subdomain?: string;
  };
  query: {
    page?: string;
    limit?: string;
    industry?: string;
    location?: string;
    verified?: string;
    plan?: string;
    sortBy?: 'name' | 'created' | 'popularity' | 'relevance';
    sortOrder?: 'asc' | 'desc';
    search?: string;
    filters?: string;
    q?: string;
    timeframe?: string;
  };
}

interface ManufacturerViewRequest extends UnifiedAuthRequest, ValidatedRequest {
  params: {
    brandId: string;
  };
  headers: {
    'user-agent'?: string;
  };
}

// Using modular BrandServices from services/brands

/**
 * GET /api/brands
 * List brand profiles - matches service.listBrandProfiles()
 */
export async function listBrandProfiles(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Use modular service for listing brand profiles
    const profiles = await BrandServices.profile.listBrandProfiles();

    // Apply basic client-side filtering if search is provided
    let filteredProfiles = profiles;
    if (req.query.search) {
      const search = decodeURIComponent(req.query.search).toLowerCase();
      filteredProfiles = profiles.filter(profile => 
        profile.businessName.toLowerCase().includes(search)
      );
    }

    // Apply basic pagination
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20')));
    const offset = (page - 1) * limit;
    const paginatedProfiles = filteredProfiles.slice(offset, offset + limit);

    res.json({
      brands: paginatedProfiles,
      metadata: {
        totalResults: filteredProfiles.length,
        currentPage: page,
        totalPages: Math.ceil(filteredProfiles.length / limit),
        hasNextPage: page < Math.ceil(filteredProfiles.length / limit),
        hasPrevPage: page > 1,
        resultsPerPage: limit,
        searchPerformed: !!req.query.search
      }
    });
  } catch (error) {
    logger.error('List brand profiles error:', error);
    next(error);
  }
}

/**
 * GET /api/brands/:id
 * Get detailed brand profile - matches service.getBrandProfile()
 */
export async function getBrandProfile(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        error: 'Brand ID is required',
        code: 'MISSING_BRAND_ID'
      });
      return;
    }

    // Get basic brand profile from service
    const profile = await BrandServices.profile.getBrandProfile(id);

    // Get public analytics if available
    const publicAnalytics = await BrandServices.profile.getPublicAnalytics(id);

    // Get related brands with proper options
    const relatedBrands = await BrandServices.profile.getRelatedBrands(id, {
      limit: 5,
      similarity: 'industry'
    });

    // Track profile view with new signature
    await BrandServices.profile.trackProfileView(id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: {
        profile,
        analytics: publicAnalytics,
        relatedBrands
      },
      metadata: {
        viewTracked: true,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Get brand profile error:', error);
    if (error.statusCode === 404) {
      res.status(404).json({
        error: 'Brand profile not found',
        code: 'BRAND_NOT_FOUND'
      });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/brands/:brandId/manufacturer-view
 * Get brand profile from manufacturer perspective - matches service.getBrandProfileForManufacturer()
 */
export async function getBrandProfileForManufacturer(
  req: ManufacturerViewRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const manufacturerId = req.userId!;
    const { brandId } = req.params;

    // Get brand profile with manufacturer context
    const profile = await BrandServices.profile.getBrandProfileForManufacturer(brandId, manufacturerId);

    // Get compatibility score with new signature that returns object
    const compatibilityScore = await BrandServices.profile.calculateCompatibilityScore(
      brandId,
      manufacturerId
    );

    // Get connection opportunities with manufacturerId in options
    const opportunities = await BrandServices.profile.getConnectionOpportunities(brandId, {
      limit: 5,
      manufacturerId: manufacturerId
    });

    // Track manufacturer view
    trackManufacturerAction('view_brand_profile');

    res.json({
      brand: profile,
      compatibility: {
        score: compatibilityScore.score,
        factors: compatibilityScore.factors,
        recommendations: compatibilityScore.recommendations
      },
      opportunities,
      nextSteps: getManufacturerNextSteps('none') // Default to 'none' since we don't have connection status
    });
  } catch (error) {
    logger.error('Get brand profile for manufacturer error:', error);
    if (error.statusCode === 404) {
      res.status(404).json({
        error: 'Brand profile not found',
        code: 'BRAND_NOT_FOUND'
      });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/brands/featured
 * Get featured brand profiles - matches service methods
 */
export async function getFeaturedBrands(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { limit = '10' } = req.query;
    const limitNum = Math.min(20, Math.max(1, parseInt(limit)));

    // Get featured brands using available service methods
    const [featuredBrands, trendingBrands, newestBrands, spotlightBrand, featuredCategories] = await Promise.all([
      BrandServices.profile.getFeaturedBrands({ limit: limitNum }),
      BrandServices.profile.getTrendingBrands({ limit: limitNum }),
      BrandServices.profile.getNewestBrands({ limit: limitNum }),
      BrandServices.profile.getSpotlightBrand(),
      BrandServices.profile.getFeaturedCategories()
    ]);

    res.json({
      featured: featuredBrands,
      trending: trendingBrands,
      newest: newestBrands,
      spotlight: spotlightBrand,
      categories: featuredCategories
    });
  } catch (error) {
    logger.error('Get featured brands error:', error);
    next(error);
  }
}

/**
 * GET /api/brands/search/suggestions
 * Get search suggestions - matches service.getSearchSuggestions()
 */
export async function getSearchSuggestions(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { q: query } = req.query;

    if (!query || query.length < 2) {
      res.status(400).json({
        error: 'Query must be at least 2 characters long',
        code: 'QUERY_TOO_SHORT'
      });
      return;
    }

    // Get search suggestions from service
    const suggestions = await BrandServices.profile.getSearchSuggestions(query as string);

    // Get popular and trending terms
    const [popularTerms, trendingTerms] = await Promise.all([
      BrandServices.profile.getPopularSearchTerms(),
      BrandServices.profile.getTrendingSearchTerms()
    ]);

    res.json({
      query,
      suggestions,
      popular: popularTerms,
      trending: trendingTerms
    });
  } catch (error) {
    logger.error('Get search suggestions error:', error);
    next(error);
  }
}

/**
 * GET /api/brands/analytics/public
 * Get public analytics - matches service.getEcosystemAnalytics()
 */
export async function getPublicBrandAnalytics(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { timeframe = '30d' } = req.query;

    // Get ecosystem analytics from service
    const analytics = await BrandServices.profile.getEcosystemAnalytics({ timeframe });

    res.json({
      timeframe,
      analytics,
      lastUpdated: new Date()
    });
  } catch (error) {
    logger.error('Get public brand analytics error:', error);
    next(error);
  }
}

/**
 * POST /api/brands/:brandId/report
 * Report brand - matches service.createBrandReport()
 */
export async function reportBrand(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id: brandId } = req.params;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const { reason, description, evidence } = req.validatedBody;

    if (!brandId) {
      res.status(400).json({
        error: 'Brand ID is required',
        code: 'MISSING_BRAND_ID'
      });
      return;
    }

    // Create report using service
    const report = await BrandServices.profile.createBrandReport(brandId, {
      reason,
      description,
      evidence,
      reportedBy: isUnifiedAuthRequest(req) ? safeString(req.userId, 'anonymous') : 'anonymous',
      reportMetadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      }
    });

    res.status(201).json({
      success: true,
      report: {
        id: report.id || 'generated',
        status: 'submitted',
        submittedAt: report.generatedAt
      },
      message: 'Report submitted successfully. Our team will review it within 24 hours.'
    });
  } catch (error) {
    logger.error('Report brand error:', error);
    next(error);
  }
}

/**
 * GET /api/brands/recommendations
 * Get personalized recommendations - matches service.getPersonalizedRecommendations()
 */
export async function getBrandRecommendations(
  req: UnifiedAuthRequest & ValidatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const manufacturerId = req.userId!;
    const { limit = '10', industry, location } = req.query;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

    // Get personalized recommendations from service
    const recommendations = await BrandServices.profile.getPersonalizedRecommendations(manufacturerId, {
      type: 'brand_partnership',
      limit: limitNum
    });

    // Track recommendation view
    trackManufacturerAction('view_brand_recommendations');

    res.json({
      recommendations,
      filters: {
        appliedIndustry: industry,
        appliedLocation: location
      },
      metadata: {
        totalRecommendations: recommendations.length,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    logger.error('Get brand recommendations error:', error);
    next(error);
  }
}

/**
 * POST /api/brands/recommendations/feedback
 * Provide feedback on recommendations - matches service.recordRecommendationFeedback()
 */
export async function provideBrandRecommendationFeedback(
  req: UnifiedAuthRequest & ValidatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const manufacturerId = req.userId!;
    if (!req.validatedBody) {
      res.status(400).json({ error: 'Request validation required - missing validatedBody', code: 'VALIDATION_REQUIRED' });
      return;
    }
    const { brandId, feedback, rating, reason } = req.validatedBody;

    // Record feedback using service
    await BrandServices.profile.recordRecommendationFeedback(manufacturerId, brandId, {
      feedback,
      rating,
      reason,
      providedAt: new Date()
    });

    // Track feedback provision
    trackManufacturerAction('provide_recommendation_feedback');

    res.json({
      success: true,
      message: 'Feedback recorded successfully. This helps improve future recommendations.',
      impact: 'Your feedback will be reflected in recommendations within 24 hours'
    });
  } catch (error) {
    logger.error('Provide recommendation feedback error:', error);
    next(error);
  }
}

/**
 * GET /api/brands/search
 * Search brand profiles - matches service.searchBrandProfiles()
 */
export async function searchBrandProfiles(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { search } = req.query;

    if (!search) {
      res.status(400).json({
        error: 'Search query is required',
        code: 'MISSING_SEARCH_QUERY'
      });
      return;
    }

    // Search using service method
    const results = await BrandServices.profile.searchBrandProfiles(search as string);

    res.json({
      query: search,
      results,
      totalResults: results.length
    });
  } catch (error) {
    logger.error('Search brand profiles error:', error);
    next(error);
  }
}

/**
 * GET /api/brands/subdomain/:subdomain
 * Get brand by subdomain - matches service.getBrandProfileBySubdomain()
 */
export async function getBrandBySubdomain(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { subdomain } = req.params;

    if (!subdomain) {
      res.status(400).json({
        error: 'Subdomain is required',
        code: 'MISSING_SUBDOMAIN'
      });
      return;
    }

    const profile = await BrandServices.profile.getBrandProfileBySubdomain(subdomain);

    if (!profile) {
      res.status(404).json({
        error: 'Brand not found for subdomain',
        code: 'BRAND_NOT_FOUND'
      });
      return;
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    logger.error('Get brand by subdomain error:', error);
    next(error);
  }
}

/**
 * GET /api/brands/domain/:domain
 * Get brand by custom domain - matches service.getBrandProfileByCustomDomain()
 */
export async function getBrandByCustomDomain(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { domain } = req.params;

    if (!domain) {
      res.status(400).json({
        error: 'Domain is required',
        code: 'MISSING_DOMAIN'
      });
      return;
    }

    const profile = await BrandServices.profile.getBrandProfileByCustomDomain(domain);

    if (!profile) {
      res.status(404).json({
        error: 'Brand not found for domain',
        code: 'BRAND_NOT_FOUND'
      });
      return;
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    logger.error('Get brand by custom domain error:', error);
    next(error);
  }
}

// Helper functions
function getManufacturerNextSteps(connectionStatus: string): string[] {
  switch (connectionStatus) {
    case 'none':
      return [
        'Review brand requirements and preferences',
        'Prepare your portfolio and service offerings',
        'Submit a personalized connection request'
      ];
    case 'pending':
      return [
        'Wait for brand to review your request',
        'Check your notifications for updates',
        'Prepare for potential follow-up questions'
      ];
    case 'connected':
      return [
        'Explore available project opportunities',
        'Maintain regular communication with brand',
        'Deliver high-quality work consistently'
      ];
    case 'rejected':
      return [
        'Review rejection feedback if provided',
        'Improve your profile and offerings',
        'Consider reapplying after improvements'
      ];
    default:
      return ['Contact support for guidance'];
  }
}
