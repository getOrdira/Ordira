'use client';

// src/hooks/features/domains/useDomainAnalytics.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import domainAnalyticsApi, {
  type DomainAccessRecordPayload,
  type DomainAnalyticsQueryOptions,
  type DomainAnalyticsResetResult
} from '@/lib/api/features/domains/domainAnalytics.api';
import type { DomainAnalyticsReport } from '@backend/services/domains/features/domainAnalytics.service';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const normalizeParams = <T extends object>(params?: T) => {
  if (!params) {
    return null;
  }
  return { ...params };
};

type RecordAccessResponse = Awaited<ReturnType<typeof domainAnalyticsApi.recordDomainAccess>>;

export const domainAnalyticsQueryKeys = {
  root: ['domains', 'analytics'] as const,
  report: (domainId: string, params?: DomainAnalyticsQueryOptions) =>
    [...domainAnalyticsQueryKeys.root, 'report', domainId, normalizeParams(params)] as const
};

export const domainAnalyticsMutationKeys = {
  recordAccess: [...domainAnalyticsQueryKeys.root, 'record-access'] as const,
  reset: [...domainAnalyticsQueryKeys.root, 'reset'] as const
};

export const useDomainAnalyticsReport = (
  domainId: string,
  params?: DomainAnalyticsQueryOptions,
  options?: QueryOptions<DomainAnalyticsReport>
): UseQueryResult<DomainAnalyticsReport, ApiError> => {
  return useQuery({
    queryKey: domainAnalyticsQueryKeys.report(domainId, params),
    queryFn: () => domainAnalyticsApi.getDomainAnalytics(domainId, params),
    enabled: Boolean(domainId) && (options?.enabled ?? true),
    ...options
  });
};

export const useRecordDomainAccess = (
  options?: MutationConfig<RecordAccessResponse, DomainAccessRecordPayload>
): UseMutationResult<RecordAccessResponse, ApiError, DomainAccessRecordPayload, unknown> => {
  return useMutation({
    mutationKey: domainAnalyticsMutationKeys.recordAccess,
    mutationFn: domainAnalyticsApi.recordDomainAccess,
    ...options
  });
};

export const useResetDomainAnalytics = (
  options?: MutationConfig<DomainAnalyticsResetResult, string>
): UseMutationResult<DomainAnalyticsResetResult, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: domainAnalyticsMutationKeys.reset,
    mutationFn: domainAnalyticsApi.resetDomainAnalytics,
    ...options
  });
};
