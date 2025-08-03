// src/routes/manufacturerProfiles.routes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/manufacturerProfile.controller';
import { authenticateManufacturer } from '../middleware/manufacturerAuth.middleware';

const router = Router();

// List all manufacturer profiles (for brands to browse)
router.get('/', authenticateManufacturer, ctrl.listManufacturerProfiles);

// Get one manufacturer’s profile
router.get('/:id', authenticateManufacturer, ctrl.getManufacturerProfile);

export default router;
