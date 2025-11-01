// src/routes/features/domains/domainDns.routes.ts
// Domain DNS routes using modular domain DNS controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { domainDnsController } from '../../../controllers/features/domains/domainDns.controller';

const objectIdSchema = Joi.string().hex().length(24);
const domainNameSchema = Joi.string().trim().lowercase().min(3).max(253);

const domainIdParamsSchema = Joi.object({
  domainId: objectIdSchema.required()
});

const verifyDnsBodySchema = Joi.object({
  skipTxtValidation: Joi.boolean().optional(),
  tokenOverride: Joi.string().trim().max(128).optional()
});

const verifyDnsQuerySchema = Joi.object({
  skipTxtValidation: Joi.boolean().optional(),
  token: Joi.string().trim().max(128).optional()
});

const evaluateDnsQuerySchema = Joi.object({
  hostname: domainNameSchema.required(),
  token: Joi.string().trim().max(128).optional(),
  skipTxtValidation: Joi.boolean().optional()
});

const evaluateDnsBodySchema = Joi.object({
  hostname: domainNameSchema.required(),
  tokenOverride: Joi.string().trim().max(128).optional(),
  skipTxtValidation: Joi.boolean().optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

builder.get(
  '/:domainId/instructions',
  createHandler(domainDnsController, 'getInstructionSet'),
  {
    validateParams: domainIdParamsSchema
  }
);

builder.post(
  '/:domainId/verify',
  createHandler(domainDnsController, 'verifyDnsConfiguration'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: verifyDnsBodySchema,
    validateQuery: verifyDnsQuerySchema
  }
);

builder.post(
  '/evaluate',
  createHandler(domainDnsController, 'evaluateDomainRecords'),
  {
    validateQuery: evaluateDnsQuerySchema,
    validateBody: evaluateDnsBodySchema
  }
);

export default builder.getRouter();

