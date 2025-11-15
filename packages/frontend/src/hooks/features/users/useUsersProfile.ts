'use client';

// src/hooks/features/users/useUsersProfile.ts

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

import usersProfileApi, {
  type DeleteUserResponse,
  type UpdateUserProfilePayload,
  type UpdateUserProfileResponse
} from '@/lib/api/features/users/usersProfile.api';
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

const usersProfileQueryKeysRoot = ['users', 'profile'] as const;

export const usersProfileQueryKeys = {
  root: usersProfileQueryKeysRoot,
  current: [...usersProfileQueryKeysRoot, 'me'] as const,
  byId: (userId: string) => [...usersProfileQueryKeysRoot, userId] as const
};

export const usersProfileMutationKeys = {
  updateCurrent: [...usersProfileQueryKeysRoot, 'me', 'update'] as const,
  update: (userId: string) => [...usersProfileQueryKeysRoot, userId, 'update'] as const,
  delete: (userId: string) => [...usersProfileQueryKeysRoot, userId, 'delete'] as const
};

/**
 * Retrieve profile of the authenticated user.
 */
export const useCurrentUserProfile = (
  options?: QueryOptions<UserProfile>
): UseQueryResult<UserProfile, ApiError> => {
  return useQuery({
    queryKey: usersProfileQueryKeys.current,
    queryFn: () => usersProfileApi.getCurrentUserProfile(),
    ...options
  });
};

/**
 * Retrieve a user profile by identifier.
 */
export const useUserProfile = (
  userId: string,
  options?: QueryOptions<UserProfile>
): UseQueryResult<UserProfile, ApiError> => {
  return useQuery({
    queryKey: usersProfileQueryKeys.byId(userId),
    queryFn: () => usersProfileApi.getUserProfile(userId),
    enabled: Boolean(userId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Update profile for the authenticated user.
 */
export const useUpdateCurrentUserProfile = (
  options?: MutationConfig<UpdateUserProfileResponse, UpdateUserProfilePayload>
): UseMutationResult<UpdateUserProfileResponse, ApiError, UpdateUserProfilePayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: usersProfileMutationKeys.updateCurrent,
    mutationFn: (payload) => usersProfileApi.updateCurrentUserProfile(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersProfileQueryKeys.current });
      void queryClient.invalidateQueries({ queryKey: usersProfileQueryKeys.root });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options
  });
};

/**
 * Update profile for a specific user.
 */
export const useUpdateUserProfile = (
  userId: string,
  options?: MutationConfig<UpdateUserProfileResponse, UpdateUserProfilePayload>
): UseMutationResult<UpdateUserProfileResponse, ApiError, UpdateUserProfilePayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: usersProfileMutationKeys.update(userId),
    mutationFn: (payload) => usersProfileApi.updateUserProfile(userId, payload),
    onSuccess: (_, variables, context) => {
      void queryClient.invalidateQueries({ queryKey: usersProfileQueryKeys.byId(userId) });
      void queryClient.invalidateQueries({ queryKey: usersProfileQueryKeys.root });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options
  });
};

/**
 * Delete a user account.
 */
export const useDeleteUser = (
  userId: string,
  options?: MutationConfig<DeleteUserResponse, void>
): UseMutationResult<DeleteUserResponse, ApiError, void, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: usersProfileMutationKeys.delete(userId),
    mutationFn: () => usersProfileApi.deleteUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersProfileQueryKeys.byId(userId) });
      void queryClient.invalidateQueries({ queryKey: usersProfileQueryKeys.root });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all user profile operations.
 */
export interface UseUsersProfileOptions {
  queries?: {
    current?: QueryOptions<UserProfile>;
    byId?: QueryOptions<UserProfile>;
  };
  mutations?: {
    updateCurrent?: MutationConfig<UpdateUserProfileResponse, UpdateUserProfilePayload>;
    update?: MutationConfig<UpdateUserProfileResponse, UpdateUserProfilePayload>;
    delete?: MutationConfig<DeleteUserResponse, void>;
  };
}

export interface UseUsersProfileResult {
  // Queries
  current: () => UseQueryResult<UserProfile, ApiError>;
  byId: (userId: string) => UseQueryResult<UserProfile, ApiError>;

  // Mutations
  updateCurrent: UseMutationResult<
    UpdateUserProfileResponse,
    ApiError,
    UpdateUserProfilePayload,
    unknown
  >;
  update: (
    userId: string
  ) => UseMutationResult<UpdateUserProfileResponse, ApiError, UpdateUserProfilePayload, unknown>;
  delete: (userId: string) => UseMutationResult<DeleteUserResponse, ApiError, void, unknown>;
}

export const useUsersProfile = (options: UseUsersProfileOptions = {}): UseUsersProfileResult => {
  const updateCurrent = useUpdateCurrentUserProfile(options.mutations?.updateCurrent);

  return {
    current: () => useCurrentUserProfile(options.queries?.current),
    byId: (userId: string) => useUserProfile(userId, options.queries?.byId),
    updateCurrent,
    update: (userId: string) => useUpdateUserProfile(userId, options.mutations?.update),
    delete: (userId: string) => useDeleteUser(userId, options.mutations?.delete)
  };
};
