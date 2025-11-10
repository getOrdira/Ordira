// src/lib/api/features/products/productsSearch.api.ts
// Product search API aligned with backend routes/features/products/productsSearch.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  ProductListResult,
  ProductLeanDocument
} from '@/lib/types/features/products';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeObjectId,
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/products/search';

type HttpMethod = 'GET';

const createProductsSearchLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'products',
  module: 'search',
  method,
  endpoint,
  ...context
});

export interface ProductSearchFilters {
  query: string;
  businessId?: string;
  manufacturerId?: string;
  category?: string;
  limit?: number;
}

export interface ProductCategorySearchFilters {
  category: string;
  businessId?: string;
  manufacturerId?: string;
  limit?: number;
}

export interface ProductTagsSearchFilters {
  tags: string[];
  businessId?: string;
  manufacturerId?: string;
  limit?: number;
}

export interface ProductPriceSearchFilters {
  minPrice: number;
  maxPrice: number;
  businessId?: string;
  manufacturerId?: string;
  limit?: number;
}

export interface ProductAutocompleteFilters {
  query: string;
  businessId?: string;
  manufacturerId?: string;
  limit?: number;
}

export interface ProductAutocompleteSuggestion {
  id: string;
  title: string;
  category?: string;
}

const sanitizeSearchFilters = (filters: ProductSearchFilters) => {
  const query = sanitizeString(filters.query, 'query', { minLength: 1, maxLength: 500, trim: true });

  return baseApi.sanitizeQueryParams({
    query,
    category: sanitizeOptionalString(filters.category, 'category', { maxLength: 100, trim: true }),
    businessId: sanitizeOptionalObjectId(filters.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(filters.manufacturerId, 'manufacturerId'),
    limit: sanitizeOptionalNumber(filters.limit, 'limit', { integer: true, min: 1, max: 100 })
  });
};

const sanitizeCategoryFilters = (filters: ProductCategorySearchFilters) => {
  return baseApi.sanitizeQueryParams({
    category: sanitizeString(filters.category, 'category', { minLength: 1, maxLength: 100, trim: true }),
    businessId: sanitizeOptionalObjectId(filters.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(filters.manufacturerId, 'manufacturerId'),
    limit: sanitizeOptionalNumber(filters.limit, 'limit', { integer: true, min: 1, max: 100 })
  });
};

const sanitizeTagsFilters = (filters: ProductTagsSearchFilters) => {
  const tags = sanitizeArray(
    filters.tags,
    'tags',
    (value, index) =>
      sanitizeString(value, `tags[${index}]`, {
        minLength: 1,
        maxLength: 50,
        trim: true
      }),
    { minLength: 1, maxLength: 50 }
  );

  return baseApi.sanitizeQueryParams({
    tags,
    businessId: sanitizeOptionalObjectId(filters.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(filters.manufacturerId, 'manufacturerId'),
    limit: sanitizeOptionalNumber(filters.limit, 'limit', { integer: true, min: 1, max: 100 })
  });
};

const sanitizePriceFilters = (filters: ProductPriceSearchFilters) => {
  return baseApi.sanitizeQueryParams({
    minPrice: sanitizeOptionalNumber(filters.minPrice, 'minPrice', { min: 0 }),
    maxPrice: sanitizeOptionalNumber(filters.maxPrice, 'maxPrice', { min: 0 }),
    businessId: sanitizeOptionalObjectId(filters.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(filters.manufacturerId, 'manufacturerId'),
    limit: sanitizeOptionalNumber(filters.limit, 'limit', { integer: true, min: 1, max: 100 })
  });
};

const sanitizeAutocompleteFilters = (filters: ProductAutocompleteFilters) => {
  const query = sanitizeString(filters.query, 'query', { minLength: 1, maxLength: 500, trim: true });

  return baseApi.sanitizeQueryParams({
    query,
    businessId: sanitizeOptionalObjectId(filters.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(filters.manufacturerId, 'manufacturerId'),
    limit: sanitizeOptionalNumber(filters.limit, 'limit', { integer: true, min: 1, max: 50 })
  });
};

export const productsSearchApi = {
  /**
   * Perform full-text product search.
   * GET /api/products/search/search
   */
  async searchProducts(filters: ProductSearchFilters): Promise<ProductListResult> {
    const endpoint = `${BASE_PATH}/search`;
    const params = sanitizeSearchFilters(filters);

    try {
      const response = await api.get<ApiResponse<ProductListResult>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to search products',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProductsSearchLogContext('GET', endpoint, { query: params.query })
      );
    }
  },

  /**
   * Search products by category.
   * GET /api/products/search/by-category
   */
  async searchByCategory(filters: ProductCategorySearchFilters): Promise<ProductLeanDocument[]> {
    const endpoint = `${BASE_PATH}/by-category`;
    const params = sanitizeCategoryFilters(filters);

    try {
      const response = await api.get<ApiResponse<{ products: ProductLeanDocument[] }>>(endpoint, {
        params
      });
      const { products } = baseApi.handleResponse(
        response,
        'Failed to search products by category',
        500
      );
      return products;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsSearchLogContext('GET', endpoint, { category: params.category })
      );
    }
  },

  /**
   * Search products by tags.
   * GET /api/products/search/by-tags
   */
  async searchByTags(filters: ProductTagsSearchFilters): Promise<ProductLeanDocument[]> {
    const endpoint = `${BASE_PATH}/by-tags`;
    const params = sanitizeTagsFilters(filters);

    try {
      const response = await api.get<ApiResponse<{ products: ProductLeanDocument[] }>>(endpoint, {
        params
      });
      const { products } = baseApi.handleResponse(
        response,
        'Failed to search products by tags',
        500
      );
      return products;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsSearchLogContext('GET', endpoint, { tagCount: filters.tags.length })
      );
    }
  },

  /**
   * Search products by price range.
   * GET /api/products/search/by-price
   */
  async searchByPriceRange(filters: ProductPriceSearchFilters): Promise<ProductLeanDocument[]> {
    const endpoint = `${BASE_PATH}/by-price`;
    const params = sanitizePriceFilters(filters);

    try {
      const response = await api.get<ApiResponse<{ products: ProductLeanDocument[] }>>(endpoint, {
        params
      });
      const { products } = baseApi.handleResponse(
        response,
        'Failed to search products by price range',
        500
      );
      return products;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsSearchLogContext('GET', endpoint, {
          minPrice: params.minPrice,
          maxPrice: params.maxPrice
        })
      );
    }
  },

  /**
   * Retrieve similar products.
   * GET /api/products/search/:productId/similar
   */
  async getSimilarProducts(productId: string, limit?: number): Promise<ProductLeanDocument[]> {
    const sanitizedProductId = sanitizeObjectId(productId, 'productId');
    const params = baseApi.sanitizeQueryParams({
      limit: sanitizeOptionalNumber(limit, 'limit', { integer: true, min: 1, max: 50 })
    });
    const endpoint = `${BASE_PATH}/${sanitizedProductId}/similar`;

    try {
      const response = await api.get<ApiResponse<{ products: ProductLeanDocument[] }>>(endpoint, {
        params
      });
      const { products } = baseApi.handleResponse(
        response,
        'Failed to fetch similar products',
        500
      );
      return products;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsSearchLogContext('GET', `${BASE_PATH}/:productId/similar`, {
          productId: sanitizedProductId
        })
      );
    }
  },

  /**
   * Autocomplete product titles.
   * GET /api/products/search/autocomplete
   */
  async autocomplete(filters: ProductAutocompleteFilters): Promise<ProductAutocompleteSuggestion[]> {
    const endpoint = `${BASE_PATH}/autocomplete`;
    const params = sanitizeAutocompleteFilters(filters);

    try {
      const response = await api.get<ApiResponse<{ suggestions: ProductAutocompleteSuggestion[] }>>(endpoint, {
        params
      });
      const { suggestions } = baseApi.handleResponse(
        response,
        'Failed to fetch product autocomplete suggestions',
        500
      );
      return suggestions;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsSearchLogContext('GET', endpoint, { query: params.query })
      );
    }
  }
};

export default productsSearchApi;

