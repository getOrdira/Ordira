// src/routes/features/domains/domainRegistry.routes.ts
// Domain registry routes using modular domain registry controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { domainRegistryController } from '../../../controllers/features/domains/domainRegistry.controller';

const objectIdSchema = Joi.string().hex().length(24);
const domainNameSchema = Joi.string().trim().lowercase().min(3).max(253);

const registerDomainBodySchema = Joi.object({
  domain: domainNameSchema.required(),
  certificateType: Joi.string().trim().max(64).optional(),
  forceHttps: Joi.boolean().optional(),
  autoRenewal: Joi.boolean().optional(),
  planLevel: Joi.string().trim().max(64).optional(),
  createdBy: Joi.string().trim().max(128).optional(),
  verificationMethod: Joi.string().trim().max(64).optional(),
  dnsRecords: Joi.array().items(Joi.object().unknown(true)).optional(),
  metadata: Joi.object().unknown(true).optional()
});

const domainIdParamsSchema = Joi.object({
  domainId: objectIdSchema.required()
});

const requestedByBodySchema = Joi.object({
  requestedBy: Joi.string().trim().max(128).optional()
});

const updateDomainBodySchema = Joi.object({
  domain: domainNameSchema.optional(),
  certificateType: Joi.string().trim().max(64).optional(),
  forceHttps: Joi.boolean().optional(),
  autoRenewal: Joi.boolean().optional(),
  planLevel: Joi.string().trim().max(64).optional(),
  verificationMethod: Joi.string().trim().max(64).optional(),
  dnsRecords: Joi.array().items(Joi.object().unknown(true)).optional(),
  metadata: Joi.object().unknown(true).optional()
})
  .min(1)
  .unknown(true);

const domainLookupQuerySchema = Joi.object({
  domain: domainNameSchema.required()
});

const countAllBodySchema = Joi.object().unknown(true);

const builder = createRouteBuilder(RouteConfigs.tenant);

builder.post(
  '/',
  createHandler(domainRegistryController, 'registerDomain'),
  {
    validateBody: registerDomainBodySchema
  }
);

builder.get(
  '/',
  createHandler(domainRegistryController, 'listDomains')
);

builder.get(
  '/count',
  createHandler(domainRegistryController, 'countDomains')
);

builder.post(
  '/count/all',
  createHandler(domainRegistryController, 'countAllDomains'),
  {
    validateBody: countAllBodySchema
  }
);

builder.get(
  '/lookup',
  createHandler(domainRegistryController, 'getDomainByName'),
  {
    validateQuery: domainLookupQuerySchema
  }
);

builder.get(
  '/:domainId/certificate',
  createHandler(domainRegistryController, 'getManagedCertificate'),
  {
    validateParams: domainIdParamsSchema
  }
);

builder.post(
  '/:domainId/certificate',
  createHandler(domainRegistryController, 'issueManagedCertificate'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: requestedByBodySchema
  }
);

builder.post(
  '/:domainId/certificate/renew',
  createHandler(domainRegistryController, 'renewManagedCertificate'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: requestedByBodySchema
  }
);

builder.post(
  '/:domainId/certificate/revoke',
  createHandler(domainRegistryController, 'revokeManagedCertificate'),
  {
    validateParams: domainIdParamsSchema
  }
);

builder.patch(
  '/:domainId',
  createHandler(domainRegistryController, 'updateDomainConfiguration'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: updateDomainBodySchema
  }
);

builder.get(
  '/:domainId',
  createHandler(domainRegistryController, 'getDomainById'),
  {
    validateParams: domainIdParamsSchema
  }
);

builder.delete(
  '/:domainId',
  createHandler(domainRegistryController, 'deleteDomain'),
  {
    validateParams: domainIdParamsSchema
  }
);

export default builder.getRouter();
