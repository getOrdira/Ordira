'use client';

// src/hooks/features/users/useUsersCache.ts

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import usersCacheApi, {
  type CachedUserQuery,
  type CachedUserResponse,
  type InvalidateUserCachePayload,
  type InvalidateUserCacheResponse
} from '@/lib/api/features/users/usersCache.api';
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

const usersCacheQueryKeysRoot = ['users', 'cache'] as const;

export const usersCacheQueryKeys = {
  root: usersCacheQueryKeysRoot,
  cached: (query: CachedUserQuery) =>
    [...usersCacheQueryKeysRoot, 'cached', normalizeObject(query)] as const,
  config: [...usersCacheQueryKeysRoot, 'config'] as const
};

export const usersCacheMutationKeys = {
  invalidate: [...usersCacheQueryKeysRoot, 'invalidate'] as const
};

/**
 * Retrieve a cached user record.
 */
export const useCachedUser = (
  query: CachedUserQuery,
  options?: QueryOptions<CachedUserResponse>
): UseQueryResult<CachedUserResponse, ApiError> => {
  return useQuery({
    queryKey: usersCacheQueryKeys.cached(query),
    queryFn: () => usersCacheApi.getCachedUser(query),
    enabled: Boolean(query.userId || query.email) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve cache configuration.
 */
export const useCacheConfiguration = (
  options?: QueryOptions<{ ttl: Record<string, unknown> }>
): UseQueryResult<{ ttl: Record<string, unknown> }, ApiError> => {
  return useQuery({
    queryKey: usersCacheQueryKeys.config,
    queryFn: () => usersCacheApi.getCacheConfiguration(),
    ...options
  });
};

/**
 * Invalidate caches for a specific user or globally.
 */
export const useInvalidateUserCaches = (
  options?: MutationConfig<InvalidateUserCacheResponse, InvalidateUserCachePayload | undefined>
): UseMutationResult<
  InvalidateUserCacheResponse,
  ApiError,
  InvalidateUserCachePayload | undefined,
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: usersCacheMutationKeys.invalidate,
    mutationFn: (payload) => usersCacheApi.invalidateUserCaches(payload),
    onSuccess: (_, variables) => {
      if (variables?.userId) {
        void queryClient.invalidateQueries({
          queryKey: usersCacheQueryKeys.cached({ userId: variables.userId })
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: usersCacheQueryKeys.root });
      }
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all user cache operations.
 */
export interface UseUsersCacheOptions {
  queries?: {
    cached?: QueryOptions<CachedUserResponse>;
    config?: QueryOptions<{ ttl: Record<string, unknown> }>;
  };
  mutations?: {
    invalidate?: MutationConfig<
      InvalidateUserCacheResponse,
      InvalidateUserCachePayload | undefined
    >;
  };
}

export interface UseUsersCacheResult {
  // Queries
  cached: (query: CachedUserQuery) => UseQueryResult<CachedUserResponse, ApiError>;
  config: () => UseQueryResult<{ ttl: Record<string, unknown> }, ApiError>;

  // Mutations
  invalidate: UseMutationResult<
    InvalidateUserCacheResponse,
    ApiError,
    InvalidateUserCachePayload | undefined,
    unknown
  >;
}

export const useUsersCache = (options: UseUsersCacheOptions = {}): UseUsersCacheResult => {
  const invalidate = useInvalidateUserCaches(options.mutations?.invalidate);

  return {
    cached: (query: CachedUserQuery) => useCachedUser(query, options.queries?.cached),
    config: () => useCacheConfiguration(options.queries?.config),
    invalidate
  };
};
