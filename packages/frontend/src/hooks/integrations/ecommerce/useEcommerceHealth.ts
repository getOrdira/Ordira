'use client';

// src/hooks/integrations/ecommerce/useEcommerceHealth.ts

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

import ecommerceHealthApi, {
  type ConnectionHealthParams,
  type ConnectionHealthPayload,
  type ConnectionHealthResponse,
  type IntegrationAnalyticsParams,
  type IntegrationAnalyticsResponse
} from '@/lib/api/integrations/ecommerce/ecommerceHealth.api';
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

const ecommerceHealthQueryKeysRoot = ['integrations', 'ecommerce', 'health'] as const;

export const ecommerceHealthQueryKeys = {
  root: ecommerceHealthQueryKeysRoot,
  connectionHealth: (params: ConnectionHealthParams) =>
    [...ecommerceHealthQueryKeysRoot, 'connection-health', params.provider, params.businessId, normalizeObject(params)] as const,
  analytics: (params: IntegrationAnalyticsParams) =>
    [...ecommerceHealthQueryKeysRoot, 'analytics', params.provider, params.businessId, normalizeObject(params)] as const
};

export const ecommerceHealthMutationKeys = {
  generateHealth: (params: ConnectionHealthParams) =>
    [...ecommerceHealthQueryKeysRoot, 'generate-health', params.provider, params.businessId] as const
};

/**
 * Retrieve ecommerce connection health report.
 */
export const useConnectionHealthReport = (
  params: ConnectionHealthParams,
  options?: QueryOptions<ConnectionHealthResponse>
): UseQueryResult<ConnectionHealthResponse, ApiError> => {
  return useQuery({
    queryKey: ecommerceHealthQueryKeys.connectionHealth(params),
    queryFn: () => ecommerceHealthApi.getConnectionHealthReport(params),
    enabled: Boolean(params.businessId && params.provider) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Generate ecommerce connection health report with expected webhook definitions.
 */
export const useGenerateConnectionHealthReport = (
  params: ConnectionHealthParams,
  options?: MutationConfig<ConnectionHealthResponse, ConnectionHealthPayload>
): UseMutationResult<ConnectionHealthResponse, ApiError, ConnectionHealthPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ecommerceHealthMutationKeys.generateHealth(params),
    mutationFn: (payload) => ecommerceHealthApi.generateConnectionHealthReport(params, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ecommerceHealthQueryKeys.connectionHealth(params)
      });
      void queryClient.invalidateQueries({ queryKey: ecommerceHealthQueryKeys.root });
    },
    ...options
  });
};

/**
 * Retrieve ecommerce integration analytics snapshot.
 */
export const useIntegrationAnalytics = (
  params: IntegrationAnalyticsParams,
  options?: QueryOptions<IntegrationAnalyticsResponse>
): UseQueryResult<IntegrationAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: ecommerceHealthQueryKeys.analytics(params),
    queryFn: () => ecommerceHealthApi.getIntegrationAnalytics(params),
    enabled: Boolean(params.businessId && params.provider) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all ecommerce health operations.
 */
export interface UseEcommerceHealthOptions {
  queries?: {
    connectionHealth?: QueryOptions<ConnectionHealthResponse>;
    analytics?: QueryOptions<IntegrationAnalyticsResponse>;
  };
  mutations?: {
    generateHealth?: MutationConfig<ConnectionHealthResponse, ConnectionHealthPayload>;
  };
}

export interface UseEcommerceHealthResult {
  // Queries
  connectionHealth: (
    params: ConnectionHealthParams
  ) => UseQueryResult<ConnectionHealthResponse, ApiError>;
  analytics: (
    params: IntegrationAnalyticsParams
  ) => UseQueryResult<IntegrationAnalyticsResponse, ApiError>;

  // Mutations
  generateHealth: (
    params: ConnectionHealthParams
  ) => UseMutationResult<ConnectionHealthResponse, ApiError, ConnectionHealthPayload, unknown>;
}

export const useEcommerceHealth = (
  options: UseEcommerceHealthOptions = {}
): UseEcommerceHealthResult => {
  return {
    connectionHealth: (params: ConnectionHealthParams) =>
      useConnectionHealthReport(params, options.queries?.connectionHealth),
    analytics: (params: IntegrationAnalyticsParams) =>
      useIntegrationAnalytics(params, options.queries?.analytics),
    generateHealth: (params: ConnectionHealthParams) =>
      useGenerateConnectionHealthReport(params, options.mutations?.generateHealth)
  };
};
