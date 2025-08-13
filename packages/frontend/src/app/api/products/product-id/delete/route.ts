// src/routes/products/delete.routes.ts
import { Router } from 'express';
import { validateBody } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as productDeleteCtrl from '../../controllers/products/delete.controller';
import { productValidationSchemas } from '../../validation/product.validation';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(cleanupOnError);

/**
 * DELETE /api/products/:id/delete
 * Delete product permanently
 */
router.delete(
  '/',
  strictRateLimiter(),
  validateBody(productValidationSchemas.createProduct),
  trackManufacturerAction('delete_product'),
  productDeleteCtrl.deleteProduct
);

/**
 * POST /api/products/:id/delete/soft
 * Soft delete product (archive)
 */
router.post(
  '/soft',
  strictRateLimiter(),
  trackManufacturerAction('soft_delete_product'),
  productDeleteCtrl.softDeleteProduct
);

/**
 * POST /api/products/:id/delete/restore
 * Restore soft deleted product
 */
router.post(
  '/restore',
  strictRateLimiter(),
  trackManufacturerAction('restore_deleted_product'),
  productDeleteCtrl.restoreDeletedProduct
);

/**
 * DELETE /api/products/:id/delete/permanent
 * Permanently delete product (cannot be undone)
 */
router.delete(
  '/permanent',
  strictRateLimiter(),
  validateBody(productValidationSchemas.createProduct),
  trackManufacturerAction('permanent_delete_product'),
  productDeleteCtrl.permanentDeleteProduct
);

/**
 * POST /api/products/:id/delete/validate
 * Validate if product can be deleted
 */
router.post(
  '/validate',
  trackManufacturerAction('validate_product_deletion'),
  productDeleteCtrl.validateProductDeletion
);

/**
 * GET /api/products/:id/delete/impact
 * Check deletion impact (certificates, votes, etc.)
 */
router.get(
  '/impact',
  trackManufacturerAction('check_deletion_impact'),
  productDeleteCtrl.checkDeletionImpact
);

export default router;