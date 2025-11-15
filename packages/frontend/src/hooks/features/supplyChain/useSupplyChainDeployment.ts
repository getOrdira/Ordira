'use client';

// src/hooks/features/supplyChain/useSupplyChainDeployment.ts

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

import supplyChainDeploymentApi, {
  type DeployContractPayload,
  type DeploymentHistoryResponse,
  type DeploymentPrerequisitesResponse,
  type DeploymentStatusResponse
} from '@/lib/api/features/supplyChain/supplyChainDeployment.api';
import type { IDeploymentResult } from '@/lib/types/features/supplyChain';
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

export const supplyChainDeploymentQueryKeys = {
  root: ['supply-chain', 'deployment'] as const,
  status: (businessId?: string) =>
    [...supplyChainDeploymentQueryKeys.root, 'status', businessId ?? null] as const,
  prerequisites: (businessId?: string) =>
    [...supplyChainDeploymentQueryKeys.root, 'prerequisites', businessId ?? null] as const,
  history: (businessId?: string) =>
    [...supplyChainDeploymentQueryKeys.root, 'history', businessId ?? null] as const
};

export const supplyChainDeploymentMutationKeys = {
  deploy: [...supplyChainDeploymentQueryKeys.root, 'deploy'] as const
};

/**
 * Deploy a new supply chain contract.
 */
export const useDeployContract = (
  options?: MutationConfig<IDeploymentResult, DeployContractPayload>
): UseMutationResult<IDeploymentResult, ApiError, DeployContractPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainDeploymentMutationKeys.deploy,
    mutationFn: (payload) => supplyChainDeploymentApi.deployContract(payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: supplyChainDeploymentQueryKeys.status(variables.businessId)
      });
      void queryClient.invalidateQueries({ queryKey: supplyChainDeploymentQueryKeys.root });
    },
    ...options
  });
};

/**
 * Retrieve deployment status for a business.
 */
export const useDeploymentStatus = (
  businessId?: string,
  options?: QueryOptions<DeploymentStatusResponse>
): UseQueryResult<DeploymentStatusResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainDeploymentQueryKeys.status(businessId),
    queryFn: () => supplyChainDeploymentApi.getDeploymentStatus(businessId),
    ...options
  });
};

/**
 * Validate deployment prerequisites.
 */
export const useValidatePrerequisites = (
  businessId?: string,
  options?: QueryOptions<DeploymentPrerequisitesResponse>
): UseQueryResult<DeploymentPrerequisitesResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainDeploymentQueryKeys.prerequisites(businessId),
    queryFn: () => supplyChainDeploymentApi.validatePrerequisites(businessId),
    ...options
  });
};

/**
 * Retrieve deployment history.
 */
export const useDeploymentHistory = (
  businessId?: string,
  options?: QueryOptions<DeploymentHistoryResponse>
): UseQueryResult<DeploymentHistoryResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainDeploymentQueryKeys.history(businessId),
    queryFn: () => supplyChainDeploymentApi.getDeploymentHistory(businessId),
    ...options
  });
};

/**
 * Main hook that provides access to all supply chain deployment operations.
 */
export interface UseSupplyChainDeploymentOptions {
  queries?: {
    status?: QueryOptions<DeploymentStatusResponse>;
    prerequisites?: QueryOptions<DeploymentPrerequisitesResponse>;
    history?: QueryOptions<DeploymentHistoryResponse>;
  };
  mutations?: {
    deploy?: MutationConfig<IDeploymentResult, DeployContractPayload>;
  };
}

export interface UseSupplyChainDeploymentResult {
  // Queries
  status: (businessId?: string) => UseQueryResult<DeploymentStatusResponse, ApiError>;
  prerequisites: (businessId?: string) => UseQueryResult<DeploymentPrerequisitesResponse, ApiError>;
  history: (businessId?: string) => UseQueryResult<DeploymentHistoryResponse, ApiError>;

  // Mutations
  deploy: UseMutationResult<IDeploymentResult, ApiError, DeployContractPayload, unknown>;
}

export const useSupplyChainDeployment = (
  options: UseSupplyChainDeploymentOptions = {}
): UseSupplyChainDeploymentResult => {
  const deploy = useDeployContract(options.mutations?.deploy);

  return {
    status: (businessId?: string) =>
      useDeploymentStatus(businessId, options.queries?.status),
    prerequisites: (businessId?: string) =>
      useValidatePrerequisites(businessId, options.queries?.prerequisites),
    history: (businessId?: string) =>
      useDeploymentHistory(businessId, options.queries?.history),
    deploy
  };
};
