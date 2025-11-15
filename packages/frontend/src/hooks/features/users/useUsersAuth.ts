'use client';

// src/hooks/features/users/useUsersAuth.ts

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import usersAuthApi, {
  type LoginUserPayload,
  type LoginUserResponse,
  type RegisterUserPayload,
  type RegisterUserResponse,
  type VerifyUserEmailPayload,
  type VerifyUserEmailResponse
} from '@/lib/api/features/users/usersAuth.api';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const usersAuthMutationKeys = {
  register: ['users', 'auth', 'register'] as const,
  login: ['users', 'auth', 'login'] as const,
  verifyEmail: ['users', 'auth', 'verify-email'] as const
};

/**
 * Register a new user.
 */
export const useRegisterUser = (
  options?: MutationConfig<RegisterUserResponse, RegisterUserPayload>
): UseMutationResult<RegisterUserResponse, ApiError, RegisterUserPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: usersAuthMutationKeys.register,
    mutationFn: (payload) => usersAuthApi.registerUser(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options
  });
};

/**
 * Authenticate an existing user.
 */
export const useLoginUser = (
  options?: MutationConfig<LoginUserResponse, LoginUserPayload>
): UseMutationResult<LoginUserResponse, ApiError, LoginUserPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: usersAuthMutationKeys.login,
    mutationFn: (payload) => usersAuthApi.loginUser(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options
  });
};

/**
 * Verify user email.
 */
export const useVerifyUserEmail = (
  options?: MutationConfig<VerifyUserEmailResponse, VerifyUserEmailPayload | undefined>
): UseMutationResult<VerifyUserEmailResponse, ApiError, VerifyUserEmailPayload | undefined, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: usersAuthMutationKeys.verifyEmail,
    mutationFn: (payload) => usersAuthApi.verifyUserEmail(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all user authentication operations.
 */
export interface UseUsersAuthOptions {
  mutations?: {
    register?: MutationConfig<RegisterUserResponse, RegisterUserPayload>;
    login?: MutationConfig<LoginUserResponse, LoginUserPayload>;
    verifyEmail?: MutationConfig<VerifyUserEmailResponse, VerifyUserEmailPayload | undefined>;
  };
}

export interface UseUsersAuthResult {
  // Mutations
  register: UseMutationResult<RegisterUserResponse, ApiError, RegisterUserPayload, unknown>;
  login: UseMutationResult<LoginUserResponse, ApiError, LoginUserPayload, unknown>;
  verifyEmail: UseMutationResult<
    VerifyUserEmailResponse,
    ApiError,
    VerifyUserEmailPayload | undefined,
    unknown
  >;
}

export const useUsersAuth = (options: UseUsersAuthOptions = {}): UseUsersAuthResult => {
  const register = useRegisterUser(options.mutations?.register);
  const login = useLoginUser(options.mutations?.login);
  const verifyEmail = useVerifyUserEmail(options.mutations?.verifyEmail);

  return {
    register,
    login,
    verifyEmail
  };
};
