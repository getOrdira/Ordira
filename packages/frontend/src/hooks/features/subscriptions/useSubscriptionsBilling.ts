'use client';

// src/hooks/features/subscriptions/useSubscriptionsBilling.ts

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

import subscriptionsBillingApi, {
  type BillingProfileInput,
  type CheckoutSessionInput,
  type OverageBillingStatus,
  type PaymentMethodInput,
  type PricingSummary,
  type PricingSummaryQuery,
  type SubscriptionBillingRecord,
  type SubscriptionCheckoutSession,
  type TokenDiscountPayload,
  type TokenDiscountUpdateResult
} from '@/lib/api/features/subscriptions/subscriptionsBilling.api';
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

export const subscriptionsBillingQueryKeys = {
  root: ['subscriptions', 'billing'] as const,
  info: () => [...subscriptionsBillingQueryKeys.root, 'info'] as const,
  comprehensive: () => [...subscriptionsBillingQueryKeys.root, 'comprehensive'] as const,
  calculatePricing: (query: PricingSummaryQuery) =>
    [...subscriptionsBillingQueryKeys.root, 'calculate-pricing', normalizeObject(query)] as const,
  overageStatus: () => [...subscriptionsBillingQueryKeys.root, 'overage-status'] as const
};

export const subscriptionsBillingMutationKeys = {
  checkout: [...subscriptionsBillingQueryKeys.root, 'checkout'] as const,
  updatePaymentMethod: [...subscriptionsBillingQueryKeys.root, 'update-payment-method'] as const,
  updateProfile: [...subscriptionsBillingQueryKeys.root, 'update-profile'] as const,
  refreshTokenDiscounts: [...subscriptionsBillingQueryKeys.root, 'refresh-token-discounts'] as const,
  removeTokenDiscounts: [...subscriptionsBillingQueryKeys.root, 'remove-token-discounts'] as const
};

/**
 * Retrieve billing information.
 */
export const useBillingInfo = (
  options?: QueryOptions<SubscriptionBillingRecord | null>
): UseQueryResult<SubscriptionBillingRecord | null, ApiError> => {
  return useQuery({
    queryKey: subscriptionsBillingQueryKeys.info(),
    queryFn: () => subscriptionsBillingApi.getBillingInfo(),
    ...options
  });
};

/**
 * Retrieve comprehensive billing summary.
 */
export const useComprehensiveBillingInfo = (
  options?: QueryOptions<Record<string, unknown>>
): UseQueryResult<Record<string, unknown>, ApiError> => {
  return useQuery({
    queryKey: subscriptionsBillingQueryKeys.comprehensive(),
    queryFn: () => subscriptionsBillingApi.getComprehensiveBillingInfo(),
    ...options
  });
};

/**
 * Calculate pricing summary.
 */
export const useCalculatePricingSummary = (
  query: PricingSummaryQuery,
  options?: QueryOptions<PricingSummary>
): UseQueryResult<PricingSummary, ApiError> => {
  return useQuery({
    queryKey: subscriptionsBillingQueryKeys.calculatePricing(query),
    queryFn: () => subscriptionsBillingApi.calculatePricingSummary(query),
    enabled: Boolean(query.plan) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve overage billing status.
 */
export const useOverageBillingStatus = (
  options?: QueryOptions<OverageBillingStatus>
): UseQueryResult<OverageBillingStatus, ApiError> => {
  return useQuery({
    queryKey: subscriptionsBillingQueryKeys.overageStatus(),
    queryFn: () => subscriptionsBillingApi.getOverageBillingStatus(),
    ...options
  });
};

/**
 * Create a checkout session.
 */
export const useCreateCheckoutSession = (
  options?: MutationConfig<SubscriptionCheckoutSession, CheckoutSessionInput>
): UseMutationResult<SubscriptionCheckoutSession, ApiError, CheckoutSessionInput, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsBillingMutationKeys.checkout,
    mutationFn: (payload) => subscriptionsBillingApi.createCheckoutSession(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsBillingQueryKeys.root });
    },
    ...options
  });
};

/**
 * Update payment method.
 */
export const useUpdatePaymentMethod = (
  options?: MutationConfig<Record<string, unknown>, PaymentMethodInput>
): UseMutationResult<Record<string, unknown>, ApiError, PaymentMethodInput, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsBillingMutationKeys.updatePaymentMethod,
    mutationFn: (payload) => subscriptionsBillingApi.updatePaymentMethod(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsBillingQueryKeys.info() });
    },
    ...options
  });
};

/**
 * Update billing profile.
 */
export const useUpdateBillingProfile = (
  options?: MutationConfig<SubscriptionBillingRecord | null, BillingProfileInput>
): UseMutationResult<SubscriptionBillingRecord | null, ApiError, BillingProfileInput, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsBillingMutationKeys.updateProfile,
    mutationFn: (payload) => subscriptionsBillingApi.updateBillingProfile(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsBillingQueryKeys.info() });
    },
    ...options
  });
};

/**
 * Refresh token discounts.
 */
export const useRefreshTokenDiscounts = (
  options?: MutationConfig<TokenDiscountUpdateResult, TokenDiscountPayload | undefined>
): UseMutationResult<TokenDiscountUpdateResult, ApiError, TokenDiscountPayload | undefined, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsBillingMutationKeys.refreshTokenDiscounts,
    mutationFn: (payload) => subscriptionsBillingApi.refreshTokenDiscounts(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsBillingQueryKeys.root });
    },
    ...options
  });
};

/**
 * Remove token discounts.
 */
export const useRemoveTokenDiscounts = (
  options?: MutationConfig<Record<string, unknown>, void>
): UseMutationResult<Record<string, unknown>, ApiError, void, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsBillingMutationKeys.removeTokenDiscounts,
    mutationFn: () => subscriptionsBillingApi.removeTokenDiscounts(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsBillingQueryKeys.root });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all subscription billing operations.
 */
export interface UseSubscriptionsBillingOptions {
  queries?: {
    info?: QueryOptions<SubscriptionBillingRecord | null>;
    comprehensive?: QueryOptions<Record<string, unknown>>;
    calculatePricing?: QueryOptions<PricingSummary>;
    overageStatus?: QueryOptions<OverageBillingStatus>;
  };
  mutations?: {
    checkout?: MutationConfig<SubscriptionCheckoutSession, CheckoutSessionInput>;
    updatePaymentMethod?: MutationConfig<Record<string, unknown>, PaymentMethodInput>;
    updateProfile?: MutationConfig<SubscriptionBillingRecord | null, BillingProfileInput>;
    refreshTokenDiscounts?: MutationConfig<TokenDiscountUpdateResult, TokenDiscountPayload | undefined>;
    removeTokenDiscounts?: MutationConfig<Record<string, unknown>, void>;
  };
}

export interface UseSubscriptionsBillingResult {
  // Queries
  info: UseQueryResult<SubscriptionBillingRecord | null, ApiError>;
  comprehensive: UseQueryResult<Record<string, unknown>, ApiError>;
  calculatePricing: (query: PricingSummaryQuery) => UseQueryResult<PricingSummary, ApiError>;
  overageStatus: UseQueryResult<OverageBillingStatus, ApiError>;

  // Mutations
  checkout: UseMutationResult<SubscriptionCheckoutSession, ApiError, CheckoutSessionInput, unknown>;
  updatePaymentMethod: UseMutationResult<Record<string, unknown>, ApiError, PaymentMethodInput, unknown>;
  updateProfile: UseMutationResult<
    SubscriptionBillingRecord | null,
    ApiError,
    BillingProfileInput,
    unknown
  >;
  refreshTokenDiscounts: UseMutationResult<
    TokenDiscountUpdateResult,
    ApiError,
    TokenDiscountPayload | undefined,
    unknown
  >;
  removeTokenDiscounts: UseMutationResult<Record<string, unknown>, ApiError, void, unknown>;
}

export const useSubscriptionsBilling = (
  options: UseSubscriptionsBillingOptions = {}
): UseSubscriptionsBillingResult => {
  const checkout = useCreateCheckoutSession(options.mutations?.checkout);
  const updatePaymentMethod = useUpdatePaymentMethod(options.mutations?.updatePaymentMethod);
  const updateProfile = useUpdateBillingProfile(options.mutations?.updateProfile);
  const refreshTokenDiscounts = useRefreshTokenDiscounts(options.mutations?.refreshTokenDiscounts);
  const removeTokenDiscounts = useRemoveTokenDiscounts(options.mutations?.removeTokenDiscounts);

  return {
    info: useBillingInfo(options.queries?.info),
    comprehensive: useComprehensiveBillingInfo(options.queries?.comprehensive),
    calculatePricing: (query: PricingSummaryQuery) =>
      useCalculatePricingSummary(query, options.queries?.calculatePricing),
    overageStatus: useOverageBillingStatus(options.queries?.overageStatus),
    checkout,
    updatePaymentMethod,
    updateProfile,
    refreshTokenDiscounts,
    removeTokenDiscounts
  };
};
