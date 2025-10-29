// src/controllers/features/votes/votesData.controller.ts
// Controller exposing voting data operations

import { Response } from 'express';
import { VotesBaseController, VotesBaseRequest } from './votesBase.controller';

interface VotesListRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    limit?: number;
    offset?: number;
    page?: number;
    sortBy?: 'timestamp' | 'proposalId';
    sortOrder?: 'asc' | 'desc';
    useCache?: boolean;
  };
}

interface PendingVotesRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    proposalId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
    page?: number;
    useCache?: boolean;
  };
}

interface ProposalStatsRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
    proposalId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    proposalId?: string;
  };
}

interface ActivityRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    startDate?: string;
    endDate?: string;
  };
}

/**
 * VotesDataController maps HTTP requests to the voting data service.
 */
export class VotesDataController extends VotesBaseController {
  /**
   * Retrieve voting records for a business with pagination.
   */
  async getBusinessVotes(req: VotesListRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_GET_BUSINESS_VOTES');

      const businessId = this.requireBusinessId(req);
      const pagination = this.getPaginationParams(req, { defaultLimit: 100, maxLimit: 500 });

      const sortBy =
        (req.validatedQuery?.sortBy as 'timestamp' | 'proposalId' | undefined) ??
        this.parseString((req.query as any)?.sortBy) ??
        'timestamp';

      const sortOrder =
        (req.validatedQuery?.sortOrder as 'asc' | 'desc' | undefined) ??
        this.parseString((req.query as any)?.sortOrder) ??
        'desc';

      const useCache =
        req.validatedQuery?.useCache ??
        this.parseOptionalBoolean((req.query as any)?.useCache) ??
        true;

      const votes = await this.votingDataService.getBusinessVotes(businessId, {
        limit: pagination.limit,
        offset: pagination.offset,
        sortBy,
        sortOrder,
        useCache,
      });

      const total = await this.votingDataService.countVotingRecords(businessId);
      const paginationMeta = this.createPaginationMeta(
        pagination.page,
        pagination.limit,
        total,
      );

      this.logAction(req, 'VOTING_GET_BUSINESS_VOTES_SUCCESS', {
        businessId,
        returned: votes.length,
        total,
      });

      return {
        votes,
        total,
        pagination: paginationMeta,
      };
    }, res, 'Business votes retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve pending voting records for a business.
   */
  async getPendingVotes(req: PendingVotesRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_GET_PENDING_VOTES');

      const businessId = this.requireBusinessId(req);
      const pagination = this.getPaginationParams(req, { defaultLimit: 100, maxLimit: 500 });

      const filters = {
        proposalId:
          req.validatedQuery?.proposalId ??
          this.parseString((req.query as any)?.proposalId),
        userId:
          req.validatedQuery?.userId ??
          this.parseString((req.query as any)?.userId),
        limit: pagination.limit,
        offset: pagination.offset,
        useCache:
          req.validatedQuery?.useCache ??
          this.parseOptionalBoolean((req.query as any)?.useCache) ??
          true,
      };

      const pendingVotes = await this.votingDataService.getPendingVotes(businessId, filters);
      const total = await this.votingDataService.countPendingVotes(businessId);
      const paginationMeta = this.createPaginationMeta(
        pagination.page,
        pagination.limit,
        total,
      );

      this.logAction(req, 'VOTING_GET_PENDING_VOTES_SUCCESS', {
        businessId,
        returned: pendingVotes.length,
        total,
      });

      return {
        pendingVotes,
        total,
        pagination: paginationMeta,
      };
    }, res, 'Pending votes retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve recent voting activity trends for analytics.
   */
  async getRecentVotingActivity(req: ActivityRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_GET_ACTIVITY');

      const businessId = this.requireBusinessId(req);
      const startDate =
        this.parseDate(req.validatedQuery?.startDate) ??
        this.parseDate((req.query as any)?.startDate);
      const endDate =
        this.parseDate(req.validatedQuery?.endDate) ??
        this.parseDate((req.query as any)?.endDate);

      const activity = await this.votingDataService.getRecentVotingActivity(businessId, {
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
      });

      this.logAction(req, 'VOTING_GET_ACTIVITY_SUCCESS', {
        businessId,
        startDate: activity.trends.dateRange.from,
        endDate: activity.trends.dateRange.to,
      });

      return activity;
    }, res, 'Voting activity retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve pending vote statistics for a specific proposal.
   */
  async getProposalPendingStats(req: ProposalStatsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_GET_PROPOSAL_PENDING_STATS');

      const businessId = this.requireBusinessId(req);
      const proposalId =
        req.validatedParams?.proposalId ??
        req.validatedQuery?.proposalId ??
        this.parseString((req.params as any)?.proposalId) ??
        this.parseString((req.query as any)?.proposalId);

      if (!proposalId) {
        throw { statusCode: 400, message: 'Proposal identifier is required' };
      }

      const stats = await this.votingDataService.getProposalPendingStats(businessId, proposalId);

      this.logAction(req, 'VOTING_GET_PROPOSAL_PENDING_STATS_SUCCESS', {
        businessId,
        proposalId: stats.proposalId,
        pendingVotes: stats.pendingVotes,
      });

      return stats;
    }, res, 'Proposal pending statistics retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve the blockchain contract address associated with voting for a business.
   */
  async getVoteContractAddress(req: VotesBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_GET_CONTRACT_ADDRESS');

      const businessId = this.requireBusinessId(req);
      const contractAddress = await this.votingDataService.getVoteContractAddress(businessId);

      this.logAction(req, 'VOTING_GET_CONTRACT_ADDRESS_SUCCESS', {
        businessId,
        hasContract: Boolean(contractAddress),
      });

      return {
        businessId,
        contractAddress: contractAddress ?? null,
      };
    }, res, 'Voting contract address resolved successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve aggregate counts for voting records.
   */
  async getVotingCounts(req: VotesBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_GET_COUNTS');

      const businessId = this.requireBusinessId(req);

      const [records, pending] = await Promise.all([
        this.votingDataService.countVotingRecords(businessId),
        this.votingDataService.countPendingVotes(businessId),
      ]);

      this.logAction(req, 'VOTING_GET_COUNTS_SUCCESS', {
        businessId,
        totalVotes: records,
        pendingVotes: pending,
      });

      return {
        businessId,
        totalVotes: records,
        pendingVotes: pending,
      };
    }, res, 'Voting counts retrieved successfully', this.getRequestMeta(req));
  }
}

export const votesDataController = new VotesDataController();

