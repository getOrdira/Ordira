'use client';

// src/hooks/features/media/useMediaUpload.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import mediaUploadApi, {
  type BatchUploadApiResponse,
  type MediaUploadRequestOptions
} from '@/lib/api/features/media/mediaUpload.api';
import type { MediaDocument } from '@/lib/types/features/media';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type UploadMediaVariables = {
  file: File;
  options?: MediaUploadRequestOptions;
};

type UploadBatchVariables = {
  files: File[];
  options?: MediaUploadRequestOptions;
};

export const mediaUploadMutationKeys = {
  single: ['media', 'upload', 'single'] as const,
  batch: ['media', 'upload', 'batch'] as const
};

export const useUploadMedia = (
  options?: MutationConfig<MediaDocument, UploadMediaVariables>
): UseMutationResult<MediaDocument, ApiError, UploadMediaVariables, unknown> => {
  return useMutation({
    mutationKey: mediaUploadMutationKeys.single,
    mutationFn: ({ file, options: uploadOptions }) =>
      mediaUploadApi.uploadMedia(file, uploadOptions),
    ...options
  });
};

export const useUploadBatchMedia = (
  options?: MutationConfig<BatchUploadApiResponse, UploadBatchVariables>
): UseMutationResult<BatchUploadApiResponse, ApiError, UploadBatchVariables, unknown> => {
  return useMutation({
    mutationKey: mediaUploadMutationKeys.batch,
    mutationFn: ({ files, options: uploadOptions }) =>
      mediaUploadApi.uploadBatchMedia(files, uploadOptions),
    ...options
  });
};
