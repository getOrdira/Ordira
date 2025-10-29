// src/controllers/features/votes/votesProposals.controller.ts
// Controller exposing blockchain proposal retrieval

import { Response } from 'express';
import { VotesBaseController, VotesBaseRequest } from './votesBase.controller';

interface BusinessProposalsRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    search?: string;
    status?: 'active' | 'completed' | 'failed';
    limit?: number;
    useCache?: boolean;
  };
}

/**
 * VotesProposalsController maps requests to the voting proposals service.
 */
export class VotesProposalsController extends VotesBaseController {
  /**
   * Retrieve blockchain proposal summaries for a business.
   */
  async getBusinessProposals(req: BusinessProposalsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_PROPOSALS_GET');

      const businessId = this.requireBusinessId(req);
      const options = {
        searchQuery:
          req.validatedQuery?.search ??
          this.parseString((req.query as any)?.search),
        status:
          req.validatedQuery?.status ??
          (this.parseString((req.query as any)?.status) as 'active' | 'completed' | 'failed' | undefined),
        limit:
          req.validatedQuery?.limit ??
          this.parseOptionalNumber((req.query as any)?.limit, { min: 1, max: 500 }),
        useCache:
          req.validatedQuery?.useCache ??
          this.parseOptionalBoolean((req.query as any)?.useCache) ??
          true,
      };

      const proposals = await this.votingProposalsService.getBusinessProposals(businessId, options);

      this.logAction(req, 'VOTING_PROPOSALS_GET_SUCCESS', {
        businessId,
        count: proposals.length,
        hasSearch: Boolean(options.searchQuery),
      });

      return {
        businessId,
        proposals,
      };
    }, res, 'Business proposals retrieved successfully', this.getRequestMeta(req));
  }
}

export const votesProposalsController = new VotesProposalsController();

