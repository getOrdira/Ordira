'use client';

// src/hooks/features/notifications/useNotificationsAnalytics.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import notificationsAnalyticsApi from '@/lib/api/features/notifications/notificationsAnalytics.api';
import type { NotificationStats } from '@/lib/types/features/notifications';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

export const notificationsAnalyticsQueryKeys = {
  root: ['notifications', 'analytics'] as const,
  stats: () => [...notificationsAnalyticsQueryKeys.root, 'stats'] as const
};

export const useNotificationsAnalyticsStats = (
  options?: QueryOptions<NotificationStats>
): UseQueryResult<NotificationStats, ApiError> => {
  return useQuery({
    queryKey: notificationsAnalyticsQueryKeys.stats(),
    queryFn: () => notificationsAnalyticsApi.getStats(),
    ...options
  });
};
