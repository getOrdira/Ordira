// src/controllers/brandProfile.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { BrandProfileService } from '../services/business/brandProfile.service';
import { AnalyticsBusinessService } from '../services/business/analytics.service';
import { ManufacturerService } from '../services/business/manufacturer.service';

// Enhanced request interfaces
interface BrandProfileRequest extends Request, ValidatedRequest {
  params: {
    id?: string;
    brandId?: string;
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
  };
}

interface ManufacturerViewRequest extends AuthRequest, ValidatedRequest {
  params: {
    brandId: string;
  };
  headers: {
    'user-agent'?: string;
  };
}

// Initialize services
const brandProfileService = new BrandProfileService();
const analyticsService = new AnalyticsBusinessService();
const manufacturerService = new ManufacturerService();

/**
 * GET /api/brands
 * List brand profiles with enhanced filtering and search
 */
export async function listBrandProfiles(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      page = '1',
      limit = '20',
      industry,
      location,
      verified,
      plan,
      sortBy = 'relevance',
      sortOrder = 'desc',
      search,
      filters
    } = req.query;

    // Parse and validate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Build comprehensive filter options
    const filterOptions = {
      industry: industry ? decodeURIComponent(industry) : undefined,
      location: location ? decodeURIComponent(location) : undefined,
      verified: verified === 'true',
      plan: plan as string,
      search: search ? decodeURIComponent(search) : undefined,
      customFilters: filters ? JSON.parse(decodeURIComponent(filters)) : {},
      pagination: {
        offset,
        limit: limitNum
      },
      sorting: {
        field: sortBy,
        order: sortOrder as 'asc' | 'desc'
      }
    };

    // Get enhanced brand profiles with metadata
    const result = await brandProfileService.getEnhancedBrandProfiles(filterOptions);

    // Add discovery metadata
    const metadata = {
      totalResults: result.total,
      currentPage: pageNum,
      totalPages: Math.ceil(result.total / limitNum),
      hasNextPage: pageNum < Math.ceil(result.total / limitNum),
      hasPrevPage: pageNum > 1,
      resultsPerPage: limitNum,
      filtersApplied: Object.keys(filterOptions).filter(key => 
        filterOptions[key as keyof typeof filterOptions] !== undefined
      ).length,
      searchPerformed: !!search
    };

    // Get aggregated statistics for the current filter set
    const aggregations = await brandProfileService.getBrandAggregations(filterOptions);

    res.json({
      brands: result.profiles,
      metadata,
      aggregations: {
        industryDistribution: aggregations.industries,
        locationDistribution: aggregations.locations,
        planDistribution: aggregations.plans,
        verificationStats: aggregations.verification
      },
      suggestions: search ? await brandProfileService.getSearchSuggestions(search) : null,
      filters: {
        availableIndustries: aggregations.availableIndustries,
        availableLocations: aggregations.availableLocations,
        availablePlans: ['foundation', 'growth', 'premium', 'enterprise']
      }
    });
  } catch (error) {
    console.error('List brand profiles error:', error);
    next(error);
  }
}

/**
 * GET /api/brands/:id
 * Get detailed brand profile with comprehensive information
 */
export async function getBrandProfile(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Brand ID is required',
        code: 'MISSING_BRAND_ID'
      });
    }

    // Get comprehensive brand profile
    const profile = await brandProfileService.getDetailedBrandProfile(id);

    if (!profile) {
      return res.status(404).json({
        error: 'Brand profile not found',
        code: 'BRAND_NOT_FOUND'
      });
    }

    // Get public analytics (non-sensitive data)
    const publicAnalytics = await brandProfileService.getPublicAnalytics(id);

    // Get related brands and recommendations
    const relatedBrands = await brandProfileService.getRelatedBrands(id, {
      limit: 5,
      similarity: 'industry'
    });

    // Track profile view for analytics
    await brandProfileService.trackProfileView(id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer,
      timestamp: new Date()
    });

    // Calculate engagement score
    const engagementScore = calculateEngagementScore(profile, publicAnalytics);

    res.json({
      brand: {
        ...profile,
        engagementScore,
        trustScore: calculateTrustScore(profile),
        responseTime: profile.averageResponseTime,
        lastActive: profile.lastActiveAt
      },
      analytics: {
        public: publicAnalytics,
        summary: {
          profileViews: publicAnalytics.views,
          connectionRequests: publicAnalytics.connectionRequests,
          successfulConnections: publicAnalytics.successfulConnections,
          averageRating: publicAnalytics.averageRating
        }
      },
      related: {
        similarBrands: relatedBrands,
        industryPeers: await brandProfileService.getIndustryPeers(id, 3)
      },
      interaction: {
        canConnect: true,
        connectionProcess: getConnectionProcess(),
        estimatedResponseTime: profile.averageResponseTime || '24-48 hours'
      }
    });
  } catch (error) {
    console.error('Get brand profile error:', error);
    next(error);
  }
}

/**
 * GET /api/brands/:brandId/manufacturer-view
 * Get brand profile from manufacturer perspective with connection info
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
    const profile = await brandProfileService.getBrandProfileForManufacturer(brandId, manufacturerId);

    if (!profile) {
      return res.status(404).json({
        error: 'Brand profile not found',
        code: 'BRAND_NOT_FOUND'
      });
    }

    // Check connection status
    const connectionStatus = await manufacturerService.getConnectionStatus(manufacturerId, brandId);

    // Get manufacturer's compatibility score with this brand
    const compatibilityScore = await brandProfileService.calculateCompatibilityScore(
      brandId,
      manufacturerId
    );

    // Track manufacturer view
    trackManufacturerAction('view_brand_profile');

    res.json({
      brand: profile,
      connection: {
        status: connectionStatus.status,
        connectedAt: connectionStatus.connectedAt,
        canConnect: connectionStatus.status === 'none',
        connectionHistory: connectionStatus.history
      },
      compatibility: {
        score: compatibilityScore.score,
        factors: compatibilityScore.factors,
        recommendations: compatibilityScore.recommendations
      },
      opportunities: await brandProfileService.getConnectionOpportunities(brandId, manufacturerId),
      nextSteps: getManufacturerNextSteps(connectionStatus.status)
    });
  } catch (error) {
    console.error('Get brand profile for manufacturer error:', error);
    next(error);
  }
}

/**
 * POST /api/brands/:brandId/connect
 * Initiate connection request from manufacturer to brand
 */
export async function initiateConnection(
  req: ManufacturerViewRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const manufacturerId = req.userId!;
    const { brandId } = req.params;
    const { message, services, portfolio } = req.validatedBody || req.body;

    // Verify manufacturer can connect to this brand
    const canConnect = await manufacturerService.canConnectToBrand(manufacturerId, brandId);
    if (!canConnect.allowed) {
      return res.status(400).json({
        error: 'Cannot connect to this brand',
        reason: canConnect.reason,
        code: 'CONNECTION_NOT_ALLOWED'
      });
    }

    // Create connection request
    const connectionRequest = await manufacturerService.createConnectionRequest(manufacturerId, brandId, {
      message,
      services,
      portfolio,
      requestSource: 'brand_profile',
      requestMetadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      }
    });

    // Track connection request
    trackManufacturerAction('request_brand_connection');

    // Send notification to brand
    await brandProfileService.notifyBrandOfConnectionRequest(brandId, connectionRequest);

    res.status(201).json({
      success: true,
      connectionRequest: {
        id: connectionRequest.id,
        status: connectionRequest.status,
        submittedAt: connectionRequest.createdAt,
        estimatedResponseTime: '3-5 business days'
      },
      nextSteps: [
        'Brand will review your connection request',
        'You will receive notification when brand responds',
        'Check your dashboard for updates'
      ],
      message: 'Connection request sent successfully'
    });
  } catch (error) {
    console.error('Initiate connection error:', error);
    next(error);
  }
}

/**
 * GET /api/brands/featured
 * Get featured brand profiles with special highlighting
 */
export async function getFeaturedBrands(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { limit = '10' } = req.query;
    const limitNum = Math.min(20, Math.max(1, parseInt(limit)));

    // Get featured brands based on various criteria
    const featuredBrands = await brandProfileService.getFeaturedBrands({
      limit: limitNum,
      criteria: [
        'high_engagement',
        'verified_status',
        'premium_plan',
        'active_connections'
      ]
    });

    // Get trending brands
    const trendingBrands = await brandProfileService.getTrendingBrands(limitNum);

    // Get newest brands
    const newestBrands = await brandProfileService.getNewestBrands(limitNum);

    res.json({
      featured: featuredBrands,
      trending: trendingBrands,
      newest: newestBrands,
      spotlight: await brandProfileService.getSpotlightBrand(),
      categories: await brandProfileService.getFeaturedCategories()
    });
  } catch (error) {
    console.error('Get featured brands error:', error);
    next(error);
  }
}

/**
 * GET /api/brands/search/suggestions
 * Get search suggestions for brand discovery
 */
export async function getSearchSuggestions(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { q: query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        error: 'Query must be at least 2 characters long',
        code: 'QUERY_TOO_SHORT'
      });
    }

    // Get comprehensive search suggestions
    const suggestions = await brandProfileService.getSearchSuggestions(query as string);

    res.json({
      query,
      suggestions: {
        brands: suggestions.brandSuggestions,
        industries: suggestions.industrySuggestions,
        locations: suggestions.locationSuggestions,
        services: suggestions.serviceSuggestions
      },
      popular: await brandProfileService.getPopularSearchTerms(),
      trending: await brandProfileService.getTrendingSearchTerms()
    });
  } catch (error) {
    console.error('Get search suggestions error:', error);
    next(error);
  }
}

/**
 * GET /api/brands/analytics/public
 * Get public analytics and insights about the brand ecosystem
 */
export async function getPublicBrandAnalytics(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { timeframe = '30d' } = req.query;

    // Get public ecosystem analytics
    const analytics = await brandProfileService.getEcosystemAnalytics(timeframe as string);

    res.json({
      timeframe,
      ecosystem: {
        totalBrands: analytics.totalBrands,
        activeBrands: analytics.activeBrands,
        newBrandsThisPeriod: analytics.newBrands,
        verifiedBrands: analytics.verifiedBrands
      },
      growth: {
        brandGrowthRate: analytics.brandGrowthRate,
        connectionGrowthRate: analytics.connectionGrowthRate,
        engagementTrends: analytics.engagementTrends
      },
      distribution: {
        industryBreakdown: analytics.industryDistribution,
        locationBreakdown: analytics.locationDistribution,
        planDistribution: analytics.planDistribution
      },
      insights: generateEcosystemInsights(analytics),
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Get public brand analytics error:', error);
    next(error);
  }
}

/**
 * POST /api/brands/:brandId/report
 * Report inappropriate content or behavior
 */
export async function reportBrand(
  req: BrandProfileRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id: brandId } = req.params;
    const { reason, description, evidence } = req.validatedBody || req.body;

    if (!brandId) {
      return res.status(400).json({
        error: 'Brand ID is required',
        code: 'MISSING_BRAND_ID'
      });
    }

    // Create report with tracking
    const report = await brandProfileService.createBrandReport(brandId, {
      reason,
      description,
      evidence,
      reportedBy: (req as any).userId || 'anonymous',
      reportMetadata: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      }
    });

    // Log report for admin review
    console.log(`Brand reported: ${brandId} - Reason: ${reason}`);

    res.status(201).json({
      success: true,
      report: {
        id: report.id,
        status: 'submitted',
        submittedAt: report.createdAt
      },
      message: 'Report submitted successfully. Our team will review it within 24 hours.',
      reference: report.id
    });
  } catch (error) {
    console.error('Report brand error:', error);
    next(error);
  }
}

/**
 * GET /api/brands/recommendations
 * Get personalized brand recommendations for manufacturers
 */
export async function getBrandRecommendations(
  req: AuthRequest & ValidatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const manufacturerId = req.userId!;
    const { limit = '10', industry, location } = req.query;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

    // Get personalized recommendations
    const recommendations = await brandProfileService.getPersonalizedRecommendations(manufacturerId, {
      limit: limitNum,
      industryFilter: industry as string,
      locationFilter: location as string,
      includeReasonings: true
    });

    // Track recommendation view
    trackManufacturerAction('view_brand_recommendations');

    res.json({
      recommendations: recommendations.brands,
      reasoning: recommendations.reasoning,
      filters: {
        appliedIndustry: industry,
        appliedLocation: location
      },
      metadata: {
        totalRecommendations: recommendations.total,
        algorithmsUsed: recommendations.algorithms,
        lastUpdated: recommendations.lastUpdated
      },
      actions: {
        refreshRecommendations: '/api/brands/recommendations?refresh=true',
        provideFeedback: '/api/brands/recommendations/feedback'
      }
    });
  } catch (error) {
    console.error('Get brand recommendations error:', error);
    next(error);
  }
}

/**
 * POST /api/brands/recommendations/feedback
 * Provide feedback on brand recommendations to improve algorithm
 */
export async function provideBrandRecommendationFeedback(
  req: AuthRequest & ValidatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const manufacturerId = req.userId!;
    const { brandId, feedback, rating, reason } = req.validatedBody || req.body;

    // Record feedback for algorithm improvement
    await brandProfileService.recordRecommendationFeedback(manufacturerId, {
      brandId,
      feedback, // 'positive', 'negative', 'neutral'
      rating, // 1-5
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
    console.error('Provide recommendation feedback error:', error);
    next(error);
  }
}

// Helper functions
function calculateEngagementScore(profile: any, analytics: any): number {
  const factors = [
    analytics.views || 0,
    analytics.connectionRequests || 0,
    analytics.responseRate || 0,
    profile.completeness || 0
  ];

  // Weighted calculation
  const weights = [0.2, 0.3, 0.3, 0.2];
  const normalizedFactors = factors.map((factor, index) => {
    const maxValues = [1000, 100, 1, 1]; // Normalization maximums
    return Math.min(factor / maxValues[index], 1);
  });

  const score = normalizedFactors.reduce((sum, factor, index) => 
    sum + (factor * weights[index]), 0
  );

  return Math.round(score * 100);
}

function calculateTrustScore(profile: any): number {
  let score = 0;
  
  // Verification adds 40 points
  if (profile.isVerified) score += 40;
  
  // Profile completeness adds up to 30 points
  score += (profile.completeness || 0) * 0.3;
  
  // Plan level adds points
  const planScores = { foundation: 5, growth: 10, premium: 15, enterprise: 20 };
  score += planScores[profile.plan as keyof typeof planScores] || 0;
  
  // Age of account adds up to 10 points
  if (profile.createdAt) {
    const monthsOld = Math.min(12, 
      (Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    score += monthsOld * (10 / 12);
  }

  return Math.round(Math.min(100, score));
}

function getConnectionProcess(): string[] {
  return [
    'Submit connection request with your services and portfolio',
    'Brand reviews your profile and request',
    'Brand responds within 3-5 business days',
    'If approved, you gain access to brand features',
    'Start collaborating on projects and opportunities'
  ];
}

function getManufacturerNextSteps(connectionStatus: string): string[] {
  switch (connectionStatus) {
    case 'none':
      return [
        'Review brand requirements and preferences',
        'Prepare your portfolio and service offerings',
        'Submit a personalized connection request',
        'Follow up if no response within a week'
      ];
    case 'pending':
      return [
        'Wait for brand to review your request',
        'Check your notifications for updates',
        'Prepare for potential follow-up questions',
        'Review brand requirements while waiting'
      ];
    case 'connected':
      return [
        'Explore available project opportunities',
        'Maintain regular communication with brand',
        'Deliver high-quality work consistently',
        'Build long-term partnership relationship'
      ];
    case 'rejected':
      return [
        'Review rejection feedback if provided',
        'Improve your profile and offerings',
        'Consider reapplying after improvements',
        'Explore other similar brands'
      ];
    default:
      return ['Contact support for guidance'];
  }
}

function generateEcosystemInsights(analytics: any): string[] {
  const insights: string[] = [];
  
  if (analytics.brandGrowthRate > 10) {
    insights.push('Brand ecosystem is experiencing rapid growth');
  }
  
  if (analytics.verifiedBrands / analytics.totalBrands > 0.7) {
    insights.push('High verification rate indicates quality ecosystem');
  }
  
  if (analytics.connectionGrowthRate > analytics.brandGrowthRate) {
    insights.push('Manufacturer-brand connections are accelerating');
  }
  
  const topIndustry = Object.keys(analytics.industryDistribution)[0];
  if (topIndustry) {
    insights.push(`${topIndustry} is the most popular industry`);
  }
  
  return insights;
}
