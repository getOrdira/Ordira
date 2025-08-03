// src/routes/manufacturerAccount.routes.ts
import { Router } from 'express';
import { validateBody } from '../middleware/validation.middleware';
import {
  updateManufacturerAccountSchema
} from '../validation/manufacturerAccount.validation';
import * as ctrl from '../controllers/manufacturerAccount.controller';
import { authenticateManufacturer } from '../middleware/manufacturerAuth.middleware';
import Joi from 'joi';

const router = Router();

router.use(authenticateManufacturer);

router.get(
  '/profile',
  authenticateManufacturer,
  ctrl.getManufacturerProfile
);

router.put(
  '/',
  validateBody(
    Joi.object({
      profilePictureUrl: Joi.string().uri().optional(),
      description:       Joi.string().optional(),
      servicesOffered:   Joi.array().items(Joi.string()).optional(),
      moq:               Joi.number().optional(),
      industry:          Joi.string().optional(),
      contactEmail:      Joi.string().email().optional(),
      socialUrls:        Joi.object().pattern(Joi.string(), Joi.string().uri()).optional()
    })
  ),
  ctrl.updateManufacturerProfile
);

export default router;
