// src/controllers/features/votes/votesStats.controller.ts
// Controller exposing voting statistics operations

import { Response } from 'express';
import { VotesBaseController, VotesBaseRequest } from './votesBase.controller';

interface VotingStatsRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    useCache?: boolean;
  };
}

/**
 * VotesStatsController maps HTTP requests to the voting stats service.
 */
export class VotesStatsController extends VotesBaseController {
  /**
   * Retrieve aggregate voting statistics for a business.
   */
  async getVotingStats(req: VotingStatsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_STATS_GET');

      const businessId = this.requireBusinessId(req);
      const useCache =
        req.validatedQuery?.useCache ??
        this.parseOptionalBoolean((req.query as any)?.useCache) ??
        true;

      const stats = await this.votingStatsService.getVotingStats(businessId, useCache);

      this.logAction(req, 'VOTING_STATS_GET_SUCCESS', {
        businessId,
        totalVotes: stats.totalVotes,
        pendingVotes: stats.pendingVotes,
        totalProposals: stats.totalProposals,
      });

      return {
        businessId,
        stats,
      };
    }, res, 'Voting statistics retrieved successfully', this.getRequestMeta(req));
  }
}

export const votesStatsController = new VotesStatsController();

