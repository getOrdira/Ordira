// src/routes/features/supplyChain/supplyChainDashboard.routes.ts
// Supply chain dashboard routes using modular supply chain dashboard controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { supplyChainDashboardController } from '../../../controllers/features/supplyChain/supplyChainDashboard.controller';

const dashboardQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  timeframe: Joi.string().valid('day', 'week', 'month', 'year').optional(),
  includeInactive: Joi.boolean().optional()
});

const dashboardBaseQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

const productSummariesQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const dashboardAnalyticsQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  timeframe: Joi.string().valid('day', 'week', 'month').optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get dashboard data
builder.get(
  '/',
  createHandler(supplyChainDashboardController, 'getDashboardData'),
  {
    validateQuery: dashboardQuerySchema
  }
);

// Get dashboard overview
builder.get(
  '/overview',
  createHandler(supplyChainDashboardController, 'getDashboardOverview'),
  {
    validateQuery: dashboardBaseQuerySchema
  }
);

// Get product summaries
builder.get(
  '/products',
  createHandler(supplyChainDashboardController, 'getProductSummaries'),
  {
    validateQuery: productSummariesQuerySchema
  }
);

// Get endpoint summaries
builder.get(
  '/endpoints',
  createHandler(supplyChainDashboardController, 'getEndpointSummaries'),
  {
    validateQuery: dashboardBaseQuerySchema
  }
);

// Get dashboard analytics
builder.get(
  '/analytics',
  createHandler(supplyChainDashboardController, 'getDashboardAnalytics'),
  {
    validateQuery: dashboardAnalyticsQuerySchema
  }
);

export default builder.getRouter();