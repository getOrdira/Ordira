'use client';

// src/hooks/features/security/useSecuritySessions.ts

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

import securitySessionsApi, {
  type ActiveSessionsQuery,
  type CleanupExpiredSessionsQuery,
  type RecentSessionsQuery,
  type RevokeAllSessionsPayload
} from '@/lib/api/features/security/securitySessions.api';
import type {
  SessionActivityUpdateResponse,
  SessionCleanupResponse,
  SessionCountResponse,
  SessionCreationResponse,
  SessionCreateInput,
  SessionInfo,
  SessionRevokeResponse,
  SessionsRevokeAllResponse
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

export const securitySessionsQueryKeys = {
  root: ['security', 'sessions'] as const,
  active: (query?: ActiveSessionsQuery) =>
    [...securitySessionsQueryKeys.root, 'active', normalizeObject(query)] as const,
  recentCount: (query?: RecentSessionsQuery) =>
    [...securitySessionsQueryKeys.root, 'recent', 'count', normalizeObject(query)] as const
};

export const securitySessionsMutationKeys = {
  create: [...securitySessionsQueryKeys.root, 'create'] as const,
  updateActivity: (sessionId: string) =>
    [...securitySessionsQueryKeys.root, 'update-activity', sessionId] as const,
  revoke: (sessionId: string) => [...securitySessionsQueryKeys.root, 'revoke', sessionId] as const,
  revokeAll: [...securitySessionsQueryKeys.root, 'revoke-all'] as const,
  cleanup: [...securitySessionsQueryKeys.root, 'cleanup'] as const
};

/**
 * Create a new security session.
 */
export const useCreateSession = (
  options?: MutationConfig<SessionCreationResponse, SessionCreateInput>
): UseMutationResult<SessionCreationResponse, ApiError, SessionCreateInput, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: securitySessionsMutationKeys.create,
    mutationFn: (payload) => securitySessionsApi.createSession(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securitySessionsQueryKeys.root });
    },
    ...options
  });
};

/**
 * Update the activity timestamp for a session.
 */
export const useUpdateSessionActivity = (
  options?: MutationConfig<SessionActivityUpdateResponse, string>
): UseMutationResult<SessionActivityUpdateResponse, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: securitySessionsMutationKeys.updateActivity(''),
    mutationFn: (sessionId) => securitySessionsApi.updateSessionActivity(sessionId),
    ...options
  });
};

/**
 * Revoke a specific session.
 */
export const useRevokeSession = (
  options?: MutationConfig<SessionRevokeResponse, string>
): UseMutationResult<SessionRevokeResponse, ApiError, string, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: securitySessionsMutationKeys.revoke(''),
    mutationFn: (sessionId) => securitySessionsApi.revokeSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securitySessionsQueryKeys.root });
    },
    ...options
  });
};

/**
 * Revoke all sessions for a user.
 */
export const useRevokeAllSessions = (
  options?: MutationConfig<SessionsRevokeAllResponse, RevokeAllSessionsPayload>
): UseMutationResult<SessionsRevokeAllResponse, ApiError, RevokeAllSessionsPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: securitySessionsMutationKeys.revokeAll,
    mutationFn: (payload) => securitySessionsApi.revokeAllSessions(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securitySessionsQueryKeys.root });
    },
    ...options
  });
};

/**
 * Cleanup expired sessions.
 */
export const useCleanupExpiredSessions = (
  options?: MutationConfig<SessionCleanupResponse, CleanupExpiredSessionsQuery | undefined>
): UseMutationResult<SessionCleanupResponse, ApiError, CleanupExpiredSessionsQuery | undefined, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: securitySessionsMutationKeys.cleanup,
    mutationFn: (query) => securitySessionsApi.cleanupExpiredSessions(query),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: securitySessionsQueryKeys.root });
    },
    ...options
  });
};

/**
 * Retrieve active sessions for a user.
 */
export const useActiveSessions = (
  query?: ActiveSessionsQuery,
  options?: QueryOptions<{ userId: string; sessions: SessionInfo[] }>
): UseQueryResult<{ userId: string; sessions: SessionInfo[] }, ApiError> => {
  return useQuery({
    queryKey: securitySessionsQueryKeys.active(query),
    queryFn: () => securitySessionsApi.getActiveSessions(query),
    ...options
  });
};

/**
 * Count recent sessions within a timeframe.
 */
export const useCountRecentSessions = (
  query?: RecentSessionsQuery,
  options?: QueryOptions<SessionCountResponse>
): UseQueryResult<SessionCountResponse, ApiError> => {
  return useQuery({
    queryKey: securitySessionsQueryKeys.recentCount(query),
    queryFn: () => securitySessionsApi.countRecentSessions(query),
    ...options
  });
};

/**
 * Main hook that provides access to all security sessions operations.
 */
export interface UseSecuritySessionsOptions {
  queries?: {
    active?: QueryOptions<{ userId: string; sessions: SessionInfo[] }>;
    recentCount?: QueryOptions<SessionCountResponse>;
  };
  mutations?: {
    create?: MutationConfig<SessionCreationResponse, SessionCreateInput>;
    updateActivity?: MutationConfig<SessionActivityUpdateResponse, string>;
    revoke?: MutationConfig<SessionRevokeResponse, string>;
    revokeAll?: MutationConfig<SessionsRevokeAllResponse, RevokeAllSessionsPayload>;
    cleanup?: MutationConfig<SessionCleanupResponse, CleanupExpiredSessionsQuery | undefined>;
  };
}

export interface UseSecuritySessionsResult {
  // Queries
  active: (
    query?: ActiveSessionsQuery
  ) => UseQueryResult<{ userId: string; sessions: SessionInfo[] }, ApiError>;
  recentCount: (query?: RecentSessionsQuery) => UseQueryResult<SessionCountResponse, ApiError>;

  // Mutations
  create: UseMutationResult<SessionCreationResponse, ApiError, SessionCreateInput, unknown>;
  updateActivity: UseMutationResult<SessionActivityUpdateResponse, ApiError, string, unknown>;
  revoke: UseMutationResult<SessionRevokeResponse, ApiError, string, unknown>;
  revokeAll: UseMutationResult<
    SessionsRevokeAllResponse,
    ApiError,
    RevokeAllSessionsPayload,
    unknown
  >;
  cleanup: UseMutationResult<
    SessionCleanupResponse,
    ApiError,
    CleanupExpiredSessionsQuery | undefined,
    unknown
  >;
}

export const useSecuritySessions = (
  options: UseSecuritySessionsOptions = {}
): UseSecuritySessionsResult => {
  const create = useCreateSession(options.mutations?.create);
  const updateActivity = useUpdateSessionActivity(options.mutations?.updateActivity);
  const revoke = useRevokeSession(options.mutations?.revoke);
  const revokeAll = useRevokeAllSessions(options.mutations?.revokeAll);
  const cleanup = useCleanupExpiredSessions(options.mutations?.cleanup);

  return {
    active: (query?: ActiveSessionsQuery) =>
      useActiveSessions(query, options.queries?.active),
    recentCount: (query?: RecentSessionsQuery) =>
      useCountRecentSessions(query, options.queries?.recentCount),
    create,
    updateActivity,
    revoke,
    revokeAll,
    cleanup
  };
};
