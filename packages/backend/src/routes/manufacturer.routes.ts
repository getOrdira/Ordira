// src/routes/manufacturer.routes.ts

import { Router } from 'express';
import * as mfgCtrl from '../controllers/manufacturer.controller';
import { authenticateManufacturer } from '../middleware/manufacturerAuth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// Public: register & login
router.post(
  '/register',
  validateBody(
    Joi.object({
      name:     Joi.string().required(),
      email:    Joi.string().email().required(),
      password: Joi.string().min(8).required()
    })
  ),
  mfgCtrl.register
);

router.post(
  '/login',
  validateBody(
    Joi.object({
      email:    Joi.string().email().required(),
      password: Joi.string().required()
    })
  ),
  mfgCtrl.login
);

// Protected: all endpoints below require valid manufacturer JWT
router.use(authenticateManufacturer);

router.get('/brands', mfgCtrl.listBrandsForManufacturer);

router.get(
  '/brands/:brandSettingsId/results',
  validateBody(
    Joi.object({
      brandSettingsId: Joi.string().hex().length(24).required()
    }).unknown(true) // allow other route params etc.
  ),
  mfgCtrl.getResultsForBrand
);

export default router;

