// src/lib/api/features/users/usersProfile.api.ts
// Users profile API aligned with backend routes/features/users/usersProfile.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { UserProfile, UpdateUserData } from '@/lib/types/features/users';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalString,
  sanitizeOptionalBoolean,
  sanitizeOptionalDate,
  sanitizeOptionalUrl
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/users/profile';

type HttpMethod = 'GET' | 'PUT' | 'DELETE';

const createUsersProfileLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'users',
  module: 'profile',
  method,
  endpoint,
  ...context
});

export interface UpdateUserProfilePayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: Date | string;
  profilePictureUrl?: string;
  preferences?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    marketingEmails?: boolean;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface UpdateUserProfileResponse {
  profile: UserProfile;
  updatedAt: string;
}

export interface DeleteUserResponse {
  userId: string;
  deleted: boolean;
  deletedAt: string;
}

const sanitizeUserId = (userId?: string) => {
  if (!userId) {
    return undefined;
  }
  return sanitizeObjectId(userId, 'userId');
};

const sanitizeUpdatePayload = (payload: UpdateUserProfilePayload) => {
  const preferences = payload.preferences
    ? baseApi.sanitizeRequestData({
        emailNotifications: sanitizeOptionalBoolean(payload.preferences.emailNotifications, 'preferences.emailNotifications'),
        smsNotifications: sanitizeOptionalBoolean(payload.preferences.smsNotifications, 'preferences.smsNotifications'),
        marketingEmails: sanitizeOptionalBoolean(payload.preferences.marketingEmails, 'preferences.marketingEmails')
      })
    : undefined;

  const address = payload.address
    ? baseApi.sanitizeRequestData({
        street: sanitizeOptionalString(payload.address.street, 'address.street', { maxLength: 200 }),
        city: sanitizeOptionalString(payload.address.city, 'address.city', { maxLength: 100 }),
        state: sanitizeOptionalString(payload.address.state, 'address.state', { maxLength: 100 }),
        zipCode: sanitizeOptionalString(payload.address.zipCode, 'address.zipCode', { maxLength: 20 }),
        country: sanitizeOptionalString(payload.address.country, 'address.country', { maxLength: 100 })
      })
    : undefined;

  const dateOfBirth = sanitizeOptionalDate(payload.dateOfBirth, 'dateOfBirth');

  return baseApi.sanitizeRequestData<UpdateUserData>({
    firstName: sanitizeOptionalString(payload.firstName, 'firstName', { maxLength: 100 }),
    lastName: sanitizeOptionalString(payload.lastName, 'lastName', { maxLength: 100 }),
    phoneNumber: sanitizeOptionalString(payload.phoneNumber, 'phoneNumber', { maxLength: 20 }),
    dateOfBirth,
    profilePictureUrl: sanitizeOptionalUrl(payload.profilePictureUrl, 'profilePictureUrl'),
    preferences,
    address
  });
};

export const usersProfileApi = {
  /**
   * Retrieve profile of the authenticated user.
   * GET /api/users/profile/me
   */
  async getCurrentUserProfile(): Promise<UserProfile> {
    const endpoint = `${BASE_PATH}/me`;

    try {
      const response = await api.get<ApiResponse<{ profile: UserProfile }>>(endpoint);
      const { profile } = baseApi.handleResponse(
        response,
        'Failed to fetch current user profile',
        500
      );
      return profile;
    } catch (error) {
      throw handleApiError(
        error,
        createUsersProfileLogContext('GET', endpoint)
      );
    }
  },

  /**
   * Retrieve a user profile by identifier.
   * GET /api/users/profile/:userId
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    const sanitizedId = sanitizeUserId(userId);
    const endpoint = `${BASE_PATH}/${sanitizedId}`;

    try {
      const response = await api.get<ApiResponse<{ profile: UserProfile }>>(endpoint);
      const { profile } = baseApi.handleResponse(
        response,
        'Failed to fetch user profile',
        500
      );
      return profile;
    } catch (error) {
      throw handleApiError(
        error,
        createUsersProfileLogContext('GET', endpoint, { userId: sanitizedId })
      );
    }
  },

  /**
   * Update profile for the authenticated user.
   * PUT /api/users/profile/me
   */
  async updateCurrentUserProfile(payload: UpdateUserProfilePayload): Promise<UpdateUserProfileResponse> {
    const sanitizedPayload = sanitizeUpdatePayload(payload);
    const endpoint = `${BASE_PATH}/me`;

    try {
      const response = await api.put<ApiResponse<UpdateUserProfileResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to update current user profile',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createUsersProfileLogContext('PUT', endpoint, { hasUpdates: Object.keys(sanitizedPayload).length > 0 })
      );
    }
  },

  /**
   * Update profile for a specific user.
   * PUT /api/users/profile/:userId
   */
  async updateUserProfile(userId: string, payload: UpdateUserProfilePayload): Promise<UpdateUserProfileResponse> {
    const sanitizedId = sanitizeUserId(userId);
    const sanitizedPayload = sanitizeUpdatePayload(payload);
    const endpoint = `${BASE_PATH}/${sanitizedId}`;

    try {
      const response = await api.put<ApiResponse<UpdateUserProfileResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to update user profile',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createUsersProfileLogContext('PUT', endpoint, {
          userId: sanitizedId,
          hasUpdates: Object.keys(sanitizedPayload).length > 0
        })
      );
    }
  },

  /**
   * Delete a user account.
   * DELETE /api/users/profile/:userId
   */
  async deleteUser(userId: string): Promise<DeleteUserResponse> {
    const sanitizedId = sanitizeUserId(userId);
    const endpoint = `${BASE_PATH}/${sanitizedId}`;

    try {
      const response = await api.delete<ApiResponse<DeleteUserResponse>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to delete user',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createUsersProfileLogContext('DELETE', endpoint, { userId: sanitizedId })
      );
    }
  }
};

export default usersProfileApi;
