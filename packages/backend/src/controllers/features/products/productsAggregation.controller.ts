// src/controllers/features/products/productsAggregation.controller.ts
// Controller mapping aggregation-oriented product queries

import { Response, NextFunction } from 'express';
import { ProductsBaseController, ProductsBaseRequest } from './productsBase.controller';
import type { ProductFilters } from '../../../services/products/utils';

interface AggregationListRequest extends ProductsBaseRequest {
  validatedQuery?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    query?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    priceMin?: number;
    priceMax?: number;
    businessId?: string;
    manufacturerId?: string;
    cache?: boolean;
    cacheTTL?: number;
  };
}

interface ProductParamsRequest extends ProductsBaseRequest {
  validatedParams: {
    productId: string;
  };
  validatedQuery?: {
    businessId?: string;
    manufacturerId?: string;
  };
}

interface ManufacturerStatsRequest extends ProductsBaseRequest {
  validatedParams: {
    manufacturerId: string;
  };
}

interface CategoryAggregationRequest extends ProductsBaseRequest {
  validatedQuery?: {
    businessId?: string;
    manufacturerId?: string;
  };
}

/**
 * ProductsAggregationController exposes optimized aggregation queries.
 */
export class ProductsAggregationController extends ProductsBaseController {
  /**
   * Retrieve products with aggregated relations.
   */
  async getProductsWithRelations(req: AggregationListRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      const pagination = this.parsePagination(req.validatedQuery, 20);
      const filters: ProductFilters = this.buildFilters(req, owner, pagination);

      const cache = this.parseBoolean(req.validatedQuery?.cache, true);
      const cacheTTL = this.parseOptionalNumber(req.validatedQuery?.cacheTTL, { min: 1000, max: 600000 });

      this.recordPerformance(req, 'AGGREGATED_PRODUCTS_WITH_RELATIONS');

      const result = await this.productServices.aggregation.getProductsWithRelations(filters, {
        cache,
        cacheTTL: cacheTTL ?? 300000,
      });

      this.logAction(req, 'AGGREGATED_PRODUCTS_WITH_RELATIONS_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        count: result.products.length,
        cached: result.cached,
      });

      return result;
    }, res, 'Aggregated products retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve a product with its aggregated relations.
   */
  async getProductWithRelations(req: ProductParamsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const productId = this.resolveProductId(req);
      const owner = this.resolveOwner(req, { allowExplicit: true });

      this.recordPerformance(req, 'AGGREGATED_PRODUCT_DETAILS');

      const product = await this.productServices.aggregation.getProductWithRelations(
        productId,
        owner.businessId,
        owner.manufacturerId,
      );

      if (!product) {
        throw { statusCode: 404, message: 'Product not found' };
      }

      this.logAction(req, 'AGGREGATED_PRODUCT_DETAILS_SUCCESS', {
        productId,
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
      });

      return { product };
    }, res, 'Aggregated product retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve manufacturer products alongside statistics.
   */
  async getManufacturerProductsWithStats(req: ManufacturerStatsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const manufacturerId = req.validatedParams.manufacturerId;
      if (!manufacturerId) {
        throw { statusCode: 400, message: 'manufacturerId parameter is required' };
      }

      this.recordPerformance(req, 'AGGREGATED_MANUFACTURER_PRODUCTS');

      const stats = await this.productServices.aggregation.getManufacturerProductsWithStats(manufacturerId);

      this.logAction(req, 'AGGREGATED_MANUFACTURER_PRODUCTS_SUCCESS', {
        manufacturerId,
        productCount: stats.products.length,
        cached: stats.cached,
      });

      return { stats };
    }, res, 'Manufacturer aggregated products retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve products with media relations.
   */
  async getProductsWithMedia(req: AggregationListRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      const pagination = this.parsePagination(req.validatedQuery, 20);
      const filters = this.buildFilters(req, owner, pagination);

      this.recordPerformance(req, 'AGGREGATED_PRODUCTS_WITH_MEDIA');

      const products = await this.productServices.aggregation.getProductsWithMedia(filters);

      this.logAction(req, 'AGGREGATED_PRODUCTS_WITH_MEDIA_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        count: products.length,
      });

      return { products };
    }, res, 'Products with media retrieved', this.getRequestMeta(req));
  }

  /**
   * Retrieve aggregated products by category.
   */
  async getProductsByCategory(req: CategoryAggregationRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const owner = this.resolveOwner(req, { allowExplicit: true });
      this.ensureOwner(owner);

      this.recordPerformance(req, 'AGGREGATED_PRODUCTS_BY_CATEGORY');

      const categories = await this.productServices.aggregation.getProductsByCategory(
        owner.businessId,
        owner.manufacturerId,
      );

      this.logAction(req, 'AGGREGATED_PRODUCTS_BY_CATEGORY_SUCCESS', {
        businessId: owner.businessId,
        manufacturerId: owner.manufacturerId,
        count: categories.length,
      });

      return { categories };
    }, res, 'Products by category aggregation retrieved', this.getRequestMeta(req));
  }
}

export const productsAggregationController = new ProductsAggregationController();
