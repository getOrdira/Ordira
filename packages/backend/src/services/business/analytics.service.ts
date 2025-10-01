/**
 * Optimized Analytics Service
 *
 * Optimized version of the analytics service using:
 * - Enhanced database service for efficient aggregations
 * - Query optimization service for complex analytics queries
 * - Enhanced caching for frequently requested analytics
 * - Performance monitoring and logging
 */

import { logger } from '../../utils/logger';
import { VotingRecord } from '../../models/votingRecord.model';
import { Product } from '../../models/product.model';
import { Business } from '../../models/business.model';
import { Manufacturer } from '../../models/manufacturer.model';
import { queryOptimizationService } from '../external/query-optimization.service';
import { enhancedCacheService } from '../external/enhanced-cache.service';
import { executeAnalyticsQuery, executeReportingQuery } from '../external/read-replica.service';


export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
}

export interface VotingAnalytics {
  totalVotes: number;
  uniqueVoters: number;
  verifiedVotes: number;
  unverifiedVotes: number;
  avgVotesPerDay: number;
  topProducts: Array<{
    productId: string;
    productTitle: string;
    voteCount: number;
  }>;
  votingSources: Record<string, number>;
  dailyBreakdown: Array<{
    date: string;
    votes: number;
    uniqueVoters: number;
  }>;
}

export interface BusinessAnalytics {
  totalBusinesses: number;
  verifiedBusinesses: number;
  verificationRate: number;
  industriesBreakdown: Record<string, number>;
  plansBreakdown: Record<string, number>;
  avgProfileViews: number;
  recentSignups: number;
  activeBusinesses: number;
}

export interface ProductAnalytics {
  totalProducts: number;
  activeProducts: number;
  productsByCategory: Record<string, number>;
  avgVotesPerProduct: number;
  topPerformingProducts: Array<{
    id: string;
    title: string;
    voteCount: number;
    certificateCount: number;
    engagementScore: number;
  }>;
  mediaUploadStats: {
    withMedia: number;
    withoutMedia: number;
    avgMediaPerProduct: number;
  };
}

export interface ManufacturerAnalytics {
  totalManufacturers: number;
  verifiedManufacturers: number;
  industriesBreakdown: Record<string, number>;
  avgProfileScore: number;
  servicesOfferedStats: Record<string, number>;
  locationStats: Record<string, number>;
  certificationStats: Record<string, number>;
}

export interface DashboardAnalytics {
  votingAnalytics: VotingAnalytics;
  businessAnalytics: BusinessAnalytics;
  productAnalytics: ProductAnalytics;
  manufacturerAnalytics: ManufacturerAnalytics;
  systemHealth: {
    totalUsers: number;
    activeUsers: number;
    systemLoad: number;
    uptime: number;
  };
}

/**
 * Optimized analytics service with caching and query optimization
 */
export class AnalyticsService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly LONG_CACHE_TTL = 3600; // 1 hour
  private readonly SHORT_CACHE_TTL = 60; // 1 minute

  /**
   * Get voting analytics with optimization and caching
   */
  async getVotingAnalytics(
    businessId: string,
    timeRange?: AnalyticsTimeRange,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<VotingAnalytics> {
    const cacheKey = `voting_analytics:${businessId}:${JSON.stringify(timeRange)}:${groupBy}`;

    // Try cache first
    const cached = await enhancedCacheService.getCachedVotingAnalytics(businessId, {
      timeRange,
      groupBy
    });

    if (cached) {
      logger.info('Voting analytics served from cache', {
        businessId,
        timeRange: timeRange ? 'custom' : 'all_time'
      });
      return cached;
    }

    const startTime = Date.now();

    try {
      // Use optimized voting analytics query
      const analyticsData = await queryOptimizationService.optimizedVotingAnalytics({
        businessId,
        dateRange: timeRange,
        groupBy
      }, VotingRecord);

      // Get top products for this business
      const topProducts = await this.getTopProductsForBusiness(businessId, timeRange, 5);

      // Get voting sources breakdown
      const votingSources = await this.getVotingSourcesBreakdown(businessId, timeRange);

      // Compile analytics
      const votingAnalytics: VotingAnalytics = {
        totalVotes: analyticsData.analytics.reduce((sum: number, item: any) => sum + item.totalVotes, 0),
        uniqueVoters: analyticsData.analytics.reduce((sum: number, item: any) => sum + item.uniqueVoters, 0),
        verifiedVotes: analyticsData.analytics.reduce((sum: number, item: any) => sum + (item.verifiedVotes || 0), 0),
        unverifiedVotes: 0, // Calculate separately if needed
        avgVotesPerDay: this.calculateAvgVotesPerDay(analyticsData.analytics, timeRange),
        topProducts,
        votingSources,
        dailyBreakdown: analyticsData.analytics.map((item: any) => ({
          date: item._id,
          votes: item.totalVotes,
          uniqueVoters: item.uniqueVoters
        }))
      };

      // Cache the result
      await enhancedCacheService.cacheVotingAnalytics(businessId, {
        timeRange,
        groupBy
      }, votingAnalytics, {
        ttl: this.CACHE_TTL
      });

      const duration = Date.now() - startTime;
      logger.info(`Voting analytics generated in ${duration}ms`, {
        businessId,
        duration,
        totalVotes: votingAnalytics.totalVotes
      });

      return votingAnalytics;

    } catch (error) {
      logger.error('Failed to generate voting analytics:', error);
      throw error;
    }
  }

  /**
   * Get business analytics with optimization
   */
  async getBusinessAnalytics(
    filterOptions: {
      industry?: string;
      verified?: boolean;
      plan?: string;
      dateRange?: AnalyticsTimeRange;
    } = {}
  ): Promise<BusinessAnalytics> {
    // Try cache first
    const cached = await enhancedCacheService.getCachedAnalytics('business', filterOptions, {
      ttl: this.CACHE_TTL
    });

    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      // Use optimized business analytics query
      const analyticsData = await queryOptimizationService.optimizedBusinessAnalytics(filterOptions, Business);

      // Get additional breakdown data
      const [industriesData, plansData, recentSignups] = await Promise.all([
        this.getIndustriesBreakdown(filterOptions),
        this.getPlansBreakdown(filterOptions),
        this.getRecentSignupsCount(filterOptions.dateRange)
      ]);

      const businessAnalytics: BusinessAnalytics = {
        totalBusinesses: analyticsData.analytics.total || 0,
        verifiedBusinesses: analyticsData.analytics.verified || 0,
        verificationRate: analyticsData.analytics.verificationRate || 0,
        industriesBreakdown: industriesData,
        plansBreakdown: plansData,
        avgProfileViews: analyticsData.analytics.avgProfileViews || 0,
        recentSignups,
        activeBusinesses: await this.getActiveBusinessesCount()
      };

      // Cache the result
      await enhancedCacheService.cacheAnalytics('business', filterOptions, businessAnalytics, {
        ttl: this.CACHE_TTL
      });

      const duration = Date.now() - startTime;
      logger.info(`Business analytics generated in ${duration}ms`, {
        duration,
        totalBusinesses: businessAnalytics.totalBusinesses
      });

      return businessAnalytics;

    } catch (error) {
      logger.error('Failed to generate business analytics:', error);
      throw error;
    }
  }

  /**
   * Get product analytics with optimization
   */
  async getProductAnalytics(
    businessId?: string,
    manufacturerId?: string,
    timeRange?: AnalyticsTimeRange
  ): Promise<ProductAnalytics> {
    const cacheKey = `product_analytics:${businessId || manufacturerId || 'all'}`;

    // Try cache first
    const cached = await enhancedCacheService.getCachedAnalytics('product', {
      businessId,
      manufacturerId,
      timeRange
    });

    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      // Build query
      const query: any = { status: 'active' };
      if (businessId) query.business = businessId;
      if (manufacturerId) query.manufacturer = manufacturerId;
      if (timeRange) {
        query.createdAt = {
          $gte: timeRange.start,
          $lte: timeRange.end
        };
      }

      // Use aggregation pipeline for efficient analytics
      const pipeline = [
        { $match: query },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalVotes: { $sum: { $ifNull: ['$voteCount', 0] } },
            totalCertificates: { $sum: { $ifNull: ['$certificateCount', 0] } },
            totalViews: { $sum: { $ifNull: ['$viewCount', 0] } },
            categoriesData: { $push: '$category' },
            mediaData: { $push: { $size: { $ifNull: ['$media', []] } } }
          }
        }
      ];

      const [analyticsResult, topProducts, categoriesBreakdown, mediaStats] = await Promise.all([
        Product.aggregate(pipeline),
        this.getTopPerformingProducts(businessId, manufacturerId, 10),
        this.getCategoriesBreakdown(query),
        this.getMediaUploadStats(query)
      ]);

      const analytics = analyticsResult[0] || {
        totalProducts: 0,
        totalVotes: 0,
        totalCertificates: 0,
        totalViews: 0
      };

      const productAnalytics: ProductAnalytics = {
        totalProducts: analytics.totalProducts,
        activeProducts: analytics.totalProducts, // All queried products are active
        productsByCategory: categoriesBreakdown,
        avgVotesPerProduct: analytics.totalProducts > 0 ? analytics.totalVotes / analytics.totalProducts : 0,
        topPerformingProducts: topProducts,
        mediaUploadStats: mediaStats
      };

      // Cache the result
      await enhancedCacheService.cacheAnalytics('product', {
        businessId,
        manufacturerId,
        timeRange
      }, productAnalytics, {
        ttl: this.CACHE_TTL
      });

      const duration = Date.now() - startTime;
      logger.info(`Product analytics generated in ${duration}ms`, {
        businessId,
        manufacturerId,
        duration,
        totalProducts: productAnalytics.totalProducts
      });

      return productAnalytics;

    } catch (error) {
      logger.error('Failed to generate product analytics:', error);
      throw error;
    }
  }

  /**
   * Get manufacturer analytics with optimization
   */
  async getManufacturerAnalytics(timeRange?: AnalyticsTimeRange): Promise<ManufacturerAnalytics> {
    // Try cache first
    const cached = await enhancedCacheService.getCachedAnalytics('manufacturer', { timeRange }, {
      ttl: this.CACHE_TTL
    });

    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      const query: any = { isActive: { $ne: false } };
      if (timeRange) {
        query.createdAt = {
          $gte: timeRange.start,
          $lte: timeRange.end
        };
      }

      const [analyticsData, industriesData, servicesData, locationData, certificationData] = await Promise.all([
        this.getBasicManufacturerStats(query),
        this.getManufacturerIndustriesBreakdown(query),
        this.getServicesOfferedStats(query),
        this.getManufacturerLocationStats(query),
        this.getCertificationStats(query)
      ]);

      const manufacturerAnalytics: ManufacturerAnalytics = {
        totalManufacturers: analyticsData.total,
        verifiedManufacturers: analyticsData.verified,
        industriesBreakdown: industriesData,
        avgProfileScore: analyticsData.avgProfileScore,
        servicesOfferedStats: servicesData,
        locationStats: locationData,
        certificationStats: certificationData
      };

      // Cache the result
      await enhancedCacheService.cacheAnalytics('manufacturer', { timeRange }, manufacturerAnalytics, {
        ttl: this.CACHE_TTL
      });

      const duration = Date.now() - startTime;
      logger.info(`Manufacturer analytics generated in ${duration}ms`, {
        duration,
        totalManufacturers: manufacturerAnalytics.totalManufacturers
      });

      return manufacturerAnalytics;

    } catch (error) {
      logger.error('Failed to generate manufacturer analytics:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(
    businessId?: string,
    timeRange?: AnalyticsTimeRange
  ): Promise<DashboardAnalytics> {
    const cacheKey = `dashboard_analytics:${businessId || 'platform'}:${JSON.stringify(timeRange)}`;

    // Try cache first
    const cached = await enhancedCacheService.getCachedAnalytics('dashboard', {
      businessId,
      timeRange
    }, { ttl: this.SHORT_CACHE_TTL }); // Shorter cache for dashboard

    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      // Run all analytics in parallel for better performance
      const [votingAnalytics, businessAnalytics, productAnalytics, manufacturerAnalytics, systemHealth] = await Promise.all([
        businessId ? this.getVotingAnalytics(businessId, timeRange) : this.getPlatformVotingAnalytics(timeRange),
        this.getBusinessAnalytics({ dateRange: timeRange }),
        this.getProductAnalytics(businessId, undefined, timeRange),
        this.getManufacturerAnalytics(timeRange),
        this.getSystemHealthMetrics()
      ]);

      const dashboardAnalytics: DashboardAnalytics = {
        votingAnalytics,
        businessAnalytics,
        productAnalytics,
        manufacturerAnalytics,
        systemHealth
      };

      // Cache the result with shorter TTL for real-time dashboard
      await enhancedCacheService.cacheAnalytics('dashboard', {
        businessId,
        timeRange
      }, dashboardAnalytics, {
        ttl: this.SHORT_CACHE_TTL
      });

      const duration = Date.now() - startTime;
      logger.info(`Dashboard analytics generated in ${duration}ms`, {
        businessId,
        duration
      });

      return dashboardAnalytics;

    } catch (error) {
      logger.error('Failed to generate dashboard analytics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private calculateAvgVotesPerDay(analyticsData: any[], timeRange?: AnalyticsTimeRange): number {
    if (!analyticsData.length) return 0;

    const totalVotes = analyticsData.reduce((sum, item) => sum + item.totalVotes, 0);
    const days = timeRange ?
      Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24)) :
      analyticsData.length;

    return totalVotes / Math.max(days, 1);
  }

  private async getTopProductsForBusiness(businessId: string, timeRange?: AnalyticsTimeRange, limit: number = 5): Promise<any[]> {
    const query: any = { business: businessId };
    if (timeRange) {
      query.createdAt = { $gte: timeRange.start, $lte: timeRange.end };
    }

    return await Product.find(query)
      .sort({ voteCount: -1, certificateCount: -1 })
      .limit(limit)
      .select('title voteCount certificateCount')
      .lean();
  }

  private async getVotingSourcesBreakdown(businessId: string, timeRange?: AnalyticsTimeRange): Promise<Record<string, number>> {
    const query: any = { business: businessId };
    if (timeRange) {
      query.timestamp = { $gte: timeRange.start, $lte: timeRange.end };
    }

    const results = await VotingRecord.aggregate([
      { $match: query },
      { $group: { _id: '$votingSource', count: { $sum: 1 } } }
    ]);

    return results.reduce((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {} as Record<string, number>);
  }

  // Additional helper methods would be implemented here...
  private async getIndustriesBreakdown(filterOptions: any): Promise<Record<string, number>> {
    // Implementation for industries breakdown
    return {};
  }

  private async getPlansBreakdown(filterOptions: any): Promise<Record<string, number>> {
    // Implementation for plans breakdown
    return {};
  }

  private async getRecentSignupsCount(dateRange?: AnalyticsTimeRange): Promise<number> {
    // Implementation for recent signups count
    return 0;
  }

  private async getActiveBusinessesCount(): Promise<number> {
    return await Business.countDocuments({ isActive: { $ne: false } });
  }

  private async getTopPerformingProducts(businessId?: string, manufacturerId?: string, limit: number = 10): Promise<any[]> {
    const query: any = { status: 'active' };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    return await Product.find(query)
      .sort({ voteCount: -1, certificateCount: -1, viewCount: -1 })
      .limit(limit)
      .select('title voteCount certificateCount viewCount')
      .lean();
  }

  private async getCategoriesBreakdown(query: any): Promise<Record<string, number>> {
    const results = await Product.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    return results.reduce((acc, item) => {
      acc[item._id || 'uncategorized'] = item.count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getMediaUploadStats(query: any): Promise<any> {
    const results = await Product.aggregate([
      { $match: query },
      {
        $project: {
          mediaCount: { $size: { $ifNull: ['$media', []] } }
        }
      },
      {
        $group: {
          _id: null,
          withMedia: { $sum: { $cond: [{ $gt: ['$mediaCount', 0] }, 1, 0] } },
          withoutMedia: { $sum: { $cond: [{ $eq: ['$mediaCount', 0] }, 1, 0] } },
          totalMedia: { $sum: '$mediaCount' },
          totalProducts: { $sum: 1 }
        }
      }
    ]);

    const data = results[0] || { withMedia: 0, withoutMedia: 0, totalMedia: 0, totalProducts: 0 };

    return {
      withMedia: data.withMedia,
      withoutMedia: data.withoutMedia,
      avgMediaPerProduct: data.totalProducts > 0 ? data.totalMedia / data.totalProducts : 0
    };
  }

  private async getBasicManufacturerStats(query: any): Promise<any> {
    const results = await Manufacturer.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: { $sum: { $cond: ['$isEmailVerified', 1, 0] } },
          avgProfileScore: { $avg: '$profileScore' }
        }
      }
    ]);

    return results[0] || { total: 0, verified: 0, avgProfileScore: 0 };
  }

  private async getManufacturerIndustriesBreakdown(query: any): Promise<Record<string, number>> {
    // Implementation for manufacturer industries breakdown
    return {};
  }

  private async getServicesOfferedStats(query: any): Promise<Record<string, number>> {
    // Implementation for services offered stats
    return {};
  }

  /**
   * Get analytics using read replica for better performance
   */
  async getDashboardAnalyticsWithReplica(
    businessId: string,
    timeRange?: AnalyticsTimeRange
  ): Promise<any> {
    const startTime = Date.now();

    try {
      logger.info('Executing analytics query with read replica', { businessId });

      const analyticsData = await executeAnalyticsQuery(async (connection) => {
        // Use the replica connection for analytics queries
        const VotingRecordModel = connection.model('VotingRecord', VotingRecord.schema);
        const ProductModel = connection.model('Product', Product.schema);

        const query: any = { business: businessId };
        if (timeRange) {
          query.timestamp = { $gte: timeRange.start, $lte: timeRange.end };
        }

        // Execute analytics aggregation on read replica
        const [votingAnalytics, productStats] = await Promise.all([
          VotingRecordModel.aggregate([
            { $match: query },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
                },
                totalVotes: { $sum: 1 },
                uniqueVoters: { $addToSet: '$voterEmail' },
                products: { $addToSet: '$selectedProductId' }
              }
            },
            {
              $project: {
                date: '$_id',
                totalVotes: 1,
                uniqueVoters: { $size: '$uniqueVoters' },
                products: { $size: '$products' }
              }
            },
            { $sort: { date: 1 } }
          ]),

          ProductModel.aggregate([
            { $match: { business: businessId } },
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalVotes: { $sum: '$voteCount' },
                totalCertificates: { $sum: '$certificateCount' },
                totalViews: { $sum: '$viewCount' },
                avgPrice: { $avg: '$price' }
              }
            }
          ])
        ]);

        return {
          timeline: votingAnalytics,
          summary: productStats[0] || {
            totalProducts: 0,
            totalVotes: 0,
            totalCertificates: 0,
            totalViews: 0,
            avgPrice: 0
          }
        };
      });

      const duration = Date.now() - startTime;

      logger.info('Analytics query with read replica completed', {
        businessId,
        duration,
        dataPoints: analyticsData.timeline.length
      });

      return {
        ...analyticsData,
        executionTime: duration,
        source: 'read-replica'
      };

    } catch (error) {
      logger.error('Read replica analytics query failed, falling back to primary:', error);
      // Fallback to primary connection
      return this.getDashboardAnalytics(businessId, timeRange);
    }
  }

  /**
   * Get business reporting data using read replica
   */
  async getBusinessReportingData(businessId: string, reportType: string): Promise<any> {
    try {
      logger.info('Executing reporting query with read replica', { businessId, reportType });

      return await executeReportingQuery(async (connection) => {
        const ProductModel = connection.model('Product', Product.schema);
        const VotingRecordModel = connection.model('VotingRecord', VotingRecord.schema);

        switch (reportType) {
          case 'monthly-summary':
            return this.generateMonthlySummaryReport(ProductModel, VotingRecordModel, businessId);

          case 'product-performance':
            return this.generateProductPerformanceReport(ProductModel, VotingRecordModel, businessId);

          case 'voting-trends':
            return this.generateVotingTrendsReport(VotingRecordModel, businessId);

          default:
            throw new Error(`Unknown report type: ${reportType}`);
        }
      });

    } catch (error) {
      logger.error('Reporting query failed:', error);
      throw error;
    }
  }

  /**
   * Generate monthly summary report
   */
  private async generateMonthlySummaryReport(ProductModel: any, VotingRecordModel: any, businessId: string): Promise<any> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const [productStats, votingStats] = await Promise.all([
      ProductModel.aggregate([
        {
          $match: {
            business: businessId,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            newProducts: { $sum: 1 },
            totalVotes: { $sum: '$voteCount' },
            totalViews: { $sum: '$viewCount' },
            categories: { $addToSet: '$category' }
          }
        }
      ]),

      VotingRecordModel.aggregate([
        {
          $match: {
            business: businessId,
            timestamp: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalVotes: { $sum: 1 },
            uniqueVoters: { $addToSet: '$voterEmail' },
            avgVotesPerDay: {
              $avg: {
                $dayOfMonth: '$timestamp'
              }
            }
          }
        }
      ])
    ]);

    return {
      period: {
        start: startOfMonth,
        end: endOfMonth
      },
      products: productStats[0] || { newProducts: 0, totalVotes: 0, totalViews: 0, categories: [] },
      voting: votingStats[0] || { totalVotes: 0, uniqueVoters: [], avgVotesPerDay: 0 },
      generatedAt: new Date()
    };
  }

  /**
   * Generate product performance report
   */
  private async generateProductPerformanceReport(ProductModel: any, VotingRecordModel: any, businessId: string): Promise<any> {
    const products = await ProductModel.aggregate([
      { $match: { business: businessId } },
      {
        $lookup: {
          from: 'votingrecords',
          localField: '_id',
          foreignField: 'selectedProductId',
          as: 'votes',
          pipeline: [
            { $match: { isVerified: true } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                recentVotes: {
                  $push: {
                    timestamp: '$timestamp',
                    voterEmail: '$voterEmail'
                  }
                }
              }
            }
          ]
        }
      },
      {
        $addFields: {
          currentVoteCount: { $ifNull: [{ $arrayElemAt: ['$votes.count', 0] }, 0] },
          recentActivity: { $slice: [{ $arrayElemAt: ['$votes.recentVotes', 0] }, -10] }
        }
      },
      {
        $project: {
          title: 1,
          category: 1,
          price: 1,
          voteCount: 1,
          currentVoteCount: 1,
          viewCount: 1,
          certificateCount: 1,
          recentActivity: 1,
          createdAt: 1
        }
      },
      { $sort: { currentVoteCount: -1, viewCount: -1 } },
      { $limit: 50 }
    ]);

    return {
      products,
      summary: {
        totalProducts: products.length,
        topPerformer: products[0] || null,
        avgVotesPerProduct: products.reduce((sum, p) => sum + p.currentVoteCount, 0) / Math.max(products.length, 1)
      },
      generatedAt: new Date()
    };
  }

  /**
   * Generate voting trends report
   */
  private async generateVotingTrendsReport(VotingRecordModel: any, businessId: string): Promise<any> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trends = await VotingRecordModel.aggregate([
      {
        $match: {
          business: businessId,
          timestamp: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          votes: { $sum: 1 },
          uniqueVoters: { $addToSet: '$voterEmail' },
          sources: { $addToSet: '$votingSource' }
        }
      },
      {
        $project: {
          date: '$_id',
          votes: 1,
          uniqueVoters: { $size: '$uniqueVoters' },
          sources: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    return {
      period: {
        start: thirtyDaysAgo,
        end: new Date()
      },
      trends,
      summary: {
        totalVotes: trends.reduce((sum, day) => sum + day.votes, 0),
        avgVotesPerDay: trends.reduce((sum, day) => sum + day.votes, 0) / Math.max(trends.length, 1),
        peakDay: trends.reduce((max, day) => day.votes > max.votes ? day : max, { votes: 0 })
      },
      generatedAt: new Date()
    };
  }

  private async getManufacturerLocationStats(query: any): Promise<Record<string, number>> {
    // Implementation for location stats
    return {};
  }

  private async getCertificationStats(query: any): Promise<Record<string, number>> {
    // Implementation for certification stats
    return {};
  }

  private async getPlatformVotingAnalytics(timeRange?: AnalyticsTimeRange): Promise<VotingAnalytics> {
    // Implementation for platform-wide voting analytics
    return {
      totalVotes: 0,
      uniqueVoters: 0,
      verifiedVotes: 0,
      unverifiedVotes: 0,
      avgVotesPerDay: 0,
      topProducts: [],
      votingSources: {},
      dailyBreakdown: []
    };
  }

  private async getSystemHealthMetrics(): Promise<any> {
    return {
      totalUsers: await Business.countDocuments() + await Manufacturer.countDocuments(),
      activeUsers: 0, // Would implement based on last login
      systemLoad: 0, // Would integrate with system monitoring
      uptime: process.uptime()
    };
  }
}

export const optimizedAnalyticsService = new AnalyticsService();