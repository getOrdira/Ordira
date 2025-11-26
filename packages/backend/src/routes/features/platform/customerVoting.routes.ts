// src/routes/features/platform/customerVoting.routes.ts
// Routes for customer voting operations (public-facing)

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { customerVotingController } from '../../../controllers/features/platform/customerVoting.controller';

const objectIdSchema = Joi.string().hex().length(24);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const startResponseBodySchema = Joi.object({
  platformId: objectIdSchema.required(),
  email: Joi.string().email().optional(),
  sessionId: Joi.string().trim().max(100).optional(),
  
  // User context
  ipAddress: Joi.string().trim().max(50).optional(),
  userAgent: Joi.string().trim().max(500).optional(),
  deviceType: Joi.string().valid('desktop', 'mobile', 'tablet').optional(),
  browser: Joi.string().trim().max(100).optional(),
  operatingSystem: Joi.string().trim().max(100).optional(),
  screenResolution: Joi.string().trim().max(50).optional(),
  language: Joi.string().trim().max(20).optional(),
  timezone: Joi.string().trim().max(100).optional(),
  
  // Referral tracking
  referralSource: Joi.string().trim().max(100).optional(),
  referralMedium: Joi.string().trim().max(100).optional(),
  referralCampaign: Joi.string().trim().max(100).optional(),
  referrerUrl: Joi.string().uri().max(500).optional(),
  utmParams: Joi.object().optional()
});

const submitAnswerBodySchema = Joi.object({
  responseId: objectIdSchema.required(),
  questionId: objectIdSchema.required(),
  value: Joi.any().required(),
  timeToAnswer: Joi.number().integer().min(0).optional()
});

const completeResponseBodySchema = Joi.object({
  responseId: objectIdSchema.required()
});

const platformIdOrSlugParamsSchema = Joi.object({
  platformIdOrSlug: Joi.string().trim().min(3).max(100).required()
});

const responseIdParamsSchema = Joi.object({
  responseId: objectIdSchema.required()
});

// ============================================
// ROUTE BUILDER
// ============================================

// Use public config - no authentication required for customer voting
const builder = createRouteBuilder({ requireAuth: false, rateLimit: 'dynamic' });

// Get platform for customer view
builder.get(
  '/:platformIdOrSlug',
  createHandler(customerVotingController, 'getPlatformForCustomer'),
  {
    validateParams: platformIdOrSlugParamsSchema
  }
);

// Start a response session
builder.post(
  '/response/start',
  createHandler(customerVotingController, 'startResponse'),
  {
    validateBody: startResponseBodySchema
  }
);

// Submit an answer
builder.post(
  '/response/answer',
  createHandler(customerVotingController, 'submitAnswer'),
  {
    validateBody: submitAnswerBodySchema
  }
);

// Complete a response
builder.post(
  '/response/complete',
  createHandler(customerVotingController, 'completeResponse'),
  {
    validateBody: completeResponseBodySchema
  }
);

// Abandon a response
builder.post(
  '/response/:responseId/abandon',
  createHandler(customerVotingController, 'abandonResponse'),
  {
    validateParams: responseIdParamsSchema
  }
);

export default builder.getRouter();

