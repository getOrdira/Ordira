'use client';

// src/hooks/features/products/useProductsAnalytics.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import productsAnalyticsApi, {
  type ProductAnalyticsQuery,
  type ProductCategoryAnalytics,
  type ProductEngagementMetrics,
  type ProductMonthlyTrend,
  type ProductOwnerScopedAnalyticsQuery,
  type ProductPerformanceInsights
} from '@/lib/api/features/products/productsAnalytics.api';
import type {
  ProductAnalyticsResult,
  ProductLeanDocument
} from '@/lib/types/features/products';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

const normalizeObject = <T>(value?: T) => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return Object.keys(value).length ? (value as Record<string, unknown>) : null;
};

export const productsAnalyticsQueryKeys = {
  root: ['products', 'analytics'] as const,
  summary: (query?: ProductAnalyticsQuery) =>
    [...productsAnalyticsQueryKeys.root, 'summary', normalizeObject(query)] as const,
  categories: (query?: ProductOwnerScopedAnalyticsQuery) =>
    [...productsAnalyticsQueryKeys.root, 'categories', normalizeObject(query)] as const,
  engagement: (query?: ProductOwnerScopedAnalyticsQuery) =>
    [...productsAnalyticsQueryKeys.root, 'engagement', normalizeObject(query)] as const,
  trending: (query?: ProductOwnerScopedAnalyticsQuery) =>
    [...productsAnalyticsQueryKeys.root, 'trending', normalizeObject(query)] as const,
  performance: (query?: ProductOwnerScopedAnalyticsQuery) =>
    [...productsAnalyticsQueryKeys.root, 'performance', normalizeObject(query)] as const,
  monthlyTrends: (query?: ProductOwnerScopedAnalyticsQuery) =>
    [...productsAnalyticsQueryKeys.root, 'monthly-trends', normalizeObject(query)] as const
};

/**
 * Retrieve product analytics summary.
 */
export const useAnalyticsSummary = (
  query?: ProductAnalyticsQuery,
  options?: QueryOptions<ProductAnalyticsResult>
): UseQueryResult<ProductAnalyticsResult, ApiError> => {
  return useQuery({
    queryKey: productsAnalyticsQueryKeys.summary(query),
    queryFn: () => productsAnalyticsApi.getAnalyticsSummary(query),
    ...options
  });
};

/**
 * Retrieve product category analytics.
 */
export const useCategoryAnalytics = (
  query?: ProductOwnerScopedAnalyticsQuery,
  options?: QueryOptions<ProductCategoryAnalytics[]>
): UseQueryResult<ProductCategoryAnalytics[], ApiError> => {
  return useQuery({
    queryKey: productsAnalyticsQueryKeys.categories(query),
    queryFn: () => productsAnalyticsApi.getCategoryAnalytics(query),
    ...options
  });
};

/**
 * Retrieve engagement metrics for an owner.
 */
export const useEngagementMetrics = (
  query?: ProductOwnerScopedAnalyticsQuery,
  options?: QueryOptions<ProductEngagementMetrics>
): UseQueryResult<ProductEngagementMetrics, ApiError> => {
  return useQuery({
    queryKey: productsAnalyticsQueryKeys.engagement(query),
    queryFn: () => productsAnalyticsApi.getEngagementMetrics(query),
    ...options
  });
};

/**
 * Retrieve trending products for an owner.
 */
export const useTrendingProducts = (
  query?: ProductOwnerScopedAnalyticsQuery,
  options?: QueryOptions<ProductLeanDocument[]>
): UseQueryResult<ProductLeanDocument[], ApiError> => {
  return useQuery({
    queryKey: productsAnalyticsQueryKeys.trending(query),
    queryFn: () => productsAnalyticsApi.getTrendingProducts(query),
    ...options
  });
};

/**
 * Retrieve product performance insights.
 */
export const usePerformanceInsights = (
  query?: ProductOwnerScopedAnalyticsQuery,
  options?: QueryOptions<ProductPerformanceInsights>
): UseQueryResult<ProductPerformanceInsights, ApiError> => {
  return useQuery({
    queryKey: productsAnalyticsQueryKeys.performance(query),
    queryFn: () => productsAnalyticsApi.getPerformanceInsights(query),
    ...options
  });
};

/**
 * Retrieve monthly product trends.
 */
export const useMonthlyTrends = (
  query?: ProductOwnerScopedAnalyticsQuery,
  options?: QueryOptions<ProductMonthlyTrend[]>
): UseQueryResult<ProductMonthlyTrend[], ApiError> => {
  return useQuery({
    queryKey: productsAnalyticsQueryKeys.monthlyTrends(query),
    queryFn: () => productsAnalyticsApi.getMonthlyTrends(query),
    ...options
  });
};

/**
 * Main hook that provides access to all product analytics operations.
 */
export interface UseProductsAnalyticsOptions {
  queries?: {
    summary?: QueryOptions<ProductAnalyticsResult>;
    categories?: QueryOptions<ProductCategoryAnalytics[]>;
    engagement?: QueryOptions<ProductEngagementMetrics>;
    trending?: QueryOptions<ProductLeanDocument[]>;
    performance?: QueryOptions<ProductPerformanceInsights>;
    monthlyTrends?: QueryOptions<ProductMonthlyTrend[]>;
  };
}

export interface UseProductsAnalyticsResult {
  // Queries
  summary: (query?: ProductAnalyticsQuery) => UseQueryResult<ProductAnalyticsResult, ApiError>;
  categories: (
    query?: ProductOwnerScopedAnalyticsQuery
  ) => UseQueryResult<ProductCategoryAnalytics[], ApiError>;
  engagement: (
    query?: ProductOwnerScopedAnalyticsQuery
  ) => UseQueryResult<ProductEngagementMetrics, ApiError>;
  trending: (
    query?: ProductOwnerScopedAnalyticsQuery
  ) => UseQueryResult<ProductLeanDocument[], ApiError>;
  performance: (
    query?: ProductOwnerScopedAnalyticsQuery
  ) => UseQueryResult<ProductPerformanceInsights, ApiError>;
  monthlyTrends: (
    query?: ProductOwnerScopedAnalyticsQuery
  ) => UseQueryResult<ProductMonthlyTrend[], ApiError>;
}

export const useProductsAnalytics = (
  options: UseProductsAnalyticsOptions = {}
): UseProductsAnalyticsResult => {
  return {
    summary: (query?: ProductAnalyticsQuery) =>
      useAnalyticsSummary(query, options.queries?.summary),
    categories: (query?: ProductOwnerScopedAnalyticsQuery) =>
      useCategoryAnalytics(query, options.queries?.categories),
    engagement: (query?: ProductOwnerScopedAnalyticsQuery) =>
      useEngagementMetrics(query, options.queries?.engagement),
    trending: (query?: ProductOwnerScopedAnalyticsQuery) =>
      useTrendingProducts(query, options.queries?.trending),
    performance: (query?: ProductOwnerScopedAnalyticsQuery) =>
      usePerformanceInsights(query, options.queries?.performance),
    monthlyTrends: (query?: ProductOwnerScopedAnalyticsQuery) =>
      useMonthlyTrends(query, options.queries?.monthlyTrends)
  };
};
