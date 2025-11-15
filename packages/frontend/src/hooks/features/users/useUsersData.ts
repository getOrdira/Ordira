'use client';

// src/hooks/features/users/useUsersData.ts

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

import usersDataApi, {
  type BatchGetUsersPayload,
  type BatchGetUsersResponse,
  type UserDocumentOptions
} from '@/lib/api/features/users/usersData.api';
import type { UserProfile } from '@/lib/types/features/users';
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

export const usersDataQueryKeys = {
  root: ['users', 'data'] as const,
  document: (userId: string, options?: UserDocumentOptions) =>
    [...usersDataQueryKeys.root, 'document', userId, normalizeObject(options)] as const,
  profile: (userId: string, options?: UserDocumentOptions) =>
    [...usersDataQueryKeys.root, 'profile', userId, normalizeObject(options)] as const,
  byEmail: (email: string, options?: { skipCache?: boolean }) =>
    [...usersDataQueryKeys.root, 'email', email, normalizeObject(options)] as const
};

export const usersDataMutationKeys = {
  batch: [...usersDataQueryKeys.root, 'batch'] as const
};

/**
 * Retrieve a user document formatted as a profile.
 */
export const useUserDocument = (
  userId: string,
  options?: UserDocumentOptions,
  queryOptions?: QueryOptions<UserProfile>
): UseQueryResult<UserProfile, ApiError> => {
  return useQuery({
    queryKey: usersDataQueryKeys.document(userId, options),
    queryFn: () => usersDataApi.getUserDocument(userId, options),
    enabled: Boolean(userId) && (queryOptions?.enabled ?? true),
    ...queryOptions
  });
};

/**
 * Retrieve a user profile by identifier.
 */
export const useUserProfileById = (
  userId: string,
  options?: UserDocumentOptions,
  queryOptions?: QueryOptions<UserProfile>
): UseQueryResult<UserProfile, ApiError> => {
  return useQuery({
    queryKey: usersDataQueryKeys.profile(userId, options),
    queryFn: () => usersDataApi.getUserProfileById(userId, options),
    enabled: Boolean(userId) && (queryOptions?.enabled ?? true),
    ...queryOptions
  });
};

/**
 * Retrieve a user by email address.
 */
export const useUserByEmail = (
  email: string,
  options?: { skipCache?: boolean },
  queryOptions?: QueryOptions<UserProfile>
): UseQueryResult<UserProfile, ApiError> => {
  return useQuery({
    queryKey: usersDataQueryKeys.byEmail(email, options),
    queryFn: () => usersDataApi.getUserByEmail(email, options),
    enabled: Boolean(email) && (queryOptions?.enabled ?? true),
    ...queryOptions
  });
};

/**
 * Retrieve multiple users by identifiers.
 */
export const useBatchGetUsers = (
  options?: MutationConfig<BatchGetUsersResponse, BatchGetUsersPayload>
): UseMutationResult<BatchGetUsersResponse, ApiError, BatchGetUsersPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: usersDataMutationKeys.batch,
    mutationFn: (payload) => usersDataApi.batchGetUsers(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersDataQueryKeys.root });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all user data operations.
 */
export interface UseUsersDataOptions {
  queries?: {
    document?: QueryOptions<UserProfile>;
    profile?: QueryOptions<UserProfile>;
    byEmail?: QueryOptions<UserProfile>;
  };
  mutations?: {
    batch?: MutationConfig<BatchGetUsersResponse, BatchGetUsersPayload>;
  };
}

export interface UseUsersDataResult {
  // Queries
  document: (
    userId: string,
    options?: UserDocumentOptions
  ) => UseQueryResult<UserProfile, ApiError>;
  profile: (
    userId: string,
    options?: UserDocumentOptions
  ) => UseQueryResult<UserProfile, ApiError>;
  byEmail: (
    email: string,
    options?: { skipCache?: boolean }
  ) => UseQueryResult<UserProfile, ApiError>;

  // Mutations
  batch: UseMutationResult<BatchGetUsersResponse, ApiError, BatchGetUsersPayload, unknown>;
}

export const useUsersData = (options: UseUsersDataOptions = {}): UseUsersDataResult => {
  const batch = useBatchGetUsers(options.mutations?.batch);

  return {
    document: (userId: string, documentOptions?: UserDocumentOptions) =>
      useUserDocument(userId, documentOptions, options.queries?.document),
    profile: (userId: string, profileOptions?: UserDocumentOptions) =>
      useUserProfileById(userId, profileOptions, options.queries?.profile),
    byEmail: (email: string, emailOptions?: { skipCache?: boolean }) =>
      useUserByEmail(email, emailOptions, options.queries?.byEmail),
    batch
  };
};
