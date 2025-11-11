'use client';
// src/hooks/features/connections/useConnectionsAnalytics.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import connectionsAnalyticsApi from '@/lib/api/features/connections/connectionsAnalytics.api';
import type { SharedAnalyticsResult } from '@backend/services/connections/features/analyticsSharing.service';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

const normalizeParams = <T extends object>(params?: T) => {
  if (!params) {
    return null;
  }
  return { ...params };
};

type ConnectionPairParams = Parameters<typeof connectionsAnalyticsApi.canShareAnalytics>[0];
type SharedAnalyticsParams = Parameters<typeof connectionsAnalyticsApi.getSharedAnalytics>[0];
type SharedKpiParams = Parameters<typeof connectionsAnalyticsApi.getSharedKpis>[0];
type BrandAnalyticsOverrides = Parameters<typeof connectionsAnalyticsApi.getBrandAnalytics>[1];
type ManufacturerAnalyticsOverrides = Parameters<typeof connectionsAnalyticsApi.getManufacturerAnalytics>[1];

type SharedKpiResponse = Awaited<ReturnType<typeof connectionsAnalyticsApi.getSharedKpis>>;
type AnalyticsSnapshot = Awaited<ReturnType<typeof connectionsAnalyticsApi.getBrandAnalytics>>;

export const connectionsAnalyticsQueryKeys = {
  root: ['connections', 'analytics'] as const,
  canShare: (params?: ConnectionPairParams) =>
    [...connectionsAnalyticsQueryKeys.root, 'can-share', normalizeParams(params)] as const,
  shared: (params?: SharedAnalyticsParams) =>
    [...connectionsAnalyticsQueryKeys.root, 'shared', normalizeParams(params)] as const,
  sharedKpis: (params?: SharedKpiParams) =>
    [...connectionsAnalyticsQueryKeys.root, 'shared-kpis', normalizeParams(params)] as const,
  brandAnalytics: (manufacturerId: string, overrides?: BrandAnalyticsOverrides) =>
    [
      ...connectionsAnalyticsQueryKeys.root,
      'brand',
      manufacturerId,
      normalizeParams(overrides)
    ] as const,
  manufacturerAnalytics: (brandId: string, overrides?: ManufacturerAnalyticsOverrides) =>
    [
      ...connectionsAnalyticsQueryKeys.root,
      'manufacturer',
      brandId,
      normalizeParams(overrides)
    ] as const
};

export const useCanShareConnectionsAnalytics = (
  params?: ConnectionPairParams,
  options?: QueryOptions<boolean>
): UseQueryResult<boolean, ApiError> => {
  return useQuery({
    queryKey: connectionsAnalyticsQueryKeys.canShare(params),
    queryFn: () => connectionsAnalyticsApi.canShareAnalytics(params),
    ...options
  });
};

export const useSharedConnectionsAnalytics = (
  params?: SharedAnalyticsParams,
  options?: QueryOptions<SharedAnalyticsResult>
): UseQueryResult<SharedAnalyticsResult, ApiError> => {
  return useQuery({
    queryKey: connectionsAnalyticsQueryKeys.shared(params),
    queryFn: () => connectionsAnalyticsApi.getSharedAnalytics(params),
    ...options
  });
};

export const useSharedConnectionsKpis = (
  params?: SharedKpiParams,
  options?: QueryOptions<SharedKpiResponse>
): UseQueryResult<SharedKpiResponse, ApiError> => {
  return useQuery({
    queryKey: connectionsAnalyticsQueryKeys.sharedKpis(params),
    queryFn: () => connectionsAnalyticsApi.getSharedKpis(params),
    ...options
  });
};

export const useBrandConnectionsAnalytics = (
  manufacturerId: string,
  overrides?: BrandAnalyticsOverrides,
  options?: QueryOptions<AnalyticsSnapshot>
): UseQueryResult<AnalyticsSnapshot, ApiError> => {
  return useQuery({
    queryKey: connectionsAnalyticsQueryKeys.brandAnalytics(manufacturerId, overrides),
    queryFn: () => connectionsAnalyticsApi.getBrandAnalytics(manufacturerId, overrides),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerConnectionsAnalytics = (
  brandId: string,
  overrides?: ManufacturerAnalyticsOverrides,
  options?: QueryOptions<AnalyticsSnapshot>
): UseQueryResult<AnalyticsSnapshot, ApiError> => {
  return useQuery({
    queryKey: connectionsAnalyticsQueryKeys.manufacturerAnalytics(brandId, overrides),
    queryFn: () => connectionsAnalyticsApi.getManufacturerAnalytics(brandId, overrides),
    enabled: Boolean(brandId) && (options?.enabled ?? true),
    ...options
  });
};
