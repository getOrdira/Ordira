/**
 * Optimized Product Service
 * 
 * Example of how to optimize existing services using the new optimization patterns.
 * This replaces inefficient query patterns with optimized versions.
 */

import { logger } from '../../utils/logger';
import { Product } from '../../models/product.model';
import { Media } from '../../models/media.model';
import { queryOptimizationService } from '../external/query-optimization.service';
import { enhancedCacheService } from '../external/enhanced-cache.service';
import { MediaService } from './media.service';
import { paginationService } from '../utils/pagination.service';
import { aggregationOptimizationService } from '../external/aggregation-optimization.service';

export interface CreateProductData {
  title: string;
  description?: string;
  media?: string[]; // Media IDs
  category?: string;
  status?: 'draft' | 'active' | 'archived';
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
}

export interface ProductFilters {
  query?: string;
  businessId?: string;
  manufacturerId?: string;
  category?: string;
  status?: string;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Optimized product service with caching and query optimization
 */
export class ProductService {
  private mediaService = new MediaService();
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Create a product with optimized validation
   */
  async createProduct(
    data: CreateProductData,
    businessId?: string,
    manufacturerId?: string
  ): Promise<any> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    // Validate media exists before creating product
    if (data.media && data.media.length > 0) {
      const mediaExists = await this.validateMediaOwnership(data.media, businessId || manufacturerId!);
      if (!mediaExists) {
        throw new Error('One or more media files do not exist or are not owned by the user');
      }
    }

    const startTime = Date.now();

    try {
      // Create product
      const productData = {
        ...data,
        business: businessId,
        manufacturer: manufacturerId,
        specifications: new Map(Object.entries(data.specifications || {})),
        manufacturingDetails: data.manufacturingDetails || {}
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      // Invalidate relevant caches
      await this.invalidateProductCaches(businessId, manufacturerId);

      const duration = Date.now() - startTime;
      logger.info(`Product created successfully in ${duration}ms`, {
        productId: savedProduct._id,
        businessId,
        manufacturerId,
        duration
      });

      return savedProduct;

    } catch (error) {
      logger.error('Failed to create product:', error);
      throw error;
    }
  }

  /**
   * Get products with optimized queries, caching, and memory-efficient pagination
   */
  async getProducts(filters: ProductFilters): Promise<any> {
    const cacheKey = this.buildCacheKey('product_listing', filters);

    // Try to get from cache first
    const cachedResult = await enhancedCacheService.getCachedProductListing(filters, {
      ttl: this.CACHE_TTL
    });

    if (cachedResult) {
      logger.info('Product listing served from cache', {
        filters: Object.keys(filters),
        resultsCount: cachedResult.products?.length || 0
      });
      return cachedResult;
    }

    // Build query filter
    const query: any = {};
    if (filters.businessId) query.business = filters.businessId;
    if (filters.manufacturerId) query.manufacturer = filters.manufacturerId;
    if (filters.category) query.category = filters.category;
    if (filters.status) query.status = filters.status;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      query.price = {};
      if (filters.priceMin !== undefined) query.price.$gte = filters.priceMin;
      if (filters.priceMax !== undefined) query.price.$lte = filters.priceMax;
    }

    // Add text search if query provided
    if (filters.query) {
      query.$text = { $search: filters.query };
    }

    // Use hybrid pagination for optimal performance
    const page = filters.offset ? Math.floor(filters.offset / (filters.limit || 20)) + 1 : 1;
    const result = await paginationService.hybridPaginate(Product, query, {
      page,
      limit: filters.limit || 20,
      strategy: 'auto',
      select: 'title description category price status voteCount certificateCount viewCount createdAt business manufacturer',
      sort: {
        ...(filters.query ? { score: { $meta: 'textScore' } } : {}),
        [filters.sortBy || 'createdAt']: filters.sortOrder === 'asc' ? 1 : -1
      }
    });

    // Transform result to match expected format
    const transformedResult = {
      products: result.data,
      total: 'totalCount' in result.pagination ? result.pagination.totalCount : undefined,
      hasMore: result.pagination.hasNext,
      queryTime: result.performance.queryTime,
      pagination: result.pagination
    };

    // Cache the result
    await enhancedCacheService.cacheProductListing({
      ...filters,
      limit: filters.limit || 20,
      offset: filters.offset || 0
    }, transformedResult.products, {
      ttl: this.CACHE_TTL
    });

    return transformedResult;
  }

  /**
   * Get single product with caching
   */
  async getProduct(productId: string, businessId?: string, manufacturerId?: string): Promise<any> {
    const cacheKey = `product:${productId}:${businessId || manufacturerId}`;
    
    // Try cache first
    const cached = await enhancedCacheService.getCachedUser(productId, {
      keyPrefix: businessId || manufacturerId
    });

    if (cached) {
      return cached;
    }

    // Build optimized query
    const query: any = { _id: productId };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const product = await Product.findOne(query)
      .populate('media', 'fileName filePath mimeType fileSize')
      .lean(); // Use lean() for better performance

    if (!product) {
      throw new Error('Product not found');
    }

    // Cache the result
    await enhancedCacheService.cacheUser(productId, product, {
      keyPrefix: businessId || manufacturerId,
      ttl: this.CACHE_TTL
    });

    return product;
  }

  /**
   * Update product with cache invalidation
   */
  async updateProduct(
    productId: string,
    updates: Partial<CreateProductData>,
    businessId?: string,
    manufacturerId?: string
  ): Promise<any> {
    const query: any = { _id: productId };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const startTime = Date.now();

    try {
      // Convert specifications to Map if provided
      if (updates.specifications) {
        updates.specifications = new Map(Object.entries(updates.specifications)) as any;
      }

      const product = await Product.findOneAndUpdate(
        query,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).lean();

      if (!product) {
        throw new Error('Product not found or unauthorized');
      }

      // Invalidate caches
      await this.invalidateProductCaches(businessId, manufacturerId);

      const duration = Date.now() - startTime;
      logger.info(`Product updated successfully in ${duration}ms`, {
        productId,
        duration
      });

      return product;

    } catch (error) {
      logger.error('Failed to update product:', error);
      throw error;
    }
  }

  /**
   * Delete product with cache invalidation
   */
  async deleteProduct(
    productId: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<void> {
    const query: any = { _id: productId };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const startTime = Date.now();

    try {
      const result = await Product.deleteOne(query);
      
      if (result.deletedCount === 0) {
        throw new Error('Product not found or unauthorized');
      }

      // Invalidate caches
      await this.invalidateProductCaches(businessId, manufacturerId);

      const duration = Date.now() - startTime;
      logger.info(`Product deleted successfully in ${duration}ms`, {
        productId,
        duration
      });

    } catch (error) {
      logger.error('Failed to delete product:', error);
      throw error;
    }
  }

  /**
   * Search products with full-text search optimization
   */
  async searchProducts(searchParams: {
    query: string;
    businessId?: string;
    manufacturerId?: string;
    category?: string;
    limit?: number;
  }): Promise<any> {
    const { query, businessId, manufacturerId, category, limit = 20 } = searchParams;

    // Use optimized search with text index
    const filters: ProductFilters = {
      query,
      businessId,
      manufacturerId,
      category,
      status: 'active',
      limit
    };

    return await this.getProducts(filters);
  }

  /**
   * Get product analytics with caching
   */
  async getProductAnalytics(
    businessId?: string,
    manufacturerId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<any> {
    const cacheKey = `product_analytics:${businessId || manufacturerId}:${JSON.stringify(dateRange)}`;
    
    // Try cache first
    const cached = await enhancedCacheService.getCachedAnalytics('product', {
      businessId,
      manufacturerId,
      dateRange
    }, { ttl: 600 }); // 10 minutes cache

    if (cached) {
      return cached;
    }

    const pipeline = [];

    // Match stage
    const matchStage: any = { status: 'active' };
    if (businessId) matchStage.business = businessId;
    if (manufacturerId) matchStage.manufacturer = manufacturerId;
    if (dateRange) {
      matchStage.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }

    pipeline.push({ $match: matchStage });

    // Aggregation pipeline
    pipeline.push(
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalVotes: { $sum: '$voteCount' },
          totalCertificates: { $sum: '$certificateCount' },
          totalViews: { $sum: '$viewCount' },
          avgVotes: { $avg: '$voteCount' },
          avgViews: { $avg: '$viewCount' },
          categories: { $addToSet: '$category' },
          avgPrice: { $avg: '$price' }
        }
      },
      {
        $project: {
          _id: 0,
          totalProducts: 1,
          totalVotes: 1,
          totalCertificates: 1,
          totalViews: 1,
          avgVotes: { $round: ['$avgVotes', 2] },
          avgViews: { $round: ['$avgViews', 2] },
          categories: 1,
          avgPrice: { $round: ['$avgPrice', 2] }
        }
      }
    );

    const startTime = Date.now();
    const results = await Product.aggregate(pipeline);
    const duration = Date.now() - startTime;

    const analytics = results[0] || {
      totalProducts: 0,
      totalVotes: 0,
      totalCertificates: 0,
      totalViews: 0,
      avgVotes: 0,
      avgViews: 0,
      categories: [],
      avgPrice: 0
    };

    // Cache the result
    await enhancedCacheService.cacheAnalytics('product', {
      businessId,
      manufacturerId,
      dateRange
    }, analytics, { ttl: 600 });

    logger.info(`Product analytics generated in ${duration}ms`, {
      businessId,
      manufacturerId,
      duration,
      analytics
    });

    return analytics;
  }

  /**
   * Validate media ownership
   */
  private async validateMediaOwnership(mediaIds: string[], ownerId: string): Promise<boolean> {
    const mediaCount = await Media.countDocuments({
      _id: { $in: mediaIds },
      $or: [
        { business: ownerId },
        { manufacturer: ownerId }
      ]
    });

    return mediaCount === mediaIds.length;
  }

  /**
   * Build cache key for product listings
   */
  private buildCacheKey(type: string, params: any): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as any);
    
    return `${type}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Invalidate product-related caches
   */
  private async invalidateProductCaches(businessId?: string, manufacturerId?: string): Promise<void> {
    const tags = ['product_listing', 'product_analytics'];
    
    if (businessId) {
      tags.push(`business:${businessId}`);
    }
    
    if (manufacturerId) {
      tags.push(`manufacturer:${manufacturerId}`);
    }

    await enhancedCacheService.invalidateByTags(tags);
  }

  /**
   * Get products with optimized aggregation (replaces populate)
   */
  async getProductsWithAggregation(filters: ProductFilters): Promise<any> {
    logger.info('Using optimized aggregation for product listing', { filters: Object.keys(filters) });

    try {
      // Build aggregation filters
      const aggregationFilters: any = {};
      if (filters.businessId) aggregationFilters.business = filters.businessId;
      if (filters.manufacturerId) aggregationFilters.manufacturer = filters.manufacturerId;
      if (filters.category) aggregationFilters.category = filters.category;
      if (filters.status) aggregationFilters.status = filters.status;

      const result = await aggregationOptimizationService.getProductsWithRelations(
        aggregationFilters,
        {
          limit: filters.limit || 20,
          skip: filters.offset || 0,
          sort: {
            [filters.sortBy || 'createdAt']: filters.sortOrder === 'asc' ? 1 : -1
          },
          cache: true,
          cacheTTL: this.CACHE_TTL / 1000 // Convert to seconds
        }
      );

      logger.info('Aggregation-based product listing completed', {
        resultCount: result.data.length,
        executionTime: result.executionTime,
        cached: result.cached
      });

      return {
        products: result.data,
        total: result.data.length,
        hasMore: result.data.length === (filters.limit || 20),
        queryTime: result.executionTime,
        optimizationType: 'aggregation',
        cached: result.cached
      };

    } catch (error) {
      logger.error('Aggregation-based product listing failed, falling back to regular query:', error);
      // Fallback to original method
      return this.getProducts(filters);
    }
  }

  /**
   * Get single product with aggregation optimization
   */
  async getProductWithAggregation(productId: string, businessId?: string, manufacturerId?: string): Promise<any> {
    try {
      const filters: any = { _id: productId };
      if (businessId) filters.business = businessId;
      if (manufacturerId) filters.manufacturer = manufacturerId;

      const result = await aggregationOptimizationService.getProductsWithRelations(
        filters,
        {
          limit: 1,
          cache: true,
          cacheTTL: this.CACHE_TTL / 1000
        }
      );

      if (result.data.length === 0) {
        throw new Error('Product not found');
      }

      return result.data[0];

    } catch (error) {
      logger.error('Aggregation-based product fetch failed, falling back:', error);
      return this.getProduct(productId, businessId, manufacturerId);
    }
  }

  /**
   * Get manufacturer products with stats using aggregation
   */
  async getManufacturerProductsWithStats(manufacturerId: string): Promise<any> {
    try {
      const result = await aggregationOptimizationService.getManufacturersWithStats(
        { _id: manufacturerId },
        {
          limit: 1,
          cache: true,
          cacheTTL: 300 // 5 minutes
        }
      );

      if (result.data.length === 0) {
        throw new Error('Manufacturer not found');
      }

      const manufacturer = result.data[0];

      return {
        manufacturer: {
          _id: manufacturer._id,
          name: manufacturer.name,
          industry: manufacturer.industry,
          isVerified: manufacturer.isVerified,
          profileScore: manufacturer.profileScore
        },
        products: manufacturer.recentProducts || [],
        stats: {
          totalProducts: manufacturer.productCount || 0,
          totalVotes: manufacturer.totalVotes || 0,
          totalCertificates: manufacturer.certificateCount || 0,
          avgPrice: manufacturer.avgProductPrice || 0
        },
        executionTime: result.executionTime,
        cached: result.cached
      };

    } catch (error) {
      logger.error('Aggregation-based manufacturer stats failed:', error);
      throw error;
    }
  }

  /**
   * Cache individual product
   */
  private async cacheProduct(productId: string, product: any, options: any): Promise<void> {
    const key = `product:${productId}`;
    await enhancedCacheService.cacheUser(productId, product, {
      keyPrefix: options.keyPrefix || 'ordira',
      ttl: options.ttl || this.CACHE_TTL
    });
  }

  /**
   * Get cached individual product
   */
  private async getCachedProduct(productId: string, options: any): Promise<any> {
    const key = `product:${productId}`;
    return await enhancedCacheService.getCachedUser(productId, {
      keyPrefix: options.keyPrefix || 'ordira'
    });
  }
}

export const productService = new ProductService();

