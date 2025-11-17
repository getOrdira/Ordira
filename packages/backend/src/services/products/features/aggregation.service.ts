import { logger } from '../../../utils/logger';
import { aggregationOptimizationService } from '../../infrastructure/database/features/aggregationOptimization.service';
import { ProductFilters, ProductListResult, ManufacturerProductsWithStats, AggregationOptions } from '../utils';

/**
 * Product aggregation service - Optimized aggregation queries
 */
export class ProductAggregationService {
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Get products with aggregated relations
   */
  async getProductsWithRelations(
    filters: ProductFilters,
    options?: AggregationOptions
  ): Promise<ProductListResult> {
    logger.info('Using optimized aggregation for product listing', { 
      filters: Object.keys(filters) 
    });

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
          cache: options?.cache ?? true,
          cacheTTL: (options?.cacheTTL || this.CACHE_TTL) / 1000 // Convert to seconds
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

    } catch (error: any) {
      logger.error('Aggregation-based product listing failed', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get single product with aggregated relations
   */
  async getProductWithRelations(
    productId: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<any> {
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
        return null;
      }

      return result.data[0];

    } catch (error: any) {
      logger.error('Aggregation-based product fetch failed', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get manufacturer products with stats
   */
  async getManufacturerProductsWithStats(
    manufacturerId: string
  ): Promise<ManufacturerProductsWithStats> {
    try {
      const result = await aggregationOptimizationService.getManufacturersWithStats(
        { _id: manufacturerId },
        {
          limit: 1,
          cache: true,
          cacheTTL: this.CACHE_TTL / 1000
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

    } catch (error: any) {
      logger.error('Aggregation-based manufacturer stats failed', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get products with media aggregation
   */
  async getProductsWithMedia(
    filters: ProductFilters
  ): Promise<any[]> {
    try {
      const result = await this.getProductsWithRelations(filters, {
        cache: true,
        cacheTTL: this.CACHE_TTL
      });

      return result.products;

    } catch (error: any) {
      logger.error('Products with media aggregation failed', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get products grouped by category with stats
   */
  async getProductsByCategory(
    businessId?: string,
    manufacturerId?: string
  ): Promise<any[]> {
    try {
      const matchStage: any = { status: 'active' };
      if (businessId) matchStage.business = businessId;
      if (manufacturerId) matchStage.manufacturer = manufacturerId;

      // This would use aggregation optimization service if available
      // For now, return a placeholder that can be implemented
      logger.info('Products by category aggregation', { businessId, manufacturerId });
      
      return [];

    } catch (error: any) {
      logger.error('Products by category aggregation failed', { 
        error: error.message 
      });
      throw error;
    }
  }
}

// Export singleton instance
export const productAggregationService = new ProductAggregationService();

