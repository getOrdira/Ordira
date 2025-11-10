import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  MediaUploadOptions,
  MediaDocument,
  BatchUploadResult,
  BatchUploadSuccess,
  BatchUploadFailure
} from '@/lib/types/features/media';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeOptionalBoolean,
  sanitizeOptionalNumber,
  sanitizeOptionalString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/media/upload';

type HttpMethod = 'POST';

const createUploadLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'media',
  module: 'upload',
  method,
  endpoint,
  ...context
});

export interface MediaUploadRequestOptions extends MediaUploadOptions {
  tags?: string[];
}

const appendUploadOptions = (formData: FormData, options?: MediaUploadRequestOptions) => {
  if (!options) {
    return;
  }

  if (options.category) {
    const category = sanitizeOptionalString(options.category, 'category', {
      allowedValues: ['profile', 'product', 'banner', 'certificate', 'document'] as const
    });
    if (category) {
      formData.append('category', category);
    }
  }

  if (options.description) {
    formData.append(
      'description',
      sanitizeOptionalString(options.description, 'description', { maxLength: 500 }) ?? ''
    );
  }

  if (options.tags?.length) {
    const tags = sanitizeArray(
      options.tags,
      'tags',
      (tag, index) =>
        sanitizeOptionalString(tag, `tags[${index}]`, {
          maxLength: 50
        }) ?? '',
      { maxLength: 50 }
    );
    tags.forEach(tag => {
      if (tag) {
        formData.append('tags[]', tag);
      }
    });
  }

  if (options.resourceId) {
    const resourceId = sanitizeOptionalString(options.resourceId, 'resourceId', { maxLength: 128 });
    if (resourceId) {
      formData.append('resourceId', resourceId);
    }
  }

  if (options.isPublic !== undefined) {
    const isPublic = sanitizeOptionalBoolean(options.isPublic, 'isPublic');
    if (isPublic !== undefined) {
      formData.append('isPublic', String(isPublic));
    }
  }

  if (options.allowedTypes?.length) {
    const allowedTypes = sanitizeArray(
      options.allowedTypes,
      'allowedTypes',
      (type, index) =>
        sanitizeOptionalString(type, `allowedTypes[${index}]`, { maxLength: 50 }) ?? '',
      { maxLength: 20 }
    );
    allowedTypes.forEach(type => {
      if (type) {
        formData.append('allowedTypes[]', type);
      }
    });
  }

  if (options.maxFileSize !== undefined) {
    const maxFileSize = sanitizeOptionalNumber(options.maxFileSize, 'maxFileSize', { min: 1 });
    if (maxFileSize !== undefined) {
      formData.append('maxFileSize', String(maxFileSize));
    }
  }
};

export interface BatchUploadSummary {
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
  successRate: string;
}

export interface BatchUploadApiResponse {
  successful: BatchUploadSuccess[];
  failed: BatchUploadFailure[];
  summary: BatchUploadSummary;
}

export const mediaUploadApi = {
  /**
   * Upload a single media file.
   * POST /api/media/upload
   */
  async uploadMedia(
    file: File,
    options?: MediaUploadRequestOptions
  ): Promise<MediaDocument> {
    const endpoint = `${BASE_PATH}`;
    try {
      const formData = new FormData();
      formData.append('image', file);
      appendUploadOptions(formData, options);

      const response = await api.postFormData<ApiResponse<{ media: MediaDocument }>>(
        endpoint,
        formData
      );
      const { media } = baseApi.handleResponse(
        response,
        'Failed to upload media file',
        400
      );
      return media;
    } catch (error) {
      throw handleApiError(
        error,
        createUploadLogContext('POST', endpoint, {
          fileName: file?.name,
          size: file?.size
        })
      );
    }
  },

  /**
   * Upload multiple media files in a batch.
   * POST /api/media/upload/batch
   */
  async uploadBatchMedia(
    files: File[],
    options?: MediaUploadRequestOptions
  ): Promise<BatchUploadApiResponse> {
    const endpoint = `${BASE_PATH}/batch`;
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));
      appendUploadOptions(formData, options);

      const response = await api.postFormData<ApiResponse<BatchUploadApiResponse>>(endpoint, formData);

      const result = baseApi.handleResponse(
        response,
        'Failed to upload batch media files',
        400
      );

      return result;
    } catch (error) {
      throw handleApiError(
        error,
        createUploadLogContext('POST', endpoint, {
          filesCount: files.length
        })
      );
    }
  }
};

export default mediaUploadApi;
