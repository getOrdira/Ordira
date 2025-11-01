// src/routes/features/domains/domainCertificateProvisioner.routes.ts
// Domain certificate provisioner routes using modular domain certificate provisioner controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { domainCertificateProvisionerController } from '../../../controllers/features/domains/domainCertificateProvisioner.controller';

const domainNameSchema = Joi.string().trim().lowercase().min(3).max(253);

const hostnameParamsSchema = Joi.object({
  hostname: domainNameSchema.required()
});

const hostnameQuerySchema = Joi.object({
  hostname: domainNameSchema.required()
});

const hostnameBodySchema = Joi.object({
  hostname: domainNameSchema.required(),
  useStaging: Joi.boolean().optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

builder.post(
  '/provision',
  createHandler(domainCertificateProvisionerController, 'provisionCertificate'),
  {
    validateBody: hostnameBodySchema
  }
);

builder.get(
  '/info',
  createHandler(domainCertificateProvisionerController, 'getCertificateInfo'),
  {
    validateQuery: hostnameQuerySchema
  }
);

builder.post(
  '/renew',
  createHandler(domainCertificateProvisionerController, 'renewCertificate'),
  {
    validateBody: hostnameBodySchema
  }
);

builder.post(
  '/revoke',
  createHandler(domainCertificateProvisionerController, 'revokeCertificate'),
  {
    validateBody: hostnameBodySchema
  }
);

builder.get(
  '/list',
  createHandler(domainCertificateProvisionerController, 'listCertificates')
);

export default builder.getRouter();

