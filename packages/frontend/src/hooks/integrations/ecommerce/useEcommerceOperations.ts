'use client';

// src/hooks/integrations/ecommerce/useEcommerceOperations.ts

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import ecommerceOperationsApi, {
  type OrderProcessingParams,
  type OrderProcessingPayload,
  type OrderProcessingResponse,
  type OrderWebhookParams,
  type OrderWebhookResponse,
  type ProductSyncOptionsInput,
  type ProductSyncParams,
  type ProductSyncResponse
} from '@/lib/api/integrations/ecommerce/ecommerceOperations.api';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const ecommerceOperationsMutationKeysRoot = ['integrations', 'ecommerce', 'operations'] as const;

export const ecommerceOperationsMutationKeys = {
  syncProducts: (params: ProductSyncParams) =>
    [...ecommerceOperationsMutationKeysRoot, 'sync-products', params.provider, params.businessId] as const,
  processOrder: (params: OrderProcessingParams) =>
    [...ecommerceOperationsMutationKeysRoot, 'process-order', params.provider, params.businessId, params.orderId] as const,
  processOrderWebhook: (params: OrderWebhookParams) =>
    [...ecommerceOperationsMutationKeysRoot, 'process-order-webhook', params.provider, params.businessId] as const
};

/**
 * Trigger ecommerce product synchronisation.
 */
export const useSyncProducts = (
  params: ProductSyncParams,
  options?: MutationConfig<ProductSyncResponse, ProductSyncOptionsInput>
): UseMutationResult<ProductSyncResponse, ApiError, ProductSyncOptionsInput, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ecommerceOperationsMutationKeys.syncProducts(params),
    mutationFn: (syncOptions) => ecommerceOperationsApi.syncProducts(params, syncOptions),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'ecommerce'] });
    },
    ...options
  });
};

/**
 * Process an ecommerce order by identifier.
 */
export const useProcessOrderById = (
  params: OrderProcessingParams,
  options?: MutationConfig<OrderProcessingResponse, OrderProcessingPayload>
): UseMutationResult<OrderProcessingResponse, ApiError, OrderProcessingPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ecommerceOperationsMutationKeys.processOrder(params),
    mutationFn: (payload) => ecommerceOperationsApi.processOrderById(params, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'ecommerce'] });
    },
    ...options
  });
};

/**
 * Forward an order webhook payload for processing.
 */
export const useProcessOrderWebhook = (
  params: OrderWebhookParams,
  options?: MutationConfig<OrderWebhookResponse, Record<string, unknown>>
): UseMutationResult<OrderWebhookResponse, ApiError, Record<string, unknown>, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ecommerceOperationsMutationKeys.processOrderWebhook(params),
    mutationFn: (payload) => ecommerceOperationsApi.processOrderWebhook(params, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['integrations', 'ecommerce'] });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all ecommerce operations.
 */
export interface UseEcommerceOperationsOptions {
  mutations?: {
    syncProducts?: MutationConfig<ProductSyncResponse, ProductSyncOptionsInput>;
    processOrder?: MutationConfig<OrderProcessingResponse, OrderProcessingPayload>;
    processOrderWebhook?: MutationConfig<OrderWebhookResponse, Record<string, unknown>>;
  };
}

export interface UseEcommerceOperationsResult {
  // Mutations
  syncProducts: (
    params: ProductSyncParams
  ) => UseMutationResult<ProductSyncResponse, ApiError, ProductSyncOptionsInput, unknown>;
  processOrder: (
    params: OrderProcessingParams
  ) => UseMutationResult<OrderProcessingResponse, ApiError, OrderProcessingPayload, unknown>;
  processOrderWebhook: (
    params: OrderWebhookParams
  ) => UseMutationResult<OrderWebhookResponse, ApiError, Record<string, unknown>, unknown>;
}

export const useEcommerceOperations = (
  options: UseEcommerceOperationsOptions = {}
): UseEcommerceOperationsResult => {
  return {
    syncProducts: (params: ProductSyncParams) =>
      useSyncProducts(params, options.mutations?.syncProducts),
    processOrder: (params: OrderProcessingParams) =>
      useProcessOrderById(params, options.mutations?.processOrder),
    processOrderWebhook: (params: OrderWebhookParams) =>
      useProcessOrderWebhook(params, options.mutations?.processOrderWebhook)
  };
};
