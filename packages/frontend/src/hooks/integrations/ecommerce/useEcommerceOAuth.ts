'use client';

// src/hooks/integrations/ecommerce/useEcommerceOAuth.ts

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

import ecommerceOAuthApi, {
  type BuildAuthorizationUrlPayload,
  type BuildAuthorizationUrlResponse,
  type GenerateStateTokenParams,
  type GenerateStateTokenPayload,
  type GenerateStateTokenResponse,
  type InvalidateStateTokenResponse,
  type ValidateStateTokenParams,
  type ValidateStateTokenResponse
} from '@/lib/api/integrations/ecommerce/ecommerceOAuth.api';
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

const ecommerceOAuthQueryKeysRoot = ['integrations', 'ecommerce', 'oauth'] as const;

export const ecommerceOAuthQueryKeys = {
  root: ecommerceOAuthQueryKeysRoot,
  validate: (params: ValidateStateTokenParams) =>
    [...ecommerceOAuthQueryKeysRoot, 'validate', params.provider, normalizeObject(params)] as const
};

export const ecommerceOAuthMutationKeys = {
  generateState: (params: GenerateStateTokenParams) =>
    [...ecommerceOAuthQueryKeysRoot, 'generate-state', params.provider, params.businessId] as const,
  invalidateState: [...ecommerceOAuthQueryKeysRoot, 'invalidate-state'] as const,
  buildAuthorizeUrl: (provider: string) =>
    [...ecommerceOAuthQueryKeysRoot, 'build-authorize-url', provider] as const
};

/**
 * Generate an OAuth state token for a provider.
 */
export const useGenerateStateToken = (
  params: GenerateStateTokenParams,
  options?: MutationConfig<GenerateStateTokenResponse, GenerateStateTokenPayload>
): UseMutationResult<GenerateStateTokenResponse, ApiError, GenerateStateTokenPayload, unknown> => {
  return useMutation({
    mutationKey: ecommerceOAuthMutationKeys.generateState(params),
    mutationFn: (payload) => ecommerceOAuthApi.generateStateToken(params, payload),
    ...options
  });
};

/**
 * Validate an OAuth state token.
 */
export const useValidateStateToken = (
  params: ValidateStateTokenParams,
  options?: QueryOptions<ValidateStateTokenResponse>
): UseQueryResult<ValidateStateTokenResponse, ApiError> => {
  return useQuery({
    queryKey: ecommerceOAuthQueryKeys.validate(params),
    queryFn: () => ecommerceOAuthApi.validateStateToken(params),
    enabled: Boolean(params.provider && params.state) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Invalidate an OAuth state token.
 */
export const useInvalidateStateToken = (
  options?: MutationConfig<InvalidateStateTokenResponse, string>
): UseMutationResult<InvalidateStateTokenResponse, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: ecommerceOAuthMutationKeys.invalidateState,
    mutationFn: (state) => ecommerceOAuthApi.invalidateStateToken(state),
    ...options
  });
};

/**
 * Build a provider-specific authorization URL.
 */
export const useBuildAuthorizationUrl = (
  provider: string,
  options?: MutationConfig<BuildAuthorizationUrlResponse, BuildAuthorizationUrlPayload>
): UseMutationResult<BuildAuthorizationUrlResponse, ApiError, BuildAuthorizationUrlPayload, unknown> => {
  return useMutation({
    mutationKey: ecommerceOAuthMutationKeys.buildAuthorizeUrl(provider),
    mutationFn: (payload) => ecommerceOAuthApi.buildAuthorizationUrl(provider, payload),
    ...options
  });
};

/**
 * Main hook that provides access to all ecommerce OAuth operations.
 */
export interface UseEcommerceOAuthOptions {
  queries?: {
    validate?: QueryOptions<ValidateStateTokenResponse>;
  };
  mutations?: {
    generateState?: MutationConfig<GenerateStateTokenResponse, GenerateStateTokenPayload>;
    invalidateState?: MutationConfig<InvalidateStateTokenResponse, string>;
    buildAuthorizeUrl?: MutationConfig<BuildAuthorizationUrlResponse, BuildAuthorizationUrlPayload>;
  };
}

export interface UseEcommerceOAuthResult {
  // Queries
  validate: (params: ValidateStateTokenParams) => UseQueryResult<ValidateStateTokenResponse, ApiError>;

  // Mutations
  generateState: (
    params: GenerateStateTokenParams
  ) => UseMutationResult<GenerateStateTokenResponse, ApiError, GenerateStateTokenPayload, unknown>;
  invalidateState: UseMutationResult<InvalidateStateTokenResponse, ApiError, string, unknown>;
  buildAuthorizeUrl: (
    provider: string
  ) => UseMutationResult<BuildAuthorizationUrlResponse, ApiError, BuildAuthorizationUrlPayload, unknown>;
}

export const useEcommerceOAuth = (
  options: UseEcommerceOAuthOptions = {}
): UseEcommerceOAuthResult => {
  return {
    validate: (params: ValidateStateTokenParams) =>
      useValidateStateToken(params, options.queries?.validate),
    generateState: (params: GenerateStateTokenParams) =>
      useGenerateStateToken(params, options.mutations?.generateState),
    invalidateState: useInvalidateStateToken(options.mutations?.invalidateState),
    buildAuthorizeUrl: (provider: string) =>
      useBuildAuthorizationUrl(provider, options.mutations?.buildAuthorizeUrl)
  };
};
