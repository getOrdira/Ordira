// src/lib/api/features/users/usersAuth.api.ts
// Users auth API aligned with backend routes/features/users/usersAuth.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { CreateUserData, UserProfile } from '@/lib/types/features/users';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeString,
  sanitizeOptionalString,
  sanitizeOptionalBoolean,
  sanitizeOptionalDate
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeOptionalEmail, sanitizeEmail } from '@/lib/validation/sanitizers/contact';

const BASE_PATH = '/users/auth';

type HttpMethod = 'POST';

const createUsersAuthLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'users',
  module: 'auth',
  method,
  endpoint,
  ...context
});

export interface RegisterUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  dateOfBirth?: Date | string;
  preferences?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    marketingEmails?: boolean;
  };
}

export interface RegisterUserResponse {
  user: UserProfile;
  registeredAt: string;
}

export interface LoginUserPayload {
  email: string;
  password: string;
}

export interface LoginUserResponse {
  token: string;
  user: UserProfile;
  authenticatedAt: string;
}

export interface VerifyUserEmailPayload {
  userId?: string;
  verificationToken?: string;
}

export interface VerifyUserEmailResponse {
  userId: string;
  verified: boolean;
  verifiedAt: string;
}

const sanitizeRegisterPayload = (payload: RegisterUserPayload) => {
  const preferences = payload.preferences
    ? baseApi.sanitizeRequestData({
        emailNotifications: sanitizeOptionalBoolean(payload.preferences.emailNotifications, 'preferences.emailNotifications'),
        smsNotifications: sanitizeOptionalBoolean(payload.preferences.smsNotifications, 'preferences.smsNotifications'),
        marketingEmails: sanitizeOptionalBoolean(payload.preferences.marketingEmails, 'preferences.marketingEmails')
      })
    : undefined;

  const dateOfBirth = sanitizeOptionalDate(payload.dateOfBirth, 'dateOfBirth');

  return baseApi.sanitizeRequestData({
    firstName: sanitizeString(payload.firstName, 'firstName', { minLength: 1, maxLength: 100 }),
    lastName: sanitizeString(payload.lastName, 'lastName', { minLength: 1, maxLength: 100 }),
    email: sanitizeEmail(payload.email, 'email'),
    password: sanitizeString(payload.password, 'password', { minLength: 8, maxLength: 128, trim: false }),
    phoneNumber: sanitizeOptionalString(payload.phoneNumber, 'phoneNumber', { maxLength: 20 }),
    dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : undefined,
    preferences
  });
};

const sanitizeLoginPayload = (payload: LoginUserPayload) => {
  return baseApi.sanitizeRequestData({
    email: sanitizeEmail(payload.email, 'email'),
    password: sanitizeString(payload.password, 'password', { minLength: 1, trim: false })
  });
};

const sanitizeVerifyEmailPayload = (payload?: VerifyUserEmailPayload) => {
  if (!payload) {
    return undefined;
  }

  return baseApi.sanitizeRequestData({
    userId: sanitizeOptionalString(payload.userId, 'userId', { maxLength: 24 }),
    verificationToken: sanitizeOptionalString(payload.verificationToken, 'verificationToken', { minLength: 1 })
  });
};

export const usersAuthApi = {
  /**
   * Register a new user.
   * POST /api/users/auth/register
   */
  async registerUser(payload: RegisterUserPayload): Promise<RegisterUserResponse> {
    const endpoint = `${BASE_PATH}/register`;
    const sanitizedPayload = sanitizeRegisterPayload(payload);

    try {
      const response = await api.post<ApiResponse<RegisterUserResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to register user',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createUsersAuthLogContext('POST', endpoint, {
          email: sanitizedPayload.email
        })
      );
    }
  },

  /**
   * Authenticate an existing user.
   * POST /api/users/auth/login
   */
  async loginUser(payload: LoginUserPayload): Promise<LoginUserResponse> {
    const endpoint = `${BASE_PATH}/login`;
    const sanitizedPayload = sanitizeLoginPayload(payload);

    try {
      const response = await api.post<ApiResponse<LoginUserResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to authenticate user',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createUsersAuthLogContext('POST', endpoint, {
          email: sanitizedPayload.email
        })
      );
    }
  },

  /**
   * Verify user email.
   * POST /api/users/auth/verify-email
   */
  async verifyUserEmail(payload?: VerifyUserEmailPayload): Promise<VerifyUserEmailResponse> {
    const endpoint = `${BASE_PATH}/verify-email`;
    const sanitizedPayload = sanitizeVerifyEmailPayload(payload);

    try {
      const response = await api.post<ApiResponse<VerifyUserEmailResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to verify user email',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createUsersAuthLogContext('POST', endpoint, {
          hasUserId: Boolean(sanitizedPayload?.userId)
        })
      );
    }
  }
};

export default usersAuthApi;
