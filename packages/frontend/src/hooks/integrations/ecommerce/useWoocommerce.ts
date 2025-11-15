'use client';

// src/hooks/integrations/ecommerce/useWoocommerce.ts

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

import woocommerceApi, {
  type WooConnectPayload,
  type WooConnectResponse,
  type WooDisconnectResponse,
  type WooHealthResponse,
  type WooStatusResponse,
  type WooSyncPayload,
  type WooSyncResponse,
  type WooWebhookResponse
} from '@/lib/api/integrations/ecommerce/woocommerce.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const woocommerceQueryKeysRoot = ['integrations', 'woocommerce'] as const;

export const woocommerceQueryKeys = {
  root: woocommerceQueryKeysRoot,
  status: (businessId: string) => [...woocommerceQueryKeysRoot, 'status', businessId] as const,
  test: (businessId: string) => [...woocommerceQueryKeysRoot, 'test', businessId] as const
};

export const woocommerceMutationKeys = {
  connect: (businessId: string) =>
    [...woocommerceQueryKeysRoot, 'connect', businessId] as const,
  disconnect: (businessId: string) =>
    [...woocommerceQueryKeysRoot, 'disconnect', businessId] as const,
  sync: (businessId: string) => [...woocommerceQueryKeysRoot, 'sync', businessId] as const,
  webhook: (businessId: string) => [...woocommerceQueryKeysRoot, 'webhook', businessId] as const
};

/**
 * Connect WooCommerce store.
 */
export const useConnect = (
  businessId: string,
  options?: MutationConfig<WooConnectResponse, WooConnectPayload>
): UseMutationResult<WooConnectResponse, ApiError, WooConnectPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: woocommerceMutationKeys.connect(businessId),
    mutationFn: (payload) => woocommerceApi.connect(businessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: woocommerceQueryKeys.status(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: woocommerceQueryKeys.root });
    },
    ...options
  });
};

/**
 * Retrieve WooCommerce connection status.
 */
export const useConnectionStatus = (
  businessId: string,
  options?: QueryOptions<WooStatusResponse>
): UseQueryResult<WooStatusResponse, ApiError> => {
  return useQuery({
    queryKey: woocommerceQueryKeys.status(businessId),
    queryFn: () => woocommerceApi.getConnectionStatus(businessId),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Disconnect WooCommerce store.
 */
export const useDisconnect = (
  businessId: string,
  options?: MutationConfig<WooDisconnectResponse, void>
): UseMutationResult<WooDisconnectResponse, ApiError, void, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: woocommerceMutationKeys.disconnect(businessId),
    mutationFn: () => woocommerceApi.disconnect(businessId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: woocommerceQueryKeys.status(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: woocommerceQueryKeys.root });
    },
    ...options
  });
};

/**
 * Test WooCommerce connection.
 */
export const useTestConnection = (
  businessId: string,
  options?: QueryOptions<WooHealthResponse>
): UseQueryResult<WooHealthResponse, ApiError> => {
  return useQuery({
    queryKey: woocommerceQueryKeys.test(businessId),
    queryFn: () => woocommerceApi.testConnection(businessId),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Trigger WooCommerce sync.
 */
export const useSyncProducts = (
  businessId: string,
  options?: MutationConfig<WooSyncResponse, WooSyncPayload>
): UseMutationResult<WooSyncResponse, ApiError, WooSyncPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: woocommerceMutationKeys.sync(businessId),
    mutationFn: (payload) => woocommerceApi.syncProducts(businessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: woocommerceQueryKeys.status(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: woocommerceQueryKeys.root });
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'ecommerce'] });
    },
    ...options
  });
};

/**
 * Process WooCommerce webhook payload.
 */
export const useHandleWebhook = (
  businessId: string,
  options?: MutationConfig<WooWebhookResponse, Record<string, unknown>>
): UseMutationResult<WooWebhookResponse, ApiError, Record<string, unknown>, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: woocommerceMutationKeys.webhook(businessId),
    mutationFn: (payload) => woocommerceApi.handleWebhook(businessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: woocommerceQueryKeys.status(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: woocommerceQueryKeys.root });
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'ecommerce'] });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all WooCommerce operations.
 */
export interface UseWoocommerceOptions {
  queries?: {
    status?: QueryOptions<WooStatusResponse>;
    test?: QueryOptions<WooHealthResponse>;
  };
  mutations?: {
    connect?: MutationConfig<WooConnectResponse, WooConnectPayload>;
    disconnect?: MutationConfig<WooDisconnectResponse, void>;
    sync?: MutationConfig<WooSyncResponse, WooSyncPayload>;
    webhook?: MutationConfig<WooWebhookResponse, Record<string, unknown>>;
  };
}

export interface UseWoocommerceResult {
  // Queries
  status: (businessId: string) => UseQueryResult<WooStatusResponse, ApiError>;
  test: (businessId: string) => UseQueryResult<WooHealthResponse, ApiError>;

  // Mutations
  connect: (
    businessId: string
  ) => UseMutationResult<WooConnectResponse, ApiError, WooConnectPayload, unknown>;
  disconnect: (
    businessId: string
  ) => UseMutationResult<WooDisconnectResponse, ApiError, void, unknown>;
  sync: (
    businessId: string
  ) => UseMutationResult<WooSyncResponse, ApiError, WooSyncPayload, unknown>;
  webhook: (
    businessId: string
  ) => UseMutationResult<WooWebhookResponse, ApiError, Record<string, unknown>, unknown>;
}

export const useWoocommerce = (
  options: UseWoocommerceOptions = {}
): UseWoocommerceResult => {
  return {
    status: (businessId: string) =>
      useConnectionStatus(businessId, options.queries?.status),
    test: (businessId: string) => useTestConnection(businessId, options.queries?.test),
    connect: (businessId: string) =>
      useConnect(businessId, options.mutations?.connect),
    disconnect: (businessId: string) =>
      useDisconnect(businessId, options.mutations?.disconnect),
    sync: (businessId: string) => useSyncProducts(businessId, options.mutations?.sync),
    webhook: (businessId: string) => useHandleWebhook(businessId, options.mutations?.webhook)
  };
};
