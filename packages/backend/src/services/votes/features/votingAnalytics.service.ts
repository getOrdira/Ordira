import { logger } from '../../../utils/logger';
import { enhancedCacheService } from '../../infrastructure/cache/features/enhancedCache.service'; 
import {
  createAnalyticsCacheMetadata,
  VOTING_CACHE_TTL
} from '../utils/cache';
import type {
  VotingAnalytics,
  VotingAnalyticsOptions
} from '../utils/types';
import { votingValidationService } from '../validation/votingValidation.service';
import { votingDataService } from '../core/votingData.service';
import { votingStatsService } from './votingStats.service';

export class VotingAnalyticsService {
  constructor(
    private readonly dataService = votingDataService,
    private readonly statsService = votingStatsService
  ) {}

  async getVotingAnalytics(businessId: string, options: VotingAnalyticsOptions = {}): Promise<VotingAnalytics> {
    const validatedBusinessId = votingValidationService.ensureBusinessId(businessId);
    const normalizedOptions = votingValidationService.normalizeAnalyticsOptions(options);
    const { useCache, includeRecommendations, includeTrends, proposalId } = normalizedOptions;

    const cacheMetadata = createAnalyticsCacheMetadata(validatedBusinessId, normalizedOptions);

    if (useCache) {
      const cached = await enhancedCacheService.getCachedAnalytics('voting', cacheMetadata);
      if (cached) {
        logger.debug('Voting analytics cache hit', {
          businessId: validatedBusinessId
        });
        return cached as VotingAnalytics;
      }
    }

    const [stats, recentActivity, proposalStats] = await Promise.all([
      this.statsService.getVotingStats(validatedBusinessId, useCache),
      this.dataService.getRecentVotingActivity(validatedBusinessId, normalizedOptions),
      proposalId ? this.dataService.getProposalPendingStats(validatedBusinessId, proposalId) : Promise.resolve(undefined)
    ]);

    const analytics: VotingAnalytics = {
      overview: {
        totalProposals: stats.totalProposals,
        totalVotes: stats.totalVotes,
        pendingVotes: stats.pendingVotes,
        participationRate: stats.participationRate || '0%',
        contractAddress: stats.contractAddress
      },
      trends: includeTrends
        ? recentActivity.trends
        : {
            dailyActivity: {},
            totalActivityInPeriod: 0,
            dateRange: { from: '', to: '' }
          },
      proposalStats
    };

    if (includeRecommendations) {
      analytics.recommendations = this.generateVotingRecommendations(analytics);
      analytics.projectedActivity = this.calculateProjectedActivity(recentActivity.trends);
    }

    if (useCache) {
      await enhancedCacheService.cacheAnalytics(
        'voting',
        cacheMetadata,
        analytics,
        { keyPrefix: 'ordira', ttl: VOTING_CACHE_TTL.votingAnalytics }
      );
    }

    logger.info('Voting analytics generated successfully', {
      businessId: validatedBusinessId,
      includeRecommendations,
      includeTrends,
      cached: false
    });

    return analytics;
  }

  private generateVotingRecommendations(analytics: VotingAnalytics): string[] {
    const recommendations: string[] = [];

    const participationNum = parseInt(analytics.overview.participationRate.replace('%', '') || '0', 10);
    if (participationNum < 25) {
      recommendations.push('Consider incentivizing participation with rewards or gamification');
    }

    const totalActivity = analytics.trends.totalActivityInPeriod;
    if (totalActivity === 0) {
      recommendations.push('Create engaging proposals to encourage community participation');
    } else if (totalActivity < 5) {
      recommendations.push('Increase proposal frequency to maintain engagement');
    }

    if (analytics.overview.pendingVotes > 20) {
      recommendations.push('Process pending votes regularly to maintain system efficiency');
    }

    if (!analytics.overview.contractAddress) {
      recommendations.push('Deploy a voting contract to enable blockchain-based voting');
    }

    return recommendations;
  }

  private calculateProjectedActivity(trends: VotingAnalytics['trends']): {
    nextWeekEstimate: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
  } {
    const dailyValues = Object.values(trends.dailyActivity);
    if (dailyValues.length === 0) {
      return { nextWeekEstimate: 0, trendDirection: 'stable' };
    }

    const average = dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length;
    const nextWeekEstimate = Math.round(average * 7);

    const recentValues = dailyValues.slice(-7);
    const earlyValues = dailyValues.slice(0, 7);
    const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / (recentValues.length || 1);
    const earlyAvg = earlyValues.reduce((sum, val) => sum + val, 0) / (earlyValues.length || 1);

    let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAvg > earlyAvg * 1.1) {
      trendDirection = 'increasing';
    } else if (recentAvg < earlyAvg * 0.9) {
      trendDirection = 'decreasing';
    }

    return { nextWeekEstimate, trendDirection };
  }
}

export const votingAnalyticsService = new VotingAnalyticsService();
