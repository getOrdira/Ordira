'use client';

// src/hooks/features/users/useUsersAnalytics.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import usersAnalyticsApi, {
  type UserAnalyticsQuery,
  type UserAnalyticsResponse
} from '@/lib/api/features/users/usersAnalytics.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

const normalizeObject = <T>(value?: T) => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return Object.keys(value).length ? (value as Record<string, unknown>) : null;
};

export const usersAnalyticsQueryKeys = {
  root: ['users', 'analytics'] as const,
  analytics: (query?: UserAnalyticsQuery) =>
    [...usersAnalyticsQueryKeys.root, 'analytics', normalizeObject(query)] as const
};

/**
 * Retrieve aggregated user analytics.
 */
export const useUserAnalytics = (
  query?: UserAnalyticsQuery,
  options?: QueryOptions<UserAnalyticsResponse>
): UseQueryResult<UserAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: usersAnalyticsQueryKeys.analytics(query),
    queryFn: () => usersAnalyticsApi.getUserAnalytics(query),
    ...options
  });
};

/**
 * Main hook that provides access to all user analytics operations.
 */
export interface UseUsersAnalyticsOptions {
  queries?: {
    analytics?: QueryOptions<UserAnalyticsResponse>;
  };
}

export interface UseUsersAnalyticsResult {
  // Queries
  analytics: (query?: UserAnalyticsQuery) => UseQueryResult<UserAnalyticsResponse, ApiError>;
}

export const useUsersAnalytics = (
  options: UseUsersAnalyticsOptions = {}
): UseUsersAnalyticsResult => {
  return {
    analytics: (query?: UserAnalyticsQuery) =>
      useUserAnalytics(query, options.queries?.analytics)
  };
};
