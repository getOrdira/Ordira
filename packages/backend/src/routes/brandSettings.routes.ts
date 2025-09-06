// src/routes/brandSettings.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import * as settingsCtrl from '../controllers/brandSettings.controller';
import {
  updateBrandSettingsSchema,
  certificateWalletSchema,
  quickBrandingSchema,
  domainConfigSchema,
  shopifyIntegrationSchema,
  wooCommerceIntegrationSchema,
  wixIntegrationSchema
} from '../validation/brandSettings.validation';
import Joi from 'joi';
import { RequestHandler } from 'express';

const router = Router();

// ===== UPLOAD MIDDLEWARE SETUP =====
const safeUploadMiddleware = {
  singleImage: uploadMiddleware.singleImage as RequestHandler[]
};

// Apply dynamic rate limiting to all brand settings routes
router.use(dynamicRateLimiter());

// Apply authentication to all routes
router.use(authenticate);

// Apply tenant resolution for plan-based features
router.use(resolveTenant);

/**
 * Retrieve comprehensive brand settings with plan-based features
 
 */
router.get(
  '/',
  settingsCtrl.getBrandSettings
);

/**
 * 
 * Update brand settings with comprehensive validation and features
 */
router.put(
  '/',
  validateBody(updateBrandSettingsSchema),
  settingsCtrl.updateBrandSettings
);

/**
 * Update certificate wallet with enhanced security and validation
 
 */
router.put(
  '/certificate-wallet',
  strictRateLimiter(),
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(certificateWalletSchema),
  settingsCtrl.updateCertificateWallet
);

/**
 * Quick branding updates (theme color, logo)
 */
router.put(
  '/quick-branding',
  validateBody(quickBrandingSchema),
  settingsCtrl.updateQuickBranding
);

/**
 * Upload brand logo directly
 * POST /api/brand-settings/logo
 */
router.post(
  '/logo',
  strictRateLimiter(), // Strict rate limiting for uploads
  ...safeUploadMiddleware.singleImage,
  trackManufacturerAction('upload_brand_logo'),
  settingsCtrl.uploadBrandLogo
);

/**
 * Upload brand banner image
 * POST /api/brand-settings/banner
 */
router.post(
  '/banner',
  strictRateLimiter(), // Strict rate limiting for uploads
  ...safeUploadMiddleware.singleImage,
  trackManufacturerAction('upload_brand_banner'),
  settingsCtrl.uploadBrandBanner
);

/**
 * Update subdomain configuration 
 */
router.put(
  '/subdomain',
  validateBody(Joi.object({
    subdomain: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
      .min(3)
      .max(63)
      .required()
      .messages({
        'string.pattern.base': 'Subdomain can only contain lowercase letters, numbers, and hyphens',
        'string.min': 'Subdomain must be at least 3 characters',
        'string.max': 'Subdomain cannot exceed 63 characters',
        'any.required': 'Subdomain is required'
      })
  })),
  settingsCtrl.updateSubdomain
);

/**
 * Validate subdomain availability
 */
router.post(
  '/subdomain/validate',
  validateBody(Joi.object({
    subdomain: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
      .min(3)
      .max(63)
      .required()
      .messages({
        'string.pattern.base': 'Subdomain can only contain lowercase letters, numbers, and hyphens',
        'string.min': 'Subdomain must be at least 3 characters',
        'string.max': 'Subdomain cannot exceed 63 characters',
        'any.required': 'Subdomain is required'
      })
  })),
  settingsCtrl.validateSubdomain
);

/**
 * PUT /api/brand-settings/custom-domain
 * Set custom domain
 * ✅ Maps to: controller.setCustomDomain()
 */
router.put(
  '/custom-domain',
  strictRateLimiter(),
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(Joi.object({
    customDomain: Joi.string()
      .domain()
      .required()
      .messages({
        'string.domain': 'Must be a valid domain name',
        'any.required': 'Custom domain is required'
      })
  })),
  settingsCtrl.setCustomDomain
);

/**
 * DELETE /api/brand-settings/custom-domain
 * Remove custom domain
 * ✅ Maps to: controller.removeCustomDomain()
 */
router.delete(
  '/custom-domain',
  strictRateLimiter(),
  settingsCtrl.removeCustomDomain
);

/**
 * POST /api/brand-settings/custom-domain/verify
 * Verify custom domain DNS configuration
 * ✅ Maps to: controller.verifyCustomDomain()
 */
router.post(
  '/custom-domain/verify',
  strictRateLimiter(),
  requireTenantPlan(['premium', 'enterprise']),
  validateBody(Joi.object({
    customDomain: Joi.string()
      .domain()
      .required()
      .messages({
        'string.domain': 'Must be a valid domain name',
        'any.required': 'Domain is required for verification'
      })
  })),
  settingsCtrl.verifyCustomDomain
);

// === SHOPIFY INTEGRATION ===

/**
 * POST /api/brand-settings/integrations/shopify
 * Configure Shopify integration with comprehensive setup
 * ✅ Maps to: controller.configureShopifyIntegration()
 */
router.post(
  '/integrations/shopify',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(shopifyIntegrationSchema),
  settingsCtrl.configureShopifyIntegration
);

/**
 * PUT /api/brand-settings/integrations/shopify
 * Update existing Shopify integration
 * ✅ Maps to: controller.updateShopifyIntegration()
 */
router.put(
  '/integrations/shopify',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(shopifyIntegrationSchema),
  settingsCtrl.updateShopifyIntegration
);

// === WOOCOMMERCE INTEGRATION ===

/**
 * POST /api/brand-settings/integrations/woocommerce
 * Configure WooCommerce integration
 * ✅ Maps to: controller.configureWooCommerceIntegration()
 */
router.post(
  '/integrations/woocommerce',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(wooCommerceIntegrationSchema),
  settingsCtrl.configureWooCommerceIntegration
);

/**
 * PUT /api/brand-settings/integrations/woocommerce
 * Update existing WooCommerce integration
 * ✅ Maps to: controller.updateWooCommerceIntegration()
 */
router.put(
  '/integrations/woocommerce',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(wooCommerceIntegrationSchema),
  settingsCtrl.updateWooCommerceIntegration
);

// === WIX INTEGRATION ===

/**
 * POST /api/brand-settings/integrations/wix
 * Configure Wix integration
 * ✅ Maps to: controller.configureWixIntegration()
 */
router.post(
  '/integrations/wix',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(wixIntegrationSchema),
  settingsCtrl.configureWixIntegration
);

/**
 * PUT /api/brand-settings/integrations/wix
 * Update existing Wix integration
 * ✅ Maps to: controller.updateWixIntegration()
 */
router.put(
  '/integrations/wix',
  requireTenantPlan(['growth', 'premium', 'enterprise']),
  validateBody(wixIntegrationSchema),
  settingsCtrl.updateWixIntegration
);

// === INTEGRATION MANAGEMENT ===

/**
 * DELETE /api/brand-settings/integrations/:type
 * Remove integration configuration
 * ✅ Maps to: controller.removeIntegration()
 */
router.delete(
  '/integrations/:type',
  validateParams(Joi.object({
    type: Joi.string()
      .valid('shopify', 'woocommerce', 'wix')
      .required()
      .messages({
        'any.only': 'Integration type must be one of: shopify, woocommerce, wix',
        'any.required': 'Integration type is required'
      })
  })),
  settingsCtrl.removeIntegration
);

/**
 * POST /api/brand-settings/integrations/:type/test
 * Test integration connection
 * ✅ Maps to: controller.testIntegration()
 */
router.post(
  '/integrations/:type/test',
  strictRateLimiter(),
  validateParams(Joi.object({
    type: Joi.string()
      .valid('shopify', 'woocommerce', 'wix')
      .required()
      .messages({
        'any.only': 'Integration type must be one of: shopify, woocommerce, wix',
        'any.required': 'Integration type is required'
      })
  })),
  settingsCtrl.testIntegration
);

/**
 * GET /api/brand-settings/export
 * Export brand settings configuration
 * ✅ Maps to: controller.exportBrandSettings()
 */
router.get(
  '/export',
  validateQuery(Joi.object({
    format: Joi.string()
      .valid('json', 'yaml', 'csv')
      .default('json')
      .messages({
        'any.only': 'Format must be one of: json, yaml, csv'
      }),
    includeSensitive: Joi.boolean()
      .default(false)
      .messages({
        'boolean.base': 'includeSensitive must be a boolean value'
      })
  })),
  settingsCtrl.exportBrandSettings
);

/**
 * GET /api/brand-settings/public/:businessId
 * Get public brand settings (for display on public pages)
 * ✅ Maps to: controller.getPublicBrandSettings()
 * Note: This route does NOT require authentication for public access
 */
router.get(
  '/public/:businessId',
  // Skip authentication middleware for this public route
  (req, res, next) => {
    // This endpoint bypasses authentication for public access
    next();
  },
  validateParams(Joi.object({
    businessId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Business ID must be a valid MongoDB ObjectId',
        'any.required': 'Business ID is required'
      })
  })),
  settingsCtrl.getPublicBrandSettings
);

export default router;