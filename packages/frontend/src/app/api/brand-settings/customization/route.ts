// src/routes/brandSettings/customizations.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as customizationsCtrl from '../../controllers/brandSettings/customizations.controller';
import {
  customizationsUpdateSchema,
  themeConfigSchema,
  uploadAssetSchema,
  customCssSchema,
  templateCustomizationSchema
} from '../../validation/brandSettings/customizations.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);

/**
 * GET /api/brand-settings/customizations
 * Get all customization settings for the brand
 */
router.get(
  '/',
  customizationsCtrl.getCustomizations
);

/**
 * GET /api/brand-settings/customizations/theme
 * Get current theme configuration
 */
router.get(
  '/theme',
  customizationsCtrl.getThemeConfig
);

/**
 * PUT /api/brand-settings/customizations/theme
 * Update theme configuration (colors, fonts, layouts)
 */
router.put(
  '/theme',
  validateBody(themeConfigSchema),
  customizationsCtrl.updateThemeConfig
);

/**
 * GET /api/brand-settings/customizations/assets
 * List all uploaded brand assets (logos, banners, etc.)
 */
router.get(
  '/assets',
  validateQuery(uploadAssetSchema.query),
  customizationsCtrl.listAssets
);

/**
 * POST /api/brand-settings/customizations/assets
 * Upload new brand assets
 */
router.post(
  '/assets',
  strictRateLimiter(), // Prevent asset upload abuse
  validateBody(uploadAssetSchema.upload),
  customizationsCtrl.uploadAsset
);

/**
 * DELETE /api/brand-settings/customizations/assets/:assetId
 * Remove a brand asset
 */
router.delete(
  '/assets/:assetId',
  validateParams(uploadAssetSchema.params),
  customizationsCtrl.removeAsset
);

/**
 * GET /api/brand-settings/customizations/css
 * Get current custom CSS
 */
router.get(
  '/css',
  requireTenantPlan(['premium', 'enterprise']), // Custom CSS requires premium+
  customizationsCtrl.getCustomCss
);

/**
 * PUT /api/brand-settings/customizations/css
 * Update custom CSS (premium+ feature)
 */
router.put(
  '/css',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(customCssSchema),
  customizationsCtrl.updateCustomCss
);

/**
 * POST /api/brand-settings/customizations/css/validate
 * Validate custom CSS before applying
 */
router.post(
  '/css/validate',
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(customCssSchema),
  customizationsCtrl.validateCustomCss
);

/**
 * GET /api/brand-settings/customizations/templates
 * Get available email/notification templates
 */
router.get(
  '/templates',
  customizationsCtrl.getTemplates
);

/**
 * GET /api/brand-settings/customizations/templates/:templateId
 * Get specific template configuration
 */
router.get(
  '/templates/:templateId',
  validateParams(templateCustomizationSchema.params),
  customizationsCtrl.getTemplate
);

/**
 * PUT /api/brand-settings/customizations/templates/:templateId
 * Update template customization
 */
router.put(
  '/templates/:templateId',
  validateParams(templateCustomizationSchema.params),
  validateBody(templateCustomizationSchema.update),
  customizationsCtrl.updateTemplate
);

/**
 * POST /api/brand-settings/customizations/templates/:templateId/preview
 * Preview template with current data
 */
router.post(
  '/templates/:templateId/preview',
  validateParams(templateCustomizationSchema.params),
  validateBody(templateCustomizationSchema.preview),
  customizationsCtrl.previewTemplate
);

/**
 * POST /api/brand-settings/customizations/templates/:templateId/test
 * Send test email/notification with template
 */
router.post(
  '/templates/:templateId/test',
  strictRateLimiter(), // Prevent email spam
  validateParams(templateCustomizationSchema.params),
  validateBody(templateCustomizationSchema.test),
  customizationsCtrl.testTemplate
);

/**
 * POST /api/brand-settings/customizations/reset
 * Reset customizations to default (with confirmation)
 */
router.post(
  '/reset',
  strictRateLimiter(),
  validateBody(customizationsUpdateSchema.reset),
  customizationsCtrl.resetCustomizations
);

/**
 * GET /api/brand-settings/customizations/export
 * Export customization settings
 */
router.get(
  '/export',
  validateQuery(customizationsUpdateSchema.export),
  customizationsCtrl.exportCustomizations
);

/**
 * POST /api/brand-settings/customizations/import
 * Import customization settings
 */
router.post(
  '/import',
  strictRateLimiter(),
  validateBody(customizationsUpdateSchema.import),
  customizationsCtrl.importCustomizations
);

export default router;