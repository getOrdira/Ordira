// src/routes/features/analytics/analyticsReportGeneration.routes.ts
// Analytics report generation routes using modular analytics report generation controller

import Joi from 'joi';
import { createRouteBuilder, createHandler } from '../../core/base.routes';
import { analyticsReportGenerationController } from '../../../controllers/features/analytics/analyticsReportGeneration.controller';

const businessIdSchema = Joi.string().trim().min(3).max(64);

const reportQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  includeRawData: Joi.boolean().optional(),
  useReplica: Joi.boolean().optional(),
  format: Joi.string().valid('payload', 'json', 'csv').optional(),
  reportType: Joi.string().trim().max(100).optional()
})
  .with('startDate', 'endDate')
  .with('endDate', 'startDate');

const reportBodySchema = Joi.object({
  reportType: Joi.string().trim().max(100).required(),
  format: Joi.string().valid('payload', 'json', 'csv').optional(),
  includeRawData: Joi.boolean().optional(),
  useReplica: Joi.boolean().optional()
});

const builder = createRouteBuilder({
  requireAuth: true,
  rateLimit: 'strict'
});

builder.post(
  '/business/:businessId',
  createHandler(analyticsReportGenerationController, 'generateReport'),
  {
    validateParams: Joi.object({
      businessId: businessIdSchema.required()
    }),
    validateQuery: reportQuerySchema,
    validateBody: reportBodySchema
  }
);

export default builder.getRouter();

