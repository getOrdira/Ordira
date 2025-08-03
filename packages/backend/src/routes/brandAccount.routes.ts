// src/routes/brandAccount.routes.ts
import { Router } from 'express';
import { validateBody } from '../middleware/validation.middleware';
import {
  updateBrandAccountSchema
} from '../validation/brandAccount.validation';
import * as ctrl from '../controllers/brandAccount.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get(
  '/profile',
  authenticate,
  ctrl.getBrandProfile
);

router.put(
  '/profile',
  authenticate,
  validateBody(updateBrandAccountSchema),
  ctrl.updateBrandProfile
);

export default router;
