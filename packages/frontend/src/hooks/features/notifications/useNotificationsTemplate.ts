'use client';

// src/hooks/features/notifications/useNotificationsTemplate.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import notificationsTemplateApi, {
  type NotificationTemplateMetadataResponse,
  type NotificationTemplateRenderResponse
} from '@/lib/api/features/notifications/notificationsTemplate.api';
import type { TemplateContext } from '@/lib/types/features/notifications';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

interface RenderTemplateVariables {
  templateKey: string;
  context: TemplateContext;
}

export const notificationsTemplateQueryKeys = {
  root: ['notifications', 'template'] as const,
  metadata: (templateKey: string) =>
    [...notificationsTemplateQueryKeys.root, 'metadata', templateKey] as const
};

export const notificationsTemplateMutationKeys = {
  render: [...notificationsTemplateQueryKeys.root, 'render'] as const
};

export const useNotificationTemplateMetadata = (
  templateKey: string,
  options?: QueryOptions<NotificationTemplateMetadataResponse>
): UseQueryResult<NotificationTemplateMetadataResponse, ApiError> => {
  return useQuery({
    queryKey: notificationsTemplateQueryKeys.metadata(templateKey),
    queryFn: () => notificationsTemplateApi.resolveTemplate(templateKey),
    enabled: Boolean(templateKey) && (options?.enabled ?? true),
    ...options
  });
};

export const useRenderNotificationTemplate = (
  options?: MutationOptions<NotificationTemplateRenderResponse, RenderTemplateVariables>
): UseMutationResult<
  NotificationTemplateRenderResponse,
  ApiError,
  RenderTemplateVariables,
  unknown
> => {
  return useMutation({
    mutationKey: notificationsTemplateMutationKeys.render,
    mutationFn: ({ templateKey, context }: RenderTemplateVariables) =>
      notificationsTemplateApi.renderTemplate(templateKey, context),
    ...options
  });
};
