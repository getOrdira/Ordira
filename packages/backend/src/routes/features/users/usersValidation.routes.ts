// src/routes/features/users/usersValidation.routes.ts
// User validation routes using modular user validation controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { usersValidationController } from '../../../controllers/features/users/usersValidation.controller';

const validateRegistrationBodySchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName: Joi.string().trim().min(1).max(100).required(),
  password: Joi.string().min(8).max(128).required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Validate registration
builder.post(
  '/registration',
  createHandler(usersValidationController, 'validateRegistration'),
  {
    validateBody: validateRegistrationBodySchema
  }
);

export default builder.getRouter();