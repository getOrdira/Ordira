// src/routes/features/domains/domainStorage.routes.ts
// Domain storage routes using modular domain storage controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { domainStorageController } from '../../../controllers/features/domains/domainStorage.controller';

const objectIdSchema = Joi.string().hex().length(24);
const domainNameSchema = Joi.string().trim().lowercase().min(3).max(253);

const createDomainBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
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

const listDomainsQuerySchema = Joi.object({
  domain: domainNameSchema.optional(),
  certificateType: Joi.string().trim().max(64).optional(),
  planLevel: Joi.string().trim().max(64).optional()
}).unknown(true);

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

const recordCertificateBodySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  domainId: objectIdSchema.optional(),
  certificateType: Joi.string().trim().max(64).optional(),
  issuer: Joi.string().trim().max(128).optional(),
  validFrom: Joi.date().iso().optional(),
  validTo: Joi.date().iso().optional(),
  serialNumber: Joi.string().trim().max(128).optional(),
  renewedBy: Joi.string().trim().max(128).optional(),
  sslStatus: Joi.string().trim().max(64).optional(),
  autoRenewal: Joi.boolean().optional()
});

const domainLookupQuerySchema = Joi.object({
  domain: domainNameSchema.required()
});

const countAllBodySchema = Joi.object().unknown(true);

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.post(
  '/',
  createHandler(domainStorageController, 'createDomainMapping'),
  {
    validateBody: createDomainBodySchema
  }
);

builder.get(
  '/',
  createHandler(domainStorageController, 'listDomains'),
  {
    validateQuery: listDomainsQuerySchema
  }
);

builder.get(
  '/count',
  createHandler(domainStorageController, 'countDomains')
);

builder.post(
  '/count/all',
  createHandler(domainStorageController, 'countAllDomains'),
  {
    validateBody: countAllBodySchema
  }
);

builder.get(
  '/lookup',
  createHandler(domainStorageController, 'getDomainByDomain'),
  {
    validateQuery: domainLookupQuerySchema
  }
);

builder.post(
  '/:domainId/certificate/record',
  createHandler(domainStorageController, 'recordManagedCertificate'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: recordCertificateBodySchema
  }
);

builder.post(
  '/:domainId/certificate/clear',
  createHandler(domainStorageController, 'clearManagedCertificate'),
  {
    validateParams: domainIdParamsSchema
  }
);

builder.get(
  '/:domainId',
  createHandler(domainStorageController, 'getDomainById'),
  {
    validateParams: domainIdParamsSchema
  }
);

builder.put(
  '/:domainId',
  createHandler(domainStorageController, 'updateDomainMapping'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: updateDomainBodySchema
  }
);

builder.delete(
  '/:domainId',
  createHandler(domainStorageController, 'deleteDomainMapping'),
  {
    validateParams: domainIdParamsSchema
  }
);

export default builder.getRouter();
