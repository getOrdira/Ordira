'use client';

// src/hooks/features/votes/useVotesProposalManagement.ts

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

import votesProposalManagementApi, {
  type CreateProposalPayload,
  type CreateProposalResponse,
  type DeleteProposalResponse,
  type DeployProposalResponse,
  type ListProposalsQuery,
  type ListProposalsResponse,
  type ProposalActionResponse,
  type UpdateProposalPayload,
  type UpdateProposalResponse,
  type VotingProposalRecord
} from '@/lib/api/features/votes/votesProposalManagement.api';
import type { ProposalStatistics } from '@/lib/types/features/votes';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const normalizeObject = <T>(value?: T) => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return Object.keys(value).length ? (value as Record<string, unknown>) : null;
};

const votesProposalManagementQueryKeysRoot = ['votes', 'proposal-management'] as const;

export const votesProposalManagementQueryKeys = {
  root: votesProposalManagementQueryKeysRoot,
  proposal: (businessId: string, proposalId: string) =>
    [...votesProposalManagementQueryKeysRoot, businessId, proposalId] as const,
  statistics: (businessId: string, proposalId: string) =>
    [...votesProposalManagementQueryKeysRoot, 'statistics', businessId, proposalId] as const,
  list: (businessId: string, query?: ListProposalsQuery) =>
    [...votesProposalManagementQueryKeysRoot, 'list', businessId, normalizeObject(query)] as const
};

export const votesProposalManagementMutationKeys = {
  create: (businessId: string) =>
    [...votesProposalManagementQueryKeysRoot, 'create', businessId] as const,
  update: (businessId: string, proposalId: string) =>
    [...votesProposalManagementQueryKeysRoot, 'update', businessId, proposalId] as const,
  activate: (businessId: string, proposalId: string) =>
    [...votesProposalManagementQueryKeysRoot, 'activate', businessId, proposalId] as const,
  deactivate: (businessId: string, proposalId: string) =>
    [...votesProposalManagementQueryKeysRoot, 'deactivate', businessId, proposalId] as const,
  complete: (businessId: string, proposalId: string) =>
    [...votesProposalManagementQueryKeysRoot, 'complete', businessId, proposalId] as const,
  cancel: (businessId: string, proposalId: string) =>
    [...votesProposalManagementQueryKeysRoot, 'cancel', businessId, proposalId] as const,
  deploy: (businessId: string, proposalId: string) =>
    [...votesProposalManagementQueryKeysRoot, 'deploy', businessId, proposalId] as const,
  delete: (businessId: string, proposalId: string) =>
    [...votesProposalManagementQueryKeysRoot, 'delete', businessId, proposalId] as const
};

/**
 * Create a new proposal.
 */
export const useCreateProposal = (
  businessId: string,
  options?: MutationConfig<CreateProposalResponse, CreateProposalPayload>
): UseMutationResult<CreateProposalResponse, ApiError, CreateProposalPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: votesProposalManagementMutationKeys.create(businessId),
    mutationFn: (payload) => votesProposalManagementApi.createProposal(businessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: votesProposalManagementQueryKeys.list(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: votesProposalManagementQueryKeys.root });
    },
    ...options
  });
};

/**
 * Update an existing proposal.
 */
export const useUpdateProposal = (
  businessId: string,
  proposalId: string,
  options?: MutationConfig<UpdateProposalResponse, UpdateProposalPayload>
): UseMutationResult<UpdateProposalResponse, ApiError, UpdateProposalPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: votesProposalManagementMutationKeys.update(businessId, proposalId),
    mutationFn: (payload) =>
      votesProposalManagementApi.updateProposal(businessId, proposalId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: votesProposalManagementQueryKeys.proposal(businessId, proposalId)
      });
      void queryClient.invalidateQueries({
        queryKey: votesProposalManagementQueryKeys.list(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: votesProposalManagementQueryKeys.root });
    },
    ...options
  });
};

/**
 * Activate a proposal.
 */
export const useActivateProposal = (
  businessId: string,
  proposalId: string,
  options?: MutationConfig<ProposalActionResponse, void>
): UseMutationResult<ProposalActionResponse, ApiError, void, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: votesProposalManagementMutationKeys.activate(businessId, proposalId),
    mutationFn: () => votesProposalManagementApi.activateProposal(businessId, proposalId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: votesProposalManagementQueryKeys.proposal(businessId, proposalId)
      });
      void queryClient.invalidateQueries({
        queryKey: votesProposalManagementQueryKeys.list(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: votesProposalManagementQueryKeys.root });
    },
    ...options
  });
};

/**
 * Deactivate a proposal.
 */
export const useDeactivateProposal = (
  businessId: string,
  proposalId: string,
  options?: MutationConfig<ProposalActionResponse, void>
): UseMutationResult<ProposalActionResponse, ApiError, void, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: votesProposalManagementMutationKeys.deactivate(businessId, proposalId),
    mutationFn: () => votesProposalManagementApi.deactivateProposal(businessId, proposalId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: votesProposalManagementQueryKeys.proposal(businessId, proposalId)
      });
      void queryClient.invalidateQueries({
        queryKey: votesProposalManagementQueryKeys.list(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: votesProposalManagementQueryKeys.root });
    },
    ...options
  });
};

/**
 * Complete a proposal.
 */
export const useCompleteProposal = (
  businessId: string,
  proposalId: string,
  options?: MutationConfig<ProposalActionResponse, void>
): UseMutationResult<ProposalActionResponse, ApiError, void, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: votesProposalManagementMutationKeys.complete(businessId, proposalId),
    mutationFn: () => votesProposalManagementApi.completeProposal(businessId, proposalId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: votesProposalManagementQueryKeys.proposal(businessId, proposalId)
      });
      void queryClient.invalidateQueries({
        queryKey: votesProposalManagementQueryKeys.list(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: votesProposalManagementQueryKeys.root });
    },
    ...options
  });
};

/**
 * Cancel a proposal.
 */
export const useCancelProposal = (
  businessId: string,
  proposalId: string,
  options?: MutationConfig<ProposalActionResponse, void>
): UseMutationResult<ProposalActionResponse, ApiError, void, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: votesProposalManagementMutationKeys.cancel(businessId, proposalId),
    mutationFn: () => votesProposalManagementApi.cancelProposal(businessId, proposalId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: votesProposalManagementQueryKeys.proposal(businessId, proposalId)
      });
      void queryClient.invalidateQueries({
        queryKey: votesProposalManagementQueryKeys.list(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: votesProposalManagementQueryKeys.root });
    },
    ...options
  });
};

/**
 * Deploy a proposal to the blockchain.
 */
export const useDeployProposalToBlockchain = (
  businessId: string,
  proposalId: string,
  options?: MutationConfig<DeployProposalResponse, void>
): UseMutationResult<DeployProposalResponse, ApiError, void, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: votesProposalManagementMutationKeys.deploy(businessId, proposalId),
    mutationFn: () => votesProposalManagementApi.deployProposalToBlockchain(businessId, proposalId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: votesProposalManagementQueryKeys.proposal(businessId, proposalId)
      });
      void queryClient.invalidateQueries({ queryKey: votesProposalManagementQueryKeys.root });
    },
    ...options
  });
};

/**
 * Retrieve statistics for a proposal.
 */
export const useProposalStatistics = (
  businessId: string,
  proposalId: string,
  options?: QueryOptions<{ businessId: string; stats: ProposalStatistics }>
): UseQueryResult<{ businessId: string; stats: ProposalStatistics }, ApiError> => {
  return useQuery({
    queryKey: votesProposalManagementQueryKeys.statistics(businessId, proposalId),
    queryFn: () => votesProposalManagementApi.getProposalStatistics(businessId, proposalId),
    enabled: Boolean(businessId && proposalId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve a proposal.
 */
export const useProposal = (
  businessId: string,
  proposalId: string,
  options?: QueryOptions<{ proposal: VotingProposalRecord }>
): UseQueryResult<{ proposal: VotingProposalRecord }, ApiError> => {
  return useQuery({
    queryKey: votesProposalManagementQueryKeys.proposal(businessId, proposalId),
    queryFn: () => votesProposalManagementApi.getProposal(businessId, proposalId),
    enabled: Boolean(businessId && proposalId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * List proposals for a business.
 */
export const useListProposals = (
  businessId: string,
  query?: ListProposalsQuery,
  options?: QueryOptions<ListProposalsResponse>
): UseQueryResult<ListProposalsResponse, ApiError> => {
  return useQuery({
    queryKey: votesProposalManagementQueryKeys.list(businessId, query),
    queryFn: () => votesProposalManagementApi.listProposals(businessId, query),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Delete a proposal.
 */
export const useDeleteProposal = (
  businessId: string,
  proposalId: string,
  options?: MutationConfig<DeleteProposalResponse, void>
): UseMutationResult<DeleteProposalResponse, ApiError, void, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: votesProposalManagementMutationKeys.delete(businessId, proposalId),
    mutationFn: () => votesProposalManagementApi.deleteProposal(businessId, proposalId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: votesProposalManagementQueryKeys.list(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: votesProposalManagementQueryKeys.root });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all voting proposal management operations.
 */
export interface UseVotesProposalManagementOptions {
  queries?: {
    proposal?: QueryOptions<{ proposal: VotingProposalRecord }>;
    statistics?: QueryOptions<{ businessId: string; stats: ProposalStatistics }>;
    list?: QueryOptions<ListProposalsResponse>;
  };
  mutations?: {
    create?: MutationConfig<CreateProposalResponse, CreateProposalPayload>;
    update?: MutationConfig<UpdateProposalResponse, UpdateProposalPayload>;
    activate?: MutationConfig<ProposalActionResponse, void>;
    deactivate?: MutationConfig<ProposalActionResponse, void>;
    complete?: MutationConfig<ProposalActionResponse, void>;
    cancel?: MutationConfig<ProposalActionResponse, void>;
    deploy?: MutationConfig<DeployProposalResponse, void>;
    delete?: MutationConfig<DeleteProposalResponse, void>;
  };
}

export interface UseVotesProposalManagementResult {
  // Queries
  proposal: (
    businessId: string,
    proposalId: string
  ) => UseQueryResult<{ proposal: VotingProposalRecord }, ApiError>;
  statistics: (
    businessId: string,
    proposalId: string
  ) => UseQueryResult<{ businessId: string; stats: ProposalStatistics }, ApiError>;
  list: (
    businessId: string,
    query?: ListProposalsQuery
  ) => UseQueryResult<ListProposalsResponse, ApiError>;

  // Mutations
  create: (
    businessId: string
  ) => UseMutationResult<CreateProposalResponse, ApiError, CreateProposalPayload, unknown>;
  update: (
    businessId: string,
    proposalId: string
  ) => UseMutationResult<UpdateProposalResponse, ApiError, UpdateProposalPayload, unknown>;
  activate: (
    businessId: string,
    proposalId: string
  ) => UseMutationResult<ProposalActionResponse, ApiError, void, unknown>;
  deactivate: (
    businessId: string,
    proposalId: string
  ) => UseMutationResult<ProposalActionResponse, ApiError, void, unknown>;
  complete: (
    businessId: string,
    proposalId: string
  ) => UseMutationResult<ProposalActionResponse, ApiError, void, unknown>;
  cancel: (
    businessId: string,
    proposalId: string
  ) => UseMutationResult<ProposalActionResponse, ApiError, void, unknown>;
  deploy: (
    businessId: string,
    proposalId: string
  ) => UseMutationResult<DeployProposalResponse, ApiError, void, unknown>;
  delete: (
    businessId: string,
    proposalId: string
  ) => UseMutationResult<DeleteProposalResponse, ApiError, void, unknown>;
}

export const useVotesProposalManagement = (
  options: UseVotesProposalManagementOptions = {}
): UseVotesProposalManagementResult => {
  return {
    proposal: (businessId: string, proposalId: string) =>
      useProposal(businessId, proposalId, options.queries?.proposal),
    statistics: (businessId: string, proposalId: string) =>
      useProposalStatistics(businessId, proposalId, options.queries?.statistics),
    list: (businessId: string, query?: ListProposalsQuery) =>
      useListProposals(businessId, query, options.queries?.list),
    create: (businessId: string) => useCreateProposal(businessId, options.mutations?.create),
    update: (businessId: string, proposalId: string) =>
      useUpdateProposal(businessId, proposalId, options.mutations?.update),
    activate: (businessId: string, proposalId: string) =>
      useActivateProposal(businessId, proposalId, options.mutations?.activate),
    deactivate: (businessId: string, proposalId: string) =>
      useDeactivateProposal(businessId, proposalId, options.mutations?.deactivate),
    complete: (businessId: string, proposalId: string) =>
      useCompleteProposal(businessId, proposalId, options.mutations?.complete),
    cancel: (businessId: string, proposalId: string) =>
      useCancelProposal(businessId, proposalId, options.mutations?.cancel),
    deploy: (businessId: string, proposalId: string) =>
      useDeployProposalToBlockchain(businessId, proposalId, options.mutations?.deploy),
    delete: (businessId: string, proposalId: string) =>
      useDeleteProposal(businessId, proposalId, options.mutations?.delete)
  };
};
