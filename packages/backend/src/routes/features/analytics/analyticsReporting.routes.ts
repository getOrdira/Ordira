
// src/routes/features/analytics/analyticsReporting.routes.ts
// Analytics reporting routes using modular analytics reporting controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { analyticsReportingController } from '../../../controllers/features/analytics/analyticsReporting.controller';

const businessIdSchema = Joi.string().trim().min(3).max(64);

const timeRangeQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
})
  .with('startDate', 'endDate')
  .with('endDate', 'startDate');

const reportingQuerySchema = timeRangeQuerySchema.keys({
  reportType: Joi.string().trim().max(100).required(),
  includeRawData: Joi.boolean().optional(),
  useReplica: Joi.boolean().optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.get(
  '/business/:businessId/dashboard',
  createHandler(analyticsReportingController, 'getDashboardAnalyticsWithReplica'),
  {
    validateParams: Joi.object({
      businessId: businessIdSchema.required()
    }),
    validateQuery: timeRangeQuerySchema
  }
);

builder.get(
  '/business/:businessId/report',
  createHandler(analyticsReportingController, 'getBusinessReportingData'),
  {
    validateParams: Joi.object({
      businessId: businessIdSchema.required()
    }),
    validateQuery: reportingQuerySchema
  }
);

export default builder.getRouter();
