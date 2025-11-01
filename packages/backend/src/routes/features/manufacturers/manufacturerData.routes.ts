// src/routes/features/manufacturers/manufacturerData.routes.ts
// Manufacturer data routes using modular manufacturer data controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { manufacturerDataController } from '../../../controllers/features/manufacturers/manufacturerData.controller';

const objectIdSchema = Joi.string().hex().length(24);

const searchManufacturersQuerySchema = Joi.object({
  query: Joi.string().trim().max(500).optional(),
  industry: Joi.string().trim().max(100).optional(),
  services: Joi.array().items(Joi.string().trim().max(100)).optional(),
  minMoq: Joi.number().integer().min(0).optional(),
  maxMoq: Joi.number().integer().min(0).optional(),
  location: Joi.string().trim().max(200).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
  sortBy: Joi.string().trim().max(50).optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

const manufacturerIdParamsSchema = Joi.object({
  manufacturerId: objectIdSchema.required()
});

const updateManufacturerBodySchema = Joi.object({
  name: Joi.string().trim().max(200).optional(),
  description: Joi.string().trim().max(5000).optional(),
  industry: Joi.string().trim().max(100).optional(),
  contactEmail: Joi.string().email().max(255).optional(),
  servicesOffered: Joi.array().items(Joi.string().trim().max(100)).optional(),
  moq: Joi.number().integer().min(0).optional(),
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

const getManufacturersByIdsBodySchema = Joi.object({
  manufacturerIds: Joi.array().items(objectIdSchema).min(1).max(100).required()
});

const getManufacturerCountQuerySchema = Joi.object({
  criteria: Joi.string().optional()
});

const emailParamsSchema = Joi.object({
  email: Joi.string().email().max(255).required()
});

const industryParamsSchema = Joi.object({
  industry: Joi.string().trim().max(100).required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Search manufacturers
builder.get(
  '/search',
  createHandler(manufacturerDataController, 'searchManufacturers'),
  {
    validateQuery: searchManufacturersQuerySchema
  }
);

// Get manufacturer by ID
builder.get(
  '/:manufacturerId',
  createHandler(manufacturerDataController, 'getManufacturerById'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Get manufacturer by email
builder.get(
  '/email/:email',
  createHandler(manufacturerDataController, 'getManufacturerByEmail'),
  {
    validateParams: emailParamsSchema
  }
);

// Update manufacturer profile
builder.put(
  '/:manufacturerId',
  createHandler(manufacturerDataController, 'updateManufacturerProfile'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateBody: updateManufacturerBodySchema
  }
);

// Delete manufacturer
builder.delete(
  '/:manufacturerId',
  createHandler(manufacturerDataController, 'deleteManufacturer'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Get manufacturers by industry
builder.get(
  '/industry/:industry',
  createHandler(manufacturerDataController, 'getManufacturersByIndustry'),
  {
    validateParams: industryParamsSchema
  }
);

// Check if manufacturer exists
builder.get(
  '/:manufacturerId/exists',
  createHandler(manufacturerDataController, 'manufacturerExists'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Get basic manufacturer info
builder.get(
  '/:manufacturerId/basic-info',
  createHandler(manufacturerDataController, 'getManufacturerBasicInfo'),
  {
    validateParams: manufacturerIdParamsSchema
  }
);

// Bulk get manufacturers by IDs
builder.post(
  '/bulk-get',
  createHandler(manufacturerDataController, 'getManufacturersByIds'),
  {
    validateBody: getManufacturersByIdsBodySchema
  }
);

// Get manufacturer count
builder.get(
  '/count',
  createHandler(manufacturerDataController, 'getManufacturerCount'),
  {
    validateQuery: getManufacturerCountQuerySchema
  }
);

export default builder.getRouter();

