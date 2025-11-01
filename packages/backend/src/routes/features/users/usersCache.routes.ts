// src/routes/features/users/usersCache.routes.ts
// User cache routes using modular user cache controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { usersCacheController } from '../../../controllers/features/users/usersCache.controller';

const objectIdSchema = Joi.string().hex().length(24);

const invalidateUserCacheBodySchema = Joi.object({
  userId: objectIdSchema.optional()
});

const invalidateUserCacheParamsSchema = Joi.object({
  userId: objectIdSchema.optional()
});

const getCachedUserQuerySchema = Joi.object({
  userId: objectIdSchema.optional(),
  email: Joi.string().email().max(255).optional()
}).or('userId', 'email');

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Invalidate user caches
builder.post(
  '/invalidate',
  createHandler(usersCacheController, 'invalidateUserCaches'),
  {
    validateBody: invalidateUserCacheBodySchema
  }
);

// Invalidate user cache by ID
builder.post(
  '/invalidate/:userId',
  createHandler(usersCacheController, 'invalidateUserCaches'),
  {
    validateParams: invalidateUserCacheParamsSchema
  }
);

// Get cached user
builder.get(
  '/cached',
  createHandler(usersCacheController, 'getCachedUser'),
  {
    validateQuery: getCachedUserQuerySchema
  }
);

// Get cache configuration
builder.get(
  '/config',
  createHandler(usersCacheController, 'getCacheConfiguration')
);

export default builder.getRouter();