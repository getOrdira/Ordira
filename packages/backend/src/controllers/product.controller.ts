// src/controllers/product.controller.ts

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { ProductService } from '../services/business/product.service';

// Initialize service
const productService = new ProductService();

/**
 * Extended request interfaces for type safety
 */
interface TenantProductRequest extends AuthRequest {
  tenant?: { business: { toString: () => string } };
}

interface ProductListRequest extends TenantProductRequest, ValidatedRequest {
  validatedQuery: {
    category?: string;
    status?: 'draft' | 'active' | 'archived';
    search?: string;
    hasMedia?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'title' | 'voteCount' | 'certificateCount';
    sortOrder?: 'asc' | 'desc';
    dateFrom?: string;
    dateTo?: string;
  };
}

interface ProductCreateRequest extends TenantProductRequest, ValidatedRequest {
  validatedBody: {
    title: string;
    description?: string;
    media?: string[];
    category?: string;
    status?: 'draft' | 'active';
    sku?: string;
    price?: number;
    tags?: string[];
    specifications?: Record<string, string>;
    manufacturingDetails?: {
      materials?: string[];
      dimensions?: string;
      weight?: string;
      origin?: string;
    };
  };
}

interface ProductUpdateRequest extends TenantProductRequest, ValidatedRequest {
  validatedParams: { id: string };
  validatedBody: Partial<ProductCreateRequest['validatedBody']>;
}

interface ProductDetailRequest extends TenantProductRequest, ValidatedRequest {
  validatedParams: { id: string };
}

/**
 * List products for the authenticated business
 * GET /api/products
 * 
 * @requires authentication & tenant context
 * @optional query: filtering, pagination, search options
 * @returns { products[], stats, pagination }
 */
export const listProducts = asyncHandler(async (
  req: ProductListRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract and validate query parameters
  const queryParams = req.validatedQuery || {};
  const page = queryParams.page || 1;
  const limit = Math.min(queryParams.limit || 20, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  // Parse date filters
  const dateFrom = queryParams.dateFrom ? new Date(queryParams.dateFrom) : undefined;
  const dateTo = queryParams.dateTo ? new Date(queryParams.dateTo) : undefined;

  // Build filter options
  const filterOptions = {
    category: queryParams.category,
    status: queryParams.status,
    search: queryParams.search,
    hasMedia: queryParams.hasMedia,
    dateFrom,
    dateTo,
    sortBy: queryParams.sortBy || 'createdAt',
    sortOrder: queryParams.sortOrder || 'desc',
    limit,
    offset
  };

  // Get products through service
  const result = await productService.listProducts(businessId, undefined, filterOptions);

  // Return standardized response
  res.json({
    success: true,
    message: 'Products retrieved successfully',
    data: {
      products: result.products,
      pagination: {
        total: result.total,
        page: result.page,
        limit,
        totalPages: result.totalPages,
        hasNext: page < result.totalPages,
        hasPrev: page > 1
      },
      filters: {
        category: queryParams.category,
        status: queryParams.status,
        search: queryParams.search,
        hasMedia: queryParams.hasMedia,
        dateRange: {
          from: dateFrom?.toISOString(),
          to: dateTo?.toISOString()
        }
      }
    }
  });
});

/**
 * Get a single product by ID
 * GET /api/products/:id
 * 
 * @requires authentication & tenant context
 * @requires params: { id: string }
 * @returns { product, analytics, relatedProducts }
 */
export const getProduct = asyncHandler(async (
  req: ProductDetailRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract product ID from validated params
  const { id } = req.validatedParams;

  // Get product through service
  const product = await productService.getProduct(id, businessId);

  if (!product) {
    throw createAppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  }

  // Return standardized response
  res.json({
    success: true,
    message: 'Product retrieved successfully',
    data: {
      product,
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Create a new product
 * POST /api/products
 * 
 * @requires authentication & tenant context
 * @requires validation: product creation data
 * @returns { product, created }
 */
export const createProduct = asyncHandler(async (
  req: ProductCreateRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract validated product data
  const productData = req.validatedBody;

  // Validate required fields
  if (!productData.title || productData.title.trim().length === 0) {
    throw createAppError('Product title is required', 400, 'MISSING_PRODUCT_TITLE');
  }

  // Create product through service
  const product = await productService.createProduct(productData, businessId);

  // Return standardized response
  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: {
      product,
      createdAt: new Date().toISOString()
    }
  });
});

/**
 * Update an existing product
 * PUT /api/products/:id
 * 
 * @requires authentication & tenant context
 * @requires params: { id: string }
 * @requires validation: product update data
 * @returns { product, changedFields }
 */
export const updateProduct = asyncHandler(async (
  req: ProductUpdateRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract product ID and update data
  const { id } = req.validatedParams;
  const updateData = req.validatedBody;

  // Check if there are any fields to update
  if (Object.keys(updateData).length === 0) {
    throw createAppError('No update data provided', 400, 'EMPTY_UPDATE_DATA');
  }

  // Update product through service
  const product = await productService.updateProduct(id, updateData, businessId);

  // Determine which fields were changed
  const changedFields = Object.keys(updateData).filter(key => updateData[key] !== undefined);

  // Return standardized response
  res.json({
    success: true,
    message: 'Product updated successfully',
    data: {
      product,
      changedFields,
      updatedAt: new Date().toISOString()
    }
  });
});

/**
 * Delete a product
 * DELETE /api/products/:id
 * 
 * @requires authentication & tenant context
 * @requires params: { id: string }
 * @returns { deleted, productId }
 */
export const deleteProduct = asyncHandler(async (
  req: ProductDetailRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract product ID from validated params
  const { id } = req.validatedParams;

  // Delete product through service
  await productService.deleteProduct(id, businessId);

  // Return standardized response (204 No Content is traditional, but we'll use 200 with confirmation)
  res.json({
    success: true,
    message: 'Product deleted successfully',
    data: {
      deleted: true,
      productId: id,
      deletedAt: new Date().toISOString()
    }
  });
});

/**
 * Get product statistics and analytics
 * GET /api/products/stats
 * 
 * @requires authentication & tenant context
 * @returns { stats, trends, categories }
 */
export const getProductStats = asyncHandler(async (
  req: TenantProductRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Get product statistics through service (implement if available)
  // For now, we'll get basic stats by listing products with different filters
  const [totalProducts, activeProducts, draftProducts, archivedProducts] = await Promise.all([
    productService.listProducts(businessId, undefined, { limit: 1 }),
    productService.listProducts(businessId, undefined, { status: 'active', limit: 1 }),
    productService.listProducts(businessId, undefined, { status: 'draft', limit: 1 }),
    productService.listProducts(businessId, undefined, { status: 'archived', limit: 1 })
  ]);

  // Build stats object
  const stats = {
    total: totalProducts.total,
    byStatus: {
      active: activeProducts.total,
      draft: draftProducts.total,
      archived: archivedProducts.total
    },
    withMedia: 0, // Would need service method to calculate
    withoutMedia: 0, // Would need service method to calculate
    averageVotes: 0, // Would need service method to calculate
    totalVotes: 0 // Would need service method to calculate
  };

  // Return standardized response
  res.json({
    success: true,
    message: 'Product statistics retrieved successfully',
    data: {
      stats,
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Search products with advanced filters
 * POST /api/products/search
 * 
 * @requires authentication & tenant context
 * @requires validation: search criteria
 * @returns { products[], total, suggestions }
 */
export const searchProducts = asyncHandler(async (
  req: TenantProductRequest & {
    validatedBody: {
      query?: string;
      categories?: string[];
      status?: string[];
      priceRange?: { min?: number; max?: number };
      tags?: string[];
      hasMedia?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    };
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract search criteria
  const searchCriteria = req.validatedBody;
  const page = searchCriteria.page || 1;
  const limit = Math.min(searchCriteria.limit || 20, 100);
  const offset = (page - 1) * limit;

  // Build search filters
  const searchFilters = {
    search: searchCriteria.query,
    category: searchCriteria.categories?.[0], // Service may only support single category
    status: searchCriteria.status?.[0] as any, // Service may only support single status
    hasMedia: searchCriteria.hasMedia,
    sortBy: searchCriteria.sortBy as any,
    sortOrder: searchCriteria.sortOrder,
    limit,
    offset
  };

  // Perform search through service
  const result = await productService.listProducts(businessId, undefined, searchFilters);

  // Return standardized response
  res.json({
    success: true,
    message: 'Product search completed successfully',
    data: {
      products: result.products,
      total: result.total,
      pagination: {
        page: result.page,
        limit,
        totalPages: result.totalPages,
        hasNext: page < result.totalPages,
        hasPrev: page > 1
      },
      searchCriteria,
      executionTime: Date.now() // Simple execution time
    }
  });
});

/**
 * Bulk update products
 * PUT /api/products/bulk
 * 
 * @requires authentication & tenant context
 * @requires validation: { productIds: string[], updates: object }
 * @returns { updated, failed, results }
 */
export const bulkUpdateProducts = asyncHandler(async (
  req: TenantProductRequest & {
    validatedBody: {
      productIds: string[];
      updates: {
        status?: 'draft' | 'active' | 'archived';
        category?: string;
        tags?: string[];
      };
    };
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract business ID from tenant context
  const businessId = req.tenant?.business?.toString();
  if (!businessId) {
    throw createAppError('Business context not found', 400, 'MISSING_BUSINESS_CONTEXT');
  }

  // Extract bulk update data
  const { productIds, updates } = req.validatedBody;

  if (!productIds || productIds.length === 0) {
    throw createAppError('At least one product ID is required', 400, 'MISSING_PRODUCT_IDS');
  }

  if (productIds.length > 50) {
    throw createAppError('Maximum 50 products can be updated at once', 400, 'TOO_MANY_PRODUCTS');
  }

  if (!updates || Object.keys(updates).length === 0) {
    throw createAppError('Update data is required', 400, 'MISSING_UPDATE_DATA');
  }

  // Process bulk updates
  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (const productId of productIds) {
    try {
      const updatedProduct = await productService.updateProduct(productId, updates, businessId);
      results.push({
        id: productId,
        status: 'success',
        product: updatedProduct
      });
      successCount++;
    } catch (error: any) {
      results.push({
        id: productId,
        status: 'error',
        error: error.message || 'Unknown error'
      });
      errorCount++;
    }
  }

  // Return standardized response
  res.json({
    success: true,
    message: `Bulk update completed: ${successCount} successful, ${errorCount} failed`,
    data: {
      processed: productIds.length,
      successful: successCount,
      failed: errorCount,
      updates,
      results,
      processedAt: new Date().toISOString()
    }
  });
});