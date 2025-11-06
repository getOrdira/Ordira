// src/lib/api/features/brands/brandRecommendation.api.ts
// Brand recommendation API aligned with backend routes/features/brands/brandRecommendation.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { Recommendation } from '@/lib/types/features/brands';

const BASE_PATH = '/brand/recommendation';

const clean = (params?: Record<string, unknown>) => {
  if (!params) {
    return undefined;
  }
  return Object.entries(params).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
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
        { params: clean(params) },
      );
      const { recommendations } = baseApi.handleResponse(
        response,
        'Failed to generate personalized recommendations',
        500,
      );
      return recommendations;
    } catch (error) {
      console.error('Brand personalized recommendation generation error:', error);
      throw error;
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
        { params: clean(params) },
      );
      const { recommendations } = baseApi.handleResponse(
        response,
        'Failed to fetch personalized recommendations',
        500,
      );
      return recommendations;
    } catch (error) {
      console.error('Brand personalized recommendation fetch error:', error);
      throw error;
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
        { params: clean(params) },
      );
      const { recommendations } = baseApi.handleResponse(
        response,
        'Failed to fetch improvement recommendations',
        500,
      );
      return recommendations;
    } catch (error) {
      console.error('Brand improvement recommendation fetch error:', error);
      throw error;
    }
  },
};

export default brandRecommendationApi;


