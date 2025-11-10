'use client';

// src/hooks/features/analytics/useAnalyticsReporting.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import analyticsReportingApi, {
  type BusinessReportingParams,
  type BusinessReportingResponse,
  type DashboardReplicaResponse
} from '@/lib/api/features/analytics/analyticsReporting.api';
import { ApiError } from '@/lib/errors/errors';

const normalizeRangeParams = (params?: { startDate?: string | Date; endDate?: string | Date }) => {
  if (!params) {
    return {};
  }

  return {
    startDate: params.startDate ? new Date(params.startDate).toISOString() : undefined,
    endDate: params.endDate ? new Date(params.endDate).toISOString() : undefined
  };
};

export const analyticsReportingQueryKeys = {
  root: ['analytics', 'reporting'] as const,
  dashboardReplica: (businessId: string, params?: { startDate?: string | Date; endDate?: string | Date }) =>
    [
      ...analyticsReportingQueryKeys.root,
      'dashboard',
      businessId,
      normalizeRangeParams(params)
    ] as const,
  businessReport: (businessId: string, params: BusinessReportingParams) =>
    [
      ...analyticsReportingQueryKeys.root,
      'business-report',
      businessId,
      {
        ...params,
        ...normalizeRangeParams(params),
        reportType: params.reportType,
        includeRawData: params.includeRawData ?? false,
        useReplica: params.useReplica ?? false
      }
    ] as const
};

type DashboardReplicaQueryOptions = Omit<
  UseQueryOptions<DashboardReplicaResponse, ApiError, DashboardReplicaResponse, QueryKey>,
  'queryKey' | 'queryFn'
>;

type BusinessReportQueryOptions = Omit<
  UseQueryOptions<BusinessReportingResponse, ApiError, BusinessReportingResponse, QueryKey>,
  'queryKey' | 'queryFn'
>;

export const useDashboardReplicaAnalytics = (
  businessId: string,
  params?: { startDate?: string | Date; endDate?: string | Date },
  options?: DashboardReplicaQueryOptions
): UseQueryResult<DashboardReplicaResponse, ApiError> => {
  return useQuery({
    queryKey: analyticsReportingQueryKeys.dashboardReplica(businessId, params),
    queryFn: () => analyticsReportingApi.getDashboardAnalyticsWithReplica(businessId, params),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    staleTime: 2 * 60_000,
    ...options
  });
};

export const useBusinessReportingData = (
  businessId: string,
  params: BusinessReportingParams,
  options?: BusinessReportQueryOptions
): UseQueryResult<BusinessReportingResponse, ApiError> => {
  return useQuery({
    queryKey: analyticsReportingQueryKeys.businessReport(businessId, params),
    queryFn: () => analyticsReportingApi.getBusinessReportingData(businessId, params),
    enabled: Boolean(businessId && params?.reportType) && (options?.enabled ?? true),
    staleTime: 5 * 60_000,
    ...options
  });
};
