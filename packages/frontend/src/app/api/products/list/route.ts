// src/routes/products/list.routes.ts
import { Router } from 'express';
import { validateQuery } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant } from '../../middleware/tenant.middleware';
import { dynamicRateLimiter } from '../../middleware/rateLimiter.middleware';
import { cleanupOnError } from '../../middleware/upload.middleware';
import { trackManufacturerAction } from '../../middleware/metrics.middleware';
import * as productListCtrl from '../../controllers/products/list.controller';
import { productValidationSchemas } from '../../validation/product.validation';

const router = Router();

// Apply middleware to all routes
router.use(dynamicRateLimiter());
router.use(authenticate);
router.use(resolveTenant);
router.use(cleanupOnError);

/**
 * GET /api/products/list
 * List all products with filtering and pagination
 */
router.get(
  '/',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('list_products'),
  productListCtrl.listProducts
);

/**
 * GET /api/products/list/active
 * List only active products
 */
router.get(
  '/active',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('list_active_products'),
  productListCtrl.listActiveProducts
);

/**
 * GET /api/products/list/drafts
 * List draft products
 */
router.get(
  '/drafts',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('list_draft_products'),
  productListCtrl.listDraftProducts
);

/**
 * GET /api/products/list/archived
 * List archived products
 */
router.get(
  '/archived',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('list_archived_products'),
  productListCtrl.listArchivedProducts
);

/**
 * GET /api/products/list/category/:category
 * List products by category
 */
router.get(
  '/category/:category',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('list_products_by_category'),
  productListCtrl.listProductsByCategory
);

/**
 * GET /api/products/list/search
 * Search products with advanced filtering
 */
router.get(
  '/search',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('search_products'),
  productListCtrl.searchProducts
);

/**
 * GET /api/products/list/popular
 * Get most popular products by votes
 */
router.get(
  '/popular',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('list_popular_products'),
  productListCtrl.getPopularProducts
);

/**
 * GET /api/products/list/recent
 * Get recently created products
 */
router.get(
  '/recent',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('list_recent_products'),
  productListCtrl.getRecentProducts
);

/**
 * GET /api/products/list/stats
 * Get product statistics and analytics
 */
router.get(
  '/stats',
  trackManufacturerAction('view_product_stats'),
  productListCtrl.getProductStats
);

/**
 * GET /api/products/list/categories
 * Get all product categories with counts
 */
router.get(
  '/categories',
  trackManufacturerAction('view_product_categories'),
  productListCtrl.getProductCategories
);

/**
 * GET /api/products/list/tags
 * Get all product tags
 */
router.get(
  '/tags',
  trackManufacturerAction('view_product_tags'),
  productListCtrl.getProductTags
);

/**
 * GET /api/products/list/export
 * Export products list as CSV/Excel
 */
router.get(
  '/export',
  validateQuery(productValidationSchemas.productSearch),
  trackManufacturerAction('export_products'),
  productListCtrl.exportProducts
);

export default router;