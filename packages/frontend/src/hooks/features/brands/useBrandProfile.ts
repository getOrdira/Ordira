'use client';

// src/hooks/features/brands/useBrandProfile.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import brandProfileApi from '@/lib/api/features/brands/brandProfile.api';
import type { BrandProfile, BrandProfileSummary } from '@/lib/types/features/brands';
import type { PaginatedResponse } from '@/lib/types/core';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type SummaryListQueryOptions = Omit<
  UseQueryOptions<BrandProfileSummary[], ApiError, BrandProfileSummary[], QueryKey>,
  'queryKey' | 'queryFn'
>;

type PaginatedSummaryQueryOptions = Omit<
  UseQueryOptions<PaginatedResponse<BrandProfileSummary>, ApiError, PaginatedResponse<BrandProfileSummary>, QueryKey>,
  'queryKey' | 'queryFn'
>;

type BrandProfileQueryOptions = Omit<
  UseQueryOptions<BrandProfile, ApiError, BrandProfile, QueryKey>,
  'queryKey' | 'queryFn'
>;

const normalizeObject = <T extends object>(value?: T) => {
  if (!value) {
    return null;
  }
  return { ...value };
};

export const brandProfileQueryKeys = {
  root: ['brands', 'profile'] as const,
  trending: (params?: Record<string, unknown>) =>
    [...brandProfileQueryKeys.root, 'trending', normalizeObject(params)] as const,
  featured: (params?: Record<string, unknown>) =>
    [...brandProfileQueryKeys.root, 'featured', normalizeObject(params)] as const,
  search: (params: Record<string, unknown>) =>
    [...brandProfileQueryKeys.root, 'search', normalizeObject(params)] as const,
  list: (params?: Record<string, unknown>) =>
    [...brandProfileQueryKeys.root, 'list', normalizeObject(params)] as const,
  byDomain: (domain: string) => [...brandProfileQueryKeys.root, 'domain', domain] as const,
  bySubdomain: (subdomain: string) => [...brandProfileQueryKeys.root, 'subdomain', subdomain] as const,
  byId: (brandId: string, params?: Record<string, unknown>) =>
    [...brandProfileQueryKeys.root, 'id', brandId, normalizeObject(params)] as const,
  analytics: (brandId: string, params?: Record<string, unknown>) =>
    [...brandProfileQueryKeys.root, 'analytics', brandId, normalizeObject(params)] as const,
  connections: (brandId: string, params?: Record<string, unknown>) =>
    [...brandProfileQueryKeys.root, 'connections', brandId, normalizeObject(params)] as const,
  recommendations: (brandId: string, params?: Record<string, unknown>) =>
    [...brandProfileQueryKeys.root, 'recommendations', brandId, normalizeObject(params)] as const
};

export const brandProfileMutationKeys = {
  trackView: [...brandProfileQueryKeys.root, 'track-view'] as const
};

export const useTrendingBrands = (
  params?: { limit?: number; timeframe?: '24h' | '7d' | '30d' },
  options?: SummaryListQueryOptions
): UseQueryResult<BrandProfileSummary[], ApiError> => {
  return useQuery({
    queryKey: brandProfileQueryKeys.trending(params ?? {}),
    queryFn: () => brandProfileApi.getTrendingBrands(params),
    ...options
  });
};

export const useFeaturedBrands = (
  params?: { limit?: number },
  options?: SummaryListQueryOptions
): UseQueryResult<BrandProfileSummary[], ApiError> => {
  return useQuery({
    queryKey: brandProfileQueryKeys.featured(params ?? {}),
    queryFn: () => brandProfileApi.getFeaturedBrands(params),
    ...options
  });
};

export const useBrandSearch = (
  params: {
    query: string;
    page?: number;
    limit?: number;
    industry?: string;
    location?: string;
  },
  options?: PaginatedSummaryQueryOptions
): UseQueryResult<PaginatedResponse<BrandProfileSummary>, ApiError> => {
  return useQuery({
    queryKey: brandProfileQueryKeys.search(params),
    queryFn: () => brandProfileApi.searchBrands(params),
    enabled: Boolean(params?.query) && (options?.enabled ?? true),
    ...options
  });
};

export const useBrandProfiles = (
  params?: {
    page?: number;
    limit?: number;
    industry?: string;
    location?: string;
    verified?: boolean;
    plan?: string;
    sortBy?: 'name' | 'created' | 'popularity' | 'relevance';
    sortOrder?: 'asc' | 'desc';
    search?: string;
  },
  options?: PaginatedSummaryQueryOptions
): UseQueryResult<PaginatedResponse<BrandProfileSummary>, ApiError> => {
  return useQuery({
    queryKey: brandProfileQueryKeys.list(params ?? {}),
    queryFn: () => brandProfileApi.listBrandProfiles(params),
    ...options
  });
};

export const useBrandProfileByDomain = (
  domain: string,
  options?: BrandProfileQueryOptions
): UseQueryResult<BrandProfile, ApiError> => {
  return useQuery({
    queryKey: brandProfileQueryKeys.byDomain(domain),
    queryFn: () => brandProfileApi.getBrandByDomain(domain),
    enabled: Boolean(domain) && (options?.enabled ?? true),
    ...options
  });
};

export const useBrandProfileBySubdomain = (
  subdomain: string,
  options?: BrandProfileQueryOptions
): UseQueryResult<BrandProfile, ApiError> => {
  return useQuery({
    queryKey: brandProfileQueryKeys.bySubdomain(subdomain),
    queryFn: () => brandProfileApi.getBrandBySubdomain(subdomain),
    enabled: Boolean(subdomain) && (options?.enabled ?? true),
    ...options
  });
};

export const useBrandProfileById = (
  brandId: string,
  params?: { includeAnalytics?: boolean; includeConnections?: boolean },
  options?: BrandProfileQueryOptions
): UseQueryResult<BrandProfile, ApiError> => {
  return useQuery({
    queryKey: brandProfileQueryKeys.byId(brandId, params ?? {}),
    queryFn: () => brandProfileApi.getBrandById(brandId, params),
    enabled: Boolean(brandId) && (options?.enabled ?? true),
    ...options
  });
};

export const useBrandAnalytics = (
  brandId: string,
  params?: { timeframe?: '24h' | '7d' | '30d' | '90d' | '1y' | 'all'; metrics?: string[] },
  options?: UseQueryOptions<any, ApiError, any, QueryKey>
): UseQueryResult<any, ApiError> => {
  return useQuery({
    queryKey: brandProfileQueryKeys.analytics(brandId, params ?? {}),
    queryFn: () => brandProfileApi.getBrandAnalytics(brandId, params),
    enabled: Boolean(brandId) && (options?.enabled ?? true),
    ...options
  });
};

export const useBrandConnections = (
  brandId: string,
  params?: { page?: number; limit?: number; type?: 'sent' | 'received' | 'accepted' | 'pending' },
  options?: UseQueryOptions<PaginatedResponse<any>, ApiError, PaginatedResponse<any>, QueryKey>
): UseQueryResult<PaginatedResponse<any>, ApiError> => {
  return useQuery({
    queryKey: brandProfileQueryKeys.connections(brandId, params ?? {}),
    queryFn: () => brandProfileApi.getBrandConnections(brandId, params),
    enabled: Boolean(brandId) && (options?.enabled ?? true),
    ...options
  });
};

export const useBrandRecommendationsById = (
  brandId: string,
  params?: { type?: 'connections' | 'products' | 'features'; limit?: number },
  options?: UseQueryOptions<any[], ApiError, any[], QueryKey>
): UseQueryResult<any[], ApiError> => {
  return useQuery({
    queryKey: brandProfileQueryKeys.recommendations(brandId, params ?? {}),
    queryFn: () => brandProfileApi.getBrandRecommendations(brandId, params),
    enabled: Boolean(brandId) && (options?.enabled ?? true),
    ...options
  });
};

export const useTrackBrandView = (
  options?: MutationConfig<void, string>
): UseMutationResult<void, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: brandProfileMutationKeys.trackView,
    mutationFn: brandProfileApi.trackBrandView,
    ...options
  });
};
