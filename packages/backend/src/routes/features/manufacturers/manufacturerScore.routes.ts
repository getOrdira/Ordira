// src/routes/features/manufacturers/manufacturerScore.routes.ts
// Manufacturer score routes using modular manufacturer score controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { manufacturerScoreController } from '../../../controllers/features/manufacturers/manufacturerScore.controller';

const calculateInitialBodySchema = Joi.object({
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

const calculateProfileBodySchema = Joi.object({
  manufacturerData: Joi.object().unknown(true).required()
});

const calculateCompletenessBodySchema = Joi.object({
  manufacturerData: Joi.object().unknown(true).required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Calculate initial profile score
builder.post(
  '/calculate-initial',
  createHandler(manufacturerScoreController, 'calculateInitialProfileScore'),
  {
    validateBody: calculateInitialBodySchema
  }
);

// Calculate profile score
builder.post(
  '/calculate-profile',
  createHandler(manufacturerScoreController, 'calculateProfileScore'),
  {
    validateBody: calculateProfileBodySchema
  }
);

// Calculate profile completeness
builder.post(
  '/calculate-completeness',
  createHandler(manufacturerScoreController, 'calculateProfileCompleteness'),
  {
    validateBody: calculateCompletenessBodySchema
  }
);

export default builder.getRouter();