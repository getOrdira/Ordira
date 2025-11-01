// src/routes/features/products/productsAnalytics.routes.ts
// Product analytics routes using modular product analytics controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { productsAnalyticsController } from '../../../controllers/features/products/productsAnalytics.controller';

const objectIdSchema = Joi.string().hex().length(24);

const analyticsQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  start: Joi.string().isoDate().optional(),
  end: Joi.string().isoDate().optional()
});

const ownerScopedQuerySchema = Joi.object({
  businessId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  days: Joi.number().integer().min(1).max(90).optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
  months: Joi.number().integer().min(1).max(24).optional()
});

const builder = createRouteBuilder(RouteConfigs.tenant);

// Get analytics summary
builder.get(
  '/summary',
  createHandler(productsAnalyticsController, 'getAnalyticsSummary'),
  {
    validateQuery: analyticsQuerySchema
  }
);

// Get category analytics
builder.get(
  '/categories',
  createHandler(productsAnalyticsController, 'getCategoryAnalytics'),
  {
    validateQuery: ownerScopedQuerySchema
  }
);

// Get engagement metrics
builder.get(
  '/engagement',
  createHandler(productsAnalyticsController, 'getEngagementMetrics'),
  {
    validateQuery: ownerScopedQuerySchema
  }
);

// Get trending products
builder.get(
  '/trending',
  createHandler(productsAnalyticsController, 'getTrendingProducts'),
  {
    validateQuery: ownerScopedQuerySchema
  }
);

// Get performance insights
builder.get(
  '/performance',
  createHandler(productsAnalyticsController, 'getPerformanceInsights'),
  {
    validateQuery: ownerScopedQuerySchema
  }
);

// Get monthly trends
builder.get(
  '/monthly-trends',
  createHandler(productsAnalyticsController, 'getMonthlyTrends'),
  {
    validateQuery: ownerScopedQuerySchema
  }
);

export default builder.getRouter();