'use client';

// src/hooks/features/supplyChain/useSupplyChainContractRead.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import supplyChainContractReadApi, {
  type ContractEndpointsResponse,
  type ContractProductsResponse,
  type ContractReadBaseQuery,
  type ContractReadListQuery,
  type ContractReadProductEventsQuery,
  type ContractStatsResponse,
  type EndpointByIdResponse,
  type EntityByNumericIdQuery,
  type EventByIdResponse,
  type ProductByIdResponse,
  type ProductEventsResponse
} from '@/lib/api/features/supplyChain/supplyChainContractRead.api';
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

export const supplyChainContractReadQueryKeys = {
  root: ['supply-chain', 'contract', 'read'] as const,
  stats: (query: ContractReadBaseQuery) =>
    [...supplyChainContractReadQueryKeys.root, 'stats', normalizeObject(query)] as const,
  endpoints: (query: ContractReadListQuery) =>
    [...supplyChainContractReadQueryKeys.root, 'endpoints', normalizeObject(query)] as const,
  products: (query: ContractReadListQuery) =>
    [...supplyChainContractReadQueryKeys.root, 'products', normalizeObject(query)] as const,
  productEvents: (query: ContractReadProductEventsQuery) =>
    [...supplyChainContractReadQueryKeys.root, 'product-events', normalizeObject(query)] as const,
  endpoint: (query: EntityByNumericIdQuery) =>
    [...supplyChainContractReadQueryKeys.root, 'endpoint', normalizeObject(query)] as const,
  product: (query: EntityByNumericIdQuery) =>
    [...supplyChainContractReadQueryKeys.root, 'product', normalizeObject(query)] as const,
  event: (query: EntityByNumericIdQuery) =>
    [...supplyChainContractReadQueryKeys.root, 'event', normalizeObject(query)] as const
};

/**
 * Retrieve contract statistics.
 */
export const useContractStats = (
  query: ContractReadBaseQuery,
  options?: QueryOptions<ContractStatsResponse>
): UseQueryResult<ContractStatsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainContractReadQueryKeys.stats(query),
    queryFn: () => supplyChainContractReadApi.getContractStats(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve contract endpoints with pagination.
 */
export const useContractEndpoints = (
  query: ContractReadListQuery,
  options?: QueryOptions<ContractEndpointsResponse>
): UseQueryResult<ContractEndpointsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainContractReadQueryKeys.endpoints(query),
    queryFn: () => supplyChainContractReadApi.getContractEndpoints(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve contract products with pagination.
 */
export const useContractProducts = (
  query: ContractReadListQuery,
  options?: QueryOptions<ContractProductsResponse>
): UseQueryResult<ContractProductsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainContractReadQueryKeys.products(query),
    queryFn: () => supplyChainContractReadApi.getContractProducts(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve product events with pagination.
 */
export const useProductEvents = (
  query: ContractReadProductEventsQuery,
  options?: QueryOptions<ProductEventsResponse>
): UseQueryResult<ProductEventsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainContractReadQueryKeys.productEvents(query),
    queryFn: () => supplyChainContractReadApi.getProductEvents(query),
    enabled: Boolean(query.contractAddress && query.productId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve endpoint by numeric identifier.
 */
export const useEndpointById = (
  query: EntityByNumericIdQuery,
  options?: QueryOptions<EndpointByIdResponse>
): UseQueryResult<EndpointByIdResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainContractReadQueryKeys.endpoint(query),
    queryFn: () => supplyChainContractReadApi.getEndpointById(query),
    enabled:
      Boolean(query.contractAddress && typeof query.id !== 'undefined') &&
      (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve product by numeric identifier.
 */
export const useProductById = (
  query: EntityByNumericIdQuery,
  options?: QueryOptions<ProductByIdResponse>
): UseQueryResult<ProductByIdResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainContractReadQueryKeys.product(query),
    queryFn: () => supplyChainContractReadApi.getProductById(query),
    enabled:
      Boolean(query.contractAddress && typeof query.id !== 'undefined') &&
      (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve event by numeric identifier.
 */
export const useEventById = (
  query: EntityByNumericIdQuery,
  options?: QueryOptions<EventByIdResponse>
): UseQueryResult<EventByIdResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainContractReadQueryKeys.event(query),
    queryFn: () => supplyChainContractReadApi.getEventById(query),
    enabled:
      Boolean(query.contractAddress && typeof query.id !== 'undefined') &&
      (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all supply chain contract read operations.
 */
export interface UseSupplyChainContractReadOptions {
  queries?: {
    stats?: QueryOptions<ContractStatsResponse>;
    endpoints?: QueryOptions<ContractEndpointsResponse>;
    products?: QueryOptions<ContractProductsResponse>;
    productEvents?: QueryOptions<ProductEventsResponse>;
    endpoint?: QueryOptions<EndpointByIdResponse>;
    product?: QueryOptions<ProductByIdResponse>;
    event?: QueryOptions<EventByIdResponse>;
  };
}

export interface UseSupplyChainContractReadResult {
  // Queries
  stats: (query: ContractReadBaseQuery) => UseQueryResult<ContractStatsResponse, ApiError>;
  endpoints: (query: ContractReadListQuery) => UseQueryResult<ContractEndpointsResponse, ApiError>;
  products: (query: ContractReadListQuery) => UseQueryResult<ContractProductsResponse, ApiError>;
  productEvents: (
    query: ContractReadProductEventsQuery
  ) => UseQueryResult<ProductEventsResponse, ApiError>;
  endpoint: (query: EntityByNumericIdQuery) => UseQueryResult<EndpointByIdResponse, ApiError>;
  product: (query: EntityByNumericIdQuery) => UseQueryResult<ProductByIdResponse, ApiError>;
  event: (query: EntityByNumericIdQuery) => UseQueryResult<EventByIdResponse, ApiError>;
}

export const useSupplyChainContractRead = (
  options: UseSupplyChainContractReadOptions = {}
): UseSupplyChainContractReadResult => {
  return {
    stats: (query: ContractReadBaseQuery) =>
      useContractStats(query, options.queries?.stats),
    endpoints: (query: ContractReadListQuery) =>
      useContractEndpoints(query, options.queries?.endpoints),
    products: (query: ContractReadListQuery) =>
      useContractProducts(query, options.queries?.products),
    productEvents: (query: ContractReadProductEventsQuery) =>
      useProductEvents(query, options.queries?.productEvents),
    endpoint: (query: EntityByNumericIdQuery) =>
      useEndpointById(query, options.queries?.endpoint),
    product: (query: EntityByNumericIdQuery) =>
      useProductById(query, options.queries?.product),
    event: (query: EntityByNumericIdQuery) => useEventById(query, options.queries?.event)
  };
};
