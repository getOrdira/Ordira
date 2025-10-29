// src/controllers/features/votes/votesAnalytics.controller.ts
// Controller exposing voting analytics operations

import { Response } from 'express';
import { VotesBaseController, VotesBaseRequest } from './votesBase.controller';

interface VotingAnalyticsRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedQuery?: {
    businessId?: string;
    startDate?: string;
    endDate?: string;
    includeRecommendations?: boolean;
    includeTrends?: boolean;
    useCache?: boolean;
    proposalId?: string;
  };
}

/**
 * VotesAnalyticsController maps HTTP requests to the voting analytics service.
 */
export class VotesAnalyticsController extends VotesBaseController {
  /**
   * Retrieve voting analytics for a business.
   */
  async getVotingAnalytics(req: VotingAnalyticsRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_ANALYTICS_GET');

      const businessId = this.requireBusinessId(req);

      const options = {
        startDate:
          this.parseDate(req.validatedQuery?.startDate) ??
          this.parseDate((req.query as any)?.startDate),
        endDate:
          this.parseDate(req.validatedQuery?.endDate) ??
          this.parseDate((req.query as any)?.endDate),
        includeRecommendations:
          req.validatedQuery?.includeRecommendations ??
          this.parseOptionalBoolean((req.query as any)?.includeRecommendations) ??
          true,
        includeTrends:
          req.validatedQuery?.includeTrends ??
          this.parseOptionalBoolean((req.query as any)?.includeTrends) ??
          true,
        useCache:
          req.validatedQuery?.useCache ??
          this.parseOptionalBoolean((req.query as any)?.useCache) ??
          true,
        proposalId:
          req.validatedQuery?.proposalId ??
          this.parseString((req.query as any)?.proposalId),
      };

      const analytics = await this.votingAnalyticsService.getVotingAnalytics(businessId, options);

      this.logAction(req, 'VOTING_ANALYTICS_GET_SUCCESS', {
        businessId,
        includeRecommendations: options.includeRecommendations,
        includeTrends: options.includeTrends,
      });

      return {
        businessId,
        analytics,
        generatedAt: new Date().toISOString(),
      };
    }, res, 'Voting analytics generated successfully', this.getRequestMeta(req));
  }
}

export const votesAnalyticsController = new VotesAnalyticsController();

