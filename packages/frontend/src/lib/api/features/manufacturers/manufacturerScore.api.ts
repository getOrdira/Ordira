import { manufacturerApi } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  RegisterManufacturerData
} from '@/lib/types/features/manufacturers';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalArray,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

type HttpMethod = 'POST';

const BASE_PATH = '/score';

const createScoreLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'manufacturers',
  module: 'score',
  method,
  endpoint,
  ...context
});

const sanitizeInitialScorePayload = (payload: RegisterManufacturerData) => {
  return baseApi.sanitizeRequestData({
    name: sanitizeString(payload.name, 'name', { maxLength: 200 }),
    email: sanitizeString(payload.email, 'email', { maxLength: 255 }),
    password: sanitizeString(payload.password, 'password', { minLength: 8, maxLength: 128 }),
    industry: sanitizeOptionalString(payload.industry, 'industry', { maxLength: 100 }),
    contactEmail: sanitizeOptionalString(payload.contactEmail, 'contactEmail', { maxLength: 255 }),
    description: sanitizeOptionalString(payload.description, 'description', { maxLength: 2000 }),
    servicesOffered: sanitizeOptionalArray(
      payload.servicesOffered,
      'servicesOffered',
      (service, index) =>
        sanitizeString(service, `servicesOffered[${index}]`, {
          maxLength: 100
        }),
      { maxLength: 50 }
    ),
    moq: sanitizeOptionalNumber(payload.moq, 'moq', { min: 0, integer: true }),
    headquarters: payload.headquarters
      ? baseApi.sanitizeRequestData({
          country: sanitizeOptionalString(payload.headquarters.country, 'headquarters.country', { maxLength: 100 }),
          city: sanitizeOptionalString(payload.headquarters.city, 'headquarters.city', { maxLength: 100 }),
          address: sanitizeOptionalString(payload.headquarters.address, 'headquarters.address', { maxLength: 500 })
        })
      : undefined
  });
};

export const manufacturerScoreApi = {
  async calculateInitialScore(
    payload: RegisterManufacturerData
  ): Promise<number> {
    const endpoint = `${BASE_PATH}/calculate-initial`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ initialScore: number }>>(
        endpoint,
        sanitizeInitialScorePayload(payload)
      );
      const { initialScore } = baseApi.handleResponse(
        response,
        'Failed to calculate initial profile score',
        400
      );
      return initialScore;
    } catch (error) {
      throw handleApiError(
        error,
        createScoreLogContext('POST', endpoint, {
          name: payload.name,
          email: payload.email
        })
      );
    }
  },

  async calculateProfileScore(manufacturerData: Record<string, unknown>): Promise<number> {
    const endpoint = `${BASE_PATH}/calculate-profile`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ profileScore: number }>>(
        endpoint,
        baseApi.sanitizeRequestData({
          manufacturerData: baseApi.sanitizeRequestData(manufacturerData)
        })
      );
      const { profileScore } = baseApi.handleResponse(
        response,
        'Failed to calculate profile score',
        400
      );
      return profileScore;
    } catch (error) {
      throw handleApiError(
        error,
        createScoreLogContext('POST', endpoint, {
          manufacturerId: manufacturerData?._id ?? manufacturerData?.id
        })
      );
    }
  },

  async calculateProfileCompleteness(manufacturerData: Record<string, unknown>): Promise<number> {
    const endpoint = `${BASE_PATH}/calculate-completeness`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ completeness: number }>>(
        endpoint,
        baseApi.sanitizeRequestData({
          manufacturerData: baseApi.sanitizeRequestData(manufacturerData)
        })
      );
      const { completeness } = baseApi.handleResponse(
        response,
        'Failed to calculate profile completeness',
        400
      );
      return completeness;
    } catch (error) {
      throw handleApiError(
        error,
        createScoreLogContext('POST', endpoint, {
          manufacturerId: manufacturerData?._id ?? manufacturerData?.id
        })
      );
    }
  }
};

export default manufacturerScoreApi;
