// src/controllers/features/subscriptions/subscriptionsUsage.controller.ts
// Controller for subscription usage and limit operations

import { Response } from 'express';
import { SubscriptionsBaseController, SubscriptionsBaseRequest } from './subscriptionsBase.controller';

interface UsageCheckRequest extends SubscriptionsBaseRequest {
  validatedBody: {
    businessId?: string;
    amount?: number;
  };
}

interface UsageRecordRequest extends SubscriptionsBaseRequest {
  validatedBody: {
    businessId?: string;
    count?: number;
  };
}

/**
 * SubscriptionsUsageController exposes usage limit checks and recording endpoints.
 */
export class SubscriptionsUsageController extends SubscriptionsBaseController {
  /**
   * Validate whether votes can be cast without exceeding limits.
   */
  async checkVotingLimits(req: UsageCheckRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = req.validatedBody.businessId ?? this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        const votesToAdd = this.parseNumber(req.validatedBody.amount, 1, { min: 1 });

        this.recordPerformance(req, 'CHECK_VOTING_LIMITS');

        const result = await this.subscriptionUsageLimitsService.checkVotingLimits(businessId, votesToAdd);

        this.logAction(req, 'CHECK_VOTING_LIMITS_SUCCESS', {
          businessId,
          votesToAdd,
          allowed: result.allowed,
        });

        return { result };
      });
    }, res, 'Voting limit check completed', this.getRequestMeta(req));
  }

  /**
   * Validate NFT minting capacity.
   */
  async checkNftLimits(req: UsageCheckRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = req.validatedBody.businessId ?? this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        const nftCount = this.parseNumber(req.validatedBody.amount, 1, { min: 1 });

        this.recordPerformance(req, 'CHECK_NFT_LIMITS');

        const result = await this.subscriptionUsageLimitsService.checkNftLimits(businessId, nftCount);

        this.logAction(req, 'CHECK_NFT_LIMITS_SUCCESS', {
          businessId,
          nftCount,
          allowed: result.allowed,
        });

        return { result };
      });
    }, res, 'NFT limit check completed', this.getRequestMeta(req));
  }

  /**
   * Validate API usage capacity.
   */
  async checkApiLimits(req: UsageCheckRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = req.validatedBody.businessId ?? this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        const callCount = this.parseNumber(req.validatedBody.amount, 1, { min: 1 });

        this.recordPerformance(req, 'CHECK_API_LIMITS');

        const result = await this.subscriptionUsageLimitsService.checkApiLimits(businessId, callCount);

        this.logAction(req, 'CHECK_API_LIMITS_SUCCESS', {
          businessId,
          callCount,
          allowed: result.allowed,
        });

        return { result };
      });
    }, res, 'API limit check completed', this.getRequestMeta(req));
  }

  /**
   * Record vote usage after successful vote operations.
   */
  async recordVoteUsage(req: UsageRecordRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = req.validatedBody.businessId ?? this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        const count = this.parseNumber(req.validatedBody.count, 1, { min: 1 });

        this.recordPerformance(req, 'RECORD_VOTE_USAGE');

        await this.subscriptionUsageLimitsService.recordVoteUsage(businessId, count);

        this.logAction(req, 'RECORD_VOTE_USAGE_SUCCESS', {
          businessId,
          count,
        });

        return {
          recorded: {
            type: 'votes',
            count,
          },
        };
      });
    }, res, 'Vote usage recorded', this.getRequestMeta(req));
  }

  /**
   * Record NFT usage after successful minting.
   */
  async recordNftUsage(req: UsageRecordRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = req.validatedBody.businessId ?? this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        const count = this.parseNumber(req.validatedBody.count, 1, { min: 1 });

        this.recordPerformance(req, 'RECORD_NFT_USAGE');

        await this.subscriptionUsageLimitsService.recordNftUsage(businessId, count);

        this.logAction(req, 'RECORD_NFT_USAGE_SUCCESS', {
          businessId,
          count,
        });

        return {
          recorded: {
            type: 'nfts',
            count,
          },
        };
      });
    }, res, 'NFT usage recorded', this.getRequestMeta(req));
  }

  /**
   * Record API usage for rate limiting/overage tracking.
   */
  async recordApiUsage(req: UsageRecordRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = req.validatedBody.businessId ?? this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        const count = this.parseNumber(req.validatedBody.count, 1, { min: 1 });

        this.recordPerformance(req, 'RECORD_API_USAGE');

        await this.subscriptionUsageLimitsService.recordApiUsage(businessId, count);

        this.logAction(req, 'RECORD_API_USAGE_SUCCESS', {
          businessId,
          count,
        });

        return {
          recorded: {
            type: 'api',
            count,
          },
        };
      });
    }, res, 'API usage recorded', this.getRequestMeta(req));
  }

  /**
   * Retrieve current voting limit summary.
   */
  async getVotingLimits(req: SubscriptionsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'GET_VOTING_LIMITS');

        const limits = await this.subscriptionUsageLimitsService.getVotingLimits(businessId);

        this.logAction(req, 'GET_VOTING_LIMITS_SUCCESS', {
          businessId,
          remaining: limits.remainingVotes,
        });

        return { limits };
      });
    }, res, 'Voting limits retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve current NFT limit summary.
   */
  async getNftLimits(req: SubscriptionsBaseRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.validateBusinessUser(req, res, async () => {
        const businessId = this.resolveBusinessId(req);
        if (!businessId) {
          throw { statusCode: 400, message: 'Business identifier is required' };
        }

        this.recordPerformance(req, 'GET_NFT_LIMITS');

        const limits = await this.subscriptionUsageLimitsService.getNftLimits(businessId);

        this.logAction(req, 'GET_NFT_LIMITS_SUCCESS', {
          businessId,
          remaining: limits.remainingCertificates,
        });

        return { limits };
      });
    }, res, 'NFT limits retrieved', this.getRequestMeta(req));
  }
}

export const subscriptionsUsageController = new SubscriptionsUsageController();
