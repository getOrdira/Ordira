'use client';

// src/hooks/features/products/useProductsSearch.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import productsSearchApi, {
  type ProductAutocompleteFilters,
  type ProductAutocompleteSuggestion,
  type ProductCategorySearchFilters,
  type ProductPriceSearchFilters,
  type ProductSearchFilters,
  type ProductTagsSearchFilters
} from '@/lib/api/features/products/productsSearch.api';
import type {
  ProductLeanDocument,
  ProductListResult
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

export const productsSearchQueryKeys = {
  root: ['products', 'search'] as const,
  search: (filters: ProductSearchFilters) =>
    [...productsSearchQueryKeys.root, 'search', normalizeObject(filters)] as const,
  byCategory: (filters: ProductCategorySearchFilters) =>
    [...productsSearchQueryKeys.root, 'by-category', normalizeObject(filters)] as const,
  byTags: (filters: ProductTagsSearchFilters) =>
    [...productsSearchQueryKeys.root, 'by-tags', normalizeObject(filters)] as const,
  byPrice: (filters: ProductPriceSearchFilters) =>
    [...productsSearchQueryKeys.root, 'by-price', normalizeObject(filters)] as const,
  similar: (productId: string, limit?: number) =>
    [...productsSearchQueryKeys.root, 'similar', productId, limit ?? null] as const,
  autocomplete: (filters: ProductAutocompleteFilters) =>
    [...productsSearchQueryKeys.root, 'autocomplete', normalizeObject(filters)] as const
};

/**
 * Perform full-text product search.
 */
export const useSearchProducts = (
  filters: ProductSearchFilters,
  options?: QueryOptions<ProductListResult>
): UseQueryResult<ProductListResult, ApiError> => {
  return useQuery({
    queryKey: productsSearchQueryKeys.search(filters),
    queryFn: () => productsSearchApi.searchProducts(filters),
    enabled: Boolean(filters.query) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Search products by category.
 */
export const useSearchByCategory = (
  filters: ProductCategorySearchFilters,
  options?: QueryOptions<ProductLeanDocument[]>
): UseQueryResult<ProductLeanDocument[], ApiError> => {
  return useQuery({
    queryKey: productsSearchQueryKeys.byCategory(filters),
    queryFn: () => productsSearchApi.searchByCategory(filters),
    enabled: Boolean(filters.category) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Search products by tags.
 */
export const useSearchByTags = (
  filters: ProductTagsSearchFilters,
  options?: QueryOptions<ProductLeanDocument[]>
): UseQueryResult<ProductLeanDocument[], ApiError> => {
  return useQuery({
    queryKey: productsSearchQueryKeys.byTags(filters),
    queryFn: () => productsSearchApi.searchByTags(filters),
    enabled: Boolean(filters.tags?.length) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Search products by price range.
 */
export const useSearchByPriceRange = (
  filters: ProductPriceSearchFilters,
  options?: QueryOptions<ProductLeanDocument[]>
): UseQueryResult<ProductLeanDocument[], ApiError> => {
  return useQuery({
    queryKey: productsSearchQueryKeys.byPrice(filters),
    queryFn: () => productsSearchApi.searchByPriceRange(filters),
    enabled:
      typeof filters.minPrice === 'number' &&
      typeof filters.maxPrice === 'number' &&
      (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve similar products.
 */
export const useSimilarProducts = (
  productId: string,
  limit?: number,
  options?: QueryOptions<ProductLeanDocument[]>
): UseQueryResult<ProductLeanDocument[], ApiError> => {
  return useQuery({
    queryKey: productsSearchQueryKeys.similar(productId, limit),
    queryFn: () => productsSearchApi.getSimilarProducts(productId, limit),
    enabled: Boolean(productId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Autocomplete product titles.
 */
export const useProductAutocomplete = (
  filters: ProductAutocompleteFilters,
  options?: QueryOptions<ProductAutocompleteSuggestion[]>
): UseQueryResult<ProductAutocompleteSuggestion[], ApiError> => {
  return useQuery({
    queryKey: productsSearchQueryKeys.autocomplete(filters),
    queryFn: () => productsSearchApi.autocomplete(filters),
    enabled: Boolean(filters.query) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all product search operations.
 */
export interface UseProductsSearchOptions {
  queries?: {
    search?: QueryOptions<ProductListResult>;
    byCategory?: QueryOptions<ProductLeanDocument[]>;
    byTags?: QueryOptions<ProductLeanDocument[]>;
    byPrice?: QueryOptions<ProductLeanDocument[]>;
    similar?: QueryOptions<ProductLeanDocument[]>;
    autocomplete?: QueryOptions<ProductAutocompleteSuggestion[]>;
  };
}

export interface UseProductsSearchResult {
  // Queries
  search: (filters: ProductSearchFilters) => UseQueryResult<ProductListResult, ApiError>;
  byCategory: (
    filters: ProductCategorySearchFilters
  ) => UseQueryResult<ProductLeanDocument[], ApiError>;
  byTags: (filters: ProductTagsSearchFilters) => UseQueryResult<ProductLeanDocument[], ApiError>;
  byPrice: (filters: ProductPriceSearchFilters) => UseQueryResult<ProductLeanDocument[], ApiError>;
  similar: (productId: string, limit?: number) => UseQueryResult<ProductLeanDocument[], ApiError>;
  autocomplete: (
    filters: ProductAutocompleteFilters
  ) => UseQueryResult<ProductAutocompleteSuggestion[], ApiError>;
}

export const useProductsSearch = (options: UseProductsSearchOptions = {}): UseProductsSearchResult => {
  return {
    search: (filters: ProductSearchFilters) =>
      useSearchProducts(filters, options.queries?.search),
    byCategory: (filters: ProductCategorySearchFilters) =>
      useSearchByCategory(filters, options.queries?.byCategory),
    byTags: (filters: ProductTagsSearchFilters) =>
      useSearchByTags(filters, options.queries?.byTags),
    byPrice: (filters: ProductPriceSearchFilters) =>
      useSearchByPriceRange(filters, options.queries?.byPrice),
    similar: (productId: string, limit?: number) =>
      useSimilarProducts(productId, limit, options.queries?.similar),
    autocomplete: (filters: ProductAutocompleteFilters) =>
      useProductAutocomplete(filters, options.queries?.autocomplete)
  };
};
