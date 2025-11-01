// src/routes/features/users/usersProfile.routes.ts
// User profile routes using modular user profile controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { usersProfileController } from '../../../controllers/features/users/usersProfile.controller';

const objectIdSchema = Joi.string().hex().length(24);

const userIdParamsSchema = Joi.object({
  userId: objectIdSchema.optional()
});

const userIdQuerySchema = Joi.object({
  userId: objectIdSchema.optional()
});

const updateUserProfileBodySchema = Joi.object({
  userId: objectIdSchema.optional(),
  firstName: Joi.string().trim().min(1).max(100).optional(),
  lastName: Joi.string().trim().min(1).max(100).optional(),
  phoneNumber: Joi.string().trim().max(20).optional(),
  dateOfBirth: Joi.date().iso().optional(),
  profilePictureUrl: Joi.string().uri().max(500).optional(),
  preferences: Joi.object({
    emailNotifications: Joi.boolean().optional(),
    smsNotifications: Joi.boolean().optional(),
    marketingEmails: Joi.boolean().optional()
  }).optional(),
  address: Joi.object({
    street: Joi.string().trim().max(200).optional(),
    city: Joi.string().trim().max(100).optional(),
    state: Joi.string().trim().max(100).optional(),
    zipCode: Joi.string().trim().max(20).optional(),
    country: Joi.string().trim().max(100).optional()
  }).optional()
}).min(1);

const deleteUserBodySchema = Joi.object({
  userId: objectIdSchema.optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Get current user profile
builder.get(
  '/me',
  createHandler(usersProfileController, 'getCurrentUserProfile')
);

// Get user profile
builder.get(
  '/:userId',
  createHandler(usersProfileController, 'getUserProfile'),
  {
    validateParams: userIdParamsSchema,
    validateQuery: userIdQuerySchema
  }
);

// Update user profile
builder.put(
  '/:userId',
  createHandler(usersProfileController, 'updateUserProfile'),
  {
    validateParams: userIdParamsSchema,
    validateBody: updateUserProfileBodySchema
  }
);

// Update current user profile
builder.put(
  '/me',
  createHandler(usersProfileController, 'updateUserProfile'),
  {
    validateBody: updateUserProfileBodySchema
  }
);

// Delete user
builder.delete(
  '/:userId',
  createHandler(usersProfileController, 'deleteUser'),
  {
    validateParams: userIdParamsSchema
  }
);

export default builder.getRouter();