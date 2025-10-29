// src/controllers/features/votes/votesDashboard.controller.ts
// Controller exposing voting dashboard and maintenance operations

import { Response } from 'express';
import { VotesBaseController, VotesBaseRequest } from './votesBase.controller';

interface VotingDashboardRequest extends VotesBaseRequest {
  validatedParams?: {
    businessId?: string;
  };
  validatedQuery?: {
    businessId?: string;
  };
}

/**
 * VotesDashboardController maps HTTP requests to the voting dashboard service.
 */
export class VotesDashboardController extends VotesBaseController {
  /**
   * Retrieve dashboard data for a business voting module.
   */
  async getVotingDashboard(req: VotingDashboardRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_DASHBOARD_GET');

      const businessId = this.requireBusinessId(req);
      const dashboard = await this.votingDashboardService.getVotingDashboard(businessId);

      this.logAction(req, 'VOTING_DASHBOARD_GET_SUCCESS', {
        businessId,
        hasRecommendations: dashboard.recommendations.length > 0,
      });

      return {
        businessId,
        dashboard,
      };
    }, res, 'Voting dashboard retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Clear all voting caches for a business.
   */
  async clearVotingCaches(req: VotesBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_CLEAR_CACHES');

      const businessId = this.requireBusinessId(req);
      await this.votingDashboardService.clearVotingCaches(businessId);

      this.logAction(req, 'VOTING_CLEAR_CACHES_SUCCESS', { businessId });

      return {
        businessId,
        cleared: true,
        clearedAt: new Date().toISOString(),
      };
    }, res, 'Voting caches cleared successfully', this.getRequestMeta(req));
  }

  /**
   * Retrieve health status for the voting services.
   */
  async getVotingServiceHealth(req: VotesBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'VOTING_HEALTH_GET');

      const health = await this.votingDashboardService.getVotingServiceHealth();

      this.logAction(req, 'VOTING_HEALTH_GET_SUCCESS', {
        healthStatus: health.status,
        cacheStatus: health.cacheStatus,
      });

      return {
        health,
        checkedAt: new Date().toISOString(),
      };
    }, res, 'Voting service health retrieved successfully', this.getRequestMeta(req));
  }
}

export const votesDashboardController = new VotesDashboardController();

