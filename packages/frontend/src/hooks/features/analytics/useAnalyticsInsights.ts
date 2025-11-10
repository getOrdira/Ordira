'use client';

// src/hooks/features/analytics/useAnalyticsInsights.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import analyticsInsightsApi, {
  type DashboardInsightsParams,
  type DashboardInsightsResponse
} from '@/lib/api/features/analytics/analyticsInsights.api';
import { ApiError } from '@/lib/errors/errors';

const normalizeInsightParams = (params?: DashboardInsightsParams) => {
  if (!params) {
    return null;
  }

  return {
    ...params,
    startDate: params.startDate ? new Date(params.startDate).toISOString() : undefined,
    endDate: params.endDate ? new Date(params.endDate).toISOString() : undefined
  };
};

export const analyticsInsightsQueryKeys = {
  root: ['analytics', 'insights'] as const,
  dashboard: (params?: DashboardInsightsParams) =>
    [...analyticsInsightsQueryKeys.root, normalizeInsightParams(params)] as const
};

type InsightsQueryOptions = Omit<
  UseQueryOptions<DashboardInsightsResponse, ApiError, DashboardInsightsResponse, QueryKey>,
  'queryKey' | 'queryFn'
>;

export const useAnalyticsInsights = (
  params?: DashboardInsightsParams,
  options?: InsightsQueryOptions
): UseQueryResult<DashboardInsightsResponse, ApiError> => {
  return useQuery({
    queryKey: analyticsInsightsQueryKeys.dashboard(params),
    queryFn: () => analyticsInsightsApi.getDashboardInsights(params),
    staleTime: 60_000,
    ...options
  });
};
