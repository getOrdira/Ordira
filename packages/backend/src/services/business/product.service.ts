// src/services/business/product.service.ts
import { Product, IProduct } from '../../models/product.model';
import { MediaService } from './media.service';

export interface ProductSummary {
  id: string;
  title: string;
  description?: string;
  media: string[];
  createdAt: Date;
  updatedAt: Date;
  businessId?: string;
  manufacturerId?: string;
  category?: string;
  status: 'draft' | 'active' | 'archived';
  voteCount?: number;
  certificateCount?: number;
}

export interface ProductFilters {
  category?: string;
  status?: 'draft' | 'active' | 'archived';
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasMedia?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'title' | 'voteCount' | 'certificateCount';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  withMedia: number;
  withoutMedia: number;
  averageVotes: number;
  totalVotes: number;
}

export interface CreateProductData {
  title: string;
  description?: string;
  media?: string[];
  category?: string;
  status?: 'draft' | 'active';
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

export interface UpdateProductData extends Partial<CreateProductData> {}

/**
 * Enhanced product management service for brands and manufacturers
 */
export class ProductService {
  private mediaService = new MediaService();

  /**
   * Retrieve all products for a business with enhanced filtering
   */
  async listProducts(
    businessId: string,
    manufacturerId?: string,
    filters: ProductFilters = {}
  ): Promise<{
    products: ProductSummary[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    const query = this.buildProductQuery(businessId, manufacturerId, filters);
    const sortQuery = this.buildSortQuery(filters);

    const [products, total] = await Promise.all([
      Product
        .find(query)
        .sort(sortQuery)
        .skip(offset)
        .limit(limit)
        .populate('media')
        .exec(),
      Product.countDocuments(query)
    ]);

    return {
      products: products.map(this.mapToSummary),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get a single product by ID with ownership verification
   */
  async getProduct(
    productId: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<ProductSummary> {
    const query: any = { _id: productId };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const product = await Product.findOne(query).populate('media');
    if (!product) {
      throw { statusCode: 404, message: 'Product not found.' };
    }

    return this.mapToSummary(product);
  }

  /**
   * Create a new product
   */
  async createProduct(
    data: CreateProductData,
    businessId?: string,
    manufacturerId?: string
  ): Promise<ProductSummary> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    // Validate media IDs if provided
    if (data.media && data.media.length > 0) {
      await this.validateMediaOwnership(data.media, businessId || manufacturerId!);
    }

    const productData: any = {
      title: data.title,
      description: data.description,
      media: data.media || [],
      category: data.category,
      status: data.status || 'draft',
      sku: data.sku,
      price: data.price,
      tags: data.tags || [],
      specifications: data.specifications || {},
      manufacturingDetails: data.manufacturingDetails
    };

    if (businessId) {
      productData.business = businessId;
    }
    if (manufacturerId) {
      productData.manufacturer = manufacturerId;
    }

    const product = await Product.create(productData);
    return this.mapToSummary(product);
  }

  /**
   * Update an existing product
   */
  async updateProduct(
    productId: string,
    data: UpdateProductData,
    businessId?: string,
    manufacturerId?: string
  ): Promise<ProductSummary> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    // Validate media IDs if provided
    if (data.media && data.media.length > 0) {
      await this.validateMediaOwnership(data.media, businessId || manufacturerId!);
    }

    const query: any = { _id: productId };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const product = await Product.findOneAndUpdate(
      query,
      { $set: data },
      { new: true }
    ).populate('media');

    if (!product) {
      throw { statusCode: 404, message: 'Product not found or unauthorized.' };
    }

    return this.mapToSummary(product);
  }

  /**
   * Delete a product
   */
  async deleteProduct(
    productId: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<void> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const query: any = { _id: productId };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const result = await Product.deleteOne(query);
    if (result.deletedCount === 0) {
      throw { statusCode: 404, message: 'Product not found or unauthorized.' };
    }
  }

  /**
   * Get product statistics
   */
  async getProductStats(
    businessId?: string,
    manufacturerId?: string
  ): Promise<ProductStats> {
    if (!businessId && !manufacturerId) {
      throw new Error('Either businessId or manufacturerId must be provided');
    }

    const query: any = {};
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const [statsData, statusStats, categoryStats, mediaStats] = await Promise.all([
      Product.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalVotes: { $sum: '$voteCount' },
            averageVotes: { $avg: '$voteCount' }
          }
        }
      ]),
      Product.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Product.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Product.aggregate([
        { $match: query },
        {
          $project: {
            hasMedia: { $gt: [{ $size: { $ifNull: ['$media', []] } }, 0] }
          }
        },
        {
          $group: {
            _id: '$hasMedia',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const byStatus: Record<string, number> = {};
    statusStats.forEach(stat => {
      byStatus[stat._id || 'unknown'] = stat.count;
    });

    const byCategory: Record<string, number> = {};
    categoryStats.forEach(stat => {
      byCategory[stat._id || 'uncategorized'] = stat.count;
    });

    const mediaStatsMap = mediaStats.reduce((acc, stat) => {
      acc[stat._id ? 'true' : 'false'] = stat.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: statsData[0]?.total || 0,
      byStatus,
      byCategory,
      withMedia: mediaStatsMap['true'] || 0,
      withoutMedia: mediaStatsMap['false'] || 0,
      averageVotes: statsData[0]?.averageVotes || 0,
      totalVotes: statsData[0]?.totalVotes || 0
    };
  }

  /**
   * Search products across the platform (for discovery)
   */
  async searchProducts(
    query: string,
    filters: {
      category?: string;
      userType?: 'brand' | 'manufacturer';
      priceRange?: { min?: number; max?: number };
      location?: string;
      limit?: number;
    } = {}
  ): Promise<ProductSummary[]> {
    const searchQuery: any = {
      status: 'active',
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    if (filters.category) {
      searchQuery.category = filters.category;
    }

    if (filters.userType === 'brand') {
      searchQuery.business = { $exists: true };
    } else if (filters.userType === 'manufacturer') {
      searchQuery.manufacturer = { $exists: true };
    }

    if (filters.priceRange) {
      searchQuery.price = {};
      if (filters.priceRange.min !== undefined) {
        searchQuery.price.$gte = filters.priceRange.min;
      }
      if (filters.priceRange.max !== undefined) {
        searchQuery.price.$lte = filters.priceRange.max;
      }
    }

    const products = await Product
      .find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50)
      .populate('media');

    return products.map(this.mapToSummary);
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    category: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<ProductSummary[]> {
    const query: any = { category, status: 'active' };
    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    const products = await Product
      .find(query)
      .sort({ createdAt: -1 })
      .populate('media');

    return products.map(this.mapToSummary);
  }

  /**
   * Get featured products (highest vote count)
   */
  async getFeaturedProducts(limit: number = 10): Promise<ProductSummary[]> {
    const products = await Product
      .find({ status: 'active' })
      .sort({ voteCount: -1, createdAt: -1 })
      .limit(limit)
      .populate('media');

    return products.map(this.mapToSummary);
  }

  /**
   * Archive/unarchive product
   */
  async toggleArchiveStatus(
    productId: string,
    businessId?: string,
    manufacturerId?: string
  ): Promise<ProductSummary> {
    const product = await this.getProduct(productId, businessId, manufacturerId);
    const newStatus = product.status === 'archived' ? 'active' : 'archived';
    
    return this.updateProduct(productId, { status: newStatus }, businessId, manufacturerId);
  }

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(
    productIds: string[],
    updates: UpdateProductData,
    businessId?: string,
    manufacturerId?: string
  ): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    for (const productId of productIds) {
      try {
        await this.updateProduct(productId, updates, businessId, manufacturerId);
        updated++;
      } catch (error) {
        errors.push(`Failed to update ${productId}: ${error.message}`);
      }
    }

    return { updated, errors };
  }

  /**
   * Get available product categories
   */
  async getAvailableCategories(): Promise<string[]> {
    const categories = await Product.distinct('category', {
      category: { $exists: true, $ne: null },
      status: 'active'
    });

    return categories.filter(category => category && category.trim() !== '');
  }

  /**
   * Increment vote count for a product
   */
  async incrementVoteCount(productId: string): Promise<void> {
    await Product.findByIdAndUpdate(
      productId,
      { $inc: { voteCount: 1 } }
    );
  }

  /**
   * Increment certificate count for a product
   */
  async incrementCertificateCount(productId: string): Promise<void> {
    await Product.findByIdAndUpdate(
      productId,
      { $inc: { certificateCount: 1 } }
    );
  }

  /**
   * Helper methods
   */
  private buildProductQuery(
    businessId?: string,
    manufacturerId?: string,
    filters: ProductFilters = {}
  ): any {
    const query: any = {};

    if (businessId) query.business = businessId;
    if (manufacturerId) query.manufacturer = manufacturerId;

    if (filters.category) {
      query.category = filters.category;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { tags: { $in: [new RegExp(filters.search, 'i')] } }
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo;
      }
    }

    if (filters.hasMedia !== undefined) {
      if (filters.hasMedia) {
        query.media = { $exists: true, $not: { $size: 0 } };
      } else {
        query.$or = [
          { media: { $exists: false } },
          { media: { $size: 0 } }
        ];
      }
    }

    return query;
  }

  private buildSortQuery(filters: ProductFilters = {}): string {
    const sortField = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? '' : '-';
    return `${sortOrder}${sortField}`;
  }

  private async validateMediaOwnership(mediaIds: string[], ownerId: string): Promise<void> {
    // Validate that all media belongs to the owner
    for (const mediaId of mediaIds) {
      try {
        await this.mediaService.getMediaById(mediaId, ownerId);
      } catch (error) {
        throw new Error(`Media ${mediaId} not found or unauthorized`);
      }
    }
  }

  private mapToSummary(product: IProduct): ProductSummary {
    return {
      id: product._id.toString(),
      title: product.title,
      description: product.description,
      media: product.media ? product.media.map(m => m.toString()) : [],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      businessId: product.business?.toString(),
      manufacturerId: (product as any).manufacturer?.toString(), // Type assertion for now
      category: product.category || undefined,
      status: (product.status as 'draft' | 'active' | 'archived') || 'draft',
      voteCount: (product as any).voteCount || 0,
      certificateCount: (product as any).certificateCount || 0
    };
  }
}