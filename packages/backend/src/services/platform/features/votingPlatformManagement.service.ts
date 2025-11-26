// src/services/platform/features/votingPlatformManagement.service.ts
import { Types } from 'mongoose';
import { VotingPlatform } from '../../../models/platform/votingPlatform.model';
import { VotingQuestion } from '../../../models/platform/votingQuestion.model';
import { VotingResponse } from '../../../models/platform/votingResponse.model';
import { Business } from '../../../models/core/business.model';
import { logger } from '../../../utils/logger';
import { createAppError } from '../../../middleware/core/error.middleware';
import { votingPlatformDataService } from '../core/votingPlatformData.service';
import { votingPlatformValidationService } from '../validation/votingPlatformValidation.service';

// Plan limits for voting platforms
const PLAN_LIMITS = {
  foundation: {
    maxPlatforms: 5,
    maxQuestions: 20,
    maxResponses: 100,
    watermark: true,
    customCSS: false,
    customDomain: false,
    advancedAnalytics: false,
    exportResponses: false
  },
  growth: {
    maxPlatforms: 20,
    maxQuestions: 50,
    maxResponses: 500,
    watermark: false,
    customCSS: false,
    customDomain: false,
    advancedAnalytics: true,
    exportResponses: true
  },
  premium: {
    maxPlatforms: 100,
    maxQuestions: 100,
    maxResponses: 2000,
    watermark: false,
    customCSS: true,
    customDomain: true,
    advancedAnalytics: true,
    exportResponses: true
  },
  enterprise: {
    maxPlatforms: -1, // unlimited
    maxQuestions: -1,
    maxResponses: -1,
    watermark: false,
    customCSS: true,
    customDomain: true,
    advancedAnalytics: true,
    exportResponses: true
  }
};

export interface CreatePlatformInput {
  title: string;
  slug?: string;
  description?: string;
  templateId?: string;
  visibility?: 'public' | 'private' | 'unlisted';

  // Scheduling
  timezone?: string;
  startTime?: Date;
  endTime?: Date;

  // Email gating
  emailGatingEnabled?: boolean;
  allowedDomains?: string[];
  allowedEmails?: string[];
  blockDisposableEmails?: boolean;

  // Branding
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;

  // Blockchain configuration (dual-mode support)
  blockchainEnabled?: boolean;
  blockchainMode?: 'off-chain' | 'on-chain';
  createProposal?: boolean;  // Auto-create proposal for on-chain mode
  proposalDuration?: number; // Duration in seconds for proposal
  batchThreshold?: number;   // Min votes before suggesting batch deployment
}

export interface UpdatePlatformInput {
  title?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'unlisted';

  // Scheduling
  startTime?: Date;
  endTime?: Date;

  // Branding
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  customCSS?: string;

  // Response settings
  allowMultipleResponses?: boolean;
  requireLogin?: boolean;
  showResultsAfterVote?: boolean;
}

export interface CreateQuestionInput {
  questionText: string;
  questionType: string;
  description?: string;
  helpText?: string;
  isRequired?: boolean;
  order?: number;

  // Type-specific config
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
}

export interface UpdateQuestionInput extends Partial<CreateQuestionInput> {}

/**
 * Service for managing voting platforms (business dashboard operations)
 */
export class VotingPlatformManagementService {
  private readonly dataService = votingPlatformDataService;
  private readonly validation = votingPlatformValidationService;

  // ============================================
  // PLATFORM MANAGEMENT
  // ============================================

  /**
   * Create a new voting platform
   */
  async createPlatform(
    businessId: string,
    input: CreatePlatformInput
  ): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    // Get business to check plan limits
    const business = await Business.findById(validatedBusinessId);
    if (!business) {
      throw createAppError('Business not found', 404, 'BUSINESS_NOT_FOUND');
    }

    // Check plan limits
    const plan = business.plan || 'foundation';
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];

    if (limits.maxPlatforms !== -1) {
      const { total } = await this.dataService.listPlatformsByBusiness(validatedBusinessId, { limit: 1 });
      if (total >= limits.maxPlatforms) {
        throw createAppError(
          `Your ${plan} plan allows up to ${limits.maxPlatforms} platforms. Upgrade to create more.`,
          403,
          'PLAN_LIMIT_EXCEEDED'
        );
      }
    }

    // Validate input
    if (!input.title || input.title.trim().length < 3) {
      throw createAppError('Platform title must be at least 3 characters', 400, 'INVALID_TITLE');
    }

    // Generate or validate slug
    let slug = input.slug || this.generateSlug(input.title);
    slug = this.validation.validateSlug(slug);

    // Check slug availability
    const isAvailable = await this.dataService.isSlugAvailable(slug, validatedBusinessId);
    if (!isAvailable) {
      throw createAppError('This slug is already in use. Please choose another.', 400, 'SLUG_TAKEN');
    }

    // Validate colors if provided
    const primaryColor = input.primaryColor
      ? this.validation.validateHexColor(input.primaryColor)
      : '#3B82F6';
    const secondaryColor = input.secondaryColor
      ? this.validation.validateHexColor(input.secondaryColor)
      : '#10B981';
    const backgroundColor = input.backgroundColor
      ? this.validation.validateHexColor(input.backgroundColor)
      : '#FFFFFF';
    const textColor = input.textColor
      ? this.validation.validateHexColor(input.textColor)
      : '#1F2937';

    // Validate date range
    if (input.startTime || input.endTime) {
      this.validation.validateDateRange(input.startTime, input.endTime);
    }

    // Create platform
    const platform = new VotingPlatform({
      businessId: validatedBusinessId,
      title: input.title.trim(),
      slug,
      description: input.description?.trim(),
      visibility: input.visibility || 'public',

      // Scheduling
      timezone: input.timezone || 'UTC',
      startTime: input.startTime,
      endTime: input.endTime,
      isScheduled: !!(input.startTime || input.endTime),

      // Email gating
      emailGating: {
        enabled: input.emailGatingEnabled || false,
        allowedDomains: input.allowedDomains || [],
        allowedEmails: input.allowedEmails || [],
        requireEmailVerification: true,
        blockDisposableEmails: input.blockDisposableEmails !== false
      },

      // Branding
      branding: {
        logoUrl: input.logoUrl?.trim(),
        primaryColor,
        secondaryColor,
        backgroundColor,
        textColor,
        fontFamily: input.fontFamily || 'Inter, sans-serif'
      },

      // Template
      templateId: input.templateId && this.validation.validateTemplateId(input.templateId) || 'modern',

      // Plan features
      planFeatures: {
        watermarkEnabled: limits.watermark,
        customCSSEnabled: limits.customCSS,
        customDomainEnabled: limits.customDomain,
        advancedAnalytics: limits.advancedAnalytics,
        exportResponses: limits.exportResponses,
        maxResponses: limits.maxResponses
      },

      // Blockchain integration (dual-mode support)
      blockchainIntegration: {
        enabled: input.blockchainEnabled || false,
        mode: input.blockchainMode || 'off-chain',
        autoDeployVotes: input.blockchainEnabled && input.blockchainMode === 'on-chain',
        batchThreshold: input.batchThreshold || 20
      },

      status: 'draft'
    });

    await platform.save();

    // Auto-create proposal for on-chain mode if requested
    // Note: Proposal creation requires at least one product, so we skip it here
    // and create it later when questions with productVotingConfig are added
    if (input.blockchainEnabled &&
        input.blockchainMode === 'on-chain' &&
        input.createProposal) {

      logger.info('Proposal creation deferred - will be created when products are added via questions', {
        platformId: platform._id.toString()
      });
      // Proposal will be created automatically when the first question with productVotingConfig is added
    }

    logger.info('Voting platform created', {
      businessId: validatedBusinessId,
      platformId: platform._id.toString(),
      slug: platform.slug,
      blockchainEnabled: platform.blockchainIntegration.enabled,
      blockchainMode: platform.blockchainIntegration.mode
    });

    return platform;
  }

  /**
   * Update an existing platform
   */
  async updatePlatform(
    businessId: string,
    platformId: string,
    updates: UpdatePlatformInput
  ): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    const platform = await this.dataService.getPlatformById(validatedPlatformId, validatedBusinessId);

    // Only allow updates to draft or paused platforms
    if (platform.status === 'live' && !updates.visibility) {
      throw createAppError(
        'Cannot update live platform. Pause it first or only update visibility.',
        400,
        'PLATFORM_LIVE'
      );
    }

    // Apply updates
    if (updates.title !== undefined) {
      if (updates.title.trim().length < 3) {
        throw createAppError('Platform title must be at least 3 characters', 400, 'INVALID_TITLE');
      }
      platform.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      platform.description = updates.description.trim();
    }

    if (updates.visibility !== undefined) {
      platform.visibility = updates.visibility;
    }

    // Scheduling updates
    if (updates.startTime !== undefined || updates.endTime !== undefined) {
      const startTime = updates.startTime || platform.startTime;
      const endTime = updates.endTime || platform.endTime;

      if (startTime || endTime) {
        this.validation.validateDateRange(startTime, endTime);
      }

      if (updates.startTime !== undefined) platform.startTime = updates.startTime;
      if (updates.endTime !== undefined) platform.endTime = updates.endTime;
      platform.isScheduled = !!(platform.startTime || platform.endTime);
    }

    // Branding updates
    if (updates.logoUrl !== undefined) {
      platform.branding.logoUrl = updates.logoUrl.trim();
    }
    if (updates.primaryColor !== undefined) {
      platform.branding.primaryColor = this.validation.validateHexColor(updates.primaryColor);
    }
    if (updates.secondaryColor !== undefined) {
      platform.branding.secondaryColor = this.validation.validateHexColor(updates.secondaryColor);
    }
    if (updates.backgroundColor !== undefined) {
      platform.branding.backgroundColor = this.validation.validateHexColor(updates.backgroundColor);
    }
    if (updates.textColor !== undefined) {
      platform.branding.textColor = this.validation.validateHexColor(updates.textColor);
    }

    // Custom CSS (premium+ only)
    if (updates.customCSS !== undefined) {
      if (!platform.planFeatures.customCSSEnabled) {
        throw createAppError('Custom CSS requires Premium plan or higher', 403, 'PLAN_UPGRADE_REQUIRED');
      }
      platform.branding.customCSS = updates.customCSS.trim();
    }

    // Response settings
    if (updates.allowMultipleResponses !== undefined) {
      platform.responseSettings.allowMultipleResponses = updates.allowMultipleResponses;
    }
    if (updates.requireLogin !== undefined) {
      platform.responseSettings.requireLogin = updates.requireLogin;
    }
    if (updates.showResultsAfterVote !== undefined) {
      platform.responseSettings.showResultsAfterVote = updates.showResultsAfterVote;
    }

    platform.lastModifiedBy = new Types.ObjectId(validatedBusinessId);

    await platform.save();

    logger.info('Voting platform updated', {
      businessId: validatedBusinessId,
      platformId: validatedPlatformId
    });

    return platform;
  }

  /**
   * Publish a platform (make it live)
   */
  async publishPlatform(businessId: string, platformId: string): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    const platform = await this.dataService.getPlatformById(validatedPlatformId, validatedBusinessId);

    if (platform.status === 'live') {
      throw createAppError('Platform is already live', 400, 'ALREADY_LIVE');
    }

    // Verify platform has at least one question
    const questionCount = await this.dataService.countPlatformQuestions(validatedPlatformId);
    if (questionCount === 0) {
      throw createAppError('Cannot publish platform without questions', 400, 'NO_QUESTIONS');
    }

    await platform.publish();

    logger.info('Voting platform published', {
      businessId: validatedBusinessId,
      platformId: validatedPlatformId
    });

    return platform;
  }

  /**
   * Pause a live platform
   */
  async pausePlatform(businessId: string, platformId: string): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    const platform = await this.dataService.getPlatformById(validatedPlatformId, validatedBusinessId);

    if (platform.status !== 'live') {
      throw createAppError('Can only pause live platforms', 400, 'NOT_LIVE');
    }

    await platform.pause();

    logger.info('Voting platform paused', {
      businessId: validatedBusinessId,
      platformId: validatedPlatformId
    });

    return platform;
  }

  /**
   * Archive a platform
   */
  async archivePlatform(businessId: string, platformId: string): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    const platform = await this.dataService.getPlatformById(validatedPlatformId, validatedBusinessId);

    await platform.archive();

    logger.info('Voting platform archived', {
      businessId: validatedBusinessId,
      platformId: validatedPlatformId
    });

    return platform;
  }

  /**
   * Toggle blockchain mode for an existing platform
   * @param businessId - The business ID
   * @param platformId - The platform ID
   * @param enabled - Whether blockchain is enabled
   * @param mode - The blockchain mode ('off-chain' or 'on-chain')
   * @returns The updated platform
   */
  async toggleBlockchainMode(
    businessId: string,
    platformId: string,
    enabled: boolean,
    mode?: 'off-chain' | 'on-chain'
  ): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    const platform = await this.dataService.getPlatformById(
      validatedPlatformId,
      validatedBusinessId
    );

    // Only allow toggling for draft or paused platforms
    if (platform.status === 'live') {
      throw createAppError(
        'Cannot change blockchain settings for live platform. Pause it first.',
        400,
        'PLATFORM_LIVE'
      );
    }

    // Update blockchain settings
    platform.blockchainIntegration.enabled = enabled;

    if (mode) {
      platform.blockchainIntegration.mode = mode;
    }

    // Update autoDeployVotes based on mode
    platform.blockchainIntegration.autoDeployVotes = enabled && platform.blockchainIntegration.mode === 'on-chain';

    // If enabling on-chain mode and no proposal exists, create one
    if (enabled && platform.blockchainIntegration.mode === 'on-chain' && !platform.blockchainIntegration.proposalId) {
      try {
        const { votingProposalManagementService } = await import('../../votes/features/votingProposalManagement.service');

        // Check if platform has questions with products before creating proposal
        const questionsWithProducts = await this.dataService.getQuestionsByPlatform(validatedPlatformId, true)
          .then(questions => questions.filter((q: any) => 
            q.productVotingConfig?.enabled && 
            q.productVotingConfig?.products && 
            q.productVotingConfig.products.length > 0
          ));

        if (questionsWithProducts.length > 0) {
          // Extract product IDs from questions and convert to strings
          const productIds = new Set<string>();
          questionsWithProducts.forEach((q: any) => {
            if (q.productVotingConfig?.products) {
              q.productVotingConfig.products.forEach((pid: any) => {
                let productIdString: string;
                if (pid instanceof Types.ObjectId) {
                  productIdString = pid.toString();
                } else if (typeof pid === 'string') {
                  productIdString = pid;
                } else {
                  productIdString = String(pid);
                }
                
                // Only add valid ObjectId strings
                if (Types.ObjectId.isValid(productIdString)) {
                  productIds.add(productIdString);
                }
              });
            }
          });

          if (productIds.size === 0) {
            logger.warn('No valid product IDs found in questions, skipping proposal creation', {
              platformId: validatedPlatformId
            });
          } else {
            const proposal = await votingProposalManagementService.createProposal(
              validatedBusinessId,
              {
                title: platform.title,
                description: platform.description || `Blockchain voting for ${platform.title}`,
                productIds: Array.from(productIds),
                duration: 604800 // Default 7 days
              }
            );

            platform.blockchainIntegration.proposalId = proposal.proposalId;

            logger.info('Created blockchain proposal for platform', {
              platformId: platform._id.toString(),
              proposalId: proposal.proposalId,
              productCount: productIds.size
            });
          }
        } else {
          logger.info('Proposal creation deferred - no products found in questions yet', {
            platformId: platform._id.toString()
          });
          // Proposal will be created when questions with products are added
        }
      } catch (error: any) {
        logger.error('Failed to create proposal for platform', {
          error: error.message,
          platformId: platform._id.toString()
        });
        // Don't fail the toggle if proposal creation fails
      }
    }

    await platform.save();

    logger.info('Blockchain mode toggled for platform', {
      businessId: validatedBusinessId,
      platformId: validatedPlatformId,
      enabled,
      mode: platform.blockchainIntegration.mode
    });

    return platform;
  }

  /**
   * Delete a platform (only if in draft status)
   */
  async deletePlatform(businessId: string, platformId: string): Promise<void> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    const platform = await this.dataService.getPlatformById(validatedPlatformId, validatedBusinessId);

    if (platform.status !== 'draft') {
      throw createAppError('Can only delete platforms in draft status', 400, 'NOT_DRAFT');
    }

    // Delete all associated questions and responses
    await Promise.all([
      VotingQuestion.deleteMany({ platformId: validatedPlatformId }),
      VotingResponse.deleteMany({ platformId: validatedPlatformId })
    ]);

    await VotingPlatform.findByIdAndDelete(validatedPlatformId);

    logger.info('Voting platform deleted', {
      businessId: validatedBusinessId,
      platformId: validatedPlatformId
    });
  }

  // ============================================
  // QUESTION MANAGEMENT
  // ============================================

  /**
   * Add a question to a platform
   */
  async addQuestion(
    businessId: string,
    platformId: string,
    input: CreateQuestionInput
  ): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    // Verify platform ownership
    const platform = await this.dataService.getPlatformById(validatedPlatformId, validatedBusinessId);

    // Check question limit
    const plan = (await Business.findById(validatedBusinessId))?.plan || 'foundation';
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];

    if (limits.maxQuestions !== -1) {
      const questionCount = await this.dataService.countPlatformQuestions(validatedPlatformId);
      if (questionCount >= limits.maxQuestions) {
        throw createAppError(
          `Your ${plan} plan allows up to ${limits.maxQuestions} questions per platform.`,
          403,
          'PLAN_LIMIT_EXCEEDED'
        );
      }
    }

    // Validate input
    if (!input.questionText || input.questionText.trim().length < 3) {
      throw createAppError('Question text must be at least 3 characters', 400, 'INVALID_QUESTION');
    }

    const questionType = this.validation.validateQuestionType(input.questionType);

    // Prepare productVotingConfig with ObjectId conversion if needed
    let productVotingConfig;
    if (input.productVotingConfig) {
      try {
        productVotingConfig = {
          ...input.productVotingConfig,
          // Convert string product IDs to ObjectIds, filter out invalid ones
          products: input.productVotingConfig.products
            ?.filter(id => id && Types.ObjectId.isValid(id))
            .map(id => new Types.ObjectId(id)) || []
        };
      } catch (error: any) {
        throw createAppError(
          `Invalid product IDs in productVotingConfig: ${error.message}`,
          400,
          'INVALID_PRODUCT_IDS'
        );
      }
    }

    // Create question
    try {
      // Convert string IDs to ObjectIds explicitly
      const platformObjectId = new Types.ObjectId(validatedPlatformId);
      const businessObjectId = new Types.ObjectId(validatedBusinessId);

      // Build question data object
      const questionData: any = {
        platformId: platformObjectId,
        businessId: businessObjectId,
        questionText: input.questionText.trim(),
        questionType,
        description: input.description?.trim(),
        helpText: input.helpText?.trim(),
        isRequired: input.isRequired !== false,
        order: input.order || 0
      };

      // Add type-specific configs only if they exist and have content
      if (input.textConfig && Object.keys(input.textConfig).length > 0) {
        questionData.textConfig = input.textConfig;
      }
      if (input.textareaConfig && Object.keys(input.textareaConfig).length > 0) {
        questionData.textareaConfig = input.textareaConfig;
      }
      if (input.multipleChoiceConfig && Object.keys(input.multipleChoiceConfig).length > 0) {
        questionData.multipleChoiceConfig = input.multipleChoiceConfig;
      }
      if (input.imageSelectionConfig && Object.keys(input.imageSelectionConfig).length > 0) {
        questionData.imageSelectionConfig = input.imageSelectionConfig;
      }
      if (input.ratingConfig && Object.keys(input.ratingConfig).length > 0) {
        questionData.ratingConfig = input.ratingConfig;
      }
      if (input.scaleConfig && Object.keys(input.scaleConfig).length > 0) {
        questionData.scaleConfig = input.scaleConfig;
      }
      if (input.rankingConfig && Object.keys(input.rankingConfig).length > 0) {
        questionData.rankingConfig = input.rankingConfig;
      }
      if (input.dateConfig && Object.keys(input.dateConfig).length > 0) {
        questionData.dateConfig = input.dateConfig;
      }
      if (input.fileUploadConfig && Object.keys(input.fileUploadConfig).length > 0) {
        questionData.fileUploadConfig = input.fileUploadConfig;
      }

      // Product voting config (for blockchain)
      if (productVotingConfig && Object.keys(productVotingConfig).length > 0) {
        questionData.productVotingConfig = productVotingConfig;
      }

      if (input.imageUrl?.trim()) {
        questionData.imageUrl = input.imageUrl.trim();
      }
      if (input.videoUrl?.trim()) {
        questionData.videoUrl = input.videoUrl.trim();
      }

      const question = new VotingQuestion(questionData);
      await question.save();

      // If this is an on-chain platform with productVotingConfig and no proposal exists, create one
      if (productVotingConfig?.enabled && 
          productVotingConfig.products && 
          productVotingConfig.products.length > 0 &&
          platform.blockchainIntegration?.enabled &&
          platform.blockchainIntegration?.mode === 'on-chain' &&
          !platform.blockchainIntegration.proposalId) {
        
        try {
          const { votingProposalManagementService } = await import('../../votes/features/votingProposalManagement.service');
          
          // Convert ObjectIds to strings, ensuring they're valid
          const productIdStrings = productVotingConfig.products
            .map((pid: any) => {
              if (pid instanceof Types.ObjectId) {
                return pid.toString();
              } else if (typeof pid === 'string') {
                return pid;
              } else {
                return String(pid);
              }
            })
            .filter((id: string) => Types.ObjectId.isValid(id));
          
          if (productIdStrings.length === 0) {
            throw new Error('No valid product IDs found in productVotingConfig');
          }
          
          const proposal = await votingProposalManagementService.createProposal(
            validatedBusinessId,
            {
              title: platform.title,
              description: platform.description || `Blockchain voting for ${platform.title}`,
              productIds: productIdStrings,
              duration: 604800, // Default 7 days
              priority: 'medium'
            }
          );

          platform.blockchainIntegration.proposalId = proposal.proposalId;
          await platform.save();

          logger.info('Auto-created blockchain proposal from question with products', {
            platformId: validatedPlatformId,
            questionId: question._id.toString(),
            proposalId: proposal.proposalId,
            productCount: productVotingConfig.products.length
          });
        } catch (error: any) {
          logger.error('Failed to auto-create proposal from question', {
            error: error.message,
            platformId: validatedPlatformId,
            questionId: question._id.toString()
          });
          // Don't fail question creation if proposal creation fails
        }
      }

      logger.info('Question added to platform', {
        businessId: validatedBusinessId,
        platformId: validatedPlatformId,
        questionId: question._id.toString(),
        questionType,
        hasProductVotingConfig: !!productVotingConfig?.enabled
      });

      return question;
    } catch (error: any) {
      logger.error('Failed to create question', {
        businessId: validatedBusinessId,
        platformId: validatedPlatformId,
        questionType,
        error: error.message,
        stack: error.stack
      });

      // If it's a validation error, provide more details
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors || {}).map((e: any) => e.message).join(', ');
        throw createAppError(
          `Question validation failed: ${validationErrors}`,
          400,
          'QUESTION_VALIDATION_ERROR'
        );
      }

      // Re-throw with more context
      throw createAppError(
        `Failed to create question: ${error.message}`,
        500,
        'QUESTION_CREATION_ERROR'
      );
    }
  }

  /**
   * Update a question
   */
  async updateQuestion(
    businessId: string,
    questionId: string,
    updates: UpdateQuestionInput
  ): Promise<any> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const question = await this.dataService.getQuestionById(questionId);

    // Verify ownership through platform
    const platform = await this.dataService.getPlatformById(
      question.platformId.toString(),
      validatedBusinessId
    );

    // Apply updates
    if (updates.questionText !== undefined) {
      if (updates.questionText.trim().length < 3) {
        throw createAppError('Question text must be at least 3 characters', 400, 'INVALID_QUESTION');
      }
      question.questionText = updates.questionText.trim();
    }

    if (updates.description !== undefined) {
      question.description = updates.description.trim();
    }

    if (updates.helpText !== undefined) {
      question.helpText = updates.helpText.trim();
    }

    if (updates.isRequired !== undefined) {
      question.isRequired = updates.isRequired;
    }

    if (updates.order !== undefined) {
      question.order = updates.order;
    }

    // Update type-specific config
    const configFields = [
      'textConfig',
      'textareaConfig',
      'multipleChoiceConfig',
      'imageSelectionConfig',
      'ratingConfig',
      'scaleConfig',
      'rankingConfig',
      'dateConfig',
      'fileUploadConfig'
    ];

    configFields.forEach(field => {
      if (updates[field as keyof UpdateQuestionInput] !== undefined) {
        (question as any)[field] = updates[field as keyof UpdateQuestionInput];
      }
    });

    // Update product voting config
    if (updates.productVotingConfig !== undefined) {
      (question as any).productVotingConfig = {
        ...updates.productVotingConfig,
        // Convert string product IDs to ObjectIds
        products: updates.productVotingConfig.products?.map(id => new Types.ObjectId(id)) || []
      };
    }

    if (updates.imageUrl !== undefined) {
      question.imageUrl = updates.imageUrl.trim();
    }

    if (updates.videoUrl !== undefined) {
      question.videoUrl = updates.videoUrl.trim();
    }

    await question.save();

    logger.info('Question updated', {
      businessId: validatedBusinessId,
      questionId: question._id.toString()
    });

    return question;
  }

  /**
   * Delete a question
   */
  async deleteQuestion(businessId: string, questionId: string): Promise<void> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);

    const question = await this.dataService.getQuestionById(questionId);

    // Verify ownership
    const platform = await this.dataService.getPlatformById(
      question.platformId.toString(),
      validatedBusinessId
    );

    // Don't allow deletion if platform is live and has responses
    if (platform.status === 'live') {
      const responseCount = await this.dataService.countPlatformResponses(
        question.platformId.toString()
      );
      if (responseCount > 0) {
        throw createAppError(
          'Cannot delete question from live platform with responses',
          400,
          'PLATFORM_HAS_RESPONSES'
        );
      }
    }

    await VotingQuestion.findByIdAndDelete(questionId);

    logger.info('Question deleted', {
      businessId: validatedBusinessId,
      questionId
    });
  }

  /**
   * Reorder questions
   */
  async reorderQuestions(
    businessId: string,
    platformId: string,
    questionIds: string[]
  ): Promise<void> {
    const validatedBusinessId = this.validation.ensureBusinessId(businessId);
    const validatedPlatformId = this.validation.ensurePlatformId(platformId);

    // Verify platform ownership
    await this.dataService.getPlatformById(validatedPlatformId, validatedBusinessId);

    await VotingQuestion.reorderQuestions(validatedPlatformId, questionIds);

    logger.info('Questions reordered', {
      businessId: validatedBusinessId,
      platformId: validatedPlatformId,
      count: questionIds.length
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Generate URL-friendly slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

export const votingPlatformManagementService = new VotingPlatformManagementService();
