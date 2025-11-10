// src/lib/api/features/connections/connectionsAnalytics.api.ts
// Connections analytics API module aligned with backend routes/features/connections/connectionsAnalytics.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { SharedAnalyticsResult } from '@backend/services/connections/features/analyticsSharing.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalDate,
  sanitizeOptionalObjectId
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/connections/analytics';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createAnalyticsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'connections',
  module: 'analytics',
  method,
  endpoint,
  ...context
});

type ConnectionPairOverrides = {
  brandId?: string;
  manufacturerId?: string;
};

interface SharedAnalyticsQueryParams extends ConnectionPairOverrides {
  includeBrand?: boolean;
  includeManufacturer?: boolean;
  start?: string | Date;
  end?: string | Date;
}

type AnalyticsSnapshot = Record<string, unknown>;

const buildConnectionPairQuery = (params?: ConnectionPairOverrides) => {
  if (!params) {
    return undefined;
  }

  const query = {
    brandId: sanitizeOptionalObjectId(params.brandId, 'brandId'),
    manufacturerId: sanitizeOptionalObjectId(params.manufacturerId, 'manufacturerId')
  };

  const sanitized = baseApi.sanitizeQueryParams(query);
  return Object.keys(sanitized).length ? sanitized : undefined;
};

const buildSharedAnalyticsQuery = (params?: SharedAnalyticsQueryParams) => {
  if (!params) {
    return undefined;
  }

  const query = {
    brandId: sanitizeOptionalObjectId(params.brandId, 'brandId'),
    manufacturerId: sanitizeOptionalObjectId(params.manufacturerId, 'manufacturerId'),
    includeBrand: sanitizeOptionalBoolean(params.includeBrand, 'includeBrand'),
    includeManufacturer: sanitizeOptionalBoolean(params.includeManufacturer, 'includeManufacturer'),
    start: sanitizeOptionalDate(params.start, 'start'),
    end: sanitizeOptionalDate(params.end, 'end')
  };

  const sanitized = baseApi.sanitizeQueryParams(query);
  return Object.keys(sanitized).length ? sanitized : undefined;
};

export const connectionsAnalyticsApi = {
  /**
   * Determine whether analytics can be shared for the provided connection pair.
   * GET /connections/analytics/can-share
   */
  async canShareAnalytics(params?: ConnectionPairOverrides): Promise<boolean> {
    try {
      const query = buildConnectionPairQuery(params);
      const response = await api.get<ApiResponse<{ allowed: boolean }>>(
        `${BASE_PATH}/can-share`,
        { params: query }
      );
      const { allowed } = baseApi.handleResponse(
        response,
        'Failed to evaluate analytics sharing permissions',
        500
      );
      return allowed;
    } catch (error) {
      throw handleApiError(
        error,
        createAnalyticsLogContext('GET', `${BASE_PATH}/can-share`, params ? { params } : undefined)
      );
    }
  },

  /**
   * Retrieve shared analytics for a brand/manufacturer connection.
   * GET /connections/analytics/shared
   */
  async getSharedAnalytics(params?: SharedAnalyticsQueryParams): Promise<SharedAnalyticsResult> {
    try {
      const query = buildSharedAnalyticsQuery(params);
      const response = await api.get<ApiResponse<{ analytics: SharedAnalyticsResult }>>(
        `${BASE_PATH}/shared`,
        { params: query }
      );
      const { analytics } = baseApi.handleResponse(
        response,
        'Failed to fetch shared analytics',
        500
      );
      return analytics;
    } catch (error) {
      throw handleApiError(
        error,
        createAnalyticsLogContext('GET', `${BASE_PATH}/shared`, params ? { params } : undefined)
      );
    }
  },

  /**
   * Retrieve shared KPI snapshot for dashboards.
   * GET /connections/analytics/shared/kpis
   */
  async getSharedKpis(params?: ConnectionPairOverrides): Promise<{
    brand?: Record<string, number>;
    manufacturer?: Record<string, number>;
  }> {
    try {
      const query = buildConnectionPairQuery(params);
      const response = await api.get<ApiResponse<{
        kpis: { brand?: Record<string, number>; manufacturer?: Record<string, number> };
      }>>(
        `${BASE_PATH}/shared/kpis`,
        { params: query }
      );
      const { kpis } = baseApi.handleResponse(
        response,
        'Failed to fetch shared KPIs',
        500
      );
      return kpis;
    } catch (error) {
      throw handleApiError(
        error,
        createAnalyticsLogContext('GET', `${BASE_PATH}/shared/kpis`, params ? { params } : undefined)
      );
    }
  },

  /**
   * Retrieve brand analytics visible to a connected manufacturer.
   * GET /connections/analytics/brand/:manufacturerId
   */
  async getBrandAnalytics(
    manufacturerId: string,
    overrides?: ConnectionPairOverrides
  ): Promise<AnalyticsSnapshot> {
    const id = sanitizeObjectId(manufacturerId, 'manufacturerId');

    try {
      const query = buildConnectionPairQuery(overrides);
      const response = await api.get<ApiResponse<{ analytics: AnalyticsSnapshot }>>(
        `${BASE_PATH}/brand/${id}`,
        { params: query }
      );
      const { analytics } = baseApi.handleResponse(
        response,
        'Failed to fetch brand analytics',
        500,
        { requireData: false }
      );
      return analytics ?? {};
    } catch (error) {
      throw handleApiError(
        error,
        createAnalyticsLogContext('GET', `${BASE_PATH}/brand/:manufacturerId`, {
          manufacturerId: id,
          overrides
        })
      );
    }
  },

  /**
   * Retrieve manufacturer analytics visible to a connected brand.
   * GET /connections/analytics/manufacturer/:brandId
   */
  async getManufacturerAnalytics(
    brandId: string,
    overrides?: ConnectionPairOverrides
  ): Promise<AnalyticsSnapshot> {
    const id = sanitizeObjectId(brandId, 'brandId');

    try {
      const query = buildConnectionPairQuery(overrides);
      const response = await api.get<ApiResponse<{ analytics: AnalyticsSnapshot }>>(
        `${BASE_PATH}/manufacturer/${id}`,
        { params: query }
      );
      const { analytics } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer analytics',
        500,
        { requireData: false }
      );
      return analytics ?? {};
    } catch (error) {
      throw handleApiError(
        error,
        createAnalyticsLogContext('GET', `${BASE_PATH}/manufacturer/:brandId`, {
          brandId: id,
          overrides
        })
      );
    }
  }
};

export default connectionsAnalyticsApi;
