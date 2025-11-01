// src/routes/features/users/usersSearch.routes.ts
// User search routes using modular user search controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { usersSearchController } from '../../../controllers/features/users/usersSearch.controller';

const searchUsersQuerySchema = Joi.object({
  query: Joi.string().trim().max(500).optional(),
  isActive: Joi.alternatives().try(Joi.boolean(), Joi.string()).optional(),
  isEmailVerified: Joi.alternatives().try(Joi.boolean(), Joi.string()).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
  sortBy: Joi.string().trim().max(50).optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Search users
builder.get(
  '/',
  createHandler(usersSearchController, 'searchUsers'),
  {
    validateQuery: searchUsersQuerySchema
  }
);

export default builder.getRouter();