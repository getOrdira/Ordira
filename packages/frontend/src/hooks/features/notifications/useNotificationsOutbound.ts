'use client';

// src/hooks/features/notifications/useNotificationsOutbound.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import notificationsOutboundApi, {
  type NotificationPlanChangeInput,
  type NotificationCancellationInput,
  type NotificationRenewalInput,
  type NotificationPaymentFailedInput,
  type NotificationSubscriptionWelcomeInput,
  type NotificationAccountDeletionInput,
  type NotificationOutboundResponse
} from '@/lib/api/features/notifications/notificationsOutbound.api';
import { ApiError } from '@/lib/errors/errors';

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const notificationsOutboundMutationKeys = {
  planChange: ['notifications', 'outbound', 'plan-change'] as const,
  cancellation: ['notifications', 'outbound', 'cancellation'] as const,
  renewal: ['notifications', 'outbound', 'renewal'] as const,
  paymentFailed: ['notifications', 'outbound', 'payment-failed'] as const,
  subscriptionWelcome: ['notifications', 'outbound', 'subscription-welcome'] as const,
  accountDeletion: ['notifications', 'outbound', 'account-deletion'] as const
};

export const useSendPlanChangeNotification = (
  options?: MutationOptions<NotificationOutboundResponse, NotificationPlanChangeInput>
): UseMutationResult<
  NotificationOutboundResponse,
  ApiError,
  NotificationPlanChangeInput,
  unknown
> => {
  return useMutation({
    mutationKey: notificationsOutboundMutationKeys.planChange,
    mutationFn: notificationsOutboundApi.sendPlanChange,
    ...options
  });
};

export const useSendCancellationNotification = (
  options?: MutationOptions<NotificationOutboundResponse, NotificationCancellationInput>
): UseMutationResult<
  NotificationOutboundResponse,
  ApiError,
  NotificationCancellationInput,
  unknown
> => {
  return useMutation({
    mutationKey: notificationsOutboundMutationKeys.cancellation,
    mutationFn: notificationsOutboundApi.sendCancellation,
    ...options
  });
};

export const useSendRenewalNotification = (
  options?: MutationOptions<NotificationOutboundResponse, NotificationRenewalInput>
): UseMutationResult<
  NotificationOutboundResponse,
  ApiError,
  NotificationRenewalInput,
  unknown
> => {
  return useMutation({
    mutationKey: notificationsOutboundMutationKeys.renewal,
    mutationFn: notificationsOutboundApi.sendRenewal,
    ...options
  });
};

export const useSendPaymentFailedNotification = (
  options?: MutationOptions<NotificationOutboundResponse, NotificationPaymentFailedInput>
): UseMutationResult<
  NotificationOutboundResponse,
  ApiError,
  NotificationPaymentFailedInput,
  unknown
> => {
  return useMutation({
    mutationKey: notificationsOutboundMutationKeys.paymentFailed,
    mutationFn: notificationsOutboundApi.sendPaymentFailed,
    ...options
  });
};

export const useSendSubscriptionWelcomeNotification = (
  options?: MutationOptions<NotificationOutboundResponse, NotificationSubscriptionWelcomeInput>
): UseMutationResult<
  NotificationOutboundResponse,
  ApiError,
  NotificationSubscriptionWelcomeInput,
  unknown
> => {
  return useMutation({
    mutationKey: notificationsOutboundMutationKeys.subscriptionWelcome,
    mutationFn: notificationsOutboundApi.sendSubscriptionWelcome,
    ...options
  });
};

export const useSendAccountDeletionNotification = (
  options?: MutationOptions<NotificationOutboundResponse, NotificationAccountDeletionInput>
): UseMutationResult<
  NotificationOutboundResponse,
  ApiError,
  NotificationAccountDeletionInput,
  unknown
> => {
  return useMutation({
    mutationKey: notificationsOutboundMutationKeys.accountDeletion,
    mutationFn: notificationsOutboundApi.sendAccountDeletionConfirmation,
    ...options
  });
};
