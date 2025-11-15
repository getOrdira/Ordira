'use client';

// src/hooks/features/supplyChain/useSupplyChainProductLifecycle.ts

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

import supplyChainProductLifecycleApi, {
  type BatchLogEventsPayload,
  type BatchLogEventsResponse,
  type LifecycleBaseQuery,
  type LogProductEventPayload,
  type LogProductEventResponse,
  type ProductLifecycleAnalyticsResponse,
  type ProductLifecycleQuery,
  type ProductLifecycleResponse,
  type ProductStatusResponse
} from '@/lib/api/features/supplyChain/supplyChainProductLifecycle.api';
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

export const supplyChainProductLifecycleQueryKeys = {
  root: ['supply-chain', 'product-lifecycle'] as const,
  lifecycle: (query: ProductLifecycleQuery) =>
    [...supplyChainProductLifecycleQueryKeys.root, 'lifecycle', normalizeObject(query)] as const,
  status: (query: ProductLifecycleQuery) =>
    [...supplyChainProductLifecycleQueryKeys.root, 'status', normalizeObject(query)] as const,
  analytics: (query: LifecycleBaseQuery) =>
    [...supplyChainProductLifecycleQueryKeys.root, 'analytics', normalizeObject(query)] as const
};

export const supplyChainProductLifecycleMutationKeys = {
  logEvent: [...supplyChainProductLifecycleQueryKeys.root, 'log-event'] as const,
  batchLogEvents: [...supplyChainProductLifecycleQueryKeys.root, 'batch-log-events'] as const
};

/**
 * Retrieve product lifecycle details.
 */
export const useProductLifecycle = (
  query: ProductLifecycleQuery,
  options?: QueryOptions<ProductLifecycleResponse>
): UseQueryResult<ProductLifecycleResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainProductLifecycleQueryKeys.lifecycle(query),
    queryFn: () => supplyChainProductLifecycleApi.getProductLifecycle(query),
    enabled: Boolean(query.contractAddress && query.productId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Log a product lifecycle event.
 */
export const useLogProductEvent = (
  options?: MutationConfig<LogProductEventResponse, LogProductEventPayload>
): UseMutationResult<LogProductEventResponse, ApiError, LogProductEventPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainProductLifecycleMutationKeys.logEvent,
    mutationFn: (payload) => supplyChainProductLifecycleApi.logProductEvent(payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: supplyChainProductLifecycleQueryKeys.lifecycle({
          businessId: variables.businessId,
          contractAddress: variables.contractAddress,
          productId: variables.productId
        })
      });
      void queryClient.invalidateQueries({ queryKey: supplyChainProductLifecycleQueryKeys.root });
    },
    ...options
  });
};

/**
 * Retrieve product lifecycle status.
 */
export const useProductStatus = (
  query: ProductLifecycleQuery,
  options?: QueryOptions<ProductStatusResponse>
): UseQueryResult<ProductStatusResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainProductLifecycleQueryKeys.status(query),
    queryFn: () => supplyChainProductLifecycleApi.getProductStatus(query),
    enabled: Boolean(query.contractAddress && query.productId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Batch log product lifecycle events.
 */
export const useBatchLogEvents = (
  options?: MutationConfig<BatchLogEventsResponse, BatchLogEventsPayload>
): UseMutationResult<BatchLogEventsResponse, ApiError, BatchLogEventsPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainProductLifecycleMutationKeys.batchLogEvents,
    mutationFn: (payload) => supplyChainProductLifecycleApi.batchLogEvents(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplyChainProductLifecycleQueryKeys.root });
    },
    ...options
  });
};

/**
 * Retrieve product lifecycle analytics.
 */
export const useProductLifecycleAnalytics = (
  query: LifecycleBaseQuery,
  options?: QueryOptions<ProductLifecycleAnalyticsResponse>
): UseQueryResult<ProductLifecycleAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainProductLifecycleQueryKeys.analytics(query),
    queryFn: () => supplyChainProductLifecycleApi.getProductLifecycleAnalytics(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all supply chain product lifecycle operations.
 */
export interface UseSupplyChainProductLifecycleOptions {
  queries?: {
    lifecycle?: QueryOptions<ProductLifecycleResponse>;
    status?: QueryOptions<ProductStatusResponse>;
    analytics?: QueryOptions<ProductLifecycleAnalyticsResponse>;
  };
  mutations?: {
    logEvent?: MutationConfig<LogProductEventResponse, LogProductEventPayload>;
    batchLogEvents?: MutationConfig<BatchLogEventsResponse, BatchLogEventsPayload>;
  };
}

export interface UseSupplyChainProductLifecycleResult {
  // Queries
  lifecycle: (query: ProductLifecycleQuery) => UseQueryResult<ProductLifecycleResponse, ApiError>;
  status: (query: ProductLifecycleQuery) => UseQueryResult<ProductStatusResponse, ApiError>;
  analytics: (
    query: LifecycleBaseQuery
  ) => UseQueryResult<ProductLifecycleAnalyticsResponse, ApiError>;

  // Mutations
  logEvent: UseMutationResult<LogProductEventResponse, ApiError, LogProductEventPayload, unknown>;
  batchLogEvents: UseMutationResult<
    BatchLogEventsResponse,
    ApiError,
    BatchLogEventsPayload,
    unknown
  >;
}

export const useSupplyChainProductLifecycle = (
  options: UseSupplyChainProductLifecycleOptions = {}
): UseSupplyChainProductLifecycleResult => {
  const logEvent = useLogProductEvent(options.mutations?.logEvent);
  const batchLogEvents = useBatchLogEvents(options.mutations?.batchLogEvents);

  return {
    lifecycle: (query: ProductLifecycleQuery) =>
      useProductLifecycle(query, options.queries?.lifecycle),
    status: (query: ProductLifecycleQuery) =>
      useProductStatus(query, options.queries?.status),
    analytics: (query: LifecycleBaseQuery) =>
      useProductLifecycleAnalytics(query, options.queries?.analytics),
    logEvent,
    batchLogEvents
  };
};
