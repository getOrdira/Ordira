import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { MediaListOptions, MediaSearchResult } from '@/lib/types/features/media';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/media/search';

type HttpMethod = 'GET';

const createSearchLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'media',
  module: 'search',
  method,
  endpoint,
  ...context
});

const MEDIA_TYPES = ['image', 'video', 'gif', 'document'] as const;
const MEDIA_CATEGORIES = ['profile', 'product', 'banner', 'certificate', 'document'] as const;

export interface MediaSearchQueryOptions extends Pick<MediaListOptions, 'type' | 'category' | 'limit' | 'page'> {}

const buildSearchParams = (query: MediaSearchQueryOptions) =>
  baseApi.sanitizeQueryParams({
    type: query.type
      ? sanitizeOptionalString(query.type, 'type', { allowedValues: MEDIA_TYPES })
      : undefined,
    category: query.category
      ? sanitizeOptionalString(query.category, 'category', { allowedValues: MEDIA_CATEGORIES })
      : undefined,
    limit: sanitizeOptionalNumber(query.limit, 'limit', { min: 1, max: 100, integer: true }),
    page: sanitizeOptionalNumber(query.page, 'page', { min: 1, integer: true })
  });

const buildTagSearchParams = (options?: Omit<MediaSearchQueryOptions, 'page'>) =>
  baseApi.sanitizeQueryParams({
    type: options?.type
      ? sanitizeOptionalString(options.type, 'type', { allowedValues: MEDIA_TYPES })
      : undefined,
    category: options?.category
      ? sanitizeOptionalString(options.category, 'category', { allowedValues: MEDIA_CATEGORIES })
      : undefined,
    limit: sanitizeOptionalNumber(options?.limit, 'limit', { min: 1, max: 100, integer: true })
  });

export const mediaSearchApi = {
  /**
   * Perform a text-based media search.
   * GET /api/media/search
   */
  async searchMedia(query: string, options?: MediaSearchQueryOptions): Promise<MediaSearchResult> {
    const endpoint = BASE_PATH;
    try {
      const response = await api.get<ApiResponse<MediaSearchResult>>(endpoint, {
        params: {
          ...buildSearchParams(options ?? {}),
          q: sanitizeString(query, 'q', { minLength: 2, maxLength: 200 })
        }
      });
      return baseApi.handleResponse(
        response,
        'Failed to search media',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSearchLogContext('GET', endpoint, {
          query,
          options
        })
      );
    }
  },

  /**
   * Search media by tags.
   * GET /api/media/search/tags
   */
  async searchByTags(
    tags: string[] | string,
    options?: Omit<MediaSearchQueryOptions, 'page'>
  ): Promise<MediaSearchResult> {
    const endpoint = `${BASE_PATH}/tags`;
    try {
      const sanitizedTags = Array.isArray(tags)
        ? sanitizeArray(
            tags,
            'tags',
            (tag, index) =>
              sanitizeString(tag, `tags[${index}]`, {
                maxLength: 50
              }),
            { minLength: 1, maxLength: 50 }
          )
        : [sanitizeString(tags, 'tags', { maxLength: 200 })];

      const response = await api.get<ApiResponse<MediaSearchResult>>(endpoint, {
        params: {
          ...buildTagSearchParams(options),
          tags: sanitizedTags.join(',')
        }
      });
      return baseApi.handleResponse(
        response,
        'Failed to search media by tags',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSearchLogContext('GET', endpoint, {
          tags,
          options
        })
      );
    }
  }
};

export default mediaSearchApi;
