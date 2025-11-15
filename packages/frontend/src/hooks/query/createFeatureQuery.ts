// src/hooks/query/createFeatureQuery.ts
// Factory function for creating React Query hooks with consistent patterns

import { useQuery, type QueryKey, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '@/lib/errors/errors';

/**
 * Type definition for query options that omits queryKey and queryFn.
 * This allows consumers to pass all other UseQueryOptions while ensuring
 * queryKey and queryFn are provided by the factory.
 */
export type FeatureQueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

/**
 * Configuration for creating a feature query hook.
 */
export interface CreateFeatureQueryConfig<TData, TParams = void> {
  /**
   * The query key for this query.
   */
  queryKey: QueryKey;

  /**
   * The function to fetch the data.
   */
  queryFn: () => Promise<TData>;

  /**
   * Optional function to determine if the query should be enabled.
   * If not provided, the query will always be enabled (unless overridden in options).
   *
   * @param params - The parameters passed to the hook
   * @returns Whether the query should be enabled
   */
  enabled?: (params: TParams) => boolean;

  /**
   * Default query options to apply to all queries created with this config.
   */
  defaultOptions?: FeatureQueryOptions<TData>;
}

/**
 * Creates a React Query hook with consistent patterns for a feature query.
 *
 * @param config - Configuration for the query hook
 * @returns A function that can be used as a React hook
 *
 * @example
 * ```ts
 * const useProduct = createFeatureQuery({
 *   queryKey: productsQueryKeys.item(productId),
 *   queryFn: () => productsApi.getProduct(productId),
 *   enabled: (productId) => Boolean(productId)
 * });
 *
 * // Usage:
 * const { data, isLoading } = useProduct('product-123');
 * ```
 */
export function createFeatureQuery<TData, TParams = void>(
  config: CreateFeatureQueryConfig<TData, TParams>
) {
  return (
    params: TParams,
    options?: FeatureQueryOptions<TData>
  ): UseQueryResult<TData, ApiError> => {
    const enabled = config.enabled
      ? config.enabled(params) && (options?.enabled ?? true)
      : options?.enabled ?? true;

    return useQuery({
      queryKey: config.queryKey,
      queryFn: config.queryFn,
      enabled,
      ...config.defaultOptions,
      ...options
    });
  };
}

/**
 * Creates a React Query hook with a static query key (no parameters).
 *
 * @param config - Configuration for the query hook
 * @returns A function that can be used as a React hook
 *
 * @example
 * ```ts
 * const useNetworkStatus = createStaticFeatureQuery({
 *   queryKey: blockchainQueryKeys.networkStatus,
 *   queryFn: () => blockchainApi.getNetworkStatus()
 * });
 *
 * // Usage:
 * const { data } = useNetworkStatus();
 * ```
 */
export function createStaticFeatureQuery<TData>(
  config: Omit<CreateFeatureQueryConfig<TData, void>, 'enabled' | 'queryKey'> & {
    queryKey: QueryKey;
  }
) {
  return (options?: FeatureQueryOptions<TData>): UseQueryResult<TData, ApiError> => {
    return useQuery({
      queryKey: config.queryKey,
      queryFn: config.queryFn,
      ...config.defaultOptions,
      ...options
    });
  };
}

/**
 * Creates a React Query hook with dynamic query key generation.
 * Useful when the query key depends on the parameters.
 *
 * @param config - Configuration with a function to generate query keys
 * @returns A function that can be used as a React hook
 *
 * @example
 * ```ts
 * const useProduct = createDynamicFeatureQuery({
 *   getQueryKey: (productId) => productsQueryKeys.item(productId),
 *   queryFn: (productId) => productsApi.getProduct(productId),
 *   enabled: (productId) => Boolean(productId)
 * });
 *
 * // Usage:
 * const { data } = useProduct('product-123');
 * ```
 */
export function createDynamicFeatureQuery<TData, TParams = void>(
  config: Omit<CreateFeatureQueryConfig<TData, TParams>, 'queryKey'> & {
    getQueryKey: (params: TParams) => QueryKey;
    queryFn: (params: TParams) => Promise<TData>;
  }
) {
  return (
    params: TParams,
    options?: FeatureQueryOptions<TData>
  ): UseQueryResult<TData, ApiError> => {
    const queryKey = config.getQueryKey(params);
    const enabled = config.enabled
      ? config.enabled(params) && (options?.enabled ?? true)
      : options?.enabled ?? true;

    return useQuery({
      queryKey,
      queryFn: () => config.queryFn(params),
      enabled,
      ...config.defaultOptions,
      ...options
    });
  };
}

