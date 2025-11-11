'use client';

// src/hooks/features/media/useMediaDeletion.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import mediaDeletionApi, {
  type CleanupOrphanedResult,
  type DeleteByCategoryResult,
  type DeleteMediaResult,
  type DeleteMultipleMediaResult,
  type MediaCategory
} from '@/lib/api/features/media/mediaDeletion.api';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type DeleteMediaVariables = string;
type DeleteMultipleVariables = string[];
type DeleteByCategoryVariables = MediaCategory;
type CleanupVariables = string | undefined;

export const mediaDeletionMutationKeys = {
  deleteOne: ['media', 'deletion', 'delete-one'] as const,
  deleteMany: ['media', 'deletion', 'delete-many'] as const,
  deleteCategory: ['media', 'deletion', 'delete-category'] as const,
  cleanupOrphaned: ['media', 'deletion', 'cleanup'] as const
};

export const useDeleteMedia = (
  options?: MutationConfig<DeleteMediaResult, DeleteMediaVariables>
): UseMutationResult<DeleteMediaResult, ApiError, DeleteMediaVariables, unknown> => {
  return useMutation({
    mutationKey: mediaDeletionMutationKeys.deleteOne,
    mutationFn: mediaDeletionApi.deleteMedia,
    ...options
  });
};

export const useDeleteMultipleMedia = (
  options?: MutationConfig<DeleteMultipleMediaResult, DeleteMultipleVariables>
): UseMutationResult<
  DeleteMultipleMediaResult,
  ApiError,
  DeleteMultipleVariables,
  unknown
> => {
  return useMutation({
    mutationKey: mediaDeletionMutationKeys.deleteMany,
    mutationFn: mediaDeletionApi.deleteMultipleMedia,
    ...options
  });
};

export const useDeleteMediaByCategory = (
  options?: MutationConfig<DeleteByCategoryResult, DeleteByCategoryVariables>
): UseMutationResult<
  DeleteByCategoryResult,
  ApiError,
  DeleteByCategoryVariables,
  unknown
> => {
  return useMutation({
    mutationKey: mediaDeletionMutationKeys.deleteCategory,
    mutationFn: mediaDeletionApi.deleteByCategory,
    ...options
  });
};

export const useCleanupOrphanedMedia = (
  options?: MutationConfig<CleanupOrphanedResult, CleanupVariables>
): UseMutationResult<CleanupOrphanedResult, ApiError, CleanupVariables, unknown> => {
  return useMutation({
    mutationKey: mediaDeletionMutationKeys.cleanupOrphaned,
    mutationFn: mediaDeletionApi.cleanupOrphanedMedia,
    ...options
  });
};
