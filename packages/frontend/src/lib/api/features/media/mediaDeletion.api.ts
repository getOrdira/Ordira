import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/media';

type HttpMethod = 'POST' | 'DELETE';

const createDeletionLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'media',
  module: 'deletion',
  method,
  endpoint,
  ...context
});

const MEDIA_CATEGORIES = ['profile', 'product', 'banner', 'certificate', 'document'] as const;

export type MediaCategory = typeof MEDIA_CATEGORIES[number];

export interface DeleteMediaResult {
  deleted: boolean;
  filename: string;
  fileSize: number;
  deletedAt: string | Date;
  s3Key?: string;
}

export interface DeleteMultipleMediaResult {
  deleted: number;
  failed: number;
  totalSize: number;
  errors: string[];
}

export interface DeleteByCategoryResult {
  deleted: number;
  totalSize: number;
}

export interface CleanupOrphanedResult {
  cleaned: number;
  errors: string[];
}

export const mediaDeletionApi = {
  /**
   * Delete a single media file.
   * DELETE /api/media/:mediaId
   */
  async deleteMedia(mediaId: string): Promise<DeleteMediaResult> {
    const endpoint = `${BASE_PATH}/${sanitizeObjectId(mediaId, 'mediaId')}`;
    try {
      const response = await api.delete<ApiResponse<DeleteMediaResult>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to delete media file',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createDeletionLogContext('DELETE', endpoint, { mediaId })
      );
    }
  },

  /**
   * Delete multiple media files in batch.
   * POST /api/media/delete/batch
   */
  async deleteMultipleMedia(mediaIds: string[]): Promise<DeleteMultipleMediaResult> {
    const endpoint = `${BASE_PATH}/delete/batch`;
    try {
      const response = await api.post<ApiResponse<DeleteMultipleMediaResult>>(
        endpoint,
        baseApi.sanitizeRequestData({
          mediaIds: sanitizeArray(
            mediaIds,
            'mediaIds',
            (id, index) => sanitizeObjectId(id as string, `mediaIds[${index}]`),
            { minLength: 1, maxLength: 100 }
          )
        })
      );
      return baseApi.handleResponse(
        response,
        'Failed to delete media files',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createDeletionLogContext('POST', endpoint, { count: mediaIds.length })
      );
    }
  },

  /**
   * Delete all media assets for a specific category.
   * DELETE /api/media/category
   */
  async deleteByCategory(category: MediaCategory): Promise<DeleteByCategoryResult> {
    const endpoint = `${BASE_PATH}/category`;
    try {
      const response = await api.delete<ApiResponse<DeleteByCategoryResult>>(endpoint, {
        params: baseApi.sanitizeQueryParams({
          category: sanitizeString(category, 'category', {
            allowedValues: MEDIA_CATEGORIES
          })
        })
      });
      return baseApi.handleResponse(
        response,
        'Failed to delete category media',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createDeletionLogContext('DELETE', endpoint, { category })
      );
    }
  },

  /**
   * Clean up orphaned media files.
   * POST /api/media/cleanup/orphaned
   */
  async cleanupOrphanedMedia(notes?: string): Promise<CleanupOrphanedResult> {
    const endpoint = `${BASE_PATH}/cleanup/orphaned`;
    try {
      const response = await api.post<ApiResponse<CleanupOrphanedResult>>(
        endpoint,
        notes
          ? baseApi.sanitizeRequestData({
              notes: sanitizeOptionalString(notes, 'notes', { maxLength: 500 })
            })
          : undefined
      );
      return baseApi.handleResponse(
        response,
        'Failed to cleanup orphaned media',
        400
      );
    } catch (error) {
      throw handleApiError(error, createDeletionLogContext('POST', endpoint));
    }
  }
};

export default mediaDeletionApi;
