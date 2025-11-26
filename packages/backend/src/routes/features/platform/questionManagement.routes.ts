// src/routes/features/platform/questionManagement.routes.ts
// Routes for voting platform question management

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { questionManagementController } from '../../../controllers/features/platform/questionManagement.controller';

const objectIdSchema = Joi.string().hex().length(24);

// ============================================
// VALIDATION SCHEMAS
// ============================================

// Product voting config schema (for blockchain product selection)
const productVotingConfigSchema = Joi.object({
  enabled: Joi.boolean().optional(),
  products: Joi.array().items(objectIdSchema).optional(),
  allowMultipleSelection: Joi.boolean().optional(),
  maxSelections: Joi.number().integer().min(1).max(50).optional(),
  minSelections: Joi.number().integer().min(1).optional(),
  showProductDetails: Joi.boolean().optional(),
  showProductImages: Joi.boolean().optional(),
  showProductPrices: Joi.boolean().optional(),
  sortOrder: Joi.string().valid('manual', 'popular', 'recent', 'price-asc', 'price-desc').optional(),
  displayStyle: Joi.string().valid('grid', 'list', 'carousel').optional()
});

const createQuestionBodySchema = Joi.object({
  questionText: Joi.string().trim().min(3).max(1000).required(),
  questionType: Joi.string().valid(
    'text', 'multiple_choice', 'image_selection', 'rating',
    'textarea', 'yes_no', 'scale', 'ranking', 'date', 'file_upload'
  ).required(),
  description: Joi.string().trim().max(500).optional(),
  helpText: Joi.string().trim().max(300).optional(),
  isRequired: Joi.boolean().optional(),
  order: Joi.number().integer().min(0).optional(),

  // Type-specific configs
  textConfig: Joi.object({
    placeholder: Joi.string().trim().max(100).optional(),
    minLength: Joi.number().integer().min(0).optional(),
    maxLength: Joi.number().integer().min(1).optional(),
    validationRegex: Joi.string().optional(),
    inputType: Joi.string().valid('text', 'email', 'url', 'number', 'tel').optional()
  }).optional(),

  textareaConfig: Joi.object({
    placeholder: Joi.string().trim().max(100).optional(),
    minLength: Joi.number().integer().min(0).optional(),
    maxLength: Joi.number().integer().min(1).max(10000).optional(),
    rows: Joi.number().integer().min(2).max(20).optional()
  }).optional(),

  multipleChoiceConfig: Joi.object({
    options: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      text: Joi.string().trim().max(200).required(),
      imageUrl: Joi.string().uri().optional(),
      order: Joi.number().integer().min(0).required()
    })).optional(),
    allowMultipleSelection: Joi.boolean().optional(),
    minSelections: Joi.number().integer().min(0).optional(),
    maxSelections: Joi.number().integer().min(1).optional(),
    randomizeOrder: Joi.boolean().optional(),
    showOtherOption: Joi.boolean().optional()
  }).optional(),

  imageSelectionConfig: Joi.object({
    images: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      imageUrl: Joi.string().uri().required(),
      caption: Joi.string().trim().max(100).optional(),
      order: Joi.number().integer().min(0).required()
    })).optional(),
    allowMultipleSelection: Joi.boolean().optional(),
    minSelections: Joi.number().integer().min(0).optional(),
    maxSelections: Joi.number().integer().min(1).optional(),
    imageSize: Joi.string().valid('small', 'medium', 'large').optional(),
    displayLayout: Joi.string().valid('grid', 'carousel', 'list').optional()
  }).optional(),

  ratingConfig: Joi.object({
    ratingType: Joi.string().valid('stars', 'numeric', 'emoji', 'hearts').optional(),
    minValue: Joi.number().integer().min(0).optional(),
    maxValue: Joi.number().integer().min(1).max(10).optional(),
    step: Joi.number().min(0.1).optional(),
    labels: Joi.object({
      min: Joi.string().trim().max(50).optional(),
      max: Joi.string().trim().max(50).optional()
    }).optional()
  }).optional(),

  scaleConfig: Joi.object({
    minValue: Joi.number().integer().min(0).optional(),
    maxValue: Joi.number().integer().min(1).optional(),
    step: Joi.number().min(0.1).optional(),
    minLabel: Joi.string().trim().max(50).optional(),
    maxLabel: Joi.string().trim().max(50).optional(),
    showValues: Joi.boolean().optional()
  }).optional(),

  rankingConfig: Joi.object({
    items: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      text: Joi.string().trim().max(200).required(),
      imageUrl: Joi.string().uri().optional()
    })).optional(),
    minRankings: Joi.number().integer().min(1).optional(),
    maxRankings: Joi.number().integer().min(1).optional()
  }).optional(),

  dateConfig: Joi.object({
    allowPastDates: Joi.boolean().optional(),
    allowFutureDates: Joi.boolean().optional(),
    minDate: Joi.alternatives().try(Joi.string().isoDate(), Joi.date()).optional(),
    maxDate: Joi.alternatives().try(Joi.string().isoDate(), Joi.date()).optional(),
    includeTime: Joi.boolean().optional()
  }).optional(),

  fileUploadConfig: Joi.object({
    allowedFileTypes: Joi.array().items(Joi.string()).optional(),
    maxFileSize: Joi.number().integer().min(1024).max(104857600).optional(),
    maxFiles: Joi.number().integer().min(1).max(10).optional()
  }).optional(),

  // Product voting config (for blockchain product selection)
  productVotingConfig: productVotingConfigSchema.optional(),

  imageUrl: Joi.string().uri().optional(),
  videoUrl: Joi.string().uri().optional()
});

const updateQuestionBodySchema = Joi.object({
  questionText: Joi.string().trim().min(3).max(1000).optional(),
  description: Joi.string().trim().max(500).optional().allow(''),
  helpText: Joi.string().trim().max(300).optional().allow(''),
  isRequired: Joi.boolean().optional(),
  order: Joi.number().integer().min(0).optional(),

  // Type-specific configs
  textConfig: Joi.object().optional(),
  textareaConfig: Joi.object().optional(),
  multipleChoiceConfig: Joi.object().optional(),
  imageSelectionConfig: Joi.object().optional(),
  ratingConfig: Joi.object().optional(),
  scaleConfig: Joi.object().optional(),
  rankingConfig: Joi.object().optional(),
  dateConfig: Joi.object().optional(),
  fileUploadConfig: Joi.object().optional(),

  // Product voting config (for blockchain product selection)
  productVotingConfig: productVotingConfigSchema.optional(),

  imageUrl: Joi.string().uri().optional().allow(''),
  videoUrl: Joi.string().uri().optional().allow('')
}).min(1);

const platformIdParamsSchema = Joi.object({
  platformId: objectIdSchema.required()
});

const questionIdParamsSchema = Joi.object({
  platformId: objectIdSchema.required(),
  questionId: objectIdSchema.required()
});

const reorderQuestionsBodySchema = Joi.object({
  questionIds: Joi.array().items(objectIdSchema).min(1).required()
});

// ============================================
// ROUTE BUILDER
// ============================================

// Use authenticated config for direct API access
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Add question to platform
builder.post(
  '/:platformId/questions',
  createHandler(questionManagementController, 'addQuestion'),
  {
    validateParams: platformIdParamsSchema,
    validateBody: createQuestionBodySchema
  }
);

// Update question
builder.put(
  '/:platformId/questions/:questionId',
  createHandler(questionManagementController, 'updateQuestion'),
  {
    validateParams: questionIdParamsSchema,
    validateBody: updateQuestionBodySchema
  }
);

// Delete question
builder.delete(
  '/:platformId/questions/:questionId',
  createHandler(questionManagementController, 'deleteQuestion'),
  {
    validateParams: questionIdParamsSchema
  }
);

// Reorder questions
builder.put(
  '/:platformId/questions/reorder',
  createHandler(questionManagementController, 'reorderQuestions'),
  {
    validateParams: platformIdParamsSchema,
    validateBody: reorderQuestionsBodySchema
  }
);

export default builder.getRouter();

