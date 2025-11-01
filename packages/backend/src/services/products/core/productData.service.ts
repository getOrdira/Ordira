import { Product } from '../../../models/deprecated/product.model';
import { logger } from '../../../utils/logger';
import { paginationService } from '../../utils/pagination.service';
import { productCacheService } from '../utils/cache';
import { 
  CreateProductData, 
  ProductFilters, 
  ProductListResult,
  ProductLeanDocument,
  ProductError
} from '../utils';
import { 
  validateOwner, 
  getOwnerId, 
  buildProductQuery, 
  buildSortOptions,
  calculatePagination,
  isValidObjectId,
  validateString
} from '../utils/helpers';

/**
 * Product data service - Core CRUD operations and queries
 */
export class ProductDataService {
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Create a product
   */
  async createProduct(
    data: CreateProductData,
    businessId?: string,
    manufacturerId?: string
  ): Promise<any> {
    validateOwner(businessId, manufacturerId);

    const startTime = Date.now();

    try {
      // Create product data
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
      await productCacheService.invalidateProductCaches(businessId, manufacturerId);

      const duration = Date.now() - startTime;
      logger.info('Product created successfully', {
        productId: savedProduct._id,
        businessId,
        manufacturerId,
        duration
      });

      return savedProduct;

    } catch (error: any) {
      logger.error('Failed to create product', { error: error.message });
      throw new ProductError(`Failed to create product: ${error.message}`, 500, 'CREATE_ERROR');
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(
    productId: string, 
    businessId?: string, 
    manufacturerId?: string
  ): Promise<ProductLeanDocument | null> {
    // Validate product ID
    const validation = validateString(productId, 'Product ID');
    if (!validation.valid) {
      throw new ProductError(validation.error!, 400, 'INVALID_PRODUCT_ID');
    }

    if (!isValidObjectId(productId)) {
      throw new ProductError('Invalid product ID format', 400, 'INVALID_PRODUCT_ID');
    }

    // Try cache first
    const ownerId = getOwnerId(businessId, manufacturerId);
    const cached = await productCacheService.getCachedProduct(productId, { keyPrefix: ownerId });
    
    if (cached) {
      logger.info('Product served from cache', { productId });
      return cached;
    }

    // Build query
    const query: any = { _id: productId };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const product = await Product.findOne(query)
      .populate('media', 'fileName filePath mimeType fileSize')
      .lean();

    if (!product) {
      return null;
    }

    // Cache the result
    await productCacheService.cacheProduct(productId, product, {
      keyPrefix: ownerId,
      ttl: this.CACHE_TTL
    });

    return product as ProductLeanDocument;
  }

  /**
   * Get products with pagination and filters
   */
  async getProducts(filters: ProductFilters): Promise<ProductListResult> {
    // Try cache first
    const cachedResult = await productCacheService.getCachedProductListing(filters);
    
    if (cachedResult) {
      logger.info('Product listing served from cache', {
        filters: Object.keys(filters),
        resultsCount: cachedResult.length
      });
      return {
        products: cachedResult,
        hasMore: cachedResult.length === (filters.limit || 20),
        queryTime: 0,
        cached: true
      };
    }

    // Build query
    const query = buildProductQuery(filters);
    const sort = buildSortOptions(filters);
    const { page, limit } = calculatePagination(filters);

    // Use pagination service
    const result = await paginationService.hybridPaginate(Product, query, {
      page,
      limit,
      strategy: 'auto',
      select: 'title description category price status voteCount certificateCount viewCount createdAt business manufacturer',
      sort
    });

    // Transform result
    const transformedResult: ProductListResult = {
      products: result.data,
      total: 'totalCount' in result.pagination ? result.pagination.totalCount : undefined,
      hasMore: result.pagination.hasNext,
      queryTime: result.performance.queryTime,
      pagination: result.pagination
    };

    // Cache the result
    await productCacheService.cacheProductListing(filters, transformedResult.products, this.CACHE_TTL);

    return transformedResult;
  }

  /**
   * Update product
   */
  async updateProduct(
    productId: string,
    updates: Partial<CreateProductData>,
    businessId?: string,
    manufacturerId?: string
  ): Promise<any> {
    // Validate product ID
    if (!isValidObjectId(productId)) {
      throw new ProductError('Invalid product ID format', 400, 'INVALID_PRODUCT_ID');
    }

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
        throw new ProductError('Product not found or unauthorized', 404, 'NOT_FOUND');
      }

      // Invalidate caches
      await productCacheService.invalidateProduct(productId, businessId, manufacturerId);

      const duration = Date.now() - startTime;
      logger.info('Product updated successfully', { productId, duration });

      return product;

    } catch (error: any) {
      logger.error('Failed to update product', { error: error.message });
      if (error instanceof ProductError) {
        throw error;
      }
      throw new ProductError(`Failed to update product: ${error.message}`, 500, 'UPDATE_ERROR');
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(
    productId: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<void> {
    // Validate product ID
    if (!isValidObjectId(productId)) {
      throw new ProductError('Invalid product ID format', 400, 'INVALID_PRODUCT_ID');
    }

    const query: any = { _id: productId };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const startTime = Date.now();

    try {
      const result = await Product.deleteOne(query);
      
      if (result.deletedCount === 0) {
        throw new ProductError('Product not found or unauthorized', 404, 'NOT_FOUND');
      }

      // Invalidate caches
      await productCacheService.invalidateProduct(productId, businessId, manufacturerId);

      const duration = Date.now() - startTime;
      logger.info('Product deleted successfully', { productId, duration });

    } catch (error: any) {
      logger.error('Failed to delete product', { error: error.message });
      if (error instanceof ProductError) {
        throw error;
      }
      throw new ProductError(`Failed to delete product: ${error.message}`, 500, 'DELETE_ERROR');
    }
  }

  /**
   * Get products by owner
   */
  async getProductsByOwner(
    businessId?: string,
    manufacturerId?: string,
    status?: 'draft' | 'active' | 'archived'
  ): Promise<ProductLeanDocument[]> {
    validateOwner(businessId, manufacturerId);

    const query: any = {};
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;
    if (status) query.status = status;

    return Product.find(query)
      .select('title description category price status voteCount certificateCount viewCount createdAt')
      .sort({ createdAt: -1 })
      .lean() as Promise<ProductLeanDocument[]>;
  }

  /**
   * Get product count by owner
   */
  async getProductCount(
    businessId?: string,
    manufacturerId?: string,
    status?: 'draft' | 'active' | 'archived'
  ): Promise<number> {
    validateOwner(businessId, manufacturerId);

    const query: any = {};
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;
    if (status) query.status = status;

    return Product.countDocuments(query);
  }

  /**
   * Check if product exists
   */
  async productExists(productId: string, businessId?: string, manufacturerId?: string): Promise<boolean> {
    if (!isValidObjectId(productId)) {
      return false;
    }

    const query: any = { _id: productId };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const count = await Product.countDocuments(query);
    return count > 0;
  }
}

// Export singleton instance
export const productDataService = new ProductDataService();

