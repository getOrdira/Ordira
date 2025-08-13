/ src/routes/products/product-id.routes.ts
import { Router } from 'express';
import { validateParams } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter } from '../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as productDetailsCtrl from '../../controllers/products/details.controller';
import { productValidationSchemas } from '../../validation/product.validation';

// Import sub-routes
import analyticsRoutes from './analytics.routes';
import updateRoutes from './update.routes';
import deleteRoutes from './delete.routes';

const router = Router({ mergeParams: true });

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(validateParams({ id: productValidationSchemas.createProduct.extract('_id') }));
router.use(cleanupOnError);

/**
 * GET /api/products/:id
 * Get product details
 */
router.get(
  '/',
  trackManufacturerAction('view_product_details'),
  productDetailsCtrl.getProduct
);

/**
 * GET /api/products/:id/media
 * Get product media files
 */
router.get(
  '/media',
  trackManufacturerAction('view_product_media'),
  productDetailsCtrl.getProductMedia
);

/**
 * GET /api/products/:id/specifications
 * Get product specifications
 */
router.get(
  '/specifications',
  trackManufacturerAction('view_product_specifications'),
  productDetailsCtrl.getProductSpecifications
);

/**
 * GET /api/products/:id/certificates
 * Get certificates associated with product
 */
router.get(
  '/certificates',
  trackManufacturerAction('view_product_certificates'),
  productDetailsCtrl.getProductCertificates
);

/**
 * GET /api/products/:id/votes
 * Get voting information for product
 */
router.get(
  '/votes',
  trackManufacturerAction('view_product_votes'),
  productDetailsCtrl.getProductVotes
);

/**
 * GET /api/products/:id/reviews
 * Get product reviews
 */
router.get(
  '/reviews',
  validateQuery(productValidationSchemas.productReview),
  trackManufacturerAction('view_product_reviews'),
  productDetailsCtrl.getProductReviews
);

/**
 * POST /api/products/:id/review
 * Add product review
 */
router.post(
  '/review',
  validateParams(productValidationSchemas.productReview),
  trackManufacturerAction('add_product_review'),
  productDetailsCtrl.addProductReview
);

/**
 * GET /api/products/:id/similar
 * Get similar products
 */
router.get(
  '/similar',
  trackManufacturerAction('view_similar_products'),
  productDetailsCtrl.getSimilarProducts
);

/**
 * POST /api/products/:id/duplicate
 * Duplicate product
 */
router.post(
  '/duplicate',
  trackManufacturerAction('duplicate_product'),
  productDetailsCtrl.duplicateProduct
);

/**
 * POST /api/products/:id/archive
 * Archive product
 */
router.post(
  '/archive',
  trackManufacturerAction('archive_product'),
  productDetailsCtrl.archiveProduct
);

/**
 * POST /api/products/:id/restore
 * Restore archived product
 */
router.post(
  '/restore',
  trackManufacturerAction('restore_product'),
  productDetailsCtrl.restoreProduct
);

// Mount sub-routes
router.use('/analytics', analyticsRoutes);
router.use('/update', updateRoutes);
router.use('/delete', deleteRoutes);

export default router;