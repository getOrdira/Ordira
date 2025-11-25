// src/routes/features/domains/domainHealth.routes.ts
// Domain health routes using modular domain health controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { domainHealthController } from '../../../controllers/features/domains/domainHealth.controller';

const objectIdSchema = Joi.string().hex().length(24);

const healthCheckQuerySchema = Joi.object({
  timeoutMs: Joi.number().integer().min(1000).max(60000).optional(),
  includeDns: Joi.boolean().optional(),
  includeHttp: Joi.boolean().optional(),
  includeSsl: Joi.boolean().optional()
});

const healthCheckBodySchema = Joi.object({
  timeoutMs: Joi.number().integer().min(1000).max(60000).optional(),
  includeDns: Joi.boolean().optional(),
  includeHttp: Joi.boolean().optional(),
  includeSsl: Joi.boolean().optional()
});

const domainIdParamsSchema = Joi.object({
  domainId: objectIdSchema.required()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.post(
  '/:domainId/check',
  createHandler(domainHealthController, 'runHealthCheck'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: healthCheckBodySchema,
    validateQuery: healthCheckQuerySchema
  }
);

builder.post(
  '/:domainId',
  createHandler(domainHealthController, 'runHealthCheck'),
  {
    validateParams: domainIdParamsSchema,
    validateBody: healthCheckBodySchema
  }
);

export default builder.getRouter();

