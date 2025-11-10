'use client';

// src/hooks/features/brands/useBrandCompleteness.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import brandCompletenessApi, {
  type BrandCompletenessParams
} from '@/lib/api/features/brands/brandCompleteness.api';
import type { CompletenessConfig, CompletenessResult } from '@/lib/types/features/brands';
import { ApiError } from '@/lib/errors/errors';

const normalizeParams = (params?: BrandCompletenessParams) => {
  if (!params) {
    return null;
  }
  return {
    ...params,
    includeRecommendations: params.includeRecommendations ?? false
  };
};

export const brandCompletenessQueryKeys = {
  root: ['brands', 'completeness'] as const,
  profile: (params?: BrandCompletenessParams) =>
    [...brandCompletenessQueryKeys.root, 'profile', normalizeParams(params)] as const,
  settings: (params?: BrandCompletenessParams) =>
    [...brandCompletenessQueryKeys.root, 'settings', normalizeParams(params)] as const,
  integrations: (params?: BrandCompletenessParams) =>
    [...brandCompletenessQueryKeys.root, 'integrations', normalizeParams(params)] as const,
  overall: (params?: BrandCompletenessParams) =>
    [...brandCompletenessQueryKeys.root, 'overall', normalizeParams(params)] as const,
  profileConfig: (plan: string) => [...brandCompletenessQueryKeys.root, 'config', 'profile', plan] as const,
  settingsConfig: (plan: string) => [...brandCompletenessQueryKeys.root, 'config', 'settings', plan] as const,
  integrationConfig: (plan: string) =>
    [...brandCompletenessQueryKeys.root, 'config', 'integrations', plan] as const,
  legacyProfile: () => [...brandCompletenessQueryKeys.root, 'legacy', 'profile'] as const,
  legacySetup: () => [...brandCompletenessQueryKeys.root, 'legacy', 'setup'] as const
};

type CompletenessQueryOptions = Omit<
  UseQueryOptions<CompletenessResult, ApiError, CompletenessResult, QueryKey>,
  'queryKey' | 'queryFn'
>;

type ConfigQueryOptions = Omit<
  UseQueryOptions<CompletenessConfig, ApiError, CompletenessConfig, QueryKey>,
  'queryKey' | 'queryFn'
>;

type LegacyScoreQueryOptions = Omit<
  UseQueryOptions<number, ApiError, number, QueryKey>,
  'queryKey' | 'queryFn'
>;

export const useBrandProfileCompletenessScore = (
  params?: BrandCompletenessParams,
  options?: CompletenessQueryOptions
): UseQueryResult<CompletenessResult, ApiError> => {
  return useQuery({
    queryKey: brandCompletenessQueryKeys.profile(params),
    queryFn: () => brandCompletenessApi.getProfileCompleteness(params),
    ...options
  });
};

export const useBrandSettingsCompletenessScore = (
  params?: BrandCompletenessParams,
  options?: CompletenessQueryOptions
): UseQueryResult<CompletenessResult, ApiError> => {
  return useQuery({
    queryKey: brandCompletenessQueryKeys.settings(params),
    queryFn: () => brandCompletenessApi.getSettingsCompleteness(params),
    ...options
  });
};

export const useBrandIntegrationCompletenessScore = (
  params?: BrandCompletenessParams,
  options?: CompletenessQueryOptions
): UseQueryResult<CompletenessResult, ApiError> => {
  return useQuery({
    queryKey: brandCompletenessQueryKeys.integrations(params),
    queryFn: () => brandCompletenessApi.getIntegrationCompleteness(params),
    ...options
  });
};

export const useBrandOverallCompletenessScore = (
  params?: BrandCompletenessParams,
  options?: CompletenessQueryOptions
): UseQueryResult<CompletenessResult, ApiError> => {
  return useQuery({
    queryKey: brandCompletenessQueryKeys.overall(params),
    queryFn: () => brandCompletenessApi.getOverallCompleteness(params),
    ...options
  });
};

export const useBrandProfileCompletenessConfig = (
  plan: string,
  options?: ConfigQueryOptions
): UseQueryResult<CompletenessConfig, ApiError> => {
  return useQuery({
    queryKey: brandCompletenessQueryKeys.profileConfig(plan),
    queryFn: () => brandCompletenessApi.getProfileConfig(plan),
    enabled: Boolean(plan) && (options?.enabled ?? true),
    ...options
  });
};

export const useBrandSettingsCompletenessConfig = (
  plan: string,
  options?: ConfigQueryOptions
): UseQueryResult<CompletenessConfig, ApiError> => {
  return useQuery({
    queryKey: brandCompletenessQueryKeys.settingsConfig(plan),
    queryFn: () => brandCompletenessApi.getSettingsConfig(plan),
    enabled: Boolean(plan) && (options?.enabled ?? true),
    ...options
  });
};

export const useBrandIntegrationCompletenessConfig = (
  plan: string,
  options?: ConfigQueryOptions
): UseQueryResult<CompletenessConfig, ApiError> => {
  return useQuery({
    queryKey: brandCompletenessQueryKeys.integrationConfig(plan),
    queryFn: () => brandCompletenessApi.getIntegrationConfig(plan),
    enabled: Boolean(plan) && (options?.enabled ?? true),
    ...options
  });
};

export const useLegacyProfileCompletenessScore = (
  options?: LegacyScoreQueryOptions
): UseQueryResult<number, ApiError> => {
  return useQuery({
    queryKey: brandCompletenessQueryKeys.legacyProfile(),
    queryFn: () => brandCompletenessApi.getLegacyProfileScore(),
    ...options
  });
};

export const useLegacySetupCompletenessScore = (
  options?: LegacyScoreQueryOptions
): UseQueryResult<number, ApiError> => {
  return useQuery({
    queryKey: brandCompletenessQueryKeys.legacySetup(),
    queryFn: () => brandCompletenessApi.getLegacySetupScore(),
    ...options
  });
};
