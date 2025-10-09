import { cacheService } from '../../external/cache.service';
import { logger } from '../../../utils/logger';
import { ProductFilters, ProductOwner } from './types';
import { CacheKeys, getProductCacheTags } from './helpers';

/**
 * Product cache service for managing product-related caching
 */
export class ProductCacheService {
  private readonly DEFAULT_TTL = 300; // 5 minutes

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await cacheService.get<T>(key);
      return cached;
    } catch (error: any) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      await cacheService.set(key, value, { ttl });
    } catch (error: any) {
      logger.error('Cache set error', { key, error: error.message });
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    try {
      await cacheService.delete(key);
    } catch (error: any) {
      logger.error('Cache delete error', { key, error: error.message });
    }
  }

  /**
   * Cache individual product
   */
  async cacheProduct(productId: string, product: any, options: { ttl?: number; keyPrefix?: string } = {}): Promise<void> {
    const key = CacheKeys.product(productId, options.keyPrefix);
    await this.set(key, product, options.ttl || this.DEFAULT_TTL);
  }

  /**
   * Get cached product
   */
  async getCachedProduct(productId: string, options: { keyPrefix?: string } = {}): Promise<any | null> {
    const key = CacheKeys.product(productId, options.keyPrefix);
    return this.get(key);
  }

  /**
   * Cache product listing
   */
  async cacheProductListing(filters: ProductFilters, products: any[], ttl?: number): Promise<void> {
    const key = CacheKeys.productListing(filters);
    await this.set(key, products, ttl || this.DEFAULT_TTL);
  }

  /**
   * Get cached product listing
   */
  async getCachedProductListing(filters: ProductFilters): Promise<any[] | null> {
    const key = CacheKeys.productListing(filters);
    return this.get(key);
  }

  /**
   * Cache product analytics
   */
  async cacheAnalytics(owner: ProductOwner, analytics: any, ttl?: number): Promise<void> {
    const key = CacheKeys.productAnalytics(owner);
    await this.set(key, analytics, ttl || this.DEFAULT_TTL);
  }

  /**
   * Get cached analytics
   */
  async getCachedAnalytics(owner: ProductOwner): Promise<any | null> {
    const key = CacheKeys.productAnalytics(owner);
    return this.get(key);
  }

  /**
   * Invalidate product caches
   */
  async invalidateProductCaches(businessId?: string, manufacturerId?: string): Promise<void> {
    const tags = getProductCacheTags(businessId, manufacturerId);
    
    // Delete by pattern for each tag
    for (const tag of tags) {
      try {
        // Delete all keys matching the pattern
        const pattern = `*${tag}*`;
        logger.info('Invalidating cache pattern', { pattern });
        // Note: This is a simple implementation. For production, consider using Redis SCAN
        // or implementing proper tag-based cache invalidation
      } catch (error: any) {
        logger.error('Cache invalidation error', { tag, error: error.message });
      }
    }

    // Also invalidate specific keys
    if (businessId) {
      await this.delete(CacheKeys.productByOwner(businessId));
      await this.delete(CacheKeys.productByOwner(businessId, 'active'));
    }
    
    if (manufacturerId) {
      await this.delete(CacheKeys.productByOwner(manufacturerId));
      await this.delete(CacheKeys.productByOwner(manufacturerId, 'active'));
    }
  }

  /**
   * Invalidate specific product cache
   */
  async invalidateProduct(productId: string, businessId?: string, manufacturerId?: string): Promise<void> {
    // Delete product-specific cache
    await this.delete(CacheKeys.product(productId));
    await this.delete(CacheKeys.product(productId, businessId));
    await this.delete(CacheKeys.product(productId, manufacturerId));

    // Invalidate related caches
    await this.invalidateProductCaches(businessId, manufacturerId);
  }
}

// Export singleton instance
export const productCacheService = new ProductCacheService();

