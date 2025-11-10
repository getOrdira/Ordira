'use client';

// src/hooks/features/analytics/useAnalyticsSystemHealth.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import analyticsSystemHealthApi, {
  type SystemHealthResponse
} from '@/lib/api/features/analytics/analyticsSystemHealth.api';
import { ApiError } from '@/lib/errors/errors';

export const analyticsSystemHealthQueryKeys = {
  root: ['analytics', 'system-health'] as const
};

type SystemHealthQueryOptions = Omit<
  UseQueryOptions<SystemHealthResponse, ApiError, SystemHealthResponse, QueryKey>,
  'queryKey' | 'queryFn'
>;

export const useAnalyticsSystemHealth = (
  options?: SystemHealthQueryOptions
): UseQueryResult<SystemHealthResponse, ApiError> => {
  return useQuery({
    queryKey: analyticsSystemHealthQueryKeys.root,
    queryFn: analyticsSystemHealthApi.getSystemHealthMetrics,
    staleTime: 30_000,
    ...options
  });
};
