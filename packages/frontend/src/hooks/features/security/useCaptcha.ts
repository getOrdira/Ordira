'use client';

// src/hooks/features/security/useCaptcha.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import captchaApi, { type CaptchaVerifyPayload } from '@/lib/api/features/security/captcha.api';
import type { CaptchaStatus, CaptchaVerificationResponse } from '@/lib/types/features/security';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const captchaQueryKeys = {
  root: ['security', 'captcha'] as const,
  status: () => [...captchaQueryKeys.root, 'status'] as const
};

export const captchaMutationKeys = {
  verify: [...captchaQueryKeys.root, 'verify'] as const
};

/**
 * Retrieve captcha configuration status for the current environment.
 */
export const useCaptchaStatus = (
  options?: QueryOptions<CaptchaStatus>
): UseQueryResult<CaptchaStatus, ApiError> => {
  return useQuery({
    queryKey: captchaQueryKeys.status(),
    queryFn: () => captchaApi.getCaptchaStatus(),
    ...options
  });
};

/**
 * Verify a captcha token against the backend validation service.
 */
export const useVerifyCaptcha = (
  options?: MutationConfig<CaptchaVerificationResponse, CaptchaVerifyPayload>
): UseMutationResult<CaptchaVerificationResponse, ApiError, CaptchaVerifyPayload, unknown> => {
  return useMutation({
    mutationKey: captchaMutationKeys.verify,
    mutationFn: (payload) => captchaApi.verifyCaptcha(payload),
    ...options
  });
};

/**
 * Main hook that provides access to all captcha operations.
 */
export interface UseCaptchaOptions {
  queries?: {
    status?: QueryOptions<CaptchaStatus>;
  };
  mutations?: {
    verify?: MutationConfig<CaptchaVerificationResponse, CaptchaVerifyPayload>;
  };
}

export interface UseCaptchaResult {
  // Queries
  status: UseQueryResult<CaptchaStatus, ApiError>;

  // Mutations
  verify: UseMutationResult<CaptchaVerificationResponse, ApiError, CaptchaVerifyPayload, unknown>;
}

export const useCaptcha = (options: UseCaptchaOptions = {}): UseCaptchaResult => {
  const verify = useVerifyCaptcha(options.mutations?.verify);

  return {
    status: useCaptchaStatus(options.queries?.status),
    verify
  };
};
