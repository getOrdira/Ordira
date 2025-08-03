// src/routes/brandProfiles.routes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/brandProfile.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// List all brand profiles (for manufacturers to browse)
router.get('/', authenticate, ctrl.listBrandProfiles);

// Get one brand’s profile
router.get('/:id', authenticate, ctrl.getBrandProfile);

export default router;
