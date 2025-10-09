import { createAppError } from '../../../middleware/error.middleware';
import { BrandSettings } from '../../../models/brandSettings.model';
import { PendingVote } from '../../../models/pendingVote.model';
import { VotingRecord } from '../../../models/votingRecord.model';
import { logger } from '../../../utils/logger';
import { enhancedCacheService } from '../../external/enhanced-cache.service';
import {
  createBusinessVotesCacheMetadata,
  createPendingVotesCacheMetadata,
  VOTING_CACHE_TTL
} from '../utils/cache';
import { mapPendingVote, mapVotingRecord } from '../utils/mappers';
import type {
  BusinessVotesOptions,
  PendingVoteRecord,
  PendingVotesFilters,
  VoteRecord,
  VotingTrendSummary
} from '../utils/types';
import { votingValidationService } from '../validation/votingValidation.service';

export class VotingDataService {
  constructor(
    private readonly validation = votingValidationService
  ) {}

  async getBusinessVotes(businessId: string, options: BusinessVotesOptions = {}): Promise<VoteRecord[]> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const normalizedOptions = this.validation.normalizeBusinessVotesOptions(options);
    const { limit, offset, useCache, sortBy, sortOrder } = normalizedOptions;

    const shouldUseCache = useCache && offset === 0 && (!options.limit || options.limit === limit);

    if (shouldUseCache) {
      const cached = await enhancedCacheService.getCachedAnalytics('voting', createBusinessVotesCacheMetadata(validatedBusinessId));
      if (cached) {
        logger.debug('Business votes cache hit', {
          businessId: validatedBusinessId,
          count: cached.length
        });
        return (cached as VoteRecord[]).slice(0, limit);
      }
    }

    const sortCriteria =
      sortBy === 'timestamp'
        ? { timestamp: sortOrder === 'asc' ? 1 : -1 } as const
        : { proposalId: sortOrder === 'asc' ? 1 : -1 } as const;

    const records = await VotingRecord.find({ business: validatedBusinessId })
      .sort(sortCriteria)
      .limit(limit)
      .skip(offset)
      .lean()
      .hint('business_timestamp_1');

    const formatted = records.map(mapVotingRecord);

    if (shouldUseCache) {
      await enhancedCacheService.cacheAnalytics(
        'voting',
        createBusinessVotesCacheMetadata(validatedBusinessId),
        formatted,
        { keyPrefix: 'ordira', ttl: VOTING_CACHE_TTL.businessVotes }
      );
    }

    logger.debug('Business votes retrieved from database', {
      businessId: validatedBusinessId,
      count: formatted.length,
      cached: false
    });

    return formatted;
  }

  async getPendingVotes(businessId: string, filters: PendingVotesFilters = {}): Promise<PendingVoteRecord[]> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const normalizedFilters = this.validation.normalizePendingVotesFilters(filters);
    const { limit, offset, proposalId, userId, useCache } = normalizedFilters;

    const shouldUseCache = useCache && !proposalId && !userId && offset === 0;

    if (shouldUseCache) {
      const cached = await enhancedCacheService.getCachedAnalytics('voting', createPendingVotesCacheMetadata(validatedBusinessId));
      if (cached) {
        logger.debug('Pending votes cache hit', {
          businessId: validatedBusinessId,
          count: cached.length
        });
        return (cached as PendingVoteRecord[]).slice(0, limit);
      }
    }

    const query: Record<string, unknown> = {
      businessId: validatedBusinessId,
      isProcessed: false
    };

    if (proposalId) {
      query.proposalId = proposalId;
    }

    if (userId) {
      query.userId = userId;
    }

    const pendingVotes = await PendingVote.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean()
      .hint('businessId_isProcessed_createdAt_1');

    const formatted = pendingVotes.map(mapPendingVote);

    if (shouldUseCache) {
      await enhancedCacheService.cacheAnalytics(
        'voting',
        createPendingVotesCacheMetadata(validatedBusinessId),
        formatted,
        { keyPrefix: 'ordira', ttl: VOTING_CACHE_TTL.pendingVotes }
      );
    }

    logger.debug('Pending votes retrieved from database', {
      businessId: validatedBusinessId,
      count: formatted.length,
      cached: false
    });

    return formatted;
  }

  async countVotingRecords(businessId: string): Promise<number> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    return VotingRecord.countDocuments({ business: validatedBusinessId }).hint('business_1');
  }

  async countPendingVotes(businessId: string): Promise<number> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    return PendingVote.countDocuments({ businessId: validatedBusinessId, isProcessed: false }).hint('businessId_isProcessed_1');
  }

  async getRecentVotingActivity(
    businessId: string,
    options: { startDate?: Date; endDate?: Date } = {}
  ): Promise<{ trends: VotingTrendSummary }> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const { startDate, endDate } = options;
    const fromDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = endDate || new Date();

    const recentPendingVotes = await PendingVote.find({
      businessId: validatedBusinessId,
      createdAt: { $gte: fromDate, $lte: toDate }
    })
      .lean()
      .hint('businessId_createdAt_1');

    const dailyVoteActivity: Record<string, number> = {};
    recentPendingVotes.forEach((vote) => {
      const createdAt = vote.createdAt instanceof Date ? vote.createdAt : new Date(vote.createdAt);
      const day = createdAt.toISOString().split('T')[0];
      dailyVoteActivity[day] = (dailyVoteActivity[day] || 0) + 1;
    });

    return {
      trends: {
        dailyActivity: dailyVoteActivity,
        totalActivityInPeriod: recentPendingVotes.length,
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString()
        }
      }
    };
  }

  async getProposalPendingStats(businessId: string, proposalId: string) {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const trimmedProposalId = proposalId.trim();
    if (!trimmedProposalId) {
      throw createAppError('Proposal ID is required', 400, 'MISSING_PROPOSAL_ID');
    }

    const pendingVotesForProposal = await PendingVote.countDocuments({
      businessId: validatedBusinessId,
      proposalId: trimmedProposalId,
      isProcessed: false
    }).hint('businessId_proposalId_isProcessed_1');

    return {
      proposalId: trimmedProposalId,
      totalVotes: 0,
      pendingVotes: pendingVotesForProposal,
      participation: '0%'
    };
  }

  async getVoteContractAddress(businessId: string): Promise<string | undefined> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const settings = await BrandSettings.findOne({ business: validatedBusinessId }).lean();
    return settings?.web3Settings?.voteContract;
  }
}

export const votingDataService = new VotingDataService();

