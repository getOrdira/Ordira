'use client';

// src/hooks/features/brands/useBrandDiscovery.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import brandDiscoveryApi, {
  type DiscoveryAnalyticsParams,
  type DiscoveryOpportunitiesParams,
  type DiscoveryRecommendationsParams
} from '@/lib/api/features/brands/brandDiscovery.api';
import type {
  BrandCompatibilityResult,
  BrandRecommendation,
  ConnectionOpportunity,
  EcosystemAnalytics,
  SearchSuggestion
} from '@/lib/types/features/brands';
import { ApiError } from '@/lib/errors/errors';

const normalizeParams = <T extends object>(params?: T) => {
  if (!params) {
    return null;
  }
  return { ...params };
};

export const brandDiscoveryQueryKeys = {
  root: ['brands', 'discovery'] as const,
  recommendations: (params?: DiscoveryRecommendationsParams) =>
    [...brandDiscoveryQueryKeys.root, 'recommendations', normalizeParams(params)] as const,
  opportunities: (params?: DiscoveryOpportunitiesParams) =>
    [...brandDiscoveryQueryKeys.root, 'opportunities', normalizeParams(params)] as const,
  analytics: (params?: DiscoveryAnalyticsParams) =>
    [...brandDiscoveryQueryKeys.root, 'analytics', normalizeParams(params)] as const
};

export const brandDiscoveryMutationKeys = {
  compatibility: [...brandDiscoveryQueryKeys.root, 'compatibility'] as const,
  suggestions: [...brandDiscoveryQueryKeys.root, 'suggestions'] as const
};

type RecommendationsQueryOptions = Omit<
  UseQueryOptions<BrandRecommendation[], ApiError, BrandRecommendation[], QueryKey>,
  'queryKey' | 'queryFn'
>;

type OpportunitiesQueryOptions = Omit<
  UseQueryOptions<ConnectionOpportunity[], ApiError, ConnectionOpportunity[], QueryKey>,
  'queryKey' | 'queryFn'
>;

type AnalyticsQueryOptions = Omit<
  UseQueryOptions<EcosystemAnalytics, ApiError, EcosystemAnalytics, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const useBrandRecommendations = (
  params?: DiscoveryRecommendationsParams,
  options?: RecommendationsQueryOptions
): UseQueryResult<BrandRecommendation[], ApiError> => {
  return useQuery({
    queryKey: brandDiscoveryQueryKeys.recommendations(params),
    queryFn: () => brandDiscoveryApi.getRecommendations(params),
    ...options
  });
};

export const useBrandConnectionOpportunities = (
  params?: DiscoveryOpportunitiesParams,
  options?: OpportunitiesQueryOptions
): UseQueryResult<ConnectionOpportunity[], ApiError> => {
  return useQuery({
    queryKey: brandDiscoveryQueryKeys.opportunities(params),
    queryFn: () => brandDiscoveryApi.getConnectionOpportunities(params),
    ...options
  });
};

export const useBrandEcosystemAnalytics = (
  params?: DiscoveryAnalyticsParams,
  options?: AnalyticsQueryOptions
): UseQueryResult<EcosystemAnalytics, ApiError> => {
  return useQuery({
    queryKey: brandDiscoveryQueryKeys.analytics(params),
    queryFn: () => brandDiscoveryApi.getEcosystemAnalytics(params),
    ...options
  });
};

export const useBrandCompatibilityScore = (
  options?: MutationConfig<BrandCompatibilityResult, { brandId1: string; brandId2: string }>
): UseMutationResult<BrandCompatibilityResult, ApiError, { brandId1: string; brandId2: string }, unknown> => {
  return useMutation({
    mutationKey: brandDiscoveryMutationKeys.compatibility,
    mutationFn: ({ brandId1, brandId2 }) => brandDiscoveryApi.calculateCompatibilityScore(brandId1, brandId2),
    ...options
  });
};

export const useBrandSearchSuggestions = (
  options?: MutationConfig<SearchSuggestion[], { query: string; limit?: number }>
): UseMutationResult<SearchSuggestion[], ApiError, { query: string; limit?: number }, unknown> => {
  return useMutation({
    mutationKey: brandDiscoveryMutationKeys.suggestions,
    mutationFn: ({ query, limit }) => brandDiscoveryApi.getSearchSuggestions(query, limit),
    ...options
  });
};
