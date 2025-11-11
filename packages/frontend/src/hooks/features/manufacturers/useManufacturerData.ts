'use client';

// src/hooks/features/manufacturers/useManufacturerData.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import manufacturerDataApi, {
  type ManufacturerBasicInfo,
  type ManufacturerSearchQuery,
  type ManufacturerSearchResponse,
  type UpdateManufacturerData
} from '@/lib/api/features/manufacturers/manufacturerData.api';
import type { IManufacturer, ManufacturerSearchResult } from '@/lib/types/features/manufacturers';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const normalizeObject = <T extends Record<string, unknown> | undefined>(value?: T) => {
  if (!value) {
    return null;
  }
  return Object.keys(value).length ? { ...value } : null;
};

const normalizeArray = <T>(value?: T[]) => {
  if (!value || value.length === 0) {
    return null;
  }
  return [...value];
};

type ManufacturerId = Parameters<typeof manufacturerDataApi.getById>[0];
type ManufacturerSearchFilters = ManufacturerSearchQuery;
type SearchResponse = ManufacturerSearchResponse;
type ManufacturerCountCriteria = Parameters<typeof manufacturerDataApi.count>[0];

type UpdateManufacturerVariables = {
  manufacturerId: ManufacturerId;
  updates: UpdateManufacturerData;
};

export const manufacturerDataQueryKeys = {
  root: ['manufacturers', 'data'] as const,
  search: (params?: ManufacturerSearchFilters) =>
    [...manufacturerDataQueryKeys.root, 'search', normalizeObject(params)] as const,
  byId: (manufacturerId: ManufacturerId) =>
    [...manufacturerDataQueryKeys.root, 'id', manufacturerId] as const,
  byEmail: (email: string, options?: { skipCache?: boolean }) =>
    [
      ...manufacturerDataQueryKeys.root,
      'email',
      email?.toLowerCase() ?? '',
      normalizeObject(options)
    ] as const,
  byIndustry: (industry: string, limit?: number) =>
    [...manufacturerDataQueryKeys.root, 'industry', industry, limit ?? null] as const,
  exists: (manufacturerId: ManufacturerId) =>
    [...manufacturerDataQueryKeys.root, 'exists', manufacturerId] as const,
  basicInfo: (manufacturerId: ManufacturerId) =>
    [...manufacturerDataQueryKeys.root, 'basic-info', manufacturerId] as const,
  bulk: (ids: string[]) =>
    [...manufacturerDataQueryKeys.root, 'bulk', normalizeArray(ids)] as const,
  count: (criteria?: ManufacturerCountCriteria) =>
    [...manufacturerDataQueryKeys.root, 'count', normalizeObject(criteria)] as const
};

export const manufacturerDataMutationKeys = {
  update: [...manufacturerDataQueryKeys.root, 'update'] as const,
  remove: [...manufacturerDataQueryKeys.root, 'remove'] as const
};

export const useManufacturerSearch = (
  params?: ManufacturerSearchFilters,
  options?: QueryOptions<SearchResponse>
): UseQueryResult<SearchResponse, ApiError> => {
  return useQuery({
    queryKey: manufacturerDataQueryKeys.search(params),
    queryFn: () => manufacturerDataApi.search(params),
    ...options
  });
};

export const useManufacturerById = (
  manufacturerId: ManufacturerId,
  options?: QueryOptions<IManufacturer>
): UseQueryResult<IManufacturer, ApiError> => {
  return useQuery({
    queryKey: manufacturerDataQueryKeys.byId(manufacturerId),
    queryFn: () => manufacturerDataApi.getById(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerByEmail = (
  email: string,
  queryOptions?: { skipCache?: boolean },
  options?: QueryOptions<IManufacturer>
): UseQueryResult<IManufacturer, ApiError> => {
  return useQuery({
    queryKey: manufacturerDataQueryKeys.byEmail(email, queryOptions),
    queryFn: () => manufacturerDataApi.getByEmail(email, queryOptions),
    enabled: Boolean(email) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturersByIndustry = (
  industry: string,
  limit?: number,
  options?: QueryOptions<ManufacturerSearchResult[]>
): UseQueryResult<ManufacturerSearchResult[], ApiError> => {
  return useQuery({
    queryKey: manufacturerDataQueryKeys.byIndustry(industry, limit),
    queryFn: () => manufacturerDataApi.getByIndustry(industry, limit),
    enabled: Boolean(industry) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerExists = (
  manufacturerId: ManufacturerId,
  options?: QueryOptions<boolean>
): UseQueryResult<boolean, ApiError> => {
  return useQuery({
    queryKey: manufacturerDataQueryKeys.exists(manufacturerId),
    queryFn: () => manufacturerDataApi.exists(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerBasicInfo = (
  manufacturerId: ManufacturerId,
  options?: QueryOptions<ManufacturerBasicInfo>
): UseQueryResult<ManufacturerBasicInfo, ApiError> => {
  return useQuery({
    queryKey: manufacturerDataQueryKeys.basicInfo(manufacturerId),
    queryFn: () => manufacturerDataApi.getBasicInfo(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturersBulkGet = (
  manufacturerIds: string[],
  options?: QueryOptions<IManufacturer[]>
): UseQueryResult<IManufacturer[], ApiError> => {
  return useQuery({
    queryKey: manufacturerDataQueryKeys.bulk(manufacturerIds),
    queryFn: () => manufacturerDataApi.bulkGet(manufacturerIds),
    enabled: Boolean(manufacturerIds?.length) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerCount = (
  criteria?: ManufacturerCountCriteria,
  options?: QueryOptions<number>
): UseQueryResult<number, ApiError> => {
  return useQuery({
    queryKey: manufacturerDataQueryKeys.count(criteria),
    queryFn: () => manufacturerDataApi.count(criteria),
    ...options
  });
};

export const useUpdateManufacturerData = (
  options?: MutationConfig<IManufacturer, UpdateManufacturerVariables>
): UseMutationResult<IManufacturer, ApiError, UpdateManufacturerVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerDataMutationKeys.update,
    mutationFn: ({ manufacturerId, updates }) =>
      manufacturerDataApi.update(manufacturerId, updates),
    ...options
  });
};

export const useRemoveManufacturer = (
  options?: MutationConfig<string, ManufacturerId>
): UseMutationResult<string, ApiError, ManufacturerId, unknown> => {
  return useMutation({
    mutationKey: manufacturerDataMutationKeys.remove,
    mutationFn: manufacturerDataApi.remove,
    ...options
  });
};
