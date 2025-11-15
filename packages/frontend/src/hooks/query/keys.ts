// src/hooks/query/keys.ts
// Shared utilities for React Query key generation

/**
 * Normalizes an optional object for use in query keys.
 * Returns null if the value is not an object or is empty.
 * This ensures consistent key generation and prevents unnecessary cache entries.
 *
 * @param value - The value to normalize
 * @returns The normalized object or null
 *
 * @example
 * ```ts
 * const key = ['products', 'list', normalizeObject(filters)];
 * // If filters is undefined: ['products', 'list', null]
 * // If filters is { page: 1 }: ['products', 'list', { page: 1 }]
 * ```
 */
export const normalizeObject = <T>(value?: T): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return Object.keys(value).length ? (value as Record<string, unknown>) : null;
};

/**
 * Creates a root query key array for a feature.
 *
 * @param segments - The segments that make up the root key
 * @returns A readonly array representing the root key
 *
 * @example
 * ```ts
 * const root = createRootKey('products', 'data');
 * // ['products', 'data']
 * ```
 */
export const createRootKey = (...segments: readonly string[]): readonly string[] => {
  return segments;
};

/**
 * Creates a query key by appending segments to a root key.
 *
 * @param root - The root key array
 * @param segments - Additional segments to append
 * @returns A readonly array representing the full query key
 *
 * @example
 * ```ts
 * const root = ['products', 'data'];
 * const key = createQueryKey(root, 'item', productId);
 * // ['products', 'data', 'item', 'product-123']
 * ```
 */
export const createQueryKey = (
  root: readonly string[],
  ...segments: readonly unknown[]
): readonly unknown[] => {
  return [...root, ...segments];
};

/**
 * Creates a query key with normalized optional parameters.
 *
 * @param root - The root key array
 * @param segments - Additional segments to append (will be normalized if objects)
 * @returns A readonly array representing the full query key
 *
 * @example
 * ```ts
 * const root = ['products', 'data'];
 * const key = createQueryKeyWithParams(root, 'list', { page: 1, limit: 10 });
 * // ['products', 'data', 'list', { page: 1, limit: 10 }]
 * ```
 */
export const createQueryKeyWithParams = (
  root: readonly string[],
  ...segments: readonly unknown[]
): readonly unknown[] => {
  return [
    ...root,
    ...segments.map((segment) => {
      if (segment && typeof segment === 'object' && !Array.isArray(segment)) {
        return normalizeObject(segment);
      }
      return segment;
    })
  ];
};

/**
 * Type helper for query key arrays.
 * Ensures query keys are properly typed as readonly arrays.
 */
export type QueryKey = readonly unknown[];

/**
 * Type helper for creating query key factories.
 * Used to type query key objects that have a root and various key generators.
 */
export interface QueryKeyFactory {
  root: readonly string[];
  [key: string]: ((...args: unknown[]) => QueryKey) | QueryKey | readonly string[];
}

