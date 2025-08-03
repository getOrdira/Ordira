// src/routes/brandSettings.routes.ts

import { Router } from 'express';
import * as settingsCtrl from '../controllers/brandSettings.controller';
import { validateBody } from '../middleware/validation.middleware';
import {
  updateBrandSettingsSchema,
} from '../validation/brandSettings.validation';
import Joi from 'joi';

const brandSettingsRouter = Router();

// GET  /settings             → fetch all current settings
brandSettingsRouter.get(
  '/',
  settingsCtrl.getBrandSettings
);

// PUT  /settings             → update general settings
brandSettingsRouter.put(
  '/',
  validateBody(updateBrandSettingsSchema),
  settingsCtrl.updateBrandSettings
);

// PUT  /settings/certificate-wallet
//                          → update the default wallet to receive minted certificates
brandSettingsRouter.put(
  '/certificate-wallet',
  validateBody(
    Joi.object({
      certificateWallet: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required()
    })
  ),
  settingsCtrl.updateCertificateWallet
);

export default brandSettingsRouter;
