'use client';

// src/hooks/integrations/ecommerce/useWix.ts

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

import wixApi, {
  type WixCallbackParams,
  type WixCallbackResponse,
  type WixHealthResponse,
  type WixInstallPayload,
  type WixInstallResponse,
  type WixStatusResponse,
  type WixSyncPayload,
  type WixSyncResponse,
  type WixWebhookResponse
} from '@/lib/api/integrations/ecommerce/wix.api';
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

const wixQueryKeysRoot = ['integrations', 'wix'] as const;

export const wixQueryKeys = {
  root: wixQueryKeysRoot,
  callback: (params: WixCallbackParams) =>
    [...wixQueryKeysRoot, 'callback', normalizeObject(params)] as const,
  status: (businessId: string) => [...wixQueryKeysRoot, 'status', businessId] as const,
  test: (businessId: string) => [...wixQueryKeysRoot, 'test', businessId] as const
};

export const wixMutationKeys = {
  generateInstallUrl: (businessId: string) =>
    [...wixQueryKeysRoot, 'generate-install-url', businessId] as const,
  sync: (businessId: string) => [...wixQueryKeysRoot, 'sync', businessId] as const,
  webhook: (businessId: string) => [...wixQueryKeysRoot, 'webhook', businessId] as const
};

/**
 * Generate Wix install URL.
 */
export const useGenerateInstallUrl = (
  businessId: string,
  options?: MutationConfig<WixInstallResponse, WixInstallPayload>
): UseMutationResult<WixInstallResponse, ApiError, WixInstallPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: wixMutationKeys.generateInstallUrl(businessId),
    mutationFn: (payload) => wixApi.generateInstallUrl(businessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: wixQueryKeys.status(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: wixQueryKeys.root });
    },
    ...options
  });
};

/**
 * Handle Wix OAuth callback.
 */
export const useHandleOAuthCallback = (
  params: WixCallbackParams,
  options?: QueryOptions<WixCallbackResponse>
): UseQueryResult<WixCallbackResponse, ApiError> => {
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: wixQueryKeys.callback(params),
    queryFn: () => wixApi.handleOAuthCallback(params),
    enabled: Boolean(params.code && params.state) && (options?.enabled ?? true),
    ...options
  });

  // Invalidate queries when callback succeeds
  useEffect(() => {
    if (result.isSuccess) {
      void queryClient.invalidateQueries({ queryKey: wixQueryKeys.root });
    }
  }, [result.isSuccess, queryClient]);

  return result;
};

/**
 * Retrieve Wix connection status.
 */
export const useConnectionStatus = (
  businessId: string,
  options?: QueryOptions<WixStatusResponse>
): UseQueryResult<WixStatusResponse, ApiError> => {
  return useQuery({
    queryKey: wixQueryKeys.status(businessId),
    queryFn: () => wixApi.getConnectionStatus(businessId),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Test Wix connection.
 */
export const useTestConnection = (
  businessId: string,
  options?: QueryOptions<WixHealthResponse>
): UseQueryResult<WixHealthResponse, ApiError> => {
  return useQuery({
    queryKey: wixQueryKeys.test(businessId),
    queryFn: () => wixApi.testConnection(businessId),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Trigger Wix sync.
 */
export const useSyncProducts = (
  businessId: string,
  options?: MutationConfig<WixSyncResponse, WixSyncPayload>
): UseMutationResult<WixSyncResponse, ApiError, WixSyncPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: wixMutationKeys.sync(businessId),
    mutationFn: (payload) => wixApi.syncProducts(businessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: wixQueryKeys.status(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: wixQueryKeys.root });
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'ecommerce'] });
    },
    ...options
  });
};

/**
 * Process Wix webhook payload.
 */
export const useHandleWebhook = (
  businessId: string,
  options?: MutationConfig<WixWebhookResponse, Record<string, unknown>>
): UseMutationResult<WixWebhookResponse, ApiError, Record<string, unknown>, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: wixMutationKeys.webhook(businessId),
    mutationFn: (payload) => wixApi.handleWebhook(businessId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: wixQueryKeys.status(businessId)
      });
      void queryClient.invalidateQueries({ queryKey: wixQueryKeys.root });
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'ecommerce'] });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all Wix operations.
 */
export interface UseWixOptions {
  queries?: {
    callback?: QueryOptions<WixCallbackResponse>;
    status?: QueryOptions<WixStatusResponse>;
    test?: QueryOptions<WixHealthResponse>;
  };
  mutations?: {
    generateInstallUrl?: MutationConfig<WixInstallResponse, WixInstallPayload>;
    sync?: MutationConfig<WixSyncResponse, WixSyncPayload>;
    webhook?: MutationConfig<WixWebhookResponse, Record<string, unknown>>;
  };
}

export interface UseWixResult {
  // Queries
  callback: (params: WixCallbackParams) => UseQueryResult<WixCallbackResponse, ApiError>;
  status: (businessId: string) => UseQueryResult<WixStatusResponse, ApiError>;
  test: (businessId: string) => UseQueryResult<WixHealthResponse, ApiError>;

  // Mutations
  generateInstallUrl: (
    businessId: string
  ) => UseMutationResult<WixInstallResponse, ApiError, WixInstallPayload, unknown>;
  sync: (
    businessId: string
  ) => UseMutationResult<WixSyncResponse, ApiError, WixSyncPayload, unknown>;
  webhook: (
    businessId: string
  ) => UseMutationResult<WixWebhookResponse, ApiError, Record<string, unknown>, unknown>;
}

export const useWix = (options: UseWixOptions = {}): UseWixResult => {
  return {
    callback: (params: WixCallbackParams) =>
      useHandleOAuthCallback(params, options.queries?.callback),
    status: (businessId: string) => useConnectionStatus(businessId, options.queries?.status),
    test: (businessId: string) => useTestConnection(businessId, options.queries?.test),
    generateInstallUrl: (businessId: string) =>
      useGenerateInstallUrl(businessId, options.mutations?.generateInstallUrl),
    sync: (businessId: string) => useSyncProducts(businessId, options.mutations?.sync),
    webhook: (businessId: string) => useHandleWebhook(businessId, options.mutations?.webhook)
  };
};
