import { enhancedCacheService } from '../../external/enhanced-cache.service';
import { logger } from '../../../utils/logger';

/**
 * Media cache management service
 */
export class MediaCacheService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly LONG_CACHE_TTL = 3600; // 1 hour for stats
  private readonly SHORT_CACHE_TTL = 60; // 1 minute for search results

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      return await enhancedCacheService.getCachedUser(key);
    } catch (error) {
      logger.warn(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with default TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await enhancedCacheService.cacheUser(key, value, {
        ttl: ttl || this.CACHE_TTL
      });
    } catch (error) {
      logger.warn(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Set cached analytics data with long TTL
   */
  async setAnalytics(type: string, params: any, value: any): Promise<void> {
    try {
      await enhancedCacheService.cacheAnalytics(type, params, value, {
        ttl: this.LONG_CACHE_TTL
      });
    } catch (error) {
      logger.warn(`Cache analytics set error:`, error);
    }
  }

  /**
   * Get cached analytics data
   */
  async getAnalytics(type: string, params: any): Promise<any | null> {
    try {
      return await enhancedCacheService.getCachedAnalytics(type, params);
    } catch (error) {
      logger.warn(`Cache analytics get error:`, error);
      return null;
    }
  }

  /**
   * Set with short TTL (for search results)
   */
  async setShortTerm(key: string, value: any): Promise<void> {
    await this.set(key, value, this.SHORT_CACHE_TTL);
  }

  /**
   * Invalidate media-related caches
   */
  async invalidateMediaCaches(uploaderId: string, category?: string): Promise<void> {
    const tags = [
      `media:${uploaderId}`,
      'media_list',
      'media_search',
      'storage_stats',
      'recent_media'
    ];

    if (category) {
      tags.push(`media_category:${uploaderId}:${category}`);
    }

    try {
      await enhancedCacheService.invalidateByTags(tags);
      logger.info('Media caches invalidated', { uploaderId, category, tags });
    } catch (error) {
      logger.warn('Cache invalidation error:', error);
    }
  }

  /**
   * Get cache TTL values for external use
   */
  getTTLValues() {
    return {
      default: this.CACHE_TTL,
      long: this.LONG_CACHE_TTL,
      short: this.SHORT_CACHE_TTL
    };
  }
}

export const mediaCacheService = new MediaCacheService();

