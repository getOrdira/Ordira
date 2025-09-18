
// src/routes/brandProfile.routes.ts
import { Router } from 'express';
import { validateParams, validateQuery, validateBody } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/unifiedAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import * as ctrl from '../controllers/brandProfile.controller';
import { 
  brandProfileParamsSchema, 
  brandProfileQuerySchema 
} from '../validation/brandProfile.validation';
import Joi from 'joi';
import { asRouteHandler, asRateLimitHandler } from '../utils/routeHelpers';

const router = Router();

// Apply dynamic rate limiting to all brand profile routes
router.use(asRateLimitHandler(dynamicRateLimiter()));

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/brands
 * List all brand profiles (for manufacturers to browse)
 * Supports pagination, search, and basic filtering
 */
router.get(
  '/',
  validateQuery(brandProfileQuerySchema),
  asRouteHandler(ctrl.listBrandProfiles)
);

/**
 * GET /api/brands/featured
 * Get featured brand profiles, trending, newest, spotlight
 */
router.get(
  '/featured',
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  asRouteHandler(ctrl.getFeaturedBrands)
);

/**
 * GET /api/brands/search
 * Search brand profiles by name/business name
 */
router.get(
  '/search',
  validateQuery(Joi.object({
    search: Joi.string().required().trim().max(100)
  })),
  asRouteHandler(ctrl.searchBrandProfiles)
);

/**
 * GET /api/brands/search/suggestions
 * Get search suggestions for brand profiles
 */
router.get(
  '/search/suggestions',
  validateQuery(Joi.object({
    q: Joi.string().required().min(2).max(100)
  })),
  asRouteHandler(ctrl.getSearchSuggestions)
);

/**
 * GET /api/brands/analytics/public
 * Get public ecosystem analytics
 */
router.get(
  '/analytics/public',
  validateQuery(Joi.object({
    timeframe: Joi.string().valid('7d', '30d', '90d', '1y').default('30d')
  })),
  asRouteHandler(ctrl.getPublicBrandAnalytics)
);

/**
 * GET /api/brands/recommendations
 * Get personalized brand recommendations for manufacturers
 */
router.get(
  '/recommendations',
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    industry: Joi.string().optional(),
    location: Joi.string().optional()
  })),
  asRouteHandler(ctrl.getBrandRecommendations)
);

/**
 * POST /api/brands/recommendations/feedback
 * Provide feedback on brand recommendations
 */
router.post(
  '/recommendations/feedback',
  asRateLimitHandler(strictRateLimiter()),
  validateBody(Joi.object({
    brandId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    feedback: Joi.string().valid('positive', 'negative', 'neutral').required(),
    rating: Joi.number().min(1).max(5).optional(),
    reason: Joi.string().max(500).optional()
  })),
  asRouteHandler(ctrl.provideBrandRecommendationFeedback)
);

/**
 * GET /api/brands/subdomain/:subdomain
 * Get brand profile by subdomain
 */
router.get(
  '/subdomain/:subdomain',
  validateParams(Joi.object({
    subdomain: Joi.string().alphanum().min(3).max(63).required()
  })),
  asRouteHandler(ctrl.getBrandBySubdomain)
);

/**
 * GET /api/brands/domain/:domain
 * Get brand profile by custom domain
 */
router.get(
  '/domain/:domain',
  validateParams(Joi.object({
    domain: Joi.string().domain().required()
  })),
  asRouteHandler(ctrl.getBrandByCustomDomain)
);

/**
 * GET /api/brands/:id
 * Get detailed brand profile by ID (with parameter validation)
 * Includes analytics, related brands, and tracks profile view
 */
router.get(
  '/:id',
  validateParams(brandProfileParamsSchema),
  asRouteHandler(ctrl.getBrandProfile)
);

/**
 * GET /api/brands/:brandId/manufacturer-view
 * Get brand profile from manufacturer perspective
 * Includes compatibility score and connection opportunities
 */
router.get(
  '/:brandId/manufacturer-view',
  validateParams(Joi.object({
    brandId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  })),
  asRouteHandler(ctrl.getBrandProfileForManufacturer)
);

/**
 * POST /api/brands/:id/report
 * Report a brand profile for review
 */
router.post(
  '/:id/report',
  asRateLimitHandler(strictRateLimiter()),
  validateParams(brandProfileParamsSchema),
  validateBody(Joi.object({
    reason: Joi.string().valid(
      'inappropriate_content',
      'fake_business',
      'spam',
      'copyright_violation',
      'harassment',
      'other'
    ).required(),
    description: Joi.string().max(1000).required(),
    evidence: Joi.array().items(Joi.string().uri()).optional()
  })),
  asRouteHandler(ctrl.reportBrand)
);

export default router;
