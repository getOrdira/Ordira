'use client';

// src/hooks/features/users/useUsersSearch.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import usersSearchApi, {
  type UserSearchQuery,
  type UserSearchResult
} from '@/lib/api/features/users/usersSearch.api';
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

export const usersSearchQueryKeys = {
  root: ['users', 'search'] as const,
  search: (query?: UserSearchQuery) =>
    [...usersSearchQueryKeys.root, 'search', normalizeObject(query)] as const
};

/**
 * Search users with optional filters.
 */
export const useSearchUsers = (
  query?: UserSearchQuery,
  options?: QueryOptions<UserSearchResult>
): UseQueryResult<UserSearchResult, ApiError> => {
  return useQuery({
    queryKey: usersSearchQueryKeys.search(query),
    queryFn: () => usersSearchApi.searchUsers(query),
    ...options
  });
};

/**
 * Main hook that provides access to all user search operations.
 */
export interface UseUsersSearchOptions {
  queries?: {
    search?: QueryOptions<UserSearchResult>;
  };
}

export interface UseUsersSearchResult {
  // Queries
  search: (query?: UserSearchQuery) => UseQueryResult<UserSearchResult, ApiError>;
}

export const useUsersSearch = (options: UseUsersSearchOptions = {}): UseUsersSearchResult => {
  return {
    search: (query?: UserSearchQuery) => useSearchUsers(query, options.queries?.search)
  };
};
