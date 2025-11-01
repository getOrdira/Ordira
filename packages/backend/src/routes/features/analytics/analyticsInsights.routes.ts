// src/routes/features/analytics/analyticsInsights.routes.ts
// Analytics insights routes using modular analytics insights controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { analyticsInsightsController } from '../../../controllers/features/analytics/analyticsInsights.controller';

const insightsQuerySchema = Joi.object({
  businessId: Joi.string().trim().min(3).max(64).optional(),
  manufacturerId: Joi.string().trim().min(3).max(64).optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(50).optional()
})
  .with('startDate', 'endDate')
  .with('endDate', 'startDate');

const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.get(
  '/',
  createHandler(analyticsInsightsController, 'generateDashboardInsights'),
  {
    validateQuery: insightsQuerySchema
  }
);

export default builder.getRouter();

