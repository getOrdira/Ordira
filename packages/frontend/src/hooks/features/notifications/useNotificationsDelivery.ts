'use client';

// src/hooks/features/notifications/useNotificationsDelivery.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import notificationsDeliveryApi, {
  type DeliverNotificationInput,
  type NotificationDeliveryResult,
  type NotificationChannelTestResults
} from '@/lib/api/features/notifications/notificationsDelivery.api';
import { ApiError } from '@/lib/errors/errors';

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const notificationsDeliveryMutationKeys = {
  deliver: ['notifications', 'delivery', 'deliver'] as const,
  testChannels: ['notifications', 'delivery', 'test-channels'] as const
};

export const useDeliverNotification = (
  options?: MutationOptions<NotificationDeliveryResult, DeliverNotificationInput>
): UseMutationResult<NotificationDeliveryResult, ApiError, DeliverNotificationInput, unknown> => {
  return useMutation({
    mutationKey: notificationsDeliveryMutationKeys.deliver,
    mutationFn: notificationsDeliveryApi.deliverNotification,
    ...options
  });
};

export const useTestNotificationChannels = (
  options?: MutationOptions<NotificationChannelTestResults, void>
): UseMutationResult<NotificationChannelTestResults, ApiError, void, unknown> => {
  return useMutation({
    mutationKey: notificationsDeliveryMutationKeys.testChannels,
    mutationFn: () => notificationsDeliveryApi.testChannelConfigurations(),
    ...options
  });
};
