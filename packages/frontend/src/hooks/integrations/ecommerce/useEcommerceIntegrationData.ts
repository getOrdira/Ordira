'use client';

// src/hooks/integrations/ecommerce/useEcommerceIntegrationData.ts

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

import ecommerceIntegrationDataApi, {
  type ConnectedBusinessesResponse,
  type IntegrationClearResponse,
  type IntegrationStatusParams,
  type IntegrationStatusResponse,
  type ProviderLookupParams,
  type ProviderLookupResponse,
  type RecordSyncPayload,
  type RecordSyncResponse,
  type UpsertIntegrationPayload
} from '@/lib/api/integrations/ecommerce/ecommerceIntegrationData.api';
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

const ecommerceIntegrationDataQueryKeysRoot = ['integrations', 'ecommerce', 'integration-data'] as const;

export const ecommerceIntegrationDataQueryKeys = {
  root: ecommerceIntegrationDataQueryKeysRoot,
  status: (params: IntegrationStatusParams) =>
    [...ecommerceIntegrationDataQueryKeysRoot, 'status', params.provider, params.businessId, normalizeObject(params)] as const,
  lookup: (params: ProviderLookupParams) =>
    [...ecommerceIntegrationDataQueryKeysRoot, 'lookup', params.provider, params.identifier] as const,
  connected: (provider: string) =>
    [...ecommerceIntegrationDataQueryKeysRoot, 'connected', provider] as const
};

export const ecommerceIntegrationDataMutationKeys = {
  upsertCredentials: (params: IntegrationStatusParams) =>
    [...ecommerceIntegrationDataQueryKeysRoot, 'upsert-credentials', params.provider, params.businessId] as const,
  clear: (params: IntegrationStatusParams) =>
    [...ecommerceIntegrationDataQueryKeysRoot, 'clear', params.provider, params.businessId] as const,
  recordSync: (params: IntegrationStatusParams) =>
    [...ecommerceIntegrationDataQueryKeysRoot, 'record-sync', params.provider, params.businessId] as const
};

/**
 * Retrieve ecommerce integration status.
 */
export const useIntegrationStatus = (
  params: IntegrationStatusParams,
  options?: QueryOptions<IntegrationStatusResponse>
): UseQueryResult<IntegrationStatusResponse, ApiError> => {
  return useQuery({
    queryKey: ecommerceIntegrationDataQueryKeys.status(params),
    queryFn: () => ecommerceIntegrationDataApi.getIntegrationStatus(params),
    enabled: Boolean(params.businessId && params.provider) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Upsert ecommerce integration credentials.
 */
export const useUpsertIntegrationCredentials = (
  params: IntegrationStatusParams,
  options?: MutationConfig<IntegrationStatusResponse, UpsertIntegrationPayload>
): UseMutationResult<IntegrationStatusResponse, ApiError, UpsertIntegrationPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ecommerceIntegrationDataMutationKeys.upsertCredentials(params),
    mutationFn: (payload) => ecommerceIntegrationDataApi.upsertIntegrationCredentials(params, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ecommerceIntegrationDataQueryKeys.status(params)
      });
      void queryClient.invalidateQueries({ queryKey: ecommerceIntegrationDataQueryKeys.root });
    },
    ...options
  });
};

/**
 * Clear ecommerce integration credentials.
 */
export const useClearIntegration = (
  params: IntegrationStatusParams,
  options?: MutationConfig<IntegrationClearResponse, void>
): UseMutationResult<IntegrationClearResponse, ApiError, void, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ecommerceIntegrationDataMutationKeys.clear(params),
    mutationFn: () => ecommerceIntegrationDataApi.clearIntegration(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ecommerceIntegrationDataQueryKeys.status(params)
      });
      void queryClient.invalidateQueries({ queryKey: ecommerceIntegrationDataQueryKeys.root });
    },
    ...options
  });
};

/**
 * Record successful ecommerce integration sync.
 */
export const useRecordSuccessfulSync = (
  params: IntegrationStatusParams,
  options?: MutationConfig<RecordSyncResponse, RecordSyncPayload>
): UseMutationResult<RecordSyncResponse, ApiError, RecordSyncPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ecommerceIntegrationDataMutationKeys.recordSync(params),
    mutationFn: (payload) => ecommerceIntegrationDataApi.recordSuccessfulSync(params, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ecommerceIntegrationDataQueryKeys.status(params)
      });
      void queryClient.invalidateQueries({ queryKey: ecommerceIntegrationDataQueryKeys.root });
    },
    ...options
  });
};

/**
 * Find business by provider identifier.
 */
export const useFindBusinessByProviderIdentifier = (
  params: ProviderLookupParams,
  options?: QueryOptions<ProviderLookupResponse>
): UseQueryResult<ProviderLookupResponse, ApiError> => {
  return useQuery({
    queryKey: ecommerceIntegrationDataQueryKeys.lookup(params),
    queryFn: () => ecommerceIntegrationDataApi.findBusinessByProviderIdentifier(params),
    enabled: Boolean(params.provider && params.identifier) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * List business IDs connected to a provider.
 */
export const useListConnectedBusinesses = (
  provider: string,
  options?: QueryOptions<ConnectedBusinessesResponse>
): UseQueryResult<ConnectedBusinessesResponse, ApiError> => {
  return useQuery({
    queryKey: ecommerceIntegrationDataQueryKeys.connected(provider),
    queryFn: () => ecommerceIntegrationDataApi.listConnectedBusinesses(provider),
    enabled: Boolean(provider) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all ecommerce integration data operations.
 */
export interface UseEcommerceIntegrationDataOptions {
  queries?: {
    status?: QueryOptions<IntegrationStatusResponse>;
    lookup?: QueryOptions<ProviderLookupResponse>;
    connected?: QueryOptions<ConnectedBusinessesResponse>;
  };
  mutations?: {
    upsertCredentials?: MutationConfig<IntegrationStatusResponse, UpsertIntegrationPayload>;
    clear?: MutationConfig<IntegrationClearResponse, void>;
    recordSync?: MutationConfig<RecordSyncResponse, RecordSyncPayload>;
  };
}

export interface UseEcommerceIntegrationDataResult {
  // Queries
  status: (params: IntegrationStatusParams) => UseQueryResult<IntegrationStatusResponse, ApiError>;
  lookup: (params: ProviderLookupParams) => UseQueryResult<ProviderLookupResponse, ApiError>;
  connected: (provider: string) => UseQueryResult<ConnectedBusinessesResponse, ApiError>;

  // Mutations
  upsertCredentials: (
    params: IntegrationStatusParams
  ) => UseMutationResult<IntegrationStatusResponse, ApiError, UpsertIntegrationPayload, unknown>;
  clear: (
    params: IntegrationStatusParams
  ) => UseMutationResult<IntegrationClearResponse, ApiError, void, unknown>;
  recordSync: (
    params: IntegrationStatusParams
  ) => UseMutationResult<RecordSyncResponse, ApiError, RecordSyncPayload, unknown>;
}

export const useEcommerceIntegrationData = (
  options: UseEcommerceIntegrationDataOptions = {}
): UseEcommerceIntegrationDataResult => {
  return {
    status: (params: IntegrationStatusParams) =>
      useIntegrationStatus(params, options.queries?.status),
    lookup: (params: ProviderLookupParams) =>
      useFindBusinessByProviderIdentifier(params, options.queries?.lookup),
    connected: (provider: string) =>
      useListConnectedBusinesses(provider, options.queries?.connected),
    upsertCredentials: (params: IntegrationStatusParams) =>
      useUpsertIntegrationCredentials(params, options.mutations?.upsertCredentials),
    clear: (params: IntegrationStatusParams) =>
      useClearIntegration(params, options.mutations?.clear),
    recordSync: (params: IntegrationStatusParams) =>
      useRecordSuccessfulSync(params, options.mutations?.recordSync)
  };
};
