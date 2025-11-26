// src/services/platform/validation/votingPlatformValidation.service.ts
import { createAppError } from '../../../middleware/core/error.middleware';
import { Types } from 'mongoose';

/**
 * Validation service for voting platform operations
 */
export class VotingPlatformValidationService {
  /**
   * Ensure businessId is a valid ObjectId string
   */
  ensureBusinessId(businessId: string): string {
    if (!businessId || typeof businessId !== 'string') {
      throw createAppError('Business ID is required', 400, 'MISSING_BUSINESS_ID');
    }

    const trimmedId = businessId.trim();
    if (!Types.ObjectId.isValid(trimmedId)) {
      throw createAppError('Invalid business ID format', 400, 'INVALID_BUSINESS_ID');
    }

    return trimmedId;
  }

  /**
   * Ensure platformId is a valid ObjectId string
   */
  ensurePlatformId(platformId: string): string {
    if (!platformId || typeof platformId !== 'string') {
      throw createAppError('Platform ID is required', 400, 'MISSING_PLATFORM_ID');
    }

    const trimmedId = platformId.trim();
    if (!Types.ObjectId.isValid(trimmedId)) {
      throw createAppError('Invalid platform ID format', 400, 'INVALID_PLATFORM_ID');
    }

    return trimmedId;
  }

  /**
   * Ensure userId is a valid ObjectId string (optional)
   */
  ensureUserId(userId?: string): string | undefined {
    if (!userId) return undefined;

    const trimmedId = userId.trim();
    if (!Types.ObjectId.isValid(trimmedId)) {
      throw createAppError('Invalid user ID format', 400, 'INVALID_USER_ID');
    }

    return trimmedId;
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      throw createAppError('Email is required', 400, 'MISSING_EMAIL');
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

    if (!emailRegex.test(trimmedEmail)) {
      throw createAppError('Invalid email format', 400, 'INVALID_EMAIL');
    }

    return trimmedEmail;
  }

  /**
   * Validate slug format
   */
  validateSlug(slug: string): string {
    if (!slug || typeof slug !== 'string') {
      throw createAppError('Slug is required', 400, 'MISSING_SLUG');
    }

    const trimmedSlug = slug.trim().toLowerCase();
    const slugRegex = /^[a-z0-9-]+$/;

    if (!slugRegex.test(trimmedSlug)) {
      throw createAppError('Slug must contain only lowercase letters, numbers, and hyphens', 400, 'INVALID_SLUG');
    }

    if (trimmedSlug.length < 3 || trimmedSlug.length > 100) {
      throw createAppError('Slug must be between 3 and 100 characters', 400, 'INVALID_SLUG_LENGTH');
    }

    return trimmedSlug;
  }

  /**
   * Validate hex color format
   */
  validateHexColor(color: string): string {
    if (!color || typeof color !== 'string') {
      throw createAppError('Color is required', 400, 'MISSING_COLOR');
    }

    const trimmedColor = color.trim();
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    if (!hexRegex.test(trimmedColor)) {
      throw createAppError('Invalid hex color format. Use #RRGGBB or #RGB', 400, 'INVALID_COLOR');
    }

    return trimmedColor;
  }

  /**
   * Validate URL format
   */
  validateUrl(url: string, fieldName: string = 'URL'): string {
    if (!url || typeof url !== 'string') {
      throw createAppError(`${fieldName} is required`, 400, 'MISSING_URL');
    }

    const trimmedUrl = url.trim();
    const urlRegex = /^https?:\/\/.+/;

    if (!urlRegex.test(trimmedUrl)) {
      throw createAppError(`${fieldName} must be a valid HTTP/HTTPS URL`, 400, 'INVALID_URL');
    }

    return trimmedUrl;
  }

  /**
   * Validate question type
   */
  validateQuestionType(type: string): string {
    const validTypes = [
      'text',
      'multiple_choice',
      'image_selection',
      'rating',
      'textarea',
      'yes_no',
      'scale',
      'ranking',
      'date',
      'file_upload'
    ];

    if (!validTypes.includes(type)) {
      throw createAppError(
        `Invalid question type. Must be one of: ${validTypes.join(', ')}`,
        400,
        'INVALID_QUESTION_TYPE'
      );
    }

    return type;
  }

  /**
   * Validate template ID
   */
  validateTemplateId(templateId: string): string {
    const validTemplates = ['modern', 'minimal', 'classic', 'vibrant', 'professional'];

    if (!validTemplates.includes(templateId)) {
      throw createAppError(
        `Invalid template ID. Must be one of: ${validTemplates.join(', ')}`,
        400,
        'INVALID_TEMPLATE'
      );
    }

    return templateId;
  }

  /**
   * Validate pagination options
   */
  validatePaginationOptions(options: { limit?: number; offset?: number }) {
    const limit = options.limit !== undefined ? Math.min(Math.max(1, options.limit), 100) : 50;
    const offset = options.offset !== undefined ? Math.max(0, options.offset) : 0;

    return { limit, offset };
  }

  /**
   * Validate date range
   */
  validateDateRange(startTime?: Date, endTime?: Date): void {
    if (startTime && endTime) {
      if (startTime >= endTime) {
        throw createAppError('Start time must be before end time', 400, 'INVALID_DATE_RANGE');
      }

      if (startTime < new Date()) {
        throw createAppError('Start time cannot be in the past', 400, 'INVALID_START_TIME');
      }
    }
  }

  /**
   * Sanitize text input
   */
  sanitizeText(text: string, maxLength: number = 10000): string {
    if (!text) return '';

    // Remove potential XSS patterns
    const sanitized = text
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');

    return sanitized.substring(0, maxLength);
  }

  /**
   * Validate answer based on question type
   */
  validateAnswer(questionType: string, value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    switch (questionType) {
      case 'text':
      case 'textarea':
        return typeof value === 'string' && value.trim().length > 0;

      case 'multiple_choice':
      case 'image_selection':
        return Array.isArray(value) ? value.length > 0 : typeof value === 'string';

      case 'rating':
      case 'scale':
        return typeof value === 'number' && !isNaN(value);

      case 'yes_no':
        return typeof value === 'boolean' || ['yes', 'no'].includes(String(value).toLowerCase());

      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));

      case 'file_upload':
        return Array.isArray(value) && value.length > 0;

      case 'ranking':
        return Array.isArray(value) && value.length > 0;

      default:
        return false;
    }
  }

  /**
   * Validate response completeness
   */
  validateResponseCompleteness(answers: any[], requiredQuestionIds: string[]): {
    isComplete: boolean;
    missingQuestions: string[];
    completionPercentage: number;
  } {
    const answeredQuestionIds = new Set(
      answers.map(a => a.questionId.toString())
    );

    const missingQuestions = requiredQuestionIds.filter(
      id => !answeredQuestionIds.has(id)
    );

    const completionPercentage = requiredQuestionIds.length > 0
      ? Math.round((answeredQuestionIds.size / requiredQuestionIds.length) * 100)
      : 0;

    return {
      isComplete: missingQuestions.length === 0,
      missingQuestions,
      completionPercentage
    };
  }

  /**
   * Check for suspicious patterns in response
   */
  detectSuspiciousPatterns(response: {
    answers: any[];
    timeToComplete?: number;
    userContext?: any;
  }): {
    isSuspicious: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // Check for too fast completion (less than 10 seconds)
    if (response.timeToComplete && response.timeToComplete < 10) {
      reasons.push('Completed too quickly (< 10 seconds)');
    }

    // Check for duplicate answers
    if (response.answers.length > 3) {
      const uniqueValues = new Set(response.answers.map(a => JSON.stringify(a.value)));
      if (uniqueValues.size === 1) {
        reasons.push('All answers are identical');
      }
    }

    // Check for missing user context
    if (!response.userContext?.ipAddress) {
      reasons.push('Missing IP address');
    }

    if (!response.userContext?.userAgent) {
      reasons.push('Missing user agent');
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons
    };
  }

  /**
   * Validate disposable email
   */
  isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      'tempmail.com',
      'guerrillamail.com',
      'mailinator.com',
      '10minutemail.com',
      'throwaway.email',
      'temp-mail.org'
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    return disposableDomains.includes(domain);
  }

  // ============================================
  // BLOCKCHAIN CONFIGURATION VALIDATION
  // ============================================

  /**
   * Validate blockchain mode
   */
  validateBlockchainMode(mode: string): 'off-chain' | 'on-chain' {
    const validModes = ['off-chain', 'on-chain'];

    if (!validModes.includes(mode)) {
      throw createAppError(
        `Invalid blockchain mode. Must be one of: ${validModes.join(', ')}`,
        400,
        'INVALID_BLOCKCHAIN_MODE'
      );
    }

    return mode as 'off-chain' | 'on-chain';
  }

  /**
   * Validate batch threshold for blockchain voting
   */
  validateBatchThreshold(threshold: number): number {
    if (typeof threshold !== 'number' || isNaN(threshold)) {
      throw createAppError('Batch threshold must be a number', 400, 'INVALID_BATCH_THRESHOLD');
    }

    if (threshold < 1 || threshold > 10000) {
      throw createAppError('Batch threshold must be between 1 and 10000', 400, 'INVALID_BATCH_THRESHOLD');
    }

    return Math.floor(threshold);
  }

  /**
   * Validate proposal duration in seconds
   */
  validateProposalDuration(duration: number): number {
    if (typeof duration !== 'number' || isNaN(duration)) {
      throw createAppError('Proposal duration must be a number', 400, 'INVALID_PROPOSAL_DURATION');
    }

    // Minimum 1 hour, maximum 90 days
    const minDuration = 3600; // 1 hour
    const maxDuration = 7776000; // 90 days

    if (duration < minDuration || duration > maxDuration) {
      throw createAppError(
        `Proposal duration must be between ${minDuration} seconds (1 hour) and ${maxDuration} seconds (90 days)`,
        400,
        'INVALID_PROPOSAL_DURATION'
      );
    }

    return Math.floor(duration);
  }

  /**
   * Validate blockchain configuration object
   */
  validateBlockchainConfig(config: {
    enabled?: boolean;
    mode?: string;
    batchThreshold?: number;
  }): void {
    if (config.mode !== undefined) {
      this.validateBlockchainMode(config.mode);
    }

    if (config.batchThreshold !== undefined) {
      this.validateBatchThreshold(config.batchThreshold);
    }

    // If enabled and on-chain mode, warn if no proposal is linked
    if (config.enabled && config.mode === 'on-chain') {
      // This is informational - the proposal will be created automatically if needed
    }
  }

  // ============================================
  // PRODUCT VOTING CONFIG VALIDATION
  // ============================================

  /**
   * Validate product voting configuration
   */
  validateProductVotingConfig(config: {
    enabled?: boolean;
    products?: string[];
    allowMultipleSelection?: boolean;
    maxSelections?: number;
    minSelections?: number;
    showProductDetails?: boolean;
    showProductImages?: boolean;
    showProductPrices?: boolean;
    sortOrder?: string;
    displayStyle?: string;
  }): void {
    // If enabled, products array should not be empty
    if (config.enabled && (!config.products || config.products.length === 0)) {
      throw createAppError(
        'Products array is required when product voting is enabled',
        400,
        'MISSING_PRODUCTS'
      );
    }

    // Validate product IDs
    if (config.products) {
      for (const productId of config.products) {
        if (!Types.ObjectId.isValid(productId)) {
          throw createAppError(
            `Invalid product ID format: ${productId}`,
            400,
            'INVALID_PRODUCT_ID'
          );
        }
      }
    }

    // Validate selection limits
    if (config.minSelections !== undefined && config.maxSelections !== undefined) {
      if (config.minSelections > config.maxSelections) {
        throw createAppError(
          'Min selections cannot be greater than max selections',
          400,
          'INVALID_SELECTION_LIMITS'
        );
      }
    }

    if (config.minSelections !== undefined && config.minSelections < 1) {
      throw createAppError('Min selections must be at least 1', 400, 'INVALID_MIN_SELECTIONS');
    }

    if (config.maxSelections !== undefined && (config.maxSelections < 1 || config.maxSelections > 50)) {
      throw createAppError('Max selections must be between 1 and 50', 400, 'INVALID_MAX_SELECTIONS');
    }

    // Validate sort order
    if (config.sortOrder !== undefined) {
      const validSortOrders = ['manual', 'popular', 'recent', 'price-asc', 'price-desc'];
      if (!validSortOrders.includes(config.sortOrder)) {
        throw createAppError(
          `Invalid sort order. Must be one of: ${validSortOrders.join(', ')}`,
          400,
          'INVALID_SORT_ORDER'
        );
      }
    }

    // Validate display style
    if (config.displayStyle !== undefined) {
      const validDisplayStyles = ['grid', 'list', 'carousel'];
      if (!validDisplayStyles.includes(config.displayStyle)) {
        throw createAppError(
          `Invalid display style. Must be one of: ${validDisplayStyles.join(', ')}`,
          400,
          'INVALID_DISPLAY_STYLE'
        );
      }
    }
  }

  /**
   * Validate product IDs exist in the system
   * This is an async validation that checks if products exist
   */
  async validateProductsExist(productIds: string[]): Promise<boolean> {
    // This would typically check against the Product model
    // For now, we just validate the format
    for (const id of productIds) {
      if (!Types.ObjectId.isValid(id)) {
        throw createAppError(`Invalid product ID: ${id}`, 400, 'INVALID_PRODUCT_ID');
      }
    }
    return true;
  }
}

export const votingPlatformValidationService = new VotingPlatformValidationService();
