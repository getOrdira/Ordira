// src/lib/api/features/users/usersCache.api.ts
// Users cache API aligned with backend routes/features/users/usersCache.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { UserProfile } from '@/lib/types/features/users';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeOptionalObjectId } from '@/lib/validation/sanitizers/primitives';
import { sanitizeOptionalEmail } from '@/lib/validation/sanitizers/contact';

const BASE_PATH = '/users/cache';

type HttpMethod = 'GET' | 'POST';

const createUsersCacheLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'users',
  module: 'cache',
  method,
  endpoint,
  ...context
});

export interface InvalidateUserCachePayload {
  userId?: string;
}

export interface InvalidateUserCacheResponse {
  invalidated: boolean;
  scope: 'user' | 'global';
  userId: string | null;
  invalidatedAt: string;
}

export interface CachedUserQuery {
  userId?: string;
  email?: string;
}

export interface CachedUserResponse {
  cacheKey: string;
  cached: boolean;
  profile: UserProfile | null;
}

const sanitizeInvalidatePayload = (payload?: InvalidateUserCachePayload) => {
  if (!payload) {
    return undefined;
  }

  return baseApi.sanitizeRequestData({
    userId: sanitizeOptionalObjectId(payload.userId, 'userId')
  });
};

const sanitizeCachedUserQuery = (query: CachedUserQuery) => {
  const sanitizedUserId = sanitizeOptionalObjectId(query.userId, 'userId');
  const sanitizedEmail = sanitizeOptionalEmail(query.email, 'email');

  if (!sanitizedUserId && !sanitizedEmail) {
    throw new Error('A userId or email is required to retrieve cached user data');
  }

  return baseApi.sanitizeQueryParams({
    userId: sanitizedUserId,
    email: sanitizedEmail
  });
};

export const usersCacheApi = {
  /**
   * Invalidate caches for a specific user or globally.
   * POST /api/users/cache/invalidate
   */
  async invalidateUserCaches(payload?: InvalidateUserCachePayload): Promise<InvalidateUserCacheResponse> {
    const endpoint = `${BASE_PATH}/invalidate`;
    const sanitizedPayload = sanitizeInvalidatePayload(payload);

    try {
      const response = await api.post<ApiResponse<InvalidateUserCacheResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to invalidate user cache',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createUsersCacheLogContext('POST', endpoint, {
          scope: sanitizedPayload?.userId ? 'user' : 'global'
        })
      );
    }
  },

  /**
   * Retrieve a cached user record.
   * GET /api/users/cache/cached
   */
  async getCachedUser(query: CachedUserQuery): Promise<CachedUserResponse> {
    const endpoint = `${BASE_PATH}/cached`;
    const params = sanitizeCachedUserQuery(query);

    try {
      const response = await api.get<ApiResponse<CachedUserResponse>>(endpoint, { params });
      return baseApi.handleResponse(
        response,
        'Failed to fetch cached user',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createUsersCacheLogContext('GET', endpoint, {
          cacheKey: params.userId ?? params.email
        })
      );
    }
  },

  /**
   * Retrieve cache configuration.
   * GET /api/users/cache/config
   */
  async getCacheConfiguration(): Promise<{ ttl: Record<string, unknown> }> {
    const endpoint = `${BASE_PATH}/config`;

    try {
      const response = await api.get<ApiResponse<{ ttl: Record<string, unknown> }>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch cache configuration',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createUsersCacheLogContext('GET', endpoint)
      );
    }
  }
};

export default usersCacheApi;
