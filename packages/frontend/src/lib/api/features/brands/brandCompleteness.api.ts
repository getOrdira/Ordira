// src/lib/api/features/brands/brandCompleteness.api.ts
// Brand completeness API module aligned with backend routes/features/brands/brandCompleteness.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { CompletenessConfig, CompletenessResult } from '@/lib/types/features/brands';
import { handleApiError } from '@/lib/validation/middleware/apiError';

const BASE_PATH = '/brand/completeness';

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

const sanitizeCompletenessParams = (params?: BrandCompletenessParams) => {
  if (!params) {
    return undefined;
  }
  return baseApi.sanitizeQueryParams({ ...params } as Record<string, unknown>);
};

export interface BrandCompletenessParams {
  plan?: string;
  includeRecommendations?: boolean;
}

export const brandCompletenessApi = {
  /**
   * Calculate business profile completeness.
   * GET /api/brand/completeness/profile
   */
  async getProfileCompleteness(params?: BrandCompletenessParams): Promise<CompletenessResult> {
    try {
      const response = await api.get<ApiResponse<{ result: CompletenessResult }>>(
        `${BASE_PATH}/profile`,
        { params: sanitizeCompletenessParams(params) },
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to calculate business profile completeness',
        500,
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/profile`, params ? { ...params } : undefined),
      );
    }
  },

  /**
   * Calculate brand settings completeness.
   * GET /api/brand/completeness/settings
   */
  async getSettingsCompleteness(params?: BrandCompletenessParams): Promise<CompletenessResult> {
    try {
      const response = await api.get<ApiResponse<{ result: CompletenessResult }>>(
        `${BASE_PATH}/settings`,
        { params: sanitizeCompletenessParams(params) },
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to calculate brand settings completeness',
        500,
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/settings`, params ? { ...params } : undefined),
      );
    }
  },

  /**
   * Calculate integration completeness.
   * GET /api/brand/completeness/integrations
   */
  async getIntegrationCompleteness(params?: BrandCompletenessParams): Promise<CompletenessResult> {
    try {
      const response = await api.get<ApiResponse<{ result: CompletenessResult }>>(
        `${BASE_PATH}/integrations`,
        { params: sanitizeCompletenessParams(params) },
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to calculate integration completeness',
        500,
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/integrations`, params ? { ...params } : undefined),
      );
    }
  },

  /**
   * Calculate overall completeness.
   * GET /api/brand/completeness/overall
   */
  async getOverallCompleteness(params?: BrandCompletenessParams): Promise<CompletenessResult> {
    try {
      const response = await api.get<ApiResponse<{ result: CompletenessResult }>>(
        `${BASE_PATH}/overall`,
        { params: sanitizeCompletenessParams(params) },
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to calculate overall brand completeness',
        500,
      );
      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/overall`, params ? { ...params } : undefined),
      );
    }
  },

  /**
   * Retrieve profile completeness configuration.
   * GET /api/brand/completeness/config/profile
   */
  async getProfileConfig(plan: string): Promise<CompletenessConfig> {
    try {
      const response = await api.get<ApiResponse<{ config: CompletenessConfig }>>(
        `${BASE_PATH}/config/profile`,
        { params: baseApi.sanitizeQueryParams({ plan }) },
      );
      const { config } = baseApi.handleResponse(
        response,
        'Failed to fetch profile completeness configuration',
        400,
      );
      return config;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/config/profile`, { plan }),
      );
    }
  },

  /**
   * Retrieve brand settings completeness configuration.
   * GET /api/brand/completeness/config/settings
   */
  async getSettingsConfig(plan: string): Promise<CompletenessConfig> {
    try {
      const response = await api.get<ApiResponse<{ config: CompletenessConfig }>>(
        `${BASE_PATH}/config/settings`,
        { params: baseApi.sanitizeQueryParams({ plan }) },
      );
      const { config } = baseApi.handleResponse(
        response,
        'Failed to fetch settings completeness configuration',
        400,
      );
      return config;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/config/settings`, { plan }),
      );
    }
  },

  /**
   * Retrieve integration completeness configuration.
   * GET /api/brand/completeness/config/integrations
   */
  async getIntegrationConfig(plan: string): Promise<CompletenessConfig> {
    try {
      const response = await api.get<ApiResponse<{ config: CompletenessConfig }>>(
        `${BASE_PATH}/config/integrations`,
        { params: baseApi.sanitizeQueryParams({ plan }) },
      );
      const { config } = baseApi.handleResponse(
        response,
        'Failed to fetch integration completeness configuration',
        400,
      );
      return config;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/config/integrations`, { plan }),
      );
    }
  },

  /**
   * Retrieve legacy profile completeness score.
   * GET /api/brand/completeness/legacy/profile
   */
  async getLegacyProfileScore(): Promise<number> {
    try {
      const response = await api.get<ApiResponse<{ score: number }>>(
        `${BASE_PATH}/legacy/profile`,
      );
      const { score } = baseApi.handleResponse(
        response,
        'Failed to fetch legacy profile completeness score',
        500,
      );
      return score;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/legacy/profile`),
      );
    }
  },

  /**
   * Retrieve legacy setup completeness score.
   * GET /api/brand/completeness/legacy/setup
   */
  async getLegacySetupScore(): Promise<number> {
    try {
      const response = await api.get<ApiResponse<{ score: number }>>(
        `${BASE_PATH}/legacy/setup`,
      );
      const { score } = baseApi.handleResponse(
        response,
        'Failed to fetch legacy setup completeness score',
        500,
      );
      return score;
    } catch (error) {
      throw handleApiError(
        error,
        createBrandLogContext('GET', `${BASE_PATH}/legacy/setup`),
      );
    }
  },
};

export default brandCompletenessApi;


