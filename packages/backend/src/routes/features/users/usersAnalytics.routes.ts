// src/routes/features/users/usersAnalytics.routes.ts
// User analytics routes using modular user analytics controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { usersAnalyticsController } from '../../../controllers/features/users/usersAnalytics.controller';

const getUserAnalyticsQuerySchema = Joi.object({
  range: Joi.string().valid('7d', '30d', '90d', '180d', '365d', '1y', 'all').optional(),
  start: Joi.string().isoDate().optional(),
  end: Joi.string().isoDate().optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get user analytics
builder.get(
  '/',
  createHandler(usersAnalyticsController, 'getUserAnalytics'),
  {
    validateQuery: getUserAnalyticsQuerySchema
  }
);

export default builder.getRouter();