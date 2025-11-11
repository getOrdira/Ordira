'use client';

// src/hooks/features/notifications/useNotificationsMaintenance.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import notificationsMaintenanceApi, {
  type NotificationCleanupOptions,
  type NotificationCleanupResult
} from '@/lib/api/features/notifications/notificationsMaintenance.api';
import { ApiError } from '@/lib/errors/errors';

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const notificationsMaintenanceMutationKeys = {
  cleanup: ['notifications', 'maintenance', 'cleanup'] as const
};

export const useCleanupNotifications = (
  options?: MutationOptions<NotificationCleanupResult, NotificationCleanupOptions | undefined>
): UseMutationResult<
  NotificationCleanupResult,
  ApiError,
  NotificationCleanupOptions | undefined,
  unknown
> => {
  return useMutation({
    mutationKey: notificationsMaintenanceMutationKeys.cleanup,
    mutationFn: (variables?: NotificationCleanupOptions) =>
      notificationsMaintenanceApi.cleanupOldNotifications(variables),
    ...options
  });
};
