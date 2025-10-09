import { Product } from '../../../models/product.model';
import { logger } from '../../../utils/logger';
import { productAccountService } from '../core/productAccount.service';
import { ProductAnalyticsResult, ProductStatsOptions } from '../utils';

/**
 * Product analytics service - Analytics and insights
 */
export class ProductAnalyticsService {
  /**
   * Get comprehensive product analytics
   */
  async getAnalytics(options: ProductStatsOptions): Promise<ProductAnalyticsResult> {
    return productAccountService.getProductAnalytics(options);
  }

  /**
   * Get category-wise analytics
   */
  async getCategoryAnalytics(
    businessId?: string,
    manufacturerId?: string
  ): Promise<Array<{ category: string; count: number; totalViews: number; totalVotes: number }>> {
    const matchStage: any = { status: 'active' };
    if (businessId) matchStage.business = businessId;
    if (manufacturerId) matchStage.manufacturer = manufacturerId;

    const results = await Product.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalVotes: { $sum: '$voteCount' },
          totalCertificates: { $sum: '$certificateCount' }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1,
          totalViews: 1,
          totalVotes: 1,
          totalCertificates: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    return results;
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(
    businessId?: string,
    manufacturerId?: string
  ): Promise<any> {
    const matchStage: any = { status: 'active' };
    if (businessId) matchStage.business = businessId;
    if (manufacturerId) matchStage.manufacturer = manufacturerId;

    const results = await Product.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalVotes: { $sum: '$voteCount' },
          totalCertificates: { $sum: '$certificateCount' },
          avgViewsPerProduct: { $avg: '$viewCount' },
          avgVotesPerProduct: { $avg: '$voteCount' },
          avgCertificatesPerProduct: { $avg: '$certificateCount' },
          maxViews: { $max: '$viewCount' },
          maxVotes: { $max: '$voteCount' }
        }
      },
      {
        $project: {
          _id: 0,
          totalProducts: 1,
          totalViews: 1,
          totalVotes: 1,
          totalCertificates: 1,
          avgViewsPerProduct: { $round: ['$avgViewsPerProduct', 2] },
          avgVotesPerProduct: { $round: ['$avgVotesPerProduct', 2] },
          avgCertificatesPerProduct: { $round: ['$avgCertificatesPerProduct', 2] },
          maxViews: 1,
          maxVotes: 1
        }
      }
    ]);

    return results[0] || {
      totalProducts: 0,
      totalViews: 0,
      totalVotes: 0,
      totalCertificates: 0,
      avgViewsPerProduct: 0,
      avgVotesPerProduct: 0,
      avgCertificatesPerProduct: 0,
      maxViews: 0,
      maxVotes: 0
    };
  }

  /**
   * Get trending products (high engagement recently)
   */
  async getTrendingProducts(
    businessId?: string,
    manufacturerId?: string,
    days: number = 7,
    limit: number = 10
  ): Promise<any[]> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const matchStage: any = {
      status: 'active',
      lastViewedAt: { $gte: dateThreshold }
    };
    
    if (businessId) matchStage.business = businessId;
    if (manufacturerId) matchStage.manufacturer = manufacturerId;

    return Product.find(matchStage)
      .select('title description category price viewCount voteCount certificateCount lastViewedAt createdAt')
      .sort({ viewCount: -1, voteCount: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get product performance insights
   */
  async getPerformanceInsights(
    businessId?: string,
    manufacturerId?: string
  ): Promise<any> {
    const [
      totalProducts,
      activeProducts,
      engagementMetrics,
      topProducts,
      categoryAnalytics
    ] = await Promise.all([
      Product.countDocuments({ 
        ...(businessId ? { business: businessId } : {}),
        ...(manufacturerId ? { manufacturer: manufacturerId } : {})
      }),
      Product.countDocuments({ 
        ...(businessId ? { business: businessId } : {}),
        ...(manufacturerId ? { manufacturer: manufacturerId } : {}),
        status: 'active'
      }),
      this.getEngagementMetrics(businessId, manufacturerId),
      productAccountService.getTopVotedProducts(businessId, manufacturerId, 5),
      this.getCategoryAnalytics(businessId, manufacturerId)
    ]);

    return {
      overview: {
        totalProducts,
        activeProducts,
        inactiveProducts: totalProducts - activeProducts
      },
      engagement: engagementMetrics,
      topPerformers: topProducts,
      categoryBreakdown: categoryAnalytics,
      insights: this.generateInsights(engagementMetrics, categoryAnalytics)
    };
  }

  /**
   * Generate actionable insights
   */
  private generateInsights(engagement: any, categories: any[]): string[] {
    const insights: string[] = [];

    // Engagement insights
    if (engagement.avgViewsPerProduct > 100) {
      insights.push('Your products are getting strong visibility');
    } else if (engagement.avgViewsPerProduct < 10) {
      insights.push('Consider improving product visibility and marketing');
    }

    if (engagement.avgVotesPerProduct > 10) {
      insights.push('High voter engagement - your products resonate with customers');
    } else if (engagement.avgVotesPerProduct < 2) {
      insights.push('Consider encouraging more customer votes and reviews');
    }

    // Category insights
    if (categories.length > 5) {
      insights.push('You have a diverse product portfolio across multiple categories');
    } else if (categories.length === 1) {
      insights.push('Consider expanding into related product categories');
    }

    const topCategory = categories[0];
    if (topCategory && topCategory.count > engagement.totalProducts * 0.5) {
      insights.push(`${topCategory.category} is your dominant category`);
    }

    return insights;
  }

  /**
   * Get monthly product trends
   */
  async getMonthlyTrends(
    businessId?: string,
    manufacturerId?: string,
    months: number = 6
  ): Promise<any[]> {
    const dateThreshold = new Date();
    dateThreshold.setMonth(dateThreshold.getMonth() - months);

    const matchStage: any = {
      createdAt: { $gte: dateThreshold }
    };
    
    if (businessId) matchStage.business = businessId;
    if (manufacturerId) matchStage.manufacturer = manufacturerId;

    const results = await Product.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalVotes: { $sum: '$voteCount' }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          count: 1,
          totalViews: 1,
          totalVotes: 1
        }
      },
      { $sort: { year: 1, month: 1 } }
    ]);

    return results;
  }
}

// Export singleton instance
export const productAnalyticsService = new ProductAnalyticsService();

