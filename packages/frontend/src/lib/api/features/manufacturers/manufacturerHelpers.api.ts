import { manufacturerApi } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { RegisterManufacturerData } from '@/lib/types/features/manufacturers';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeObjectId,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

type HttpMethod = 'GET' | 'POST';

const BASE_PATH = '/helpers';

const createHelpersLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'manufacturers',
  module: 'helpers',
  method,
  endpoint,
  ...context
});

const buildHelperPath = (manufacturerId: string, suffix: string = '') => {
  const sanitizedId = sanitizeObjectId(manufacturerId, 'manufacturerId');
  return `${BASE_PATH}/${sanitizedId}${suffix}`;
};

const sanitizeRegistrationPayload = (payload: RegisterManufacturerData) => {
  return baseApi.sanitizeRequestData({
    name: sanitizeString(payload.name, 'name', { maxLength: 200 }),
    email: sanitizeString(payload.email, 'email', { maxLength: 255 }),
    password: sanitizeString(payload.password, 'password', { minLength: 8, maxLength: 128 }),
    industry: sanitizeOptionalString(payload.industry, 'industry', { maxLength: 100 }),
    contactEmail: sanitizeOptionalString(payload.contactEmail, 'contactEmail', { maxLength: 255 }),
    description: sanitizeOptionalString(payload.description, 'description', { maxLength: 2000 }),
    servicesOffered: payload.servicesOffered
      ? sanitizeArray(
          payload.servicesOffered,
          'servicesOffered',
          (service, index) =>
            sanitizeString(service, `servicesOffered[${index}]`, {
              maxLength: 100
            }),
          { maxLength: 50 }
        )
      : undefined,
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

const sanitizeUpdatePayload = (payload: Partial<RegisterManufacturerData> & {
  certifications?: Array<{
    name: string;
    issuer: string;
    issueDate: string | Date;
    expiryDate?: string | Date;
  }>;
}) => {
  return baseApi.sanitizeRequestData({
    name: payload.name ? sanitizeString(payload.name, 'name', { maxLength: 200 }) : undefined,
    description: payload.description
      ? sanitizeString(payload.description, 'description', { maxLength: 2000 })
      : undefined,
    industry: sanitizeOptionalString(payload.industry, 'industry', { maxLength: 100 }),
    contactEmail: sanitizeOptionalString(payload.contactEmail, 'contactEmail', { maxLength: 255 }),
    servicesOffered: payload.servicesOffered
      ? sanitizeArray(
          payload.servicesOffered,
          'servicesOffered',
          (service, index) =>
            sanitizeString(service, `servicesOffered[${index}]`, {
              maxLength: 100
            }),
          { maxLength: 50 }
        )
      : undefined,
    moq: sanitizeOptionalNumber(payload.moq, 'moq', { min: 0, integer: true }),
    headquarters: payload.headquarters
      ? baseApi.sanitizeRequestData({
          country: sanitizeOptionalString(payload.headquarters.country, 'headquarters.country', { maxLength: 100 }),
          city: sanitizeOptionalString(payload.headquarters.city, 'headquarters.city', { maxLength: 100 }),
          address: sanitizeOptionalString(payload.headquarters.address, 'headquarters.address', { maxLength: 500 })
        })
      : undefined,
    certifications: payload.certifications
      ? sanitizeArray(
          payload.certifications,
          'certifications',
          (certification, index) => {
            type CertificationInput = NonNullable<
              typeof payload.certifications
            >[number];
            const cert = certification as CertificationInput | undefined;

            return baseApi.sanitizeRequestData({
              name: sanitizeString(cert?.name, `certifications[${index}].name`, { maxLength: 200 }),
              issuer: sanitizeString(cert?.issuer, `certifications[${index}].issuer`, { maxLength: 200 }),
              issueDate: cert?.issueDate ? new Date(cert.issueDate).toISOString() : undefined,
              expiryDate: cert?.expiryDate ? new Date(cert.expiryDate).toISOString() : undefined
            });
          },
          { maxLength: 50 }
        )
      : undefined
  });
};

export const manufacturerHelpersApi = {
  async validateRegistration(payload: RegisterManufacturerData): Promise<{ valid: boolean; message: string }> {
    const endpoint = `${BASE_PATH}/validate-registration`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ valid: boolean; message: string }>>(
        endpoint,
        sanitizeRegistrationPayload(payload)
      );
      return baseApi.handleResponse(
        response,
        'Failed to validate registration data',
        400
      );
    } catch (error) {
      throw handleApiError(error, createHelpersLogContext('POST', endpoint, { email: payload.email }));
    }
  },

  async validateUpdate(
    payload: Partial<RegisterManufacturerData> & {
      certifications?: Array<{
        name: string;
        issuer: string;
        issueDate: string | Date;
        expiryDate?: string | Date;
      }>;
    }
  ): Promise<{ valid: boolean; message: string }> {
    const endpoint = `${BASE_PATH}/validate-update`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ valid: boolean; message: string }>>(
        endpoint,
        sanitizeUpdatePayload(payload)
      );
      return baseApi.handleResponse(
        response,
        'Failed to validate update data',
        400
      );
    } catch (error) {
      throw handleApiError(error, createHelpersLogContext('POST', endpoint, { fields: Object.keys(payload) }));
    }
  },

  async generateAnalytics(
    manufacturerId: string,
    options?: { startDate?: Date | string; endDate?: Date | string }
  ): Promise<Record<string, unknown>> {
    const endpoint = `${buildHelperPath(manufacturerId, '/analytics')}`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ analytics: Record<string, unknown> }>>(
        endpoint,
        {
          params: baseApi.sanitizeQueryParams({
            startDate: options?.startDate ? new Date(options.startDate).toISOString() : undefined,
            endDate: options?.endDate ? new Date(options.endDate).toISOString() : undefined
          })
        }
      );
      const { analytics } = baseApi.handleResponse(
        response,
        'Failed to generate manufacturer analytics',
        500
      );
      return analytics;
    } catch (error) {
      throw handleApiError(
        error,
        createHelpersLogContext('GET', endpoint, { manufacturerId })
      );
    }
  },

  async invalidateCaches(manufacturerId: string): Promise<string> {
    const endpoint = `${buildHelperPath(manufacturerId, '/invalidate-caches')}`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ message?: string }>>(
        endpoint
      );
      const { message } = baseApi.handleResponse(
        response,
        'Failed to invalidate manufacturer caches',
        400,
        { requireData: false }
      );
      return message ?? 'Manufacturer caches invalidated successfully';
    } catch (error) {
      throw handleApiError(
        error,
        createHelpersLogContext('POST', endpoint, { manufacturerId })
      );
    }
  },

  async formatForPublic(manufacturer: Record<string, unknown>): Promise<Record<string, unknown>> {
    const endpoint = `${BASE_PATH}/format-public`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ formattedManufacturer: Record<string, unknown> }>>(
        endpoint,
        baseApi.sanitizeRequestData({ manufacturer: baseApi.sanitizeRequestData(manufacturer) })
      );
      const { formattedManufacturer } = baseApi.handleResponse(
        response,
        'Failed to format manufacturer for public display',
        400
      );
      return formattedManufacturer;
    } catch (error) {
      throw handleApiError(
        error,
        createHelpersLogContext('POST', endpoint, { manufacturerId: manufacturer?._id ?? manufacturer?.id })
      );
    }
  },

  async isProfileComplete(manufacturer: Record<string, unknown>): Promise<boolean> {
    const endpoint = `${BASE_PATH}/is-profile-complete`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ isComplete: boolean }>>(
        endpoint,
        baseApi.sanitizeRequestData({ manufacturer: baseApi.sanitizeRequestData(manufacturer) })
      );
      const { isComplete } = baseApi.handleResponse(
        response,
        'Failed to check profile completeness',
        400
      );
      return isComplete;
    } catch (error) {
      throw handleApiError(
        error,
        createHelpersLogContext('POST', endpoint, { manufacturerId: manufacturer?._id ?? manufacturer?.id })
      );
    }
  },

  async sanitizeSearchParams(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const endpoint = `${BASE_PATH}/sanitize-params`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ sanitizedParams: Record<string, unknown> }>>(
        endpoint,
        baseApi.sanitizeRequestData({ params: baseApi.sanitizeRequestData(params) })
      );
      const { sanitizedParams } = baseApi.handleResponse(
        response,
        'Failed to sanitize search parameters',
        400
      );
      return sanitizedParams;
    } catch (error) {
      throw handleApiError(
        error,
        createHelpersLogContext('POST', endpoint, { params: Object.keys(params) })
      );
    }
  }
};

export default manufacturerHelpersApi;
