// src/lib/api/features/products/productsAnalytics.api.ts
// Product analytics API aligned with backend routes/features/products/productsAnalytics.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  ProductAnalyticsResult,
  ProductLeanDocument
} from '@/lib/types/features/products';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeOptionalDate } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/products/analytics';

type HttpMethod = 'GET';

const createProductsAnalyticsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'products',
  module: 'analytics',
  method,
  endpoint,
  ...context
});

export interface ProductAnalyticsQuery {
  businessId?: string;
  manufacturerId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}

export interface ProductOwnerScopedAnalyticsQuery {
  businessId?: string;
  manufacturerId?: string;
  days?: number;
  limit?: number;
  months?: number;
}

export interface ProductCategoryAnalytics {
  category: string;
  count: number;
  totalViews: number;
  totalVotes: number;
  totalCertificates?: number;
}

export interface ProductEngagementMetrics {
  totalProducts: number;
  totalViews: number;
  totalVotes: number;
  totalCertificates: number;
  avgViewsPerProduct: number;
  avgVotesPerProduct: number;
  avgCertificatesPerProduct: number;
  maxViews: number;
  maxVotes: number;
}

export interface ProductPerformanceInsights {
  overview: {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
  };
  engagement: ProductEngagementMetrics;
  topPerformers: ProductLeanDocument[];
  categoryBreakdown: ProductCategoryAnalytics[];
  insights: string[];
}

export interface ProductMonthlyTrend {
  year: number;
  month: number;
  count: number;
  totalViews: number;
  totalVotes: number;
}

const sanitizeAnalyticsQuery = (query?: ProductAnalyticsQuery) => {
  if (!query) {
    return undefined;
  }

  const start = sanitizeOptionalDate(query.startDate, 'startDate');
  const end = sanitizeOptionalDate(query.endDate, 'endDate');

  return baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(query.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(query.manufacturerId, 'manufacturerId'),
    start: start ? start.toISOString() : undefined,
    end: end ? end.toISOString() : undefined
  });
};

const sanitizeOwnerScopedQuery = (query?: ProductOwnerScopedAnalyticsQuery) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(query.businessId, 'businessId'),
    manufacturerId: sanitizeOptionalObjectId(query.manufacturerId, 'manufacturerId'),
    days: sanitizeOptionalNumber(query.days, 'days', { integer: true, min: 1, max: 90 }),
    limit: sanitizeOptionalNumber(query.limit, 'limit', { integer: true, min: 1, max: 50 }),
    months: sanitizeOptionalNumber(query.months, 'months', { integer: true, min: 1, max: 24 })
  });
};

export const productsAnalyticsApi = {
  /**
   * Retrieve product analytics summary.
   * GET /api/products/analytics/summary
   */
  async getAnalyticsSummary(query?: ProductAnalyticsQuery): Promise<ProductAnalyticsResult> {
    const endpoint = `${BASE_PATH}/summary`;
    const params = sanitizeAnalyticsQuery(query);

    try {
      const response = await api.get<ApiResponse<{ analytics: ProductAnalyticsResult }>>(endpoint, {
        params
      });
      const { analytics } = baseApi.handleResponse(
        response,
        'Failed to fetch product analytics summary',
        500
      );
      return analytics;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAnalyticsLogContext('GET', endpoint, { hasFilters: Boolean(params) })
      );
    }
  },

  /**
   * Retrieve product category analytics.
   * GET /api/products/analytics/categories
   */
  async getCategoryAnalytics(query?: ProductOwnerScopedAnalyticsQuery): Promise<ProductCategoryAnalytics[]> {
    const endpoint = `${BASE_PATH}/categories`;
    const params = sanitizeOwnerScopedQuery(query);

    try {
      const response = await api.get<ApiResponse<{ categories: ProductCategoryAnalytics[] }>>(endpoint, {
        params
      });
      const { categories } = baseApi.handleResponse(
        response,
        'Failed to fetch product category analytics',
        500
      );
      return categories;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAnalyticsLogContext('GET', endpoint, { hasFilters: Boolean(params) })
      );
    }
  },

  /**
   * Retrieve engagement metrics for an owner.
   * GET /api/products/analytics/engagement
   */
  async getEngagementMetrics(query?: ProductOwnerScopedAnalyticsQuery): Promise<ProductEngagementMetrics> {
    const endpoint = `${BASE_PATH}/engagement`;
    const params = sanitizeOwnerScopedQuery(query);

    try {
      const response = await api.get<ApiResponse<{ metrics: ProductEngagementMetrics }>>(endpoint, {
        params
      });
      const { metrics } = baseApi.handleResponse(
        response,
        'Failed to fetch product engagement metrics',
        500
      );
      return metrics;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAnalyticsLogContext('GET', endpoint, { hasFilters: Boolean(params) })
      );
    }
  },

  /**
   * Retrieve trending products for an owner.
   * GET /api/products/analytics/trending
   */
  async getTrendingProducts(query?: ProductOwnerScopedAnalyticsQuery): Promise<ProductLeanDocument[]> {
    const endpoint = `${BASE_PATH}/trending`;
    const params = sanitizeOwnerScopedQuery(query);

    try {
      const response = await api.get<ApiResponse<{ products: ProductLeanDocument[] }>>(endpoint, {
        params
      });
      const { products } = baseApi.handleResponse(
        response,
        'Failed to fetch trending products',
        500
      );
      return products;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAnalyticsLogContext('GET', endpoint, { hasFilters: Boolean(params) })
      );
    }
  },

  /**
   * Retrieve product performance insights.
   * GET /api/products/analytics/performance
   */
  async getPerformanceInsights(query?: ProductOwnerScopedAnalyticsQuery): Promise<ProductPerformanceInsights> {
    const endpoint = `${BASE_PATH}/performance`;
    const params = sanitizeOwnerScopedQuery(query);

    try {
      const response = await api.get<ApiResponse<{ insights: ProductPerformanceInsights }>>(endpoint, {
        params
      });
      const { insights } = baseApi.handleResponse(
        response,
        'Failed to fetch product performance insights',
        500
      );
      return insights;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAnalyticsLogContext('GET', endpoint, { hasFilters: Boolean(params) })
      );
    }
  },

  /**
   * Retrieve monthly product trends.
   * GET /api/products/analytics/monthly-trends
   */
  async getMonthlyTrends(query?: ProductOwnerScopedAnalyticsQuery): Promise<ProductMonthlyTrend[]> {
    const endpoint = `${BASE_PATH}/monthly-trends`;
    const params = sanitizeOwnerScopedQuery(query);

    try {
      const response = await api.get<ApiResponse<{ trends: ProductMonthlyTrend[] }>>(endpoint, {
        params
      });
      const { trends } = baseApi.handleResponse(
        response,
        'Failed to fetch product monthly trends',
        500
      );
      return trends;
    } catch (error) {
      throw handleApiError(
        error,
        createProductsAnalyticsLogContext('GET', endpoint, { hasFilters: Boolean(params) })
      );
    }
  }
};

export default productsAnalyticsApi;

