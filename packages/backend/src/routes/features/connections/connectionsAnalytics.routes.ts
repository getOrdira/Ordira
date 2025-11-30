// src/routes/features/connections/connectionsAnalytics.routes.ts
// Connection analytics routes using modular connections analytics controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { connectionsAnalyticsController } from '../../../controllers/features/connections/connectionsAnalytics.controller';

const objectIdSchema = Joi.string().hex().length(24);

const sharedPairQuerySchema = Joi.object({
  brandId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional()
});

const sharedAnalyticsQuerySchema = sharedPairQuerySchema.keys({
  includeBrand: Joi.boolean().optional(),
  includeManufacturer: Joi.boolean().optional(),
  start: Joi.date().iso().optional(),
  end: Joi.date().iso().optional()
});

const manufacturerParamsSchema = Joi.object({
  manufacturerId: objectIdSchema.required()
});

const brandParamsSchema = Joi.object({
  brandId: objectIdSchema.required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.get(
  '/can-share',
  createHandler(connectionsAnalyticsController, 'canShareAnalytics'),
  {
    validateQuery: sharedPairQuerySchema
  }
);

builder.get(
  '/shared',
  createHandler(connectionsAnalyticsController, 'getSharedAnalytics'),
  {
    validateQuery: sharedAnalyticsQuerySchema
  }
);

builder.get(
  '/shared/kpis',
  createHandler(connectionsAnalyticsController, 'getSharedKpis'),
  {
    validateQuery: sharedPairQuerySchema
  }
);

builder.get(
  '/brand/:manufacturerId',
  createHandler(connectionsAnalyticsController, 'getBrandAnalytics'),
  {
    validateParams: manufacturerParamsSchema,
    validateQuery: sharedPairQuerySchema
  }
);

builder.get(
  '/manufacturer/:brandId',
  createHandler(connectionsAnalyticsController, 'getManufacturerAnalytics'),
  {
    validateParams: brandParamsSchema,
    validateQuery: sharedPairQuerySchema
  }
);

// Get shared proposals
builder.get(
  '/proposals',
  createHandler(connectionsAnalyticsController, 'getSharedProposals'),
  {
    validateQuery: Joi.object({
      brandId: objectIdSchema.optional(),
      manufacturerId: objectIdSchema.optional(),
      includeCompleted: Joi.boolean().optional(),
      includeDraft: Joi.boolean().optional(),
      limit: Joi.number().integer().min(1).max(100).optional()
    })
  }
);

// Get live proposal data
builder.get(
  '/proposals/:proposalId',
  createHandler(connectionsAnalyticsController, 'getLiveProposalData'),
  {
    validateParams: Joi.object({
      proposalId: Joi.string().required()
    }),
    validateQuery: Joi.object({
      brandId: objectIdSchema.optional(),
      manufacturerId: objectIdSchema.optional()
    })
  }
);

export default builder.getRouter();
