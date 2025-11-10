// src/lib/api/features/products/productsAggregation.api.ts
// Product aggregation API aligned with backend routes/features/products/productsAggregation.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  AggregationOptions,
  ProductFilters,
  ProductListResult,
  ProductWithRelations,
  ManufacturerProductsWithStats
} from '@/lib/types/features/products';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/products/aggregation';

type HttpMethod = 'GET';

const createProductsAggregationLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'products',
  module: 'aggregation',
  method,
  endpoint,
  ...context
});

export interface ProductAggregationFilters extends ProductFilters {
  page?: number;
  limit?: number;
  query?: string;
  search?: string;
  cache?: boolean;
  cacheTTL?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductAggregationOptions extends AggregationOptions {
  cache?: boolean;
  cacheTTL?: number;
}

export interface ProductOwnerScopedParams {
  businessId?: string;
  manufacturerId?: string;
}

const sanitizeAggregationFilters = (filters?: ProductAggregationFilters) => {
  if (!filters) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    page: sanitizeOptionalNumber(filters.page, 'page', { integer: true, min: 1 }),
    limit: sanitizeOptionalNumber(filters.limit, 'limit', { integer: true, min: 1, max: 100 }),
    status: sanitizeOptionalString(filters.status, 'status', {
      allowedValues: ['draft', 'active', 'archived'],
      toLowerCase: true,
      trim: true
    }),
    category: sanitizeOptionalString(filters.category, 'category', { maxLength: 100, trim: true }),
    query: sanitizeOptionalString(filters.query, 'query', { maxLength: 500, trim: true }),
    search: sanitizeOptionalString(filters.search, 'search', { maxLength: 500, trim: true }),
    sortBy: sanitizeOptionalString(filters.sortBy, 'sortBy', { maxLength: 50, trim: true }),
    sortOrder: sanitizeOptionalString(filters.sortOrder, 'sortOrder', {
      allowedValues: ['asc', 'desc'],
      toLowerCase: true,
      trim: true
    }),
    priceMin: sanitizeOptionalNumber(filters.priceMin, 'priceMin', { min: 0 }),
    priceMax: sanitizeOptionalNumber(filters.priceMax, 'priceMax', { min: 0 }),
    businessId: sanitizeOptionalObjectId(filters.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(filters.manufacturerId, 'manufacturerId'),
    cache: sanitizeOptionalBoolean(filters.cache, 'cache'),
    cacheTTL: sanitizeOptionalNumber(filters.cacheTTL, 'cacheTTL', {
      integer: true,
      min: 1000,
      max: 600000
    })
  });
};

const sanitizeOwnerParams = (params?: ProductOwnerScopedParams) => {
  if (!params) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(params.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(params.manufacturerId, 'manufacturerId')
  });
};

export const productsAggregationApi = {
  /**
   * Retrieve products with aggregated relations.
   * GET /api/products/aggregation/with-relations
   */
  async getProductsWithRelations(filters?: ProductAggregationFilters): Promise<ProductListResult> {
    const endpoint = `${BASE_PATH}/with-relations`;
    const params = sanitizeAggregationFilters(filters);

    try {
      const response = await api.get<ApiResponse<ProductListResult>>(endpoint, {
        params
      });
      const result = baseApi.handleResponse(
        response,
        'Failed to fetch aggregated products',
        500
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAggregationLogContext('GET', endpoint, {
          hasFilters: Boolean(params && Object.keys(params).length > 0)
        })
      );
    }
  },

  /**
   * Retrieve a single product with aggregated relations.
   * GET /api/products/aggregation/:productId/with-relations
   */
  async getProductWithRelations(
    productId: string,
    params?: ProductOwnerScopedParams
  ): Promise<ProductWithRelations | null> {
    const sanitizedProductId = sanitizeObjectId(productId, 'productId');
    const query = sanitizeOwnerParams(params);
    const endpoint = `${BASE_PATH}/${sanitizedProductId}/with-relations`;

    try {
      const response = await api.get<ApiResponse<{ product: ProductWithRelations | null }>>(endpoint, {
        params: query
      });
      const { product } = baseApi.handleResponse(
        response,
        'Failed to fetch aggregated product',
        500
      );
      return product ?? null;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAggregationLogContext('GET', `${BASE_PATH}/:productId/with-relations`, {
          productId: sanitizedProductId,
          hasOwnerFilters: Boolean(query && Object.keys(query).length > 0)
        })
      );
    }
  },

  /**
   * Retrieve manufacturer products with stats.
   * GET /api/products/aggregation/manufacturer/:manufacturerId/stats
   */
  async getManufacturerProductsWithStats(
    manufacturerId: string
  ): Promise<ManufacturerProductsWithStats> {
    const sanitizedManufacturerId = sanitizeObjectId(manufacturerId, 'manufacturerId');
    const endpoint = `${BASE_PATH}/manufacturer/${sanitizedManufacturerId}/stats`;

    try {
      const response = await api.get<ApiResponse<{ stats: ManufacturerProductsWithStats }>>(endpoint);
      const { stats } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer product stats',
        500
      );
      return stats;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAggregationLogContext('GET', `${BASE_PATH}/manufacturer/:manufacturerId/stats`, {
          manufacturerId: sanitizedManufacturerId
        })
      );
    }
  },

  /**
   * Retrieve products enriched with media data.
   * GET /api/products/aggregation/with-media
   */
  async getProductsWithMedia(filters?: ProductAggregationFilters): Promise<ProductWithRelations[]> {
    const endpoint = `${BASE_PATH}/with-media`;
    const params = sanitizeAggregationFilters(filters);

    try {
      const response = await api.get<ApiResponse<{ products: ProductWithRelations[] }>>(endpoint, {
        params
      });
      const { products } = baseApi.handleResponse(
        response,
        'Failed to fetch products with media',
        500
      );
      return products;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAggregationLogContext('GET', endpoint, {
          hasFilters: Boolean(params && Object.keys(params).length > 0)
        })
      );
    }
  },

  /**
   * Retrieve aggregated products grouped by category.
   * GET /api/products/aggregation/by-category
   */
  async getProductsByCategory(params?: ProductOwnerScopedParams): Promise<unknown[]> {
    const endpoint = `${BASE_PATH}/by-category`;
    const query = sanitizeOwnerParams(params);

    try {
      const response = await api.get<ApiResponse<{ categories: unknown[] }>>(endpoint, {
        params: query
      });
      const { categories } = baseApi.handleResponse(
        response,
        'Failed to fetch products by category',
        500
      );
      return categories;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAggregationLogContext('GET', endpoint, {
          hasOwnerFilters: Boolean(query && Object.keys(query).length > 0)
        })
      );
    }
  }
};

export default productsAggregationApi;

