'use client';

// src/hooks/features/security/useSecurityEvents.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import securityEventsApi, {
  type EventsQueryParams,
  type EventsSinceQueryParams,
  type LogAuthAttemptPayload,
  type SystemEventsQueryParams
} from '@/lib/api/features/security/securityEvents.api';
import type {
  SecurityAuthAttemptResponse,
  SecurityEventCreateInput,
  SecurityEventLogResponse,
  SecurityEventsEnvelope
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

export const securityEventsQueryKeys = {
  root: ['security', 'events'] as const,
  recent: (query?: EventsQueryParams) =>
    [...securityEventsQueryKeys.root, 'recent', normalizeObject(query)] as const,
  userSince: (query?: EventsSinceQueryParams) =>
    [...securityEventsQueryKeys.root, 'user', 'since', normalizeObject(query)] as const,
  system: (query?: SystemEventsQueryParams) =>
    [...securityEventsQueryKeys.root, 'system', normalizeObject(query)] as const
};

export const securityEventsMutationKeys = {
  log: [...securityEventsQueryKeys.root, 'log'] as const,
  logAuth: [...securityEventsQueryKeys.root, 'log-auth'] as const
};

/**
 * Log a security event.
 */
export const useLogSecurityEvent = (
  options?: MutationConfig<SecurityEventLogResponse, SecurityEventCreateInput>
): UseMutationResult<SecurityEventLogResponse, ApiError, SecurityEventCreateInput, unknown> => {
  return useMutation({
    mutationKey: securityEventsMutationKeys.log,
    mutationFn: (payload) => securityEventsApi.logEvent(payload),
    ...options
  });
};

/**
 * Log an authentication attempt security event.
 */
export const useLogAuthenticationAttempt = (
  options?: MutationConfig<SecurityAuthAttemptResponse, LogAuthAttemptPayload>
): UseMutationResult<SecurityAuthAttemptResponse, ApiError, LogAuthAttemptPayload, unknown> => {
  return useMutation({
    mutationKey: securityEventsMutationKeys.logAuth,
    mutationFn: (payload) => securityEventsApi.logAuthenticationAttempt(payload),
    ...options
  });
};

/**
 * Retrieve recent events for a user.
 */
export const useRecentSecurityEvents = (
  query?: EventsQueryParams,
  options?: QueryOptions<SecurityEventsEnvelope>
): UseQueryResult<SecurityEventsEnvelope, ApiError> => {
  return useQuery({
    queryKey: securityEventsQueryKeys.recent(query),
    queryFn: () => securityEventsApi.getRecentEvents(query),
    ...options
  });
};

/**
 * Retrieve events for a user since a specific window.
 */
export const useUserEventsSince = (
  query?: EventsSinceQueryParams,
  options?: QueryOptions<SecurityEventsEnvelope>
): UseQueryResult<SecurityEventsEnvelope, ApiError> => {
  return useQuery({
    queryKey: securityEventsQueryKeys.userSince(query),
    queryFn: () => securityEventsApi.getUserEventsSince(query),
    ...options
  });
};

/**
 * Retrieve system events for dashboards.
 */
export const useSystemSecurityEvents = (
  query?: SystemEventsQueryParams,
  options?: QueryOptions<SecurityEventsEnvelope>
): UseQueryResult<SecurityEventsEnvelope, ApiError> => {
  return useQuery({
    queryKey: securityEventsQueryKeys.system(query),
    queryFn: () => securityEventsApi.getSystemEvents(query),
    ...options
  });
};

/**
 * Main hook that provides access to all security events operations.
 */
export interface UseSecurityEventsOptions {
  queries?: {
    recent?: QueryOptions<SecurityEventsEnvelope>;
    userSince?: QueryOptions<SecurityEventsEnvelope>;
    system?: QueryOptions<SecurityEventsEnvelope>;
  };
  mutations?: {
    log?: MutationConfig<SecurityEventLogResponse, SecurityEventCreateInput>;
    logAuth?: MutationConfig<SecurityAuthAttemptResponse, LogAuthAttemptPayload>;
  };
}

export interface UseSecurityEventsResult {
  // Queries
  recent: (query?: EventsQueryParams) => UseQueryResult<SecurityEventsEnvelope, ApiError>;
  userSince: (
    query?: EventsSinceQueryParams
  ) => UseQueryResult<SecurityEventsEnvelope, ApiError>;
  system: (
    query?: SystemEventsQueryParams
  ) => UseQueryResult<SecurityEventsEnvelope, ApiError>;

  // Mutations
  log: UseMutationResult<SecurityEventLogResponse, ApiError, SecurityEventCreateInput, unknown>;
  logAuth: UseMutationResult<
    SecurityAuthAttemptResponse,
    ApiError,
    LogAuthAttemptPayload,
    unknown
  >;
}

export const useSecurityEvents = (
  options: UseSecurityEventsOptions = {}
): UseSecurityEventsResult => {
  const log = useLogSecurityEvent(options.mutations?.log);
  const logAuth = useLogAuthenticationAttempt(options.mutations?.logAuth);

  return {
    recent: (query?: EventsQueryParams) =>
      useRecentSecurityEvents(query, options.queries?.recent),
    userSince: (query?: EventsSinceQueryParams) =>
      useUserEventsSince(query, options.queries?.userSince),
    system: (query?: SystemEventsQueryParams) =>
      useSystemSecurityEvents(query, options.queries?.system),
    log,
    logAuth
  };
};
