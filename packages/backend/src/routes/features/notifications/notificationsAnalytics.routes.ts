// src/routes/features/notifications/notificationsAnalytics.routes.ts
// Notification analytics routes using modular notification analytics controller

import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { notificationsAnalyticsController } from '../../../controllers/features/notifications/notificationsAnalytics.controller';

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get notification statistics
builder.get(
  '/stats',
  createHandler(notificationsAnalyticsController, 'getStats')
);

export default builder.getRouter();