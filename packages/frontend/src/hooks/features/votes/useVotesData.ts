'use client';

// src/hooks/features/votes/useVotesData.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import votesDataApi, {
  type BusinessVotesQuery,
  type BusinessVotesResponse,
  type PendingVotesQuery,
  type PendingVotesResponse,
  type ProposalPendingStats,
  type VotingActivityQuery,
  type VotingActivityResponse,
  type VotingContractAddressResponse,
  type VotingCountsResponse
} from '@/lib/api/features/votes/votesData.api';
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

const votesDataQueryKeysRoot = ['votes', 'data'] as const;

export const votesDataQueryKeys = {
  root: votesDataQueryKeysRoot,
  businessVotes: (businessId: string, query?: BusinessVotesQuery) =>
    [...votesDataQueryKeysRoot, 'business-votes', businessId, normalizeObject(query)] as const,
  pendingVotes: (businessId: string, query?: PendingVotesQuery) =>
    [...votesDataQueryKeysRoot, 'pending-votes', businessId, normalizeObject(query)] as const,
  activity: (businessId: string, query?: VotingActivityQuery) =>
    [...votesDataQueryKeysRoot, 'activity', businessId, normalizeObject(query)] as const,
  proposalStats: (businessId: string, proposalId: string) =>
    [...votesDataQueryKeysRoot, 'proposal-stats', businessId, proposalId] as const,
  contractAddress: (businessId: string) =>
    [...votesDataQueryKeysRoot, 'contract-address', businessId] as const,
  counts: (businessId: string) => [...votesDataQueryKeysRoot, 'counts', businessId] as const
};

/**
 * Retrieve voting records for a business.
 */
export const useBusinessVotes = (
  businessId: string,
  query?: BusinessVotesQuery,
  options?: QueryOptions<BusinessVotesResponse>
): UseQueryResult<BusinessVotesResponse, ApiError> => {
  return useQuery({
    queryKey: votesDataQueryKeys.businessVotes(businessId, query),
    queryFn: () => votesDataApi.getBusinessVotes(businessId, query),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve pending votes for a business.
 */
export const usePendingVotes = (
  businessId: string,
  query?: PendingVotesQuery,
  options?: QueryOptions<PendingVotesResponse>
): UseQueryResult<PendingVotesResponse, ApiError> => {
  return useQuery({
    queryKey: votesDataQueryKeys.pendingVotes(businessId, query),
    queryFn: () => votesDataApi.getPendingVotes(businessId, query),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve recent voting activity trends.
 */
export const useRecentVotingActivity = (
  businessId: string,
  query?: VotingActivityQuery,
  options?: QueryOptions<VotingActivityResponse>
): UseQueryResult<VotingActivityResponse, ApiError> => {
  return useQuery({
    queryKey: votesDataQueryKeys.activity(businessId, query),
    queryFn: () => votesDataApi.getRecentVotingActivity(businessId, query),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve pending proposal stats.
 */
export const useProposalPendingStats = (
  businessId: string,
  proposalId: string,
  options?: QueryOptions<ProposalPendingStats>
): UseQueryResult<ProposalPendingStats, ApiError> => {
  return useQuery({
    queryKey: votesDataQueryKeys.proposalStats(businessId, proposalId),
    queryFn: () => votesDataApi.getProposalPendingStats(businessId, proposalId),
    enabled: Boolean(businessId && proposalId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve voting contract address for a business.
 */
export const useVoteContractAddress = (
  businessId: string,
  options?: QueryOptions<VotingContractAddressResponse>
): UseQueryResult<VotingContractAddressResponse, ApiError> => {
  return useQuery({
    queryKey: votesDataQueryKeys.contractAddress(businessId),
    queryFn: () => votesDataApi.getVoteContractAddress(businessId),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve voting counts for a business.
 */
export const useVotingCounts = (
  businessId: string,
  options?: QueryOptions<VotingCountsResponse>
): UseQueryResult<VotingCountsResponse, ApiError> => {
  return useQuery({
    queryKey: votesDataQueryKeys.counts(businessId),
    queryFn: () => votesDataApi.getVotingCounts(businessId),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all voting data operations.
 */
export interface UseVotesDataOptions {
  queries?: {
    businessVotes?: QueryOptions<BusinessVotesResponse>;
    pendingVotes?: QueryOptions<PendingVotesResponse>;
    activity?: QueryOptions<VotingActivityResponse>;
    proposalStats?: QueryOptions<ProposalPendingStats>;
    contractAddress?: QueryOptions<VotingContractAddressResponse>;
    counts?: QueryOptions<VotingCountsResponse>;
  };
}

export interface UseVotesDataResult {
  // Queries
  businessVotes: (
    businessId: string,
    query?: BusinessVotesQuery
  ) => UseQueryResult<BusinessVotesResponse, ApiError>;
  pendingVotes: (
    businessId: string,
    query?: PendingVotesQuery
  ) => UseQueryResult<PendingVotesResponse, ApiError>;
  activity: (
    businessId: string,
    query?: VotingActivityQuery
  ) => UseQueryResult<VotingActivityResponse, ApiError>;
  proposalStats: (
    businessId: string,
    proposalId: string
  ) => UseQueryResult<ProposalPendingStats, ApiError>;
  contractAddress: (
    businessId: string
  ) => UseQueryResult<VotingContractAddressResponse, ApiError>;
  counts: (businessId: string) => UseQueryResult<VotingCountsResponse, ApiError>;
}

export const useVotesData = (options: UseVotesDataOptions = {}): UseVotesDataResult => {
  return {
    businessVotes: (businessId: string, query?: BusinessVotesQuery) =>
      useBusinessVotes(businessId, query, options.queries?.businessVotes),
    pendingVotes: (businessId: string, query?: PendingVotesQuery) =>
      usePendingVotes(businessId, query, options.queries?.pendingVotes),
    activity: (businessId: string, query?: VotingActivityQuery) =>
      useRecentVotingActivity(businessId, query, options.queries?.activity),
    proposalStats: (businessId: string, proposalId: string) =>
      useProposalPendingStats(businessId, proposalId, options.queries?.proposalStats),
    contractAddress: (businessId: string) =>
      useVoteContractAddress(businessId, options.queries?.contractAddress),
    counts: (businessId: string) => useVotingCounts(businessId, options.queries?.counts)
  };
};
