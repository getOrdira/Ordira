'use client';

// src/hooks/features/products/useProductsAggregation.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import productsAggregationApi, {
  type ProductAggregationFilters,
  type ProductOwnerScopedParams
} from '@/lib/api/features/products/productsAggregation.api';
import type {
  ManufacturerProductsWithStats,
  ProductListResult,
  ProductWithRelations
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

export const productsAggregationQueryKeys = {
  root: ['products', 'aggregation'] as const,
  withRelations: (filters?: ProductAggregationFilters) =>
    [...productsAggregationQueryKeys.root, 'with-relations', normalizeObject(filters)] as const,
  productWithRelations: (productId: string, params?: ProductOwnerScopedParams) =>
    [
      ...productsAggregationQueryKeys.root,
      'product',
      productId,
      'with-relations',
      normalizeObject(params)
    ] as const,
  manufacturerStats: (manufacturerId: string) =>
    [...productsAggregationQueryKeys.root, 'manufacturer', manufacturerId, 'stats'] as const,
  withMedia: (filters?: ProductAggregationFilters) =>
    [...productsAggregationQueryKeys.root, 'with-media', normalizeObject(filters)] as const,
  byCategory: (params?: ProductOwnerScopedParams) =>
    [...productsAggregationQueryKeys.root, 'by-category', normalizeObject(params)] as const
};

/**
 * Retrieve products with aggregated relations.
 */
export const useProductsWithRelations = (
  filters?: ProductAggregationFilters,
  options?: QueryOptions<ProductListResult>
): UseQueryResult<ProductListResult, ApiError> => {
  return useQuery({
    queryKey: productsAggregationQueryKeys.withRelations(filters),
    queryFn: () => productsAggregationApi.getProductsWithRelations(filters),
    ...options
  });
};

/**
 * Retrieve a single product with aggregated relations.
 */
export const useProductWithRelations = (
  productId: string,
  params?: ProductOwnerScopedParams,
  options?: QueryOptions<ProductWithRelations | null>
): UseQueryResult<ProductWithRelations | null, ApiError> => {
  return useQuery({
    queryKey: productsAggregationQueryKeys.productWithRelations(productId, params),
    queryFn: () => productsAggregationApi.getProductWithRelations(productId, params),
    enabled: Boolean(productId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve manufacturer products with stats.
 */
export const useManufacturerProductsWithStats = (
  manufacturerId: string,
  options?: QueryOptions<ManufacturerProductsWithStats>
): UseQueryResult<ManufacturerProductsWithStats, ApiError> => {
  return useQuery({
    queryKey: productsAggregationQueryKeys.manufacturerStats(manufacturerId),
    queryFn: () => productsAggregationApi.getManufacturerProductsWithStats(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve products enriched with media data.
 */
export const useProductsWithMedia = (
  filters?: ProductAggregationFilters,
  options?: QueryOptions<ProductWithRelations[]>
): UseQueryResult<ProductWithRelations[], ApiError> => {
  return useQuery({
    queryKey: productsAggregationQueryKeys.withMedia(filters),
    queryFn: () => productsAggregationApi.getProductsWithMedia(filters),
    ...options
  });
};

/**
 * Retrieve aggregated products grouped by category.
 */
export const useProductsByCategory = (
  params?: ProductOwnerScopedParams,
  options?: QueryOptions<unknown[]>
): UseQueryResult<unknown[], ApiError> => {
  return useQuery({
    queryKey: productsAggregationQueryKeys.byCategory(params),
    queryFn: () => productsAggregationApi.getProductsByCategory(params),
    ...options
  });
};

/**
 * Main hook that provides access to all product aggregation operations.
 */
export interface UseProductsAggregationOptions {
  queries?: {
    withRelations?: QueryOptions<ProductListResult>;
    productWithRelations?: QueryOptions<ProductWithRelations | null>;
    manufacturerStats?: QueryOptions<ManufacturerProductsWithStats>;
    withMedia?: QueryOptions<ProductWithRelations[]>;
    byCategory?: QueryOptions<unknown[]>;
  };
}

export interface UseProductsAggregationResult {
  // Queries
  withRelations: (filters?: ProductAggregationFilters) => UseQueryResult<ProductListResult, ApiError>;
  productWithRelations: (
    productId: string,
    params?: ProductOwnerScopedParams
  ) => UseQueryResult<ProductWithRelations | null, ApiError>;
  manufacturerStats: (
    manufacturerId: string
  ) => UseQueryResult<ManufacturerProductsWithStats, ApiError>;
  withMedia: (filters?: ProductAggregationFilters) => UseQueryResult<ProductWithRelations[], ApiError>;
  byCategory: (params?: ProductOwnerScopedParams) => UseQueryResult<unknown[], ApiError>;
}

export const useProductsAggregation = (
  options: UseProductsAggregationOptions = {}
): UseProductsAggregationResult => {
  return {
    withRelations: (filters?: ProductAggregationFilters) =>
      useProductsWithRelations(filters, options.queries?.withRelations),
    productWithRelations: (productId: string, params?: ProductOwnerScopedParams) =>
      useProductWithRelations(productId, params, options.queries?.productWithRelations),
    manufacturerStats: (manufacturerId: string) =>
      useManufacturerProductsWithStats(manufacturerId, options.queries?.manufacturerStats),
    withMedia: (filters?: ProductAggregationFilters) =>
      useProductsWithMedia(filters, options.queries?.withMedia),
    byCategory: (params?: ProductOwnerScopedParams) =>
      useProductsByCategory(params, options.queries?.byCategory)
  };
};
