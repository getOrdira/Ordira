'use client';

// src/hooks/features/analytics/useAnalyticsDashboard.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import analyticsDashboardApi, {
  type DashboardAnalyticsDisplayResponse,
  type DashboardAnalyticsParams,
  type DashboardAnalyticsResponse
} from '@/lib/api/features/analytics/analyticsDashboard.api';
import { ApiError } from '@/lib/errors/errors';

const normalizeDashboardParams = (params?: DashboardAnalyticsParams) => {
  if (!params) {
    return null;
  }

  return {
    ...params,
    startDate: params.startDate ? new Date(params.startDate).toISOString() : undefined,
    endDate: params.endDate ? new Date(params.endDate).toISOString() : undefined
  };
};

export const analyticsDashboardQueryKeys = {
  root: ['analytics', 'dashboard'] as const,
  snapshot: (params?: DashboardAnalyticsParams) =>
    [...analyticsDashboardQueryKeys.root, 'snapshot', normalizeDashboardParams(params)] as const,
  display: (params?: DashboardAnalyticsParams) =>
    [...analyticsDashboardQueryKeys.root, 'display', normalizeDashboardParams(params)] as const
};

type SnapshotQueryOptions = Omit<
  UseQueryOptions<DashboardAnalyticsResponse, ApiError, DashboardAnalyticsResponse, QueryKey>,
  'queryKey' | 'queryFn'
>;

type DisplayQueryOptions = Omit<
  UseQueryOptions<DashboardAnalyticsDisplayResponse, ApiError, DashboardAnalyticsDisplayResponse, QueryKey>,
  'queryKey' | 'queryFn'
>;

export const useAnalyticsDashboard = (
  params?: DashboardAnalyticsParams,
  options?: SnapshotQueryOptions
): UseQueryResult<DashboardAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: analyticsDashboardQueryKeys.snapshot(params),
    queryFn: () => analyticsDashboardApi.getDashboardAnalytics(params),
    staleTime: 60_000,
    ...options
  });
};

export const useAnalyticsDashboardDisplay = (
  params?: DashboardAnalyticsParams,
  options?: DisplayQueryOptions
): UseQueryResult<DashboardAnalyticsDisplayResponse, ApiError> => {
  return useQuery({
    queryKey: analyticsDashboardQueryKeys.display(params),
    queryFn: () => analyticsDashboardApi.getDashboardDisplay(params),
    staleTime: 60_000,
    ...options
  });
};
