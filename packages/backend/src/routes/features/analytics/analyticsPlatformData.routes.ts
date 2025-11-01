// src/routes/features/analytics/analyticsPlatformData.routes.ts
// Analytics platform data routes using modular analytics platform data controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { analyticsPlatformDataController } from '../../../controllers/features/analytics/analyticsPlatformData.controller';

const businessIdSchema = Joi.string().trim().min(3).max(64);
const manufacturerIdSchema = Joi.string().trim().min(3).max(64);

const timeRangePairs = {
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
};

const businessAnalyticsQuerySchema = Joi.object({
  ...timeRangePairs,
  industry: Joi.string().trim().max(100).optional(),
  plan: Joi.string().trim().max(100).optional(),
  verified: Joi.boolean().optional(),
  useCache: Joi.boolean().optional()
})
  .with('startDate', 'endDate')
  .with('endDate', 'startDate');

const productAnalyticsQuerySchema = Joi.object({
  ...timeRangePairs,
  businessId: businessIdSchema.optional(),
  manufacturerId: manufacturerIdSchema.optional(),
  useCache: Joi.boolean().optional()
})
  .with('startDate', 'endDate')
  .with('endDate', 'startDate');

const manufacturerAnalyticsQuerySchema = Joi.object({
  ...timeRangePairs,
  useCache: Joi.boolean().optional()
})
  .with('startDate', 'endDate')
  .with('endDate', 'startDate');

const votingQuerySchema = Joi.object({
  ...timeRangePairs,
  groupBy: Joi.string().valid('day', 'week', 'month').optional(),
  useCache: Joi.boolean().optional()
})
  .with('startDate', 'endDate')
  .with('endDate', 'startDate');

const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.get(
  '/business',
  createHandler(analyticsPlatformDataController, 'getBusinessAnalytics'),
  {
    validateQuery: businessAnalyticsQuerySchema
  }
);

builder.get(
  '/products',
  createHandler(analyticsPlatformDataController, 'getProductAnalytics'),
  {
    validateQuery: productAnalyticsQuerySchema
  }
);

builder.get(
  '/manufacturers',
  createHandler(analyticsPlatformDataController, 'getManufacturerAnalytics'),
  {
    validateQuery: manufacturerAnalyticsQuerySchema
  }
);

builder.get(
  '/voting',
  createHandler(analyticsPlatformDataController, 'getPlatformVotingAnalytics'),
  {
    validateQuery: votingQuerySchema
  }
);

builder.get(
  '/business/:businessId/voting',
  createHandler(analyticsPlatformDataController, 'getBusinessVotingAnalytics'),
  {
    validateParams: Joi.object({
      businessId: businessIdSchema.required()
    }),
    validateQuery: votingQuerySchema
  }
);

export default builder.getRouter();

