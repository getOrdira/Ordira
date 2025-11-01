// src/routes/features/domains/domainAnalytics.routes.ts
// Domain analytics routes using modular domain analytics controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { domainAnalyticsController } from '../../../controllers/features/domains/domainAnalytics.controller';

const objectIdSchema = Joi.string().hex().length(24);
const domainNameSchema = Joi.string().trim().lowercase().min(3).max(253);

const analyticsQuerySchema = Joi.object({
  timeframe: Joi.string().valid('24h', '7d', '30d', '90d', '1y', 'all').optional(),
  useCache: Joi.boolean().optional(),
  includePerformance: Joi.boolean().optional(),
  includeErrors: Joi.boolean().optional(),
  includeTraffic: Joi.boolean().optional()
});

const domainIdParamsSchema = Joi.object({
  domainId: objectIdSchema.required()
});

const recordAccessBodySchema = Joi.object({
  domainName: domainNameSchema.required(),
  statusCode: Joi.number().integer().min(100).max(599).optional(),
  latencyMs: Joi.number().integer().min(0).optional(),
  visitorIdentifier: Joi.string().trim().max(128).optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

builder.get(
  '/:domainId',
  createHandler(domainAnalyticsController, 'getDomainAnalytics'),
  {
    validateParams: domainIdParamsSchema,
    validateQuery: analyticsQuerySchema
  }
);

builder.post(
  '/record-access',
  createHandler(domainAnalyticsController, 'recordDomainAccess'),
  {
    validateBody: recordAccessBodySchema
  }
);

builder.post(
  '/:domainId/reset',
  createHandler(domainAnalyticsController, 'resetDomainAnalytics'),
  {
    validateParams: domainIdParamsSchema
  }
);

export default builder.getRouter();

