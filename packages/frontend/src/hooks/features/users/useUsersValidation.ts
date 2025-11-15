'use client';

// src/hooks/features/users/useUsersValidation.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import usersValidationApi, {
  type ValidateRegistrationPayload,
  type ValidateRegistrationResponse
} from '@/lib/api/features/users/usersValidation.api';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const usersValidationMutationKeys = {
  validateRegistration: ['users', 'validation', 'registration'] as const
};

/**
 * Validate registration payload.
 */
export const useValidateRegistration = (
  options?: MutationConfig<ValidateRegistrationResponse, ValidateRegistrationPayload>
): UseMutationResult<ValidateRegistrationResponse, ApiError, ValidateRegistrationPayload, unknown> => {
  return useMutation({
    mutationKey: usersValidationMutationKeys.validateRegistration,
    mutationFn: (payload) => usersValidationApi.validateRegistration(payload),
    ...options
  });
};

/**
 * Main hook that provides access to all user validation operations.
 */
export interface UseUsersValidationOptions {
  mutations?: {
    validateRegistration?: MutationConfig<
      ValidateRegistrationResponse,
      ValidateRegistrationPayload
    >;
  };
}

export interface UseUsersValidationResult {
  // Mutations
  validateRegistration: UseMutationResult<
    ValidateRegistrationResponse,
    ApiError,
    ValidateRegistrationPayload,
    unknown
  >;
}

export const useUsersValidation = (
  options: UseUsersValidationOptions = {}
): UseUsersValidationResult => {
  const validateRegistration = useValidateRegistration(options.mutations?.validateRegistration);

  return {
    validateRegistration
  };
};
