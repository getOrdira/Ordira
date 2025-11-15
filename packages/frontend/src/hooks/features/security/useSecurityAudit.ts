'use client';

// src/hooks/features/security/useSecurityAudit.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import securityAuditApi, {
  type AuditHistoryQuery,
  type SecurityMetricsQuery
} from '@/lib/api/features/security/securityAudit.api';
import type {
  SecurityAuditHistoryResponse,
  SecurityAuditMetricsResponse,
  SecurityAuditRequestResponse,
  SecurityAuditResult
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

export const securityAuditQueryKeys = {
  root: ['security', 'audit'] as const,
  report: () => [...securityAuditQueryKeys.root, 'report'] as const,
  history: (query?: AuditHistoryQuery) =>
    [...securityAuditQueryKeys.root, 'history', normalizeObject(query)] as const,
  metrics: (query?: SecurityMetricsQuery) =>
    [...securityAuditQueryKeys.root, 'metrics', normalizeObject(query)] as const
};

export const securityAuditMutationKeys = {
  perform: [...securityAuditQueryKeys.root, 'perform'] as const,
  request: [...securityAuditQueryKeys.root, 'request'] as const
};

/**
 * Perform a comprehensive security audit.
 */
export const usePerformSecurityAudit = (
  options?: MutationConfig<SecurityAuditResult, void>
): UseMutationResult<SecurityAuditResult, ApiError, void, unknown> => {
  return useMutation({
    mutationKey: securityAuditMutationKeys.perform,
    mutationFn: () => securityAuditApi.performSecurityAudit(),
    ...options
  });
};

/**
 * Generate a security report in markdown format.
 */
export const useSecurityReport = (
  options?: QueryOptions<string>
): UseQueryResult<string, ApiError> => {
  return useQuery({
    queryKey: securityAuditQueryKeys.report(),
    queryFn: () => securityAuditApi.generateSecurityReport(),
    ...options
  });
};

/**
 * Audit the current request and return discovered issues.
 */
export const useAuditRequest = (
  options?: MutationConfig<SecurityAuditRequestResponse, void>
): UseMutationResult<SecurityAuditRequestResponse, ApiError, void, unknown> => {
  return useMutation({
    mutationKey: securityAuditMutationKeys.request,
    mutationFn: () => securityAuditApi.auditRequest(),
    ...options
  });
};

/**
 * Retrieve recent security audit history.
 */
export const useAuditHistory = (
  query?: AuditHistoryQuery,
  options?: QueryOptions<SecurityAuditHistoryResponse>
): UseQueryResult<SecurityAuditHistoryResponse, ApiError> => {
  return useQuery({
    queryKey: securityAuditQueryKeys.history(query),
    queryFn: () => securityAuditApi.getAuditHistory(query),
    ...options
  });
};

/**
 * Retrieve system security metrics aggregated over a timeframe.
 */
export const useSecurityMetrics = (
  query?: SecurityMetricsQuery,
  options?: QueryOptions<SecurityAuditMetricsResponse>
): UseQueryResult<SecurityAuditMetricsResponse, ApiError> => {
  return useQuery({
    queryKey: securityAuditQueryKeys.metrics(query),
    queryFn: () => securityAuditApi.getSecurityMetrics(query),
    ...options
  });
};

/**
 * Main hook that provides access to all security audit operations.
 */
export interface UseSecurityAuditOptions {
  queries?: {
    report?: QueryOptions<string>;
    history?: QueryOptions<SecurityAuditHistoryResponse>;
    metrics?: QueryOptions<SecurityAuditMetricsResponse>;
  };
  mutations?: {
    perform?: MutationConfig<SecurityAuditResult, void>;
    request?: MutationConfig<SecurityAuditRequestResponse, void>;
  };
}

export interface UseSecurityAuditResult {
  // Queries
  report: UseQueryResult<string, ApiError>;
  history: (query?: AuditHistoryQuery) => UseQueryResult<SecurityAuditHistoryResponse, ApiError>;
  metrics: (query?: SecurityMetricsQuery) => UseQueryResult<SecurityAuditMetricsResponse, ApiError>;

  // Mutations
  perform: UseMutationResult<SecurityAuditResult, ApiError, void, unknown>;
  request: UseMutationResult<SecurityAuditRequestResponse, ApiError, void, unknown>;
}

export const useSecurityAudit = (options: UseSecurityAuditOptions = {}): UseSecurityAuditResult => {
  const perform = usePerformSecurityAudit(options.mutations?.perform);
  const request = useAuditRequest(options.mutations?.request);

  return {
    report: useSecurityReport(options.queries?.report),
    history: (query?: AuditHistoryQuery) => useAuditHistory(query, options.queries?.history),
    metrics: (query?: SecurityMetricsQuery) =>
      useSecurityMetrics(query, options.queries?.metrics),
    perform,
    request
  };
};
