// src/routes/brandProfile.routes.ts
import { Router } from 'express';
import { validateParams } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { dynamicRateLimiter } from '../middleware/rateLimiter.middleware';
import * as ctrl from '../controllers/brandProfile.controller';
import { brandProfileParamsSchema } from '../validation/brandProfile.validation';

const router = Router();

// Apply dynamic rate limiting to all brand profile routes
router.use(dynamicRateLimiter());

// Apply authentication to all routes
router.use(authenticate);

// List all brand profiles (for manufacturers to browse)
router.get(
  '/',
  ctrl.listBrandProfiles
);

// Get specific brand profile by ID (with parameter validation)
router.get(
  '/:id',
  validateParams(brandProfileParamsSchema),
  ctrl.getBrandProfile
);

export default router;
