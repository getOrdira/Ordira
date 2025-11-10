// src/lib/api/features/subscriptions/subscriptionsAnalytics.api.ts
// Subscriptions analytics API aligned with backend routes/features/subscriptions/subscriptionsAnalytics.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  SubscriptionSummary,
  SubscriptionInsights,
  SubscriptionUsageTrends,
  SubscriptionUsageProjections
} from '@/lib/types/features/subscriptions';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeOptionalEnum
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/subscriptions/analytics';

type HttpMethod = 'GET' | 'POST';

const createSubscriptionsAnalyticsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'subscriptions',
  module: 'analytics',
  method,
  endpoint,
  ...context
});

const ANALYTICS_TIMEFRAMES = ['24h', '7d', '30d', '90d', '1y', 'all'] as const;

export type SubscriptionAnalyticsTimeframe = typeof ANALYTICS_TIMEFRAMES[number];

export interface SubscriptionAnalyticsQuery {
  businessId?: string;
  timeframe?: SubscriptionAnalyticsTimeframe;
}

export interface SubscriptionWinBackPayload {
  businessId?: string;
  reason?: string;
}

export interface SubscriptionUsageAnalyticsResult {
  overview: SubscriptionSummary;
  trends: SubscriptionUsageTrends;
  projections: SubscriptionUsageProjections;
  recommendations: string[];
}

const sanitizeAnalyticsQuery = (query?: SubscriptionAnalyticsQuery) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(query.businessId, 'businessId'),
    timeframe: sanitizeOptionalEnum(query.timeframe, 'timeframe', ANALYTICS_TIMEFRAMES)
  });
};

const sanitizeWinBackPayload = (payload?: SubscriptionWinBackPayload) => {
  if (!payload) {
    return undefined;
  }

  return baseApi.sanitizeRequestData({
    businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
    reason: sanitizeOptionalString(payload.reason, 'reason', { maxLength: 1000 })
  });
};

export const subscriptionsAnalyticsApi = {
  /**
   * Retrieve subscription overview summary.
   * GET /api/subscriptions/analytics/overview
   */
  async getSubscriptionOverview(
    query?: SubscriptionAnalyticsQuery
  ): Promise<SubscriptionSummary> {
    const endpoint = `${BASE_PATH}/overview`;
    const params = sanitizeAnalyticsQuery(query);

    try {
      const response = await api.get<ApiResponse<{ overview: SubscriptionSummary }>>(endpoint, {
        params
      });
      const { overview } = baseApi.handleResponse(
        response,
        'Failed to fetch subscription overview',
        500
      );
      return overview;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsAnalyticsLogContext('GET', endpoint, { hasParams: Boolean(params) })
      );
    }
  },

  /**
   * Retrieve subscription usage analytics.
   * GET /api/subscriptions/analytics/usage
   */
  async getUsageAnalytics(
    query?: SubscriptionAnalyticsQuery
  ): Promise<SubscriptionUsageAnalyticsResult> {
    const endpoint = `${BASE_PATH}/usage`;
    const params = sanitizeAnalyticsQuery(query);

    try {
      const response = await api.get<ApiResponse<SubscriptionUsageAnalyticsResult>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch subscription usage analytics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsAnalyticsLogContext('GET', endpoint, { hasParams: Boolean(params) })
      );
    }
  },

  /**
   * Retrieve actionable subscription insights.
   * GET /api/subscriptions/analytics/insights
   */
  async getSubscriptionInsights(
    query?: { businessId?: string }
  ): Promise<SubscriptionInsights> {
    const endpoint = `${BASE_PATH}/insights`;
    const params = sanitizeAnalyticsQuery(query);

    try {
      const response = await api.get<ApiResponse<{ insights: SubscriptionInsights }>>(endpoint, {
        params
      });
      const { insights } = baseApi.handleResponse(
        response,
        'Failed to fetch subscription insights',
        500
      );
      return insights;
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsAnalyticsLogContext('GET', endpoint, { hasParams: Boolean(params) })
      );
    }
  },

  /**
   * Generate win-back offers.
   * POST /api/subscriptions/analytics/win-back
   */
  async generateWinBackOffers(
    payload?: SubscriptionWinBackPayload
  ): Promise<{ offers: string[]; reason?: string }> {
    const endpoint = `${BASE_PATH}/win-back`;
    const sanitizedPayload = sanitizeWinBackPayload(payload);

    try {
      const response = await api.post<ApiResponse<{ offers: string[]; reason?: string }>>(
        endpoint,
        sanitizedPayload
      );
      return baseApi.handleResponse(
        response,
        'Failed to generate win-back offers',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSubscriptionsAnalyticsLogContext('POST', endpoint, {
          hasPayload: Boolean(sanitizedPayload)
        })
      );
    }
  }
};

export default subscriptionsAnalyticsApi;
