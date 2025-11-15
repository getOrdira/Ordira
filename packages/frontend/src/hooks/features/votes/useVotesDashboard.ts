'use client';

// src/hooks/features/votes/useVotesDashboard.ts

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import votesDashboardApi, {
  type ClearVotingCachesResponse,
  type VotingDashboardResponse,
  type VotingServiceHealthResponse
} from '@/lib/api/features/votes/votesDashboard.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const votesDashboardQueryKeysRoot = ['votes', 'dashboard'] as const;

export const votesDashboardQueryKeys = {
  root: votesDashboardQueryKeysRoot,
  dashboard: (businessId: string) =>
    [...votesDashboardQueryKeysRoot, businessId] as const,
  health: [...votesDashboardQueryKeysRoot, 'health'] as const
};

export const votesDashboardMutationKeys = {
  clearCaches: (businessId: string) =>
    [...votesDashboardQueryKeysRoot, 'clear-caches', businessId] as const
};

/**
 * Retrieve voting dashboard data for a business.
 */
export const useVotingDashboard = (
  businessId: string,
  options?: QueryOptions<VotingDashboardResponse>
): UseQueryResult<VotingDashboardResponse, ApiError> => {
  return useQuery({
    queryKey: votesDashboardQueryKeys.dashboard(businessId),
    queryFn: () => votesDashboardApi.getVotingDashboard(businessId),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve voting service health.
 */
export const useVotingServiceHealth = (
  options?: QueryOptions<VotingServiceHealthResponse>
): UseQueryResult<VotingServiceHealthResponse, ApiError> => {
  return useQuery({
    queryKey: votesDashboardQueryKeys.health,
    queryFn: () => votesDashboardApi.getVotingServiceHealth(),
    ...options
  });
};

/**
 * Clear cached voting data for a business.
 */
export const useClearVotingCaches = (
  businessId: string,
  options?: MutationConfig<ClearVotingCachesResponse, void>
): UseMutationResult<ClearVotingCachesResponse, ApiError, void, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: votesDashboardMutationKeys.clearCaches(businessId),
    mutationFn: () => votesDashboardApi.clearVotingCaches(businessId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: votesDashboardQueryKeys.dashboard(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: votesDashboardQueryKeys.root });
      void queryClient.invalidateQueries({ queryKey: ['votes'] });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all voting dashboard operations.
 */
export interface UseVotesDashboardOptions {
  queries?: {
    dashboard?: QueryOptions<VotingDashboardResponse>;
    health?: QueryOptions<VotingServiceHealthResponse>;
  };
  mutations?: {
    clearCaches?: MutationConfig<ClearVotingCachesResponse, void>;
  };
}

export interface UseVotesDashboardResult {
  // Queries
  dashboard: (businessId: string) => UseQueryResult<VotingDashboardResponse, ApiError>;
  health: () => UseQueryResult<VotingServiceHealthResponse, ApiError>;

  // Mutations
  clearCaches: (
    businessId: string
  ) => UseMutationResult<ClearVotingCachesResponse, ApiError, void, unknown>;
}

export const useVotesDashboard = (
  options: UseVotesDashboardOptions = {}
): UseVotesDashboardResult => {
  return {
    dashboard: (businessId: string) =>
      useVotingDashboard(businessId, options.queries?.dashboard),
    health: () => useVotingServiceHealth(options.queries?.health),
    clearCaches: (businessId: string) =>
      useClearVotingCaches(businessId, options.mutations?.clearCaches)
  };
};
