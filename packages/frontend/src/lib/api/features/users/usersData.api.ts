// src/lib/api/features/users/usersData.api.ts
// Users data API aligned with backend routes/features/users/usersData.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { UserProfile } from '@/lib/types/features/users';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeArray
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeEmail } from '@/lib/validation/sanitizers/contact';

const BASE_PATH = '/users/data';

type HttpMethod = 'GET' | 'POST';

const createUsersDataLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'users',
  module: 'data',
  method,
  endpoint,
  ...context
});

export interface UserDocumentOptions {
  useCache?: boolean;
}

export interface BatchGetUsersPayload {
  userIds: string[];
  useCache?: boolean;
}

export interface BatchGetUsersResponse {
  profiles: UserProfile[];
  total: number;
}

const sanitizeUserDataQuery = (options?: UserDocumentOptions) => {
  if (!options) {
    return undefined;
  }

  return baseApi.sanitizeQueryParams({
    useCache: sanitizeOptionalBoolean(options.useCache, 'useCache')
  });
};

const buildUserEndpoint = (userId: string, suffix: string = '') => {
  const sanitizedId = sanitizeObjectId(userId, 'userId');
  return `${BASE_PATH}/${sanitizedId}${suffix}`;
};

export const usersDataApi = {
  /**
   * Retrieve a user document formatted as a profile.
   * GET /api/users/data/:userId
   */
  async getUserDocument(userId: string, options?: UserDocumentOptions): Promise<UserProfile> {
    const endpoint = buildUserEndpoint(userId);
    const params = sanitizeUserDataQuery(options);

    try {
      const response = await api.get<ApiResponse<{ profile: UserProfile }>>(endpoint, {
        params
      });
      const { profile } = baseApi.handleResponse(
        response,
        'Failed to fetch user document',
        500
      );
      return profile;
    } catch (error) {
      throw handleApiError(
        error,
        createUsersDataLogContext('GET', endpoint, {
          useCache: options?.useCache ?? true
        })
      );
    }
  },

  /**
   * Retrieve a user profile by identifier.
   * GET /api/users/data/:userId/profile
   */
  async getUserProfileById(userId: string, options?: UserDocumentOptions): Promise<UserProfile> {
    const endpoint = buildUserEndpoint(userId, '/profile');
    const params = sanitizeUserDataQuery(options);

    try {
      const response = await api.get<ApiResponse<{ profile: UserProfile }>>(endpoint, {
        params
      });
      const { profile } = baseApi.handleResponse(
        response,
        'Failed to fetch user profile',
        500
      );
      return profile;
    } catch (error) {
      throw handleApiError(
        error,
        createUsersDataLogContext('GET', endpoint, {
          useCache: options?.useCache ?? true
        })
      );
    }
  },

  /**
   * Retrieve a user by email address.
   * GET /api/users/data/email/search
   */
  async getUserByEmail(email: string, options?: { skipCache?: boolean }): Promise<UserProfile> {
    const endpoint = `${BASE_PATH}/email/search`;
    const params = baseApi.sanitizeQueryParams({
      email: sanitizeEmail(email, 'email'),
      skipCache: sanitizeOptionalBoolean(options?.skipCache, 'skipCache')
    });

    try {
      const response = await api.get<ApiResponse<{ profile: UserProfile }>>(endpoint, {
        params
      });
      const { profile } = baseApi.handleResponse(
        response,
        'Failed to fetch user by email',
        500
      );
      return profile;
    } catch (error) {
      throw handleApiError(
        error,
        createUsersDataLogContext('GET', endpoint, {
          email: params.email,
          skipCache: params.skipCache
        })
      );
    }
  },

  /**
   * Retrieve multiple users by identifiers.
   * POST /api/users/data/batch
   */
  async batchGetUsers(payload: BatchGetUsersPayload): Promise<BatchGetUsersResponse> {
    const userIds = sanitizeArray(
      payload.userIds,
      'userIds',
      (value, index) => sanitizeObjectId(value as string, `userIds[${index}]`),
      { minLength: 1, maxLength: 100 }
    );

    const sanitizedPayload = baseApi.sanitizeRequestData({
      userIds,
      useCache: sanitizeOptionalBoolean(payload.useCache, 'useCache')
    });

    const endpoint = `${BASE_PATH}/batch`;

    try {
      const response = await api.post<ApiResponse<BatchGetUsersResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to fetch users batch',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createUsersDataLogContext('POST', endpoint, {
          count: sanitizedPayload.userIds.length
        })
      );
    }
  }
};

export default usersDataApi;
