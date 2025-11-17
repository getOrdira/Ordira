import { logger } from '../../../utils/logger';
import { enhancedCacheService } from '../../infrastructure/cache/features/enhancedCache.service'; 
import { votingDataService } from '../core/votingData.service';
import { votingAnalyticsService } from './votingAnalytics.service';
import { votingStatsService } from './votingStats.service';
import {
  getVotingCacheTags
} from '../utils/cache';
import type { VotingDashboardData, VotingHealthStatus } from '../utils/types';
import { votingValidationService } from '../validation/votingValidation.service';

export class VotingDashboardService {
  constructor(
    private readonly dataService = votingDataService,
    private readonly analyticsService = votingAnalyticsService,
    private readonly statsService = votingStatsService
  ) {}

  async getVotingDashboard(businessId: string): Promise<VotingDashboardData> {
    const validatedBusinessId = votingValidationService.ensureBusinessId(businessId);

    const [stats, analytics, recentVotes, pendingCount] = await Promise.all([
      this.statsService.getVotingStats(validatedBusinessId, true),
      this.analyticsService.getVotingAnalytics(validatedBusinessId, {
        includeRecommendations: true,
        includeTrends: true,
        useCache: true
      }),
      this.dataService.getBusinessVotes(validatedBusinessId, { limit: 10, useCache: true }),
      this.dataService.countPendingVotes(validatedBusinessId)
    ]);

    logger.info('Voting dashboard data retrieved successfully', {
      businessId: validatedBusinessId,
      componentsCount: 4
    });

    return {
      stats,
      analytics,
      recentVotes,
      pendingCount,
      recommendations: analytics.recommendations || []
    };
  }

  async clearVotingCaches(businessId: string): Promise<void> {
    const validatedBusinessId = votingValidationService.ensureBusinessId(businessId);
    await enhancedCacheService.invalidateByTags(getVotingCacheTags(validatedBusinessId));
    logger.info('Voting caches cleared successfully', { businessId: validatedBusinessId });
  }

  async getVotingServiceHealth(): Promise<VotingHealthStatus> {
    const startTime = Date.now();

    try {
      await enhancedCacheService.getCachedAnalytics('voting', { type: 'health-check' });
      await enhancedCacheService.cacheAnalytics(
        'voting',
        { type: 'health-check' },
        { timestamp: Date.now() },
        { keyPrefix: 'ordira', ttl: 1000 }
      );

      const averageQueryTime = Date.now() - startTime;

      return {
        status: averageQueryTime < 100 ? 'healthy' : averageQueryTime < 500 ? 'degraded' : 'unhealthy',
        cacheStatus: 'operational',
        dbOptimizationStatus: 'active',
        averageQueryTime,
        optimizationsActive: [
          'aggressiveCaching',
          'queryOptimization',
          'parallelProcessing',
          'indexOptimization',
          'analyticsCaching'
        ]
      };
    } catch (error: any) {
      logger.error('Voting service health check failed', { error: error.message });

      return {
        status: 'unhealthy',
        cacheStatus: 'error',
        dbOptimizationStatus: 'unknown',
        averageQueryTime: -1,
        optimizationsActive: []
      };
    }
  }
}

export const votingDashboardService = new VotingDashboardService();



