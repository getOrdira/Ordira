'use client';

// src/hooks/features/subscriptions/useSubscriptionsPlans.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import subscriptionsPlansApi, {
  type AnalyzeSubscriptionChangesPayload,
  type PlanMetadata,
  type SubscriptionTierInfo,
  type TierFeaturesResponse,
  type TierOnboardingSteps
} from '@/lib/api/features/subscriptions/subscriptionsPlans.api';
import type { TierChangeAnalysis, TierComparison } from '@/lib/types/features/subscriptions';
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

export const subscriptionsPlansQueryKeys = {
  root: ['subscriptions', 'plans'] as const,
  tiers: () => [...subscriptionsPlansQueryKeys.root, 'tiers'] as const,
  features: (tier: string) => [...subscriptionsPlansQueryKeys.root, 'features', tier] as const,
  onboarding: (tier?: string) =>
    [...subscriptionsPlansQueryKeys.root, 'onboarding', tier ?? null] as const,
  comparison: (query?: { currentTier?: string; targetTier?: string }) =>
    [...subscriptionsPlansQueryKeys.root, 'comparison', normalizeObject(query)] as const,
  metadata: (tier?: string) =>
    [...subscriptionsPlansQueryKeys.root, 'metadata', tier ?? null] as const
};

export const subscriptionsPlansMutationKeys = {
  analyzeChanges: [...subscriptionsPlansQueryKeys.root, 'analyze-changes'] as const
};

/**
 * Retrieve available tiers.
 */
export const useAvailableTiers = (
  options?: QueryOptions<{ tiers: SubscriptionTierInfo[] }>
): UseQueryResult<{ tiers: SubscriptionTierInfo[] }, ApiError> => {
  return useQuery({
    queryKey: subscriptionsPlansQueryKeys.tiers(),
    queryFn: () => subscriptionsPlansApi.getAvailableTiers(),
    ...options
  });
};

/**
 * Retrieve tier features.
 */
export const useTierFeatures = (
  tier: string,
  options?: QueryOptions<TierFeaturesResponse>
): UseQueryResult<TierFeaturesResponse, ApiError> => {
  return useQuery({
    queryKey: subscriptionsPlansQueryKeys.features(tier),
    queryFn: () => subscriptionsPlansApi.getTierFeatures({ tier }),
    enabled: Boolean(tier) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve onboarding steps.
 */
export const useOnboardingSteps = (
  tier?: string,
  options?: QueryOptions<TierOnboardingSteps>
): UseQueryResult<TierOnboardingSteps, ApiError> => {
  return useQuery({
    queryKey: subscriptionsPlansQueryKeys.onboarding(tier),
    queryFn: () => subscriptionsPlansApi.getOnboardingSteps({ tier }),
    ...options
  });
};

/**
 * Retrieve tier comparison for current subscription.
 */
export const useTierComparison = (
  query?: { currentTier?: string; targetTier?: string },
  options?: QueryOptions<{ businessId: string; comparison: TierComparison }>
): UseQueryResult<{ businessId: string; comparison: TierComparison }, ApiError> => {
  return useQuery({
    queryKey: subscriptionsPlansQueryKeys.comparison(query),
    queryFn: () => subscriptionsPlansApi.getTierComparison(query),
    ...options
  });
};

/**
 * Retrieve plan metadata.
 */
export const usePlanMetadata = (
  tier?: string,
  options?: QueryOptions<PlanMetadata>
): UseQueryResult<PlanMetadata, ApiError> => {
  return useQuery({
    queryKey: subscriptionsPlansQueryKeys.metadata(tier),
    queryFn: () => subscriptionsPlansApi.getPlanMetadata({ tier }),
    ...options
  });
};

/**
 * Analyze subscription changes.
 */
export const useAnalyzeSubscriptionChanges = (
  options?: MutationConfig<{ analysis: TierChangeAnalysis }, AnalyzeSubscriptionChangesPayload>
): UseMutationResult<{ analysis: TierChangeAnalysis }, ApiError, AnalyzeSubscriptionChangesPayload, unknown> => {
  return useMutation({
    mutationKey: subscriptionsPlansMutationKeys.analyzeChanges,
    mutationFn: (payload) => subscriptionsPlansApi.analyzeSubscriptionChanges(payload),
    ...options
  });
};

/**
 * Main hook that provides access to all subscription plans operations.
 */
export interface UseSubscriptionsPlansOptions {
  queries?: {
    tiers?: QueryOptions<{ tiers: SubscriptionTierInfo[] }>;
    features?: QueryOptions<TierFeaturesResponse>;
    onboarding?: QueryOptions<TierOnboardingSteps>;
    comparison?: QueryOptions<{ businessId: string; comparison: TierComparison }>;
    metadata?: QueryOptions<PlanMetadata>;
  };
  mutations?: {
    analyzeChanges?: MutationConfig<{ analysis: TierChangeAnalysis }, AnalyzeSubscriptionChangesPayload>;
  };
}

export interface UseSubscriptionsPlansResult {
  // Queries
  tiers: UseQueryResult<{ tiers: SubscriptionTierInfo[] }, ApiError>;
  features: (tier: string) => UseQueryResult<TierFeaturesResponse, ApiError>;
  onboarding: (tier?: string) => UseQueryResult<TierOnboardingSteps, ApiError>;
  comparison: (
    query?: { currentTier?: string; targetTier?: string }
  ) => UseQueryResult<{ businessId: string; comparison: TierComparison }, ApiError>;
  metadata: (tier?: string) => UseQueryResult<PlanMetadata, ApiError>;

  // Mutations
  analyzeChanges: UseMutationResult<
    { analysis: TierChangeAnalysis },
    ApiError,
    AnalyzeSubscriptionChangesPayload,
    unknown
  >;
}

export const useSubscriptionsPlans = (
  options: UseSubscriptionsPlansOptions = {}
): UseSubscriptionsPlansResult => {
  const analyzeChanges = useAnalyzeSubscriptionChanges(options.mutations?.analyzeChanges);

  return {
    tiers: useAvailableTiers(options.queries?.tiers),
    features: (tier: string) => useTierFeatures(tier, options.queries?.features),
    onboarding: (tier?: string) => useOnboardingSteps(tier, options.queries?.onboarding),
    comparison: (query?: { currentTier?: string; targetTier?: string }) =>
      useTierComparison(query, options.queries?.comparison),
    metadata: (tier?: string) => usePlanMetadata(tier, options.queries?.metadata),
    analyzeChanges
  };
};
