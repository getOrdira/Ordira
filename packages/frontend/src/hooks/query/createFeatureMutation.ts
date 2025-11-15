// src/hooks/query/createFeatureMutation.ts
// Factory function for creating React Query mutation hooks with consistent patterns

import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';
import { ApiError } from '@/lib/errors/errors';

/**
 * Type definition for mutation options that omits mutationFn.
 * This allows consumers to pass all other UseMutationOptions while ensuring
 * mutationFn is provided by the factory.
 */
export type FeatureMutationOptions<TData, TVariables, TContext = unknown> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, TContext>,
  'mutationFn'
>;

/**
 * Configuration for query invalidation after a successful mutation.
 */
export interface InvalidationConfig {
  /**
   * Query keys to invalidate after successful mutation.
   * Can be a single key, array of keys, or a function that receives mutation variables.
   */
  queryKeys: QueryKey | QueryKey[] | ((variables: unknown) => QueryKey | QueryKey[]);

  /**
   * Whether to invalidate exact matches only.
   * @default false
   */
  exact?: boolean;
}

/**
 * Configuration for creating a feature mutation hook.
 */
export interface CreateFeatureMutationConfig<TData, TVariables, TContext = unknown> {
  /**
   * The mutation key for this mutation.
   */
  mutationKey: QueryKey;

  /**
   * The function to execute the mutation.
   */
  mutationFn: (variables: TVariables) => Promise<TData>;

  /**
   * Optional configuration for query invalidation after successful mutation.
   */
  invalidateQueries?: InvalidationConfig;

  /**
   * Default mutation options to apply to all mutations created with this config.
   */
  defaultOptions?: FeatureMutationOptions<TData, TVariables, TContext>;
}

/**
 * Creates a React Query mutation hook with consistent patterns for a feature mutation.
 *
 * @param config - Configuration for the mutation hook
 * @returns A function that can be used as a React hook
 *
 * @example
 * ```ts
 * const useCreateProduct = createFeatureMutation({
 *   mutationKey: productsMutationKeys.create,
 *   mutationFn: (payload) => productsApi.createProduct(payload),
 *   invalidateQueries: {
 *     queryKeys: productsQueryKeys.root
 *   }
 * });
 *
 * // Usage:
 * const { mutate, isLoading } = useCreateProduct();
 * mutate({ name: 'Product', price: 100 });
 * ```
 */
export function createFeatureMutation<TData, TVariables, TContext = unknown>(
  config: CreateFeatureMutationConfig<TData, TVariables, TContext>
) {
  return (
    options?: FeatureMutationOptions<TData, TVariables, TContext>
  ): UseMutationResult<TData, ApiError, TVariables, TContext> => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationKey: config.mutationKey,
      mutationFn: config.mutationFn,
      onSuccess: (data, variables, context) => {
        // Handle query invalidation
        if (config.invalidateQueries) {
          const { queryKeys, exact = false } = config.invalidateQueries;
          const keysToInvalidate =
            typeof queryKeys === 'function' ? queryKeys(variables) : queryKeys;
          const keysArray = Array.isArray(keysToInvalidate) ? keysToInvalidate : [keysToInvalidate];

          keysArray.forEach((key) => {
            void queryClient.invalidateQueries({ queryKey: key, exact });
          });
        }

        // Call custom onSuccess if provided
        options?.onSuccess?.(data, variables, context);
      },
      ...config.defaultOptions,
      ...options
    });
  };
}

/**
 * Creates a React Query mutation hook with dynamic mutation key generation.
 * Useful when the mutation key depends on the variables.
 *
 * @param config - Configuration with a function to generate mutation keys
 * @returns A function that can be used as a React hook
 *
 * @example
 * ```ts
 * const useUpdateProduct = createDynamicFeatureMutation({
 *   getMutationKey: (productId) => productsMutationKeys.update(productId),
 *   mutationFn: ({ productId, payload }) => productsApi.updateProduct(productId, payload),
 *   invalidateQueries: {
 *     queryKeys: (variables) => [
 *       productsQueryKeys.item(variables.productId),
 *       productsQueryKeys.root
 *     ]
 *   }
 * });
 *
 * // Usage:
 * const { mutate } = useUpdateProduct();
 * mutate({ productId: 'product-123', payload: { name: 'Updated' } });
 * ```
 */
export function createDynamicFeatureMutation<TData, TVariables, TContext = unknown>(
  config: Omit<CreateFeatureMutationConfig<TData, TVariables, TContext>, 'mutationKey'> & {
    getMutationKey: (variables: TVariables) => QueryKey;
  }
) {
  return (
    options?: FeatureMutationOptions<TData, TVariables, TContext>
  ): UseMutationResult<TData, ApiError, TVariables, TContext> => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationKey: config.getMutationKey({} as TVariables), // Placeholder, actual key set in mutationFn
      mutationFn: (variables: TVariables) => {
        // Note: React Query doesn't support dynamic mutation keys directly,
        // so we use a placeholder key. The actual key is used for invalidation.
        return config.mutationFn(variables);
      },
      onSuccess: (data, variables, context) => {
        // Handle query invalidation
        if (config.invalidateQueries) {
          const { queryKeys, exact = false } = config.invalidateQueries;
          const keysToInvalidate =
            typeof queryKeys === 'function' ? queryKeys(variables) : queryKeys;
          const keysArray = Array.isArray(keysToInvalidate) ? keysToInvalidate : [keysToInvalidate];

          keysArray.forEach((key) => {
            void queryClient.invalidateQueries({ queryKey: key, exact });
          });
        }

        // Call custom onSuccess if provided
        options?.onSuccess?.(data, variables, context);
      },
      ...config.defaultOptions,
      ...options
    });
  };
}

