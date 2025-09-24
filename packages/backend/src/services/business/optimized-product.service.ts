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
export class OptimizedProductService {
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
   * Get products with optimized queries and caching
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

    // Use optimized query service
    const result = await queryOptimizationService.optimizedProductSearch(filters, Product);

    // Cache the result
    await enhancedCacheService.cacheProductListing(filters, result.products, {
      ttl: this.CACHE_TTL
    });

    return result;
  }

  /**
   * Get single product with caching
   */
  async getProduct(productId: string, businessId?: string, manufacturerId?: string): Promise<any> {
    const cacheKey = `product:${productId}:${businessId || manufacturerId}`;
    
    // Try cache first
    const cached = await enhancedCacheService.getCachedProduct(productId, {
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
    await enhancedCacheService.cacheProduct(productId, product, {
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

export const optimizedProductService = new OptimizedProductService();

