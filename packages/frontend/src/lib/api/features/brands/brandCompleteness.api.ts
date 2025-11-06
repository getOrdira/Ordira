// src/lib/api/features/brands/brandCompleteness.api.ts
// Brand completeness API module aligned with backend routes/features/brands/brandCompleteness.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { CompletenessConfig, CompletenessResult } from '@/lib/types/features/brands';

const BASE_PATH = '/brand/completeness';

const cleanQuery = (params?: Record<string, unknown>) => {
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
        { params: cleanQuery(params) },
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to calculate business profile completeness',
        500,
      );
      return result;
    } catch (error) {
      console.error('Brand profile completeness calculation error:', error);
      throw error;
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
        { params: cleanQuery(params) },
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to calculate brand settings completeness',
        500,
      );
      return result;
    } catch (error) {
      console.error('Brand settings completeness calculation error:', error);
      throw error;
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
        { params: cleanQuery(params) },
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to calculate integration completeness',
        500,
      );
      return result;
    } catch (error) {
      console.error('Brand integration completeness calculation error:', error);
      throw error;
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
        { params: cleanQuery(params) },
      );
      const { result } = baseApi.handleResponse(
        response,
        'Failed to calculate overall brand completeness',
        500,
      );
      return result;
    } catch (error) {
      console.error('Brand overall completeness calculation error:', error);
      throw error;
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
        { params: { plan } },
      );
      const { config } = baseApi.handleResponse(
        response,
        'Failed to fetch profile completeness configuration',
        400,
      );
      return config;
    } catch (error) {
      console.error('Brand profile completeness config fetch error:', error);
      throw error;
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
        { params: { plan } },
      );
      const { config } = baseApi.handleResponse(
        response,
        'Failed to fetch settings completeness configuration',
        400,
      );
      return config;
    } catch (error) {
      console.error('Brand settings completeness config fetch error:', error);
      throw error;
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
        { params: { plan } },
      );
      const { config } = baseApi.handleResponse(
        response,
        'Failed to fetch integration completeness configuration',
        400,
      );
      return config;
    } catch (error) {
      console.error('Brand integration completeness config fetch error:', error);
      throw error;
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
      console.error('Brand legacy profile completeness fetch error:', error);
      throw error;
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
      console.error('Brand legacy setup completeness fetch error:', error);
      throw error;
    }
  },
};

export default brandCompletenessApi;


