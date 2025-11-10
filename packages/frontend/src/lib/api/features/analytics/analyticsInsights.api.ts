// src/lib/api/features/analytics/analyticsInsights.api.ts
// Analytics insights API module aligned with backend routes/features/analytics/analyticsInsights.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { AnalyticsGrouping } from '@/lib/types/features/analytics';
import { handleApiError } from '@/lib/validation/middleware/apiError';

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

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const createAnalyticsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'analytics',
  method,
  endpoint,
  ...context,
});

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
      const query = baseApi.sanitizeQueryParams({
        businessId: params?.businessId,
        manufacturerId: params?.manufacturerId,
        groupBy: params?.groupBy,
        startDate: params?.startDate,
        endDate: params?.endDate,
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
      throw handleApiError(
        error,
        createAnalyticsLogContext('GET', '/analytics/insights', {
          businessId: params?.businessId,
          manufacturerId: params?.manufacturerId,
          groupBy: params?.groupBy,
        }),
      );
    }
  },
};

export default analyticsInsightsApi;

