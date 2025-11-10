import { manufacturerApi } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  IManufacturer,
  ManufacturerSearchParams,
  ManufacturerSearchResult,
  UpdateManufacturerData
} from '@/lib/types/features/manufacturers';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalString,
  sanitizeOptionalArray,
  sanitizeOptionalNumber,
  sanitizeString,
  sanitizeArray
} from '@/lib/validation/sanitizers/primitives';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const BASE_PATH = '';

const createDataLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'manufacturers',
  module: 'data',
  method,
  endpoint,
  ...context
});

export interface ManufacturerSearchQuery extends ManufacturerSearchParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ManufacturerSearchResponse {
  manufacturers: ManufacturerSearchResult[];
  total: number;
  hasMore?: boolean;
  queryTime?: number;
}

export interface ManufacturerBasicInfo {
  name: string;
  profilePictureUrl?: string;
  industry?: string;
}

const sanitizeSearchQuery = (query?: ManufacturerSearchQuery) => {
  if (!query) {
    return undefined;
  }

  const {
    query: searchTerm,
    industry,
    services,
    minMoq,
    maxMoq,
    location,
    limit,
    offset,
    sortBy,
    sortOrder
  } = query;

  const sanitizedServices = services
    ? sanitizeOptionalArray(
        services,
        'services',
        (service, index) =>
          sanitizeString(service, `services[${index}]`, {
            maxLength: 100
          }),
        { maxLength: 50 }
      )
    : undefined;

  const params: Record<string, unknown> = {
    query: sanitizeOptionalString(searchTerm, 'query', { maxLength: 500 }),
    industry: sanitizeOptionalString(industry, 'industry', { maxLength: 100 }),
    services: sanitizedServices,
    minMoq: sanitizeOptionalNumber(minMoq, 'minMoq', { min: 0, integer: true }),
    maxMoq: sanitizeOptionalNumber(maxMoq, 'maxMoq', { min: 0, integer: true }),
    location: sanitizeOptionalString(location, 'location', { maxLength: 200 }),
    limit: sanitizeOptionalNumber(limit, 'limit', { min: 1, max: 100, integer: true }),
    offset: sanitizeOptionalNumber(offset, 'offset', { min: 0, integer: true }),
    sortBy: sanitizeOptionalString(sortBy, 'sortBy', { maxLength: 50 }),
    sortOrder: sanitizeOptionalString(sortOrder, 'sortOrder', {
      allowedValues: ['asc', 'desc'] as const
    })
  };

  return baseApi.sanitizeQueryParams(params);
};

const sanitizeUpdatePayload = (payload: UpdateManufacturerData) => {
  const sanitizedPayload = {
    name: sanitizeOptionalString(payload.name, 'name', { maxLength: 200 }),
    description: sanitizeOptionalString(payload.description, 'description', { maxLength: 5000 }),
    industry: sanitizeOptionalString(payload.industry, 'industry', { maxLength: 100 }),
    contactEmail: sanitizeOptionalString(payload.contactEmail, 'contactEmail', { maxLength: 255 }),
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
          country: sanitizeOptionalString(payload.headquarters.country, 'headquarters.country', {
            maxLength: 100
          }),
          city: sanitizeOptionalString(payload.headquarters.city, 'headquarters.city', {
            maxLength: 100
          }),
          address: sanitizeOptionalString(payload.headquarters.address, 'headquarters.address', {
            maxLength: 500
          })
        })
      : undefined,
    certifications: payload.certifications
      ? sanitizeOptionalArray(
          payload.certifications,
          'certifications',
          (certification, index) => {
            type CertificationInput = NonNullable<UpdateManufacturerData['certifications']>[number];
            const cert = certification as CertificationInput | undefined;

            return {
              name: sanitizeString(cert?.name, `certifications[${index}].name`, { maxLength: 200 }),
              issuer: sanitizeString(cert?.issuer, `certifications[${index}].issuer`, {
                maxLength: 200
              }),
              issueDate: cert?.issueDate,
              expiryDate: cert?.expiryDate
            };
          },
          { maxLength: 50 }
        )
      : undefined
  };

  return baseApi.sanitizeRequestData(sanitizedPayload);
};

const buildManufacturerPath = (manufacturerId: string, suffix: string = '') => {
  const sanitizedId = sanitizeObjectId(manufacturerId, 'manufacturerId');
  return `/${sanitizedId}${suffix}`;
};

export const manufacturerDataApi = {
  async search(query?: ManufacturerSearchQuery): Promise<ManufacturerSearchResponse> {
    const endpoint = '/search';
    try {
      const response = await manufacturerApi.get<ApiResponse<ManufacturerSearchResponse>>(
        endpoint,
        {
          params: sanitizeSearchQuery(query)
        }
      );
      return baseApi.handleResponse(
        response,
        'Failed to search manufacturers',
        500
      );
    } catch (error) {
      throw handleApiError(error, createDataLogContext('GET', endpoint, { query }));
    }
  },

  async getById(manufacturerId: string): Promise<IManufacturer> {
    const endpoint = buildManufacturerPath(manufacturerId);
    try {
      const response = await manufacturerApi.get<ApiResponse<{ manufacturer: IManufacturer }>>(
        endpoint
      );
      const { manufacturer } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer',
        500
      );
      return manufacturer;
    } catch (error) {
      throw handleApiError(error, createDataLogContext('GET', endpoint, { manufacturerId }));
    }
  },

  async getByEmail(email: string, options?: { skipCache?: boolean }): Promise<IManufacturer> {
    const sanitizedEmail = sanitizeString(email, 'email', { maxLength: 255 });
    const endpoint = `/email/${encodeURIComponent(sanitizedEmail)}`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ manufacturer: IManufacturer }>>(
        endpoint,
        {
          params: baseApi.sanitizeQueryParams({
            skipCache: options?.skipCache ? 'true' : undefined
          })
        }
      );
      const { manufacturer } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer by email',
        500
      );
      return manufacturer;
    } catch (error) {
      throw handleApiError(
        error,
        createDataLogContext('GET', endpoint, { email: sanitizedEmail, skipCache: options?.skipCache })
      );
    }
  },

  async update(manufacturerId: string, updates: UpdateManufacturerData): Promise<IManufacturer> {
    const endpoint = buildManufacturerPath(manufacturerId);
    try {
      const response = await manufacturerApi.put<ApiResponse<{ manufacturer: IManufacturer }>>(
        endpoint,
        sanitizeUpdatePayload(updates)
      );
      const { manufacturer } = baseApi.handleResponse(
        response,
        'Failed to update manufacturer profile',
        400
      );
      return manufacturer;
    } catch (error) {
      throw handleApiError(
        error,
        createDataLogContext('PUT', endpoint, { manufacturerId, fields: Object.keys(updates ?? {}) })
      );
    }
  },

  async remove(manufacturerId: string): Promise<string> {
    const endpoint = buildManufacturerPath(manufacturerId);
    try {
      const response = await manufacturerApi.delete<ApiResponse<{ message?: string }>>(endpoint);
      const { message } = baseApi.handleResponse(
        response,
        'Failed to delete manufacturer',
        400,
        { requireData: false }
      );
      return message ?? 'Manufacturer deleted successfully';
    } catch (error) {
      throw handleApiError(error, createDataLogContext('DELETE', endpoint, { manufacturerId }));
    }
  },

  async getByIndustry(industry: string, limit?: number): Promise<ManufacturerSearchResult[]> {
    const sanitizedIndustry = sanitizeString(industry, 'industry', { maxLength: 100 });
    const endpoint = `/industry/${encodeURIComponent(sanitizedIndustry)}`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ manufacturers: ManufacturerSearchResult[] }>>(
        endpoint,
        {
          params: baseApi.sanitizeQueryParams({
            limit: sanitizeOptionalNumber(limit, 'limit', { min: 1, max: 100, integer: true })
          })
        }
      );
      const { manufacturers } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturers by industry',
        500
      );
      return manufacturers;
    } catch (error) {
      throw handleApiError(
        error,
        createDataLogContext('GET', endpoint, { industry: sanitizedIndustry, limit })
      );
    }
  },

  async exists(manufacturerId: string): Promise<boolean> {
    const endpoint = buildManufacturerPath(manufacturerId, '/exists');
    try {
      const response = await manufacturerApi.get<ApiResponse<{ exists: boolean }>>(endpoint);
      const { exists } = baseApi.handleResponse(
        response,
        'Failed to check manufacturer existence',
        500
      );
      return exists;
    } catch (error) {
      throw handleApiError(error, createDataLogContext('GET', endpoint, { manufacturerId }));
    }
  },

  async getBasicInfo(manufacturerId: string): Promise<ManufacturerBasicInfo> {
    const endpoint = buildManufacturerPath(manufacturerId, '/basic-info');
    try {
      const response = await manufacturerApi.get<ApiResponse<{ basicInfo: ManufacturerBasicInfo }>>(
        endpoint
      );
      const { basicInfo } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer basic info',
        500
      );
      return basicInfo;
    } catch (error) {
      throw handleApiError(error, createDataLogContext('GET', endpoint, { manufacturerId }));
    }
  },

  async bulkGet(manufacturerIds: string[]): Promise<IManufacturer[]> {
    const sanitizedIds = sanitizeArray(
      manufacturerIds,
      'manufacturerIds',
      (id, index) => sanitizeObjectId(id as string, `manufacturerIds[${index}]`),
      { minLength: 1, maxLength: 100 }
    );
    const endpoint = '/bulk-get';
    try {
      const response = await manufacturerApi.post<ApiResponse<{ manufacturers: IManufacturer[] }>>(
        endpoint,
        baseApi.sanitizeRequestData({ manufacturerIds: sanitizedIds })
      );
      const { manufacturers } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturers by IDs',
        400
      );
      return manufacturers;
    } catch (error) {
      throw handleApiError(error, createDataLogContext('POST', endpoint, { idsCount: manufacturerIds.length }));
    }
  },

  async count(criteria?: Record<string, unknown>): Promise<number> {
    const endpoint = '/count';
    try {
      const response = await manufacturerApi.get<ApiResponse<{ count: number }>>(endpoint, {
        params: baseApi.sanitizeQueryParams({
          criteria: criteria ? JSON.stringify(criteria) : undefined
        })
      });
      const { count } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer count',
        500
      );
      return count;
    } catch (error) {
      throw handleApiError(error, createDataLogContext('GET', endpoint, { criteria }));
    }
  }
};

export default manufacturerDataApi;
