'use client';

// src/hooks/features/subscriptions/useSubscriptionsDiscounts.ts

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

import subscriptionsDiscountsApi, {
  type ApplyDiscountPayload,
  type DiscountCreationSummary,
  type DiscountUsageStats,
  type DiscountUsageTimeframe,
  type DiscountValidationSummary,
  type RemoveDiscountPayload,
  type TokenDiscountInfo,
  type TokenDiscountSavings,
  type WalletQueryParams
} from '@/lib/api/features/subscriptions/subscriptionsDiscounts.api';
import type {
  DiscountEligibility,
  StripeDiscountApplication,
  TokenDiscount
} from '@backend/services/subscriptions/features/tokenDiscount.service';
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

export const subscriptionsDiscountsQueryKeys = {
  root: ['subscriptions', 'discounts'] as const,
  walletBalance: (query: WalletQueryParams) =>
    [...subscriptionsDiscountsQueryKeys.root, 'wallet-balance', normalizeObject(query)] as const,
  available: (query: WalletQueryParams) =>
    [...subscriptionsDiscountsQueryKeys.root, 'available', normalizeObject(query)] as const,
  eligibility: (query: WalletQueryParams) =>
    [...subscriptionsDiscountsQueryKeys.root, 'eligibility', normalizeObject(query)] as const,
  usageStats: (query?: WalletQueryParams) =>
    [...subscriptionsDiscountsQueryKeys.root, 'usage-stats', normalizeObject(query)] as const,
  potentialSavings: (query: WalletQueryParams) =>
    [...subscriptionsDiscountsQueryKeys.root, 'potential-savings', normalizeObject(query)] as const,
  walletInfo: (query: WalletQueryParams) =>
    [...subscriptionsDiscountsQueryKeys.root, 'wallet-info', normalizeObject(query)] as const
};

export const subscriptionsDiscountsMutationKeys = {
  apply: [...subscriptionsDiscountsQueryKeys.root, 'apply'] as const,
  remove: [...subscriptionsDiscountsQueryKeys.root, 'remove'] as const,
  validateCoupons: [...subscriptionsDiscountsQueryKeys.root, 'validate-coupons'] as const,
  createCoupons: [...subscriptionsDiscountsQueryKeys.root, 'create-coupons'] as const
};

/**
 * Retrieve wallet balance.
 */
export const useWalletBalance = (
  query: WalletQueryParams,
  options?: QueryOptions<{ walletAddress: string; balance: number }>
): UseQueryResult<{ walletAddress: string; balance: number }, ApiError> => {
  return useQuery({
    queryKey: subscriptionsDiscountsQueryKeys.walletBalance(query),
    queryFn: () => subscriptionsDiscountsApi.getWalletBalance(query),
    enabled: Boolean(query.walletAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve available token discounts.
 */
export const useAvailableDiscounts = (
  query: WalletQueryParams,
  options?: QueryOptions<{ walletAddress: string; discounts: TokenDiscount[] }>
): UseQueryResult<{ walletAddress: string; discounts: TokenDiscount[] }, ApiError> => {
  return useQuery({
    queryKey: subscriptionsDiscountsQueryKeys.available(query),
    queryFn: () => subscriptionsDiscountsApi.getAvailableDiscounts(query),
    enabled: Boolean(query.walletAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Check discount eligibility.
 */
export const useDiscountEligibility = (
  query: WalletQueryParams,
  options?: QueryOptions<{ walletAddress: string; eligibility: DiscountEligibility }>
): UseQueryResult<{ walletAddress: string; eligibility: DiscountEligibility }, ApiError> => {
  return useQuery({
    queryKey: subscriptionsDiscountsQueryKeys.eligibility(query),
    queryFn: () => subscriptionsDiscountsApi.checkDiscountEligibility(query),
    enabled: Boolean(query.walletAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve discount usage stats.
 */
export const useDiscountUsageStats = (
  query?: WalletQueryParams,
  options?: QueryOptions<{ timeframe: DiscountUsageTimeframe; stats: DiscountUsageStats }>
): UseQueryResult<{ timeframe: DiscountUsageTimeframe; stats: DiscountUsageStats }, ApiError> => {
  return useQuery({
    queryKey: subscriptionsDiscountsQueryKeys.usageStats(query),
    queryFn: () => subscriptionsDiscountsApi.getDiscountUsageStats(query),
    ...options
  });
};

/**
 * Calculate potential savings.
 */
export const useCalculatePotentialSavings = (
  query: WalletQueryParams,
  options?: QueryOptions<{
    walletAddress: string;
    billingCycle: 'monthly' | 'yearly';
    savings: TokenDiscountSavings;
  }>
): UseQueryResult<
  {
    walletAddress: string;
    billingCycle: 'monthly' | 'yearly';
    savings: TokenDiscountSavings;
  },
  ApiError
> => {
  return useQuery({
    queryKey: subscriptionsDiscountsQueryKeys.potentialSavings(query),
    queryFn: () => subscriptionsDiscountsApi.calculatePotentialSavings(query),
    enabled: Boolean(query.walletAddress && query.billingCycle) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve wallet discount info.
 */
export const useWalletDiscountInfo = (
  query: WalletQueryParams,
  options?: QueryOptions<{ walletAddress: string; info: TokenDiscountInfo | null }>
): UseQueryResult<{ walletAddress: string; info: TokenDiscountInfo | null }, ApiError> => {
  return useQuery({
    queryKey: subscriptionsDiscountsQueryKeys.walletInfo(query),
    queryFn: () => subscriptionsDiscountsApi.getWalletDiscountInfo(query),
    enabled: Boolean(query.walletAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Apply token discount.
 */
export const useApplyTokenDiscount = (
  options?: MutationConfig<{ application: StripeDiscountApplication }, ApplyDiscountPayload>
): UseMutationResult<{ application: StripeDiscountApplication }, ApiError, ApplyDiscountPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsDiscountsMutationKeys.apply,
    mutationFn: (payload) => subscriptionsDiscountsApi.applyTokenDiscount(payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: subscriptionsDiscountsQueryKeys.available({ walletAddress: variables.walletAddress })
      });
      void queryClient.invalidateQueries({ queryKey: subscriptionsDiscountsQueryKeys.root });
    },
    ...options
  });
};

/**
 * Remove token discount.
 */
export const useRemoveTokenDiscount = (
  options?: MutationConfig<{ removed: boolean }, RemoveDiscountPayload>
): UseMutationResult<{ removed: boolean }, ApiError, RemoveDiscountPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: subscriptionsDiscountsMutationKeys.remove,
    mutationFn: (payload) => subscriptionsDiscountsApi.removeTokenDiscount(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionsDiscountsQueryKeys.root });
    },
    ...options
  });
};

/**
 * Validate Stripe coupons.
 */
export const useValidateStripeCoupons = (
  options?: MutationConfig<{ validation: DiscountValidationSummary }, void>
): UseMutationResult<{ validation: DiscountValidationSummary }, ApiError, void, unknown> => {
  return useMutation({
    mutationKey: subscriptionsDiscountsMutationKeys.validateCoupons,
    mutationFn: () => subscriptionsDiscountsApi.validateStripeCoupons(),
    ...options
  });
};

/**
 * Create missing Stripe coupons.
 */
export const useCreateMissingCoupons = (
  options?: MutationConfig<
    { created: DiscountCreationSummary['created']; errors: DiscountCreationSummary['errors'] },
    void
  >
): UseMutationResult<
  { created: DiscountCreationSummary['created']; errors: DiscountCreationSummary['errors'] },
  ApiError,
  void,
  unknown
> => {
  return useMutation({
    mutationKey: subscriptionsDiscountsMutationKeys.createCoupons,
    mutationFn: () => subscriptionsDiscountsApi.createMissingCoupons(),
    ...options
  });
};

/**
 * Main hook that provides access to all subscription discounts operations.
 */
export interface UseSubscriptionsDiscountsOptions {
  queries?: {
    walletBalance?: QueryOptions<{ walletAddress: string; balance: number }>;
    available?: QueryOptions<{ walletAddress: string; discounts: TokenDiscount[] }>;
    eligibility?: QueryOptions<{ walletAddress: string; eligibility: DiscountEligibility }>;
    usageStats?: QueryOptions<{ timeframe: DiscountUsageTimeframe; stats: DiscountUsageStats }>;
    potentialSavings?: QueryOptions<{
      walletAddress: string;
      billingCycle: 'monthly' | 'yearly';
      savings: TokenDiscountSavings;
    }>;
    walletInfo?: QueryOptions<{ walletAddress: string; info: TokenDiscountInfo | null }>;
  };
  mutations?: {
    apply?: MutationConfig<{ application: StripeDiscountApplication }, ApplyDiscountPayload>;
    remove?: MutationConfig<{ removed: boolean }, RemoveDiscountPayload>;
    validateCoupons?: MutationConfig<{ validation: DiscountValidationSummary }, void>;
    createCoupons?: MutationConfig<
      { created: DiscountCreationSummary['created']; errors: DiscountCreationSummary['errors'] },
      void
    >;
  };
}

export interface UseSubscriptionsDiscountsResult {
  // Queries
  walletBalance: (
    query: WalletQueryParams
  ) => UseQueryResult<{ walletAddress: string; balance: number }, ApiError>;
  available: (
    query: WalletQueryParams
  ) => UseQueryResult<{ walletAddress: string; discounts: TokenDiscount[] }, ApiError>;
  eligibility: (
    query: WalletQueryParams
  ) => UseQueryResult<{ walletAddress: string; eligibility: DiscountEligibility }, ApiError>;
  usageStats: (
    query?: WalletQueryParams
  ) => UseQueryResult<{ timeframe: DiscountUsageTimeframe; stats: DiscountUsageStats }, ApiError>;
  potentialSavings: (
    query: WalletQueryParams
  ) => UseQueryResult<
    {
      walletAddress: string;
      billingCycle: 'monthly' | 'yearly';
      savings: TokenDiscountSavings;
    },
    ApiError
  >;
  walletInfo: (
    query: WalletQueryParams
  ) => UseQueryResult<{ walletAddress: string; info: TokenDiscountInfo | null }, ApiError>;

  // Mutations
  apply: UseMutationResult<
    { application: StripeDiscountApplication },
    ApiError,
    ApplyDiscountPayload,
    unknown
  >;
  remove: UseMutationResult<{ removed: boolean }, ApiError, RemoveDiscountPayload, unknown>;
  validateCoupons: UseMutationResult<{ validation: DiscountValidationSummary }, ApiError, void, unknown>;
  createCoupons: UseMutationResult<
    { created: DiscountCreationSummary['created']; errors: DiscountCreationSummary['errors'] },
    ApiError,
    void,
    unknown
  >;
}

export const useSubscriptionsDiscounts = (
  options: UseSubscriptionsDiscountsOptions = {}
): UseSubscriptionsDiscountsResult => {
  const apply = useApplyTokenDiscount(options.mutations?.apply);
  const remove = useRemoveTokenDiscount(options.mutations?.remove);
  const validateCoupons = useValidateStripeCoupons(options.mutations?.validateCoupons);
  const createCoupons = useCreateMissingCoupons(options.mutations?.createCoupons);

  return {
    walletBalance: (query: WalletQueryParams) =>
      useWalletBalance(query, options.queries?.walletBalance),
    available: (query: WalletQueryParams) =>
      useAvailableDiscounts(query, options.queries?.available),
    eligibility: (query: WalletQueryParams) =>
      useDiscountEligibility(query, options.queries?.eligibility),
    usageStats: (query?: WalletQueryParams) =>
      useDiscountUsageStats(query, options.queries?.usageStats),
    potentialSavings: (query: WalletQueryParams) =>
      useCalculatePotentialSavings(query, options.queries?.potentialSavings),
    walletInfo: (query: WalletQueryParams) =>
      useWalletDiscountInfo(query, options.queries?.walletInfo),
    apply,
    remove,
    validateCoupons,
    createCoupons
  };
};
