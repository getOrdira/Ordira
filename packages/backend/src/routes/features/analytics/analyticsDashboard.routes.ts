// src/routes/features/analytics/analyticsDashboard.routes.ts
// Analytics dashboard routes using modular analytics dashboard controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { analyticsDashboardController } from '../../../controllers/features/analytics/analyticsDashboard.controller';

const dashboardQuerySchema = Joi.object({
  businessId: Joi.string().trim().min(3).max(64).optional(),
  manufacturerId: Joi.string().trim().min(3).max(64).optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  includeSystemHealth: Joi.boolean().optional(),
  useReadReplica: Joi.boolean().optional()
})
  .with('startDate', 'endDate')
  .with('endDate', 'startDate');

const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.get(
  '/',
  createHandler(analyticsDashboardController, 'getDashboardAnalytics'),
  {
    validateQuery: dashboardQuerySchema
  }
);

export default builder.getRouter();

