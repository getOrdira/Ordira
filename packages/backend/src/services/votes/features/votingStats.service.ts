import { logger } from '../../../utils/logger';
import { enhancedCacheService } from '../../external/enhanced-cache.service';
import {
  createStatsCacheMetadata,
  VOTING_CACHE_TTL
} from '../utils/cache';
import type { VotingStats } from '../utils/types';
import { votingValidationService } from '../validation/votingValidation.service';
import { votingContractService } from '../core/votingContract.service';
import { votingDataService } from '../core/votingData.service';

export class VotingStatsService {
  constructor(
    private readonly dataService = votingDataService,
    private readonly contractService = votingContractService
  ) {}

  async getVotingStats(businessId: string, useCache: boolean = true): Promise<VotingStats> {
    const validatedBusinessId = votingValidationService.ensureBusinessId(businessId);

    if (useCache) {
      const cached = await enhancedCacheService.getCachedAnalytics('voting', createStatsCacheMetadata(validatedBusinessId));
      if (cached) {
        logger.debug('Voting stats cache hit', { businessId: validatedBusinessId });
        return cached as VotingStats;
      }
    }

    const [contractAddress, votingRecords, pendingVotes] = await Promise.all([
      this.dataService.getVoteContractAddress(validatedBusinessId),
      this.dataService.countVotingRecords(validatedBusinessId),
      this.dataService.countPendingVotes(validatedBusinessId)
    ]);

    let totalProposals = 0;
    let totalVotes = votingRecords;
    let activeProposals = 0;

    if (contractAddress) {
      try {
        const contractInfo = await this.contractService.getContractInfo(contractAddress);
        totalProposals = contractInfo.totalProposals;
        totalVotes = Math.max(contractInfo.totalVotes, votingRecords);
        activeProposals = contractInfo.activeProposals || 0;
      } catch (error: any) {
        logger.warn('Failed to get blockchain voting stats, falling back to database', {
          businessId: validatedBusinessId,
          error: error.message
        });
      }
    }

    const participationRate = totalProposals > 0
      ? `${Math.round((totalVotes / totalProposals) * 100)}%`
      : '0%';

    const stats: VotingStats = {
      totalProposals,
      totalVotes,
      pendingVotes,
      contractAddress: contractAddress,
      activeProposals,
      participationRate
    };

    if (useCache) {
      await enhancedCacheService.cacheAnalytics(
        'voting',
        createStatsCacheMetadata(validatedBusinessId),
        stats,
        { keyPrefix: 'ordira', ttl: VOTING_CACHE_TTL.votingStats }
      );
    }

    logger.debug('Voting stats generated successfully', {
      businessId: validatedBusinessId,
      cached: false
    });

    return stats;
  }
}

export const votingStatsService = new VotingStatsService();
