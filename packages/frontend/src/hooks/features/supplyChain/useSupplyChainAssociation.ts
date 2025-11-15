'use client';

// src/hooks/features/supplyChain/useSupplyChainAssociation.ts

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

import supplyChainAssociationApi, {
  type BusinessesByContractResponse,
  type ContractStatisticsResponse,
  type GetAllMappingsResponse,
  type GetMappingQuery,
  type GetMappingResponse,
  type StoreMappingPayload,
  type StoreMappingResponse,
  type UpdateAssociationStatusPayload,
  type UpdateAssociationStatusResponse,
  type ValidateAssociationQuery,
  type ValidateAssociationResponse,
  type ValidateBusinessExistsResponse
} from '@/lib/api/features/supplyChain/supplyChainAssociation.api';
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

export const supplyChainAssociationQueryKeys = {
  root: ['supply-chain', 'association'] as const,
  mapping: (query: GetMappingQuery) =>
    [...supplyChainAssociationQueryKeys.root, 'mapping', normalizeObject(query)] as const,
  mappings: (businessId?: string) =>
    [...supplyChainAssociationQueryKeys.root, 'mappings', businessId ?? null] as const,
  validate: (query: ValidateAssociationQuery) =>
    [...supplyChainAssociationQueryKeys.root, 'validate', normalizeObject(query)] as const,
  statistics: (businessId?: string) =>
    [...supplyChainAssociationQueryKeys.root, 'statistics', businessId ?? null] as const,
  validateBusiness: (businessId?: string) =>
    [...supplyChainAssociationQueryKeys.root, 'validate-business', businessId ?? null] as const,
  businesses: (contractAddress: string) =>
    [...supplyChainAssociationQueryKeys.root, 'businesses', contractAddress] as const
};

export const supplyChainAssociationMutationKeys = {
  storeMapping: [...supplyChainAssociationQueryKeys.root, 'store-mapping'] as const,
  updateStatus: [...supplyChainAssociationQueryKeys.root, 'update-status'] as const
};

/**
 * Store business-contract mapping.
 */
export const useStoreBusinessContractMapping = (
  options?: MutationConfig<StoreMappingResponse, StoreMappingPayload>
): UseMutationResult<StoreMappingResponse, ApiError, StoreMappingPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainAssociationMutationKeys.storeMapping,
    mutationFn: (payload) => supplyChainAssociationApi.storeBusinessContractMapping(payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: supplyChainAssociationQueryKeys.mappings(variables.businessId)
      });
      void queryClient.invalidateQueries({ queryKey: supplyChainAssociationQueryKeys.root });
    },
    ...options
  });
};

/**
 * Retrieve business contract mapping.
 */
export const useBusinessContractMapping = (
  query: GetMappingQuery,
  options?: QueryOptions<GetMappingResponse>
): UseQueryResult<GetMappingResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainAssociationQueryKeys.mapping(query),
    queryFn: () => supplyChainAssociationApi.getBusinessContractMapping(query),
    enabled: Boolean(query.contractType) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve all business contract mappings.
 */
export const useAllBusinessContractMappings = (
  businessId?: string,
  options?: QueryOptions<GetAllMappingsResponse>
): UseQueryResult<GetAllMappingsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainAssociationQueryKeys.mappings(businessId),
    queryFn: () => supplyChainAssociationApi.getAllBusinessContractMappings(businessId),
    ...options
  });
};

/**
 * Validate business contract association.
 */
export const useValidateBusinessContractAssociation = (
  query: ValidateAssociationQuery,
  options?: QueryOptions<ValidateAssociationResponse>
): UseQueryResult<ValidateAssociationResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainAssociationQueryKeys.validate(query),
    queryFn: () => supplyChainAssociationApi.validateBusinessContractAssociation(query),
    enabled:
      Boolean(query.contractAddress && query.contractType) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Update contract association status.
 */
export const useUpdateContractAssociationStatus = (
  options?: MutationConfig<UpdateAssociationStatusResponse, UpdateAssociationStatusPayload>
): UseMutationResult<
  UpdateAssociationStatusResponse,
  ApiError,
  UpdateAssociationStatusPayload,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainAssociationMutationKeys.updateStatus,
    mutationFn: (payload) => supplyChainAssociationApi.updateContractAssociationStatus(payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: supplyChainAssociationQueryKeys.mappings(variables.businessId)
      });
      void queryClient.invalidateQueries({ queryKey: supplyChainAssociationQueryKeys.root });
    },
    ...options
  });
};

/**
 * Retrieve contract statistics.
 */
export const useContractStatistics = (
  businessId?: string,
  options?: QueryOptions<ContractStatisticsResponse>
): UseQueryResult<ContractStatisticsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainAssociationQueryKeys.statistics(businessId),
    queryFn: () => supplyChainAssociationApi.getContractStatistics(businessId),
    ...options
  });
};

/**
 * Validate business existence.
 */
export const useValidateBusinessExists = (
  businessId?: string,
  options?: QueryOptions<ValidateBusinessExistsResponse>
): UseQueryResult<ValidateBusinessExistsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainAssociationQueryKeys.validateBusiness(businessId),
    queryFn: () => supplyChainAssociationApi.validateBusinessExists(businessId),
    ...options
  });
};

/**
 * Retrieve businesses by contract address.
 */
export const useBusinessesByContractAddress = (
  contractAddress: string,
  options?: QueryOptions<BusinessesByContractResponse>
): UseQueryResult<BusinessesByContractResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainAssociationQueryKeys.businesses(contractAddress),
    queryFn: () => supplyChainAssociationApi.getBusinessesByContractAddress(contractAddress),
    enabled: Boolean(contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all supply chain association operations.
 */
export interface UseSupplyChainAssociationOptions {
  queries?: {
    mapping?: QueryOptions<GetMappingResponse>;
    mappings?: QueryOptions<GetAllMappingsResponse>;
    validate?: QueryOptions<ValidateAssociationResponse>;
    statistics?: QueryOptions<ContractStatisticsResponse>;
    validateBusiness?: QueryOptions<ValidateBusinessExistsResponse>;
    businesses?: QueryOptions<BusinessesByContractResponse>;
  };
  mutations?: {
    storeMapping?: MutationConfig<StoreMappingResponse, StoreMappingPayload>;
    updateStatus?: MutationConfig<UpdateAssociationStatusResponse, UpdateAssociationStatusPayload>;
  };
}

export interface UseSupplyChainAssociationResult {
  // Queries
  mapping: (query: GetMappingQuery) => UseQueryResult<GetMappingResponse, ApiError>;
  mappings: (businessId?: string) => UseQueryResult<GetAllMappingsResponse, ApiError>;
  validate: (query: ValidateAssociationQuery) => UseQueryResult<ValidateAssociationResponse, ApiError>;
  statistics: (businessId?: string) => UseQueryResult<ContractStatisticsResponse, ApiError>;
  validateBusiness: (businessId?: string) => UseQueryResult<ValidateBusinessExistsResponse, ApiError>;
  businesses: (
    contractAddress: string
  ) => UseQueryResult<BusinessesByContractResponse, ApiError>;

  // Mutations
  storeMapping: UseMutationResult<StoreMappingResponse, ApiError, StoreMappingPayload, unknown>;
  updateStatus: UseMutationResult<
    UpdateAssociationStatusResponse,
    ApiError,
    UpdateAssociationStatusPayload,
    unknown
  >;
}

export const useSupplyChainAssociation = (
  options: UseSupplyChainAssociationOptions = {}
): UseSupplyChainAssociationResult => {
  const storeMapping = useStoreBusinessContractMapping(options.mutations?.storeMapping);
  const updateStatus = useUpdateContractAssociationStatus(options.mutations?.updateStatus);

  return {
    mapping: (query: GetMappingQuery) =>
      useBusinessContractMapping(query, options.queries?.mapping),
    mappings: (businessId?: string) =>
      useAllBusinessContractMappings(businessId, options.queries?.mappings),
    validate: (query: ValidateAssociationQuery) =>
      useValidateBusinessContractAssociation(query, options.queries?.validate),
    statistics: (businessId?: string) =>
      useContractStatistics(businessId, options.queries?.statistics),
    validateBusiness: (businessId?: string) =>
      useValidateBusinessExists(businessId, options.queries?.validateBusiness),
    businesses: (contractAddress: string) =>
      useBusinessesByContractAddress(contractAddress, options.queries?.businesses),
    storeMapping,
    updateStatus
  };
};
