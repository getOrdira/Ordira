import { VotingRecord } from '../../../models/voting/votingRecord.model';
import { Product } from '../../../models/products/product.model';
import { Business } from '../../../models/core/business.model'; 
import { Manufacturer } from '../../../models/manufacturer/manufacturer.model';
import { queryOptimizationService } from '../../infrastructure/database/features/queryOptimization.service'; 
import { enhancedCacheService } from '../../infrastructure/cache/features/enhancedCache.service'; 
import {
  ANALYTICS_CACHE_SEGMENT,
  ANALYTICS_CACHE_TTL,
  readAnalyticsCache,
  writeAnalyticsCache
} from '../utils/cache';
import {
  calculateAvgVotesPerDay,
  normalizeGrouping,
  normalizeTimeRange,
  safeNumber
} from '../utils/helpers';
import type {
  AnalyticsGrouping,
  AnalyticsRequestContext,
  AnalyticsTimeRange,
  BusinessAnalyticsSnapshot,
  ManufacturerAnalyticsSnapshot,
  PlatformVotingAnalytics,
  ProductAnalyticsSnapshot,
  ProductPerformanceEntry,
  VotingLeaderboardEntry
} from '../utils/types';

interface BusinessAnalyticsOptions extends AnalyticsRequestContext {
  industry?: string;
  plan?: string;
  verified?: boolean;
}

interface ProductAnalyticsOptions extends AnalyticsRequestContext {}

interface ManufacturerAnalyticsOptions extends AnalyticsRequestContext {}

interface VotingAnalyticsOptions extends AnalyticsRequestContext {
  groupBy?: AnalyticsGrouping;
}

/**
 * Core data access for platform-wide analytics.
 */
export class PlatformAnalyticsDataService {
  private readonly productFields = 'title voteCount certificateCount viewCount business manufacturer';

  /**
   * Retrieve business analytics snapshot using optimized aggregations.
   */
  async getBusinessAnalytics(options: BusinessAnalyticsOptions = {}): Promise<BusinessAnalyticsSnapshot> {
    const normalizedRange = normalizeTimeRange(options.timeRange);
    const cacheKey = {
      industry: options.industry || null,
      plan: options.plan || null,
      verified: options.verified ?? null,
      start: normalizedRange?.start,
      end: normalizedRange?.end
    };

    const cached = await readAnalyticsCache<BusinessAnalyticsSnapshot>(
      ANALYTICS_CACHE_SEGMENT.business,
      cacheKey
    );
    if (cached) {
      return cached;
    }

    const analyticsData = await queryOptimizationService.optimizedBusinessAnalytics({
      industry: options.industry,
      verified: options.verified,
      plan: options.plan,
      dateRange: normalizedRange
    }, Business);

    const [industriesBreakdown, plansBreakdown, recentSignups, activeBusinesses] = await Promise.all([
      this.getIndustriesBreakdown(options),
      this.getPlansBreakdown(options),
      this.getRecentSignupsCount(normalizedRange),
      this.getActiveBusinessesCount()
    ]);

    const snapshot: BusinessAnalyticsSnapshot = {
      totalBusinesses: analyticsData.analytics.total || 0,
      verifiedBusinesses: analyticsData.analytics.verified || 0,
      verificationRate: analyticsData.analytics.verificationRate || 0,
      industriesBreakdown,
      plansBreakdown,
      avgProfileViews: analyticsData.analytics.avgProfileViews || 0,
      recentSignups,
      activeBusinesses
    };

    await writeAnalyticsCache(
      ANALYTICS_CACHE_SEGMENT.business,
      cacheKey,
      snapshot,
      { ttl: ANALYTICS_CACHE_TTL.default }
    );

    return snapshot;
  }

  /**
   * Retrieve product analytics snapshot for a business or manufacturer.
   */
  async getProductAnalytics(options: ProductAnalyticsOptions = {}): Promise<ProductAnalyticsSnapshot> {
    const normalizedRange = normalizeTimeRange(options.timeRange);
    const cacheKey = {
      businessId: options.businessId || null,
      manufacturerId: options.manufacturerId || null,
      start: normalizedRange?.start,
      end: normalizedRange?.end
    };

    const cached = await readAnalyticsCache<ProductAnalyticsSnapshot>(
      ANALYTICS_CACHE_SEGMENT.product,
      cacheKey
    );
    if (cached) {
      return cached;
    }

    const query = this.buildProductQuery(options.businessId, options.manufacturerId, normalizedRange);
    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalVotes: { $sum: { $ifNull: ['$voteCount', 0] } },
          totalCertificates: { $sum: { $ifNull: ['$certificateCount', 0] } },
          totalViews: { $sum: { $ifNull: ['$viewCount', 0] } }
        }
      }
    ];

    const [analyticsResult, topProducts, categoriesBreakdown, mediaStats] = await Promise.all([
      Product.aggregate(pipeline),
      this.getTopPerformingProducts(options.businessId, options.manufacturerId, 10),
      this.getCategoriesBreakdown(query),
      this.getMediaUploadStats(query)
    ]);

    const totals = analyticsResult[0] || {
      totalProducts: 0,
      totalVotes: 0,
      totalCertificates: 0
    };

    const snapshot: ProductAnalyticsSnapshot = {
      totalProducts: totals.totalProducts || 0,
      activeProducts: totals.totalProducts || 0,
      productsByCategory: categoriesBreakdown,
      avgVotesPerProduct: totals.totalProducts > 0 ? totals.totalVotes / totals.totalProducts : 0,
      topPerformingProducts: topProducts,
      mediaUploadStats: mediaStats
    };

    await writeAnalyticsCache(
      ANALYTICS_CACHE_SEGMENT.product,
      cacheKey,
      snapshot,
      { ttl: ANALYTICS_CACHE_TTL.default }
    );

    return snapshot;
  }

  /**
   * Retrieve manufacturer analytics snapshot for the platform.
   */
  async getManufacturerAnalytics(options: ManufacturerAnalyticsOptions = {}): Promise<ManufacturerAnalyticsSnapshot> {
    const normalizedRange = normalizeTimeRange(options.timeRange);
    const cacheKey = {
      start: normalizedRange?.start,
      end: normalizedRange?.end
    };

    const cached = await readAnalyticsCache<ManufacturerAnalyticsSnapshot>(
      ANALYTICS_CACHE_SEGMENT.manufacturer,
      cacheKey
    );
    if (cached) {
      return cached;
    }

    const query: Record<string, unknown> = { isActive: { $ne: false } };
    if (normalizedRange) {
      query.createdAt = {
        $gte: normalizedRange.start,
        $lte: normalizedRange.end
      };
    }

    const [analyticsData, industriesBreakdown, servicesStats, locationStats, certificationStats] = await Promise.all([
      this.getBasicManufacturerStats(query),
      this.getManufacturerIndustriesBreakdown(query),
      this.getServicesOfferedStats(query),
      this.getManufacturerLocationStats(query),
      this.getCertificationStats(query)
    ]);

    const snapshot: ManufacturerAnalyticsSnapshot = {
      totalManufacturers: analyticsData.total,
      verifiedManufacturers: analyticsData.verified,
      industriesBreakdown,
      avgProfileScore: analyticsData.avgProfileScore,
      servicesOfferedStats: servicesStats,
      locationStats,
      certificationStats
    };

    await writeAnalyticsCache(
      ANALYTICS_CACHE_SEGMENT.manufacturer,
      cacheKey,
      snapshot,
      { ttl: ANALYTICS_CACHE_TTL.default }
    );

    return snapshot;
  }

  /**
   * Business-focused voting analytics leveraging optimized aggregations.
   */
  async getVotingAnalyticsForBusiness(businessId: string, options: VotingAnalyticsOptions = {}): Promise<PlatformVotingAnalytics> {
    const normalizedRange = normalizeTimeRange(options.timeRange);
    const groupBy = normalizeGrouping(options.groupBy);

    const cached = await enhancedCacheService.getCachedVotingAnalytics(businessId, {
      timeRange: normalizedRange,
      groupBy
    });
    if (cached) {
      return cached;
    }

    const analyticsData = await queryOptimizationService.optimizedVotingAnalytics({
      businessId,
      dateRange: normalizedRange,
      groupBy
    }, VotingRecord);

    const topProducts = await this.getTopProductsForBusiness(businessId, normalizedRange, 5);
    const votingSources = await this.getVotingSourcesBreakdown(businessId, normalizedRange);

    const totalVotes = analyticsData.analytics.reduce((sum: number, item: any) => sum + safeNumber(item.totalVotes), 0);
    const verifiedVotes = analyticsData.analytics.reduce((sum: number, item: any) => sum + safeNumber(item.verifiedVotes), 0);

    const analytics: PlatformVotingAnalytics = {
      totalVotes,
      uniqueVoters: analyticsData.analytics.reduce((sum: number, item: any) => sum + safeNumber(item.uniqueVoters), 0),
      verifiedVotes,
      unverifiedVotes: Math.max(totalVotes - verifiedVotes, 0),
      avgVotesPerDay: calculateAvgVotesPerDay(analyticsData.analytics, normalizedRange),
      topProducts,
      votingSources,
      dailyBreakdown: analyticsData.analytics.map((item: any) => ({
        date: item._id,
        votes: safeNumber(item.totalVotes),
        uniqueVoters: safeNumber(item.uniqueVoters)
      }))
    };

    await enhancedCacheService.cacheVotingAnalytics(businessId, {
      timeRange: normalizedRange,
      groupBy
    }, analytics, {
      ttl: ANALYTICS_CACHE_TTL.default
    });

    return analytics;
  }

  /**
   * Platform-wide voting analytics without business scope.
   */
  async getPlatformVotingAnalytics(options: VotingAnalyticsOptions = {}): Promise<PlatformVotingAnalytics> {
    const normalizedRange = normalizeTimeRange(options.timeRange);
    const groupBy = normalizeGrouping(options.groupBy);

    const cacheKey = {
      start: normalizedRange?.start,
      end: normalizedRange?.end,
      groupBy
    };

    const cached = await readAnalyticsCache<PlatformVotingAnalytics>(
      ANALYTICS_CACHE_SEGMENT.voting,
      cacheKey
    );
    if (cached) {
      return cached;
    }

    const matchStage: Record<string, unknown> = {};
    if (normalizedRange) {
      matchStage.timestamp = {
        $gte: normalizedRange.start,
        $lte: normalizedRange.end
      };
    }

    const pipeline = [
      { $match: matchStage },
      this.buildVotingGroupStage(groupBy),
      { $sort: { _id: 1 as const } }
    ];

    const timelineRaw = await VotingRecord.aggregate(pipeline);
    const timeline = timelineRaw.map((item: any) => ({
      date: this.formatGroupKey(item._id, groupBy),
      totalVotes: safeNumber(item.totalVotes),
      uniqueVoters: Array.isArray(item.uniqueVoters) ? item.uniqueVoters.length : safeNumber(item.uniqueVoters),
      verifiedVotes: safeNumber(item.verifiedVotes)
    }));

    const totalVotes = timeline.reduce((sum, entry) => sum + entry.totalVotes, 0);
    const verifiedVotes = timeline.reduce((sum, entry) => sum + entry.verifiedVotes, 0);

    const analytics: PlatformVotingAnalytics = {
      totalVotes,
      uniqueVoters: timeline.reduce((sum, entry) => sum + entry.uniqueVoters, 0),
      verifiedVotes,
      unverifiedVotes: Math.max(totalVotes - verifiedVotes, 0),
      avgVotesPerDay: calculateAvgVotesPerDay(timeline.map(entry => ({ totalVotes: entry.totalVotes })), normalizedRange),
      topProducts: await this.getTopProductsForBusiness(undefined, normalizedRange, 5),
      votingSources: await this.getVotingSourcesBreakdown(undefined, normalizedRange),
      dailyBreakdown: timeline.map(entry => ({
        date: entry.date,
        votes: entry.totalVotes,
        uniqueVoters: entry.uniqueVoters
      }))
    };

    await writeAnalyticsCache(
      ANALYTICS_CACHE_SEGMENT.voting,
      cacheKey,
      analytics,
      { ttl: ANALYTICS_CACHE_TTL.short }
    );

    return analytics;
  }

  private buildProductQuery(
    businessId?: string,
    manufacturerId?: string,
    timeRange?: AnalyticsTimeRange
  ): Record<string, unknown> {
    const query: Record<string, unknown> = { status: 'active' };
    if (businessId) {
      query.business = businessId;
    }
    if (manufacturerId) {
      query.manufacturer = manufacturerId;
    }
    if (timeRange) {
      query.createdAt = {
        $gte: timeRange.start,
        $lte: timeRange.end
      };
    }
    return query;
  }

  private buildVotingGroupStage(groupBy: AnalyticsGrouping) {
    if (groupBy === 'month') {
      return {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' }
          },
          totalVotes: { $sum: 1 },
          uniqueVoters: { $addToSet: '$voterEmail' },
          verifiedVotes: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } }
        }
      };
    }

    if (groupBy === 'week') {
      return {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            week: { $week: '$timestamp' }
          },
          totalVotes: { $sum: 1 },
          uniqueVoters: { $addToSet: '$voterEmail' },
          verifiedVotes: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } }
        }
      };
    }

    return {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
        },
        totalVotes: { $sum: 1 },
        uniqueVoters: { $addToSet: '$voterEmail' },
        verifiedVotes: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } }
      }
    };
  }

  private formatGroupKey(groupKey: any, groupBy: AnalyticsGrouping): string {
    if (!groupKey) {
      return '';
    }

    if (groupBy === 'month') {
      return `${groupKey.year}-${String(groupKey.month).padStart(2, '0')}`;
    }

    if (groupBy === 'week') {
      return `${groupKey.year}-W${String(groupKey.week).padStart(2, '0')}`;
    }

    return typeof groupKey === 'string' ? groupKey : '';
  }

  private async getTopProductsForBusiness(
    businessId?: string,
    timeRange?: AnalyticsTimeRange,
    limit: number = 5
  ): Promise<VotingLeaderboardEntry[]> {
    const query: Record<string, unknown> = {};
    if (businessId) {
      query.business = businessId;
    }
    if (timeRange) {
      query.createdAt = {
        $gte: timeRange.start,
        $lte: timeRange.end
      };
    }

    const products = await Product.find(query)
      .sort({ voteCount: -1, certificateCount: -1 })
      .limit(limit)
      .select(this.productFields)
      .lean();

    return products.map((product: any) => ({
      productId: String(product._id),
      productTitle: product.title,
      voteCount: safeNumber(product.voteCount),
      certificateCount: safeNumber(product.certificateCount),
      engagementScore: this.calculateEngagementScore(product)
    }));
  }

  private calculateEngagementScore(product: any): number {
    const voteScore = safeNumber(product.voteCount) * 2;
    const certificateScore = safeNumber(product.certificateCount) * 3;
    const viewScore = safeNumber(product.viewCount) * 0.2;
    return Math.round(voteScore + certificateScore + viewScore);
  }

  private async getVotingSourcesBreakdown(
    businessId?: string,
    timeRange?: AnalyticsTimeRange
  ): Promise<Record<string, number>> {
    const matchStage: Record<string, unknown> = {};
    if (businessId) {
      matchStage.business = businessId;
    }
    if (timeRange) {
      matchStage.timestamp = {
        $gte: timeRange.start,
        $lte: timeRange.end
      };
    }

    const results = await VotingRecord.aggregate([
      { $match: matchStage },
      { $group: { _id: '$votingSource', count: { $sum: 1 } } }
    ]);

    return results.reduce((acc, item) => {
      const key = item._id || 'unknown';
      acc[key] = safeNumber(item.count);
      return acc;
    }, {} as Record<string, number>);
  }

  private async getIndustriesBreakdown(options: BusinessAnalyticsOptions): Promise<Record<string, number>> {
    const matchStage: Record<string, unknown> = {};
    if (options.plan) {
      matchStage.plan = options.plan;
    }
    if (options.verified !== undefined) {
      matchStage.isVerified = options.verified;
    }

    const results = await Business.aggregate([
      { $match: matchStage },
      { $group: { _id: '$industry', count: { $sum: 1 } } }
    ]);

    return results.reduce((acc, item) => {
      const key = item._id || 'unknown';
      acc[key] = safeNumber(item.count);
      return acc;
    }, {} as Record<string, number>);
  }

  private async getPlansBreakdown(options: BusinessAnalyticsOptions): Promise<Record<string, number>> {
    const matchStage: Record<string, unknown> = {};
    if (options.industry) {
      matchStage.industry = options.industry;
    }
    if (options.verified !== undefined) {
      matchStage.isVerified = options.verified;
    }

    const results = await Business.aggregate([
      { $match: matchStage },
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]);

    return results.reduce((acc, item) => {
      const key = item._id || 'unknown';
      acc[key] = safeNumber(item.count);
      return acc;
    }, {} as Record<string, number>);
  }

  private async getRecentSignupsCount(timeRange?: AnalyticsTimeRange): Promise<number> {
    if (!timeRange) {
      return 0;
    }

    return Business.countDocuments({
      createdAt: {
        $gte: timeRange.start,
        $lte: timeRange.end
      }
    });
  }

  private async getActiveBusinessesCount(): Promise<number> {
    return Business.countDocuments({ isActive: { $ne: false } });
  }

  private async getTopPerformingProducts(
    businessId?: string,
    manufacturerId?: string,
    limit: number = 10
  ): Promise<ProductPerformanceEntry[]> {
    const query: Record<string, unknown> = { status: 'active' };
    if (businessId) {
      query.business = businessId;
    }
    if (manufacturerId) {
      query.manufacturer = manufacturerId;
    }

    const products = await Product.find(query)
      .sort({ voteCount: -1, certificateCount: -1, viewCount: -1 })
      .limit(limit)
      .select('title voteCount certificateCount viewCount')
      .lean();

    return products.map((product: any) => ({
      id: String(product._id),
      title: product.title,
      voteCount: safeNumber(product.voteCount),
      certificateCount: safeNumber(product.certificateCount),
      engagementScore: this.calculateEngagementScore(product)
    }));
  }

  private async getCategoriesBreakdown(query: Record<string, unknown>): Promise<Record<string, number>> {
    const results = await Product.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    return results.reduce((acc, item) => {
      const key = item._id || 'uncategorized';
      acc[key] = safeNumber(item.count);
      return acc;
    }, {} as Record<string, number>);
  }

  private async getMediaUploadStats(query: Record<string, unknown>) {
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
      withMedia: safeNumber(data.withMedia),
      withoutMedia: safeNumber(data.withoutMedia),
      avgMediaPerProduct: data.totalProducts > 0 ? safeNumber(data.totalMedia) / data.totalProducts : 0
    };
  }

  private async getBasicManufacturerStats(query: Record<string, unknown>) {
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

    const data = results[0] || { total: 0, verified: 0, avgProfileScore: 0 };
    return {
      total: safeNumber(data.total),
      verified: safeNumber(data.verified),
      avgProfileScore: safeNumber(data.avgProfileScore)
    };
  }

  private async getManufacturerIndustriesBreakdown(query: Record<string, unknown>): Promise<Record<string, number>> {
    const results = await Manufacturer.aggregate([
      { $match: query },
      { $unwind: { path: '$industry', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$industry', count: { $sum: 1 } } }
    ]);

    return results.reduce((acc, item) => {
      const key = item._id || 'unspecified';
      acc[key] = safeNumber(item.count);
      return acc;
    }, {} as Record<string, number>);
  }

  private async getServicesOfferedStats(query: Record<string, unknown>): Promise<Record<string, number>> {
    const results = await Manufacturer.aggregate([
      { $match: query },
      { $unwind: { path: '$servicesOffered', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$servicesOffered', count: { $sum: 1 } } }
    ]);

    return results.reduce((acc, item) => {
      const key = item._id || 'unspecified';
      acc[key] = safeNumber(item.count);
      return acc;
    }, {} as Record<string, number>);
  }

  private async getManufacturerLocationStats(query: Record<string, unknown>): Promise<Record<string, number>> {
    const results = await Manufacturer.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 }
        }
      }
    ]);

    return results.reduce((acc, item) => {
      const key = item._id || 'unknown';
      acc[key] = safeNumber(item.count);
      return acc;
    }, {} as Record<string, number>);
  }

  private async getCertificationStats(query: Record<string, unknown>): Promise<Record<string, number>> {
    const results = await Manufacturer.aggregate([
      { $match: query },
      { $unwind: { path: '$certifications', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$certifications.type', count: { $sum: 1 } } }
    ]);

    return results.reduce((acc, item) => {
      const key = item._id || 'uncategorized';
      acc[key] = safeNumber(item.count);
      return acc;
    }, {} as Record<string, number>);
  }
}

export const platformAnalyticsDataService = new PlatformAnalyticsDataService();



