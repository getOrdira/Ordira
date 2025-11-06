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

const BASE_PATH = '/brand/discovery';

const clean = (params?: Record<string, unknown>) => {
  if (!params) {
    return undefined;
  }
  return Object.entries(params).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
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
        { params: clean(params) },
      );
      const { recommendations } = baseApi.handleResponse(
        response,
        'Failed to fetch brand recommendations',
        500,
      );
      return recommendations;
    } catch (error) {
      console.error('Brand discovery recommendations error:', error);
      throw error;
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
        { params: clean(params) },
      );
      const { opportunities } = baseApi.handleResponse(
        response,
        'Failed to fetch connection opportunities',
        500,
      );
      return opportunities;
    } catch (error) {
      console.error('Brand discovery opportunities error:', error);
      throw error;
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
      console.error('Brand compatibility score calculation error:', error);
      throw error;
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
      const response = await api.get<ApiResponse<{ suggestions: SearchSuggestion[] }>>(
        `${BASE_PATH}/suggestions`,
        { params: clean({ query, limit }) },
      );
      const { suggestions } = baseApi.handleResponse(
        response,
        'Failed to fetch discovery suggestions',
        400,
      );
      return suggestions;
    } catch (error) {
      console.error('Brand discovery suggestions error:', error);
      throw error;
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
        { params: clean(params) },
      );
      const { analytics } = baseApi.handleResponse(
        response,
        'Failed to fetch ecosystem analytics',
        500,
      );
      return analytics;
    } catch (error) {
      console.error('Brand discovery analytics error:', error);
      throw error;
    }
  },
};

export default brandDiscoveryApi;


