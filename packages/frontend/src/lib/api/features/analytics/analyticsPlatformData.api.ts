// src/lib/api/features/analytics/analyticsPlatformData.api.ts
// Analytics platform data API module aligned with backend routes/features/analytics/analyticsPlatformData.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  AnalyticsGrouping,
  BusinessAnalyticsSnapshot,
  ManufacturerAnalyticsSnapshot,
  PlatformVotingAnalytics,
  ProductAnalyticsSnapshot,
} from '@/lib/types/features/analytics';

export interface BusinessAnalyticsParams {
  industry?: string;
  plan?: string;
  verified?: boolean;
  startDate?: string | Date;
  endDate?: string | Date;
  useCache?: boolean;
}

export interface ProductAnalyticsParams {
  businessId?: string;
  manufacturerId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  useCache?: boolean;
}

export interface ManufacturerAnalyticsParams {
  startDate?: string | Date;
  endDate?: string | Date;
  useCache?: boolean;
}

export interface VotingAnalyticsParams {
  groupBy?: AnalyticsGrouping;
  startDate?: string | Date;
  endDate?: string | Date;
  useCache?: boolean;
}

export interface BusinessAnalyticsResponse {
  snapshot: BusinessAnalyticsSnapshot;
  generatedAt: string;
}

export interface ProductAnalyticsResponse {
  snapshot: ProductAnalyticsSnapshot;
  generatedAt: string;
}

export interface ManufacturerAnalyticsResponse {
  snapshot: ManufacturerAnalyticsSnapshot;
  generatedAt: string;
}

export interface PlatformVotingAnalyticsResponse {
  analytics: PlatformVotingAnalytics;
  generatedAt: string;
}

export interface BusinessVotingAnalyticsResponse extends PlatformVotingAnalyticsResponse {
  businessId: string;
}

const toIsoString = (value?: string | Date): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
};

const sanitizeQuery = (query: Record<string, unknown>): Record<string, unknown> => {
  return Object.entries(query).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

/**
 * Analytics Platform Data API
 *
 * Handles platform-wide analytics data endpoints.
 * Routes: /api/analytics/platform/*
 */
export const analyticsPlatformDataApi = {
  /**
   * Fetch aggregated business analytics snapshot.
   * GET /api/analytics/platform/business
   */
  async getBusinessAnalytics(
    params?: BusinessAnalyticsParams,
  ): Promise<BusinessAnalyticsResponse> {
    try {
      const query = sanitizeQuery({
        industry: params?.industry,
        plan: params?.plan,
        verified: params?.verified,
        startDate: toIsoString(params?.startDate),
        endDate: toIsoString(params?.endDate),
        useCache: params?.useCache,
      });

      const response = await api.get<ApiResponse<BusinessAnalyticsResponse>>(
        '/analytics/platform/business',
        { params: query },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch business analytics snapshot',
        500,
      );
    } catch (error) {
      console.error('Business analytics fetch error:', error);
      throw error;
    }
  },

  /**
   * Fetch product analytics snapshot.
   * GET /api/analytics/platform/products
   */
  async getProductAnalytics(
    params?: ProductAnalyticsParams,
  ): Promise<ProductAnalyticsResponse> {
    try {
      const query = sanitizeQuery({
        businessId: params?.businessId,
        manufacturerId: params?.manufacturerId,
        startDate: toIsoString(params?.startDate),
        endDate: toIsoString(params?.endDate),
        useCache: params?.useCache,
      });

      const response = await api.get<ApiResponse<ProductAnalyticsResponse>>(
        '/analytics/platform/products',
        { params: query },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch product analytics snapshot',
        500,
      );
    } catch (error) {
      console.error('Product analytics fetch error:', error);
      throw error;
    }
  },

  /**
   * Fetch manufacturer analytics snapshot.
   * GET /api/analytics/platform/manufacturers
   */
  async getManufacturerAnalytics(
    params?: ManufacturerAnalyticsParams,
  ): Promise<ManufacturerAnalyticsResponse> {
    try {
      const query = sanitizeQuery({
        startDate: toIsoString(params?.startDate),
        endDate: toIsoString(params?.endDate),
        useCache: params?.useCache,
      });

      const response = await api.get<ApiResponse<ManufacturerAnalyticsResponse>>(
        '/analytics/platform/manufacturers',
        { params: query },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer analytics snapshot',
        500,
      );
    } catch (error) {
      console.error('Manufacturer analytics fetch error:', error);
      throw error;
    }
  },

  /**
   * Fetch platform-wide voting analytics.
   * GET /api/analytics/platform/voting
   */
  async getPlatformVotingAnalytics(
    params?: VotingAnalyticsParams,
  ): Promise<PlatformVotingAnalyticsResponse> {
    try {
      const query = sanitizeQuery({
        groupBy: params?.groupBy,
        startDate: toIsoString(params?.startDate),
        endDate: toIsoString(params?.endDate),
        useCache: params?.useCache,
      });

      const response = await api.get<ApiResponse<PlatformVotingAnalyticsResponse>>(
        '/analytics/platform/voting',
        { params: query },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch platform voting analytics',
        500,
      );
    } catch (error) {
      console.error('Platform voting analytics fetch error:', error);
      throw error;
    }
  },

  /**
   * Fetch business-scoped voting analytics.
   * GET /api/analytics/platform/business/:businessId/voting
   */
  async getBusinessVotingAnalytics(
    businessId: string,
    params?: VotingAnalyticsParams,
  ): Promise<BusinessVotingAnalyticsResponse> {
    try {
      const query = sanitizeQuery({
        groupBy: params?.groupBy,
        startDate: toIsoString(params?.startDate),
        endDate: toIsoString(params?.endDate),
        useCache: params?.useCache,
      });

      const response = await api.get<ApiResponse<BusinessVotingAnalyticsResponse>>(
        `/analytics/platform/business/${encodeURIComponent(businessId)}/voting`,
        { params: query },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch business voting analytics',
        500,
      );
    } catch (error) {
      console.error('Business voting analytics fetch error:', error);
      throw error;
    }
  },
};

export default analyticsPlatformDataApi;

