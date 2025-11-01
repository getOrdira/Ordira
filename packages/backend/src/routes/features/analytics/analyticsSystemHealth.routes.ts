// src/routes/features/analytics/analyticsSystemHealth.routes.ts
// Analytics system health routes using modular analytics system health controller

import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { analyticsSystemHealthController } from '../../../controllers/features/analytics/analyticsSystemHealth.controller';

const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.get(
  '/',
  createHandler(analyticsSystemHealthController, 'getSystemHealthMetrics')
);

export default builder.getRouter();

