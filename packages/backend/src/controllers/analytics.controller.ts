// src/controllers/analytics.controller.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { getServices } from '../services/container.service';
import { trackManufacturerAction } from '../middleware/metrics.middleware';

// Enhanced request interfaces
interface AnalyticsRequest extends Request, UnifiedAuthRequest, TenantRequest, ValidatedRequest {
  query: {
    timeframe?: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
    groupBy?: 'hour' | 'day' | 'week' | 'month';
    metrics?: string[];
    startDate?: string;
    endDate?: string;
    // Add the missing properties
    format?: 'csv' | 'json' | 'pdf';
    type?: 'votes' | 'transactions' | 'certificates' | 'products' | 'engagement';
    sortBy?: string;
    limit?: string;
  };
}

interface ManufacturerAnalyticsRequest extends Request, UnifiedAuthRequest, ValidatedRequest {
  params: {
    brandId?: string;
  };
  query: {
    timeframe?: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
    brandId?: string;
    metrics?: string[];
  };
}

// Services are now injected via container

/**
 * GET /api/analytics/votes
 * Get voting analytics for the authenticated brand with enhanced filtering
 */
export async function getVotesAnalytics(
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const { analytics: analyticsService } = getServices();

    // Validate tenant and business context
    if (!req.tenant?.business) {
       res.status(400).json({
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const businessId = req.tenant.business.toString();
    const { timeframe = '30d', groupBy = 'day', metrics, startDate, endDate } = req.query;

    // Build analytics options from query parameters
    const options = {
      timeframe,
      groupBy,
      metrics: metrics || ['total_votes', 'participation_rate', 'proposal_success_rate'],
      dateRange: startDate && endDate ? { startDate, endDate } : undefined
    };

    // Get comprehensive voting analytics
    const data = await analyticsService.getVotingAnalytics(businessId);

    // Add metadata for better client-side handling
    const response = {
      ...data,
      metadata: {
        businessId,
        timeframe,
        groupBy,
        generatedAt: new Date().toISOString(),
        dataPoints: data.timeSeries?.length || 0
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Votes analytics error:', error);
    next(error);
  }
}

/**
 * GET /api/analytics/transactions
 * Get transaction analytics with enhanced business insights
 */
export async function getTransactionsAnalytics(
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const { analytics: analyticsService } = getServices();

    if (!req.tenant?.business) {
       res.status(400).json({ 
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      })
      return;
    }

    const businessId = req.tenant.business.toString();
    const { timeframe = '30d', groupBy = 'day', metrics } = req.query;

    // Enhanced transaction analytics with business intelligence
    const options = {
      timeframe,
      groupBy,
      metrics: metrics || ['volume', 'count', 'avg_value', 'revenue'],
      includeTrends: true,
      includeComparisons: true
    };

    const data = await analyticsService.getTransactionAnalytics(businessId);

    // Calculate additional business metrics
    const enhancedData = {
  ...data,
  insights: {
    growthRate: data.trends?.volumeGrowth ?? 0,
    averageTransactionValue: data.summary?.totalVolume && data.summary?.totalCount 
      ? data.summary.totalVolume / data.summary.totalCount 
      : 0,
    peakTransactionDay: data.timeSeries?.reduce((peak, current) => 
      current.count > peak.count ? current : peak
    ) ?? null,
    recommendations: analyticsService.generateBusinessRecommendations(data)
  },
  metadata: {
    businessId,
    timeframe,
    groupBy,
    generatedAt: new Date().toISOString()
  }
};

    res.json(enhancedData);
  } catch (error) {
    logger.error('Transaction analytics error:', error);
    next(error);
  }
}

/**
 * GET /api/analytics/proposals/:proposalId
 * Get analytics for specific proposal/selection round
 */
export async function getProposalAnalytics(
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const { analytics: analyticsService } = getServices();

    if (!req.tenant?.business) {
      res.status(400).json({ 
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const businessId = req.tenant.business.toString();
    const { proposalId } = req.params;
    const { timeframe = '30d', groupBy = 'day' } = req.query;

    if (!proposalId) {
      res.status(400).json({ 
        error: 'Proposal ID is required',
        code: 'MISSING_PROPOSAL_ID'
      });
      return;
    }

    // Get comprehensive proposal analytics including product selections
    const analytics = await analyticsService.getProposalAnalytics(businessId, proposalId, {
      timeframe,
      groupBy,
      includeProductBreakdown: true,
      includeVoterInsights: true
    });

    const response = {
      ...analytics,
      metadata: {
        businessId,
        proposalId,
        timeframe,
        groupBy,
        generatedAt: new Date().toISOString()
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Proposal analytics error:', error);
    next(error);
  }
}

/**
 * GET /api/analytics/products
 * Get general product analytics for product selection voting
 */
export async function getProductAnalytics(
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const { analytics: analyticsService } = getServices();

    if (!req.tenant?.business) {
      res.status(400).json({ 
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const businessId = req.tenant.business.toString();
    const { 
      timeframe = '30d', 
      groupBy = 'day',
      sortBy = 'selections',
      limit = 20 
    } = req.query;

    // Get comprehensive product analytics
    const analytics = await analyticsService.getProductAnalytics(businessId, {
      timeframe,
      groupBy,
      sortBy,
      limit: parseInt(limit as string),
      includeSelectionTrends: true,
      includePopularityMetrics: true
    });

    // Add insights for manufacturers
    const enhancedAnalytics = {
      ...analytics,
      manufacturerInsights: {
        topProducts: analytics.topProducts?.slice(0, 5) || [],
        trendingProducts: analytics.trendingProducts || [],
        demandIndicators: analytics.demandMetrics || {},
        recommendedForProduction: analytics.productionRecommendations || []
      },
      metadata: {
        businessId,
        timeframe,
        groupBy,
        generatedAt: new Date().toISOString(),
        totalProducts: analytics.totalProducts || 0
      }
    };

    res.json(enhancedAnalytics);
  } catch (error) {
    logger.error('Product analytics error:', error);
    next(error);
  }
}

/**
 * GET /api/analytics/products/:productId
 * Get analytics for specific product
 */
export async function getProductAnalyticsById(
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const { analytics: analyticsService } = getServices();

      if (!req.tenant?.business) {
      res.status(400).json({ 
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const businessId = req.tenant.business.toString();
    const { productId } = req.params;
    const { timeframe = '30d', groupBy = 'day' } = req.query;

    if (!productId) {
      res.status(400).json({ 
        error: 'Product ID is required',
        code: 'MISSING_PRODUCT_ID'
      });
      return;
    }

    // Get detailed analytics for specific product
    const analytics = await analyticsService.getProductAnalyticsById(businessId, productId, {
      timeframe,
      groupBy,
      includeCompetitorComparison: true,
      includeVoterDemographics: true,
      includeSelectionReasons: true
    });

    // Add manufacturer-specific insights
    const enhancedAnalytics = {
      ...analytics,
      manufacturerInsights: {
        productionDemand: analytics.selectionTrends?.currentDemand || 'unknown',
        popularityRank: analytics.rankingMetrics?.overallRank || null,
        selectionReasons: analytics.voterFeedback?.reasons || [],
        competitorComparison: analytics.competitorData || {},
        productionRecommendation: analytics.productionAdvice || null
      },
      metadata: {
        businessId,
        productId,
        timeframe,
        generatedAt: new Date().toISOString()
      }
    };

    res.json(enhancedAnalytics);
  } catch (error) {
    logger.error('Product analytics by ID error:', error);
    next(error);
  }
}

/**
 * GET /api/analytics/manufacturer
 * Get manufacturer analytics (Manufacturer only)
 */
export async function getManufacturerAnalytics(
  req: ManufacturerAnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const { manufacturer: manufacturerService } = getServices();

    const manufacturerId = req.userId!;
    const { 
      timeframe = '30d', 
      brandId,
      metrics = ['connections', 'orders', 'certificates', 'product_selections']
    } = req.query;

    // Get comprehensive manufacturer analytics
    const analytics = await manufacturerService.getManufacturerAnalytics(manufacturerId, {
      timeframe,
      brandId,
      metrics,
      includeProductDemand: true,
      includeMarketInsights: true
    });

    // Add manufacturer-specific context
    const response = {
      ...analytics,
      businessInsights: {
        connectedBrands: analytics.brandMetrics?.totalConnected || 0,
        activeCollaborations: analytics.collaborationMetrics?.active || 0,
        productionOpportunities: analytics.productDemand?.opportunities || [],
        marketTrends: analytics.marketData?.trends || {}
      },
      metadata: {
        manufacturerId,
        timeframe,
        generatedAt: new Date().toISOString(),
        accessLevel: req.manufacturer?.isVerified ? 'verified' : 'unverified'
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Manufacturer analytics error:', error);
    next(error);
  }
}

/**
 * GET /api/analytics/engagement
 * Get engagement analytics
 */
export async function getEngagementAnalytics(
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const { analytics: analyticsService } = getServices();

    if (!req.tenant?.business) {
      res.status(400).json({ 
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const businessId = req.tenant.business.toString();
    const { timeframe = '30d', groupBy = 'day' } = req.query;

    // Get engagement analytics
    const analytics = await analyticsService.getEngagementAnalytics(businessId, {
      timeframe,
      groupBy,
      includeVotingEngagement: true,
      includeProductInteractions: true,
      includeUserRetention: true
    });

    const response = {
      ...analytics,
      insights: {
        engagementTrend: analytics.trends?.overall || 'stable',
        topEngagementDrivers: analytics.drivers || [],
        userRetentionRate: analytics.retention?.rate || 0,
        recommendedActions: analytics.recommendations || []
      },
      metadata: {
        businessId,
        timeframe,
        groupBy,
        generatedAt: new Date().toISOString()
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Engagement analytics error:', error);
    next(error);
  }
}

/**
 * POST /api/analytics/compare
 * Get comparative analytics between date ranges
 */
export async function getComparativeAnalytics(
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const { analytics: analyticsService } = getServices();

    if (!req.tenant?.business) {
      res.status(400).json({ 
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      });
      return;
    }

    const businessId = req.tenant.business.toString();
    const { currentPeriod, previousPeriod, metrics } = req.validatedBody || req.body;

    if (!currentPeriod || !previousPeriod || !metrics) {
      res.status(400).json({ 
        error: 'Current period, previous period, and metrics are required',
        code: 'MISSING_COMPARISON_DATA'
      });
      return;
    }

    // Get comparative analytics
    const comparison = await analyticsService.getComparativeAnalytics(businessId, {
      currentPeriod,
      previousPeriod,
      metrics,
      includePercentageChanges: true,
      includeStatisticalSignificance: true
    });

    const response = {
      ...comparison,
      insights: {
        overallTrend: comparison.summary?.trend || 'stable',
        significantChanges: comparison.significantMetrics || [],
        recommendations: comparison.actionableInsights || [],
        keyFindings: comparison.highlights || []
      },
      metadata: {
        businessId,
        currentPeriod,
        previousPeriod,
        metrics,
        generatedAt: new Date().toISOString()
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Comparative analytics error:', error);
    next(error);
  }
}

/**
 * GET /api/analytics/nfts
 * Get NFT analytics with Web3 insights
 */
export async function getNftAnalytics(
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const { analytics: analyticsService } = getServices();

    if (!req.tenant?.business) {
       res.status(400).json({ 
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      })
      return;
    }

    const businessId = req.tenant.business.toString();
    const { timeframe = '30d', groupBy = 'day' } = req.query;

    // Get comprehensive NFT analytics
    const data = await analyticsService.getNftAnalytics(businessId, {
      timeframe,
      groupBy,
      includeMarketData: true,
      includeHolderAnalysis: true
    });

    // Add Web3-specific insights
    const enhancedData = {
      ...data,
      web3Insights: {
        uniqueHolders: data.holderMetrics?.uniqueHolders || 0,
        holdingDistribution: data.holderMetrics?.distribution || {},
        mintingTrends: data.mintingActivity || {},
        marketActivity: data.marketMetrics || {}
      },
      metadata: {
        businessId,
        timeframe,
        generatedAt: new Date().toISOString(),
        chainId: process.env.DEFAULT_CHAIN_ID || '1'
      }
    };

    res.json(enhancedData);
  } catch (error) {
    logger.error('NFT analytics error:', error);
    next(error);
  }
}

/**
 * GET /api/analytics/manufacturer/:brandId
 * Get brand analytics from manufacturer perspective with authorization
 */
export async function getManufacturerBrandAnalytics(
  req: ManufacturerAnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const { manufacturer: manufacturerService } = getServices();

    const manufacturerId = req.userId!;
    const { brandId } = req.params;

    if (!brandId) {
       res.status(400).json({ 
        error: 'Brand ID is required',
        code: 'MISSING_BRAND_ID'
      })
      return;
    }

    // Verify manufacturer has access to this brand
    const hasAccess = await manufacturerService.hasAccessToBrand(manufacturerId, brandId);
    if (!hasAccess) {
     res.status(403).json({ 
        error: 'Access denied to this brand',
        code: 'BRAND_ACCESS_DENIED'
      })
      return;
    }

    // Get comprehensive analytics for the brand
    const analytics = await manufacturerService.getComprehensiveAnalyticsForBrand(
      manufacturerId, 
      brandId
    );

    // Add manufacturer-specific context
    const response = {
      ...analytics,
      manufacturerContext: {
        manufacturerId,
        accessLevel: req.manufacturer?.isVerified ? 'verified' : 'unverified',
        connectionDate: req.manufacturer?.brands?.find((b: any) => 
          b.toString() === brandId
        )?.createdAt
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataScope: 'manufacturer_brand_view'
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Manufacturer brand analytics error:', error);
    next(error);
  }
}

/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard analytics with plan-based features
 */
export async function getDashboardAnalytics(
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const { analytics: analyticsService } = getServices();

    if (!req.tenant?.business) {
       res.status(400).json({ 
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      })
      return;
    }

    const businessId = req.tenant.business.toString();
    const userPlan = req.tenant.plan || 'foundation';

    // Get dashboard data based on subscription plan
    const dashboardData = await analyticsService.getDashboardAnalytics(businessId, {
      plan: userPlan,
      includePredictions: ['premium', 'enterprise'].includes(userPlan),
      includeComparisons: ['growth', 'premium', 'enterprise'].includes(userPlan),
      includeAdvancedMetrics: ['enterprise'].includes(userPlan)
    });

    // Add plan-specific features
    const response = {
      ...dashboardData,
      planFeatures: {
        currentPlan: userPlan,
        availableMetrics: analyticsService.getPlanMetrics(userPlan),
        upgradeRecommendations: userPlan === 'foundation' ? 
          analyticsService.generateUpgradeRecommendations(dashboardData) : null
      },
      metadata: {
        businessId,
        plan: userPlan,
        generatedAt: new Date().toISOString()
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Dashboard analytics error:', error);
    next(error);
  }
}

/**
 * GET /api/analytics/export
 * Export analytics data in various formats (CSV, PDF, etc.)
 */
export async function exportAnalytics(
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const { analytics: analyticsService } = getServices();

    if (!req.tenant?.business) {
       res.status(400).json({ 
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      })
      return;
    }

    const businessId = req.tenant.business.toString();
    const { format = 'csv', type = 'votes', timeframe = '30d' } = req.query;

    // Validate export format
    if (!['csv', 'json', 'pdf'].includes(format as string)) {
       res.status(400).json({ 
        error: 'Invalid export format. Supported: csv, json, pdf',
        code: 'INVALID_EXPORT_FORMAT'
      })
      return;
    }

    // Check plan permissions for export
    const userPlan = req.tenant.plan || 'foundation';
    if (format === 'pdf' && !['premium', 'enterprise'].includes(userPlan)) {
       res.status(403).json({ 
        error: 'PDF export requires premium or enterprise plan',
        code: 'PLAN_UPGRADE_REQUIRED'
      })
      return;
    }

    // Generate export data
    const exportData = await analyticsService.exportAnalytics(businessId, {
      type: type as string,
      format: format as string,
      timeframe: timeframe as string,
      includeCharts: format === 'pdf'
    });

    // Set appropriate headers
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `analytics_${type}_${timestamp}.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', analyticsService.getContentType(format as string));

    if (format === 'json') {
      res.json(exportData);
    } else {
      res.send(exportData);
    }
  } catch (error) {
    logger.error('Export analytics error:', error);
    next(error);
  }
}

/**
 * POST /api/analytics/custom-report
 * Generate custom analytics reports with advanced filtering
 */
export async function generateCustomReport(
  req: AnalyticsRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get service instances
    const { analytics: analyticsService } = getServices();

    if (!req.tenant?.business) {
       res.status(400).json({ 
        error: 'Business context required',
        code: 'MISSING_BUSINESS_CONTEXT'
      })
      return;
    }

    const businessId = req.tenant.business.toString();
    const userPlan = req.tenant.plan || 'foundation';

    // Check plan permissions for custom reports
    if (!['premium', 'enterprise'].includes(userPlan)) {
       res.status(403).json({ 
        error: 'Custom reports require premium or enterprise plan',
        code: 'PLAN_UPGRADE_REQUIRED'
      })
      return;
    }

    const reportConfig = req.validatedBody || req.body;

    // Generate custom report
    const report = await analyticsService.generateCustomReport(businessId, {
      ...reportConfig,
      requestedBy: req.userId,
      planLevel: userPlan
    });

    res.status(201).json({
      reportId: report.id,
      status: 'generating',
      estimatedCompletion: report.estimatedCompletion,
      downloadUrl: `/api/analytics/reports/${report.id}/download`
    });
  } catch (error) {
    logger.error('Custom report generation error:', error);
    next(error);
  }
}

