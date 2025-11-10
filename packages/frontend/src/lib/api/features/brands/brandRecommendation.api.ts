// src/lib/api/features/brands/brandRecommendation.api.ts
// Brand recommendation API aligned with backend routes/features/brands/brandRecommendation.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { Recommendation } from '@/lib/types/features/brands';
import { handleApiError } from '@/lib/validation/middleware/apiError';

const BASE_PATH = '/brand/recommendation';

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

const sanitizeRecommendationParams = <T extends object>(params?: T) => {
  if (!params) {
    return undefined;
  }
  return baseApi.sanitizeQueryParams({ ...(params as Record<string, unknown>) });
};

export interface RecommendationParams {
  limit?: number;
  categories?: string[];
  excludeIds?: string[];
  context?: string;
}

export interface ImprovementRecommendationParams {
  limit?: number;
  focusAreas?: string[];
}

export const brandRecommendationApi = {
  /**
   * Generate personalized recommendations immediately.
   * POST /api/brand/recommendation/personalized/generate
   */
  async generatePersonalizedRecommendations(
    params?: RecommendationParams,
  ): Promise<Recommendation[]> {
    try {
      const response = await api.post<ApiResponse<{ recommendations: Recommendation[] }>>(
        `${BASE_PATH}/personalized/generate`,
        undefined,
        { params: sanitizeRecommendationParams(params) },
      );
      const { recommendations } = baseApi.handleResponse(
        response,
        'Failed to generate personalized recommendations',
        500,
      );
      return recommendations;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext(
          'POST',
          `${BASE_PATH}/personalized/generate`,
          params ? { ...params } : undefined
        ),
      );
    }
  },

  /**
   * Retrieve cached personalized recommendations.
   * GET /api/brand/recommendation/personalized
   */
  async getPersonalizedRecommendations(
    params?: RecommendationParams,
  ): Promise<Recommendation[]> {
    try {
      const response = await api.get<ApiResponse<{ recommendations: Recommendation[] }>>(
        `${BASE_PATH}/personalized`,
        { params: sanitizeRecommendationParams(params) },
      );
      const { recommendations } = baseApi.handleResponse(
        response,
        'Failed to fetch personalized recommendations',
        500,
      );
      return recommendations;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext(
          'GET',
          `${BASE_PATH}/personalized`,
          params ? { ...params } : undefined
        ),
      );
    }
  },

  /**
   * Retrieve improvement recommendations.
   * GET /api/brand/recommendation/improvements
   */
  async getImprovementRecommendations(
    params?: ImprovementRecommendationParams,
  ): Promise<Recommendation[]> {
    try {
      const response = await api.get<ApiResponse<{ recommendations: Recommendation[] }>>(
        `${BASE_PATH}/improvements`,
        { params: sanitizeRecommendationParams(params) },
      );
      const { recommendations } = baseApi.handleResponse(
        response,
        'Failed to fetch improvement recommendations',
        500,
      );
      return recommendations;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext(
          'GET',
          `${BASE_PATH}/improvements`,
          params ? { ...params } : undefined
        ),
      );
    }
  },
};

export default brandRecommendationApi;


