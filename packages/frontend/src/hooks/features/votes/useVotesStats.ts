'use client';

// src/hooks/features/votes/useVotesStats.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import votesStatsApi, {
  type VotingStatsQuery,
  type VotingStatsResponse
} from '@/lib/api/features/votes/votesStats.api';
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

const votesStatsQueryKeysRoot = ['votes', 'stats'] as const;

export const votesStatsQueryKeys = {
  root: votesStatsQueryKeysRoot,
  stats: (businessId: string, query?: VotingStatsQuery) =>
    [...votesStatsQueryKeysRoot, businessId, normalizeObject(query)] as const
};

/**
 * Retrieve aggregated voting statistics for a business.
 */
export const useVotingStats = (
  businessId: string,
  query?: VotingStatsQuery,
  options?: QueryOptions<VotingStatsResponse>
): UseQueryResult<VotingStatsResponse, ApiError> => {
  return useQuery({
    queryKey: votesStatsQueryKeys.stats(businessId, query),
    queryFn: () => votesStatsApi.getVotingStats(businessId, query),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all voting statistics operations.
 */
export interface UseVotesStatsOptions {
  queries?: {
    stats?: QueryOptions<VotingStatsResponse>;
  };
}

export interface UseVotesStatsResult {
  // Queries
  stats: (
    businessId: string,
    query?: VotingStatsQuery
  ) => UseQueryResult<VotingStatsResponse, ApiError>;
}

export const useVotesStats = (options: UseVotesStatsOptions = {}): UseVotesStatsResult => {
  return {
    stats: (businessId: string, query?: VotingStatsQuery) =>
      useVotingStats(businessId, query, options.queries?.stats)
  };
};
