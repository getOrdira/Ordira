'use client';

// src/hooks/features/security/useSecurityScanning.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import securityScanningApi, { type ScanHistoryQuery } from '@/lib/api/features/security/securityScanning.api';
import type {
  SecurityScanExecutionResponse,
  SecurityScanHistoryResponse,
  SecurityScanMetricsResponse,
  SecurityScanStatusResponse,
  SecurityVulnerabilitiesResponse
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

export const securityScanningQueryKeys = {
  root: ['security', 'scanning'] as const,
  metrics: () => [...securityScanningQueryKeys.root, 'metrics'] as const,
  history: (query?: ScanHistoryQuery) =>
    [...securityScanningQueryKeys.root, 'history', normalizeObject(query)] as const,
  vulnerabilities: () => [...securityScanningQueryKeys.root, 'vulnerabilities'] as const,
  status: () => [...securityScanningQueryKeys.root, 'status'] as const
};

export const securityScanningMutationKeys = {
  perform: [...securityScanningQueryKeys.root, 'perform'] as const
};

/**
 * Trigger a security scan.
 */
export const usePerformSecurityScan = (
  options?: MutationConfig<SecurityScanExecutionResponse, void>
): UseMutationResult<SecurityScanExecutionResponse, ApiError, void, unknown> => {
  return useMutation({
    mutationKey: securityScanningMutationKeys.perform,
    mutationFn: () => securityScanningApi.performSecurityScan(),
    ...options
  });
};

/**
 * Retrieve aggregated security scan metrics.
 */
export const useSecurityScanMetrics = (
  options?: QueryOptions<SecurityScanMetricsResponse>
): UseQueryResult<SecurityScanMetricsResponse, ApiError> => {
  return useQuery({
    queryKey: securityScanningQueryKeys.metrics(),
    queryFn: () => securityScanningApi.getSecurityScanMetrics(),
    ...options
  });
};

/**
 * Retrieve recent scan history.
 */
export const useScanHistory = (
  query?: ScanHistoryQuery,
  options?: QueryOptions<SecurityScanHistoryResponse>
): UseQueryResult<SecurityScanHistoryResponse, ApiError> => {
  return useQuery({
    queryKey: securityScanningQueryKeys.history(query),
    queryFn: () => securityScanningApi.getScanHistory(query),
    ...options
  });
};

/**
 * Retrieve unresolved security vulnerabilities.
 */
export const useUnresolvedVulnerabilities = (
  options?: QueryOptions<SecurityVulnerabilitiesResponse>
): UseQueryResult<SecurityVulnerabilitiesResponse, ApiError> => {
  return useQuery({
    queryKey: securityScanningQueryKeys.vulnerabilities(),
    queryFn: () => securityScanningApi.getUnresolvedVulnerabilities(),
    ...options
  });
};

/**
 * Retrieve current scan status.
 */
export const useScanStatus = (
  options?: QueryOptions<SecurityScanStatusResponse>
): UseQueryResult<SecurityScanStatusResponse, ApiError> => {
  return useQuery({
    queryKey: securityScanningQueryKeys.status(),
    queryFn: () => securityScanningApi.getScanStatus(),
    ...options
  });
};

/**
 * Main hook that provides access to all security scanning operations.
 */
export interface UseSecurityScanningOptions {
  queries?: {
    metrics?: QueryOptions<SecurityScanMetricsResponse>;
    history?: QueryOptions<SecurityScanHistoryResponse>;
    vulnerabilities?: QueryOptions<SecurityVulnerabilitiesResponse>;
    status?: QueryOptions<SecurityScanStatusResponse>;
  };
  mutations?: {
    perform?: MutationConfig<SecurityScanExecutionResponse, void>;
  };
}

export interface UseSecurityScanningResult {
  // Queries
  metrics: UseQueryResult<SecurityScanMetricsResponse, ApiError>;
  history: (query?: ScanHistoryQuery) => UseQueryResult<SecurityScanHistoryResponse, ApiError>;
  vulnerabilities: UseQueryResult<SecurityVulnerabilitiesResponse, ApiError>;
  status: UseQueryResult<SecurityScanStatusResponse, ApiError>;

  // Mutations
  perform: UseMutationResult<SecurityScanExecutionResponse, ApiError, void, unknown>;
}

export const useSecurityScanning = (
  options: UseSecurityScanningOptions = {}
): UseSecurityScanningResult => {
  const perform = usePerformSecurityScan(options.mutations?.perform);

  return {
    metrics: useSecurityScanMetrics(options.queries?.metrics),
    history: (query?: ScanHistoryQuery) =>
      useScanHistory(query, options.queries?.history),
    vulnerabilities: useUnresolvedVulnerabilities(options.queries?.vulnerabilities),
    status: useScanStatus(options.queries?.status),
    perform
  };
};
