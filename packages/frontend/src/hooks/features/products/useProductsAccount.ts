'use client';

// src/hooks/features/products/useProductsAccount.ts

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

import productsAccountApi, {
  type BulkUpdateStatusPayload,
  type ProductAnalyticsParams,
  type ProductListParams,
  type ProductOwnerParams,
  type ProductOwnershipParams,
  type ProductStatsSummary
} from '@/lib/api/features/products/productsAccount.api';
import type {
  ProductAnalyticsResult,
  ProductLeanDocument
} from '@/lib/types/features/products';
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

export const productsAccountQueryKeys = {
  root: ['products', 'account'] as const,
  analytics: (params?: ProductAnalyticsParams) =>
    [...productsAccountQueryKeys.root, 'analytics', normalizeObject(params)] as const,
  categories: (params?: ProductOwnerParams) =>
    [...productsAccountQueryKeys.root, 'categories', normalizeObject(params)] as const,
  stats: (params?: ProductOwnerParams) =>
    [...productsAccountQueryKeys.root, 'stats', normalizeObject(params)] as const,
  recent: (params?: ProductListParams) =>
    [...productsAccountQueryKeys.root, 'recent', normalizeObject(params)] as const,
  popular: (params?: ProductListParams) =>
    [...productsAccountQueryKeys.root, 'popular', normalizeObject(params)] as const,
  topVoted: (params?: ProductListParams) =>
    [...productsAccountQueryKeys.root, 'top-voted', normalizeObject(params)] as const,
  ownership: (params: ProductOwnershipParams) =>
    [...productsAccountQueryKeys.root, 'ownership', normalizeObject(params)] as const
};

export const productsAccountMutationKeys = {
  incrementView: (productId: string) =>
    [...productsAccountQueryKeys.root, 'increment-view', productId] as const,
  incrementVote: (productId: string) =>
    [...productsAccountQueryKeys.root, 'increment-vote', productId] as const,
  incrementCertificate: (productId: string) =>
    [...productsAccountQueryKeys.root, 'increment-certificate', productId] as const,
  bulkUpdateStatus: [...productsAccountQueryKeys.root, 'bulk-update-status'] as const
};

/**
 * Retrieve product analytics summary.
 */
export const useProductAnalytics = (
  params?: ProductAnalyticsParams,
  options?: QueryOptions<ProductAnalyticsResult>
): UseQueryResult<ProductAnalyticsResult, ApiError> => {
  return useQuery({
    queryKey: productsAccountQueryKeys.analytics(params),
    queryFn: () => productsAccountApi.getProductAnalytics(params),
    ...options
  });
};

/**
 * Retrieve product categories for an owner.
 */
export const useProductCategories = (
  params?: ProductOwnerParams,
  options?: QueryOptions<string[]>
): UseQueryResult<string[], ApiError> => {
  return useQuery({
    queryKey: productsAccountQueryKeys.categories(params),
    queryFn: () => productsAccountApi.getProductCategories(params),
    ...options
  });
};

/**
 * Retrieve aggregated product stats for an owner.
 */
export const useProductStats = (
  params?: ProductOwnerParams,
  options?: QueryOptions<ProductStatsSummary>
): UseQueryResult<ProductStatsSummary, ApiError> => {
  return useQuery({
    queryKey: productsAccountQueryKeys.stats(params),
    queryFn: () => productsAccountApi.getProductStats(params),
    ...options
  });
};

/**
 * Retrieve recent products for an owner.
 */
export const useRecentProducts = (
  params?: ProductListParams,
  options?: QueryOptions<ProductLeanDocument[]>
): UseQueryResult<ProductLeanDocument[], ApiError> => {
  return useQuery({
    queryKey: productsAccountQueryKeys.recent(params),
    queryFn: () => productsAccountApi.getRecentProducts(params),
    ...options
  });
};

/**
 * Retrieve popular products for an owner.
 */
export const usePopularProducts = (
  params?: ProductListParams,
  options?: QueryOptions<ProductLeanDocument[]>
): UseQueryResult<ProductLeanDocument[], ApiError> => {
  return useQuery({
    queryKey: productsAccountQueryKeys.popular(params),
    queryFn: () => productsAccountApi.getPopularProducts(params),
    ...options
  });
};

/**
 * Retrieve top voted products for an owner.
 */
export const useTopVotedProducts = (
  params?: ProductListParams,
  options?: QueryOptions<ProductLeanDocument[]>
): UseQueryResult<ProductLeanDocument[], ApiError> => {
  return useQuery({
    queryKey: productsAccountQueryKeys.topVoted(params),
    queryFn: () => productsAccountApi.getTopVotedProducts(params),
    ...options
  });
};

/**
 * Determine if the authenticated owner controls the product.
 */
export const useProductOwnership = (
  params: ProductOwnershipParams,
  options?: QueryOptions<boolean>
): UseQueryResult<boolean, ApiError> => {
  return useQuery({
    queryKey: productsAccountQueryKeys.ownership(params),
    queryFn: () => productsAccountApi.isProductOwner(params),
    enabled: Boolean(params.productId) && (options?.enabled ?? true),
    ...options
  });
};

type IncrementViewVariables = {
  productId: string;
};

/**
 * Increment product view count.
 */
export const useIncrementViewCount = (
  options?: MutationConfig<boolean, IncrementViewVariables>
): UseMutationResult<boolean, ApiError, IncrementViewVariables, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: productsAccountMutationKeys.incrementView(''),
    mutationFn: ({ productId }) => productsAccountApi.incrementViewCount(productId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: productsAccountQueryKeys.analytics()
      });
      void queryClient.invalidateQueries({
        queryKey: productsAccountQueryKeys.stats()
      });
    },
    ...options
  });
};

type IncrementVoteVariables = {
  productId: string;
};

/**
 * Increment product vote count.
 */
export const useIncrementVoteCount = (
  options?: MutationConfig<boolean, IncrementVoteVariables>
): UseMutationResult<boolean, ApiError, IncrementVoteVariables, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: productsAccountMutationKeys.incrementVote(''),
    mutationFn: ({ productId }) => productsAccountApi.incrementVoteCount(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: productsAccountQueryKeys.analytics()
      });
      void queryClient.invalidateQueries({
        queryKey: productsAccountQueryKeys.stats()
      });
      void queryClient.invalidateQueries({
        queryKey: productsAccountQueryKeys.topVoted()
      });
    },
    ...options
  });
};

type IncrementCertificateVariables = {
  productId: string;
};

/**
 * Increment product certificate count.
 */
export const useIncrementCertificateCount = (
  options?: MutationConfig<boolean, IncrementCertificateVariables>
): UseMutationResult<boolean, ApiError, IncrementCertificateVariables, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: productsAccountMutationKeys.incrementCertificate(''),
    mutationFn: ({ productId }) => productsAccountApi.incrementCertificateCount(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: productsAccountQueryKeys.analytics()
      });
      void queryClient.invalidateQueries({
        queryKey: productsAccountQueryKeys.stats()
      });
    },
    ...options
  });
};

/**
 * Bulk update product statuses.
 */
export const useBulkUpdateStatus = (
  options?: MutationConfig<number | boolean, BulkUpdateStatusPayload>
): UseMutationResult<number | boolean, ApiError, BulkUpdateStatusPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: productsAccountMutationKeys.bulkUpdateStatus,
    mutationFn: (payload) => productsAccountApi.bulkUpdateStatus(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productsAccountQueryKeys.root });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all product account operations.
 */
export interface UseProductsAccountOptions {
  queries?: {
    analytics?: QueryOptions<ProductAnalyticsResult>;
    categories?: QueryOptions<string[]>;
    stats?: QueryOptions<ProductStatsSummary>;
    recent?: QueryOptions<ProductLeanDocument[]>;
    popular?: QueryOptions<ProductLeanDocument[]>;
    topVoted?: QueryOptions<ProductLeanDocument[]>;
    ownership?: QueryOptions<boolean>;
  };
  mutations?: {
    incrementView?: MutationConfig<boolean, IncrementViewVariables>;
    incrementVote?: MutationConfig<boolean, IncrementVoteVariables>;
    incrementCertificate?: MutationConfig<boolean, IncrementCertificateVariables>;
    bulkUpdateStatus?: MutationConfig<number | boolean, BulkUpdateStatusPayload>;
  };
}

export interface UseProductsAccountResult {
  // Queries
  analytics: (params?: ProductAnalyticsParams) => UseQueryResult<ProductAnalyticsResult, ApiError>;
  categories: (params?: ProductOwnerParams) => UseQueryResult<string[], ApiError>;
  stats: (params?: ProductOwnerParams) => UseQueryResult<ProductStatsSummary, ApiError>;
  recent: (params?: ProductListParams) => UseQueryResult<ProductLeanDocument[], ApiError>;
  popular: (params?: ProductListParams) => UseQueryResult<ProductLeanDocument[], ApiError>;
  topVoted: (params?: ProductListParams) => UseQueryResult<ProductLeanDocument[], ApiError>;
  ownership: (params: ProductOwnershipParams) => UseQueryResult<boolean, ApiError>;

  // Mutations
  incrementViewCount: UseMutationResult<boolean, ApiError, IncrementViewVariables, unknown>;
  incrementVoteCount: UseMutationResult<boolean, ApiError, IncrementVoteVariables, unknown>;
  incrementCertificateCount: UseMutationResult<boolean, ApiError, IncrementCertificateVariables, unknown>;
  bulkUpdateStatus: UseMutationResult<number | boolean, ApiError, BulkUpdateStatusPayload, unknown>;
}

export const useProductsAccount = (options: UseProductsAccountOptions = {}): UseProductsAccountResult => {
  const incrementViewCount = useIncrementViewCount(options.mutations?.incrementView);
  const incrementVoteCount = useIncrementVoteCount(options.mutations?.incrementVote);
  const incrementCertificateCount = useIncrementCertificateCount(options.mutations?.incrementCertificate);
  const bulkUpdateStatus = useBulkUpdateStatus(options.mutations?.bulkUpdateStatus);

  return {
    analytics: (params?: ProductAnalyticsParams) =>
      useProductAnalytics(params, options.queries?.analytics),
    categories: (params?: ProductOwnerParams) =>
      useProductCategories(params, options.queries?.categories),
    stats: (params?: ProductOwnerParams) => useProductStats(params, options.queries?.stats),
    recent: (params?: ProductListParams) => useRecentProducts(params, options.queries?.recent),
    popular: (params?: ProductListParams) => usePopularProducts(params, options.queries?.popular),
    topVoted: (params?: ProductListParams) =>
      useTopVotedProducts(params, options.queries?.topVoted),
    ownership: (params: ProductOwnershipParams) =>
      useProductOwnership(params, options.queries?.ownership),
    incrementViewCount,
    incrementVoteCount,
    incrementCertificateCount,
    bulkUpdateStatus
  };
};
