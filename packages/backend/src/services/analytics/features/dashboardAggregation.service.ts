import {
  platformAnalyticsDataService
} from '../core/platformAnalyticsData.service';
import { reportingDataService } from '../core/reportingData.service';
import { systemHealthService } from './systemHealth.service';
import {
  ANALYTICS_CACHE_SEGMENT,
  ANALYTICS_CACHE_TTL,
  readAnalyticsCache,
  writeAnalyticsCache
} from '../utils/cache';
import {
  normalizeGrouping,
  normalizeTimeRange
} from '../utils/helpers';
import type {
  DashboardAggregationOptions,
  DashboardAnalyticsSnapshot,
  PlatformVotingAnalytics
} from '../utils/types';

/**
 * Aggregates platform analytics data for dashboards and reporting use-cases.
 */
export class DashboardAggregationService {
  /**
   * Retrieve dashboard analytics snapshot composed of multiple analytics domains.
   */
  async getDashboardAnalytics(options: DashboardAggregationOptions = {}): Promise<DashboardAnalyticsSnapshot> {
    const normalizedRange = normalizeTimeRange(options.timeRange);
    const groupBy = normalizeGrouping(options.groupBy);
    const includeSystemHealth = options.includeSystemHealth !== false;

    const cacheKey = {
      businessId: options.businessId || null,
      manufacturerId: options.manufacturerId || null,
      start: normalizedRange?.start,
      end: normalizedRange?.end,
      groupBy,
      includeSystemHealth
    };

    const cached = await readAnalyticsCache<DashboardAnalyticsSnapshot>(
      ANALYTICS_CACHE_SEGMENT.dashboard,
      cacheKey
    );
    if (cached) {
      return cached;
    }

    const [votingAnalytics, businessAnalytics, productAnalytics, manufacturerAnalytics, systemHealth] = await Promise.all([
      this.resolveVotingAnalytics(options, normalizedRange, groupBy),
      platformAnalyticsDataService.getBusinessAnalytics({ timeRange: normalizedRange }),
      platformAnalyticsDataService.getProductAnalytics({
        businessId: options.businessId,
        manufacturerId: options.manufacturerId,
        timeRange: normalizedRange
      }),
      platformAnalyticsDataService.getManufacturerAnalytics({ timeRange: normalizedRange }),
      includeSystemHealth ? systemHealthService.getSystemHealthMetrics() : Promise.resolve(undefined)
    ]);

    const snapshot: DashboardAnalyticsSnapshot = {
      votingAnalytics,
      businessAnalytics,
      productAnalytics,
      manufacturerAnalytics,
      systemHealth: systemHealth || {
        totalUsers: 0,
        activeUsers: 0,
        systemLoad: 0,
        uptime: Math.round(process.uptime())
      },
      updatedAt: new Date()
    };

    await writeAnalyticsCache(
      ANALYTICS_CACHE_SEGMENT.dashboard,
      cacheKey,
      snapshot,
      { ttl: ANALYTICS_CACHE_TTL.short }
    );

    return snapshot;
  }

  private async resolveVotingAnalytics(
    options: DashboardAggregationOptions,
    timeRange: ReturnType<typeof normalizeTimeRange>,
    groupBy: ReturnType<typeof normalizeGrouping>
  ): Promise<PlatformVotingAnalytics> {
    if (options.businessId) {
      if (options.useReadReplica) {
        const replica = await reportingDataService.getDashboardAnalyticsWithReplica(options.businessId, timeRange || undefined);
        return {
          totalVotes: replica.timeline.reduce((sum, item) => sum + item.totalVotes, 0),
          uniqueVoters: replica.timeline.reduce((sum, item) => sum + item.uniqueVoters, 0),
          verifiedVotes: 0,
          unverifiedVotes: 0,
          avgVotesPerDay: replica.timeline.length > 0 ? replica.timeline.reduce((sum, item) => sum + item.totalVotes, 0) / replica.timeline.length : 0,
          topProducts: [],
          votingSources: {},
          dailyBreakdown: replica.timeline.map(item => ({
            date: item.date,
            votes: item.totalVotes,
            uniqueVoters: item.uniqueVoters
          }))
        };
      }

      return platformAnalyticsDataService.getVotingAnalyticsForBusiness(options.businessId, {
        timeRange,
        groupBy
      });
    }

    return platformAnalyticsDataService.getPlatformVotingAnalytics({
      timeRange,
      groupBy
    });
  }
}

export const dashboardAggregationService = new DashboardAggregationService();
