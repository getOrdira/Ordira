// src/controllers/features/platform/customerVoting.controller.ts
// Controller for customer-facing voting operations

import { Response } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { votingPlatformCustomerService } from '../../../services/platform/features/votingPlatformCustomer.service';

interface CustomerVotingRequest extends BaseRequest {
  validatedParams?: {
    platformIdOrSlug?: string;
    responseId?: string;
  };
  validatedBody?: {
    // Start response
    platformId?: string;
    email?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    operatingSystem?: string;
    screenResolution?: string;
    language?: string;
    timezone?: string;
    referralSource?: string;
    referralMedium?: string;
    referralCampaign?: string;
    referrerUrl?: string;
    utmParams?: any;

    // Submit answer
    responseId?: string;
    questionId?: string;
    value?: any;
    timeToAnswer?: number;
  };
}

/**
 * Controller for customer-facing voting operations
 */
export class CustomerVotingController extends BaseController {
  /**
   * Get platform for customer view
   */
  async getPlatformForCustomer(req: CustomerVotingRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const platformIdOrSlug = req.validatedParams?.platformIdOrSlug;

      if (!platformIdOrSlug) {
        throw {
          statusCode: 400,
          message: 'Platform ID or slug is required',
          code: 'MISSING_PLATFORM_IDENTIFIER'
        };
      }

      const platform = await votingPlatformCustomerService.getPlatformForCustomer(platformIdOrSlug);

      return { platform };
    }, res, 'Platform retrieved successfully');
  }

  /**
   * Start a response session
   */
  async startResponse(req: CustomerVotingRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const input = req.validatedBody || {};

      if (!input.platformId) {
        throw {
          statusCode: 400,
          message: 'Platform ID is required',
          code: 'MISSING_PLATFORM_ID'
        };
      }

      const result = await votingPlatformCustomerService.startResponse({
        platformId: input.platformId,
        userId: req.userId,
        sessionId: input.sessionId,
        email: input.email,
        ipAddress: input.ipAddress || req.ip,
        userAgent: input.userAgent || req.get('user-agent'),
        deviceType: input.deviceType,
        browser: input.browser,
        operatingSystem: input.operatingSystem,
        screenResolution: input.screenResolution,
        language: input.language,
        timezone: input.timezone,
        referralSource: input.referralSource,
        referralMedium: input.referralMedium,
        referralCampaign: input.referralCampaign,
        referrerUrl: input.referrerUrl,
        utmParams: input.utmParams
      });

      this.logger.info('Response session started', {
        platformId: input.platformId,
        responseId: result.responseId
      });

      return result;
    }, res, 'Response session started successfully');
  }

  /**
   * Submit an answer
   */
  async submitAnswer(req: CustomerVotingRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const input = req.validatedBody || {};

      if (!input.responseId) {
        throw {
          statusCode: 400,
          message: 'Response ID is required',
          code: 'MISSING_RESPONSE_ID'
        };
      }

      if (!input.questionId) {
        throw {
          statusCode: 400,
          message: 'Question ID is required',
          code: 'MISSING_QUESTION_ID'
        };
      }

      if (input.value === undefined) {
        throw {
          statusCode: 400,
          message: 'Answer value is required',
          code: 'MISSING_ANSWER_VALUE'
        };
      }

      const result = await votingPlatformCustomerService.submitAnswer({
        responseId: input.responseId,
        questionId: input.questionId,
        value: input.value,
        timeToAnswer: input.timeToAnswer
      });

      return result;
    }, res, 'Answer submitted successfully');
  }

  /**
   * Complete a response
   */
  async completeResponse(req: CustomerVotingRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const input = req.validatedBody || {};

      if (!input.responseId) {
        throw {
          statusCode: 400,
          message: 'Response ID is required',
          code: 'MISSING_RESPONSE_ID'
        };
      }

      const result = await votingPlatformCustomerService.completeResponse({
        responseId: input.responseId
      });

      this.logger.info('Response completed', {
        responseId: input.responseId,
        blockchainEnabled: result.blockchainEnabled,
        mode: result.mode,
        pendingVotesCreated: result.pendingVotesCreated
      });

      return result;
    }, res, 'Response completed successfully');
  }

  /**
   * Abandon a response
   */
  async abandonResponse(req: CustomerVotingRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const responseId = req.validatedParams?.responseId;

      if (!responseId) {
        throw {
          statusCode: 400,
          message: 'Response ID is required',
          code: 'MISSING_RESPONSE_ID'
        };
      }

      await votingPlatformCustomerService.abandonResponse(responseId);

      this.logger.info('Response abandoned', {
        responseId
      });

      return { abandoned: true, responseId };
    }, res, 'Response abandoned successfully');
  }
}

export const customerVotingController = new CustomerVotingController();

