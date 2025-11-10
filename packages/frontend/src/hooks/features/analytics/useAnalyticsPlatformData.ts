'use client';

// src/hooks/features/analytics/useAnalyticsPlatformData.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import analyticsPlatformDataApi, {
  type BusinessAnalyticsParams,
  type BusinessAnalyticsResponse,
  type BusinessVotingAnalyticsResponse,
  type ManufacturerAnalyticsParams,
  type ManufacturerAnalyticsResponse,
  type ProductAnalyticsParams,
  type ProductAnalyticsResponse,
  type VotingAnalyticsParams,
  type PlatformVotingAnalyticsResponse
} from '@/lib/api/features/analytics/analyticsPlatformData.api';
import { ApiError } from '@/lib/errors/errors';

const normalizeDateRange = (params?: { startDate?: string | Date; endDate?: string | Date }) => {
  if (!params) {
    return {};
  }

  return {
    startDate: params.startDate ? new Date(params.startDate).toISOString() : undefined,
    endDate: params.endDate ? new Date(params.endDate).toISOString() : undefined
  };
};

const buildKeyPayload = <T extends Record<string, unknown>>(
  params?: T
): Record<string, unknown> | null => {
  if (!params) {
    return null;
  }

  const { startDate, endDate } = normalizeDateRange(params);
  return {
    ...params,
    startDate,
    endDate
  };
};

export const analyticsPlatformDataQueryKeys = {
  root: ['analytics', 'platform'] as const,
  business: (params?: BusinessAnalyticsParams) =>
    [...analyticsPlatformDataQueryKeys.root, 'business', buildKeyPayload(params)] as const,
  products: (params?: ProductAnalyticsParams) =>
    [...analyticsPlatformDataQueryKeys.root, 'products', buildKeyPayload(params)] as const,
  manufacturers: (params?: ManufacturerAnalyticsParams) =>
    [...analyticsPlatformDataQueryKeys.root, 'manufacturers', buildKeyPayload(params)] as const,
  voting: (params?: VotingAnalyticsParams) =>
    [...analyticsPlatformDataQueryKeys.root, 'voting', buildKeyPayload(params)] as const,
  businessVoting: (businessId: string, params?: VotingAnalyticsParams) =>
    [
      ...analyticsPlatformDataQueryKeys.root,
      'businessVoting',
      businessId,
      buildKeyPayload(params)
    ] as const
};

type BaseQueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

export const useBusinessAnalyticsSnapshot = (
  params?: BusinessAnalyticsParams,
  options?: BaseQueryOptions<BusinessAnalyticsResponse>
): UseQueryResult<BusinessAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: analyticsPlatformDataQueryKeys.business(params),
    queryFn: () => analyticsPlatformDataApi.getBusinessAnalytics(params),
    staleTime: 5 * 60_000,
    ...options
  });
};

export const useProductAnalyticsSnapshot = (
  params?: ProductAnalyticsParams,
  options?: BaseQueryOptions<ProductAnalyticsResponse>
): UseQueryResult<ProductAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: analyticsPlatformDataQueryKeys.products(params),
    queryFn: () => analyticsPlatformDataApi.getProductAnalytics(params),
    staleTime: 5 * 60_000,
    ...options
  });
};

export const useManufacturerAnalyticsSnapshot = (
  params?: ManufacturerAnalyticsParams,
  options?: BaseQueryOptions<ManufacturerAnalyticsResponse>
): UseQueryResult<ManufacturerAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: analyticsPlatformDataQueryKeys.manufacturers(params),
    queryFn: () => analyticsPlatformDataApi.getManufacturerAnalytics(params),
    staleTime: 5 * 60_000,
    ...options
  });
};

export const usePlatformVotingAnalytics = (
  params?: VotingAnalyticsParams,
  options?: BaseQueryOptions<PlatformVotingAnalyticsResponse>
): UseQueryResult<PlatformVotingAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: analyticsPlatformDataQueryKeys.voting(params),
    queryFn: () => analyticsPlatformDataApi.getPlatformVotingAnalytics(params),
    staleTime: 60_000,
    ...options
  });
};

export const useBusinessVotingAnalytics = (
  businessId: string,
  params?: VotingAnalyticsParams,
  options?: BaseQueryOptions<BusinessVotingAnalyticsResponse>
): UseQueryResult<BusinessVotingAnalyticsResponse, ApiError> => {
  return useQuery({
    queryKey: analyticsPlatformDataQueryKeys.businessVoting(businessId, params),
    queryFn: () => analyticsPlatformDataApi.getBusinessVotingAnalytics(businessId, params),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    staleTime: 60_000,
    ...options
  });
};
