'use client';

// src/hooks/features/media/useMediaData.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import mediaDataApi, {
  type MediaCategory,
  type MediaCategoryResponse,
  type MediaListQuery,
  type MediaListResponse,
  type MediaUpdatePayload
} from '@/lib/api/features/media/mediaData.api';
import type { MediaLeanDocument } from '@/lib/types/features/media';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const normalizeObject = <T extends Record<string, unknown> | undefined>(value?: T) => {
  if (!value) {
    return null;
  }
  return Object.keys(value).length ? { ...value } : null;
};

export const mediaDataQueryKeys = {
  root: ['media', 'data'] as const,
  item: (mediaId: string) => [...mediaDataQueryKeys.root, 'item', mediaId] as const,
  list: (params?: MediaListQuery) =>
    [...mediaDataQueryKeys.root, 'list', params ?? null] as const,
  category: (category: string) =>
    [...mediaDataQueryKeys.root, 'category', category] as const,
  recent: (limit?: number) => [...mediaDataQueryKeys.root, 'recent', limit ?? null] as const
};

export const mediaDataMutationKeys = {
  updateMetadata: [...mediaDataQueryKeys.root, 'update-metadata'] as const
};

export const useMediaItem = (
  mediaId: string,
  options?: QueryOptions<MediaLeanDocument>
): UseQueryResult<MediaLeanDocument, ApiError> => {
  return useQuery({
    queryKey: mediaDataQueryKeys.item(mediaId),
    queryFn: () => mediaDataApi.getMedia(mediaId),
    enabled: Boolean(mediaId) && (options?.enabled ?? true),
    ...options
  });
};

export const useMediaList = (
  params?: MediaListQuery,
  options?: QueryOptions<MediaListResponse>
): UseQueryResult<MediaListResponse, ApiError> => {
  return useQuery({
    queryKey: mediaDataQueryKeys.list(params),
    queryFn: () => mediaDataApi.listMedia(params),
    ...options
  });
};

export const useMediaByCategory = (
  category: MediaCategory,
  options?: QueryOptions<MediaCategoryResponse>
): UseQueryResult<MediaCategoryResponse, ApiError> => {
  return useQuery({
    queryKey: mediaDataQueryKeys.category(category),
    queryFn: () => mediaDataApi.getMediaByCategory(category),
    enabled: Boolean(category) && (options?.enabled ?? true),
    ...options
  });
};

export const useRecentMedia = (
  limit?: number,
  options?: QueryOptions<MediaLeanDocument[]>
): UseQueryResult<MediaLeanDocument[], ApiError> => {
  return useQuery({
    queryKey: mediaDataQueryKeys.recent(limit),
    queryFn: () => mediaDataApi.getRecentMedia(limit),
    ...options
  });
};

type UpdateMetadataVariables = {
  mediaId: string;
  payload: MediaUpdatePayload;
};

export const useUpdateMediaMetadata = (
  options?: MutationConfig<MediaLeanDocument, UpdateMetadataVariables>
): UseMutationResult<MediaLeanDocument, ApiError, UpdateMetadataVariables, unknown> => {
  return useMutation({
    mutationKey: mediaDataMutationKeys.updateMetadata,
    mutationFn: ({ mediaId, payload }) => mediaDataApi.updateMediaMetadata(mediaId, payload),
    ...options
  });
};
