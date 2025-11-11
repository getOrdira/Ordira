'use client';

// src/hooks/features/media/useMediaAnalytics.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import mediaAnalyticsApi, {
  type MediaCategory,
  type MediaUsageTrends
} from '@/lib/api/features/media/mediaAnalytics.api';
import type { CategoryStats, MediaStats } from '@/lib/types/features/media';
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

export const mediaAnalyticsQueryKeys = {
  root: ['media', 'analytics'] as const,
  storage: () => [...mediaAnalyticsQueryKeys.root, 'storage'] as const,
  category: (category: MediaCategory) =>
    [...mediaAnalyticsQueryKeys.root, 'category', category] as const,
  trends: (options?: { days?: number }) =>
    [...mediaAnalyticsQueryKeys.root, 'trends', normalizeParams(options)] as const
};

export const useMediaStorageStatistics = (
  options?: QueryOptions<MediaStats>
): UseQueryResult<MediaStats, ApiError> => {
  return useQuery({
    queryKey: mediaAnalyticsQueryKeys.storage(),
    queryFn: () => mediaAnalyticsApi.getStorageStatistics(),
    ...options
  });
};

export const useMediaCategoryStatistics = (
  category: MediaCategory,
  options?: QueryOptions<CategoryStats>
): UseQueryResult<CategoryStats, ApiError> => {
  return useQuery({
    queryKey: mediaAnalyticsQueryKeys.category(category),
    queryFn: () => mediaAnalyticsApi.getCategoryStatistics(category),
    enabled: Boolean(category) && (options?.enabled ?? true),
    ...options
  });
};

export const useMediaUsageTrends = (
  params?: { days?: number },
  options?: QueryOptions<MediaUsageTrends>
): UseQueryResult<MediaUsageTrends, ApiError> => {
  return useQuery({
    queryKey: mediaAnalyticsQueryKeys.trends(params),
    queryFn: () => mediaAnalyticsApi.getUsageTrends(params),
    ...options
  });
};
