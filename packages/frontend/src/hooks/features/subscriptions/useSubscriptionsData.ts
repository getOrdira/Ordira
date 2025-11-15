'use client';

// src/hooks/features/subscriptions/useSubscriptionsData.ts

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

import subscriptionsDataApi, {
  type SubscriptionContact,
  type SubscriptionUsageResponse,
  type SubscriptionUsageResetResult
} from '@/lib/api/features/subscriptions/subscriptionsData.api';
import type { SubscriptionSummary } from '@/lib/types/features/subscriptions';
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

export const subscriptionsDataQueryKeys = {
  root: ['subscriptions', 'data'] as const,
  summary: (query?: { businessId?: string }) =>
    [...subscriptionsDataQueryKeys.root, 'summary', normalizeObject(query)] as const,
  usage: (query?: { businessId?: string }) =>
    [...subscriptionsDataQueryKeys.root, 'usage', normalizeObject(query)] as const,
  contact: (query?: { businessId?: string }) =>
    [...subscriptionsDataQueryKeys.root, 'contact', normalizeObject(query)] as const
};

export const subscriptionsDataMutationKeys = {
  resetUsage: [...subscriptionsDataQueryKeys.root, 'reset-usage'] as const
};

/**
 * Retrieve subscription summary.
 */
export const useSubscriptionSummary = (
  query?: { businessId?: string },
  options?: QueryOptions<SubscriptionSummary>
): UseQueryResult<SubscriptionSummary, ApiError> => {
  return useQuery({
    queryKey: subscriptionsDataQueryKeys.summary(query),
    queryFn: () => subscriptionsDataApi.getSubscriptionSummary(query),
    ...options
  });
};

/**
 * Retrieve subscription usage metrics.
 */
export const useSubscriptionUsage = (
  query?: { businessId?: string },
  options?: QueryOptions<SubscriptionUsageResponse>
): UseQueryResult<SubscriptionUsageResponse, ApiError> => {
  return useQuery({
    queryKey: subscriptionsDataQueryKeys.usage(query),
    queryFn: () => subscriptionsDataApi.getSubscriptionUsage(query),
    ...options
  });
};

/**
 * Retrieve subscription billing contact.
 */
export const useSubscriptionContact = (
  query?: { businessId?: string },
  options?: QueryOptions<SubscriptionContact | null>
): UseQueryResult<SubscriptionContact | null, ApiError> => {
  return useQuery({
    queryKey: subscriptionsDataQueryKeys.contact(query),
    queryFn: () => subscriptionsDataApi.getSubscriptionContact(query),
    ...options
  });
};

/**
 * Reset subscription usage counters.
 */
export const useResetSubscriptionUsage = (
  options?: MutationConfig<SubscriptionUsageResetResult, { businessId?: string } | undefined>
): UseMutationResult<SubscriptionUsageResetResult, ApiError, { businessId?: string } | undefined, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsDataMutationKeys.resetUsage,
    mutationFn: (payload) => subscriptionsDataApi.resetSubscriptionUsage(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsDataQueryKeys.root });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all subscription data operations.
 */
export interface UseSubscriptionsDataOptions {
  queries?: {
    summary?: QueryOptions<SubscriptionSummary>;
    usage?: QueryOptions<SubscriptionUsageResponse>;
    contact?: QueryOptions<SubscriptionContact | null>;
  };
  mutations?: {
    resetUsage?: MutationConfig<SubscriptionUsageResetResult, { businessId?: string } | undefined>;
  };
}

export interface UseSubscriptionsDataResult {
  // Queries
  summary: (query?: { businessId?: string }) => UseQueryResult<SubscriptionSummary, ApiError>;
  usage: (query?: { businessId?: string }) => UseQueryResult<SubscriptionUsageResponse, ApiError>;
  contact: (
    query?: { businessId?: string }
  ) => UseQueryResult<SubscriptionContact | null, ApiError>;

  // Mutations
  resetUsage: UseMutationResult<
    SubscriptionUsageResetResult,
    ApiError,
    { businessId?: string } | undefined,
    unknown
  >;
}

export const useSubscriptionsData = (
  options: UseSubscriptionsDataOptions = {}
): UseSubscriptionsDataResult => {
  const resetUsage = useResetSubscriptionUsage(options.mutations?.resetUsage);

  return {
    summary: (query?: { businessId?: string }) =>
      useSubscriptionSummary(query, options.queries?.summary),
    usage: (query?: { businessId?: string }) =>
      useSubscriptionUsage(query, options.queries?.usage),
    contact: (query?: { businessId?: string }) =>
      useSubscriptionContact(query, options.queries?.contact),
    resetUsage
  };
};
