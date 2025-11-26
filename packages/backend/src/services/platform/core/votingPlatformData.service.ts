// src/services/platform/core/votingPlatformData.service.ts
import { Types } from 'mongoose';
import { VotingPlatform } from '../../../models/platform/votingPlatform.model';
import { VotingQuestion } from '../../../models/platform/votingQuestion.model';
import { VotingResponse } from '../../../models/platform/votingResponse.model';
import { logger } from '../../../utils/logger';
import { createAppError } from '../../../middleware/core/error.middleware';
import { votingPlatformValidationService } from '../validation/votingPlatformValidation.service';

/**
 * Core data access service for voting platform operations
 */
export class VotingPlatformDataService {
  private readonly validation = votingPlatformValidationService;

  // ============================================
  // PLATFORM DATA ACCESS
  // ============================================

  /**
   * Get platform by ID with optional population
   */
  async getPlatformById(
    platformId: string,
    businessId?: string,
    options?: { includeQuestions?: boolean }
  ): Promise<any> {
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    const query: any = { _id: validatedPlatformId };
    if (businessId) {
      query.businessId = this.validation.ensureBusinessId(businessId);
    }

    const platform = await VotingPlatform.findOne(query);

    if (!platform) {
      throw createAppError('Platform not found', 404, 'PLATFORM_NOT_FOUND');
    }

    if (options?.includeQuestions) {
      const questions = await this.getQuestionsByPlatform(validatedPlatformId, true);
      return { ...platform.toObject(), questions };
    }

    return platform;
  }

  /**
   * Get platform by slug
   */
  async getPlatformBySlug(slug: string, businessId?: string): Promise<any> {
    const validatedSlug = this.validation.validateSlug(slug);

    const query: any = { slug: validatedSlug };
    if (businessId) {
      query.businessId = this.validation.ensureBusinessId(businessId);
    }

    const platform = await VotingPlatform.findOne(query);

    if (!platform) {
      throw createAppError('Platform not found', 404, 'PLATFORM_NOT_FOUND');
    }

    return platform;
  }

  /**
   * List platforms for a business
   */
  async listPlatformsByBusiness(
    businessId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ platforms: any[]; total: number }> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const { limit, offset } = this.validation.validatePaginationOptions(options || {});

    const query: any = { businessId: validatedBusinessId };
    if (options?.status) {
      query.status = options.status;
    }

    const [platforms, total] = await Promise.all([
      VotingPlatform.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean(),
      VotingPlatform.countDocuments(query)
    ]);

    return { platforms, total };
  }

  /**
   * Check if slug is available for a business
   */
  async isSlugAvailable(slug: string, businessId: string, excludePlatformId?: string): Promise<boolean> {
    const validatedSlug = this.validation.validateSlug(slug);
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const query: any = {
      slug: validatedSlug,
      businessId: validatedBusinessId
    };

    if (excludePlatformId) {
      query._id = { $ne: new Types.ObjectId(excludePlatformId) };
    }

    const existingPlatform = await VotingPlatform.findOne(query).lean();
    return !existingPlatform;
  }

  // ============================================
  // QUESTION DATA ACCESS
  // ============================================

  /**
   * Get questions by platform
   */
  async getQuestionsByPlatform(
    platformId: string,
    activeOnly: boolean = false
  ): Promise<any[]> {
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    const query: any = { platformId: validatedPlatformId };
    if (activeOnly) {
      query.isActive = true;
    }

    const questions = await VotingQuestion.find(query)
      .sort({ order: 1 })
      .lean();

    return questions;
  }

  /**
   * Get question by ID
   */
  async getQuestionById(
    questionId: string,
    platformId?: string
  ): Promise<any> {
    if (!Types.ObjectId.isValid(questionId)) {
      throw createAppError('Invalid question ID format', 400, 'INVALID_QUESTION_ID');
    }

    const query: any = { _id: questionId };
    if (platformId) {
      query.platformId = this.validation.ensurePlatformId(platformId);
    }

    const question = await VotingQuestion.findOne(query);

    if (!question) {
      throw createAppError('Question not found', 404, 'QUESTION_NOT_FOUND');
    }

    return question;
  }

  /**
   * Count questions for a platform
   */
  async countPlatformQuestions(platformId: string): Promise<number> {
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);
    return VotingQuestion.countDocuments({ platformId: validatedPlatformId });
  }

  /**
   * Get required question IDs for a platform
   */
  async getRequiredQuestionIds(platformId: string): Promise<string[]> {
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    const questions = await VotingQuestion.find({
      platformId: validatedPlatformId,
      isActive: true,
      isRequired: true
    })
      .select('_id')
      .lean();

    return questions.map(q => q._id.toString());
  }

  // ============================================
  // RESPONSE DATA ACCESS
  // ============================================

  /**
   * Get response by ID
   */
  async getResponseById(
    responseId: string,
    platformId?: string
  ): Promise<any> {
    if (!Types.ObjectId.isValid(responseId)) {
      throw createAppError('Invalid response ID format', 400, 'INVALID_RESPONSE_ID');
    }

    const query: any = { _id: responseId };
    if (platformId) {
      query.platformId = this.validation.ensurePlatformId(platformId);
    }

    const response = await VotingResponse.findOne(query);

    if (!response) {
      throw createAppError('Response not found', 404, 'RESPONSE_NOT_FOUND');
    }

    return response;
  }

  /**
   * List responses for a platform
   */
  async listResponsesByPlatform(
    platformId: string,
    options?: {
      isComplete?: boolean;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ responses: any[]; total: number }> {
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);
    const { limit, offset } = this.validation.validatePaginationOptions(options || {});

    const query: any = { platformId: validatedPlatformId };
    if (options?.isComplete !== undefined) {
      query.isComplete = options.isComplete;
    }
    if (options?.status) {
      query.status = options.status;
    }

    const [responses, total] = await Promise.all([
      VotingResponse.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean(),
      VotingResponse.countDocuments(query)
    ]);

    return { responses, total };
  }

  /**
   * Check if user has already responded to platform
   */
  async hasUserResponded(
    userId: string,
    platformId: string
  ): Promise<boolean> {
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);
    const validatedUserId = this.validation.ensureUserId(userId);

    const existingResponse = await VotingResponse.findOne({
      platformId: validatedPlatformId,
      userId: validatedUserId,
      isComplete: true,
      status: 'completed'
    }).lean();

    return !!existingResponse;
  }

  /**
   * Check for duplicate response by hash
   */
  async checkDuplicateResponse(
    userId: string,
    platformId: string
  ): Promise<any | null> {
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    if (userId) {
      const validatedUserId = this.validation.ensureUserId(userId);
      return VotingResponse.checkDuplicate(validatedUserId!, validatedPlatformId);
    }

    return null;
  }

  /**
   * Count responses for a platform
   */
  async countPlatformResponses(
    platformId: string,
    filters?: { isComplete?: boolean; status?: string }
  ): Promise<number> {
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    const query: any = { platformId: validatedPlatformId };
    if (filters?.isComplete !== undefined) {
      query.isComplete = filters.isComplete;
    }
    if (filters?.status) {
      query.status = filters.status;
    }

    return VotingResponse.countDocuments(query);
  }

  /**
   * Get response by session ID (for anonymous users)
   */
  async getResponseBySession(
    sessionId: string,
    platformId: string
  ): Promise<any | null> {
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    return VotingResponse.findOne({
      platformId: validatedPlatformId,
      sessionId: sessionId.trim(),
      status: { $in: ['in_progress', 'completed'] }
    });
  }

  /**
   * Get responses by user
   */
  async getResponsesByUser(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ responses: any[]; total: number }> {
    const validatedUserId = this.validation.ensureUserId(userId);
    if (!validatedUserId) {
      return { responses: [], total: 0 };
    }

    const { limit, offset } = this.validation.validatePaginationOptions(options || {});

    const [responses, total] = await Promise.all([
      VotingResponse.find({ userId: validatedUserId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean(),
      VotingResponse.countDocuments({ userId: validatedUserId })
    ]);

    return { responses, total };
  }

  // ============================================
  // ANALYTICS HELPERS
  // ============================================

  /**
   * Get platform statistics
   */
  async getPlatformStats(platformId: string): Promise<any> {
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    const [platform, questionCount, responseStats] = await Promise.all([
      VotingPlatform.findById(validatedPlatformId).lean(),
      this.countPlatformQuestions(validatedPlatformId),
      VotingResponse.aggregate([
        { $match: { platformId: new Types.ObjectId(validatedPlatformId) } },
        {
          $group: {
            _id: null,
            totalResponses: { $sum: 1 },
            completedResponses: {
              $sum: { $cond: ['$isComplete', 1, 0] }
            },
            averageCompletionTime: {
              $avg: '$timeToComplete'
            },
            uniqueRespondents: { $addToSet: '$userId' }
          }
        }
      ])
    ]);

    const stats = responseStats[0] || {
      totalResponses: 0,
      completedResponses: 0,
      averageCompletionTime: 0,
      uniqueRespondents: []
    };

    return {
      platformId: validatedPlatformId,
      title: platform?.title,
      status: platform?.status,
      questionCount,
      totalViews: platform?.analytics?.totalViews || 0,
      totalResponses: stats.totalResponses,
      completedResponses: stats.completedResponses,
      uniqueRespondents: stats.uniqueRespondents.filter(Boolean).length,
      averageCompletionTime: Math.round(stats.averageCompletionTime || 0),
      completionRate: stats.totalResponses > 0
        ? Math.round((stats.completedResponses / stats.totalResponses) * 100)
        : 0
    };
  }

  /**
   * Get question response distribution
   */
  async getQuestionResponseDistribution(questionId: string): Promise<any> {
    if (!Types.ObjectId.isValid(questionId)) {
      throw createAppError('Invalid question ID format', 400, 'INVALID_QUESTION_ID');
    }

    const question = await VotingQuestion.findById(questionId).lean();
    if (!question) {
      throw createAppError('Question not found', 404, 'QUESTION_NOT_FOUND');
    }

    // Get response distribution from analytics field
    const distribution = question.analytics?.responseDistribution || new Map();

    return {
      questionId,
      questionText: question.questionText,
      questionType: question.questionType,
      totalResponses: question.analytics?.totalResponses || 0,
      distribution: Object.fromEntries(distribution)
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Log data access for audit trail
   */
  private logDataAccess(operation: string, entityType: string, entityId: string, userId?: string): void {
    logger.debug('Voting platform data access', {
      operation,
      entityType,
      entityId,
      userId,
      timestamp: new Date().toISOString()
    });
  }
}

export const votingPlatformDataService = new VotingPlatformDataService();
