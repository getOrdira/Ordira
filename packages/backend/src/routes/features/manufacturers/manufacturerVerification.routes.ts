// src/routes/features/manufacturers/manufacturerVerification.routes.ts
// Manufacturer verification routes using modular manufacturer verification controller

import Joi from 'joi';
import { RequestHandler } from 'express';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { manufacturerVerificationController } from '../../../controllers/features/manufacturers/manufacturerVerification.controller';
import { uploadMiddleware } from '../../../middleware/upload/upload.middleware';

const objectIdSchema = Joi.string().hex().length(24);

const manufacturerIdParamsSchema = Joi.object({
  manufacturerId: objectIdSchema.required()
});

const submitDocumentsBodySchema = Joi.object({
  metadata: Joi.object().unknown(true).optional()
});

const reviewSubmissionBodySchema = Joi.object({
  submissionId: objectIdSchema.required(),
  decision: Joi.string().valid('approve', 'reject').required(),
  reviewNotes: Joi.string().trim().max(2000).optional(),
  reviewerId: objectIdSchema.optional()
});

const verificationRequirementsQuerySchema = Joi.object({
  plan: Joi.string().trim().max(100).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get verification status
builder.get(
  '/:manufacturerId/status',
  createHandler(manufacturerVerificationController, 'getVerificationStatus'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Get detailed verification status
builder.get(
  '/:manufacturerId/detailed-status',
  createHandler(manufacturerVerificationController, 'getDetailedVerificationStatus'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Submit verification documents
builder.post(
  '/:manufacturerId/submit-documents',
  createHandler(manufacturerVerificationController, 'submitVerificationDocuments'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: submitDocumentsBodySchema,
    middleware: uploadMiddleware.certificate as unknown as RequestHandler[]
  }
);

// Review verification submission
builder.post(
  '/:manufacturerId/review',
  createHandler(manufacturerVerificationController, 'reviewVerificationSubmission'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: reviewSubmissionBodySchema
  }
);

// Get verification requirements
builder.get(
  '/requirements',
  createHandler(manufacturerVerificationController, 'getVerificationRequirements'),
  {
    validateQuery: verificationRequirementsQuerySchema
  }
);

// Check verification eligibility
builder.get(
  '/:manufacturerId/check-eligibility',
  createHandler(manufacturerVerificationController, 'checkVerificationEligibility'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

export default builder.getRouter();