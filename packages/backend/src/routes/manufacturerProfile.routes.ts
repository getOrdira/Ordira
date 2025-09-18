
// src/routes/manufacturerProfile.routes.ts
import { Router } from 'express';
import Joi from 'joi';
import { validateParams, validateQuery, validateBody } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/unifiedAuth.middleware';
import { dynamicRateLimiter } from '../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import * as ctrl from '../controllers/manufacturerProfile.controller';
import {
  manufacturerProfileParamsSchema,
  listManufacturerProfilesQuerySchema,
  manufacturerSearchQuerySchema
} from '../validation/manufacturerProfile.validation';
import { asRouteHandler } from '../utils/routeHelpers'; 

const router = Router();

// Apply dynamic rate limiting to all manufacturer profile routes
router.use(dynamicRateLimiter());

// ===== PUBLIC MANUFACTURER DISCOVERY =====

// All routes require brand authentication to access manufacturer profiles
router.use(authenticate);

// List all public manufacturer profiles (for brands to browse)
router.get(
  '/',
  validateQuery(listManufacturerProfilesQuerySchema),
  trackManufacturerAction('browse_profiles'),
  asRouteHandler(ctrl.listManufacturerProfiles)
);

// Search manufacturers with advanced filtering
router.get(
  '/search',
  validateQuery(manufacturerSearchQuerySchema),
  trackManufacturerAction('search_profiles'),
  asRouteHandler(ctrl.listManufacturerProfiles) // Uses same controller method with search params
);

// Advanced search with POST for complex criteria
router.post(
  '/search',
  validateBody(Joi.object({
    query: Joi.string().trim().max(100).optional(),
    industries: Joi.array().items(Joi.string().trim().max(100)).max(10).optional(),
    services: Joi.array().items(Joi.string().trim().max(100)).max(20).optional(),
    moqRange: Joi.object({
      min: Joi.number().integer().min(1).optional(),
      max: Joi.number().integer().min(1).optional()
    }).optional(),
    location: Joi.object({
      country: Joi.string().trim().max(100).optional(),
      city: Joi.string().trim().max(100).optional(),
      radius: Joi.number().min(1).max(10000).optional()
    }).optional(),
    certifications: Joi.array().items(Joi.string().trim().max(100)).max(20).optional(),
    rating: Joi.object({
      min: Joi.number().min(1).max(5).optional()
    }).optional(),
    verified: Joi.boolean().optional(),
    sortBy: Joi.string().valid('name', 'industry', 'profileScore', 'connections', 'rating').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    saveSearch: Joi.boolean().default(false),
    searchName: Joi.string().trim().max(100).when('saveSearch', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  })),
  trackManufacturerAction('advanced_search'),
  asRouteHandler(ctrl.advancedManufacturerSearch)
);

// Get featured/recommended manufacturers
router.get(
  '/featured',
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    industry: Joi.string().trim().max(100).optional()
  })),
  trackManufacturerAction('view_featured'),
  asRouteHandler(ctrl.getFeaturedManufacturers)
);

// Get manufacturer statistics/analytics
router.get(
  '/stats',
  trackManufacturerAction('view_stats'),
  asRouteHandler(ctrl.getManufacturerStats)
);

// Compare multiple manufacturers
router.post(
  '/compare',
  validateBody(Joi.object({
    manufacturerIds: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .min(2)
      .max(5)
      .required()
      .messages({
        'array.min': 'At least 2 manufacturers required for comparison',
        'array.max': 'Maximum 5 manufacturers can be compared',
        'string.pattern.base': 'Each manufacturer ID must be a valid MongoDB ObjectId'
      })
  })),
  trackManufacturerAction('compare_manufacturers'),
  asRouteHandler(ctrl.compareManufacturers)
);

// ===== SPECIFIC MANUFACTURER PROFILE =====

// Get manufacturers by industry
router.get(
  '/industry/:industry',
  validateParams(Joi.object({
    industry: Joi.string().trim().min(1).max(100).required()
  })),
  validateQuery(listManufacturerProfilesQuerySchema),
  trackManufacturerAction('browse_by_industry'),
  asRouteHandler(ctrl.getManufacturersByIndustry)
);

// Get specific manufacturer's public profile
router.get(
  '/:id',
  validateParams(manufacturerProfileParamsSchema),
  trackManufacturerAction('view_profile_detail'),
  asRouteHandler(ctrl.getManufacturerProfile)
);

export default router;
