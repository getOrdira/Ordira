// src/services/platform/features/votingPlatformCustomer.service.ts
import { Types } from 'mongoose';
import crypto from 'crypto';
import { VotingPlatform } from '../../../models/platform/votingPlatform.model';
import { VotingQuestion } from '../../../models/platform/votingQuestion.model';
import { VotingResponse } from '../../../models/platform/votingResponse.model';
import { User } from '../../../models/core/user.model';
import { logger } from '../../../utils/logger';
import { createAppError } from '../../../middleware/core/error.middleware';
import { votingPlatformDataService } from '../core/votingPlatformData.service';
import { votingPlatformValidationService } from '../validation/votingPlatformValidation.service';

export interface StartResponseInput {
  platformId: string;
  userId?: string;
  sessionId?: string;
  email?: string; // For email-gated platforms

  // User context
  ipAddress?: string;
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  operatingSystem?: string;
  screenResolution?: string;
  language?: string;
  timezone?: string;

  // Referral tracking
  referralSource?: string;
  referralMedium?: string;
  referralCampaign?: string;
  referrerUrl?: string;
  utmParams?: any;
}

export interface SubmitAnswerInput {
  responseId: string;
  questionId: string;
  value: any;
  timeToAnswer?: number;
}

export interface CompleteResponseInput {
  responseId: string;
}

/**
 * Service for customer-facing voting platform operations
 */
export class VotingPlatformCustomerService {
  private readonly dataService = votingPlatformDataService;
  private readonly validation = votingPlatformValidationService;

  // ============================================
  // CUSTOMER RESPONSE FLOW
  // ============================================

  /**
   * Start a new response session
   */
  async startResponse(input: StartResponseInput): Promise<any> {
    const validatedPlatformId = this.validation.ensurePlatformId(input.platformId);

    // Get platform and verify it's accessible
    const platform = await this.dataService.getPlatformById(validatedPlatformId);

    if (!platform.canAcceptResponses()) {
      throw createAppError('This voting platform is not currently accepting responses', 400, 'PLATFORM_CLOSED');
    }

    // Email gating check
    if (platform.emailGating.enabled) {
      if (!input.email) {
        throw createAppError('Email is required for this platform', 400, 'EMAIL_REQUIRED');
      }

      const validatedEmail = this.validation.validateEmail(input.email);

      // Check disposable email
      if (platform.emailGating.blockDisposableEmails) {
        if (this.validation.isDisposableEmail(validatedEmail)) {
          throw createAppError('Disposable email addresses are not allowed', 400, 'DISPOSABLE_EMAIL');
        }
      }

      // Check email whitelist
      if (!platform.isEmailAllowed(validatedEmail)) {
        throw createAppError('Your email is not authorized to access this platform', 403, 'EMAIL_NOT_AUTHORIZED');
      }
    }

    // Check for duplicate responses
    if (input.userId) {
      const validatedUserId = this.validation.ensureUserId(input.userId);

      if (validatedUserId && !platform.responseSettings.allowMultipleResponses) {
        const hasResponded = await this.dataService.hasUserResponded(validatedUserId, validatedPlatformId);
        if (hasResponded) {
          throw createAppError('You have already responded to this platform', 400, 'ALREADY_RESPONDED');
        }
      }
    }

    // Check for session-based duplicate (anonymous users)
    if (!input.userId && input.sessionId) {
      const existingResponse = await this.dataService.getResponseBySession(
        input.sessionId,
        validatedPlatformId
      );
      if (existingResponse && !platform.responseSettings.allowMultipleResponses) {
        throw createAppError('You have already responded to this platform', 400, 'ALREADY_RESPONDED');
      }
    }

    // Create response hash
    const responseHash = this.createResponseHash(
      input.userId || input.sessionId || input.email || '',
      validatedPlatformId
    );

    // Create new response
    const response = new VotingResponse({
      platformId: validatedPlatformId,
      businessId: platform.businessId,
      userId: input.userId ? new Types.ObjectId(input.userId) : undefined,
      sessionId: input.sessionId,
      responseHash,
      fingerprint: this.generateFingerprint(input),

      isAnonymous: !input.userId,
      startedAt: new Date(),
      status: 'in_progress',

      userContext: {
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        deviceType: input.deviceType,
        browser: input.browser,
        operatingSystem: input.operatingSystem,
        screenResolution: input.screenResolution,
        language: input.language,
        timezone: input.timezone
      },

      referralData: {
        source: input.referralSource,
        medium: input.referralMedium,
        campaign: input.referralCampaign,
        referrerUrl: input.referrerUrl,
        utmParams: input.utmParams
      },

      emailVerification: input.email ? {
        email: this.validation.validateEmail(input.email),
        isVerified: !platform.emailGating.requireEmailVerification,
        verificationSentAt: platform.emailGating.requireEmailVerification ? new Date() : undefined
      } : undefined
    });

    try {
      await response.save();
    } catch (error: any) {
      logger.error('Failed to save voting response', {
        platformId: validatedPlatformId,
        error: error.message,
        validationErrors: error.errors ? Object.keys(error.errors).map((key) => ({
          field: key,
          message: error.errors[key].message
        })) : undefined
      });
      throw createAppError(
        `Failed to start response: ${error.message}`,
        500,
        'RESPONSE_CREATION_ERROR'
      );
    }

    // Increment platform views
    await platform.incrementViews();

    logger.info('Response session started', {
      platformId: validatedPlatformId,
      responseId: response._id.toString(),
      isAnonymous: response.isAnonymous
    });

    return {
      responseId: response._id.toString(),
      platformId: validatedPlatformId,
      sessionStarted: response.startedAt,
      requiresEmailVerification: platform.emailGating.requireEmailVerification
    };
  }

  /**
   * Submit an answer to a question
   */
  async submitAnswer(input: SubmitAnswerInput): Promise<any> {
    const response = await this.dataService.getResponseById(input.responseId);

    if (response.status === 'completed') {
      throw createAppError('Response has already been completed', 400, 'RESPONSE_COMPLETED');
    }

    if (response.status === 'deleted') {
      throw createAppError('Response has been deleted', 400, 'RESPONSE_DELETED');
    }

    // Get question
    const question = await this.dataService.getQuestionById(
      input.questionId,
      response.platformId.toString()
    );

    if (!question.isActive) {
      throw createAppError('This question is not active', 400, 'QUESTION_INACTIVE');
    }

    // Validate answer based on question type
    const isValid = this.validation.validateAnswer(question.questionType, input.value);
    if (!isValid) {
      throw createAppError('Invalid answer format for this question type', 400, 'INVALID_ANSWER');
    }

    // Prepare answer object
    const answer: any = {
      questionId: new Types.ObjectId(input.questionId),
      questionType: question.questionType,
      value: input.value,
      metadata: {
        timeToAnswer: input.timeToAnswer,
        skipped: false
      }
    };

    // Set type-specific fields
    switch (question.questionType) {
      case 'text':
      case 'textarea':
        answer.textValue = this.validation.sanitizeText(String(input.value));
        break;

      case 'multiple_choice':
      case 'image_selection':
        answer.choiceValues = Array.isArray(input.value) ? input.value : [input.value];
        break;

      case 'rating':
      case 'scale':
        answer.numericValue = Number(input.value);
        break;

      case 'date':
        answer.dateValue = new Date(input.value);
        break;

      case 'file_upload':
        answer.fileUrls = Array.isArray(input.value) ? input.value : [input.value];
        break;
    }

    // Add or update answer
    await response.addAnswer(answer);

    // Update question analytics
    await question.incrementResponse();
    if (Array.isArray(answer.choiceValues)) {
      for (const choice of answer.choiceValues) {
        await question.updateResponseDistribution(choice);
      }
    } else if (answer.value) {
      await question.updateResponseDistribution(String(answer.value));
    }

    // Calculate completion percentage
    const requiredQuestionIds = await this.dataService.getRequiredQuestionIds(
      response.platformId.toString()
    );

    const completionData = this.validation.validateResponseCompleteness(
      response.answers,
      requiredQuestionIds
    );

    response.completionPercentage = completionData.completionPercentage;
    await response.save();

    logger.debug('Answer submitted', {
      responseId: response._id.toString(),
      questionId: input.questionId,
      completionPercentage: completionData.completionPercentage
    });

    return {
      success: true,
      completionPercentage: completionData.completionPercentage,
      isComplete: completionData.isComplete
    };
  }

  /**
   * Complete a response
   */
  async completeResponse(input: CompleteResponseInput): Promise<any> {
    const response = await this.dataService.getResponseById(input.responseId);

    if (response.status === 'completed') {
      throw createAppError('Response has already been completed', 400, 'RESPONSE_COMPLETED');
    }

    // Verify all required questions are answered
    const requiredQuestionIds = await this.dataService.getRequiredQuestionIds(
      response.platformId.toString()
    );

    const completionData = this.validation.validateResponseCompleteness(
      response.answers,
      requiredQuestionIds
    );

    if (!completionData.isComplete) {
      throw createAppError(
        `Please answer all required questions. Missing: ${completionData.missingQuestions.length} questions`,
        400,
        'INCOMPLETE_RESPONSE'
      );
    }

    // Check for suspicious patterns
    const suspiciousCheck = this.validation.detectSuspiciousPatterns({
      answers: response.answers,
      timeToComplete: response.timeToComplete,
      userContext: response.userContext
    });

    if (suspiciousCheck.isSuspicious) {
      response.qualityMetrics.isSuspicious = true;
      response.qualityMetrics.suspiciousReasons = suspiciousCheck.reasons;
      response.qualityMetrics.validationScore = 50; // Reduced score
    }

    // Mark as complete
    await response.markComplete();

    // Get platform to check blockchain settings
    const platform = await VotingPlatform.findById(response.platformId);
    if (!platform) {
      throw createAppError('Platform not found', 404, 'PLATFORM_NOT_FOUND');
    }

    // Update platform analytics
    await platform.incrementResponses(
      !response.userId || await this.dataService.hasUserResponded(
        response.userId.toString(),
        response.platformId.toString()
      )
    );

    // DUAL MODE: Only create PendingVotes if blockchain is enabled
    let pendingVotesCreated = 0;
    if (platform.blockchainIntegration?.enabled &&
        platform.blockchainIntegration?.mode === 'on-chain' &&
        platform.blockchainIntegration?.autoDeployVotes) {

      try {
        pendingVotesCreated = await this.createPendingVotesFromResponse(response, platform);

        logger.info('Created PendingVotes for blockchain deployment', {
          responseId: response._id.toString(),
          platformId: platform._id.toString(),
          pendingVotesCount: pendingVotesCreated
        });
      } catch (error: any) {
        // Log error but don't fail response completion
        logger.error('Failed to create PendingVotes from response', {
          error: error.message,
          responseId: response._id.toString(),
          platformId: platform._id.toString()
        });
      }
    } else {
      logger.info('Off-chain mode: No PendingVotes created', {
        responseId: response._id.toString(),
        mode: platform.blockchainIntegration?.mode || 'off-chain'
      });
    }

    // Update user analytics if logged in
    if (response.userId) {
      const user = await User.findById(response.userId);
      if (user) {
        user.analytics.totalVotes = (user.analytics.totalVotes || 0) + 1;
        user.analytics.lastActiveAt = new Date();
        await user.save();
      }
    }

    logger.info('Response completed', {
      responseId: response._id.toString(),
      platformId: response.platformId.toString(),
      timeToComplete: response.timeToComplete,
      qualityScore: response.qualityMetrics.validationScore,
      blockchainEnabled: platform.blockchainIntegration?.enabled || false,
      mode: platform.blockchainIntegration?.mode || 'off-chain'
    });

    return {
      success: true,
      responseId: response._id.toString(),
      completedAt: response.completedAt,
      timeToComplete: response.timeToComplete,
      qualityScore: response.qualityMetrics.validationScore,
      blockchainEnabled: platform.blockchainIntegration?.enabled || false,
      mode: platform.blockchainIntegration?.mode || 'off-chain',
      pendingVotesCreated
    };
  }

  /**
   * Create PendingVote records from completed response (ON-CHAIN MODE ONLY)
   * @param response - The completed voting response
   * @param platform - The voting platform with blockchain settings
   * @returns Number of PendingVotes created
   */
  private async createPendingVotesFromResponse(
    response: any,
    platform: any
  ): Promise<number> {
    const { PendingVote } = await import('../../../models/voting/pendingVote.model');
    const { Proposal } = await import('../../../models/voting/proposal.model');

    // Get all product voting questions for this platform
    const questions = await VotingQuestion.find({
      platformId: response.platformId,
      'productVotingConfig.enabled': true,
      'productVotingConfig.products': { $exists: true, $ne: [] }
    });

    if (questions.length === 0) {
      logger.warn('No product voting questions found for platform', {
        platformId: response.platformId.toString()
      });
      return 0;
    }

    // Get linked proposal
    const proposal = await Proposal.findOne({
      proposalId: platform.blockchainIntegration.proposalId,
      businessId: platform.businessId,
      status: { $in: ['active', 'draft'] }
    });

    if (!proposal) {
      logger.error('No proposal found for blockchain-enabled platform', {
        platformId: response.platformId.toString(),
        proposalId: platform.blockchainIntegration.proposalId
      });
      return 0;
    }

    // Create PendingVote for each product voting answer
    const pendingVotes: any[] = [];

    for (const answer of response.answers) {
      const question = questions.find(
        (q: any) => q._id.toString() === answer.questionId.toString()
      );

      if (!question) continue;

      // Extract selected product(s) from answer
      let selectedProductIds: string[] = [];

      if (answer.choiceValues && Array.isArray(answer.choiceValues)) {
        selectedProductIds = answer.choiceValues;
      } else if (answer.value) {
        selectedProductIds = Array.isArray(answer.value) ? answer.value : [answer.value];
      }

      // Create PendingVote for each selected product
      for (const productId of selectedProductIds) {
        if (!productId) continue;

        // Verify product is in the proposal
        const isProductInProposal = proposal.productIds.some(
          (pid: any) => pid.toString() === productId.toString()
        );

        if (!isProductInProposal) {
          logger.warn('Product not in proposal, skipping', {
            productId,
            proposalId: proposal.proposalId
          });
          continue;
        }

        // Generate unique voteId
        const voteId = `${response._id.toString()}-${question._id.toString()}-${productId}-${Date.now()}`;

        pendingVotes.push({
          businessId: platform.businessId.toString(),
          userId: response.userId?.toString() || `anonymous-${response.sessionId}`,
          proposalId: proposal.proposalId,
          voteId,
          selectedProductId: productId,
          voteChoice: 'for', // Product selection implies 'for'
          userSignature: response.fingerprint || 'platform-vote',
          ipAddress: response.userContext?.ipAddress,
          userAgent: response.userContext?.userAgent,
          isProcessed: false,
          isVerified: false,
          createdAt: new Date()
        });
      }
    }

    if (pendingVotes.length > 0) {
      await PendingVote.insertMany(pendingVotes);

      logger.info('Created PendingVotes from platform response', {
        responseId: response._id.toString(),
        pendingVotesCount: pendingVotes.length,
        proposalId: proposal.proposalId
      });

      // Check if batch threshold reached
      if (platform.blockchainIntegration.batchThreshold) {
        const totalPending = await PendingVote.countDocuments({
          businessId: platform.businessId.toString(),
          proposalId: proposal.proposalId,
          isProcessed: false
        });

        if (totalPending >= platform.blockchainIntegration.batchThreshold) {
          logger.info('Batch threshold reached for platform', {
            platformId: platform._id.toString(),
            totalPending,
            threshold: platform.blockchainIntegration.batchThreshold
          });

          // TODO: Emit event or notification to brand dashboard
          // suggesting they deploy the batch to blockchain
        }
      }
    }

    return pendingVotes.length;
  }

  /**
   * Get platform for customer view (with questions)
   */
  async getPlatformForCustomer(platformIdOrSlug: string): Promise<any> {
    let platform: any;

    // Try to get by ID first, then by slug
    if (Types.ObjectId.isValid(platformIdOrSlug)) {
      platform = await this.dataService.getPlatformById(platformIdOrSlug);
    } else {
      platform = await this.dataService.getPlatformBySlug(platformIdOrSlug);
    }

    if (!platform.isActive()) {
      throw createAppError('This platform is not currently available', 400, 'PLATFORM_INACTIVE');
    }

    // Get active questions
    const questions = await this.dataService.getQuestionsByPlatform(
      platform._id.toString(),
      true
    );

    // Remove sensitive business data
    const publicPlatform = {
      id: platform._id.toString(),
      title: platform.title,
      description: platform.description,
      branding: platform.branding,
      templateId: platform.templateId,
      customTemplateConfig: platform.customTemplateConfig,
      responseSettings: {
        allowMultipleResponses: platform.responseSettings.allowMultipleResponses,
        requireLogin: platform.responseSettings.requireLogin,
        showResultsAfterVote: platform.responseSettings.showResultsAfterVote,
        captchaEnabled: platform.responseSettings.captchaEnabled
      },
      emailGating: {
        enabled: platform.emailGating.enabled,
        requireEmailVerification: platform.emailGating.requireEmailVerification
      },
      socialSharing: platform.socialSharing,
      seo: platform.seo,
      questions: questions.map(q => ({
        id: q._id.toString(),
        questionText: q.questionText,
        questionType: q.questionType,
        description: q.description,
        helpText: q.helpText,
        isRequired: q.isRequired,
        order: q.order,
        imageUrl: q.imageUrl,
        videoUrl: q.videoUrl,
        // Include config based on type
        ...this.getQuestionConfig(q)
      })),
      isScheduled: platform.isScheduled,
      endTime: platform.endTime,
      watermarkEnabled: platform.planFeatures.watermarkEnabled
    };

    return publicPlatform;
  }

  /**
   * Abandon a response
   */
  async abandonResponse(responseId: string): Promise<void> {
    const response = await this.dataService.getResponseById(responseId);

    if (response.status === 'completed') {
      throw createAppError('Cannot abandon completed response', 400, 'RESPONSE_COMPLETED');
    }

    response.status = 'abandoned';
    await response.save();

    logger.debug('Response abandoned', {
      responseId,
      answersProvided: response.answers.length
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Create unique response hash
   */
  private createResponseHash(identifier: string, platformId: string): string {
    const data = `${identifier}:${platformId}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate device fingerprint
   */
  private generateFingerprint(input: StartResponseInput): string {
    const data = [
      input.ipAddress,
      input.userAgent,
      input.screenResolution,
      input.timezone,
      input.language
    ].filter(Boolean).join('|');

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Extract question-specific config for customer view
   */
  private getQuestionConfig(question: any): any {
    const config: any = {};

    const configMap: Record<string, string> = {
      text: 'textConfig',
      textarea: 'textareaConfig',
      multiple_choice: 'multipleChoiceConfig',
      image_selection: 'imageSelectionConfig',
      rating: 'ratingConfig',
      scale: 'scaleConfig',
      ranking: 'rankingConfig',
      date: 'dateConfig',
      file_upload: 'fileUploadConfig'
    };

    const configKey = configMap[question.questionType];
    if (configKey && question[configKey]) {
      config[configKey] = question[configKey];
    }

    // Include product voting config if enabled
    if (question.productVotingConfig?.enabled) {
      config.productVotingConfig = question.productVotingConfig;
    }

    return config;
  }
}

export const votingPlatformCustomerService = new VotingPlatformCustomerService();
