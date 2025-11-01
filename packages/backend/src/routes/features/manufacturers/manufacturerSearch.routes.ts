// src/routes/features/manufacturers/manufacturerSearch.routes.ts
// Manufacturer search routes using modular manufacturer search controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { manufacturerSearchController } from '../../../controllers/features/manufacturers/manufacturerSearch.controller';

const objectIdSchema = Joi.string().hex().length(24);

const manufacturerIdParamsSchema = Joi.object({
  manufacturerId: objectIdSchema.required()
});

const advancedSearchBodySchema = Joi.object({
  name: Joi.string().trim().max(200).optional(),
  industry: Joi.string().trim().max(100).optional(),
  location: Joi.string().trim().max(200).optional(),
  verificationStatus: Joi.string().valid('verified', 'pending', 'unverified').optional(),
  size: Joi.string().valid('small', 'medium', 'large', 'enterprise').optional(),
  establishedYear: Joi.object({
    min: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional(),
    max: Joi.number().integer().min(1800).max(new Date().getFullYear()).optional()
  }).optional(),
  certifications: Joi.array().items(Joi.string().trim().max(200)).optional(),
  productCategories: Joi.array().items(Joi.string().trim().max(100)).optional(),
  sustainabilityRating: Joi.object({
    min: Joi.number().min(0).max(100).optional(),
    max: Joi.number().min(0).max(100).optional()
  }).optional(),
  revenueRange: Joi.object({
    min: Joi.number().min(0).optional(),
    max: Joi.number().min(0).optional()
  }).optional(),
  employeeCount: Joi.object({
    min: Joi.number().integer().min(1).optional(),
    max: Joi.number().integer().min(1).optional()
  }).optional(),
  supplyChainCompliance: Joi.boolean().optional(),
  hasBlockchainIntegration: Joi.boolean().optional(),
  geolocation: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(0).max(10000).required()
  }).optional()
});

const advancedSearchQuerySchema = Joi.object({
  sortBy: Joi.string().valid('relevance', 'name', 'establishedYear', 'verificationStatus', 'sustainabilityRating', 'distance').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  includeInactive: Joi.boolean().optional(),
  fuzzySearch: Joi.boolean().optional(),
  highlightMatches: Joi.boolean().optional()
});

const compareManufacturersBodySchema = Joi.object({
  manufacturerIds: Joi.array().items(objectIdSchema).min(2).max(10).required(),
  criteria: Joi.object({
    financialMetrics: Joi.boolean().optional(),
    sustainabilityScores: Joi.boolean().optional(),
    productPortfolio: Joi.boolean().optional(),
    certifications: Joi.boolean().optional(),
    supplyChainMetrics: Joi.boolean().optional(),
    customerSatisfaction: Joi.boolean().optional(),
    innovationIndex: Joi.boolean().optional()
  }).optional()
});

const trendAnalysisQuerySchema = Joi.object({
  metric: Joi.string().trim().max(100).required(),
  timeframe: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').required()
});

const industryBenchmarksQuerySchema = Joi.object({
  industry: Joi.string().trim().max(100).required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Advanced search
builder.post(
  '/advanced',
  createHandler(manufacturerSearchController, 'advancedSearch'),
  {
    validateBody: advancedSearchBodySchema,
    validateQuery: advancedSearchQuerySchema
  }
);

// Compare manufacturers
builder.post(
  '/compare',
  createHandler(manufacturerSearchController, 'compareManufacturers'),
  {
    validateBody: compareManufacturersBodySchema
  }
);

// Get trend analysis
builder.get(
  '/:manufacturerId/trend-analysis',
  createHandler(manufacturerSearchController, 'getTrendAnalysis'),
  {
    validateParams: manufacturerIdParamsSchema,
    validateQuery: trendAnalysisQuerySchema
  }
);

// Get industry benchmarks
builder.get(
  '/industry-benchmarks',
  createHandler(manufacturerSearchController, 'getIndustryBenchmarks'),
  {
    validateQuery: industryBenchmarksQuerySchema
  }
);

export default builder.getRouter();