'use client';

// src/hooks/features/manufacturers/useManufacturerSearch.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import manufacturerSearchApi, {
  type AdvancedSearchFilters,
  type AdvancedSearchQueryOptions,
  type AdvancedSearchResponse,
  type IndustryBenchmark,
  type ManufacturerComparison,
  type TrendAnalysis
} from '@/lib/api/features/manufacturers/manufacturerSearch.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const normalizeParams = <T extends Record<string, unknown> | undefined>(params?: T) => {
  if (!params) {
    return null;
  }
  return Object.keys(params).length ? { ...params } : null;
};

type AdvancedSearchVariables = {
  filters: AdvancedSearchFilters;
  options?: AdvancedSearchQueryOptions;
};

type CompareManufacturersVariables = {
  manufacturerIds: Parameters<typeof manufacturerSearchApi.compareManufacturers>[0];
  criteria?: Parameters<typeof manufacturerSearchApi.compareManufacturers>[1];
};

type TrendAnalysisVariables = {
  manufacturerId: Parameters<typeof manufacturerSearchApi.getTrendAnalysis>[0];
  params: Parameters<typeof manufacturerSearchApi.getTrendAnalysis>[1];
};

export const manufacturerSearchQueryKeys = {
  root: ['manufacturers', 'search'] as const,
  trendAnalysis: (manufacturerId: string, params: TrendAnalysisVariables['params']) =>
    [...manufacturerSearchQueryKeys.root, 'trend', manufacturerId, normalizeParams(params)] as const,
  industryBenchmarks: (industry: string) =>
    [...manufacturerSearchQueryKeys.root, 'industry-benchmarks', industry] as const
};

export const manufacturerSearchMutationKeys = {
  advancedSearch: [...manufacturerSearchQueryKeys.root, 'advanced-search'] as const,
  compare: [...manufacturerSearchQueryKeys.root, 'compare'] as const
};

export const useAdvancedManufacturerSearch = (
  options?: MutationConfig<AdvancedSearchResponse, AdvancedSearchVariables>
): UseMutationResult<AdvancedSearchResponse, ApiError, AdvancedSearchVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerSearchMutationKeys.advancedSearch,
    mutationFn: ({ filters, options: searchOptions }) =>
      manufacturerSearchApi.advancedSearch(filters, searchOptions),
    ...options
  });
};

export const useCompareManufacturersSearch = (
  options?: MutationConfig<ManufacturerComparison, CompareManufacturersVariables>
): UseMutationResult<ManufacturerComparison, ApiError, CompareManufacturersVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerSearchMutationKeys.compare,
    mutationFn: ({ manufacturerIds, criteria }) =>
      manufacturerSearchApi.compareManufacturers(manufacturerIds, criteria),
    ...options
  });
};

export const useManufacturerTrendAnalysis = (
  manufacturerId: string,
  params: TrendAnalysisVariables['params'],
  options?: QueryOptions<TrendAnalysis>
): UseQueryResult<TrendAnalysis, ApiError> => {
  return useQuery({
    queryKey: manufacturerSearchQueryKeys.trendAnalysis(manufacturerId, params),
    queryFn: () => manufacturerSearchApi.getTrendAnalysis(manufacturerId, params),
    enabled:
      Boolean(manufacturerId) &&
      Boolean(params?.metric) &&
      Boolean(params?.timeframe) &&
      (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerIndustryBenchmarks = (
  industry: string,
  options?: QueryOptions<IndustryBenchmark>
): UseQueryResult<IndustryBenchmark, ApiError> => {
  return useQuery({
    queryKey: manufacturerSearchQueryKeys.industryBenchmarks(industry),
    queryFn: () => manufacturerSearchApi.getIndustryBenchmarks(industry),
    enabled: Boolean(industry) && (options?.enabled ?? true),
    ...options
  });
};
