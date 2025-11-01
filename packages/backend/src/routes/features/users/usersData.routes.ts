// src/routes/features/users/usersData.routes.ts
// User data routes using modular user data controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { usersDataController } from '../../../controllers/features/users/usersData.controller';

const objectIdSchema = Joi.string().hex().length(24);

const userIdParamsSchema = Joi.object({
  userId: objectIdSchema.optional()
});

const userIdQuerySchema = Joi.object({
  userId: objectIdSchema.optional(),
  useCache: Joi.boolean().optional()
});

const emailQuerySchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  skipCache: Joi.boolean().optional()
});

const batchGetUsersBodySchema = Joi.object({
  userIds: Joi.array().items(objectIdSchema).min(1).max(100).required(),
  useCache: Joi.boolean().optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get user document
builder.get(
  '/:userId',
  createHandler(usersDataController, 'getUserDocument'),
  {
    validateParams: userIdParamsSchema,
    validateQuery: userIdQuerySchema
  }
);

// Get user profile by ID
builder.get(
  '/:userId/profile',
  createHandler(usersDataController, 'getUserProfileById'),
  {
    validateParams: userIdParamsSchema,
    validateQuery: userIdQuerySchema
  }
);

// Get user by email
builder.get(
  '/email/search',
  createHandler(usersDataController, 'getUserByEmail'),
  {
    validateQuery: emailQuerySchema
  }
);

// Batch get users
builder.post(
  '/batch',
  createHandler(usersDataController, 'batchGetUsers'),
  {
    validateBody: batchGetUsersBodySchema
  }
);

export default builder.getRouter();