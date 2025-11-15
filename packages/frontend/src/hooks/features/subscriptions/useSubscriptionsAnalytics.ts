'use client';

// src/hooks/features/subscriptions/useSubscriptionsAnalytics.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import subscriptionsAnalyticsApi, {
  type SubscriptionAnalyticsQuery,
  type SubscriptionUsageAnalyticsResult,
  type SubscriptionWinBackPayload
} from '@/lib/api/features/subscriptions/subscriptionsAnalytics.api';
import type {
  SubscriptionInsights,
  SubscriptionSummary,
  SubscriptionUsageTrends,
  SubscriptionUsageProjections
} from '@/lib/types/features/subscriptions';
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

export const subscriptionsAnalyticsQueryKeys = {
  root: ['subscriptions', 'analytics'] as const,
  overview: (query?: SubscriptionAnalyticsQuery) =>
    [...subscriptionsAnalyticsQueryKeys.root, 'overview', normalizeObject(query)] as const,
  usage: (query?: SubscriptionAnalyticsQuery) =>
    [...subscriptionsAnalyticsQueryKeys.root, 'usage', normalizeObject(query)] as const,
  insights: (query?: { businessId?: string }) =>
    [...subscriptionsAnalyticsQueryKeys.root, 'insights', normalizeObject(query)] as const
};

export const subscriptionsAnalyticsMutationKeys = {
  winBack: [...subscriptionsAnalyticsQueryKeys.root, 'win-back'] as const
};

/**
 * Retrieve subscription overview summary.
 */
export const useSubscriptionOverview = (
  query?: SubscriptionAnalyticsQuery,
  options?: QueryOptions<SubscriptionSummary>
): UseQueryResult<SubscriptionSummary, ApiError> => {
  return useQuery({
    queryKey: subscriptionsAnalyticsQueryKeys.overview(query),
    queryFn: () => subscriptionsAnalyticsApi.getSubscriptionOverview(query),
    ...options
  });
};

/**
 * Retrieve subscription usage analytics.
 */
export const useUsageAnalytics = (
  query?: SubscriptionAnalyticsQuery,
  options?: QueryOptions<SubscriptionUsageAnalyticsResult>
): UseQueryResult<SubscriptionUsageAnalyticsResult, ApiError> => {
  return useQuery({
    queryKey: subscriptionsAnalyticsQueryKeys.usage(query),
    queryFn: () => subscriptionsAnalyticsApi.getUsageAnalytics(query),
    ...options
  });
};

/**
 * Retrieve actionable subscription insights.
 */
export const useSubscriptionInsights = (
  query?: { businessId?: string },
  options?: QueryOptions<SubscriptionInsights>
): UseQueryResult<SubscriptionInsights, ApiError> => {
  return useQuery({
    queryKey: subscriptionsAnalyticsQueryKeys.insights(query),
    queryFn: () => subscriptionsAnalyticsApi.getSubscriptionInsights(query),
    ...options
  });
};

/**
 * Generate win-back offers.
 */
export const useGenerateWinBackOffers = (
  options?: MutationConfig<{ offers: string[]; reason?: string }, SubscriptionWinBackPayload | undefined>
): UseMutationResult<{ offers: string[]; reason?: string }, ApiError, SubscriptionWinBackPayload | undefined, unknown> => {
  return useMutation({
    mutationKey: subscriptionsAnalyticsMutationKeys.winBack,
    mutationFn: (payload) => subscriptionsAnalyticsApi.generateWinBackOffers(payload),
    ...options
  });
};

/**
 * Main hook that provides access to all subscription analytics operations.
 */
export interface UseSubscriptionsAnalyticsOptions {
  queries?: {
    overview?: QueryOptions<SubscriptionSummary>;
    usage?: QueryOptions<SubscriptionUsageAnalyticsResult>;
    insights?: QueryOptions<SubscriptionInsights>;
  };
  mutations?: {
    winBack?: MutationConfig<{ offers: string[]; reason?: string }, SubscriptionWinBackPayload | undefined>;
  };
}

export interface UseSubscriptionsAnalyticsResult {
  // Queries
  overview: (query?: SubscriptionAnalyticsQuery) => UseQueryResult<SubscriptionSummary, ApiError>;
  usage: (
    query?: SubscriptionAnalyticsQuery
  ) => UseQueryResult<SubscriptionUsageAnalyticsResult, ApiError>;
  insights: (query?: { businessId?: string }) => UseQueryResult<SubscriptionInsights, ApiError>;

  // Mutations
  winBack: UseMutationResult<
    { offers: string[]; reason?: string },
    ApiError,
    SubscriptionWinBackPayload | undefined,
    unknown
  >;
}

export const useSubscriptionsAnalytics = (
  options: UseSubscriptionsAnalyticsOptions = {}
): UseSubscriptionsAnalyticsResult => {
  const winBack = useGenerateWinBackOffers(options.mutations?.winBack);

  return {
    overview: (query?: SubscriptionAnalyticsQuery) =>
      useSubscriptionOverview(query, options.queries?.overview),
    usage: (query?: SubscriptionAnalyticsQuery) =>
      useUsageAnalytics(query, options.queries?.usage),
    insights: (query?: { businessId?: string }) =>
      useSubscriptionInsights(query, options.queries?.insights),
    winBack
  };
};
