// src/controllers/analytics.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { TenantRequest } from '../middleware/tenant.middleware';
import { ManufacturerAuthRequest } from '../middleware/manufacturerAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { AnalyticsBusinessService } from '../services/business/analytics.service';
import { ManufacturerService } from '../services/business/manufacturer.service';
import { trackManufacturerAction } from '../middleware/metrics.middleware';

// Enhanced request interfaces
interface AnalyticsRequest extends AuthRequest, TenantRequest, ValidatedRequest {
  query: {
    timeframe?: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
    groupBy?: 'hour' | 'day' | 'week' | 'month';
    metrics?: string[];
    startDate?: string;
    endDate?: string;
    // Add the missing properties
    format?: 'csv' | 'json' | 'pdf';
    type?: 'votes' | 'transactions' | 'certificates' | 'products' | 'engagement';
  };
}

interface ManufacturerAnalyticsRequest extends ManufacturerAuthRequest, ValidatedRequest {
  params: {
    brandId?: string;
  };
}

// Initialize services
const analyticsService = new AnalyticsBusinessService();
const manufacturerService = new ManufacturerService();

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
    console.error('Votes analytics error:', error);
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
    recommendations: generateBusinessRecommendations(data)
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
    console.error('Transaction analytics error:', error);
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
    console.error('NFT analytics error:', error);
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
    console.error('Manufacturer brand analytics error:', error);
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
        availableMetrics: getPlanMetrics(userPlan),
        upgradeRecommendations: userPlan === 'foundation' ? 
          generateUpgradeRecommendations(dashboardData) : null
      },
      metadata: {
        businessId,
        plan: userPlan,
        generatedAt: new Date().toISOString()
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Dashboard analytics error:', error);
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
    res.setHeader('Content-Type', getContentType(format as string));

    if (format === 'json') {
      res.json(exportData);
    } else {
      res.send(exportData);
    }
  } catch (error) {
    console.error('Export analytics error:', error);
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
    console.error('Custom report generation error:', error);
    next(error);
  }
}

// Helper functions
function generateBusinessRecommendations(data: any): string[] {
  const recommendations: string[] = [];
  
  if (data.trends?.volumeGrowth < 0) {
    recommendations.push('Consider implementing customer retention strategies');
  }
  
  if (data.summary?.averageValue < 100) {
    recommendations.push('Explore opportunities to increase average transaction value');
  }
  
  if (data.engagement?.rate < 0.3) {
    recommendations.push('Focus on improving customer engagement and interaction');
  }
  
  return recommendations;
}

function getPlanMetrics(plan: string): string[] {
  const baseMetrics = ['basic_stats', 'time_series', 'totals'];
  
  switch (plan) {
    case 'growth':
      return [...baseMetrics, 'trends', 'comparisons'];
    case 'premium':
      return [...baseMetrics, 'trends', 'comparisons', 'predictions', 'exports'];
    case 'enterprise':
      return [...baseMetrics, 'trends', 'comparisons', 'predictions', 'exports', 'custom_reports', 'real_time'];
    default:
      return baseMetrics;
  }
}

function generateUpgradeRecommendations(data: any): any {
  return {
    suggestedPlan: 'growth',
    reasons: [
      'Access to trend analysis and growth predictions',
      'Enhanced reporting capabilities',
      'Comparative analytics with industry benchmarks'
    ],
    potentialValue: 'Unlock insights that could improve performance by 15-25%'
  };
}

function getContentType(format: string): string {
  switch (format) {
    case 'csv': return 'text/csv';
    case 'pdf': return 'application/pdf';
    case 'json': return 'application/json';
    default: return 'application/octet-stream';
  }
}