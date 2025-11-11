'use client';

// src/hooks/features/notifications/useNotificationsBatching.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import notificationsBatchingApi, {
  type NotificationDigestProcessOptions,
  type NotificationDigestProcessResult
} from '@/lib/api/features/notifications/notificationsBatching.api';
import { ApiError } from '@/lib/errors/errors';

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const notificationsBatchingMutationKeys = {
  process: ['notifications', 'batching', 'process-digests'] as const
};

export const useProcessNotificationDigests = (
  options?: MutationOptions<
    NotificationDigestProcessResult,
    NotificationDigestProcessOptions | undefined
  >
): UseMutationResult<
  NotificationDigestProcessResult,
  ApiError,
  NotificationDigestProcessOptions | undefined,
  unknown
> => {
  return useMutation({
    mutationKey: notificationsBatchingMutationKeys.process,
    mutationFn: (variables?: NotificationDigestProcessOptions) =>
      notificationsBatchingApi.processPendingDigests(variables),
    ...options
  });
};
