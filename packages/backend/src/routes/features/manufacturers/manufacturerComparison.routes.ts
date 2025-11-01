// src/routes/features/manufacturers/manufacturerComparison.routes.ts
// Manufacturer comparison routes using modular manufacturer comparison controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { manufacturerComparisonController } from '../../../controllers/features/manufacturers/manufacturerComparison.controller';

const compareTwoBodySchema = Joi.object({
  manufacturer1: Joi.object().unknown(true).required(),
  manufacturer2: Joi.object().unknown(true).required()
});

const findSimilarBodySchema = Joi.object({
  sourceManufacturer: Joi.object().unknown(true).required(),
  candidates: Joi.array().items(Joi.object().unknown(true)).min(1).max(100).required(),
  threshold: Joi.number().integer().min(0).max(100).optional()
});

const matchCriteriaBodySchema = Joi.object({
  manufacturer: Joi.object().unknown(true).required(),
  criteria: Joi.object({
    industry: Joi.string().trim().max(100).optional(),
    services: Joi.array().items(Joi.string().trim().max(100)).optional(),
    moqRange: Joi.object({
      min: Joi.number().integer().min(0).optional(),
      max: Joi.number().integer().min(0).optional()
    }).optional(),
    location: Joi.string().trim().max(200).optional(),
    certifications: Joi.array().items(Joi.string().trim().max(200)).optional()
  }).optional()
});

const rankBodySchema = Joi.object({
  manufacturers: Joi.array().items(Joi.object().unknown(true)).min(1).max(100).required(),
  weights: Joi.object({
    profileScore: Joi.number().min(0).max(1).optional(),
    matchScore: Joi.number().min(0).max(1).optional(),
    certificationCount: Joi.number().min(0).max(1).optional(),
    servicesCount: Joi.number().min(0).max(1).optional()
  }).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Compare two manufacturers
builder.post(
  '/compare-two',
  createHandler(manufacturerComparisonController, 'compareManufacturers'),
  {
    validateBody: compareTwoBodySchema
  }
);

// Find similar manufacturers
builder.post(
  '/find-similar',
  createHandler(manufacturerComparisonController, 'findSimilarManufacturers'),
  {
    validateBody: findSimilarBodySchema
  }
);

// Match against criteria
builder.post(
  '/match-criteria',
  createHandler(manufacturerComparisonController, 'matchAgainstCriteria'),
  {
    validateBody: matchCriteriaBodySchema
  }
);

// Rank manufacturers
builder.post(
  '/rank',
  createHandler(manufacturerComparisonController, 'rankManufacturers'),
  {
    validateBody: rankBodySchema
  }
);

export default builder.getRouter();