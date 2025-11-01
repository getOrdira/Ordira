// src/routes/features/supplyChain/supplyChainAnalytics.routes.ts
// Supply chain analytics routes using modular supply chain analytics controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { supplyChainAnalyticsController } from '../../../controllers/features/supplyChain/supplyChainAnalytics.controller';

const analyticsQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  groupBy: Joi.string().valid('day', 'week', 'month', 'year').optional(),
  includeInactive: Joi.boolean().optional()
});

const eventAnalyticsQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional()
});

const analyticsBaseQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

const performanceMetricsQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional()
});

const trendAnalysisQuerySchema = Joi.object({
  businessId: Joi.string().trim().optional(),
  contractAddress: Joi.string().trim().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get analytics
builder.get(
  '/',
  createHandler(supplyChainAnalyticsController, 'getAnalytics'),
  {
    validateQuery: analyticsQuerySchema
  }
);

// Get event analytics
builder.get(
  '/events',
  createHandler(supplyChainAnalyticsController, 'getEventAnalytics'),
  {
    validateQuery: eventAnalyticsQuerySchema
  }
);

// Get product analytics
builder.get(
  '/products',
  createHandler(supplyChainAnalyticsController, 'getProductAnalytics'),
  {
    validateQuery: analyticsBaseQuerySchema
  }
);

// Get endpoint analytics
builder.get(
  '/endpoints',
  createHandler(supplyChainAnalyticsController, 'getEndpointAnalytics'),
  {
    validateQuery: analyticsBaseQuerySchema
  }
);

// Get performance metrics
builder.get(
  '/performance',
  createHandler(supplyChainAnalyticsController, 'getPerformanceMetrics'),
  {
    validateQuery: performanceMetricsQuerySchema
  }
);

// Get trend analysis
builder.get(
  '/trends',
  createHandler(supplyChainAnalyticsController, 'getTrendAnalysis'),
  {
    validateQuery: trendAnalysisQuerySchema
  }
);

export default builder.getRouter();