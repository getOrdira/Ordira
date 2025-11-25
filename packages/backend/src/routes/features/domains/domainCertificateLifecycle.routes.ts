// src/routes/features/domains/domainCertificateLifecycle.routes.ts
// Domain certificate lifecycle routes using modular domain certificate lifecycle controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { domainCertificateLifecycleController } from '../../../controllers/features/domains/domainCertificateLifecycle.controller';

const objectIdSchema = Joi.string().hex().length(24);

const domainIdParamsSchema = Joi.object({
  domainId: objectIdSchema.required()
});

const issueCertificateBodySchema = Joi.object({
  requestedBy: Joi.string().trim().max(128).optional()
});

const renewCertificateBodySchema = Joi.object({
  requestedBy: Joi.string().trim().max(128).optional()
});

const scheduleAutoRenewalBodySchema = Joi.object({
  daysBeforeExpiry: Joi.number().integer().min(1).max(60).optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.post(
  '/:domainId/issue',
  createHandler(domainCertificateLifecycleController, 'issueManagedCertificate'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: issueCertificateBodySchema
  }
);

builder.post(
  '/:domainId/renew',
  createHandler(domainCertificateLifecycleController, 'renewManagedCertificate'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: renewCertificateBodySchema
  }
);

builder.post(
  '/:domainId/revoke',
  createHandler(domainCertificateLifecycleController, 'revokeManagedCertificate'),
  {
    validateParams: domainIdParamsSchema
  }
);

builder.post(
  '/:domainId/schedule-auto-renewal',
  createHandler(domainCertificateLifecycleController, 'scheduleAutoRenewal'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: scheduleAutoRenewalBodySchema
  }
);

builder.get(
  '/:domainId/summary',
  createHandler(domainCertificateLifecycleController, 'getCertificateSummary'),
  {
    validateParams: domainIdParamsSchema
  }
);

export default builder.getRouter();

