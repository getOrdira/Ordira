'use client';

// src/hooks/features/security/useSecurityAnalytics.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import securityAnalyticsApi, {
  type AuditReportQuery,
  type SuspiciousActivityPayload,
  type SystemMetricsQuery
} from '@/lib/api/features/security/securityAnalytics.api';
import type {
  SecurityAuditReportResponse,
  SystemSecurityMetricsResponse,
  SuspiciousActivityResponse
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

export const securityAnalyticsQueryKeys = {
  root: ['security', 'analytics'] as const,
  auditReport: (query?: AuditReportQuery) =>
    [...securityAnalyticsQueryKeys.root, 'audit-report', normalizeObject(query)] as const,
  systemMetrics: (query?: SystemMetricsQuery) =>
    [...securityAnalyticsQueryKeys.root, 'system-metrics', normalizeObject(query)] as const
};

export const securityAnalyticsMutationKeys = {
  detectSuspicious: [...securityAnalyticsQueryKeys.root, 'detect-suspicious'] as const
};

/**
 * Detect suspicious activity for a given user context.
 */
export const useDetectSuspiciousActivity = (
  options?: MutationConfig<SuspiciousActivityResponse, SuspiciousActivityPayload>
): UseMutationResult<SuspiciousActivityResponse, ApiError, SuspiciousActivityPayload, unknown> => {
  return useMutation({
    mutationKey: securityAnalyticsMutationKeys.detectSuspicious,
    mutationFn: (payload) => securityAnalyticsApi.detectSuspiciousActivity(payload),
    ...options
  });
};

/**
 * Retrieve a security audit report for a user.
 */
export const useSecurityAuditReport = (
  query?: AuditReportQuery,
  options?: QueryOptions<SecurityAuditReportResponse>
): UseQueryResult<SecurityAuditReportResponse, ApiError> => {
  return useQuery({
    queryKey: securityAnalyticsQueryKeys.auditReport(query),
    queryFn: () => securityAnalyticsApi.getSecurityAuditReport(query),
    ...options
  });
};

/**
 * Retrieve system security metrics across a time window.
 */
export const useSystemSecurityMetrics = (
  query?: SystemMetricsQuery,
  options?: QueryOptions<SystemSecurityMetricsResponse>
): UseQueryResult<SystemSecurityMetricsResponse, ApiError> => {
  return useQuery({
    queryKey: securityAnalyticsQueryKeys.systemMetrics(query),
    queryFn: () => securityAnalyticsApi.getSystemSecurityMetrics(query),
    ...options
  });
};

/**
 * Main hook that provides access to all security analytics operations.
 */
export interface UseSecurityAnalyticsOptions {
  queries?: {
    auditReport?: QueryOptions<SecurityAuditReportResponse>;
    systemMetrics?: QueryOptions<SystemSecurityMetricsResponse>;
  };
  mutations?: {
    detectSuspicious?: MutationConfig<SuspiciousActivityResponse, SuspiciousActivityPayload>;
  };
}

export interface UseSecurityAnalyticsResult {
  // Queries
  auditReport: (query?: AuditReportQuery) => UseQueryResult<SecurityAuditReportResponse, ApiError>;
  systemMetrics: (
    query?: SystemMetricsQuery
  ) => UseQueryResult<SystemSecurityMetricsResponse, ApiError>;

  // Mutations
  detectSuspicious: UseMutationResult<
    SuspiciousActivityResponse,
    ApiError,
    SuspiciousActivityPayload,
    unknown
  >;
}

export const useSecurityAnalytics = (
  options: UseSecurityAnalyticsOptions = {}
): UseSecurityAnalyticsResult => {
  const detectSuspicious = useDetectSuspiciousActivity(options.mutations?.detectSuspicious);

  return {
    auditReport: (query?: AuditReportQuery) =>
      useSecurityAuditReport(query, options.queries?.auditReport),
    systemMetrics: (query?: SystemMetricsQuery) =>
      useSystemSecurityMetrics(query, options.queries?.systemMetrics),
    detectSuspicious
  };
};
