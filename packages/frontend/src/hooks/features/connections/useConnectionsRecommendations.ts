'use client';

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import connectionsRecommendationsApi from '@/lib/api/features/connections/connectionsRecommendations.api';
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

type ManufacturerRecommendationsParams = Parameters<
  typeof connectionsRecommendationsApi.getManufacturerRecommendations
>[0];
type BrandRecommendationsParams = Parameters<
  typeof connectionsRecommendationsApi.getBrandRecommendations
>[0];
type CompatibilityParams = Parameters<
  typeof connectionsRecommendationsApi.getCompatibilityReport
>[0];

type ManufacturerRecommendations = Awaited<
  ReturnType<typeof connectionsRecommendationsApi.getManufacturerRecommendations>
>;
type BrandRecommendations = Awaited<
  ReturnType<typeof connectionsRecommendationsApi.getBrandRecommendations>
>;
type CompatibilityReport = Awaited<
  ReturnType<typeof connectionsRecommendationsApi.getCompatibilityReport>
>;

export const connectionsRecommendationsQueryKeys = {
  root: ['connections', 'recommendations'] as const,
  manufacturers: (params?: ManufacturerRecommendationsParams) =>
    [
      ...connectionsRecommendationsQueryKeys.root,
      'manufacturers',
      normalizeParams(params)
    ] as const,
  brands: (params?: BrandRecommendationsParams) =>
    [...connectionsRecommendationsQueryKeys.root, 'brands', normalizeParams(params)] as const,
  compatibility: (brandId: string, manufacturerId: string) =>
    [
      ...connectionsRecommendationsQueryKeys.root,
      'compatibility',
      brandId,
      manufacturerId
    ] as const
};

export const useManufacturerRecommendations = (
  params?: ManufacturerRecommendationsParams,
  options?: QueryOptions<ManufacturerRecommendations>
): UseQueryResult<ManufacturerRecommendations, ApiError> => {
  return useQuery({
    queryKey: connectionsRecommendationsQueryKeys.manufacturers(params),
    queryFn: () => connectionsRecommendationsApi.getManufacturerRecommendations(params),
    ...options
  });
};

export const useBrandRecommendations = (
  params?: BrandRecommendationsParams,
  options?: QueryOptions<BrandRecommendations>
): UseQueryResult<BrandRecommendations, ApiError> => {
  return useQuery({
    queryKey: connectionsRecommendationsQueryKeys.brands(params),
    queryFn: () => connectionsRecommendationsApi.getBrandRecommendations(params),
    ...options
  });
};

export const useConnectionsCompatibilityReport = (
  params: CompatibilityParams,
  options?: QueryOptions<CompatibilityReport>
): UseQueryResult<CompatibilityReport, ApiError> => {
  return useQuery({
    queryKey: connectionsRecommendationsQueryKeys.compatibility(params.brandId, params.manufacturerId),
    queryFn: () => connectionsRecommendationsApi.getCompatibilityReport(params),
    enabled:
      Boolean(params?.brandId) && Boolean(params?.manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};
