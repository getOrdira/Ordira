// src/routes/brandSettings.routes.ts
import { Router } from 'express';
import { validateBody } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import * as settingsCtrl from '../controllers/brandSettings.controller';
import {
  updateBrandSettingsSchema,
  certificateWalletSchema,
  quickBrandingSchema,
  domainConfigSchema
} from '../validation/brandSettings.validation';

const router = Router();

// Apply dynamic rate limiting to all brand settings routes
router.use(dynamicRateLimiter());

// Apply authentication to all routes
router.use(authenticate);

// GET /settings - Fetch all current brand settings
router.get(
  '/',
  settingsCtrl.getBrandSettings
);

// PUT /settings - Update general brand settings (with validation)
router.put(
  '/',
  validateBody(updateBrandSettingsSchema),
  settingsCtrl.updateBrandSettings
);

// PUT /settings/certificate-wallet - Update certificate wallet (strict rate limiting for security)
router.put(
  '/certificate-wallet',
  strictRateLimiter(), // Extra security for wallet updates
  validateBody(certificateWalletSchema),
  settingsCtrl.updateCertificateWallet
);

// PUT /settings/quick-branding - Quick branding updates (theme color, logo)
router.put(
  '/quick-branding',
  validateBody(quickBrandingSchema),
  settingsCtrl.updateQuickBranding
);

// PUT /settings/domain - Domain configuration updates (strict rate limiting)
router.put(
  '/domain',
  strictRateLimiter(), // Prevent domain abuse
  validateBody(domainConfigSchema),
  settingsCtrl.updateDomainConfig
);

export default router;
