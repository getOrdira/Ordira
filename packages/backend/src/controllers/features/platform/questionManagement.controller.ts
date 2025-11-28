// src/controllers/features/platform/questionManagement.controller.ts
// Controller for voting platform question management operations

import { Response } from 'express';
import { BaseController, BaseRequest } from '../../core/base.controller';
import { votingPlatformManagementService } from '../../../services/platform/features/votingPlatformManagement.service';

interface QuestionManagementRequest extends BaseRequest {
  validatedParams?: {
    platformId?: string;
    questionId?: string;
  };
  validatedQuery?: {
    businessId?: string;
  };
  validatedBody?: {
    // Question fields
    questionText?: string;
    questionType?: string;
    description?: string;
    helpText?: string;
    isRequired?: boolean;
    order?: number;

    // Type-specific configs
    textConfig?: any;
    textareaConfig?: any;
    multipleChoiceConfig?: any;
    imageSelectionConfig?: any;
    ratingConfig?: any;
    scaleConfig?: any;
    rankingConfig?: any;
    dateConfig?: any;
    fileUploadConfig?: any;

    // Product voting config (for blockchain product selection)
    productVotingConfig?: {
      enabled?: boolean;
      products?: string[];
      allowMultipleSelection?: boolean;
      maxSelections?: number;
      minSelections?: number;
      showProductDetails?: boolean;
      showProductImages?: boolean;
      showProductPrices?: boolean;
      sortOrder?: 'manual' | 'popular' | 'recent' | 'price-asc' | 'price-desc';
      displayStyle?: 'grid' | 'list' | 'carousel';
    };

    imageUrl?: string;
    videoUrl?: string;

    // Reorder
    questionIds?: string[];

    // Business ID
    businessId?: string;
  };
}

/**
 * Controller for voting platform question management operations
 */
export class QuestionManagementController extends BaseController {
  /**
   * Resolve business ID from request
   */
  private resolveBusinessId(req: QuestionManagementRequest): string {
    const businessId = req.businessId || 
      req.validatedQuery?.businessId || 
      req.validatedBody?.businessId;

    if (!businessId) {
      throw {
        statusCode: 400,
        message: 'Business ID is required for this operation',
        code: 'MISSING_BUSINESS_ID'
      };
    }

    return businessId;
  }

  /**
   * Add a question to a platform
   */
  async addQuestion(req: QuestionManagementRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const businessId = this.resolveBusinessId(req);
      const platformId = req.validatedParams?.platformId;

      if (!platformId) {
        throw {
          statusCode: 400,
          message: 'Platform ID is required',
          code: 'MISSING_PLATFORM_ID'
        };
      }

      const input = req.validatedBody || {};

      const question = await votingPlatformManagementService.addQuestion(
        businessId,
        platformId,
        {
          questionText: input.questionText!,
          questionType: input.questionType!,
          description: input.description,
          helpText: input.helpText,
          isRequired: input.isRequired,
          order: input.order,
          textConfig: input.textConfig,
          textareaConfig: input.textareaConfig,
          multipleChoiceConfig: input.multipleChoiceConfig,
          imageSelectionConfig: input.imageSelectionConfig,
          ratingConfig: input.ratingConfig,
          scaleConfig: input.scaleConfig,
          rankingConfig: input.rankingConfig,
          dateConfig: input.dateConfig,
          fileUploadConfig: input.fileUploadConfig,
          productVotingConfig: input.productVotingConfig,
          imageUrl: input.imageUrl,
          videoUrl: input.videoUrl
        }
      );

      this.logger.info('Question added to platform', {
        businessId,
        platformId,
        questionId: question._id.toString(),
        hasProductVotingConfig: !!input.productVotingConfig?.enabled
      });

      return { question: question.toJSON() };
    }, res, 'Question added successfully');
  }

  /**
   * Update a question
   */
  async updateQuestion(req: QuestionManagementRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const businessId = this.resolveBusinessId(req);
      const questionId = req.validatedParams?.questionId;

      if (!questionId) {
        throw {
          statusCode: 400,
          message: 'Question ID is required',
          code: 'MISSING_QUESTION_ID'
        };
      }

      const updates = req.validatedBody || {};

      const question = await votingPlatformManagementService.updateQuestion(
        businessId,
        questionId,
        updates
      );

      this.logger.info('Question updated', {
        businessId,
        questionId,
        hasProductVotingConfig: !!updates.productVotingConfig?.enabled
      });

      return { question };
    }, res, 'Question updated successfully');
  }

  /**
   * Delete a question
   */
  async deleteQuestion(req: QuestionManagementRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const businessId = this.resolveBusinessId(req);
      const questionId = req.validatedParams?.questionId;

      if (!questionId) {
        throw {
          statusCode: 400,
          message: 'Question ID is required',
          code: 'MISSING_QUESTION_ID'
        };
      }

      await votingPlatformManagementService.deleteQuestion(businessId, questionId);

      this.logger.info('Question deleted', {
        businessId,
        questionId
      });

      return { deleted: true, questionId };
    }, res, 'Question deleted successfully');
  }

  /**
   * Reorder questions
   */
  async reorderQuestions(req: QuestionManagementRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      const businessId = this.resolveBusinessId(req);
      const platformId = req.validatedParams?.platformId;

      if (!platformId) {
        throw {
          statusCode: 400,
          message: 'Platform ID is required',
          code: 'MISSING_PLATFORM_ID'
        };
      }

      const questionIds = req.validatedBody?.questionIds;

      if (!questionIds || !Array.isArray(questionIds)) {
        throw {
          statusCode: 400,
          message: 'Question IDs array is required',
          code: 'MISSING_QUESTION_IDS'
        };
      }

      await votingPlatformManagementService.reorderQuestions(
        businessId,
        platformId,
        questionIds
      );

      this.logger.info('Questions reordered', {
        businessId,
        platformId,
        count: questionIds.length
      });

      return { reordered: true, count: questionIds.length };
    }, res, 'Questions reordered successfully');
  }
}

export const questionManagementController = new QuestionManagementController();

