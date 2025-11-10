// src/lib/api/features/products/productsAccount.api.ts
// Product account API aligned with backend routes/features/products/productsAccount.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  ProductAnalyticsResult,
  ProductLeanDocument
} from '@/lib/types/features/products';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeObjectId,
  sanitizeOptionalDate,
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/products/account';

type HttpMethod = 'GET' | 'POST';

const createProductsAccountLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'products',
  module: 'account',
  method,
  endpoint,
  ...context
});

export interface ProductOwnerParams {
  businessId?: string;
  manufacturerId?: string;
}

export interface ProductAnalyticsParams extends ProductOwnerParams {
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface ProductListParams extends ProductOwnerParams {
  limit?: number;
  status?: 'draft' | 'active' | 'archived';
}

export interface ProductOwnershipParams extends ProductOwnerParams {
  productId: string;
}

export interface BulkUpdateStatusPayload extends ProductOwnerParams {
  productIds: string[];
  status: 'draft' | 'active' | 'archived';
}

export interface ProductStatsSummary {
  total: number;
  byStatus: {
    active: number;
    draft: number;
    archived: number;
  };
}

const sanitizeOwnerQuery = (params?: ProductOwnerParams) => {
  if (!params) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(params.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(params.manufacturerId, 'manufacturerId')
  });
};

const sanitizeAnalyticsQuery = (params?: ProductAnalyticsParams) => {
  if (!params) {
    return undefined;
  }

  const ownerQuery = sanitizeOwnerQuery(params) ?? {};
  const start = sanitizeOptionalDate(params.startDate, 'startDate');
  const end = sanitizeOptionalDate(params.endDate, 'endDate');

  return baseApi.sanitizeQueryParams({
    ...ownerQuery,
    start: start ? start.toISOString() : undefined,
    end: end ? end.toISOString() : undefined
  });
};

const sanitizeListParams = (params?: ProductListParams) => {
  if (!params) {
    return undefined;
  }

  const ownerQuery = sanitizeOwnerQuery(params) ?? {};

  return baseApi.sanitizeQueryParams({
    ...ownerQuery,
    limit: sanitizeOptionalNumber(params.limit, 'limit', { integer: true, min: 1, max: 50 }),
    status: sanitizeOptionalString(params.status, 'status', {
      allowedValues: ['draft', 'active', 'archived'],
      toLowerCase: true,
      trim: true
    })
  });
};

const sanitizeBulkUpdatePayload = (payload: BulkUpdateStatusPayload) => {
  const productIds = sanitizeArray(
    payload.productIds,
    'productIds',
    (value, index) => sanitizeObjectId(value, `productIds[${index}]`),
    { minLength: 1, maxLength: 100 }
  );

  const status = sanitizeString(payload.status, 'status', {
    allowedValues: ['draft', 'active', 'archived'],
    toLowerCase: true,
    trim: true
  }) as 'draft' | 'active' | 'archived';

  return baseApi.sanitizeRequestData({
    productIds,
    status,
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(payload.manufacturerId, 'manufacturerId')
  });
};

export const productsAccountApi = {
  /**
   * Retrieve product analytics summary.
   * GET /api/products/account/analytics
   */
  async getProductAnalytics(params?: ProductAnalyticsParams): Promise<ProductAnalyticsResult> {
    const endpoint = `${BASE_PATH}/analytics`;
    const query = sanitizeAnalyticsQuery(params);

    try {
      const response = await api.get<ApiResponse<{ analytics: ProductAnalyticsResult }>>(endpoint, {
        params: query
      });

      const { analytics } = baseApi.handleResponse(
        response,
        'Failed to fetch product analytics',
        500
      );
      return analytics;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAccountLogContext('GET', endpoint, { hasFilters: Boolean(query) })
      );
    }
  },

  /**
   * Retrieve product categories for an owner.
   * GET /api/products/account/categories
   */
  async getProductCategories(params?: ProductOwnerParams): Promise<string[]> {
    const endpoint = `${BASE_PATH}/categories`;
    const query = sanitizeOwnerQuery(params);

    try {
      const response = await api.get<ApiResponse<{ categories: string[] }>>(endpoint, {
        params: query
      });
      const { categories } = baseApi.handleResponse(
        response,
        'Failed to fetch product categories',
        500
      );
      return categories;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAccountLogContext('GET', endpoint, { hasOwnerFilters: Boolean(query) })
      );
    }
  },

  /**
   * Retrieve aggregated product stats for an owner.
   * GET /api/products/account/stats
   */
  async getProductStats(params?: ProductOwnerParams): Promise<ProductStatsSummary> {
    const endpoint = `${BASE_PATH}/stats`;
    const query = sanitizeOwnerQuery(params);

    try {
      const response = await api.get<ApiResponse<{ stats: ProductStatsSummary }>>(endpoint, {
        params: query
      });
      const { stats } = baseApi.handleResponse(
        response,
        'Failed to fetch product stats',
        500
      );
      return stats;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAccountLogContext('GET', endpoint, { hasOwnerFilters: Boolean(query) })
      );
    }
  },

  /**
   * Retrieve recent products for an owner.
   * GET /api/products/account/recent
   */
  async getRecentProducts(params?: ProductListParams): Promise<ProductLeanDocument[]> {
    const endpoint = `${BASE_PATH}/recent`;
    const query = sanitizeListParams(params);

    try {
      const response = await api.get<ApiResponse<{ products: ProductLeanDocument[] }>>(endpoint, {
        params: query
      });
      const { products } = baseApi.handleResponse(
        response,
        'Failed to fetch recent products',
        500
      );
      return products;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAccountLogContext('GET', endpoint, { hasFilters: Boolean(query) })
      );
    }
  },

  /**
   * Retrieve popular products for an owner.
   * GET /api/products/account/popular
   */
  async getPopularProducts(params?: ProductListParams): Promise<ProductLeanDocument[]> {
    const endpoint = `${BASE_PATH}/popular`;
    const query = sanitizeListParams(params);

    try {
      const response = await api.get<ApiResponse<{ products: ProductLeanDocument[] }>>(endpoint, {
        params: query
      });
      const { products } = baseApi.handleResponse(
        response,
        'Failed to fetch popular products',
        500
      );
      return products;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAccountLogContext('GET', endpoint, { hasFilters: Boolean(query) })
      );
    }
  },

  /**
   * Retrieve top voted products for an owner.
   * GET /api/products/account/top-voted
   */
  async getTopVotedProducts(params?: ProductListParams): Promise<ProductLeanDocument[]> {
    const endpoint = `${BASE_PATH}/top-voted`;
    const query = sanitizeListParams(params);

    try {
      const response = await api.get<ApiResponse<{ products: ProductLeanDocument[] }>>(endpoint, {
        params: query
      });
      const { products } = baseApi.handleResponse(
        response,
        'Failed to fetch top voted products',
        500
      );
      return products;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAccountLogContext('GET', endpoint, { hasFilters: Boolean(query) })
      );
    }
  },

  /**
   * Increment product view count.
   * POST /api/products/account/:productId/increment-view
   */
  async incrementViewCount(productId: string): Promise<boolean> {
    const sanitizedProductId = sanitizeObjectId(productId, 'productId');
    const endpoint = `${BASE_PATH}/${sanitizedProductId}/increment-view`;

    try {
      const response = await api.post<ApiResponse<{ updated: boolean }>>(endpoint);
      const { updated } = baseApi.handleResponse(
        response,
        'Failed to increment product view count',
        400
      );
      return Boolean(updated);
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAccountLogContext('POST', `${BASE_PATH}/:productId/increment-view`, {
          productId: sanitizedProductId
        })
      );
    }
  },

  /**
   * Increment product vote count.
   * POST /api/products/account/:productId/increment-vote
   */
  async incrementVoteCount(productId: string): Promise<boolean> {
    const sanitizedProductId = sanitizeObjectId(productId, 'productId');
    const endpoint = `${BASE_PATH}/${sanitizedProductId}/increment-vote`;

    try {
      const response = await api.post<ApiResponse<{ updated: boolean }>>(endpoint);
      const { updated } = baseApi.handleResponse(
        response,
        'Failed to increment product vote count',
        400
      );
      return Boolean(updated);
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAccountLogContext('POST', `${BASE_PATH}/:productId/increment-vote`, {
          productId: sanitizedProductId
        })
      );
    }
  },

  /**
   * Increment product certificate count.
   * POST /api/products/account/:productId/increment-certificate
   */
  async incrementCertificateCount(productId: string): Promise<boolean> {
    const sanitizedProductId = sanitizeObjectId(productId, 'productId');
    const endpoint = `${BASE_PATH}/${sanitizedProductId}/increment-certificate`;

    try {
      const response = await api.post<ApiResponse<{ updated: boolean }>>(endpoint);
      const { updated } = baseApi.handleResponse(
        response,
        'Failed to increment product certificate count',
        400
      );
      return Boolean(updated);
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAccountLogContext('POST', `${BASE_PATH}/:productId/increment-certificate`, {
          productId: sanitizedProductId
        })
      );
    }
  },

  /**
   * Determine if the authenticated owner controls the product.
   * GET /api/products/account/ownership
   */
  async isProductOwner(params: ProductOwnershipParams): Promise<boolean> {
    const productId = sanitizeObjectId(params.productId, 'productId');
    const query = baseApi.sanitizeQueryParams({
      ...sanitizeOwnerQuery(params),
      productId
    });

    const endpoint = `${BASE_PATH}/ownership`;

    try {
      const response = await api.get<ApiResponse<{ owns: boolean }>>(endpoint, {
        params: query
      });
      const { owns } = baseApi.handleResponse(
        response,
        'Failed to evaluate product ownership',
        500
      );
      return Boolean(owns);
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAccountLogContext('GET', endpoint, { productId, hasOwnerFilters: Boolean(query) })
      );
    }
  },

  /**
   * Bulk update product statuses.
   * POST /api/products/account/bulk-update-status
   */
  async bulkUpdateStatus(payload: BulkUpdateStatusPayload): Promise<number | boolean> {
    const endpoint = `${BASE_PATH}/bulk-update-status`;
    const sanitizedPayload = sanitizeBulkUpdatePayload(payload);

    try {
      const response = await api.post<ApiResponse<{ updated: number | boolean }>>(
        endpoint,
        sanitizedPayload
      );
      const { updated } = baseApi.handleResponse(
        response,
        'Failed to bulk update product statuses',
        400
      );
      return updated;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAccountLogContext('POST', endpoint, {
          status: sanitizedPayload.status,
          productCount: sanitizedPayload.productIds?.length
        })
      );
    }
  }
};

export default productsAccountApi;

