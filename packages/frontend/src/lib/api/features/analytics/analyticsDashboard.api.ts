// src/lib/api/features/analytics/analyticsDashboard.api.ts
// Analytics dashboard API module aligned with backend routes/features/analytics/analyticsDashboard.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  AnalyticsGrouping,
  AnalyticsDashboardDisplay,
  DashboardAnalyticsSnapshot,
} from '@/lib/types/features/analytics';

/**
 * Query parameters for dashboard analytics requests.
 */
export interface DashboardAnalyticsParams {
  businessId?: string;
  manufacturerId?: string;
  groupBy?: AnalyticsGrouping;
  startDate?: string | Date;
  endDate?: string | Date;
  includeSystemHealth?: boolean;
  useReadReplica?: boolean;
}

/**
 * Response payload returned by the backend dashboard endpoint.
 */
export interface DashboardAnalyticsResponse {
  snapshot: DashboardAnalyticsSnapshot;
  generatedAt: string;
}

/**
 * Formatted dashboard payload with UI helpers for charts and metrics.
 */
export interface DashboardAnalyticsDisplayResponse {
  snapshot: AnalyticsDashboardDisplay;
  generatedAt: string;
}

/**
 * Normalize date input to ISO string expected by the backend.
 */
const toIsoString = (value?: string | Date): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
};

/**
 * Remove undefined/null values from a query object to avoid leaking empty params.
 */
const sanitizeQuery = (query: Record<string, unknown>): Record<string, unknown> => {
  return Object.entries(query).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

/**
 * Format dashboard snapshot with UI specific helpers.
 */
export const formatDashboardSnapshot = (
  snapshot: DashboardAnalyticsSnapshot,
): AnalyticsDashboardDisplay => {
  const updatedAt = snapshot.updatedAt ? new Date(snapshot.updatedAt) : undefined;
  const numberFormatter = new Intl.NumberFormat();

  return {
    ...snapshot,
    _ui: {
      charts: {
        votingTrends: {
          labels: snapshot.votingAnalytics.dailyBreakdown.map((entry) => entry.date),
          datasets: [
            {
              label: 'Total Votes',
              data: snapshot.votingAnalytics.dailyBreakdown.map((entry) => entry.votes),
            },
            {
              label: 'Unique Voters',
              data: snapshot.votingAnalytics.dailyBreakdown.map((entry) => entry.uniqueVoters),
            },
          ],
        },
        productPerformance: {
          labels: snapshot.productAnalytics.topPerformingProducts.map((product) => product.title),
          datasets: [
            {
              label: 'Engagement Score',
              data: snapshot.productAnalytics.topPerformingProducts.map(
                (product) => product.engagementScore,
              ),
            },
          ],
        },
        businessBreakdown: {
          labels: Object.keys(snapshot.businessAnalytics.plansBreakdown),
          datasets: [
            {
              label: 'Businesses by Plan',
              data: Object.values(snapshot.businessAnalytics.plansBreakdown),
            },
          ],
        },
      },
      formattedMetrics: {
        totalVotes: numberFormatter.format(snapshot.votingAnalytics.totalVotes),
        totalProducts: numberFormatter.format(snapshot.productAnalytics.totalProducts),
        totalBusinesses: numberFormatter.format(snapshot.businessAnalytics.totalBusinesses),
        avgVotesPerProduct: snapshot.productAnalytics.avgVotesPerProduct.toFixed(2),
      },
      updatedAtFormatted: updatedAt?.toLocaleString(),
      relativeUpdateTime: updatedAt
        ? `${Math.max(1, Math.round((Date.now() - updatedAt.getTime()) / 60000))}m ago`
        : undefined,
    },
  };
};

/**
 * Analytics Dashboard API
 *
 * Handles dashboard analytics-related API calls.
 * Routes: /api/analytics/dashboard/*
 */
export const analyticsDashboardApi = {
  /**
   * Fetch dashboard analytics snapshot.
   * GET /api/analytics/dashboard
   */
  async getDashboardAnalytics(
    params?: DashboardAnalyticsParams,
  ): Promise<DashboardAnalyticsResponse> {
    try {
      const query = sanitizeQuery({
        businessId: params?.businessId,
        manufacturerId: params?.manufacturerId,
        groupBy: params?.groupBy,
        startDate: toIsoString(params?.startDate),
        endDate: toIsoString(params?.endDate),
        includeSystemHealth: params?.includeSystemHealth,
        useReadReplica: params?.useReadReplica,
      });

      const response = await api.get<ApiResponse<DashboardAnalyticsResponse>>(
        '/analytics/dashboard',
        { params: query },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch dashboard analytics snapshot',
        500,
      );
    } catch (error) {
      console.error('Dashboard analytics fetch error:', error);
      throw error;
    }
  },

  /**
   * Fetch dashboard analytics snapshot with UI formatting helpers applied.
   */
  async getDashboardDisplay(
    params?: DashboardAnalyticsParams,
  ): Promise<DashboardAnalyticsDisplayResponse> {
    const result = await analyticsDashboardApi.getDashboardAnalytics(params);
    return {
      snapshot: formatDashboardSnapshot(result.snapshot),
      generatedAt: result.generatedAt,
    };
  },
};

export default analyticsDashboardApi;
