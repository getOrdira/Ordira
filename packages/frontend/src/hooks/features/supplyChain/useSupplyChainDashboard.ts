'use client';

// src/hooks/features/supplyChain/useSupplyChainDashboard.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import supplyChainDashboardApi, {
  type DashboardAnalyticsQuery,
  type DashboardAnalyticsResponse,
  type DashboardBaseQuery,
  type DashboardDataResponse,
  type DashboardEndpointSummariesResponse,
  type DashboardOverviewResponse,
  type DashboardProductSummariesResponse,
  type DashboardQuery,
  type ProductSummariesQuery
} from '@/lib/api/features/supplyChain/supplyChainDashboard.api';
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

export const supplyChainDashboardQueryKeys = {
  root: ['supply-chain', 'dashboard'] as const,
  data: (query: DashboardQuery) =>
    [...supplyChainDashboardQueryKeys.root, 'data', normalizeObject(query)] as const,
  overview: (query: DashboardBaseQuery) =>
    [...supplyChainDashboardQueryKeys.root, 'overview', normalizeObject(query)] as const,
  products: (query: ProductSummariesQuery) =>
    [...supplyChainDashboardQueryKeys.root, 'products', normalizeObject(query)] as const,
  endpoints: (query: DashboardBaseQuery) =>
    [...supplyChainDashboardQueryKeys.root, 'endpoints', normalizeObject(query)] as const,
  analytics: (query: DashboardAnalyticsQuery) =>
    [...supplyChainDashboardQueryKeys.root, 'analytics', normalizeObject(query)] as const
};

/**
 * Retrieve comprehensive dashboard data.
 */
export const useDashboardData = (
  query: DashboardQuery,
  options?: QueryOptions<DashboardDataResponse>
): UseQueryResult<DashboardDataResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainDashboardQueryKeys.data(query),
    queryFn: () => supplyChainDashboardApi.getDashboardData(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve dashboard overview.
 */
export const useDashboardOverview = (
  query: DashboardBaseQuery,
  options?: QueryOptions<DashboardOverviewResponse>
): UseQueryResult<DashboardOverviewResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainDashboardQueryKeys.overview(query),
    queryFn: () => supplyChainDashboardApi.getDashboardOverview(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve product summaries.
 */
export const useProductSummaries = (
  query: ProductSummariesQuery,
  options?: QueryOptions<DashboardProductSummariesResponse>
): UseQueryResult<DashboardProductSummariesResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainDashboardQueryKeys.products(query),
    queryFn: () => supplyChainDashboardApi.getProductSummaries(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve endpoint summaries.
 */
export const useEndpointSummaries = (
  query: DashboardBaseQuery,
  options?: QueryOptions<DashboardEndpointSummariesResponse>
): UseQueryResult<DashboardEndpointSummariesResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainDashboardQueryKeys.endpoints(query),
    queryFn: () => supplyChainDashboardApi.getEndpointSummaries(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve dashboard analytics.
 */
export const useDashboardAnalytics = (
  query: DashboardAnalyticsQuery,
  options?: QueryOptions<DashboardAnalyticsResponse>
): UseQueryResult<DashboardAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainDashboardQueryKeys.analytics(query),
    queryFn: () => supplyChainDashboardApi.getDashboardAnalytics(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all supply chain dashboard operations.
 */
export interface UseSupplyChainDashboardOptions {
  queries?: {
    data?: QueryOptions<DashboardDataResponse>;
    overview?: QueryOptions<DashboardOverviewResponse>;
    products?: QueryOptions<DashboardProductSummariesResponse>;
    endpoints?: QueryOptions<DashboardEndpointSummariesResponse>;
    analytics?: QueryOptions<DashboardAnalyticsResponse>;
  };
}

export interface UseSupplyChainDashboardResult {
  // Queries
  data: (query: DashboardQuery) => UseQueryResult<DashboardDataResponse, ApiError>;
  overview: (query: DashboardBaseQuery) => UseQueryResult<DashboardOverviewResponse, ApiError>;
  products: (
    query: ProductSummariesQuery
  ) => UseQueryResult<DashboardProductSummariesResponse, ApiError>;
  endpoints: (
    query: DashboardBaseQuery
  ) => UseQueryResult<DashboardEndpointSummariesResponse, ApiError>;
  analytics: (query: DashboardAnalyticsQuery) => UseQueryResult<DashboardAnalyticsResponse, ApiError>;
}

export const useSupplyChainDashboard = (
  options: UseSupplyChainDashboardOptions = {}
): UseSupplyChainDashboardResult => {
  return {
    data: (query: DashboardQuery) => useDashboardData(query, options.queries?.data),
    overview: (query: DashboardBaseQuery) =>
      useDashboardOverview(query, options.queries?.overview),
    products: (query: ProductSummariesQuery) =>
      useProductSummaries(query, options.queries?.products),
    endpoints: (query: DashboardBaseQuery) =>
      useEndpointSummaries(query, options.queries?.endpoints),
    analytics: (query: DashboardAnalyticsQuery) =>
      useDashboardAnalytics(query, options.queries?.analytics)
  };
};
