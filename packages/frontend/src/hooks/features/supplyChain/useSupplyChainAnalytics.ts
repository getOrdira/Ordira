'use client';

// src/hooks/features/supplyChain/useSupplyChainAnalytics.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import supplyChainAnalyticsApi, {
  type SupplyChainAnalyticsQuery,
  type SupplyChainAnalyticsResponse,
  type SupplyChainBaseAnalyticsQuery,
  type SupplyChainEndpointAnalyticsResponse,
  type SupplyChainEventAnalyticsQuery,
  type SupplyChainEventAnalyticsResponse,
  type SupplyChainPerformanceMetricsResponse,
  type SupplyChainProductAnalyticsResponse,
  type SupplyChainTrendAnalysisResponse
} from '@/lib/api/features/supplyChain/supplyChainAnalytics.api';
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

export const supplyChainAnalyticsQueryKeys = {
  root: ['supply-chain', 'analytics'] as const,
  analytics: (query: SupplyChainAnalyticsQuery) =>
    [...supplyChainAnalyticsQueryKeys.root, 'analytics', normalizeObject(query)] as const,
  events: (query: SupplyChainEventAnalyticsQuery) =>
    [...supplyChainAnalyticsQueryKeys.root, 'events', normalizeObject(query)] as const,
  products: (query: SupplyChainBaseAnalyticsQuery) =>
    [...supplyChainAnalyticsQueryKeys.root, 'products', normalizeObject(query)] as const,
  endpoints: (query: SupplyChainBaseAnalyticsQuery) =>
    [...supplyChainAnalyticsQueryKeys.root, 'endpoints', normalizeObject(query)] as const,
  performance: (query: SupplyChainEventAnalyticsQuery) =>
    [...supplyChainAnalyticsQueryKeys.root, 'performance', normalizeObject(query)] as const,
  trends: (query: SupplyChainEventAnalyticsQuery) =>
    [...supplyChainAnalyticsQueryKeys.root, 'trends', normalizeObject(query)] as const
};

/**
 * Retrieve comprehensive analytics for a supply chain contract.
 */
export const useAnalytics = (
  query: SupplyChainAnalyticsQuery,
  options?: QueryOptions<SupplyChainAnalyticsResponse>
): UseQueryResult<SupplyChainAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainAnalyticsQueryKeys.analytics(query),
    queryFn: () => supplyChainAnalyticsApi.getAnalytics(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve event analytics for a contract.
 */
export const useEventAnalytics = (
  query: SupplyChainEventAnalyticsQuery,
  options?: QueryOptions<SupplyChainEventAnalyticsResponse>
): UseQueryResult<SupplyChainEventAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainAnalyticsQueryKeys.events(query),
    queryFn: () => supplyChainAnalyticsApi.getEventAnalytics(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve product analytics for a contract.
 */
export const useProductAnalytics = (
  query: SupplyChainBaseAnalyticsQuery,
  options?: QueryOptions<SupplyChainProductAnalyticsResponse>
): UseQueryResult<SupplyChainProductAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainAnalyticsQueryKeys.products(query),
    queryFn: () => supplyChainAnalyticsApi.getProductAnalytics(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve endpoint analytics for a contract.
 */
export const useEndpointAnalytics = (
  query: SupplyChainBaseAnalyticsQuery,
  options?: QueryOptions<SupplyChainEndpointAnalyticsResponse>
): UseQueryResult<SupplyChainEndpointAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainAnalyticsQueryKeys.endpoints(query),
    queryFn: () => supplyChainAnalyticsApi.getEndpointAnalytics(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve performance metrics for a contract.
 */
export const usePerformanceMetrics = (
  query: SupplyChainEventAnalyticsQuery,
  options?: QueryOptions<SupplyChainPerformanceMetricsResponse>
): UseQueryResult<SupplyChainPerformanceMetricsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainAnalyticsQueryKeys.performance(query),
    queryFn: () => supplyChainAnalyticsApi.getPerformanceMetrics(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve trend analysis for a contract.
 */
export const useTrendAnalysis = (
  query: SupplyChainEventAnalyticsQuery,
  options?: QueryOptions<SupplyChainTrendAnalysisResponse>
): UseQueryResult<SupplyChainTrendAnalysisResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainAnalyticsQueryKeys.trends(query),
    queryFn: () => supplyChainAnalyticsApi.getTrendAnalysis(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all supply chain analytics operations.
 */
export interface UseSupplyChainAnalyticsOptions {
  queries?: {
    analytics?: QueryOptions<SupplyChainAnalyticsResponse>;
    events?: QueryOptions<SupplyChainEventAnalyticsResponse>;
    products?: QueryOptions<SupplyChainProductAnalyticsResponse>;
    endpoints?: QueryOptions<SupplyChainEndpointAnalyticsResponse>;
    performance?: QueryOptions<SupplyChainPerformanceMetricsResponse>;
    trends?: QueryOptions<SupplyChainTrendAnalysisResponse>;
  };
}

export interface UseSupplyChainAnalyticsResult {
  // Queries
  analytics: (
    query: SupplyChainAnalyticsQuery
  ) => UseQueryResult<SupplyChainAnalyticsResponse, ApiError>;
  events: (
    query: SupplyChainEventAnalyticsQuery
  ) => UseQueryResult<SupplyChainEventAnalyticsResponse, ApiError>;
  products: (
    query: SupplyChainBaseAnalyticsQuery
  ) => UseQueryResult<SupplyChainProductAnalyticsResponse, ApiError>;
  endpoints: (
    query: SupplyChainBaseAnalyticsQuery
  ) => UseQueryResult<SupplyChainEndpointAnalyticsResponse, ApiError>;
  performance: (
    query: SupplyChainEventAnalyticsQuery
  ) => UseQueryResult<SupplyChainPerformanceMetricsResponse, ApiError>;
  trends: (
    query: SupplyChainEventAnalyticsQuery
  ) => UseQueryResult<SupplyChainTrendAnalysisResponse, ApiError>;
}

export const useSupplyChainAnalytics = (
  options: UseSupplyChainAnalyticsOptions = {}
): UseSupplyChainAnalyticsResult => {
  return {
    analytics: (query: SupplyChainAnalyticsQuery) =>
      useAnalytics(query, options.queries?.analytics),
    events: (query: SupplyChainEventAnalyticsQuery) =>
      useEventAnalytics(query, options.queries?.events),
    products: (query: SupplyChainBaseAnalyticsQuery) =>
      useProductAnalytics(query, options.queries?.products),
    endpoints: (query: SupplyChainBaseAnalyticsQuery) =>
      useEndpointAnalytics(query, options.queries?.endpoints),
    performance: (query: SupplyChainEventAnalyticsQuery) =>
      usePerformanceMetrics(query, options.queries?.performance),
    trends: (query: SupplyChainEventAnalyticsQuery) =>
      useTrendAnalysis(query, options.queries?.trends)
  };
};
