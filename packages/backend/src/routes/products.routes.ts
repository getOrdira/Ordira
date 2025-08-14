// src/routes/products.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authenticateManufacturer, requireVerifiedManufacturer } from '../middleware/manufacturerAuth.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import * as productCtrl from '../controllers/product.controller';
import {
  createProductSchema,
  updateProductSchema,
  productParamsSchema,
  listProductsQuerySchema,
  bulkUpdateProductsSchema,
  productInventorySchema,
  productPricingSchema
} from '../validation/product.validation';

const router = Router();

// Apply dynamic rate limiting to all product routes
router.use(dynamicRateLimiter());

// ===== PUBLIC PRODUCT DISCOVERY =====

// Public product catalog (no authentication required)
router.get(
  '/catalog',
  validateQuery(listProductsQuerySchema),
  productCtrl.getPublicCatalog
);

// Search products publicly
router.get(
  '/search',
  validateQuery(listProductsQuerySchema),
  productCtrl.searchProducts
);

// Get public product details
router.get(
  '/catalog/:id',
  validateParams(productParamsSchema),
  productCtrl.getPublicProduct
);

// ===== AUTHENTICATED PRODUCT MANAGEMENT =====

// Flexible authentication for brand and manufacturer access
router.use((req, res, next) => {
  // Try brand authentication first
  authenticate(req, res, (brandErr) => {
    if (!brandErr) {
      req.userType = 'brand';
      return next();
    }
    
    // If brand auth fails, try manufacturer authentication
    authenticateManufacturer(req, res, (mfgErr) => {
      if (!mfgErr) {
        req.userType = 'manufacturer';
        return next();
      }
      
      // Both authentications failed
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Valid brand or manufacturer authentication required',
        code: 'AUTH_REQUIRED'
      });
    });
  });
});

// ===== PRODUCT CRUD OPERATIONS =====

// List products with advanced filtering
router.get(
  '/',
  validateQuery(listProductsQuerySchema),
  productCtrl.listProducts
);

// Get specific product details
router.get(
  '/:id',
  validateParams(productParamsSchema),
  productCtrl.getProduct
);

// Create new product (verified manufacturers only for some categories)
router.post(
  '/',
  strictRateLimiter(), // Prevent product spam
  validateBody(createProductSchema),
  productCtrl.createProduct
);

// Update product
router.put(
  '/:id',
  validateParams(productParamsSchema),
  validateBody(updateProductSchema),
  productCtrl.updateProduct
);

// Delete product (strict rate limiting for security)
router.delete(
  '/:id',
  strictRateLimiter(), // Security for deletions
  validateParams(productParamsSchema),
  productCtrl.deleteProduct
);

// ===== BULK OPERATIONS =====

// Bulk update products (extra strict rate limiting)
router.put(
  '/bulk',
  strictRateLimiter(), // Very strict for bulk operations
  validateBody(bulkUpdateProductsSchema),
  productCtrl.bulkUpdateProducts
);

// Bulk delete products (admin/verified only)
router.delete(
  '/bulk',
  strictRateLimiter(), // Very strict for bulk deletions
  requireVerifiedManufacturer, // Extra security requirement
  validateBody(bulkUpdateProductsSchema.extract(['productIds'])),
  productCtrl.bulkDeleteProducts
);

// ===== INVENTORY MANAGEMENT =====

// Get product inventory
router.get(
  '/:id/inventory',
  validateParams(productParamsSchema),
  productCtrl.getProductInventory
);

// Update product inventory
router.put(
  '/:id/inventory',
  validateParams(productParamsSchema),
  validateBody(productInventorySchema),
  productCtrl.updateProductInventory
);

// ===== PRICING MANAGEMENT =====

// Get product pricing
router.get(
  '/:id/pricing',
  validateParams(productParamsSchema),
  productCtrl.getProductPricing
);

// Update product pricing
router.put(
  '/:id/pricing',
  validateParams(productParamsSchema),
  validateBody(productPricingSchema),
  productCtrl.updateProductPricing
);

// ===== PRODUCT VARIANTS =====

// Get product variants
router.get(
  '/:id/variants',
  validateParams(productParamsSchema),
  validateQuery(listProductsQuerySchema),
  productCtrl.getProductVariants
);

// Create product variant
router.post(
  '/:id/variants',
  validateParams(productParamsSchema),
  validateBody(createProductSchema),
  productCtrl.createProductVariant
);

// Update product variant
router.put(
  '/:id/variants/:variantId',
  validateParams(productParamsSchema),
  validateBody(updateProductSchema),
  productCtrl.updateProductVariant
);

// ===== PRODUCT ANALYTICS =====

// Get product performance analytics
router.get(
  '/:id/analytics',
  validateParams(productParamsSchema),
  validateQuery(listProductsQuerySchema),
  productCtrl.getProductAnalytics
);

// Get product sales data
router.get(
  '/:id/sales',
  validateParams(productParamsSchema),
  validateQuery(listProductsQuerySchema),
  productCtrl.getProductSales
);

// ===== PRODUCT CATEGORIES =====

// Get all product categories
router.get(
  '/categories',
  productCtrl.getProductCategories
);

// Get products by category
router.get(
  '/category/:category',
  validateParams(productParamsSchema.extract(['category'])),
  validateQuery(listProductsQuerySchema),
  productCtrl.getProductsByCategory
);

// ===== PRODUCT RECOMMENDATIONS =====

// Get featured products
router.get(
  '/featured',
  validateQuery(listProductsQuerySchema),
  productCtrl.getFeaturedProducts
);

// Get recommended products
router.get(
  '/:id/recommendations',
  validateParams(productParamsSchema),
  validateQuery(listProductsQuerySchema),
  productCtrl.getProductRecommendations
);

export default router;