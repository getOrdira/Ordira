'use client';

// src/hooks/features/notifications/useNotificationsPreferences.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import notificationsPreferencesApi, {
  type NotificationPreferencesResponse,
  type NotificationPreferencesUpdateInput
} from '@/lib/api/features/notifications/notificationsPreferences.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const notificationsPreferencesQueryKeys = {
  root: ['notifications', 'preferences'] as const,
  detail: () => [...notificationsPreferencesQueryKeys.root, 'detail'] as const
};

export const notificationsPreferencesMutationKeys = {
  update: [...notificationsPreferencesQueryKeys.root, 'update'] as const
};

export const useNotificationPreferences = (
  options?: QueryOptions<NotificationPreferencesResponse>
): UseQueryResult<NotificationPreferencesResponse, ApiError> => {
  return useQuery({
    queryKey: notificationsPreferencesQueryKeys.detail(),
    queryFn: () => notificationsPreferencesApi.getPreferences(),
    ...options
  });
};

export const useUpdateNotificationPreferences = (
  options?: MutationOptions<NotificationPreferencesResponse, NotificationPreferencesUpdateInput>
): UseMutationResult<
  NotificationPreferencesResponse,
  ApiError,
  NotificationPreferencesUpdateInput,
  unknown
> => {
  return useMutation({
    mutationKey: notificationsPreferencesMutationKeys.update,
    mutationFn: notificationsPreferencesApi.updatePreferences,
    ...options
  });
};
