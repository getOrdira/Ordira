'use client';

// src/hooks/features/security/useSecurityTokens.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import securityTokensApi, {
  type BlacklistTokenPayload,
  type TokenQueryPayload
} from '@/lib/api/features/security/securityTokens.api';
import type {
  TokenBlacklistResponse,
  TokenBlacklistStatusResponse
} from '@/lib/types/features/security';
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

export const securityTokensQueryKeys = {
  root: ['security', 'tokens'] as const,
  isBlacklisted: (payload: TokenQueryPayload) =>
    [...securityTokensQueryKeys.root, 'is-blacklisted', normalizeObject(payload)] as const
};

export const securityTokensMutationKeys = {
  blacklist: [...securityTokensQueryKeys.root, 'blacklist'] as const
};

/**
 * Blacklist a token.
 */
export const useBlacklistToken = (
  options?: MutationConfig<TokenBlacklistResponse, BlacklistTokenPayload>
): UseMutationResult<TokenBlacklistResponse, ApiError, BlacklistTokenPayload, unknown> => {
  return useMutation({
    mutationKey: securityTokensMutationKeys.blacklist,
    mutationFn: (payload) => securityTokensApi.blacklistToken(payload),
    ...options
  });
};

/**
 * Determine whether a token is blacklisted.
 */
export const useIsTokenBlacklisted = (
  payload: TokenQueryPayload,
  options?: QueryOptions<TokenBlacklistStatusResponse>
): UseQueryResult<TokenBlacklistStatusResponse, ApiError> => {
  return useQuery({
    queryKey: securityTokensQueryKeys.isBlacklisted(payload),
    queryFn: () => securityTokensApi.isTokenBlacklisted(payload),
    enabled: Boolean(payload.token) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all security tokens operations.
 */
export interface UseSecurityTokensOptions {
  queries?: {
    isBlacklisted?: QueryOptions<TokenBlacklistStatusResponse>;
  };
  mutations?: {
    blacklist?: MutationConfig<TokenBlacklistResponse, BlacklistTokenPayload>;
  };
}

export interface UseSecurityTokensResult {
  // Queries
  isBlacklisted: (
    payload: TokenQueryPayload
  ) => UseQueryResult<TokenBlacklistStatusResponse, ApiError>;

  // Mutations
  blacklist: UseMutationResult<TokenBlacklistResponse, ApiError, BlacklistTokenPayload, unknown>;
}

export const useSecurityTokens = (
  options: UseSecurityTokensOptions = {}
): UseSecurityTokensResult => {
  const blacklist = useBlacklistToken(options.mutations?.blacklist);

  return {
    isBlacklisted: (payload: TokenQueryPayload) =>
      useIsTokenBlacklisted(payload, options.queries?.isBlacklisted),
    blacklist
  };
};
