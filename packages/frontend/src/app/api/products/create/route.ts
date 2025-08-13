// src/routes/products/create.routes.ts
import { Router } from 'express';
import { validateBody } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { uploadMiddleware, cleanupOnError, validateUploadOrigin } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as productCreateCtrl from '../../controllers/products/create.controller';
import { 
  createProductSchema, 
  quickCreateProductSchema,
  productValidationSchemas 
} from '../../validation/product.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(validateUploadOrigin);
router.use(cleanupOnError);

/**
 * POST /api/products/create
 * Create a new product with full details
 */
router.post(
  '/',
  strictRateLimiter(),
  validateBody(createProductSchema),
  trackManufacturerAction('create_product'),
  productCreateCtrl.createProduct
);

/**
 * POST /api/products/create/quick
 * Quick product creation with minimal required fields
 */
router.post(
  '/quick',
  strictRateLimiter(),
  validateBody(quickCreateProductSchema),
  trackManufacturerAction('quick_create_product'),
  productCreateCtrl.quickCreateProduct
);

/**
 * POST /api/products/create/with-media
 * Create product with media files upload
 */
router.post(
  '/with-media',
  strictRateLimiter(),
  uploadMiddleware.array('media', 10),
  validateBody(createProductSchema),
  trackManufacturerAction('create_product_with_media'),
  productCreateCtrl.createProductWithMedia
);

/**
 * POST /api/products/create/from-template
 * Create product from existing template
 */
router.post(
  '/from-template',
  strictRateLimiter(),
  validateBody(productValidationSchemas.createProduct),
  trackManufacturerAction('create_product_from_template'),
  productCreateCtrl.createProductFromTemplate
);

/**
 * POST /api/products/create/bulk
 * Bulk create multiple products
 */
router.post(
  '/bulk',
  strictRateLimiter(),
  validateBody(productValidationSchemas.createProduct),
  trackManufacturerAction('bulk_create_products'),
  productCreateCtrl.bulkCreateProducts
);

/**
 * POST /api/products/create/import
 * Import products from CSV/Excel
 */
router.post(
  '/import',
  strictRateLimiter(),
  uploadMiddleware.single('file'),
  validateBody(productValidationSchemas.createProduct),
  trackManufacturerAction('import_products'),
  productCreateCtrl.importProducts
);

/**
 * POST /api/products/create/validate
 * Validate product data before creation
 */
router.post(
  '/validate',
  validateBody(createProductSchema),
  trackManufacturerAction('validate_product_creation'),
  productCreateCtrl.validateProductCreation
);

/**
 * GET /api/products/create/templates
 * Get available product templates
 */
router.get(
  '/templates',
  trackManufacturerAction('view_product_templates'),
  productCreateCtrl.getProductTemplates
);

/**
 * POST /api/products/create/draft
 * Save product as draft
 */
router.post(
  '/draft',
  validateBody(createProductSchema),
  trackManufacturerAction('save_product_draft'),
  productCreateCtrl.saveProductDraft
);

export default router;