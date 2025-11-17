import { createAppError } from '../../../middleware/core/error.middleware';
import { BrandSettings } from '../../../models/brands/brandSettings.model';
import { PendingVote, IPendingVote } from '../../../models/voting/pendingVote.model';
import { VotingRecord } from '../../../models/voting/votingRecord.model';
import { logger } from '../../../utils/logger';
import { enhancedCacheService } from '../../infrastructure/cache/features/enhancedCache.service'; 
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
  PendingVoteListOptions,
  PendingVoteStats,
  ProposalBreakdown,
  RelatedVotes,
  VoteRecord,
  VotingTrendSummary
} from '../utils/types';
import { votingValidationService } from '../validation/votingValidation.service';
import { formatDuration } from '../utils/pendingVoteHelpers';

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

  async listPendingVotes(
    businessId: string,
    options: PendingVoteListOptions = {}
  ): Promise<{
    votes: PendingVoteRecord[];
    total: number;
    pending: number;
    processed: number;
  }> {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);

      // Build query
      const query: any = { businessId: validatedBusinessId };
      
      if (options.proposalId) query.proposalId = options.proposalId;
      if (options.userId) query.userId = options.userId;
      
      if (options.onlyProcessed) {
        query.isProcessed = true;
      } else if (!options.includeProcessed) {
        query.isProcessed = false;
      }

      // Build sort
      const sortField = options.sortBy || 'createdAt';
      const sortOrder: 1 | -1 = options.sortOrder === 'asc' ? 1 : -1;
      const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

      // Execute queries
      const [votes, totalCount, pendingCount, processedCount] = await Promise.all([
        PendingVote.find(query)
          .sort(sort)
          .limit(options.limit || 50)
          .skip(options.offset || 0),
        PendingVote.countDocuments(query),
        PendingVote.countDocuments({ businessId: validatedBusinessId, isProcessed: false }),
        PendingVote.countDocuments({ businessId: validatedBusinessId, isProcessed: true })
      ]);

      // Map votes - basic mapping for now, enhanced fields will be added when validation service is ready
      const mappedVotes: PendingVoteRecord[] = votes.map(vote => ({
        id: vote._id.toString(),
        ...mapPendingVote(vote),
        userSignature: vote.userSignature,
        isProcessed: vote.isProcessed,
        processedAt: vote.processedAt
      }));

      return {
        votes: mappedVotes,
        total: totalCount,
        pending: pendingCount,
        processed: processedCount
      };
    } catch (error: any) {
      logger.error('List pending votes error:', error);
      throw createAppError(`Failed to list pending votes: ${error.message}`, 500, 'LIST_PENDING_VOTES_FAILED');
    }
  }

  async getPendingVoteById(voteId: string, businessId: string): Promise<PendingVoteRecord | null> {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const vote = await PendingVote.findOne({ _id: voteId, businessId: validatedBusinessId }).lean();
      
      if (!vote) return null;

      return {
        id: vote._id.toString(),
        ...mapPendingVote(vote),
        userSignature: vote.userSignature,
        isProcessed: vote.isProcessed,
        processedAt: vote.processedAt
        // Enhanced validation fields will be added when validation service is ready
      };
    } catch (error: any) {
      logger.error('Get pending vote by ID error:', error);
      throw createAppError(`Failed to get pending vote: ${error.message}`, 500, 'GET_PENDING_VOTE_FAILED');
    }
  }

  async getPendingVoteStats(businessId: string): Promise<PendingVoteStats> {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      
      const [stats, processedStats] = await Promise.all([
        PendingVote.aggregate([
          { $match: { businessId: validatedBusinessId, isProcessed: false } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              oldestVote: { $min: '$createdAt' },
              newestVote: { $max: '$createdAt' }
            }
          }
        ]),
        PendingVote.aggregate([
          { $match: { businessId: validatedBusinessId, isProcessed: true } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              avgProcessingTime: {
                $avg: {
                  $subtract: ['$processedAt', '$createdAt']
                }
              }
            }
          }
        ])
      ]);

      const pendingStats = stats[0] || { count: 0 };
      const processedStatsData = processedStats[0] || { count: 0, avgProcessingTime: 0 };

      const totalVotes = pendingStats.count + processedStatsData.count;
      const processingEfficiency = totalVotes > 0 ? (processedStatsData.count / totalVotes) * 100 : 0;

      return {
        totalPending: pendingStats.count,
        totalProcessed: processedStatsData.count,
        oldestPendingAge: pendingStats.oldestVote 
          ? formatDuration(Date.now() - pendingStats.oldestVote.getTime())
          : undefined,
        newestPendingAge: pendingStats.newestVote
          ? formatDuration(Date.now() - pendingStats.newestVote.getTime())
          : undefined,
        averageProcessingTime: processedStatsData.avgProcessingTime
          ? formatDuration(processedStatsData.avgProcessingTime)
          : undefined,
        processingEfficiency: Math.round(processingEfficiency),
        averageBatchSize: 20, // Default/estimated
        gasOptimization: 75 // Estimated optimization percentage
      };
    } catch (error: any) {
      logger.error('Get pending vote stats error:', error);
      throw createAppError(`Failed to get pending vote stats: ${error.message}`, 500, 'GET_STATS_FAILED');
    }
  }

  async getProposalBreakdown(businessId: string): Promise<ProposalBreakdown[]> {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      
      const breakdown = await PendingVote.aggregate([
        { $match: { businessId: validatedBusinessId, isProcessed: false } },
        {
          $group: {
            _id: '$proposalId',
            pendingCount: { $sum: 1 },
            oldestVote: { $min: '$createdAt' },
            voteChoices: { $push: '$voteChoice' }
          }
        },
        { $sort: { pendingCount: -1 } }
      ]);

      return breakdown.map(proposal => {
        const voteDistribution = proposal.voteChoices.reduce((acc: any, choice: string) => {
          acc[choice] = (acc[choice] || 0) + 1;
          return acc;
        }, { for: 0, against: 0, abstain: 0 });

        return {
          proposalId: proposal._id,
          pendingCount: proposal.pendingCount,
          readyForBatch: proposal.pendingCount >= 5, // Mini-batch threshold
          oldestVoteAge: proposal.oldestVote 
            ? formatDuration(Date.now() - proposal.oldestVote.getTime())
            : undefined,
          voteDistribution
        };
      });
    } catch (error: any) {
      logger.error('Get proposal breakdown error:', error);
      throw createAppError(`Failed to get proposal breakdown: ${error.message}`, 500, 'GET_PROPOSAL_BREAKDOWN_FAILED');
    }
  }

  async getRelatedVotes(voteId: string, businessId: string): Promise<RelatedVotes> {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      const vote = await PendingVote.findOne({ _id: voteId, businessId: validatedBusinessId });
      
      if (!vote) {
        return { sameProposal: 0, sameUser: 0, totalForProposal: 0 };
      }

      const [sameProposal, sameUser, totalForProposal] = await Promise.all([
        PendingVote.countDocuments({
          businessId: validatedBusinessId,
          proposalId: vote.proposalId,
          _id: { $ne: voteId }
        }),
        PendingVote.countDocuments({
          businessId: validatedBusinessId,
          userId: vote.userId,
          _id: { $ne: voteId }
        }),
        PendingVote.countDocuments({
          businessId: validatedBusinessId,
          proposalId: vote.proposalId
        })
      ]);

      return { sameProposal, sameUser, totalForProposal };
    } catch (error: any) {
      logger.error('Get related votes error:', error);
      return { sameProposal: 0, sameUser: 0, totalForProposal: 0 };
    }
  }

  async deletePendingVotes(
    businessId: string,
    voteIds: string[],
    reason?: string
  ): Promise<{ deletedCount: number }> {
    try {
      const validatedBusinessId = this.validation.ensureBusinessId(businessId);
      
      const result = await PendingVote.deleteMany({
        businessId: validatedBusinessId,
        voteId: { $in: voteIds },
        isProcessed: false // Only delete unprocessed votes
      });

      // Log deletion for audit
      logger.info(`Deleted ${result.deletedCount} pending votes for business ${validatedBusinessId}. Reason: ${reason || 'No reason provided'}`);

      return { deletedCount: result.deletedCount };
    } catch (error: any) {
      logger.error('Delete pending votes error:', error);
      throw createAppError(`Failed to delete pending votes: ${error.message}`, 500, 'DELETE_FAILED');
    }
  }
}

export const votingDataService = new VotingDataService();




