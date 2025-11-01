// src/routes/features/domains/domainVerification.routes.ts
// Domain verification routes using modular domain verification controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { domainVerificationController } from '../../../controllers/features/domains/domainVerification.controller';

const objectIdSchema = Joi.string().hex().length(24);

const domainIdParamsSchema = Joi.object({
  domainId: objectIdSchema.required()
});

const initiateVerificationBodySchema = Joi.object({
  method: Joi.string().valid('dns', 'http', 'manual').optional(),
  requestedBy: Joi.string().trim().max(128).optional(),
  autoScheduleRecheck: Joi.boolean().optional()
});

const verifyDomainBodySchema = Joi.object({
  requestedBy: Joi.string().trim().max(128).optional()
});

const verifyDomainQuerySchema = Joi.object({
  requestedBy: Joi.string().trim().max(128).optional()
});

const markVerifiedBodySchema = Joi.object({
  verifiedBy: Joi.string().trim().max(128).optional()
});

const markVerifiedQuerySchema = Joi.object({
  verifiedBy: Joi.string().trim().max(128).optional()
});

const scheduleRecheckBodySchema = Joi.object({
  method: Joi.string().valid('dns', 'http', 'manual').optional()
});

const scheduleRecheckQuerySchema = Joi.object({
  method: Joi.string().valid('dns', 'http', 'manual').optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

builder.post(
  '/:domainId/initiate',
  createHandler(domainVerificationController, 'initiateVerification'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: initiateVerificationBodySchema
  }
);

builder.post(
  '/:domainId/verify',
  createHandler(domainVerificationController, 'verifyDomain'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: verifyDomainBodySchema,
    validateQuery: verifyDomainQuerySchema
  }
);

builder.post(
  '/:domainId/mark-verified',
  createHandler(domainVerificationController, 'markVerified'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: markVerifiedBodySchema,
    validateQuery: markVerifiedQuerySchema
  }
);

builder.get(
  '/:domainId/status',
  createHandler(domainVerificationController, 'getVerificationStatus'),
  {
    validateParams: domainIdParamsSchema
  }
);

builder.post(
  '/:domainId/schedule-recheck',
  createHandler(domainVerificationController, 'scheduleVerificationRecheck'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: scheduleRecheckBodySchema,
    validateQuery: scheduleRecheckQuerySchema
  }
);

export default builder.getRouter();

