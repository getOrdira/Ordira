// src/lib/validation/schemas/features/users.ts
// Frontend validation schemas for user registration and related flows.

import Joi from 'joi';

import { commonSchemas } from '../commonSchemas';

const userRegistrationSchema = Joi.object({
  email: commonSchemas.email,
  firstName: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'any.required': 'First name must be at least 2 characters long'
  }),
  lastName: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'any.required': 'Last name must be at least 2 characters long'
  }),
  password: commonSchemas.password
});

/**
 * User feature specific Joi schemas mirroring backend validation behaviour.
 */
export const usersFeatureSchemas = {
  registration: userRegistrationSchema
} as const;
