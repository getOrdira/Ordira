'use client';

// src/hooks/integrations/ecommerce/useShopify.ts

import { useEffect } from 'react';
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

import shopifyApi, {
  type ShopifyCallbackParams,
  type ShopifyCallbackResponse,
  type ShopifyHealthResponse,
  type ShopifyInstallPayload,
  type ShopifyInstallResponse,
  type ShopifyStatusResponse,
  type ShopifySyncPayload,
  type ShopifySyncResponse,
  type ShopifyWebhookResponse
} from '@/lib/api/integrations/ecommerce/shopify.api';
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

const shopifyQueryKeysRoot = ['integrations', 'shopify'] as const;

export const shopifyQueryKeys = {
  root: shopifyQueryKeysRoot,
  callback: (params: ShopifyCallbackParams) =>
    [...shopifyQueryKeysRoot, 'callback', normalizeObject(params)] as const,
  status: (businessId: string) => [...shopifyQueryKeysRoot, 'status', businessId] as const,
  test: (businessId: string) => [...shopifyQueryKeysRoot, 'test', businessId] as const
};

export const shopifyMutationKeys = {
  generateInstallUrl: (businessId: string) =>
    [...shopifyQueryKeysRoot, 'generate-install-url', businessId] as const,
  sync: (businessId: string) => [...shopifyQueryKeysRoot, 'sync', businessId] as const,
  webhook: (businessId: string) => [...shopifyQueryKeysRoot, 'webhook', businessId] as const
};

/**
 * Generate Shopify install URL.
 */
export const useGenerateInstallUrl = (
  businessId: string,
  options?: MutationConfig<ShopifyInstallResponse, ShopifyInstallPayload>
): UseMutationResult<ShopifyInstallResponse, ApiError, ShopifyInstallPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: shopifyMutationKeys.generateInstallUrl(businessId),
    mutationFn: (payload) => shopifyApi.generateInstallUrl(businessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: shopifyQueryKeys.status(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: shopifyQueryKeys.root });
    },
    ...options
  });
};

/**
 * Handle Shopify OAuth callback.
 */
export const useHandleOAuthCallback = (
  params: ShopifyCallbackParams,
  options?: QueryOptions<ShopifyCallbackResponse>
): UseQueryResult<ShopifyCallbackResponse, ApiError> => {
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: shopifyQueryKeys.callback(params),
    queryFn: () => shopifyApi.handleOAuthCallback(params),
    enabled: Boolean(params.shop && params.code && params.state) && (options?.enabled ?? true),
    ...options
  });

  // Invalidate queries when callback succeeds
  useEffect(() => {
    if (result.isSuccess) {
      void queryClient.invalidateQueries({ queryKey: shopifyQueryKeys.root });
    }
  }, [result.isSuccess, queryClient]);

  return result;
};

/**
 * Retrieve Shopify connection status.
 */
export const useConnectionStatus = (
  businessId: string,
  options?: QueryOptions<ShopifyStatusResponse>
): UseQueryResult<ShopifyStatusResponse, ApiError> => {
  return useQuery({
    queryKey: shopifyQueryKeys.status(businessId),
    queryFn: () => shopifyApi.getConnectionStatus(businessId),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Test Shopify connection.
 */
export const useTestConnection = (
  businessId: string,
  options?: QueryOptions<ShopifyHealthResponse>
): UseQueryResult<ShopifyHealthResponse, ApiError> => {
  return useQuery({
    queryKey: shopifyQueryKeys.test(businessId),
    queryFn: () => shopifyApi.testConnection(businessId),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Trigger Shopify sync.
 */
export const useSyncProducts = (
  businessId: string,
  options?: MutationConfig<ShopifySyncResponse, ShopifySyncPayload>
): UseMutationResult<ShopifySyncResponse, ApiError, ShopifySyncPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: shopifyMutationKeys.sync(businessId),
    mutationFn: (payload) => shopifyApi.syncProducts(businessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: shopifyQueryKeys.status(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: shopifyQueryKeys.root });
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'ecommerce'] });
    },
    ...options
  });
};

/**
 * Process Shopify webhook payload.
 */
export const useHandleWebhook = (
  businessId: string,
  options?: MutationConfig<ShopifyWebhookResponse, Record<string, unknown>>
): UseMutationResult<ShopifyWebhookResponse, ApiError, Record<string, unknown>, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: shopifyMutationKeys.webhook(businessId),
    mutationFn: (payload) => shopifyApi.handleWebhook(businessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: shopifyQueryKeys.status(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: shopifyQueryKeys.root });
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'ecommerce'] });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all Shopify operations.
 */
export interface UseShopifyOptions {
  queries?: {
    callback?: QueryOptions<ShopifyCallbackResponse>;
    status?: QueryOptions<ShopifyStatusResponse>;
    test?: QueryOptions<ShopifyHealthResponse>;
  };
  mutations?: {
    generateInstallUrl?: MutationConfig<ShopifyInstallResponse, ShopifyInstallPayload>;
    sync?: MutationConfig<ShopifySyncResponse, ShopifySyncPayload>;
    webhook?: MutationConfig<ShopifyWebhookResponse, Record<string, unknown>>;
  };
}

export interface UseShopifyResult {
  // Queries
  callback: (params: ShopifyCallbackParams) => UseQueryResult<ShopifyCallbackResponse, ApiError>;
  status: (businessId: string) => UseQueryResult<ShopifyStatusResponse, ApiError>;
  test: (businessId: string) => UseQueryResult<ShopifyHealthResponse, ApiError>;

  // Mutations
  generateInstallUrl: (
    businessId: string
  ) => UseMutationResult<ShopifyInstallResponse, ApiError, ShopifyInstallPayload, unknown>;
  sync: (
    businessId: string
  ) => UseMutationResult<ShopifySyncResponse, ApiError, ShopifySyncPayload, unknown>;
  webhook: (
    businessId: string
  ) => UseMutationResult<ShopifyWebhookResponse, ApiError, Record<string, unknown>, unknown>;
}

export const useShopify = (options: UseShopifyOptions = {}): UseShopifyResult => {
  return {
    callback: (params: ShopifyCallbackParams) =>
      useHandleOAuthCallback(params, options.queries?.callback),
    status: (businessId: string) =>
      useConnectionStatus(businessId, options.queries?.status),
    test: (businessId: string) => useTestConnection(businessId, options.queries?.test),
    generateInstallUrl: (businessId: string) =>
      useGenerateInstallUrl(businessId, options.mutations?.generateInstallUrl),
    sync: (businessId: string) => useSyncProducts(businessId, options.mutations?.sync),
    webhook: (businessId: string) => useHandleWebhook(businessId, options.mutations?.webhook)
  };
};
