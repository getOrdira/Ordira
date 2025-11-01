// src/routes/features/manufacturers/manufacturerHelpers.routes.ts
// Manufacturer helpers routes using modular manufacturer helpers controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { manufacturerHelpersController } from '../../../controllers/features/manufacturers/manufacturerHelpers.controller';

const objectIdSchema = Joi.string().hex().length(24);

const manufacturerIdParamsSchema = Joi.object({
  manufacturerId: objectIdSchema.required()
});

const validateRegistrationBodySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).max(128).required(),
  industry: Joi.string().trim().max(100).optional(),
  contactEmail: Joi.string().email().max(255).optional(),
  description: Joi.string().trim().max(2000).optional(),
  servicesOffered: Joi.array().items(Joi.string().trim().max(100)).optional(),
  moq: Joi.number().integer().min(1).optional(),
  headquarters: Joi.object({
    country: Joi.string().trim().max(100).optional(),
    city: Joi.string().trim().max(100).optional(),
    address: Joi.string().trim().max(500).optional()
  }).optional()
});

const validateUpdateBodySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  description: Joi.string().trim().max(2000).optional(),
  industry: Joi.string().trim().max(100).optional(),
  contactEmail: Joi.string().email().max(255).optional(),
  servicesOffered: Joi.array().items(Joi.string().trim().max(100)).optional(),
  moq: Joi.number().integer().min(1).optional(),
  headquarters: Joi.object({
    country: Joi.string().trim().max(100).optional(),
    city: Joi.string().trim().max(100).optional(),
    address: Joi.string().trim().max(500).optional()
  }).optional(),
  certifications: Joi.array().items(Joi.object({
    name: Joi.string().trim().max(200).required(),
    issuer: Joi.string().trim().max(200).required(),
    issueDate: Joi.date().required(),
    expiryDate: Joi.date().optional()
  })).optional()
}).min(1);

const analyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional()
});

const formatForPublicBodySchema = Joi.object({
  manufacturer: Joi.object().unknown(true).required()
});

const isProfileCompleteBodySchema = Joi.object({
  manufacturer: Joi.object().unknown(true).required()
});

const sanitizeParamsBodySchema = Joi.object({
  params: Joi.object().unknown(true).required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Validate registration data
builder.post(
  '/validate-registration',
  createHandler(manufacturerHelpersController, 'validateRegistrationData'),
  {
    validateBody: validateRegistrationBodySchema
  }
);

// Validate update data
builder.post(
  '/validate-update',
  createHandler(manufacturerHelpersController, 'validateUpdateData'),
  {
    validateBody: validateUpdateBodySchema
  }
);

// Generate manufacturer analytics
builder.get(
  '/:manufacturerId/analytics',
  createHandler(manufacturerHelpersController, 'generateManufacturerAnalytics'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateQuery: analyticsQuerySchema
  }
);

// Invalidate manufacturer caches
builder.post(
  '/:manufacturerId/invalidate-caches',
  createHandler(manufacturerHelpersController, 'invalidateManufacturerCaches'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Format manufacturer for public
builder.post(
  '/format-public',
  createHandler(manufacturerHelpersController, 'formatManufacturerForPublic'),
  {
    validateBody: formatForPublicBodySchema
  }
);

// Check if profile is complete
builder.post(
  '/is-profile-complete',
  createHandler(manufacturerHelpersController, 'isProfileComplete'),
  {
    validateBody: isProfileCompleteBodySchema
  }
);

// Sanitize search params
builder.post(
  '/sanitize-params',
  createHandler(manufacturerHelpersController, 'sanitizeSearchParams'),
  {
    validateBody: sanitizeParamsBodySchema
  }
);

export default builder.getRouter();