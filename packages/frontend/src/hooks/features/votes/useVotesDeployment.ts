'use client';

// src/hooks/features/votes/useVotesDeployment.ts

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

import votesDeploymentApi, {
  type ContractDeploymentInfoResponse,
  type DeployVotingContractPayload,
  type DeployVotingContractResponse,
  type UpdateContractSettingsPayload,
  type UpdateContractSettingsResponse,
  type VerifyVotingContractResponse,
  type VotingContractAddressResponse
} from '@/lib/api/features/votes/votesDeployment.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const votesDeploymentQueryKeysRoot = ['votes', 'deployment'] as const;

export const votesDeploymentQueryKeys = {
  root: votesDeploymentQueryKeysRoot,
  contractAddress: (businessId: string) =>
    [...votesDeploymentQueryKeysRoot, 'contract-address', businessId] as const,
  verify: (businessId: string) =>
    [...votesDeploymentQueryKeysRoot, 'verify', businessId] as const,
  deploymentInfo: (businessId: string) =>
    [...votesDeploymentQueryKeysRoot, 'deployment-info', businessId] as const
};

export const votesDeploymentMutationKeys = {
  deploy: [...votesDeploymentQueryKeysRoot, 'deploy'] as const,
  updateSettings: [...votesDeploymentQueryKeysRoot, 'update-settings'] as const
};

/**
 * Deploy a new voting contract for a business.
 */
export const useDeployVotingContract = (
  options?: MutationConfig<DeployVotingContractResponse, DeployVotingContractPayload>
): UseMutationResult<DeployVotingContractResponse, ApiError, DeployVotingContractPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: votesDeploymentMutationKeys.deploy,
    mutationFn: (payload) => votesDeploymentApi.deployVotingContract(payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: votesDeploymentQueryKeys.contractAddress(variables.businessId)
      });
      void queryClient.invalidateQueries({ queryKey: votesDeploymentQueryKeys.root });
      void queryClient.invalidateQueries({ queryKey: ['votes'] });
    },
    ...options
  });
};

/**
 * Retrieve the voting contract address for a business.
 */
export const useVotingContractAddress = (
  businessId: string,
  options?: QueryOptions<VotingContractAddressResponse>
): UseQueryResult<VotingContractAddressResponse, ApiError> => {
  return useQuery({
    queryKey: votesDeploymentQueryKeys.contractAddress(businessId),
    queryFn: () => votesDeploymentApi.getVotingContractAddress(businessId),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Verify whether a business has a deployed voting contract.
 */
export const useVerifyVotingContract = (
  businessId: string,
  options?: QueryOptions<VerifyVotingContractResponse>
): UseQueryResult<VerifyVotingContractResponse, ApiError> => {
  return useQuery({
    queryKey: votesDeploymentQueryKeys.verify(businessId),
    queryFn: () => votesDeploymentApi.verifyVotingContract(businessId),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve contract deployment info for a business.
 */
export const useContractDeploymentInfo = (
  businessId: string,
  options?: QueryOptions<ContractDeploymentInfoResponse>
): UseQueryResult<ContractDeploymentInfoResponse, ApiError> => {
  return useQuery({
    queryKey: votesDeploymentQueryKeys.deploymentInfo(businessId),
    queryFn: () => votesDeploymentApi.getContractDeploymentInfo(businessId),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Update stored voting contract settings (metadata only).
 */
export const useUpdateContractSettings = (
  options?: MutationConfig<UpdateContractSettingsResponse, UpdateContractSettingsPayload>
): UseMutationResult<UpdateContractSettingsResponse, ApiError, UpdateContractSettingsPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: votesDeploymentMutationKeys.updateSettings,
    mutationFn: (payload) => votesDeploymentApi.updateContractSettings(payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: votesDeploymentQueryKeys.deploymentInfo(variables.businessId)
      });
      void queryClient.invalidateQueries({ queryKey: votesDeploymentQueryKeys.root });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all voting deployment operations.
 */
export interface UseVotesDeploymentOptions {
  queries?: {
    contractAddress?: QueryOptions<VotingContractAddressResponse>;
    verify?: QueryOptions<VerifyVotingContractResponse>;
    deploymentInfo?: QueryOptions<ContractDeploymentInfoResponse>;
  };
  mutations?: {
    deploy?: MutationConfig<DeployVotingContractResponse, DeployVotingContractPayload>;
    updateSettings?: MutationConfig<UpdateContractSettingsResponse, UpdateContractSettingsPayload>;
  };
}

export interface UseVotesDeploymentResult {
  // Queries
  contractAddress: (
    businessId: string
  ) => UseQueryResult<VotingContractAddressResponse, ApiError>;
  verify: (businessId: string) => UseQueryResult<VerifyVotingContractResponse, ApiError>;
  deploymentInfo: (
    businessId: string
  ) => UseQueryResult<ContractDeploymentInfoResponse, ApiError>;

  // Mutations
  deploy: UseMutationResult<
    DeployVotingContractResponse,
    ApiError,
    DeployVotingContractPayload,
    unknown
  >;
  updateSettings: UseMutationResult<
    UpdateContractSettingsResponse,
    ApiError,
    UpdateContractSettingsPayload,
    unknown
  >;
}

export const useVotesDeployment = (
  options: UseVotesDeploymentOptions = {}
): UseVotesDeploymentResult => {
  const deploy = useDeployVotingContract(options.mutations?.deploy);
  const updateSettings = useUpdateContractSettings(options.mutations?.updateSettings);

  return {
    contractAddress: (businessId: string) =>
      useVotingContractAddress(businessId, options.queries?.contractAddress),
    verify: (businessId: string) =>
      useVerifyVotingContract(businessId, options.queries?.verify),
    deploymentInfo: (businessId: string) =>
      useContractDeploymentInfo(businessId, options.queries?.deploymentInfo),
    deploy,
    updateSettings
  };
};
