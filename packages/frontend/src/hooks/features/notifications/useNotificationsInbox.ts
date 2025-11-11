'use client';

// src/hooks/features/notifications/useNotificationsInbox.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import notificationsInboxApi, {
  type NotificationListQuery,
  type NotificationListResponse,
  type NotificationCreateInput
} from '@/lib/api/features/notifications/notificationsInbox.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type NotificationListResult = NotificationListResponse;
type NotificationUnreadListResult = Awaited<
  ReturnType<typeof notificationsInboxApi.getUnreadNotifications>
>;
type NotificationDetailResult = Awaited<
  ReturnType<typeof notificationsInboxApi.getNotification>
>;
type MarkNotificationResult = Awaited<
  ReturnType<typeof notificationsInboxApi.markNotificationAsRead>
>;
type MarkAllResult = Awaited<ReturnType<typeof notificationsInboxApi.markAllAsRead>>;
type DeleteNotificationResult = Awaited<
  ReturnType<typeof notificationsInboxApi.deleteNotification>
>;
type BulkDeleteResult = Awaited<
  ReturnType<typeof notificationsInboxApi.bulkDeleteNotifications>
>;
type NotificationsByTypeResult = Awaited<
  ReturnType<typeof notificationsInboxApi.getNotificationsByType>
>;
type CreateNotificationResult = Awaited<
  ReturnType<typeof notificationsInboxApi.createNotification>
>;

const normalizeListQuery = (query?: NotificationListQuery) => {
  if (!query) {
    return null;
  }
  return { ...query };
};

const normalizeLimit = (limit?: number) => (typeof limit === 'number' ? limit : null);

export const notificationsInboxQueryKeys = {
  root: ['notifications', 'inbox'] as const,
  list: (query?: NotificationListQuery) =>
    [...notificationsInboxQueryKeys.root, 'list', normalizeListQuery(query)] as const,
  unread: () => [...notificationsInboxQueryKeys.root, 'unread'] as const,
  detail: (notificationId: string) =>
    [...notificationsInboxQueryKeys.root, 'detail', notificationId] as const,
  byType: (type: string, limit?: number) =>
    [
      ...notificationsInboxQueryKeys.root,
      'type',
      type,
      normalizeLimit(limit)
    ] as const
};

export const notificationsInboxMutationKeys = {
  markRead: [...notificationsInboxQueryKeys.root, 'mark-read'] as const,
  markAll: [...notificationsInboxQueryKeys.root, 'mark-all'] as const,
  delete: [...notificationsInboxQueryKeys.root, 'delete'] as const,
  bulkDelete: [...notificationsInboxQueryKeys.root, 'bulk-delete'] as const,
  create: [...notificationsInboxQueryKeys.root, 'create'] as const
};

export const useNotificationsList = (
  query?: NotificationListQuery,
  options?: QueryOptions<NotificationListResult>
): UseQueryResult<NotificationListResult, ApiError> => {
  return useQuery({
    queryKey: notificationsInboxQueryKeys.list(query),
    queryFn: () => notificationsInboxApi.listNotifications(query),
    ...options
  });
};

export const useUnreadNotifications = (
  options?: QueryOptions<NotificationUnreadListResult>
): UseQueryResult<NotificationUnreadListResult, ApiError> => {
  return useQuery({
    queryKey: notificationsInboxQueryKeys.unread(),
    queryFn: () => notificationsInboxApi.getUnreadNotifications(),
    ...options
  });
};

export const useNotificationDetail = (
  notificationId: string,
  options?: QueryOptions<NotificationDetailResult>
): UseQueryResult<NotificationDetailResult, ApiError> => {
  return useQuery({
    queryKey: notificationsInboxQueryKeys.detail(notificationId),
    queryFn: () => notificationsInboxApi.getNotification(notificationId),
    enabled: Boolean(notificationId) && (options?.enabled ?? true),
    ...options
  });
};

export const useNotificationsByType = (
  type: string,
  limit?: number,
  options?: QueryOptions<NotificationsByTypeResult>
): UseQueryResult<NotificationsByTypeResult, ApiError> => {
  return useQuery({
    queryKey: notificationsInboxQueryKeys.byType(type, limit),
    queryFn: () => notificationsInboxApi.getNotificationsByType(type, limit),
    enabled: Boolean(type) && (options?.enabled ?? true),
    ...options
  });
};

export const useMarkNotificationAsRead = (
  options?: MutationOptions<MarkNotificationResult, string>
): UseMutationResult<MarkNotificationResult, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: notificationsInboxMutationKeys.markRead,
    mutationFn: (notificationId: string) =>
      notificationsInboxApi.markNotificationAsRead(notificationId),
    ...options
  });
};

export const useMarkAllNotificationsAsRead = (
  options?: MutationOptions<MarkAllResult, void>
): UseMutationResult<MarkAllResult, ApiError, void, unknown> => {
  return useMutation({
    mutationKey: notificationsInboxMutationKeys.markAll,
    mutationFn: () => notificationsInboxApi.markAllAsRead(),
    ...options
  });
};

export const useDeleteNotification = (
  options?: MutationOptions<DeleteNotificationResult, string>
): UseMutationResult<DeleteNotificationResult, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: notificationsInboxMutationKeys.delete,
    mutationFn: (notificationId: string) =>
      notificationsInboxApi.deleteNotification(notificationId),
    ...options
  });
};

export const useBulkDeleteNotifications = (
  options?: MutationOptions<BulkDeleteResult, string[]>
): UseMutationResult<BulkDeleteResult, ApiError, string[], unknown> => {
  return useMutation({
    mutationKey: notificationsInboxMutationKeys.bulkDelete,
    mutationFn: (notificationIds: string[]) =>
      notificationsInboxApi.bulkDeleteNotifications(notificationIds),
    ...options
  });
};

export const useCreateNotification = (
  options?: MutationOptions<CreateNotificationResult, NotificationCreateInput>
): UseMutationResult<
  CreateNotificationResult,
  ApiError,
  NotificationCreateInput,
  unknown
> => {
  return useMutation({
    mutationKey: notificationsInboxMutationKeys.create,
    mutationFn: notificationsInboxApi.createNotification,
    ...options
  });
};
