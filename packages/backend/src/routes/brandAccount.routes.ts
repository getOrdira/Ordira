// src/routes/brandAccount.routes.ts
import { Router } from 'express';
import { validateBody } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { dynamicRateLimiter } from '../middleware/rateLimiter.middleware';
import * as ctrl from '../controllers/brandAccount.controller';
import { updateBrandAccountSchema } from '../validation/brandAccount.validation';

const router = Router();

// Apply dynamic rate limiting to all brand account routes
router.use(dynamicRateLimiter());

// Apply authentication to all routes
router.use(authenticate);

// Get brand profile
router.get(
  '/profile',
  ctrl.getBrandProfile
);

// Update brand profile (with validation)
router.put(
  '/profile',
  validateBody(updateBrandAccountSchema),
  ctrl.updateBrandProfile
);

export default router;
