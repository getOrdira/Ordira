// src/controllers/features/products/productsSearch.controller.ts
// Controller providing search-focused product endpoints

import { Response, NextFunction } from 'express';
import { ProductsBaseController, ProductsBaseRequest } from './productsBase.controller';
import type { ProductSearchParams } from '../../../services/products/utils';

interface SearchProductsQuery extends ProductsBaseRequest {
  validatedQuery?: {
    query: string;
    businessId?: string;
    manufacturerId?: string;
    category?: string;
    limit?: number;
  };
}

interface CategorySearchQuery extends ProductsBaseRequest {
  validatedQuery?: {
    category: string;
    businessId?: string;
    manufacturerId?: string;
    limit?: number;
  };
}

interface TagsSearchQuery extends ProductsBaseRequest {
  validatedQuery?: {
    tags: string[] | string;
    businessId?: string;
    manufacturerId?: string;
    limit?: number;
  };
}

interface PriceSearchQuery extends ProductsBaseRequest {
  validatedQuery?: {
    minPrice: number;
    maxPrice: number;
    businessId?: string;
    manufacturerId?: string;
    limit?: number;
  };
}

interface SimilarProductsRequest extends ProductsBaseRequest {
  validatedParams: {
    productId: string;
  };
  validatedQuery?: {
    limit?: number;
  };
}

interface AutocompleteQuery extends ProductsBaseRequest {
  validatedQuery?: {
    query: string;
    businessId?: string;
    manufacturerId?: string;
    limit?: number;
  };
}

/**
 * ProductsSearchController exposes search capabilities built on product services.
 */
export class ProductsSearchController extends ProductsBaseController {
  /**
   * Search products with full text.
   */
  async searchProducts(req: SearchProductsQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const params = req.validatedQuery;
      if (!params?.query) {
        throw { statusCode: 400, message: 'Search query is required' };
      }

      const validation = this.productServices.validation.validateSearchQuery(params.query);
      if (!validation.valid) {
        throw { statusCode: 400, message: validation.error };
      }

      const searchParams: ProductSearchParams = {
        query: params.query,
        businessId: params.businessId,
        manufacturerId: params.manufacturerId,
        category: params.category,
        limit: this.parseNumber(params.limit, 20, { min: 1, max: 100 }),
      };

      this.recordPerformance(req, 'SEARCH_PRODUCTS');

      const results = await this.productServices.search.searchProducts(searchParams);

      this.logAction(req, 'SEARCH_PRODUCTS_SUCCESS', {
        query: params.query,
        businessId: params.businessId,
        manufacturerId: params.manufacturerId,
        count: results.products.length,
      });

      return results;
    }, res, 'Products search completed', this.getRequestMeta(req));
  }

  /**
   * Search products by category.
   */
  async searchByCategory(req: CategorySearchQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const params = req.validatedQuery;
      if (!params?.category) {
        throw { statusCode: 400, message: 'Category is required' };
      }

      const products = await this.productServices.search.searchByCategory(
        params.category,
        params.businessId,
        params.manufacturerId,
        this.parseNumber(params.limit, 20, { min: 1, max: 100 }),
      );

      this.logAction(req, 'SEARCH_PRODUCTS_BY_CATEGORY_SUCCESS', {
        category: params.category,
        businessId: params.businessId,
        manufacturerId: params.manufacturerId,
        count: products.length,
      });

      return { products };
    }, res, 'Category-based product search completed', this.getRequestMeta(req));
  }

  /**
   * Search products by tags.
   */
  async searchByTags(req: TagsSearchQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const params = req.validatedQuery;
      if (!params?.tags || (Array.isArray(params.tags) && params.tags.length === 0)) {
        throw { statusCode: 400, message: 'At least one tag is required' };
      }

      const tags = Array.isArray(params.tags)
        ? params.tags
        : params.tags.split(',').map(tag => tag.trim()).filter(Boolean);

      const products = await this.productServices.search.searchByTags(
        tags,
        params.businessId,
        params.manufacturerId,
        this.parseNumber(params.limit, 20, { min: 1, max: 100 }),
      );

      this.logAction(req, 'SEARCH_PRODUCTS_BY_TAGS_SUCCESS', {
        tags,
        businessId: params.businessId,
        manufacturerId: params.manufacturerId,
        count: products.length,
      });

      return { products };
    }, res, 'Tag-based product search completed', this.getRequestMeta(req));
  }

  /**
   * Search products by price range.
   */
  async searchByPriceRange(req: PriceSearchQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const params = req.validatedQuery;
      if (params?.minPrice === undefined || params?.maxPrice === undefined) {
        throw { statusCode: 400, message: 'Both minPrice and maxPrice are required' };
      }

      const validation = this.productServices.validation.validatePriceRange(
        Number(params.minPrice),
        Number(params.maxPrice),
      );

      if (!validation.valid) {
        throw { statusCode: 400, message: validation.error };
      }

      const products = await this.productServices.search.searchByPriceRange(
        Number(params.minPrice),
        Number(params.maxPrice),
        params.businessId,
        params.manufacturerId,
        this.parseNumber(params.limit, 20, { min: 1, max: 100 }),
      );

      this.logAction(req, 'SEARCH_PRODUCTS_BY_PRICE_SUCCESS', {
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        businessId: params.businessId,
        manufacturerId: params.manufacturerId,
        count: products.length,
      });

      return { products };
    }, res, 'Price range product search completed', this.getRequestMeta(req));
  }

  /**
   * Retrieve similar products.
   */
  async getSimilarProducts(req: SimilarProductsRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const productId = this.resolveProductId(req);
      const limit = this.parseNumber(req.validatedQuery?.limit, 10, { min: 1, max: 50 });

      this.recordPerformance(req, 'GET_SIMILAR_PRODUCTS');

      const products = await this.productServices.search.getSimilarProducts(productId, limit);

      this.logAction(req, 'GET_SIMILAR_PRODUCTS_SUCCESS', {
        productId,
        count: products.length,
      });

      return { products };
    }, res, 'Similar products retrieved', this.getRequestMeta(req));
  }

  /**
   * Autocomplete product titles.
   */
  async autocomplete(req: AutocompleteQuery, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      this.ensureAuthenticated(req);

      const params = req.validatedQuery;
      if (!params?.query) {
        throw { statusCode: 400, message: 'Query parameter is required' };
      }

      const validation = this.productServices.validation.validateSearchQuery(params.query);
      if (!validation.valid) {
        throw { statusCode: 400, message: validation.error };
      }

      const suggestions = await this.productServices.search.autocomplete(
        params.query,
        params.businessId,
        params.manufacturerId,
        this.parseNumber(params.limit, 10, { min: 1, max: 50 }),
      );

      this.logAction(req, 'PRODUCT_AUTOCOMPLETE_SUCCESS', {
        query: params.query,
        businessId: params.businessId,
        manufacturerId: params.manufacturerId,
        count: suggestions.length,
      });

      return { suggestions };
    }, res, 'Product autocomplete completed', this.getRequestMeta(req));
  }
}

export const productsSearchController = new ProductsSearchController();
