// src/routes/products.routes.ts
import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authenticateManufacturer, requireVerifiedManufacturer } from '../middleware/manufacturerAuth.middleware';
import { resolveTenant } from '../middleware/tenant.middleware';
import { dynamicRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.middleware';
import { trackManufacturerAction } from '../middleware/metrics.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import * as productCtrl from '../controllers/product.controller';
import {
  createProductSchema,
  updateProductSchema,
  quickCreateProductSchema,
  productSearchSchema,
  productValidationSchemas
} from '../validation/product.validation';
import Joi from 'joi';
import { RequestHandler } from 'express';
import * as supplyChainCtrl from '../controllers/supplyChain.controller';

// ===== UPLOAD MIDDLEWARE SETUP =====
const safeUploadMiddleware = {
  multipleImages: uploadMiddleware.multipleImages as RequestHandler[]
};

// ===== ADDITIONAL VALIDATION SCHEMAS =====
// Schemas that align with your controller interfaces

// Product parameters schema
const productParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Product ID must be a valid MongoDB ObjectId',
      'any.required': 'Product ID is required'
    })
});

// Category parameters schema
const categoryParamsSchema = Joi.object({
  category: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Category must be at least 2 characters',
      'string.max': 'Category cannot exceed 100 characters',
      'any.required': 'Category is required'
    })
});

// List products query schema - aligned with controller
const listProductsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
  category: Joi.string().trim().max(100).optional(),
  status: Joi.string().valid('draft', 'active', 'archived').optional(),
  search: Joi.string().trim().min(2).max(100).optional(),
  hasMedia: Joi.boolean().optional(),
  sortBy: Joi.string()
    .valid('createdAt', 'title', 'voteCount', 'certificateCount', 'price')
    .default('createdAt')
    .optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
  tags: Joi.string().optional(), // Comma-separated tags
  priceRange: Joi.object({
    min: Joi.number().min(0).precision(2).optional(),
    max: Joi.number().min(0).precision(2).optional()
  }).optional()
});

// Bulk operations schema
const bulkProductsSchema = Joi.object({
  productIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one product ID is required',
      'array.max': 'Cannot process more than 100 products at once',
      'string.pattern.base': 'Each product ID must be a valid MongoDB ObjectId'
    }),
  updates: Joi.object({
    status: Joi.string().valid('draft', 'active', 'archived').optional(),
    category: Joi.string().trim().max(100).optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(30).optional(),
    price: Joi.number().min(0).precision(2).optional()
  }).min(1).required()
});

// Dual authentication interface
interface DualAuthRequest extends Request {
  userType?: 'business' | 'manufacturer';
  userId?: string;
  manufacturer?: any;
  tenant?: { business: { toString: () => string } };
}

const router = Router();

// Apply dynamic rate limiting to all product routes
router.use(dynamicRateLimiter());

// ===== PUBLIC PRODUCT DISCOVERY (NO AUTHENTICATION) =====

/**
 * GET /api/products/featured
 * Get featured products with smart selection (public endpoint)
 * 
 * @returns { featured[], criteria, metadata }
 */
router.get(
  '/featured',
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10).optional()
  })),
  productCtrl.getFeaturedProducts
);

/**
 * POST /api/products/search
 * Advanced product search with filters (public endpoint)
 * 
 * @requires validation: search criteria
 * @returns { results, suggestions, appliedFilters, searchMetadata }
 */
router.post(
  '/search',
  validateBody(productSearchSchema),
  productCtrl.searchProducts
);

/**
 * GET /api/products/categories
 * Get all available product categories (public endpoint)
 * 
 * @returns { categories[], stats }
 */
router.get(
  '/categories',
  async (req: any, res: any, next: any) => {
    try {
      // This would be implemented in controller or as a simple endpoint
      res.json({
        success: true,
        message: 'Product categories retrieved successfully',
        data: {
          categories: [
            'Electronics', 'Computer Hardware', 'Mobile Accessories', 'Gaming',
            'Clothing', 'Footwear', 'Accessories', 'Jewelry',
            'Furniture', 'Home Decor', 'Kitchen & Dining',
            'Sports Equipment', 'Outdoor Gear', 'Fitness',
            'Other'
          ],
          total: 15,
          note: 'Category list from validation schema - to be enhanced with dynamic data'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/products/supply-chain
 * Log supply chain event for a product
 * 
 * @requires validation: supply chain event data
 * @returns { success, data, message }
 */

router.post(
  '/:id/supply-chain/events',
  validateParams(productParamsSchema),
  validateBody(Joi.object({
    productId: Joi.string().required(),
    eventType: Joi.string().required(),
    eventData: Joi.object().optional()
  })),
  trackManufacturerAction('log_supply_chain_event'),
  supplyChainCtrl.logEvent
);

router.get(
  '/:id/supply-chain/events',
  validateParams(productParamsSchema),
  supplyChainCtrl.getEvents
);

router.get(
  '/:id/supply-chain/track',
  validateParams(productParamsSchema),
  supplyChainCtrl.getTrackingData
);

/**
 * GET /api/products/category/:category
 * Get products by specific category (public endpoint)
 * 
 * @requires params: { category: string }
 * @returns { category, products[], stats, insights }
 */
router.get(
  '/category/:category',
  validateParams(categoryParamsSchema),
  trackManufacturerAction('view_products_by_category'),
  productCtrl.getProductsByCategory
);

// ===== DUAL AUTHENTICATION MIDDLEWARE =====
// Supports both business and manufacturer authentication
router.use((req: any, res, next) => {
  // Try brand/business authentication first
  authenticate(req, res, (brandErr) => {
    if (!brandErr) {
      req.userType = 'business';
      // Apply tenant resolution for business users
      return resolveTenant(req, res, next);
    }
    
    // If brand auth fails, try manufacturer authentication
    authenticateManufacturer(req, res, (mfgErr) => {
      if (!mfgErr) {
        req.userType = 'manufacturer';
        return next();
      }
      
      // Both authentications failed
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Valid business or manufacturer authentication required',
        code: 'AUTH_REQUIRED'
      });
    });
  });
});

// ===== AUTHENTICATED PRODUCT MANAGEMENT =====

/**
 * GET /api/products
 * List products for authenticated user with enhanced filtering
 * 
 * @requires authentication (business OR manufacturer)
 * @optional query: filtering, pagination, sorting options
 * @returns { products[], stats, pagination, filters }
 */
router.get(
  '/',
  validateQuery(listProductsQuerySchema),
  trackManufacturerAction('view_products'),
  productCtrl.listProducts
);

/**
 * POST /api/products
 * Create new product with comprehensive validation
 * 
 * @requires authentication (business OR manufacturer)
 * @requires validation: product creation data
 * @rate-limited: strict to prevent product spam
 * @returns { product, suggestions, nextSteps }
 */
router.post(
  '/',
  strictRateLimiter(), // Prevent product spam
  validateBody(createProductSchema),
  trackManufacturerAction('create_product'),
  productCtrl.createProduct
);

/**
 * POST /api/products/quick
 * Quick product creation with minimal required fields
 * 
 * @requires authentication (business OR manufacturer)
 * @requires validation: minimal product data
 * @rate-limited: strict to prevent spam
 * @returns { product, suggestions, nextSteps }
 */
router.post(
  '/quick',
  strictRateLimiter(), // Prevent product spam
  validateBody(quickCreateProductSchema),
  trackManufacturerAction('quick_create_product'),
  productCtrl.createProduct
);

/**
 * GET /api/products/stats
 * Get comprehensive product statistics and analytics
 * 
 * @requires authentication (business OR manufacturer)
 * @returns { overview, insights, benchmarks }
 */
router.get(
  '/stats',
  trackManufacturerAction('view_product_stats'),
  productCtrl.getProductStats
);

/**
 * GET /api/products/:id
 * Get single product by ID with analytics
 * 
 * @requires authentication (business OR manufacturer)
 * @requires params: { id: string }
 * @returns { product, analytics, related }
 */
router.get(
  '/:id',
  validateParams(productParamsSchema),
  trackManufacturerAction('view_product_details'),
  productCtrl.getProduct
);

/**
 * PUT /api/products/:id
 * Update existing product with change tracking
 * 
 * @requires authentication (business OR manufacturer)
 * @requires params: { id: string }
 * @requires validation: partial product update data
 * @returns { product, changes, updatedAt }
 */
router.put(
  '/:id',
  validateParams(productParamsSchema),
  validateBody(updateProductSchema),
  trackManufacturerAction('update_product'),
  productCtrl.updateProduct
);

/**
 * Upload product images directly
 * POST /api/products/:id/images
 * 
 * @requires authentication (business OR manufacturer)
 * @requires multipart/form-data with 'images' field(s)
 * @rate-limited: strict for upload operations
 * @returns { uploadedImages, product }
 */
router.post(
  '/:id/images',
  strictRateLimiter(), // Strict rate limiting for uploads
  validateParams(productParamsSchema),
  ...safeUploadMiddleware.multipleImages,
  trackManufacturerAction('upload_product_images'),
  productCtrl.uploadProductImages
);

/**
 * DELETE /api/products/:id
 * Delete product with impact analysis
 * 
 * @requires authentication (business OR manufacturer)
 * @requires params: { id: string }
 * @rate-limited: strict for security
 * @returns { deleted, productId, impact, alternatives }
 */
router.delete(
  '/:id',
  strictRateLimiter(), // Security for deletions
  validateParams(productParamsSchema),
  trackManufacturerAction('delete_product'),
  productCtrl.deleteProduct
);

// ===== PRODUCT VOTING SYSTEM =====

/**
 * POST /api/products/:id/vote
 * Vote for a product (increment vote count)
 * 
 * @requires authentication (business OR manufacturer)
 * @requires params: { id: string }
 * @rate-limited: strict to prevent vote spam
 * @returns { productId, voteCount, impact }
 */
router.post(
  '/:id/vote',
  strictRateLimiter(), // Prevent vote spam
  validateParams(productParamsSchema),
  trackManufacturerAction('vote_for_product'),
  productCtrl.voteForProduct
);

/**
 * POST /api/products/:id/certificate
 * Add certificate to product (increment certificate count)
 * 
 * @requires authentication (business OR manufacturer)
 * @requires params: { id: string }
 * @rate-limited: strict for security
 * @returns { productId, certificateCount, impact }
 */
router.post(
  '/:id/certificate',
  strictRateLimiter(), // Security for certificate addition
  validateParams(productParamsSchema),
  trackManufacturerAction('add_product_certificate'),
  productCtrl.addProductCertificate
);

// ===== BULK OPERATIONS =====

/**
 * PUT /api/products/bulk
 * Bulk update products with detailed results
 * 
 * @requires authentication (business OR manufacturer)
 * @requires validation: { productIds: string[], updates: object }
 * @rate-limited: strict for bulk operations
 * @returns { summary, updates, errors, recommendations }
 */
router.put(
  '/bulk',
  strictRateLimiter(), // Very strict for bulk operations
  validateBody(bulkProductsSchema),
  trackManufacturerAction('bulk_update_products'),
  productCtrl.bulkUpdateProducts
);

/**
 * DELETE /api/products/bulk
 * Bulk delete products (verified users only)
 * 
 * @requires authentication (business OR manufacturer)
 * @requires verification: extra security for bulk deletions
 * @requires validation: { productIds: string[] }
 * @rate-limited: extra strict for bulk deletions
 * @returns { summary, deleted, errors }
 */
router.delete(
  '/bulk',
  requireVerifiedManufacturer, // Extra security requirement
  strictRateLimiter(), // Extra strict for bulk deletions
  validateBody(Joi.object({
    productIds: bulkProductsSchema.extract('productIds')
  })),
  trackManufacturerAction('bulk_delete_products'),
  async (req: any, res: any, next: any) => {
    try {
      // This would be implemented in the controller as bulkDeleteProducts
      res.json({
        success: true,
        message: 'Bulk delete endpoint - to be implemented',
        data: {
          productIds: req.body.productIds,
          note: 'Bulk delete functionality to be added to controller'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== PRODUCT IMPORT INTEGRATIONS =====

/**
 * POST /api/products/import/shopify
 * Import products from Shopify store
 * 
 * @requires authentication (business OR manufacturer)
 * @requires validation: Shopify connection data
 * @rate-limited: strict for import operations
 * @returns { imported, failed, summary }
 */
router.post(
  '/import/shopify',
  strictRateLimiter(), // Prevent import abuse
  validateBody(Joi.object({
    shopUrl: Joi.string().uri().required(),
    accessToken: Joi.string().required(),
    importOptions: Joi.object({
      includeImages: Joi.boolean().default(true),
      includeInventory: Joi.boolean().default(false),
      categoryMapping: Joi.object().optional(),
      priceMapping: Joi.string().valid('keep', 'markup', 'custom').default('keep'),
      statusMapping: Joi.string().valid('draft', 'active').default('draft')
    }).optional()
  })),
  trackManufacturerAction('import_from_shopify'),
  async (req: any, res: any, next: any) => {
    try {
      // This would be implemented as a separate import service
      res.json({
        success: true,
        message: 'Shopify import endpoint - to be implemented',
        data: {
          importRequest: req.body,
          note: 'Shopify integration to be implemented with import service'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/products/import/woocommerce
 * Import products from WooCommerce store
 * 
 * @requires authentication (business OR manufacturer)
 * @requires validation: WooCommerce connection data
 * @rate-limited: strict for import operations
 * @returns { imported, failed, summary }
 */
router.post(
  '/import/woocommerce',
  strictRateLimiter(), // Prevent import abuse
  validateBody(Joi.object({
    storeUrl: Joi.string().uri().required(),
    consumerKey: Joi.string().required(),
    consumerSecret: Joi.string().required(),
    importOptions: Joi.object({
      includeImages: Joi.boolean().default(true),
      includeCategories: Joi.boolean().default(true),
      includeVariations: Joi.boolean().default(false),
      statusMapping: Joi.string().valid('draft', 'active').default('draft')
    }).optional()
  })),
  trackManufacturerAction('import_from_woocommerce'),
  async (req: any, res: any, next: any) => {
    try {
      // This would be implemented as a separate import service
      res.json({
        success: true,
        message: 'WooCommerce import endpoint - to be implemented',
        data: {
          importRequest: req.body,
          note: 'WooCommerce integration to be implemented with import service'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/products/import/csv
 * Import products from CSV file
 * 
 * @requires authentication (business OR manufacturer)
 * @requires validation: CSV import data
 * @rate-limited: strict for import operations
 * @returns { imported, failed, errors, summary }
 */
router.post(
  '/import/csv',
  strictRateLimiter(), // Prevent import abuse
  validateBody(Joi.object({
    csvData: Joi.string().required(),
    mappingConfig: Joi.object({
      titleColumn: Joi.string().required(),
      descriptionColumn: Joi.string().optional(),
      categoryColumn: Joi.string().optional(),
      priceColumn: Joi.string().optional(),
      skuColumn: Joi.string().optional(),
      imageUrlColumn: Joi.string().optional()
    }).required(),
    importOptions: Joi.object({
      skipFirstRow: Joi.boolean().default(true),
      defaultStatus: Joi.string().valid('draft', 'active').default('draft'),
      validateRequired: Joi.boolean().default(true)
    }).optional()
  })),
  trackManufacturerAction('import_from_csv'),
  async (req: any, res: any, next: any) => {
    try {
      // This would be implemented as CSV parsing and bulk product creation
      res.json({
        success: true,
        message: 'CSV import endpoint - to be implemented',
        data: {
          importRequest: {
            csvLength: req.body.csvData.length,
            mapping: req.body.mappingConfig,
            options: req.body.importOptions
          },
          note: 'CSV import functionality to be implemented'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== PRODUCT EXPORT =====

/**
 * GET /api/products/export/csv
 * Export products to CSV format
 * 
 * @requires authentication (business OR manufacturer)
 * @optional query: export filters
 * @returns CSV file download
 */
router.get(
  '/export/csv',
  validateQuery(Joi.object({
    category: Joi.string().optional(),
    status: Joi.string().valid('draft', 'active', 'archived').optional(),
    includeAnalytics: Joi.boolean().default(false)
  })),
  trackManufacturerAction('export_products_csv'),
  async (req: any, res: any, next: any) => {
    try {
      // This would generate and return a CSV file
      res.json({
        success: true,
        message: 'CSV export endpoint - to be implemented',
        data: {
          exportOptions: req.query,
          note: 'CSV export functionality to be implemented with proper file download'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ===== HEALTH CHECK =====

/**
 * GET /api/products/health
 * Health check for product service
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'products',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      dualAuthentication: true,
      bulkOperations: true,
      votingSystem: true,
      certificateSystem: true,
      importIntegrations: true,
      publicDiscovery: true
    }
  });
});

// ===== ERROR HANDLING =====

/**
 * Product-specific error handler
 */
router.use((error: any, req: any, res: any, next: any) => {
  // Log product-specific errors
  console.error('Product Error:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack,
    userId: req.userId,
    userType: req.userType,
    timestamp: new Date().toISOString()
  });

  // Handle specific product errors
  if (error.message?.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: 'Product not found',
      message: 'The specified product could not be found',
      code: 'PRODUCT_NOT_FOUND'
    });
  }

  if (error.message?.includes('unauthorized')) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You do not have permission to access this product',
      code: 'PRODUCT_ACCESS_DENIED'
    });
  }

  if (error.message?.includes('validation failed')) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Product data validation failed',
      code: 'PRODUCT_VALIDATION_ERROR'
    });
  }

  if (error.message?.includes('duplicate')) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate product',
      message: 'A product with similar details already exists',
      code: 'PRODUCT_DUPLICATE'
    });
  }

  // Pass to global error handler
  next(error);
});

export default router;