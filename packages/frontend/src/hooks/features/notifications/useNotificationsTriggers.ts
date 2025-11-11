'use client';

// src/hooks/features/notifications/useNotificationsTriggers.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import notificationsTriggersApi, {
  type NotificationTriggerInput,
  type NotificationTriggerResponse
} from '@/lib/api/features/notifications/notificationsTriggers.api';
import { ApiError } from '@/lib/errors/errors';

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const notificationsTriggersMutationKeys = {
  handleEvent: ['notifications', 'triggers', 'handle-event'] as const
};

export const useHandleNotificationTrigger = (
  options?: MutationOptions<NotificationTriggerResponse, NotificationTriggerInput>
): UseMutationResult<
  NotificationTriggerResponse,
  ApiError,
  NotificationTriggerInput,
  unknown
> => {
  return useMutation({
    mutationKey: notificationsTriggersMutationKeys.handleEvent,
    mutationFn: notificationsTriggersApi.handleEvent,
    ...options
  });
};
