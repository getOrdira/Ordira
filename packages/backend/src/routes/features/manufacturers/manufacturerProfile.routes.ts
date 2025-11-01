// src/routes/features/manufacturers/manufacturerProfile.routes.ts
// Manufacturer profile routes using modular manufacturer profile controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { manufacturerProfileController } from '../../../controllers/features/manufacturers/manufacturerProfile.controller';

const objectIdSchema = Joi.string().hex().length(24);

const manufacturerIdParamsSchema = Joi.object({
  manufacturerId: objectIdSchema.required()
});

const searchProfilesQuerySchema = Joi.object({
  query: Joi.string().trim().max(500).optional(),
  industry: Joi.string().trim().max(100).optional(),
  services: Joi.array().items(Joi.string().trim().max(100)).optional(),
  minMoq: Joi.number().integer().min(0).optional(),
  maxMoq: Joi.number().integer().min(0).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
  sortBy: Joi.string().valid('name', 'industry', 'moq', 'profileCompleteness', 'plan').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

const profileContextQuerySchema = Joi.object({
  brandId: objectIdSchema.optional()
});

const industryParamsSchema = Joi.object({
  industry: Joi.string().trim().max(100).required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Search manufacturers
builder.get(
  '/search',
  createHandler(manufacturerProfileController, 'searchManufacturers'),
  {
    validateQuery: searchProfilesQuerySchema
  }
);

// Get manufacturer profile
builder.get(
  '/:manufacturerId/profile',
  createHandler(manufacturerProfileController, 'getManufacturerProfile'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Get profile context
builder.get(
  '/:manufacturerId/profile/context',
  createHandler(manufacturerProfileController, 'getProfileContext'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateQuery: profileContextQuerySchema
  }
);

// Get manufacturers by industry
builder.get(
  '/industry/:industry',
  createHandler(manufacturerProfileController, 'getManufacturersByIndustry'),
  {
    validateParams: industryParamsSchema
  }
);

// Get available industries
builder.get(
  '/industries/available',
  createHandler(manufacturerProfileController, 'getAvailableIndustries')
);

// Get available services
builder.get(
  '/services/available',
  createHandler(manufacturerProfileController, 'getAvailableServices')
);

// List manufacturer profiles
builder.get(
  '/profiles/list',
  createHandler(manufacturerProfileController, 'listManufacturerProfiles')
);

export default builder.getRouter();