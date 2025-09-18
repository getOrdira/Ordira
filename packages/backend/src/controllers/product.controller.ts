// src/controllers/product.controller.ts

import { Request, Response, NextFunction } from 'express';
import { UnifiedAuthRequest } from '../middleware/unifiedAuth.middleware';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { asyncHandler, createAppError } from '../middleware/error.middleware';
import { ProductService } from '../services/business/product.service';

// Initialize service
const productService = new ProductService();

/**
 * Extended request interfaces for type safety
 */
interface TenantProductRequest extends Request, UnifiedAuthRequest {
  tenant?: { business: { toString: () => string } };
}

interface ManufacturerProductRequest extends Request, UnifiedAuthRequest {
  manufacturer?: any;
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
    tags?: string;
    priceRange?: { min?: number; max?: number };
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

interface BaseProductUpdate {
  validatedParams: { id: string };
  validatedBody: {
    title?: string;
    description?: string;
    media?: string[];
    category?: string;
    status?: "draft" | "active" | "archived";
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

type ProductUpdateRequest = UnifiedAuthRequest & ValidatedRequest & BaseProductUpdate;

interface ProductDetailRequest extends TenantProductRequest, ValidatedRequest {
  validatedParams: { id: string };
}

interface ProductSearchRequest extends TenantProductRequest, ValidatedRequest {
  validatedBody: {
    query: string;
    category?: string;
    userType?: 'brand' | 'manufacturer';
    priceRange?: { min?: number; max?: number };
    location?: string;
    limit?: number;
    tags?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
}

interface BulkProductRequest extends TenantProductRequest, ValidatedRequest {
  validatedBody: {
    productIds: string[];
    updates: {
      status?: 'draft' | 'active' | 'archived';
      category?: string;
      tags?: string[];
      price?: number;
    };
  };
}

/**
 * Helper to determine user context
 */
function getUserContext(req: UnifiedAuthRequest): {
  userId: string;
  userType: 'business' | 'manufacturer';
  businessId?: string;
  manufacturerId?: string;
} {
  // Check if it's a manufacturer request
  if ('manufacturer' in req && req.manufacturer) {
    return {
      userId: req.userId!,
      userType: 'manufacturer',
      manufacturerId: req.userId!
    };
  }
  
  // Default to business request
  const businessReq = req as TenantProductRequest;
  return {
    userId: req.userId!,
    userType: 'business',
    businessId: businessReq.tenant?.business?.toString() || req.userId!
  };
}

/**
 * List products for the authenticated user with enhanced filtering
 * GET /api/products
 */
export const listProducts = asyncHandler(async (
  req: ProductListRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);

  // Extract and validate query parameters
  const queryParams = req.validatedQuery || {};
  const page = queryParams.page || 1;
  const limit = Math.min(queryParams.limit || 20, 100);
  const offset = (page - 1) * limit;

  // Parse date filters
  const dateFrom = queryParams.dateFrom ? new Date(queryParams.dateFrom) : undefined;
  const dateTo = queryParams.dateTo ? new Date(queryParams.dateTo) : undefined;

  // Build comprehensive filter options
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
    offset,
    tags: queryParams.tags?.split(','),
    priceRange: queryParams.priceRange
  };

  // Get products and stats through service
  const [result, stats] = await Promise.all([
    productService.listProducts(userContext.businessId, userContext.manufacturerId, filterOptions),
    productService.getProductStats(userContext.businessId, userContext.manufacturerId)
  ]);

  // Return comprehensive response
  res.json({
    success: true,
    message: 'Products retrieved successfully',
    data: {
      products: result.products,
      stats: {
        overview: stats,
        filtered: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages
        }
      },
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
        tags: queryParams.tags,
        dateRange: {
          from: dateFrom?.toISOString(),
          to: dateTo?.toISOString()
        },
        sorting: {
          sortBy: filterOptions.sortBy,
          sortOrder: filterOptions.sortOrder
        }
      },
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Get a single product by ID with analytics
 * GET /api/products/:id
 */
export const getProduct = asyncHandler(async (
  req: ProductDetailRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);

  // Extract product ID from validated params
  const { id } = req.validatedParams;

  // Get product through service
  const product = await productService.getProduct(id, userContext.businessId, userContext.manufacturerId);

  if (!product) {
    throw createAppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  }

  // Get related products by same category if available
  const relatedProducts = product.category
    ? await productService.getProductsByCategory(
        product.category,
        userContext.businessId,
        userContext.manufacturerId
      ).then(products => products.filter(p => p.id !== id).slice(0, 5))
    : [];

  // Return comprehensive response
  res.json({
    success: true,
    message: 'Product retrieved successfully',
    data: {
      product,
      analytics: {
        views: (product as any).viewCount || 0,
        votes: product.voteCount || 0,
        certificates: product.certificateCount || 0,
        engagementScore: ((product.voteCount || 0) * 2) + ((product.certificateCount || 0) * 3)
      },
      related: {
        products: relatedProducts,
        category: product.category,
        total: relatedProducts.length
      },
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Create a new product with validation
 * POST /api/products
 */
export const createProduct = asyncHandler(async (
  req: ProductCreateRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);

  // Extract validated product data
  const productData = req.validatedBody;

  // Validate required fields
  if (!productData.title || productData.title.trim().length === 0) {
    throw createAppError('Product title is required', 400, 'MISSING_PRODUCT_TITLE');
  }

  if (productData.title.length > 200) {
    throw createAppError('Product title cannot exceed 200 characters', 400, 'TITLE_TOO_LONG');
  }

  // Validate media if provided
  if (productData.media && productData.media.length > 20) {
    throw createAppError('Maximum 20 media files allowed per product', 400, 'TOO_MANY_MEDIA');
  }

  // Create product through service
  const product = await productService.createProduct(
    productData,
    userContext.businessId,
    userContext.manufacturerId
  );

  // Generate suggestions for optimization
  const suggestions = [];
  if (!productData.description) {
    suggestions.push('Consider adding a detailed description to improve discoverability');
  }
  if (!productData.media || productData.media.length === 0) {
    suggestions.push('Upload product images to increase engagement');
  }
  if (!productData.category) {
    suggestions.push('Select a category to help customers find your product');
  }

  // Return comprehensive response
  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: {
      product,
      suggestions,
      nextSteps: [
        'Upload product images',
        'Add detailed specifications',
        'Set product status to active when ready'
      ],
      createdAt: new Date().toISOString()
    }
  });
});

/**
 * Upload product images directly
 * POST /api/products/:id/images
 * 
 * @requires authentication & tenant context
 * @requires multipart/form-data with 'images' field(s)
 * @returns { uploadedImages, product }
 */
export const uploadProductImages = asyncHandler(async (
  req: TenantProductRequest & { 
    params: { id: string }; 
    files?: Express.Multer.File[] 
  },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);
  const { id } = req.params;

  // Check if files were uploaded
  if (!req.files || req.files.length === 0) {
    throw createAppError('No image files provided', 400, 'MISSING_FILES');
  }

  // Validate file types
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const invalidFiles = req.files.filter(file => !allowedMimeTypes.includes(file.mimetype));
  if (invalidFiles.length > 0) {
    throw createAppError('Invalid file types. Only JPEG, PNG, and WebP are allowed', 400, 'INVALID_FILE_TYPE');
  }

  // Upload images through service
  const uploadedImages = await productService.uploadProductImages(
    id,
    req.files,
    userContext.businessId,
    userContext.manufacturerId
  );

  // Get updated product
  const product = await productService.getProduct(
    id,
    userContext.businessId,
    userContext.manufacturerId
  );

  // Return standardized response
  res.status(201).json({
    success: true,
    message: `${uploadedImages.length} product images uploaded successfully`,
    data: {
      uploadedImages: uploadedImages.map(img => ({
        id: img._id.toString(),
        filename: img.filename,
        url: img.url,
        size: img.size,
        mimeType: img.mimeType,
        uploadedAt: img.createdAt,
        // S3 information if available
        ...(img.s3Key && {
          storage: {
            type: 's3',
            s3Key: img.s3Key,
            s3Bucket: img.s3Bucket,
            s3Region: img.s3Region
          }
        })
      })),
      product: {
        id: product.id,
        title: product.title,
        mediaCount: product.media?.length || 0,
        updatedAt: product.updatedAt
      }
    }
  });
});

/**
 * Update an existing product with change tracking
 * PUT /api/products/:id
 */
export const updateProduct = asyncHandler(async (
  req: ProductUpdateRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);

  // Extract product ID and update data
  const { id } = req.validatedParams;
  const updateData = req.validatedBody;

  // Check if there are any fields to update
  if (Object.keys(updateData).length === 0) {
    throw createAppError('No update data provided', 400, 'EMPTY_UPDATE_DATA');
  }

  // Get current product for comparison
  const currentProduct = await productService.getProduct(
    id,
    userContext.businessId,
    userContext.manufacturerId
  );

  // Update product through service
  const product = await productService.updateProduct(
    id,
    updateData,
    userContext.businessId,
    userContext.manufacturerId
  );

  // Determine which fields were changed and their impact
  const changedFields = Object.keys(updateData).filter(key => updateData[key] !== undefined);
  const impact = [];

  if (changedFields.includes('status')) {
    if (updateData.status === 'active') {
      impact.push('Product is now visible to customers');
    } else if (updateData.status === 'archived') {
      impact.push('Product is no longer visible to customers');
    }
  }

  if (changedFields.includes('price')) {
    impact.push('Price change may affect customer interest');
  }

  if (changedFields.includes('category')) {
    impact.push('Category change may affect product discoverability');
  }

  // Return comprehensive response
  res.json({
    success: true,
    message: 'Product updated successfully',
    data: {
      product,
      changes: {
        fields: changedFields,
        impact,
        previousStatus: currentProduct.status,
        newStatus: updateData.status || currentProduct.status
      },
      updatedAt: new Date().toISOString()
    }
  });
});

/**
 * Delete a product with confirmation
 * DELETE /api/products/:id
 */
export const deleteProduct = asyncHandler(async (
  req: ProductDetailRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);

  // Extract product ID from validated params
  const { id } = req.validatedParams;

  // Get product details before deletion for impact analysis
  const product = await productService.getProduct(
    id,
    userContext.businessId,
    userContext.manufacturerId
  );

  // Delete product through service
  await productService.deleteProduct(id, userContext.businessId, userContext.manufacturerId);

  // Analyze deletion impact
  const impact = [];
  if (product.voteCount && product.voteCount > 0) {
    impact.push(`${product.voteCount} customer votes will be lost`);
  }
  if (product.certificateCount && product.certificateCount > 0) {
    impact.push(`${product.certificateCount} certificates are now orphaned`);
  }
  if (product.status === 'active') {
    impact.push('Active product removed from customer view');
  }

  // Return comprehensive response
  res.json({
    success: true,
    message: 'Product deleted successfully',
    data: {
      deleted: true,
      productId: id,
      productTitle: product.title,
      impact,
      alternatives: [
        'Archive product instead of deletion to preserve data',
        'Export product data before deletion',
        'Consider marking as draft instead'
      ],
      deletedAt: new Date().toISOString()
    }
  });
});

/**
 * Get comprehensive product statistics and analytics
 * GET /api/products/stats
 */
export const getProductStats = asyncHandler(async (
  req: TenantProductRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);

  // Get comprehensive statistics through service
  const stats = await productService.getProductStats(
    userContext.businessId,
    userContext.manufacturerId
  );

  // Calculate additional insights
  const insights = {
    performance: {
      topPerforming: stats.averageVotes > 5 ? 'High engagement' : 'Needs improvement',
      mediaAdoption: stats.total > 0 ? Math.round((stats.withMedia / stats.total) * 100) : 0,
      statusDistribution: stats.byStatus,
      categoryDiversity: Object.keys(stats.byCategory).length
    },
    recommendations: [] as string[]
  };

  // Generate recommendations
  if (stats.withoutMedia > stats.withMedia) {
    insights.recommendations.push('Add images to products without media to boost engagement');
  }
  
  if (stats.byStatus.draft > stats.byStatus.active) {
    insights.recommendations.push('Activate draft products to increase inventory visibility');
  }

  if (stats.averageVotes < 3) {
    insights.recommendations.push('Focus on marketing to increase customer engagement');
  }

  // Return comprehensive response
  res.json({
    success: true,
    message: 'Product statistics retrieved successfully',
    data: {
      overview: stats,
      insights,
      benchmarks: {
        industryAverage: {
          votesPerProduct: 3.5,
          mediaPerProduct: 2.8,
          activeRatio: 0.7
        },
        yourPerformance: {
          votesPerProduct: stats.averageVotes,
          mediaPerProduct: stats.total > 0 ? stats.withMedia / stats.total : 0,
          activeRatio: stats.total > 0 ? (stats.byStatus.active || 0) / stats.total : 0
        }
      },
      generatedAt: new Date().toISOString()
    }
  });
});

/**
 * Advanced product search with filters
 * POST /api/products/search
 */
export const searchProducts = asyncHandler(async (
  req: ProductSearchRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);

  // Extract search criteria
  const {
    query,
    category,
    userType,
    priceRange,
    location,
    limit = 50,
    tags,
    sortBy,
    sortOrder
  } = req.validatedBody;

  if (!query || query.trim().length === 0) {
    throw createAppError('Search query is required', 400, 'MISSING_SEARCH_QUERY');
  }

  if (query.length < 2) {
    throw createAppError('Search query must be at least 2 characters', 400, 'QUERY_TOO_SHORT');
  }

  // Perform search through service
  const products = await productService.searchProducts(query, {
    category,
    userType,
    priceRange,
    location,
    limit: Math.min(limit, 100) // Max 100 results
  });

  // Generate search suggestions
  const suggestions = [];
  if (products.length === 0) {
    suggestions.push('Try using different keywords');
    suggestions.push('Remove some filters to broaden search');
    suggestions.push('Check spelling of search terms');
  } else if (products.length < 5) {
    suggestions.push('Try broader keywords for more results');
    suggestions.push('Remove category filter to see more options');
  }

  // Return comprehensive response
  res.json({
    success: true,
    message: 'Product search completed successfully',
    data: {
      results: {
        products,
        total: products.length,
        query,
        hasResults: products.length > 0
      },
      suggestions,
      appliedFilters: {
        category,
        userType,
        priceRange,
        location,
        tags
      },
      searchMetadata: {
        executionTime: Date.now(),
        searchedAt: new Date().toISOString(),
        resultsQuality: products.length > 10 ? 'good' : products.length > 0 ? 'fair' : 'poor'
      }
    }
  });
});

/**
 * Get products by category with category insights
 * GET /api/products/category/:category
 */
export const getProductsByCategory = asyncHandler(async (
  req: TenantProductRequest & { params: { category: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);

  const { category } = req.params;

  if (!category || category.trim().length === 0) {
    throw createAppError('Category is required', 400, 'MISSING_CATEGORY');
  }

  // Get products by category through service
  const [products, allStats, availableCategories] = await Promise.all([
    productService.getProductsByCategory(
      category,
      userContext.businessId,
      userContext.manufacturerId
    ),
    productService.getProductStats(userContext.businessId, userContext.manufacturerId),
    productService.getAvailableCategories()
  ]);

  const categoryCount = allStats.byCategory[category] || 0;
  const categoryPercentage = allStats.total > 0 ? Math.round((categoryCount / allStats.total) * 100) : 0;

  // Return comprehensive response
  res.json({
    success: true,
    message: `Products in category '${category}' retrieved successfully`,
    data: {
      category,
      products,
      stats: {
        totalInCategory: products.length,
        percentageOfPortfolio: categoryPercentage,
        averageVotes: products.reduce((sum, p) => sum + (p.voteCount || 0), 0) / products.length || 0
      },
      insights: {
        performance: categoryPercentage > 20 ? 'Major category' : 'Niche category',
        recommendation: products.length < 3 ? 'Consider expanding this category' : 'Well represented category',
        topProduct: products.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))[0]
      },
      relatedCategories: availableCategories.filter(cat => cat !== category).slice(0, 5),
      retrievedAt: new Date().toISOString()
    }
  });
});

/**
 * Get featured products with smart selection
 * GET /api/products/featured
 */
export const getFeaturedProducts = asyncHandler(async (
  req: TenantProductRequest & { query: { limit?: string } },
  res: Response,
  next: NextFunction
): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit || '10'), 50);

  // Get featured products through service
  const featuredProducts = await productService.getFeaturedProducts(limit);

  // Determine selection criteria
  const criteria = {
    primary: 'Highest vote count',
    secondary: 'Recent activity',
    filters: ['Active status', 'Public visibility'],
    algorithm: 'Engagement-based ranking'
  };

  // Return comprehensive response
  res.json({
    success: true,
    message: 'Featured products retrieved successfully',
    data: {
      featured: featuredProducts,
      criteria,
      metadata: {
        total: featuredProducts.length,
        requestedLimit: limit,
        selectionDate: new Date().toISOString(),
        refreshInterval: '1 hour'
      }
    }
  });
});

/**
 * Bulk update products with detailed results
 * PUT /api/products/bulk
 */
export const bulkUpdateProducts = asyncHandler(async (
  req: BulkProductRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Get user context
  const userContext = getUserContext(req);

  // Extract bulk update data
  const { productIds, updates } = req.validatedBody;

  if (!productIds || productIds.length === 0) {
    throw createAppError('At least one product ID is required', 400, 'MISSING_PRODUCT_IDS');
  }

  if (productIds.length > 100) {
    throw createAppError('Maximum 100 products can be updated at once', 400, 'TOO_MANY_PRODUCTS');
  }

  if (!updates || Object.keys(updates).length === 0) {
    throw createAppError('Update data is required', 400, 'MISSING_UPDATE_DATA');
  }

  // Use service bulk update method
  const result = await productService.bulkUpdateProducts(
    productIds,
    updates,
    userContext.businessId,
    userContext.manufacturerId
  );

  // Generate recommendations based on results
  const recommendations = [];
  if (result.errors.length > 0) {
    recommendations.push('Review failed updates and check product permissions');
  }
  if (result.updated > 0 && updates.status === 'active') {
    recommendations.push('Monitor performance of newly activated products');
  }
  if (updates.price) {
    recommendations.push('Update marketing materials to reflect new pricing');
  }

  // Return comprehensive response
  res.json({
    success: true,
    message: `Bulk update completed: ${result.updated} successful, ${result.errors.length} failed`,
    data: {
      summary: {
        requested: productIds.length,
        successful: result.updated,
        failed: result.errors.length,
        successRate: Math.round((result.updated / productIds.length) * 100)
      },
      updates,
      errors: result.errors,
      recommendations,
      processedAt: new Date().toISOString()
    }
  });
});

/**
 * Increment product vote count (for voting system)
 * POST /api/products/:id/vote
 */
export const voteForProduct = asyncHandler(async (
  req: ProductDetailRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract product ID from validated params
  const { id } = req.validatedParams;

  // Get current product data
  const product = await productService.getProduct(id);

  if (!product) {
    throw createAppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  }

  // Increment vote count through service
  await productService.incrementVoteCount(id);

  // Get updated product data
  const updatedProduct = await productService.getProduct(id);

  const newVoteCount = (updatedProduct.voteCount || 0);
  const previousVoteCount = (product.voteCount || 0);

  // Return standardized response
  res.json({
    success: true,
    message: 'Vote recorded successfully',
    data: {
      productId: id,
      productTitle: product.title,
      previousVoteCount,
      newVoteCount,
      voteIncrement: newVoteCount - previousVoteCount,
      impact: {
        ranking: newVoteCount > 10 ? 'High engagement product' : 'Building momentum',
        visibility: newVoteCount % 5 === 0 ? 'Milestone reached' : 'Progressing well',
        engagement: newVoteCount > previousVoteCount ? 'Positive trend' : 'Stable'
      },
      votedAt: new Date().toISOString()
    }
  });
});

/**
 * Increment product certificate count (for certification system)
 * POST /api/products/:id/certificate
 */
export const addProductCertificate = asyncHandler(async (
  req: ProductDetailRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Extract product ID from validated params
  const { id } = req.validatedParams;

  // Get current product data
  const product = await productService.getProduct(id);

  if (!product) {
    throw createAppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  }

  // Increment certificate count through service
  await productService.incrementCertificateCount(id);

  // Get updated product data
  const updatedProduct = await productService.getProduct(id);

  const newCertificateCount = (updatedProduct.certificateCount || 0);
  const previousCertificateCount = (product.certificateCount || 0);

  // Return standardized response
  res.json({
    success: true,
    message: 'Certificate added successfully',
    data: {
      productId: id,
      productTitle: product.title,
      previousCertificateCount,
      newCertificateCount,
      certificateIncrement: newCertificateCount - previousCertificateCount,
      impact: {
        trustLevel: newCertificateCount > 5 ? 'Highly certified' : 'Building trust',
        quality: newCertificateCount > 3 ? 'Premium quality' : 'Quality assured',
        marketPosition: newCertificateCount > previousCertificateCount ? 'Strengthened' : 'Maintained'
      },
      certifiedAt: new Date().toISOString()
    }
  });
});
