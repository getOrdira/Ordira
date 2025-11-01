// src/routes/utils/performance.routes.ts
// Performance monitoring routes using modular performance controller

import { createRouteBuilder, RouteConfigs, createHandler } from '../core/base.routes';
import { performanceController } from '../../controllers/middleware/performance.controller';

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get system health
builder.get(
  '/health',
  createHandler(performanceController, 'getSystemHealth')
);

// Get slow queries
builder.get(
  '/slow-queries',
  createHandler(performanceController, 'getSlowQueries')
);

// Get metrics snapshot
builder.get(
  '/metrics',
  createHandler(performanceController, 'getMetricsSnapshot')
);

// Optimize performance
builder.post(
  '/optimize',
  createHandler(performanceController, 'optimizePerformance')
);

export default builder.getRouter();
