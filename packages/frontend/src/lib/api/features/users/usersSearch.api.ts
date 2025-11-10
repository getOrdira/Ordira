// src/lib/api/features/users/usersSearch.api.ts
// Users search API aligned with backend routes/features/users/usersSearch.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { UserProfile } from '@/lib/types/features/users';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalBoolean,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeOptionalEnum,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/users/search';

type HttpMethod = 'GET';

const createUsersSearchLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'users',
  module: 'search',
  method,
  endpoint,
  ...context
});

export interface UserSearchQuery {
  query?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserSearchResult {
  users: UserProfile[];
  total: number;
  hasMore: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const sanitizeUserSearchQuery = (query?: UserSearchQuery) => {
  if (!query) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    query: query.query ? sanitizeString(query.query, 'query', { maxLength: 500, trim: true }) : undefined,
    isActive: sanitizeOptionalBoolean(query.isActive, 'isActive'),
    isEmailVerified: sanitizeOptionalBoolean(query.isEmailVerified, 'isEmailVerified'),
    limit: sanitizeOptionalNumber(query.limit, 'limit', { integer: true, min: 1, max: 100 }),
    offset: sanitizeOptionalNumber(query.offset, 'offset', { integer: true, min: 0 }),
    sortBy: sanitizeOptionalString(query.sortBy, 'sortBy', { maxLength: 50 }),
    sortOrder: sanitizeOptionalEnum(query.sortOrder, 'sortOrder', ['asc', 'desc'] as const)
  });
};

export const usersSearchApi = {
  /**
   * Search users with optional filters.
   * GET /api/users/search
   */
  async searchUsers(query?: UserSearchQuery): Promise<UserSearchResult> {
    const endpoint = `${BASE_PATH}`;
    const params = sanitizeUserSearchQuery(query);

    try {
      const response = await api.get<ApiResponse<UserSearchResult>>(endpoint, { params });
      return baseApi.handleResponse(
        response,
        'Failed to search users',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createUsersSearchLogContext('GET', endpoint, {
          hasFilters: Boolean(params && Object.keys(params).length > 0)
        })
      );
    }
  }
};

export default usersSearchApi;
