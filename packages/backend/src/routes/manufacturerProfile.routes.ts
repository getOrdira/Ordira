// src/routes/manufacturerProfile.routes.ts
import { Router } from 'express';
import { validateParams, validateQuery } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authenticateManufacturer } from '../middleware/manufacturerAuth.middleware';
import { dynamicRateLimiter } from '../middleware/rateLimiter.middleware';
import * as ctrl from '../controllers/manufacturerProfile.controller';
import {
  manufacturerProfileParamsSchema,
  listManufacturerProfilesQuerySchema,
  manufacturerSearchQuerySchema
} from '../validation/manufacturerProfile.validation';

const router = Router();

// Apply dynamic rate limiting to all manufacturer profile routes
router.use(dynamicRateLimiter());

// ===== PUBLIC MANUFACTURER DISCOVERY =====

// List all public manufacturer profiles (for brands to browse)
// Requires brand authentication
router.get(
  '/',
  authenticate, // Brand authentication required
  validateQuery(listManufacturerProfilesQuerySchema),
  ctrl.listManufacturerProfiles
);

// Search manufacturers with advanced filtering
router.get(
  '/search',
  authenticate, // Brand authentication required
  validateQuery(manufacturerSearchQuerySchema),
  ctrl.searchManufacturers
);

// Get featured/recommended manufacturers
router.get(
  '/featured',
  authenticate, // Brand authentication required
  validateQuery(listManufacturerProfilesQuerySchema),
  ctrl.getFeaturedManufacturers
);

// Get manufacturers by industry
router.get(
  '/industry/:industry',
  authenticate, // Brand authentication required
  validateParams(manufacturerProfileParamsSchema.extract(['industry'])),
  validateQuery(listManufacturerProfilesQuerySchema),
  ctrl.getManufacturersByIndustry
);

// ===== SPECIFIC MANUFACTURER PROFILE =====

// Get specific manufacturer's public profile
router.get(
  '/:id',
  authenticate, // Brand authentication required
  validateParams(manufacturerProfileParamsSchema),
  ctrl.getManufacturerProfile
);

// Get manufacturer's capabilities
router.get(
  '/:id/capabilities',
  authenticate, // Brand authentication required
  validateParams(manufacturerProfileParamsSchema),
  ctrl.getManufacturerCapabilities
);

// Get manufacturer's portfolio/showcase
router.get(
  '/:id/portfolio',
  authenticate, // Brand authentication required
  validateParams(manufacturerProfileParamsSchema),
  ctrl.getManufacturerPortfolio
);

// Get manufacturer's reviews and ratings
router.get(
  '/:id/reviews',
  authenticate, // Brand authentication required
  validateParams(manufacturerProfileParamsSchema),
  validateQuery(listManufacturerProfilesQuerySchema),
  ctrl.getManufacturerReviews
);

// ===== MANUFACTURER SELF-VIEW =====

// Manufacturer viewing their own public profile
router.get(
  '/my/public-view',
  authenticateManufacturer, // Manufacturer authentication required
  ctrl.getMyPublicProfile
);

// Get profile visibility analytics
router.get(
  '/my/analytics',
  authenticateManufacturer, // Manufacturer authentication required
  validateQuery(listManufacturerProfilesQuerySchema),
  ctrl.getProfileAnalytics
);

export default router;