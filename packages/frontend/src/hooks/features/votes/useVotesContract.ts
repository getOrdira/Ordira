'use client';

// src/hooks/features/votes/useVotesContract.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import votesContractApi, {
  type ContractEventsResponse,
  type ContractInfoResponse
} from '@/lib/api/features/votes/votesContract.api';
import type {
  VotingContractVoteEvent,
  VotingProposalEvent
} from '@/lib/types/features/votes';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

const votesContractQueryKeysRoot = ['votes', 'contract'] as const;

export const votesContractQueryKeys = {
  root: votesContractQueryKeysRoot,
  info: (contractAddress: string) =>
    [...votesContractQueryKeysRoot, 'info', contractAddress] as const,
  proposalEvents: (contractAddress: string) =>
    [...votesContractQueryKeysRoot, 'proposal-events', contractAddress] as const,
  voteEvents: (contractAddress: string) =>
    [...votesContractQueryKeysRoot, 'vote-events', contractAddress] as const
};

/**
 * Retrieve on-chain contract info.
 */
export const useContractInfo = (
  contractAddress: string,
  options?: QueryOptions<ContractInfoResponse>
): UseQueryResult<ContractInfoResponse, ApiError> => {
  return useQuery({
    queryKey: votesContractQueryKeys.info(contractAddress),
    queryFn: () => votesContractApi.getContractInfo(contractAddress),
    enabled: Boolean(contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve proposal events emitted by the voting contract.
 */
export const useProposalEvents = (
  contractAddress: string,
  options?: QueryOptions<ContractEventsResponse<VotingProposalEvent>>
): UseQueryResult<ContractEventsResponse<VotingProposalEvent>, ApiError> => {
  return useQuery({
    queryKey: votesContractQueryKeys.proposalEvents(contractAddress),
    queryFn: () => votesContractApi.getProposalEvents(contractAddress),
    enabled: Boolean(contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve vote events emitted by the voting contract.
 */
export const useVoteEvents = (
  contractAddress: string,
  options?: QueryOptions<ContractEventsResponse<VotingContractVoteEvent>>
): UseQueryResult<ContractEventsResponse<VotingContractVoteEvent>, ApiError> => {
  return useQuery({
    queryKey: votesContractQueryKeys.voteEvents(contractAddress),
    queryFn: () => votesContractApi.getVoteEvents(contractAddress),
    enabled: Boolean(contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all voting contract operations.
 */
export interface UseVotesContractOptions {
  queries?: {
    info?: QueryOptions<ContractInfoResponse>;
    proposalEvents?: QueryOptions<ContractEventsResponse<VotingProposalEvent>>;
    voteEvents?: QueryOptions<ContractEventsResponse<VotingContractVoteEvent>>;
  };
}

export interface UseVotesContractResult {
  // Queries
  info: (contractAddress: string) => UseQueryResult<ContractInfoResponse, ApiError>;
  proposalEvents: (
    contractAddress: string
  ) => UseQueryResult<ContractEventsResponse<VotingProposalEvent>, ApiError>;
  voteEvents: (
    contractAddress: string
  ) => UseQueryResult<ContractEventsResponse<VotingContractVoteEvent>, ApiError>;
}

export const useVotesContract = (
  options: UseVotesContractOptions = {}
): UseVotesContractResult => {
  return {
    info: (contractAddress: string) =>
      useContractInfo(contractAddress, options.queries?.info),
    proposalEvents: (contractAddress: string) =>
      useProposalEvents(contractAddress, options.queries?.proposalEvents),
    voteEvents: (contractAddress: string) =>
      useVoteEvents(contractAddress, options.queries?.voteEvents)
  };
};
