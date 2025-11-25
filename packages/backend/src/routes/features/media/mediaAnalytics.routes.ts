// src/routes/features/media/mediaAnalytics.routes.ts
// Media analytics routes using modular media analytics controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { mediaAnalyticsController } from '../../../controllers/features/media/mediaAnalytics.controller';

const categoryStatsQuerySchema = Joi.object({
  category: Joi.string().valid('profile', 'product', 'banner', 'certificate', 'document').required()
});

const usageTrendsQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).optional()
});

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get comprehensive storage statistics
builder.get(
  '/analytics/storage',
  createHandler(mediaAnalyticsController, 'getStorageStatistics'),
  {}
);

// Get statistics by category
builder.get(
  '/analytics/category',
  createHandler(mediaAnalyticsController, 'getCategoryStatistics'),
  {
    validateQuery: categoryStatsQuerySchema
  }
);

// Get usage trends over time
builder.get(
  '/analytics/trends',
  createHandler(mediaAnalyticsController, 'getUsageTrends'),
  {
    validateQuery: usageTrendsQuerySchema
  }
);

export default builder.getRouter();

