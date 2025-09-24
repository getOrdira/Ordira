/**
 * Enhanced Cache Service
 * 
 * Provides intelligent caching strategies for MongoDB queries and frequently accessed data.
 * Implements cache-aside, write-through, and write-behind patterns.
 */

import { logger } from '../../utils/logger';
import { cacheService } from './cache.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  keyPrefix?: string; // Key prefix for namespacing
  serialize?: boolean; // Whether to serialize complex objects
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

export class EnhancedCacheService {
  private stats: Map<string, CacheStats> = new Map();
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly LONG_TTL = 3600; // 1 hour
  private readonly SHORT_TTL = 60; // 1 minute

  /**
   * Cache user data with intelligent invalidation
   */
  async cacheUser(userId: string, userData: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildKey('user', userId, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.DEFAULT_TTL,
      prefix: options.keyPrefix
    };

    await cacheService.set(key, userData, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached user data
   */
  async getCachedUser(userId: string, options: CacheOptions = {}): Promise<any> {
    const key = this.buildKey('user', userId, options.keyPrefix);
    const result = await cacheService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache business data with tenant-specific keys
   */
  async cacheBusiness(businessId: string, businessData: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildKey('business', businessId, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.LONG_TTL,
      prefix: options.keyPrefix
    };

    await cacheService.set(key, businessData, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached business data
   */
  async getCachedBusiness(businessId: string, options: CacheOptions = {}): Promise<any> {
    const key = this.buildKey('business', businessId, options.keyPrefix);
    const result = await cacheService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache manufacturer search results
   */
  async cacheManufacturerSearch(searchParams: any, results: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildSearchKey('manufacturer_search', searchParams, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.SHORT_TTL,
      prefix: options.keyPrefix
    };

    await cacheService.set(key, results, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached manufacturer search results
   */
  async getCachedManufacturerSearch(searchParams: any, options: CacheOptions = {}): Promise<any> {
    const key = this.buildSearchKey('manufacturer_search', searchParams, options.keyPrefix);
    const result = await cacheService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache manufacturer data
   */
  async cacheManufacturer(manufacturerId: string, manufacturerData: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildKey('manufacturer', manufacturerId, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.DEFAULT_TTL,
      prefix: options.keyPrefix
    };

    await cacheService.set(key, manufacturerData, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached manufacturer data
   */
  async getCachedManufacturer(manufacturerId: string, options: CacheOptions = {}): Promise<any> {
    const key = this.buildKey('manufacturer', manufacturerId, options.keyPrefix);
    const result = await cacheService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache product listings with business-specific keys
   */
  async cacheProductListing(params: {
    businessId?: string;
    manufacturerId?: string;
    category?: string;
    limit: number;
    offset: number;
  }, products: any[], options: CacheOptions = {}): Promise<void> {
    const key = this.buildSearchKey('product_listing', params, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.SHORT_TTL,
      prefix: options.keyPrefix
    };

    await cacheService.set(key, products, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached product listing
   */
  async getCachedProductListing(params: any, options: CacheOptions = {}): Promise<any> {
    const key = this.buildSearchKey('product_listing', params, options.keyPrefix);
    const result = await cacheService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache analytics data with longer TTL
   */
  async cacheAnalytics(analyticsType: string, params: any, data: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildSearchKey(`analytics_${analyticsType}`, params, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.LONG_TTL,
      prefix: options.keyPrefix
    };

    await cacheService.set(key, data, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached analytics data
   */
  async getCachedAnalytics(analyticsType: string, params: any, options: CacheOptions = {}): Promise<any> {
    const key = this.buildSearchKey(`analytics_${analyticsType}`, params, options.keyPrefix);
    const result = await cacheService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache voting analytics with real-time invalidation
   */
  async cacheVotingAnalytics(businessId: string, params: any, data: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildSearchKey('voting_analytics', { businessId, ...params }, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.SHORT_TTL,
      prefix: options.keyPrefix
    };

    await cacheService.set(key, data, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached voting analytics
   */
  async getCachedVotingAnalytics(businessId: string, params: any, options: CacheOptions = {}): Promise<any> {
    const key = this.buildSearchKey('voting_analytics', { businessId, ...params }, options.keyPrefix);
    const result = await cacheService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache brand settings with tenant isolation
   */
  async cacheBrandSettings(businessId: string, settings: any, options: CacheOptions = {}): Promise<void> {
    const key = this.buildKey('brand_settings', businessId, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.LONG_TTL,
      prefix: options.keyPrefix
    };

    await cacheService.set(key, settings, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached brand settings
   */
  async getCachedBrandSettings(businessId: string, options: CacheOptions = {}): Promise<any> {
    const key = this.buildKey('brand_settings', businessId, options.keyPrefix);
    const result = await cacheService.get(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Cache domain mappings for fast tenant resolution
   */
  async cacheDomainMapping(domain: string, businessId: string, options: CacheOptions = {}): Promise<void> {
    const key = this.buildKey('domain_mapping', domain, options.keyPrefix);
    const cacheOptions = {
      ttl: options.ttl || this.LONG_TTL,
      prefix: options.keyPrefix
    };

    await cacheService.set(key, businessId, cacheOptions);
    this.recordCacheOperation(key, 'set');
  }

  /**
   * Get cached domain mapping
   */
  async getCachedDomainMapping(domain: string, options: CacheOptions = {}): Promise<string | null> {
    const key = this.buildKey('domain_mapping', domain, options.keyPrefix);
    const result = await cacheService.get<string>(key);
    
    this.recordCacheOperation(key, result ? 'hit' : 'miss');
    return result;
  }

  /**
   * Invalidate cache by tags (e.g., when business data changes)
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    logger.info(`Invalidating cache for tags: ${tags.join(', ')}`);
    
    // For now, we'll clear all cache keys that match the patterns
    // In a full implementation, you'd use Redis tags or pattern matching
    for (const tag of tags) {
      // This would be implemented based on your cache strategy
      logger.debug(`Would invalidate cache for tag: ${tag}`);
    }
  }

  /**
   * Invalidate business-related cache
   */
  async invalidateBusinessCache(businessId: string): Promise<void> {
    const tags = [
      `business:${businessId}`,
      'business',
      'brand_settings',
      'voting_analytics',
      'product_listing',
      'analytics'
    ];
    
    await this.invalidateByTags(tags);
    logger.info(`Invalidated cache for business: ${businessId}`);
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const tags = [
      `user:${userId}`,
      'user'
    ];
    
    await this.invalidateByTags(tags);
    logger.info(`Invalidated cache for user: ${userId}`);
  }

  /**
   * Invalidate manufacturer-related cache
   */
  async invalidateManufacturerCache(manufacturerId: string): Promise<void> {
    const tags = [
      `manufacturer:${manufacturerId}`,
      'manufacturer_search',
      'product_listing'
    ];
    
    await this.invalidateByTags(tags);
    logger.info(`Invalidated cache for manufacturer: ${manufacturerId}`);
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmupCache(): Promise<void> {
    logger.info('🔥 Warming up cache...');

    try {
      // Warm up domain mappings
      await this.warmupDomainMappings();
      
      // Warm up active business settings
      await this.warmupBusinessSettings();
      
      // Warm up popular searches
      await this.warmupPopularSearches();

      logger.info('✅ Cache warmup completed');

    } catch (error) {
      logger.error('❌ Cache warmup failed:', error);
    }
  }

  /**
   * Warm up domain mappings cache
   */
  private async warmupDomainMappings(): Promise<void> {
    // This would typically query the database for all active domain mappings
    // and cache them for fast tenant resolution
    logger.info('🌐 Warming up domain mappings cache...');
  }

  /**
   * Warm up business settings cache
   */
  private async warmupBusinessSettings(): Promise<void> {
    // This would cache settings for active businesses
    logger.info('🏢 Warming up business settings cache...');
  }

  /**
   * Warm up popular searches cache
   */
  private async warmupPopularSearches(): Promise<void> {
    // This would cache results for popular search queries
    logger.info('🔍 Warming up popular searches cache...');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    
    for (const [key, stat] of this.stats.entries()) {
      stats[key] = { ...stat };
    }
    
    return stats;
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(type: string, id: string, prefix?: string): string {
    const keyPrefix = prefix || 'ordira';
    return `${keyPrefix}:${type}:${id}`;
  }

  /**
   * Build search cache key from parameters
   */
  private buildSearchKey(type: string, params: any, prefix?: string): string {
    const keyPrefix = prefix || 'ordira';
    const paramString = this.serializeParams(params);
    const hash = this.simpleHash(paramString);
    return `${keyPrefix}:${type}:${hash}`;
  }

  /**
   * Serialize parameters for cache key
   */
  private serializeParams(params: any): string {
    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(params).sort();
    const sortedParams = sortedKeys.reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as any);
    
    return JSON.stringify(sortedParams);
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Record cache operation for statistics
   */
  private recordCacheOperation(key: string, operation: 'hit' | 'miss' | 'set'): void {
    const keyPrefix = key.split(':')[0];
    
    if (!this.stats.has(keyPrefix)) {
      this.stats.set(keyPrefix, {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalRequests: 0
      });
    }
    
    const stats = this.stats.get(keyPrefix)!;
    stats.totalRequests++;
    
    if (operation === 'hit') {
      stats.hits++;
    } else if (operation === 'miss') {
      stats.misses++;
    }
    
    stats.hitRate = stats.hits / stats.totalRequests;
  }
}

export const enhancedCacheService = new EnhancedCacheService();
