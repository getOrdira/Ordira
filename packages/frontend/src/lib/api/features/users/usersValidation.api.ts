// src/lib/api/features/users/usersValidation.api.ts
// Users validation API aligned with backend routes/features/users/usersValidation.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeEmail } from '@/lib/validation/sanitizers/contact';
import { sanitizeString } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/users/validation';

type HttpMethod = 'POST';

const createUsersValidationLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'users',
  module: 'validation',
  method,
  endpoint,
  ...context
});

export interface ValidateRegistrationPayload {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface ValidateRegistrationResponse {
  valid: boolean;
  errors: string[];
  checkedAt: string;
}

const sanitizeRegistrationPayload = (payload: ValidateRegistrationPayload) => {
  return baseApi.sanitizeRequestData({
    email: sanitizeEmail(payload.email, 'email'),
    firstName: sanitizeString(payload.firstName, 'firstName', { minLength: 1, maxLength: 100 }),
    lastName: sanitizeString(payload.lastName, 'lastName', { minLength: 1, maxLength: 100 }),
    password: sanitizeString(payload.password, 'password', { minLength: 8, maxLength: 128, trim: false })
  });
};

export const usersValidationApi = {
  /**
   * Validate registration payload.
   * POST /api/users/validation/registration
   */
  async validateRegistration(payload: ValidateRegistrationPayload): Promise<ValidateRegistrationResponse> {
    const endpoint = `${BASE_PATH}/registration`;
    const sanitizedPayload = sanitizeRegistrationPayload(payload);

    try {
      const response = await api.post<ApiResponse<ValidateRegistrationResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to validate registration data',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createUsersValidationLogContext('POST', endpoint, {
          email: sanitizedPayload.email
        })
      );
    }
  }
};

export default usersValidationApi;
