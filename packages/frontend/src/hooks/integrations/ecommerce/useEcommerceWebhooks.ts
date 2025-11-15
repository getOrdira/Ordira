'use client';

// src/hooks/integrations/ecommerce/useEcommerceWebhooks.ts

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

import ecommerceWebhooksApi, {
  type BuildCallbackUrlPayload,
  type BuildCallbackUrlResponse,
  type DiffWebhooksPayload,
  type ListProviderWebhooksParams,
  type ListProviderWebhooksResponse,
  type ReconcileWebhooksPayload,
  type WebhookDiffResponse,
  type WebhookReconciliationResponse
} from '@/lib/api/integrations/ecommerce/ecommerceWebhooks.api';
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

const ecommerceWebhooksQueryKeysRoot = ['integrations', 'ecommerce', 'webhooks'] as const;

export const ecommerceWebhooksQueryKeys = {
  root: ecommerceWebhooksQueryKeysRoot,
  list: (params: ListProviderWebhooksParams) =>
    [...ecommerceWebhooksQueryKeysRoot, params.provider, params.businessId] as const
};

export const ecommerceWebhooksMutationKeys = {
  diff: (params: ListProviderWebhooksParams) =>
    [...ecommerceWebhooksQueryKeysRoot, 'diff', params.provider, params.businessId] as const,
  reconcile: (params: ListProviderWebhooksParams) =>
    [...ecommerceWebhooksQueryKeysRoot, 'reconcile', params.provider, params.businessId] as const,
  buildCallbackUrl: (provider: string) =>
    [...ecommerceWebhooksQueryKeysRoot, 'build-callback-url', provider] as const
};

/**
 * List provider webhooks.
 */
export const useListProviderWebhooks = (
  params: ListProviderWebhooksParams,
  options?: QueryOptions<ListProviderWebhooksResponse>
): UseQueryResult<ListProviderWebhooksResponse, ApiError> => {
  return useQuery({
    queryKey: ecommerceWebhooksQueryKeys.list(params),
    queryFn: () => ecommerceWebhooksApi.listProviderWebhooks(params),
    enabled: Boolean(params.businessId && params.provider) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Calculate diff between expected and existing webhooks.
 */
export const useDiffWebhooks = (
  params: ListProviderWebhooksParams,
  options?: MutationConfig<WebhookDiffResponse, DiffWebhooksPayload>
): UseMutationResult<WebhookDiffResponse, ApiError, DiffWebhooksPayload, unknown> => {
  return useMutation({
    mutationKey: ecommerceWebhooksMutationKeys.diff(params),
    mutationFn: (payload) => ecommerceWebhooksApi.diffWebhooks(params, payload),
    ...options
  });
};

/**
 * Reconcile provider webhooks with expected definitions.
 */
export const useReconcileWebhooks = (
  params: ListProviderWebhooksParams,
  options?: MutationConfig<WebhookReconciliationResponse, ReconcileWebhooksPayload>
): UseMutationResult<WebhookReconciliationResponse, ApiError, ReconcileWebhooksPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ecommerceWebhooksMutationKeys.reconcile(params),
    mutationFn: (payload) => ecommerceWebhooksApi.reconcileWebhooks(params, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ecommerceWebhooksQueryKeys.list(params)
      });
      void queryClient.invalidateQueries({ queryKey: ecommerceWebhooksQueryKeys.root });
    },
    ...options
  });
};

/**
 * Build webhook callback URL for a provider.
 */
export const useBuildCallbackUrl = (
  provider: string,
  options?: MutationConfig<BuildCallbackUrlResponse, BuildCallbackUrlPayload>
): UseMutationResult<BuildCallbackUrlResponse, ApiError, BuildCallbackUrlPayload, unknown> => {
  return useMutation({
    mutationKey: ecommerceWebhooksMutationKeys.buildCallbackUrl(provider),
    mutationFn: (payload) => ecommerceWebhooksApi.buildCallbackUrl(provider, payload),
    ...options
  });
};

/**
 * Main hook that provides access to all ecommerce webhooks operations.
 */
export interface UseEcommerceWebhooksOptions {
  queries?: {
    list?: QueryOptions<ListProviderWebhooksResponse>;
  };
  mutations?: {
    diff?: MutationConfig<WebhookDiffResponse, DiffWebhooksPayload>;
    reconcile?: MutationConfig<WebhookReconciliationResponse, ReconcileWebhooksPayload>;
    buildCallbackUrl?: MutationConfig<BuildCallbackUrlResponse, BuildCallbackUrlPayload>;
  };
}

export interface UseEcommerceWebhooksResult {
  // Queries
  list: (params: ListProviderWebhooksParams) => UseQueryResult<ListProviderWebhooksResponse, ApiError>;

  // Mutations
  diff: (
    params: ListProviderWebhooksParams
  ) => UseMutationResult<WebhookDiffResponse, ApiError, DiffWebhooksPayload, unknown>;
  reconcile: (
    params: ListProviderWebhooksParams
  ) => UseMutationResult<WebhookReconciliationResponse, ApiError, ReconcileWebhooksPayload, unknown>;
  buildCallbackUrl: (
    provider: string
  ) => UseMutationResult<BuildCallbackUrlResponse, ApiError, BuildCallbackUrlPayload, unknown>;
}

export const useEcommerceWebhooks = (
  options: UseEcommerceWebhooksOptions = {}
): UseEcommerceWebhooksResult => {
  return {
    list: (params: ListProviderWebhooksParams) =>
      useListProviderWebhooks(params, options.queries?.list),
    diff: (params: ListProviderWebhooksParams) =>
      useDiffWebhooks(params, options.mutations?.diff),
    reconcile: (params: ListProviderWebhooksParams) =>
      useReconcileWebhooks(params, options.mutations?.reconcile),
    buildCallbackUrl: (provider: string) =>
      useBuildCallbackUrl(provider, options.mutations?.buildCallbackUrl)
  };
};
