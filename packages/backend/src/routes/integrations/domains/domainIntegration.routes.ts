// src/routes/integrations/domains/domainIntegration.routes.ts
// Domain integration routes using modular domain integration controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { domainIntegrationController } from '../../../controllers/integrations/domains/domainIntegration.controller';

const objectIdSchema = Joi.string().hex().length(24);

const domainIdParamsSchema = Joi.object({
  businessId: objectIdSchema.optional(),
  domainId: Joi.string().trim().max(200).required()
});

const dnsEvaluationBodySchema = Joi.object({
  tokenOverride: Joi.string().trim().max(500).optional(),
  skipTxtValidation: Joi.boolean().optional()
});

const certificateAutoRenewalBodySchema = Joi.object({
  requestedBy: Joi.string().trim().max(200).optional(),
  daysBeforeExpiry: Joi.number().integer().min(1).max(60).optional()
});

const issueCertificateBodySchema = Joi.object({
  requestedBy: Joi.string().trim().max(200).optional(),
  daysBeforeExpiry: Joi.number().integer().min(1).max(60).optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

// Get DNS instruction set
builder.get(
  '/:domainId/instructions',
  createHandler(domainIntegrationController, 'getDnsInstructionSet'),
  {
    validateParams: domainIdParamsSchema
  }
);

// Evaluate DNS records
builder.post(
  '/:domainId/evaluate-dns',
  createHandler(domainIntegrationController, 'evaluateDnsRecords'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: dnsEvaluationBodySchema
  }
);

// Issue managed certificate
builder.post(
  '/:domainId/certificate/issue',
  createHandler(domainIntegrationController, 'issueManagedCertificate'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: issueCertificateBodySchema
  }
);

// Schedule certificate auto-renewal
builder.post(
  '/:domainId/certificate/auto-renew',
  createHandler(domainIntegrationController, 'scheduleCertificateAutoRenewal'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: certificateAutoRenewalBodySchema
  }
);

// Get certificate summary
builder.get(
  '/:domainId/certificate/summary',
  createHandler(domainIntegrationController, 'getCertificateSummary'),
  {
    validateParams: domainIdParamsSchema
  }
);

export default builder.getRouter();