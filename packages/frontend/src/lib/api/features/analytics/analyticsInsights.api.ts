// src/lib/api/features/analytics/analyticsInsights.api.ts
// Analytics insights API module aligned with backend routes/features/analytics/analyticsInsights.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { AnalyticsGrouping } from '@/lib/types/features/analytics';

/**
 * Query parameters for dashboard insights requests.
 */
export interface DashboardInsightsParams {
  businessId?: string;
  manufacturerId?: string;
  groupBy?: AnalyticsGrouping;
  startDate?: string | Date;
  endDate?: string | Date;
  limit?: number;
}

/**
 * Response payload returned by the backend insights endpoint.
 */
export interface DashboardInsightsResponse {
  insights: string[];
  snapshotGeneratedAt: string;
  generatedAt: string;
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
 * Analytics Insights API
 *
 * Handles dashboard insights-related API calls.
 * Routes: /api/analytics/insights/*
 */
export const analyticsInsightsApi = {
  /**
   * Generate dashboard insights for the requested segment.
   * GET /api/analytics/insights
   */
  async getDashboardInsights(
    params?: DashboardInsightsParams,
  ): Promise<DashboardInsightsResponse> {
    try {
      const query = sanitizeQuery({
        businessId: params?.businessId,
        manufacturerId: params?.manufacturerId,
        groupBy: params?.groupBy,
        startDate: toIsoString(params?.startDate),
        endDate: toIsoString(params?.endDate),
        limit: params?.limit,
      });

      const response = await api.get<ApiResponse<DashboardInsightsResponse>>(
        '/analytics/insights',
        { params: query },
      );

      return baseApi.handleResponse(
        response,
        'Failed to generate analytics insights',
        500,
      );
    } catch (error) {
      console.error('Dashboard insights fetch error:', error);
      throw error;
    }
  },
};

export default analyticsInsightsApi;

