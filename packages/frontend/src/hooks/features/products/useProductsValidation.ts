'use client';

// src/hooks/features/products/useProductsValidation.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import productsValidationApi, {
  type ValidateBulkInput,
  type ValidateCreateProductInput,
  type ValidatePriceRangeQuery,
  type ValidateSearchQueryParams,
  type ValidateUpdateProductInput
} from '@/lib/api/features/products/productsValidation.api';
import type { CreateProductData } from '@/lib/types/features/products';
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

export const productsValidationQueryKeys = {
  root: ['products', 'validation'] as const,
  priceRange: (query?: ValidatePriceRangeQuery) =>
    [...productsValidationQueryKeys.root, 'price-range', normalizeObject(query)] as const,
  searchQuery: (query?: ValidateSearchQueryParams) =>
    [...productsValidationQueryKeys.root, 'search-query', normalizeObject(query)] as const
};

export const productsValidationMutationKeys = {
  validateCreate: [...productsValidationQueryKeys.root, 'validate-create'] as const,
  validateUpdate: [...productsValidationQueryKeys.root, 'validate-update'] as const,
  validateBulk: [...productsValidationQueryKeys.root, 'validate-bulk'] as const,
  sanitize: [...productsValidationQueryKeys.root, 'sanitize'] as const
};

export interface ValidateCreateProductResult {
  valid: boolean;
  errors: unknown[];
  sanitized: CreateProductData;
}

export interface ValidateUpdateProductResult {
  valid: boolean;
  errors: unknown[];
  sanitized: Partial<CreateProductData>;
}

export interface ValidateBulkResult {
  valid: boolean;
  errors: unknown[];
}

export interface ValidatePriceRangeResult {
  valid: boolean;
  error?: string;
}

export interface ValidateSearchQueryResult {
  valid: boolean;
  error?: string;
}

export interface SanitizeProductPayloadResult {
  sanitized: Partial<CreateProductData>;
}

/**
 * Validate product creation payload.
 */
export const useValidateCreateProduct = (
  options?: MutationConfig<ValidateCreateProductResult, ValidateCreateProductInput>
): UseMutationResult<ValidateCreateProductResult, ApiError, ValidateCreateProductInput, unknown> => {
  return useMutation({
    mutationKey: productsValidationMutationKeys.validateCreate,
    mutationFn: (payload) => productsValidationApi.validateCreateProduct(payload),
    ...options
  });
};

/**
 * Validate product update payload.
 */
export const useValidateUpdateProduct = (
  options?: MutationConfig<ValidateUpdateProductResult, ValidateUpdateProductInput>
): UseMutationResult<ValidateUpdateProductResult, ApiError, ValidateUpdateProductInput, unknown> => {
  return useMutation({
    mutationKey: productsValidationMutationKeys.validateUpdate,
    mutationFn: (payload) => productsValidationApi.validateUpdateProduct(payload),
    ...options
  });
};

/**
 * Validate bulk product operations.
 */
export const useValidateBulkOperation = (
  options?: MutationConfig<ValidateBulkResult, ValidateBulkInput>
): UseMutationResult<ValidateBulkResult, ApiError, ValidateBulkInput, unknown> => {
  return useMutation({
    mutationKey: productsValidationMutationKeys.validateBulk,
    mutationFn: (payload) => productsValidationApi.validateBulkOperation(payload),
    ...options
  });
};

/**
 * Validate product price range filters.
 */
export const useValidatePriceRange = (
  query?: ValidatePriceRangeQuery,
  options?: QueryOptions<ValidatePriceRangeResult>
): UseQueryResult<ValidatePriceRangeResult, ApiError> => {
  return useQuery({
    queryKey: productsValidationQueryKeys.priceRange(query),
    queryFn: () => productsValidationApi.validatePriceRange(query),
    enabled: (query?.minPrice !== undefined || query?.maxPrice !== undefined) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Validate product search query.
 */
export const useValidateSearchQuery = (
  query?: ValidateSearchQueryParams,
  options?: QueryOptions<ValidateSearchQueryResult>
): UseQueryResult<ValidateSearchQueryResult, ApiError> => {
  return useQuery({
    queryKey: productsValidationQueryKeys.searchQuery(query),
    queryFn: () => productsValidationApi.validateSearchQuery(query),
    enabled: Boolean(query?.query) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Sanitize product payload using backend rules.
 */
export const useSanitizeProductPayload = (
  options?: MutationConfig<SanitizeProductPayloadResult, ValidateUpdateProductInput>
): UseMutationResult<SanitizeProductPayloadResult, ApiError, ValidateUpdateProductInput, unknown> => {
  return useMutation({
    mutationKey: productsValidationMutationKeys.sanitize,
    mutationFn: (payload) => productsValidationApi.sanitizeProductPayload(payload),
    ...options
  });
};

/**
 * Main hook that provides access to all product validation operations.
 */
export interface UseProductsValidationOptions {
  queries?: {
    priceRange?: QueryOptions<ValidatePriceRangeResult>;
    searchQuery?: QueryOptions<ValidateSearchQueryResult>;
  };
  mutations?: {
    validateCreate?: MutationConfig<ValidateCreateProductResult, ValidateCreateProductInput>;
    validateUpdate?: MutationConfig<ValidateUpdateProductResult, ValidateUpdateProductInput>;
    validateBulk?: MutationConfig<ValidateBulkResult, ValidateBulkInput>;
    sanitize?: MutationConfig<SanitizeProductPayloadResult, ValidateUpdateProductInput>;
  };
}

export interface UseProductsValidationResult {
  // Queries
  priceRange: (query?: ValidatePriceRangeQuery) => UseQueryResult<ValidatePriceRangeResult, ApiError>;
  searchQuery: (query?: ValidateSearchQueryParams) => UseQueryResult<ValidateSearchQueryResult, ApiError>;

  // Mutations
  validateCreate: UseMutationResult<ValidateCreateProductResult, ApiError, ValidateCreateProductInput, unknown>;
  validateUpdate: UseMutationResult<ValidateUpdateProductResult, ApiError, ValidateUpdateProductInput, unknown>;
  validateBulk: UseMutationResult<ValidateBulkResult, ApiError, ValidateBulkInput, unknown>;
  sanitize: UseMutationResult<SanitizeProductPayloadResult, ApiError, ValidateUpdateProductInput, unknown>;
}

export const useProductsValidation = (
  options: UseProductsValidationOptions = {}
): UseProductsValidationResult => {
  const validateCreate = useValidateCreateProduct(options.mutations?.validateCreate);
  const validateUpdate = useValidateUpdateProduct(options.mutations?.validateUpdate);
  const validateBulk = useValidateBulkOperation(options.mutations?.validateBulk);
  const sanitize = useSanitizeProductPayload(options.mutations?.sanitize);

  return {
    priceRange: (query?: ValidatePriceRangeQuery) =>
      useValidatePriceRange(query, options.queries?.priceRange),
    searchQuery: (query?: ValidateSearchQueryParams) =>
      useValidateSearchQuery(query, options.queries?.searchQuery),
    validateCreate,
    validateUpdate,
    validateBulk,
    sanitize
  };
};
