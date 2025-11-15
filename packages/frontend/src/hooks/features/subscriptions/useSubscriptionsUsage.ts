'use client';

// src/hooks/features/subscriptions/useSubscriptionsUsage.ts

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

import subscriptionsUsageApi, {
  type NftLimitsSummary,
  type UsageCheckPayload,
  type UsageRecordPayload,
  type VotingLimitsSummary
} from '@/lib/api/features/subscriptions/subscriptionsUsage.api';
import type { UsageLimitsCheck } from '@/lib/types/features/subscriptions';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const subscriptionsUsageQueryKeys = {
  root: ['subscriptions', 'usage'] as const,
  votingLimits: () => [...subscriptionsUsageQueryKeys.root, 'voting-limits'] as const,
  nftLimits: () => [...subscriptionsUsageQueryKeys.root, 'nft-limits'] as const
};

export const subscriptionsUsageMutationKeys = {
  checkVoting: [...subscriptionsUsageQueryKeys.root, 'check-voting'] as const,
  checkNft: [...subscriptionsUsageQueryKeys.root, 'check-nft'] as const,
  checkApi: [...subscriptionsUsageQueryKeys.root, 'check-api'] as const,
  recordVote: [...subscriptionsUsageQueryKeys.root, 'record-vote'] as const,
  recordNft: [...subscriptionsUsageQueryKeys.root, 'record-nft'] as const,
  recordApi: [...subscriptionsUsageQueryKeys.root, 'record-api'] as const
};

/**
 * Check voting limits.
 */
export const useCheckVotingLimits = (
  options?: MutationConfig<{ result: UsageLimitsCheck }, UsageCheckPayload | undefined>
): UseMutationResult<{ result: UsageLimitsCheck }, ApiError, UsageCheckPayload | undefined, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsUsageMutationKeys.checkVoting,
    mutationFn: (payload) => subscriptionsUsageApi.checkVotingLimits(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsUsageQueryKeys.votingLimits() });
    },
    ...options
  });
};

/**
 * Check NFT limits.
 */
export const useCheckNftLimits = (
  options?: MutationConfig<{ result: UsageLimitsCheck }, UsageCheckPayload | undefined>
): UseMutationResult<{ result: UsageLimitsCheck }, ApiError, UsageCheckPayload | undefined, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsUsageMutationKeys.checkNft,
    mutationFn: (payload) => subscriptionsUsageApi.checkNftLimits(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsUsageQueryKeys.nftLimits() });
    },
    ...options
  });
};

/**
 * Check API limits.
 */
export const useCheckApiLimits = (
  options?: MutationConfig<{ result: UsageLimitsCheck }, UsageCheckPayload | undefined>
): UseMutationResult<{ result: UsageLimitsCheck }, ApiError, UsageCheckPayload | undefined, unknown> => {
  return useMutation({
    mutationKey: subscriptionsUsageMutationKeys.checkApi,
    mutationFn: (payload) => subscriptionsUsageApi.checkApiLimits(payload),
    ...options
  });
};

/**
 * Record vote usage.
 */
export const useRecordVoteUsage = (
  options?: MutationConfig<{ recorded: { type: string; count: number } }, UsageRecordPayload | undefined>
): UseMutationResult<
  { recorded: { type: string; count: number } },
  ApiError,
  UsageRecordPayload | undefined,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsUsageMutationKeys.recordVote,
    mutationFn: (payload) => subscriptionsUsageApi.recordVoteUsage(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsUsageQueryKeys.votingLimits() });
    },
    ...options
  });
};

/**
 * Record NFT usage.
 */
export const useRecordNftUsage = (
  options?: MutationConfig<{ recorded: { type: string; count: number } }, UsageRecordPayload | undefined>
): UseMutationResult<
  { recorded: { type: string; count: number } },
  ApiError,
  UsageRecordPayload | undefined,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsUsageMutationKeys.recordNft,
    mutationFn: (payload) => subscriptionsUsageApi.recordNftUsage(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsUsageQueryKeys.nftLimits() });
    },
    ...options
  });
};

/**
 * Record API usage.
 */
export const useRecordApiUsage = (
  options?: MutationConfig<{ recorded: { type: string; count: number } }, UsageRecordPayload | undefined>
): UseMutationResult<
  { recorded: { type: string; count: number } },
  ApiError,
  UsageRecordPayload | undefined,
  unknown
> => {
  return useMutation({
    mutationKey: subscriptionsUsageMutationKeys.recordApi,
    mutationFn: (payload) => subscriptionsUsageApi.recordApiUsage(payload),
    ...options
  });
};

/**
 * Retrieve voting limits.
 */
export const useVotingLimits = (
  options?: QueryOptions<{ limits: VotingLimitsSummary }>
): UseQueryResult<{ limits: VotingLimitsSummary }, ApiError> => {
  return useQuery({
    queryKey: subscriptionsUsageQueryKeys.votingLimits(),
    queryFn: () => subscriptionsUsageApi.getVotingLimits(),
    ...options
  });
};

/**
 * Retrieve NFT limits.
 */
export const useNftLimits = (
  options?: QueryOptions<{ limits: NftLimitsSummary }>
): UseQueryResult<{ limits: NftLimitsSummary }, ApiError> => {
  return useQuery({
    queryKey: subscriptionsUsageQueryKeys.nftLimits(),
    queryFn: () => subscriptionsUsageApi.getNftLimits(),
    ...options
  });
};

/**
 * Main hook that provides access to all subscription usage operations.
 */
export interface UseSubscriptionsUsageOptions {
  queries?: {
    votingLimits?: QueryOptions<{ limits: VotingLimitsSummary }>;
    nftLimits?: QueryOptions<{ limits: NftLimitsSummary }>;
  };
  mutations?: {
    checkVoting?: MutationConfig<{ result: UsageLimitsCheck }, UsageCheckPayload | undefined>;
    checkNft?: MutationConfig<{ result: UsageLimitsCheck }, UsageCheckPayload | undefined>;
    checkApi?: MutationConfig<{ result: UsageLimitsCheck }, UsageCheckPayload | undefined>;
    recordVote?: MutationConfig<{ recorded: { type: string; count: number } }, UsageRecordPayload | undefined>;
    recordNft?: MutationConfig<{ recorded: { type: string; count: number } }, UsageRecordPayload | undefined>;
    recordApi?: MutationConfig<{ recorded: { type: string; count: number } }, UsageRecordPayload | undefined>;
  };
}

export interface UseSubscriptionsUsageResult {
  // Queries
  votingLimits: UseQueryResult<{ limits: VotingLimitsSummary }, ApiError>;
  nftLimits: UseQueryResult<{ limits: NftLimitsSummary }, ApiError>;

  // Mutations
  checkVoting: UseMutationResult<{ result: UsageLimitsCheck }, ApiError, UsageCheckPayload | undefined, unknown>;
  checkNft: UseMutationResult<{ result: UsageLimitsCheck }, ApiError, UsageCheckPayload | undefined, unknown>;
  checkApi: UseMutationResult<{ result: UsageLimitsCheck }, ApiError, UsageCheckPayload | undefined, unknown>;
  recordVote: UseMutationResult<
    { recorded: { type: string; count: number } },
    ApiError,
    UsageRecordPayload | undefined,
    unknown
  >;
  recordNft: UseMutationResult<
    { recorded: { type: string; count: number } },
    ApiError,
    UsageRecordPayload | undefined,
    unknown
  >;
  recordApi: UseMutationResult<
    { recorded: { type: string; count: number } },
    ApiError,
    UsageRecordPayload | undefined,
    unknown
  >;
}

export const useSubscriptionsUsage = (
  options: UseSubscriptionsUsageOptions = {}
): UseSubscriptionsUsageResult => {
  const checkVoting = useCheckVotingLimits(options.mutations?.checkVoting);
  const checkNft = useCheckNftLimits(options.mutations?.checkNft);
  const checkApi = useCheckApiLimits(options.mutations?.checkApi);
  const recordVote = useRecordVoteUsage(options.mutations?.recordVote);
  const recordNft = useRecordNftUsage(options.mutations?.recordNft);
  const recordApi = useRecordApiUsage(options.mutations?.recordApi);

  return {
    votingLimits: useVotingLimits(options.queries?.votingLimits),
    nftLimits: useNftLimits(options.queries?.nftLimits),
    checkVoting,
    checkNft,
    checkApi,
    recordVote,
    recordNft,
    recordApi
  };
};
