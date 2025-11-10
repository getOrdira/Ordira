// src/lib/api/features/brands/brandDiscovery.api.ts
// Brand discovery API aligned with backend routes/features/brands/brandDiscovery.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  BrandCompatibilityResult,
  BrandRecommendation,
  ConnectionOpportunity,
  EcosystemAnalytics,
  SearchSuggestion
} from '@/lib/types/features/brands';
import { ApiError } from '@/lib/errors/errors';
import { handleApiError } from '@/lib/validation/middleware/apiError';

const BASE_PATH = '/brand/discovery';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createBrandLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'brands',
  method,
  endpoint,
  ...context
});

const sanitizeDiscoveryParams = <T extends object>(params?: T) => {
  if (!params) {
    return undefined;
  }
  return baseApi.sanitizeQueryParams({ ...(params as Record<string, unknown>) });
};

export interface DiscoveryRecommendationsParams {
  limit?: number;
  categories?: string[];
  excludeIds?: string[];
}

export interface DiscoveryOpportunitiesParams {
  limit?: number;
  industry?: string;
  location?: string;
  minCompatibility?: number;
}

export interface DiscoveryAnalyticsParams {
  timeframe?: string;
  industry?: string;
  region?: string;
}

export const brandDiscoveryApi = {
  /**
   * Retrieve personalized brand recommendations.
   * GET /api/brand/discovery/recommendations
   */
  async getRecommendations(
    params?: DiscoveryRecommendationsParams,
  ): Promise<BrandRecommendation[]> {
    try {
      const response = await api.get<ApiResponse<{ recommendations: BrandRecommendation[] }>>(
        `${BASE_PATH}/recommendations`,
        { params: sanitizeDiscoveryParams(params) },
      );
      const { recommendations } = baseApi.handleResponse(
        response,
        'Failed to fetch brand recommendations',
        500,
      );
      return recommendations;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/recommendations`, params ? { ...params } : undefined),
      );
    }
  },

  /**
   * Retrieve connection opportunities for brands.
   * GET /api/brand/discovery/opportunities
   */
  async getConnectionOpportunities(
    params?: DiscoveryOpportunitiesParams,
  ): Promise<ConnectionOpportunity[]> {
    try {
      const response = await api.get<ApiResponse<{ opportunities: ConnectionOpportunity[] }>>(
        `${BASE_PATH}/opportunities`,
        { params: sanitizeDiscoveryParams(params) },
      );
      const { opportunities } = baseApi.handleResponse(
        response,
        'Failed to fetch connection opportunities',
        500,
      );
      return opportunities;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/opportunities`, params ? { ...params } : undefined),
      );
    }
  },

  /**
   * Calculate compatibility score between two brands.
   * POST /api/brand/discovery/compatibility
   */
  async calculateCompatibilityScore(
    brandId1: string,
    brandId2: string,
  ): Promise<BrandCompatibilityResult> {
    try {
      const response = await api.post<ApiResponse<{ result: BrandCompatibilityResult }>>(
        `${BASE_PATH}/compatibility`,
        { brandId1, brandId2 },
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to calculate brand compatibility score',
        400,
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('POST', `${BASE_PATH}/compatibility`, { brandId1, brandId2 }),
      );
    }
  },

  /**
   * Retrieve search suggestions for discovery.
   * GET /api/brand/discovery/suggestions
   */
  async getSearchSuggestions(
    query: string,
    limit?: number,
  ): Promise<SearchSuggestion[]> {
    try {
      if (!query?.trim()) {
        throw new ApiError('Query is required for search suggestions', 400, 'VALIDATION_ERROR');
      }
      const response = await api.get<ApiResponse<{ suggestions: SearchSuggestion[] }>>(
        `${BASE_PATH}/suggestions`,
        { params: baseApi.sanitizeQueryParams({ query, limit }) },
      );
      const { suggestions } = baseApi.handleResponse(
        response,
        'Failed to fetch discovery suggestions',
        400,
      );
      return suggestions;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/suggestions`, { query, limit }),
      );
    }
  },

  /**
   * Retrieve ecosystem analytics.
   * GET /api/brand/discovery/analytics
   */
  async getEcosystemAnalytics(
    params?: DiscoveryAnalyticsParams,
  ): Promise<EcosystemAnalytics> {
    try {
      const response = await api.get<ApiResponse<{ analytics: EcosystemAnalytics }>>(
        `${BASE_PATH}/analytics`,
        { params: sanitizeDiscoveryParams(params) },
      );
      const { analytics } = baseApi.handleResponse(
        response,
        'Failed to fetch ecosystem analytics',
        500,
      );
      return analytics;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/analytics`, params ? { ...params } : undefined),
      );
    }
  },
};

export default brandDiscoveryApi;


