import { Product } from '../../../models/products/product.model';
import { Media } from '../../../models/media/media.model';
import { logger } from '../../infrastructure/logging';
import { productCacheService } from '../utils/cache';
import { ProductAnalyticsResult, ProductStatsOptions, ProductError } from '../utils';
import { validateOwner } from '../utils/helpers';

/**
 * Product account service - Stats, ownership, and account operations
 */
export class ProductAccountService {
  private readonly CACHE_TTL = 600; // 10 minutes for analytics

  /**
   * Get product analytics
   */
  async getProductAnalytics(options: ProductStatsOptions): Promise<ProductAnalyticsResult> {
    const { businessId, manufacturerId, dateRange } = options;
    validateOwner(businessId, manufacturerId);

    // Try cache first
    const cached = await productCacheService.getCachedAnalytics({ businessId, manufacturerId });
    if (cached) {
      logger.info('Product analytics served from cache', { businessId, manufacturerId });
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

    const analytics: ProductAnalyticsResult = results[0] || {
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
    await productCacheService.cacheAnalytics({ businessId, manufacturerId }, analytics, this.CACHE_TTL);

    logger.info('Product analytics generated', {
      businessId,
      manufacturerId,
      duration,
      analytics
    });

    return analytics;
  }

  /**
   * Get product categories for an owner
   */
  async getProductCategories(businessId?: string, manufacturerId?: string): Promise<string[]> {
    validateOwner(businessId, manufacturerId);

    const query: any = { status: 'active' };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const categories = await Product.distinct('category', query);
    return categories.filter(Boolean);
  }

  /**
   * Get product stats summary
   */
  async getProductStats(businessId?: string, manufacturerId?: string): Promise<any> {
    validateOwner(businessId, manufacturerId);

    const query: any = {};
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const [total, active, draft, archived] = await Promise.all([
      Product.countDocuments(query),
      Product.countDocuments({ ...query, status: 'active' }),
      Product.countDocuments({ ...query, status: 'draft' }),
      Product.countDocuments({ ...query, status: 'archived' })
    ]);

    return {
      total,
      byStatus: {
        active,
        draft,
        archived
      }
    };
  }

  /**
   * Validate media ownership before product creation
   */
  async validateMediaOwnership(mediaIds: string[], ownerId: string): Promise<boolean> {
    if (!mediaIds || mediaIds.length === 0) {
      return true; // No media to validate
    }

    try {
      const mediaCount = await Media.countDocuments({
        _id: { $in: mediaIds },
        $or: [
          { business: ownerId },
          { manufacturer: ownerId }
        ]
      });

      return mediaCount === mediaIds.length;
    } catch (error: any) {
      logger.error('Failed to validate media ownership', {
        mediaIds,
        ownerId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get recent products
   */
  async getRecentProducts(
    businessId?: string,
    manufacturerId?: string,
    limit: number = 10
  ): Promise<any[]> {
    validateOwner(businessId, manufacturerId);

    const query: any = { status: 'active' };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    return Product.find(query)
      .select('title description category price viewCount voteCount certificateCount createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get popular products (by views)
   */
  async getPopularProducts(
    businessId?: string,
    manufacturerId?: string,
    limit: number = 10
  ): Promise<any[]> {
    validateOwner(businessId, manufacturerId);

    const query: any = { status: 'active' };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    return Product.find(query)
      .select('title description category price viewCount voteCount certificateCount createdAt')
      .sort({ viewCount: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get top voted products
   */
  async getTopVotedProducts(
    businessId?: string,
    manufacturerId?: string,
    limit: number = 10
  ): Promise<any[]> {
    validateOwner(businessId, manufacturerId);

    const query: any = { status: 'active' };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    return Product.find(query)
      .select('title description category price viewCount voteCount certificateCount createdAt')
      .sort({ voteCount: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Increment product view count
   */
  async incrementViewCount(productId: string): Promise<void> {
    try {
      await Product.findByIdAndUpdate(
        productId,
        { 
          $inc: { viewCount: 1 },
          $set: { lastViewedAt: new Date() }
        }
      );
      
      logger.info('Product view count incremented', { productId });
    } catch (error: any) {
      logger.error('Failed to increment view count', {
        productId,
        error: error.message
      });
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Increment product vote count
   */
  async incrementVoteCount(productId: string): Promise<void> {
    try {
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { voteCount: 1 } }
      );
      
      logger.info('Product vote count incremented', { productId });
    } catch (error: any) {
      logger.error('Failed to increment vote count', {
        productId,
        error: error.message
      });
      throw new ProductError('Failed to increment vote count', 500, 'INCREMENT_ERROR');
    }
  }

  /**
   * Increment product certificate count
   */
  async incrementCertificateCount(productId: string): Promise<void> {
    try {
      await Product.findByIdAndUpdate(
        productId,
        { $inc: { certificateCount: 1 } }
      );
      
      logger.info('Product certificate count incremented', { productId });
    } catch (error: any) {
      logger.error('Failed to increment certificate count', {
        productId,
        error: error.message
      });
      throw new ProductError('Failed to increment certificate count', 500, 'INCREMENT_ERROR');
    }
  }

  /**
   * Check if user owns product
   */
  async isProductOwner(
    productId: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<boolean> {
    if (!businessId && !manufacturerId) {
      return false;
    }

    const query: any = { _id: productId };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const count = await Product.countDocuments(query);
    return count > 0;
  }

  /**
   * Bulk update product status
   */
  async bulkUpdateStatus(
    productIds: string[],
    status: 'draft' | 'active' | 'archived',
    businessId?: string,
    manufacturerId?: string
  ): Promise<{ updated: number }> {
    validateOwner(businessId, manufacturerId);

    const query: any = { 
      _id: { $in: productIds }
    };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const result = await Product.updateMany(
      query,
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      }
    );

    // Invalidate caches
    await productCacheService.invalidateProductCaches(businessId, manufacturerId);

    logger.info('Bulk product status update', {
      productIds: productIds.length,
      status,
      updated: result.modifiedCount
    });

    return { updated: result.modifiedCount };
  }
}

// Export singleton instance
export const productAccountService = new ProductAccountService();



