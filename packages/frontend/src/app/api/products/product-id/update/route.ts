// src/routes/products/update.routes.ts
import { Router } from 'express';
import { validateBody } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { uploadMiddleware, cleanupOnError } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as productUpdateCtrl from '../../controllers/products/update.controller';
import { updateProductSchema } from '../../validation/product.validation';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(cleanupOnError);

/**
 * PUT /api/products/:id/update
 * Update product details
 */
router.put(
  '/',
  strictRateLimiter(),
  validateBody(updateProductSchema),
  trackManufacturerAction('update_product'),
  productUpdateCtrl.updateProduct
);

/**
 * PATCH /api/products/:id/update/title
 * Update product title only
 */
router.patch(
  '/title',
  validateBody(updateProductSchema.extract(['title'])),
  trackManufacturerAction('update_product_title'),
  productUpdateCtrl.updateProductTitle
);

/**
 * PATCH /api/products/:id/update/description
 * Update product description only
 */
router.patch(
  '/description',
  validateBody(updateProductSchema.extract(['description'])),
  trackManufacturerAction('update_product_description'),
  productUpdateCtrl.updateProductDescription
);

/**
 * PATCH /api/products/:id/update/category
 * Update product category
 */
router.patch(
  '/category',
  validateBody(updateProductSchema.extract(['category'])),
  trackManufacturerAction('update_product_category'),
  productUpdateCtrl.updateProductCategory
);

/**
 * PATCH /api/products/:id/update/status
 * Update product status
 */
router.patch(
  '/status',
  validateBody(updateProductSchema.extract(['status'])),
  trackManufacturerAction('update_product_status'),
  productUpdateCtrl.updateProductStatus
);

/**
 * PATCH /api/products/:id/update/pricing
 * Update product pricing
 */
router.patch(
  '/pricing',
  validateBody(updateProductSchema.extract(['pricing'])),
  trackManufacturerAction('update_product_pricing'),
  productUpdateCtrl.updateProductPricing
);

/**
 * PATCH /api/products/:id/update/specifications
 * Update product specifications
 */
router.patch(
  '/specifications',
  validateBody(updateProductSchema.extract(['specifications'])),
  trackManufacturerAction('update_product_specifications'),
  productUpdateCtrl.updateProductSpecifications
);

/**
 * POST /api/products/:id/update/media
 * Update product media
 */
router.post(
  '/media',
  strictRateLimiter(),
  uploadMiddleware.array('media', 10),
  validateBody(updateProductSchema.extract(['media'])),
  trackManufacturerAction('update_product_media'),
  productUpdateCtrl.updateProductMedia
);

/**
 * DELETE /api/products/:id/update/media/:mediaId
 * Remove specific media from product
 */
router.delete(
  '/media/:mediaId',
  strictRateLimiter(),
  trackManufacturerAction('remove_product_media'),
  productUpdateCtrl.removeProductMedia
);

/**
 * PATCH /api/products/:id/update/seo
 * Update SEO settings
 */
router.patch(
  '/seo',
  validateBody(updateProductSchema.extract(['seo'])),
  trackManufacturerAction('update_product_seo'),
  productUpdateCtrl.updateProductSeo
);

/**
 * POST /api/products/:id/update/bulk
 * Bulk update multiple fields
 */
router.post(
  '/bulk',
  strictRateLimiter(),
  validateBody(updateProductSchema),
  trackManufacturerAction('bulk_update_product'),
  productUpdateCtrl.bulkUpdateProduct
);

export default router;
