// src/routes/features/users/usersAuth.routes.ts
// User auth routes using modular user auth controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { usersAuthController } from '../../../controllers/features/users/usersAuth.controller';

const registerUserBodySchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
  phoneNumber: Joi.string().trim().max(20).optional(),
  dateOfBirth: Joi.date().iso().optional(),
  preferences: Joi.object({
    emailNotifications: Joi.boolean().optional(),
    smsNotifications: Joi.boolean().optional(),
    marketingEmails: Joi.boolean().optional()
  }).optional()
});

const loginUserBodySchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required()
});

const verifyUserEmailBodySchema = Joi.object({
  userId: Joi.string().hex().length(24).optional(),
  verificationToken: Joi.string().trim().required()
});

const verifyUserEmailParamsSchema = Joi.object({
  userId: Joi.string().hex().length(24).optional(),
  token: Joi.string().trim().required()
});

const verifyUserEmailQuerySchema = Joi.object({
  token: Joi.string().trim().required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Register user
builder.post(
  '/register',
  createHandler(usersAuthController, 'registerUser'),
  {
    validateBody: registerUserBodySchema
  }
);

// Login user
builder.post(
  '/login',
  createHandler(usersAuthController, 'loginUser'),
  {
    validateBody: loginUserBodySchema
  }
);

// Verify user email
builder.post(
  '/verify-email',
  createHandler(usersAuthController, 'verifyUserEmail'),
  {
    validateBody: verifyUserEmailBodySchema
  }
);

// Verify user email with params
builder.post(
  '/:userId/verify-email/:token',
  createHandler(usersAuthController, 'verifyUserEmail'),
  {
    validateParams: verifyUserEmailParamsSchema
  }
);

// Verify user email with query
builder.post(
  '/verify-email',
  createHandler(usersAuthController, 'verifyUserEmail'),
  {
    validateQuery: verifyUserEmailQuerySchema
  }
);

export default builder.getRouter();