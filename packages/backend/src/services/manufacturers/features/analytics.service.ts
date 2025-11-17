// src/services/manufacturers/features/analytics.service.ts

import { Manufacturer, IManufacturer } from '../../../models/manufacturer/manufacturer.model';
import { logger } from '../../../utils/logger';
import { enhancedCacheService } from '../../infrastructure/cache/features/enhancedCache.service';

// Helper type for connection requests
interface ConnectionRequestData {
  sent?: number;
  received?: number;
  approved?: number;
  rejected?: number;
  pending?: number;
}

export interface ManufacturerAnalytics {
  profileViews: number;
  connectionRequests: number;
  activeConnections: number;
  productInquiries: number;
  profileCompleteness: number;
  industryRanking: number;
  performanceScore: number;
  engagement: {
    totalInteractions: number;
    averageResponseTime: number;
    responseRate: number;
  };
  growth: {
    viewsGrowth: number;
    connectionsGrowth: number;
    inquiriesGrowth: number;
  };
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ManufacturerStatistics {
  globalStats: {
    total: number;
    active: number;
    verified: number;
    averageProfileScore: number;
  };
  industryBreakdown: Array<{
    industry: string;
    count: number;
    averageScore: number;
  }>;
  trends: {
    newManufacturers: number;
    growthRate: number;
    topGrowingIndustries: string[];
  };
  topServices: Array<{
    service: string;
    count: number;
  }>;
  averageMetrics: {
    moq: number;
    responseTime: number;
    satisfaction: number;
    profileCompleteness: number;
  };
}

export interface PerformanceMetrics {
  profileViews: {
    total: number;
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  connections: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    successRate: number;
  };
  engagement: {
    averageSessionTime: number;
    bounceRate: number;
    returnVisitorRate: number;
    interactionRate: number;
  };
  industryComparison: {
    ranking: number;
    totalInIndustry: number;
    percentile: number;
    benchmarkScore: number;
  };
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'excel';
  dateRange: {
    start: Date;
    end: Date;
  };
  includeGraphs: boolean;
  includeComparisons: boolean;
  anonymize: boolean;
}

export interface ExportResult {
  downloadUrl: string;
  fileSize: number;
  generatedAt: Date;
  expiresAt: Date;
  format: string;
}

/**
 * Custom error class for analytics operations
 */
class AnalyticsError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = 'AnalyticsError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Manufacturer analytics service - handles performance metrics and statistics
 */
export class AnalyticsService {
  private readonly ANALYTICS_CACHE_TTL = 600; // 10 minutes

  /**
   * Get manufacturer analytics with caching
   */
  async getManufacturerAnalytics(
    manufacturerId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<ManufacturerAnalytics> {
    try {
      // Try cache first
      const cached = await enhancedCacheService.getCachedAnalytics('manufacturer', {
        manufacturerId,
        dateRange
      }, { ttl: this.ANALYTICS_CACHE_TTL });

      if (cached) {
        return cached;
      }

      // Generate analytics
      const analytics = await this.generateManufacturerAnalytics(manufacturerId, dateRange);

      // Cache the result
      await enhancedCacheService.cacheAnalytics('manufacturer', {
        manufacturerId,
        dateRange
      }, analytics, { ttl: this.ANALYTICS_CACHE_TTL });

      return analytics;
    } catch (error: any) {
      throw new AnalyticsError(`Failed to get manufacturer analytics: ${error.message}`, 500, 'ANALYTICS_ERROR');
    }
  }

  /**
   * Get comprehensive manufacturer statistics
   */
  async getManufacturerStatistics(): Promise<ManufacturerStatistics> {
    try {
      // Try cache first
      const cached = await enhancedCacheService.getCachedAnalytics('global_stats', {}, { ttl: this.ANALYTICS_CACHE_TTL });

      if (cached) {
        return cached;
      }

      const [globalStats, industryStats, trends, servicesStats, metricsStats] = await Promise.all([
        this.getGlobalStats(),
        this.getIndustryBreakdown(),
        this.getTrends(),
        this.getTopServices(),
        this.getAverageMetrics()
      ]);

      const statistics: ManufacturerStatistics = {
        globalStats,
        industryBreakdown: industryStats,
        trends,
        topServices: servicesStats,
        averageMetrics: metricsStats
      };

      // Cache the result
      await enhancedCacheService.cacheAnalytics('global_stats', {}, statistics, { ttl: this.ANALYTICS_CACHE_TTL });

      return statistics;
    } catch (error: any) {
      throw new AnalyticsError(`Failed to get manufacturer statistics: ${error.message}`, 500, 'STATISTICS_ERROR');
    }
  }

  /**
   * Get performance metrics for a manufacturer
   */
  async getPerformanceMetrics(manufacturerId: string): Promise<PerformanceMetrics> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId);

      if (!manufacturer) {
        throw new AnalyticsError('Manufacturer not found', 404, 'MANUFACTURER_NOT_FOUND');
      }

      // Calculate profile views metrics
      const profileViews = {
        total: manufacturer.profileViews || 0,
        daily: await this.getDailyViews(manufacturerId, 30),
        weekly: await this.getWeeklyViews(manufacturerId, 12),
        monthly: await this.getMonthlyViews(manufacturerId, 6)
      };

      // Calculate connection metrics
      const connectionData: ConnectionRequestData = manufacturer.connectionRequests || {};
      const connections = {
        total: connectionData.sent || 0,
        pending: connectionData.pending || 0,
        approved: connectionData.approved || 0,
        rejected: connectionData.rejected || 0,
        successRate: this.calculateConnectionSuccessRate(connectionData)
      };

      // Calculate engagement metrics
      const engagement = {
        averageSessionTime: (manufacturer as any).averageSessionTime || 0,
        bounceRate: (manufacturer as any).bounceRate || 0,
        returnVisitorRate: (manufacturer as any).returnVisitorRate || 0,
        interactionRate: this.calculateInteractionRate(manufacturer)
      };

      // Calculate industry comparison
      const industryComparison = await this.getIndustryComparison(manufacturerId, manufacturer.industry);

      return {
        profileViews,
        connections,
        engagement,
        industryComparison
      };
    } catch (error: any) {
      if (error instanceof AnalyticsError) {
        throw error;
      }
      throw new AnalyticsError(`Failed to get performance metrics: ${error.message}`, 500, 'PERFORMANCE_METRICS_ERROR');
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    manufacturerId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Get analytics data for the specified date range
      const analytics = await this.getManufacturerAnalytics(manufacturerId, options.dateRange);

      // Generate export file based on format
      const exportData = await this.generateExportData(analytics, options);

      // For now, return mock export result
      // In real implementation, you would generate actual files and upload to storage
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      return {
        downloadUrl: `https://storage.example.com/exports/${manufacturerId}_analytics_${Date.now()}.${options.format}`,
        fileSize: exportData.length,
        generatedAt: new Date(),
        expiresAt,
        format: options.format
      };
    } catch (error: any) {
      throw new AnalyticsError(`Failed to export analytics: ${error.message}`, 500, 'EXPORT_ERROR');
    }
  }

  /**
   * Get industry ranking for a manufacturer
   */
  async getIndustryRanking(manufacturerId: string, industry?: string): Promise<{
    ranking: number;
    totalInIndustry: number;
    percentile: number;
    score: number;
    topPerformers: Array<{
      id: string;
      name: string;
      score: number;
    }>;
  }> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId);

      if (!manufacturer) {
        throw new AnalyticsError('Manufacturer not found', 404, 'MANUFACTURER_NOT_FOUND');
      }

      const targetIndustry = industry || manufacturer.industry;

      if (!targetIndustry) {
        throw new AnalyticsError('Industry not specified', 400, 'INDUSTRY_REQUIRED');
      }

      // Get all manufacturers in the same industry
      const industryManufacturers = await Manufacturer.find({
        industry: targetIndustry,
        isActive: { $ne: false }
      }).select('name profileScore totalConnections clientSatisfactionRating').sort({ profileScore: -1 });

      const totalInIndustry = industryManufacturers.length;
      const currentScore = manufacturer.profileScore || 0;

      // Find ranking
      const ranking = industryManufacturers.findIndex(m => m._id.toString() === manufacturerId) + 1;
      const percentile = ranking > 0 ? Math.round(((totalInIndustry - ranking) / totalInIndustry) * 100) : 0;

      // Get top 5 performers
      const topPerformers = industryManufacturers.slice(0, 5).map(m => ({
        id: m._id.toString(),
        name: m.name,
        score: m.profileScore || 0
      }));

      return {
        ranking,
        totalInIndustry,
        percentile,
        score: currentScore,
        topPerformers
      };
    } catch (error: any) {
      if (error instanceof AnalyticsError) {
        throw error;
      }
      throw new AnalyticsError(`Failed to get industry ranking: ${error.message}`, 500, 'RANKING_ERROR');
    }
  }

  /**
   * Track analytics event
   */
  async trackEvent(
    manufacturerId: string,
    eventType: string,
    eventData?: any,
    source?: string
  ): Promise<void> {
    try {
      // In a real implementation, you would save to an analytics events collection
      logger.info(`Analytics event tracked for manufacturer ${manufacturerId}`, {
        eventType,
        eventData,
        source,
        timestamp: new Date()
      });

      // Update relevant counters based on event type
      switch (eventType) {
        case 'profile_view':
          await Manufacturer.findByIdAndUpdate(manufacturerId, {
            $inc: { profileViews: 1 }
          });
          break;
        case 'connection_request':
          await Manufacturer.findByIdAndUpdate(manufacturerId, {
            $inc: { 'connectionRequests.received': 1 }
          });
          break;
        // Add more event types as needed
      }

      // Invalidate analytics cache
      await enhancedCacheService.invalidateByTags([`manufacturer:${manufacturerId}`, 'manufacturer_analytics']);
    } catch (error: any) {
      // Don't throw errors for tracking failures - log and continue
      logger.warn('Failed to track analytics event:', error);
    }
  }

  // ===== Private Helper Methods =====

  /**
   * Generate manufacturer analytics
   */
  private async generateManufacturerAnalytics(
    manufacturerId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<ManufacturerAnalytics> {
    try {
      const manufacturer = await Manufacturer.findById(manufacturerId);

      if (!manufacturer) {
        throw new AnalyticsError('Manufacturer not found', 404, 'MANUFACTURER_NOT_FOUND');
      }

      // Set default date range if not provided
      const end = dateRange?.end || new Date();
      const start = dateRange?.start || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      // Basic metrics from manufacturer model
      const profileViews = manufacturer.profileViews || 0;
      const connectionRequests = manufacturer.connectionRequests?.received || 0;
      const activeConnections = manufacturer.totalConnections || 0;
      const productInquiries = (manufacturer as any).productInquiries || 0;
      const profileCompleteness = manufacturer.activityMetrics?.profileCompleteness || 0;

      // Calculate industry ranking
      const industryRanking = await this.calculateIndustryRanking(manufacturerId, manufacturer.industry);

      // Calculate performance score
      const performanceScore = this.calculatePerformanceScore(manufacturer);

      // Calculate engagement metrics
      const totalInteractions = profileViews + connectionRequests + productInquiries;
      const averageResponseTime = manufacturer.averageResponseTime || 0;
      const responseRate = this.calculateResponseRate(manufacturer);

      // Calculate growth metrics (mock data for now)
      const growth = {
        viewsGrowth: this.calculateGrowthRate(profileViews, 30), // 30 days
        connectionsGrowth: this.calculateGrowthRate(activeConnections, 30),
        inquiriesGrowth: this.calculateGrowthRate(productInquiries, 30)
      };

      return {
        profileViews,
        connectionRequests,
        activeConnections,
        productInquiries,
        profileCompleteness,
        industryRanking,
        performanceScore,
        engagement: {
          totalInteractions,
          averageResponseTime,
          responseRate
        },
        growth,
        timeRange: { start, end }
      };
    } catch (error: any) {
      throw new AnalyticsError(`Failed to generate analytics: ${error.message}`, 500, 'GENERATION_ERROR');
    }
  }

  /**
   * Get global manufacturer statistics
   */
  private async getGlobalStats() {
    const stats = await Manufacturer.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
          averageProfileScore: { $avg: '$profileScore' }
        }
      }
    ]);

    return stats[0] || { total: 0, active: 0, verified: 0, averageProfileScore: 0 };
  }

  /**
   * Get industry breakdown statistics
   */
  private async getIndustryBreakdown() {
    return await Manufacturer.aggregate([
      { $match: { isActive: { $ne: false } } },
      {
        $group: {
          _id: '$industry',
          count: { $sum: 1 },
          averageScore: { $avg: '$profileScore' }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          industry: '$_id',
          count: 1,
          averageScore: { $round: ['$averageScore', 1] },
          _id: 0
        }
      }
    ]);
  }

  /**
   * Get trend statistics
   */
  private async getTrends() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const newManufacturers = await Manufacturer.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      isActive: { $ne: false }
    });

    const totalManufacturers = await Manufacturer.countDocuments({ isActive: { $ne: false } });
    const growthRate = totalManufacturers > 0 ? (newManufacturers / totalManufacturers) * 100 : 0;

    return {
      newManufacturers,
      growthRate: Math.round(growthRate * 10) / 10,
      topGrowingIndustries: ['Electronics', 'Healthcare', 'Sustainability'] // Simplified
    };
  }

  /**
   * Get top services statistics
   */
  private async getTopServices() {
    const result = await Manufacturer.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $unwind: '$servicesOffered' },
      {
        $group: {
          _id: '$servicesOffered',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          service: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    return result;
  }

  /**
   * Get average metrics
   */
  private async getAverageMetrics() {
    const metrics = await Manufacturer.aggregate([
      { $match: { isActive: { $ne: false } } },
      {
        $group: {
          _id: null,
          moq: { $avg: '$moq' },
          responseTime: { $avg: '$averageResponseTime' },
          satisfaction: { $avg: '$clientSatisfactionRating' },
          profileCompleteness: { $avg: '$activityMetrics.profileCompleteness' }
        }
      }
    ]);

    const result = metrics[0] || {};
    return {
      moq: Math.round(result.moq || 0),
      responseTime: Math.round(result.responseTime || 0),
      satisfaction: Math.round((result.satisfaction || 0) * 10) / 10,
      profileCompleteness: Math.round(result.profileCompleteness || 0)
    };
  }

  /**
   * Calculate industry ranking
   */
  private async calculateIndustryRanking(manufacturerId: string, industry?: string): Promise<number> {
    if (!industry) return 0;

    const ranking = await Manufacturer.countDocuments({
      industry,
      profileScore: { $gt: await this.getManufacturerScore(manufacturerId) },
      isActive: { $ne: false }
    });

    return ranking + 1;
  }

  /**
   * Get manufacturer score
   */
  private async getManufacturerScore(manufacturerId: string): Promise<number> {
    const manufacturer = await Manufacturer.findById(manufacturerId).select('profileScore');
    return manufacturer?.profileScore || 0;
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(manufacturer: IManufacturer): number {
    let score = 0;

    // Profile completeness (40%)
    score += (manufacturer.activityMetrics?.profileCompleteness || 0) * 0.4;

    // Verification status (20%)
    if (manufacturer.isVerified) score += 20;

    // Activity level (20%)
    const lastActive = manufacturer.lastLoginAt;
    if (lastActive && (Date.now() - lastActive.getTime()) < 7 * 24 * 60 * 60 * 1000) {
      score += 20;
    }

    // Connection success rate (20%)
    const connectionData: ConnectionRequestData = manufacturer.connectionRequests || {};
    if ((connectionData.sent || 0) > 0) {
      const successRate = ((connectionData.approved || 0) / (connectionData.sent || 1)) * 20;
      score += successRate;
    }

    return Math.round(score);
  }

  /**
   * Calculate response rate
   */
  private calculateResponseRate(manufacturer: IManufacturer): number {
    const responseTime = manufacturer.averageResponseTime || 24;
    return Math.max(0, 100 - (responseTime * 2));
  }

  /**
   * Calculate growth rate
   */
  private calculateGrowthRate(currentValue: number, days: number): number {
    // Simplified growth calculation
    // In real implementation, you would compare with historical data
    return Math.round(Math.random() * 20 - 10); // Mock: -10% to +10%
  }

  /**
   * Calculate connection success rate
   */
  private calculateConnectionSuccessRate(connectionData: ConnectionRequestData): number {
    if (!connectionData.sent || connectionData.sent === 0) return 0;
    return Math.round(((connectionData.approved || 0) / connectionData.sent) * 100);
  }

  /**
   * Calculate interaction rate
   */
  private calculateInteractionRate(manufacturer: IManufacturer): number {
    const views = manufacturer.profileViews || 0;
    const interactions = (manufacturer.connectionRequests?.received || 0) + ((manufacturer as any).productInquiries || 0);
    return views > 0 ? Math.round((interactions / views) * 100) : 0;
  }

  /**
   * Get daily views for the last N days
   */
  private async getDailyViews(manufacturerId: string, days: number): Promise<number[]> {
    // Mock data - in real implementation, you would query analytics collection
    return Array.from({ length: days }, () => Math.floor(Math.random() * 50));
  }

  /**
   * Get weekly views for the last N weeks
   */
  private async getWeeklyViews(manufacturerId: string, weeks: number): Promise<number[]> {
    // Mock data - in real implementation, you would query analytics collection
    return Array.from({ length: weeks }, () => Math.floor(Math.random() * 200));
  }

  /**
   * Get monthly views for the last N months
   */
  private async getMonthlyViews(manufacturerId: string, months: number): Promise<number[]> {
    // Mock data - in real implementation, you would query analytics collection
    return Array.from({ length: months }, () => Math.floor(Math.random() * 800));
  }

  /**
   * Get industry comparison data
   */
  private async getIndustryComparison(manufacturerId: string, industry?: string): Promise<{
    ranking: number;
    totalInIndustry: number;
    percentile: number;
    benchmarkScore: number;
  }> {
    if (!industry) {
      return { ranking: 0, totalInIndustry: 0, percentile: 0, benchmarkScore: 0 };
    }

    const ranking = await this.calculateIndustryRanking(manufacturerId, industry);
    const totalInIndustry = await Manufacturer.countDocuments({
      industry,
      isActive: { $ne: false }
    });

    const percentile = totalInIndustry > 0 ? Math.round(((totalInIndustry - ranking) / totalInIndustry) * 100) : 0;

    // Calculate benchmark score (average of top 10%)
    const topPerformers = await Manufacturer.find({
      industry,
      isActive: { $ne: false }
    }).sort({ profileScore: -1 }).limit(Math.max(1, Math.ceil(totalInIndustry * 0.1)));

    const benchmarkScore = topPerformers.length > 0
      ? topPerformers.reduce((sum, m) => sum + (m.profileScore || 0), 0) / topPerformers.length
      : 0;

    return {
      ranking,
      totalInIndustry,
      percentile,
      benchmarkScore: Math.round(benchmarkScore)
    };
  }

  /**
   * Generate export data
   */
  private async generateExportData(analytics: ManufacturerAnalytics, options: ExportOptions): Promise<string> {
    // Simplified export data generation
    if (options.format === 'json') {
      return JSON.stringify(analytics, null, 2);
    }

    if (options.format === 'csv') {
      const headers = ['Metric', 'Value'];
      const rows = [
        ['Profile Views', analytics.profileViews.toString()],
        ['Connection Requests', analytics.connectionRequests.toString()],
        ['Active Connections', analytics.activeConnections.toString()],
        ['Profile Completeness', `${analytics.profileCompleteness}%`],
        ['Industry Ranking', analytics.industryRanking.toString()],
        ['Performance Score', analytics.performanceScore.toString()]
      ];

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    // For other formats, return JSON for now
    return JSON.stringify(analytics, null, 2);
  }
}

export const analyticsService = new AnalyticsService();
