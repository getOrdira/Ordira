import { Product } from '../../../models/product.model';
import { logger } from '../../../utils/logger';
import { productDataService } from '../core/productData.service';
import { ProductSearchParams, ProductListResult, ProductFilters } from '../utils';

/**
 * Product search service - Full-text search and filtering
 */
export class ProductSearchService {
  /**
   * Search products with full-text search
   */
  async searchProducts(searchParams: ProductSearchParams): Promise<ProductListResult> {
    const { query, businessId, manufacturerId, category, limit = 20 } = searchParams;

    logger.info('Searching products', { 
      query, 
      businessId, 
      manufacturerId, 
      category, 
      limit 
    });

    // Use optimized search with text index
    const filters: ProductFilters = {
      query,
      businessId,
      manufacturerId,
      category,
      status: 'active',
      limit
    };

    return productDataService.getProducts(filters);
  }

  /**
   * Search products by category
   */
  async searchByCategory(
    category: string,
    businessId?: string,
    manufacturerId?: string,
    limit: number = 20
  ): Promise<any[]> {
    const query: any = { 
      category,
      status: 'active'
    };
    
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    return Product.find(query)
      .select('title description category price viewCount voteCount certificateCount createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Search products by tags
   */
  async searchByTags(
    tags: string[],
    businessId?: string,
    manufacturerId?: string,
    limit: number = 20
  ): Promise<any[]> {
    const query: any = { 
      tags: { $in: tags },
      status: 'active'
    };
    
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    return Product.find(query)
      .select('title description category price tags viewCount voteCount certificateCount createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Search products by price range
   */
  async searchByPriceRange(
    minPrice: number,
    maxPrice: number,
    businessId?: string,
    manufacturerId?: string,
    limit: number = 20
  ): Promise<any[]> {
    const query: any = { 
      price: { $gte: minPrice, $lte: maxPrice },
      status: 'active'
    };
    
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    return Product.find(query)
      .select('title description category price viewCount voteCount certificateCount createdAt')
      .sort({ price: 1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get product suggestions based on similarity
   */
  async getSimilarProducts(
    productId: string,
    limit: number = 10
  ): Promise<any[]> {
    // Get the source product
    const sourceProduct = await Product.findById(productId).lean();
    
    if (!sourceProduct) {
      return [];
    }

    // Find similar products based on category and tags
    const query: any = {
      _id: { $ne: productId },
      status: 'active',
      $or: [
        { category: sourceProduct.category },
        { tags: { $in: sourceProduct.tags || [] } }
      ]
    };

    // Match owner type
    if (sourceProduct.business) {
      query.business = sourceProduct.business;
    } else if (sourceProduct.manufacturer) {
      query.manufacturer = sourceProduct.manufacturer;
    }

    return Product.find(query)
      .select('title description category price viewCount voteCount certificateCount createdAt')
      .sort({ viewCount: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Autocomplete product search
   */
  async autocomplete(
    query: string,
    businessId?: string,
    manufacturerId?: string,
    limit: number = 10
  ): Promise<Array<{ id: string; title: string; category?: string }>> {
    const searchQuery: any = {
      title: { $regex: query, $options: 'i' },
      status: 'active'
    };

    if (businessId) searchQuery.business = businessId;
    if (manufacturerId) searchQuery.manufacturer = manufacturerId;

    const products = await Product.find(searchQuery)
      .select('title category')
      .limit(limit)
      .lean();

    return products.map(p => ({
      id: p._id.toString(),
      title: p.title,
      category: p.category
    }));
  }
}

// Export singleton instance
export const productSearchService = new ProductSearchService();

