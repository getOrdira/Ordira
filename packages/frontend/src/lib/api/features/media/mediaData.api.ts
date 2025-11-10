import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  MediaLeanDocument,
  MediaListOptions
} from '@/lib/types/features/media';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeBoolean,
  sanitizeObjectId,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/media';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const createMediaDataLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'media',
  module: 'data',
  method,
  endpoint,
  ...context
});

export type MediaFileType = 'image' | 'video' | 'gif' | 'document';
export type MediaCategory = 'profile' | 'product' | 'banner' | 'certificate' | 'document';
export type MediaSortKey = 'createdAt' | 'filename' | 'size' | 'category';
export type SortOrder = 'asc' | 'desc';

export interface MediaListQuery extends Omit<MediaListOptions, 'tags'> {
  tags?: string[] | string;
}

export interface MediaListResponse {
  media: MediaLeanDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  total: number;
}

export interface MediaUpdatePayload {
  category?: MediaCategory;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface MediaCategoryResponse {
  media: MediaLeanDocument[];
  category: MediaCategory;
}

const sanitizeListQuery = (query?: MediaListQuery) => {
  if (!query) {
    return undefined;
  }

  const params: Record<string, unknown> = {
    page: sanitizeOptionalNumber(query.page, 'page', { min: 1, integer: true }),
    limit: sanitizeOptionalNumber(query.limit, 'limit', { min: 1, max: 100, integer: true }),
    type: query.type ? sanitizeOptionalString(query.type, 'type', {
      allowedValues: ['image', 'video', 'gif', 'document'] as const
    }) : undefined,
    category: query.category ? sanitizeOptionalString(query.category, 'category', {
      allowedValues: ['profile', 'product', 'banner', 'certificate', 'document'] as const
    }) : undefined,
    tags: query.tags
      ? Array.isArray(query.tags)
        ? sanitizeArray(
            query.tags,
            'tags',
            (tag, index) => sanitizeString(tag, `tags[${index}]`, { maxLength: 50 }),
            { maxLength: 20 }
          ).join(',')
        : sanitizeString(query.tags, 'tags', { maxLength: 200 })
      : undefined,
    search: sanitizeOptionalString(query.search, 'search', { maxLength: 200 }),
    isPublic: query.isPublic !== undefined
      ? sanitizeBoolean(query.isPublic, 'isPublic')
      : undefined,
    sortBy: query.sortBy ? sanitizeOptionalString(query.sortBy, 'sortBy', {
      allowedValues: ['createdAt', 'filename', 'size', 'category'] as const
    }) : undefined,
    sortOrder: query.sortOrder ? sanitizeOptionalString(query.sortOrder, 'sortOrder', {
      allowedValues: ['asc', 'desc'] as const
    }) : undefined
  };

  const sanitized = baseApi.sanitizeQueryParams(params);
  return Object.keys(sanitized).length ? sanitized : undefined;
};

const sanitizeUpdatePayload = (payload: MediaUpdatePayload) => {
  const sanitized = {
    category: payload.category
      ? sanitizeString(payload.category, 'category', {
          allowedValues: ['profile', 'product', 'banner', 'certificate', 'document'] as const
        })
      : undefined,
    description: sanitizeOptionalString(payload.description, 'description', { maxLength: 500 }),
    tags: payload.tags
      ? sanitizeArray(
          payload.tags,
          'tags',
          (tag, index) =>
            sanitizeString(tag, `tags[${index}]`, {
              maxLength: 50
            }),
          { maxLength: 20 }
        )
      : undefined,
    isPublic: payload.isPublic !== undefined
      ? sanitizeBoolean(payload.isPublic, 'isPublic')
      : undefined
  };

  return baseApi.sanitizeRequestData(sanitized);
};

export const mediaDataApi = {
  /**
   * Fetch a single media item by ID.
   * GET /api/media/:mediaId
   */
  async getMedia(mediaId: string): Promise<MediaLeanDocument> {
    const endpoint = `${BASE_PATH}/${sanitizeObjectId(mediaId, 'mediaId')}`;
    try {
      const response = await api.get<ApiResponse<{ media: MediaLeanDocument }>>(endpoint);
      const { media } = baseApi.handleResponse(
        response,
        'Failed to fetch media item',
        500
      );
      return media;
    } catch (error) {
      throw handleApiError(
        error,
        createMediaDataLogContext('GET', endpoint, { mediaId })
      );
    }
  },

  /**
   * List media with pagination and filters.
   * GET /api/media
   */
  async listMedia(query?: MediaListQuery): Promise<MediaListResponse> {
    const endpoint = BASE_PATH;
    try {
      const response = await api.get<ApiResponse<MediaListResponse>>(endpoint, {
        params: sanitizeListQuery(query)
      });
      return baseApi.handleResponse(
        response,
        'Failed to list media',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createMediaDataLogContext('GET', endpoint, { query })
      );
    }
  },

  /**
   * Update metadata for a media item.
   * PUT /api/media/:mediaId
   */
  async updateMediaMetadata(
    mediaId: string,
    payload: MediaUpdatePayload
  ): Promise<MediaLeanDocument> {
    const endpoint = `${BASE_PATH}/${sanitizeObjectId(mediaId, 'mediaId')}`;
    try {
      const response = await api.put<ApiResponse<{ media: MediaLeanDocument }>>(
        endpoint,
        sanitizeUpdatePayload(payload)
      );
      const { media } = baseApi.handleResponse(
        response,
        'Failed to update media metadata',
        400
      );
      return media;
    } catch (error) {
      throw handleApiError(
        error,
        createMediaDataLogContext('PUT', endpoint, {
          mediaId,
          fields: Object.keys(payload ?? {})
        })
      );
    }
  },

  /**
   * Retrieve media by category.
   * GET /api/media/category
   */
  async getMediaByCategory(category: MediaCategory): Promise<MediaCategoryResponse> {
    const endpoint = `${BASE_PATH}/category`;
    try {
      const response = await api.get<ApiResponse<MediaCategoryResponse>>(endpoint, {
        params: baseApi.sanitizeQueryParams({
          category: sanitizeString(category, 'category', {
            allowedValues: ['profile', 'product', 'banner', 'certificate', 'document'] as const
          })
        })
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch media by category',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createMediaDataLogContext('GET', endpoint, { category })
      );
    }
  },

  /**
   * Retrieve recent media uploads.
   * GET /api/media/recent
   */
  async getRecentMedia(limit?: number): Promise<MediaLeanDocument[]> {
    const endpoint = `${BASE_PATH}/recent`;
    try {
      const response = await api.get<ApiResponse<{ media: MediaLeanDocument[] }>>(endpoint, {
        params: baseApi.sanitizeQueryParams({
          limit: sanitizeOptionalNumber(limit, 'limit', { min: 1, max: 50, integer: true })
        })
      });
      const { media } = baseApi.handleResponse(
        response,
        'Failed to fetch recent media',
        500
      );
      return media;
    } catch (error) {
      throw handleApiError(
        error,
        createMediaDataLogContext('GET', endpoint, { limit })
      );
    }
  }
};

export default mediaDataApi;
