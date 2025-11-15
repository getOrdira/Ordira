'use client';

// src/hooks/features/votes/useVotesAnalytics.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import votesAnalyticsApi, {
  type VotingAnalyticsQuery,
  type VotingAnalyticsResponse
} from '@/lib/api/features/votes/votesAnalytics.api';
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

const votesAnalyticsQueryKeysRoot = ['votes', 'analytics'] as const;

export const votesAnalyticsQueryKeys = {
  root: votesAnalyticsQueryKeysRoot,
  analytics: (query?: VotingAnalyticsQuery) =>
    [...votesAnalyticsQueryKeysRoot, 'analytics', normalizeObject(query)] as const
};

/**
 * Retrieve voting analytics for a business.
 */
export const useVotingAnalytics = (
  query?: VotingAnalyticsQuery,
  options?: QueryOptions<VotingAnalyticsResponse>
): UseQueryResult<VotingAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: votesAnalyticsQueryKeys.analytics(query),
    queryFn: () => votesAnalyticsApi.getVotingAnalytics(query),
    ...options
  });
};

/**
 * Main hook that provides access to all voting analytics operations.
 */
export interface UseVotesAnalyticsOptions {
  queries?: {
    analytics?: QueryOptions<VotingAnalyticsResponse>;
  };
}

export interface UseVotesAnalyticsResult {
  // Queries
  analytics: (query?: VotingAnalyticsQuery) => UseQueryResult<VotingAnalyticsResponse, ApiError>;
}

export const useVotesAnalytics = (
  options: UseVotesAnalyticsOptions = {}
): UseVotesAnalyticsResult => {
  return {
    analytics: (query?: VotingAnalyticsQuery) =>
      useVotingAnalytics(query, options.queries?.analytics)
  };
};
