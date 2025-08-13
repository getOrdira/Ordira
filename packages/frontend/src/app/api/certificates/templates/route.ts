// src/routes/certificates/templates.routes.ts
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant, requireTenantPlan } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as templatesCtrl from '../../controllers/certificates/templates.controller';
import {
  certificateTemplateSchema,
  templateCustomizationSchema,
  templatePreviewSchema,
  templateImportExportSchema,
  templateValidationSchema
} from '../../validation/certificates/templates.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);

/**
 * GET /api/certificates/templates
 * Get all available certificate templates
 */
router.get(
  '/',
  validateQuery(certificateTemplateSchema.list),
  templatesCtrl.getCertificateTemplates
);

/**
 * GET /api/certificates/templates/:templateId
 * Get specific certificate template
 */
router.get(
  '/:templateId',
  validateParams(certificateTemplateSchema.params),
  templatesCtrl.getCertificateTemplate
);

/**
 * POST /api/certificates/templates
 * Create new certificate template
 */
router.post(
  '/',
  requireTenantPlan(['premium', 'enterprise']), // Custom templates require premium+
  strictRateLimiter(),
  validateBody(certificateTemplateSchema.create),
  templatesCtrl.createCertificateTemplate
);

/**
 * PUT /api/certificates/templates/:templateId
 * Update certificate template
 */
router.put(
  '/:templateId',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(certificateTemplateSchema.params),
  validateBody(certificateTemplateSchema.update),
  templatesCtrl.updateCertificateTemplate
);

/**
 * DELETE /api/certificates/templates/:templateId
 * Delete certificate template
 */
router.delete(
  '/:templateId',
  requireTenantPlan(['premium', 'enterprise']),
  strictRateLimiter(),
  validateParams(certificateTemplateSchema.params),
  templatesCtrl.deleteCertificateTemplate
);

/**
 * POST /api/certificates/templates/:templateId/duplicate
 * Duplicate existing template
 */
router.post(
  '/:templateId/duplicate',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(certificateTemplateSchema.params),
  validateBody(certificateTemplateSchema.duplicate),
  templatesCtrl.duplicateTemplate
);

/**
 * POST /api/certificates/templates/:templateId/preview
 * Preview template with sample data
 */
router.post(
  '/:templateId/preview',
  validateParams(certificateTemplateSchema.params),
  validateBody(templatePreviewSchema),
  templatesCtrl.previewTemplate
);

/**
 * GET /api/certificates/templates/:templateId/customization
 * Get template customization options
 */
router.get(
  '/:templateId/customization',
  validateParams(certificateTemplateSchema.params),
  templatesCtrl.getTemplateCustomization
);

/**
 * PUT /api/certificates/templates/:templateId/customization
 * Update template customization
 */
router.put(
  '/:templateId/customization',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(certificateTemplateSchema.params),
  validateBody(templateCustomizationSchema),
  templatesCtrl.updateTemplateCustomization
);

/**
 * POST /api/certificates/templates/:templateId/validate
 * Validate template configuration
 */
router.post(
  '/:templateId/validate',
  validateParams(certificateTemplateSchema.params),
  validateBody(templateValidationSchema),
  templatesCtrl.validateTemplate
);

/**
 * GET /api/certificates/templates/gallery/featured
 * Get featured template gallery
 */
router.get(
  '/gallery/featured',
  templatesCtrl.getFeaturedTemplates
);

/**
 * GET /api/certificates/templates/gallery/categories
 * Get template categories
 */
router.get(
  '/gallery/categories',
  templatesCtrl.getTemplateCategories
);

/**
 * GET /api/certificates/templates/gallery/category/:categoryId
 * Get templates by category
 */
router.get(
  '/gallery/category/:categoryId',
  validateParams(certificateTemplateSchema.categoryParams),
  validateQuery(certificateTemplateSchema.categoryQuery),
  templatesCtrl.getTemplatesByCategory
);

/**
 * POST /api/certificates/templates/gallery/:templateId/install
 * Install template from gallery
 */
router.post(
  '/gallery/:templateId/install',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(certificateTemplateSchema.params),
  validateBody(certificateTemplateSchema.install),
  templatesCtrl.installTemplateFromGallery
);

/**
 * GET /api/certificates/templates/:templateId/usage-stats
 * Get template usage statistics
 */
router.get(
  '/:templateId/usage-stats',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(certificateTemplateSchema.params),
  validateQuery(certificateTemplateSchema.usageStats),
  templatesCtrl.getTemplateUsageStats
);

/**
 * POST /api/certificates/templates/:templateId/test
 * Test template with real data
 */
router.post(
  '/:templateId/test',
  strictRateLimiter(),
  validateParams(certificateTemplateSchema.params),
  validateBody(templatePreviewSchema.test),
  templatesCtrl.testTemplate
);

/**
 * GET /api/certificates/templates/export
 * Export all templates
 */
router.get(
  '/export',
  requireTenantPlan(['enterprise']),
  validateQuery(templateImportExportSchema.export),
  templatesCtrl.exportTemplates
);

/**
 * POST /api/certificates/templates/import
 * Import templates from file
 */
router.post(
  '/import',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(templateImportExportSchema.import),
  templatesCtrl.importTemplates
);

/**
 * GET /api/certificates/templates/:templateId/versions
 * Get template version history
 */
router.get(
  '/:templateId/versions',
  requireTenantPlan(['enterprise']),
  validateParams(certificateTemplateSchema.params),
  templatesCtrl.getTemplateVersions
);

/**
 * POST /api/certificates/templates/:templateId/versions/:versionId/restore
 * Restore template to specific version
 */
router.post(
  '/:templateId/versions/:versionId/restore',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateParams(certificateTemplateSchema.versionParams),
  templatesCtrl.restoreTemplateVersion
);

/**
 * POST /api/certificates/templates/:templateId/publish
 * Publish template to marketplace
 */
router.post(
  '/:templateId/publish',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateParams(certificateTemplateSchema.params),
  validateBody(certificateTemplateSchema.publish),
  templatesCtrl.publishTemplate
);

/**
 * POST /api/certificates/templates/:templateId/unpublish
 * Unpublish template from marketplace
 */
router.post(
  '/:templateId/unpublish',
  requireTenantPlan(['enterprise']),
  validateParams(certificateTemplateSchema.params),
  templatesCtrl.unpublishTemplate
);

/**
 * GET /api/certificates/templates/:templateId/analytics
 * Get template performance analytics
 */
router.get(
  '/:templateId/analytics',
  requireTenantPlan(['premium', 'enterprise']),
  validateParams(certificateTemplateSchema.params),
  validateQuery(certificateTemplateSchema.analytics),
  templatesCtrl.getTemplateAnalytics
);

/**
 * POST /api/certificates/templates/ai-generate
 * Generate template using AI
 */
router.post(
  '/ai-generate',
  requireTenantPlan(['enterprise']),
  strictRateLimiter(),
  validateBody(certificateTemplateSchema.aiGenerate),
  templatesCtrl.generateTemplateWithAI
);

export default router;