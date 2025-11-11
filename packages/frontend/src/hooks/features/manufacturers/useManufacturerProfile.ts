'use client';

// src/hooks/features/manufacturers/useManufacturerProfile.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import manufacturerProfileApi, {
  type ManufacturerIndustryInsights,
  type ManufacturerProfile,
  type ManufacturerProfileSearchQuery,
  type ManufacturerProfileSearchResponse,
  type ProfileContext
} from '@/lib/api/features/manufacturers/manufacturerProfile.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

const normalizeParams = <T extends Record<string, unknown> | undefined>(params?: T) => {
  if (!params) {
    return null;
  }
  return Object.keys(params).length ? { ...params } : null;
};

export const manufacturerProfileQueryKeys = {
  root: ['manufacturers', 'profile'] as const,
  search: (params?: ManufacturerProfileSearchQuery) =>
    [...manufacturerProfileQueryKeys.root, 'search', normalizeParams(params)] as const,
  profile: (manufacturerId: string) =>
    [...manufacturerProfileQueryKeys.root, 'detail', manufacturerId] as const,
  context: (manufacturerId: string, brandId?: string) =>
    [...manufacturerProfileQueryKeys.root, 'context', manufacturerId, brandId ?? null] as const,
  industryInsights: (industry: string) =>
    [...manufacturerProfileQueryKeys.root, 'industry', industry] as const,
  industries: () => [...manufacturerProfileQueryKeys.root, 'industries'] as const,
  services: () => [...manufacturerProfileQueryKeys.root, 'services'] as const,
  list: () => [...manufacturerProfileQueryKeys.root, 'list'] as const
};

export const useManufacturerProfileSearch = (
  params?: ManufacturerProfileSearchQuery,
  options?: QueryOptions<ManufacturerProfileSearchResponse>
): UseQueryResult<ManufacturerProfileSearchResponse, ApiError> => {
  return useQuery({
    queryKey: manufacturerProfileQueryKeys.search(params),
    queryFn: () => manufacturerProfileApi.search(params),
    ...options
  });
};

export const useManufacturerProfile = (
  manufacturerId: string,
  options?: QueryOptions<ManufacturerProfile>
): UseQueryResult<ManufacturerProfile, ApiError> => {
  return useQuery({
    queryKey: manufacturerProfileQueryKeys.profile(manufacturerId),
    queryFn: () => manufacturerProfileApi.getProfile(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerProfileContext = (
  manufacturerId: string,
  brandId?: string,
  options?: QueryOptions<ProfileContext>
): UseQueryResult<ProfileContext, ApiError> => {
  return useQuery({
    queryKey: manufacturerProfileQueryKeys.context(manufacturerId, brandId),
    queryFn: () => manufacturerProfileApi.getProfileContext(manufacturerId, brandId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerIndustryInsights = (
  industry: string,
  options?: QueryOptions<ManufacturerIndustryInsights>
): UseQueryResult<ManufacturerIndustryInsights, ApiError> => {
  return useQuery({
    queryKey: manufacturerProfileQueryKeys.industryInsights(industry),
    queryFn: () => manufacturerProfileApi.getByIndustry(industry),
    enabled: Boolean(industry) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerIndustries = (
  options?: QueryOptions<string[]>
): UseQueryResult<string[], ApiError> => {
  return useQuery({
    queryKey: manufacturerProfileQueryKeys.industries(),
    queryFn: () => manufacturerProfileApi.getAvailableIndustries(),
    ...options
  });
};

export const useManufacturerServices = (
  options?: QueryOptions<string[]>
): UseQueryResult<string[], ApiError> => {
  return useQuery({
    queryKey: manufacturerProfileQueryKeys.services(),
    queryFn: () => manufacturerProfileApi.getAvailableServices(),
    ...options
  });
};

export const useManufacturerProfiles = (
  options?: QueryOptions<ManufacturerProfile[]>
): UseQueryResult<ManufacturerProfile[], ApiError> => {
  return useQuery({
    queryKey: manufacturerProfileQueryKeys.list(),
    queryFn: () => manufacturerProfileApi.listProfiles(),
    ...options
  });
};
