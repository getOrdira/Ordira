// src/routes/utils/rateLimiter.routes.ts
// Rate limiter administration routes using modular rate limiter controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../core/base.routes';
import { rateLimiterController } from '../../controllers/middleware/rateLimiter.controller';

const keyParamsSchema = Joi.object({
  key: Joi.string().trim().min(1).required()
});

const updateConfigBodySchema = Joi.object({
  windowSizeMs: Joi.number().integer().min(1000).optional(),
  maxRequests: Joi.number().integer().min(1).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get rate limiter stats
builder.get(
  '/stats',
  createHandler(rateLimiterController, 'getLimiterStats')
);

// Get limiter config by key
builder.get(
  '/config/:key',
  createHandler(rateLimiterController, 'getLimiterConfig'),
  {
    validateParams: keyParamsSchema
  }
);

// Update limiter config
builder.put(
  '/config/:key',
  createHandler(rateLimiterController, 'updateLimiterConfig'),
  {
    validateParams: keyParamsSchema,
    validateBody: updateConfigBodySchema
  }
);

export default builder.getRouter();
