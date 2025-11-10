import { manufacturerApi } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  ManufacturerProfile,
  ManufacturerSearchResult,
  ProfileContext
} from '@/lib/types/features/manufacturers';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalString,
  sanitizeOptionalArray,
  sanitizeOptionalNumber,
  sanitizeString,
  sanitizeOptionalObjectId
} from '@/lib/validation/sanitizers/primitives';

type HttpMethod = 'GET';

const BASE_PATH = '/profile';

const createProfileLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'manufacturers',
  module: 'profile',
  method,
  endpoint,
  ...context
});

export interface ManufacturerProfileSearchQuery {
  query?: string;
  industry?: string;
  services?: string[];
  minMoq?: number;
  maxMoq?: number;
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'industry' | 'moq' | 'profileCompleteness' | 'plan';
  sortOrder?: 'asc' | 'desc';
}

export interface ManufacturerIndustryInsights {
  manufacturers: ManufacturerSearchResult[];
  averageCompleteness: number;
  topServices: string[];
}

export interface ManufacturerProfilesListResponse {
  profiles: ManufacturerProfile[];
}

export interface ManufacturerProfileSearchResponse {
  manufacturers: ManufacturerSearchResult[];
  total: number;
  aggregations?: Record<string, unknown>;
  suggestions?: string[];
  appliedFilters?: Record<string, unknown>;
  executionTime?: number;
}

const sanitizeSearchQuery = (query?: ManufacturerProfileSearchQuery) => {
  if (!query) {
    return undefined;
  }

  const {
    query: searchTerm,
    industry,
    services,
    minMoq,
    maxMoq,
    page,
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
    page: sanitizeOptionalNumber(page, 'page', { min: 1, integer: true }),
    limit: sanitizeOptionalNumber(limit, 'limit', { min: 1, max: 100, integer: true }),
    offset: sanitizeOptionalNumber(offset, 'offset', { min: 0, integer: true }),
    sortBy: sanitizeOptionalString(sortBy, 'sortBy', {
      allowedValues: ['name', 'industry', 'moq', 'profileCompleteness', 'plan'] as const
    }),
    sortOrder: sanitizeOptionalString(sortOrder, 'sortOrder', {
      allowedValues: ['asc', 'desc'] as const
    })
  };

  return baseApi.sanitizeQueryParams(params);
};

const buildProfilePath = (manufacturerId: string, suffix: string = '') => {
  const sanitizedId = sanitizeObjectId(manufacturerId, 'manufacturerId');
  return `${BASE_PATH}/${sanitizedId}/profile${suffix}`;
};

export const manufacturerProfileApi = {
  async search(query?: ManufacturerProfileSearchQuery): Promise<ManufacturerProfileSearchResponse> {
    const endpoint = `${BASE_PATH}/search`;
    try {
      const response = await manufacturerApi.get<
        ApiResponse<ManufacturerProfileSearchResponse>
      >(endpoint, { params: sanitizeSearchQuery(query) });
      return baseApi.handleResponse(
        response,
        'Failed to search manufacturer profiles',
        500
      );
    } catch (error) {
      throw handleApiError(error, createProfileLogContext('GET', endpoint, { query }));
    }
  },

  async getProfile(manufacturerId: string): Promise<ManufacturerProfile> {
    const endpoint = buildProfilePath(manufacturerId);
    try {
      const response = await manufacturerApi.get<
        ApiResponse<{ profile: ManufacturerProfile }>
      >(endpoint);
      const { profile } = baseApi.handleResponse(
        response,
        'Failed to fetch manufacturer profile',
        500
      );
      return profile;
    } catch (error) {
      throw handleApiError(error, createProfileLogContext('GET', endpoint, { manufacturerId }));
    }
  },

  async getProfileContext(manufacturerId: string, brandId?: string): Promise<ProfileContext> {
    const endpoint = buildProfilePath(manufacturerId, '/context');
    try {
      const response = await manufacturerApi.get<
        ApiResponse<{ context: ProfileContext }>
      >(endpoint, {
        params: baseApi.sanitizeQueryParams({
          brandId: sanitizeOptionalObjectId(brandId, 'brandId')
        })
      });
      const { context } = baseApi.handleResponse(
        response,
        'Failed to fetch profile context',
        500
      );
      return context;
    } catch (error) {
      throw handleApiError(
        error,
        createProfileLogContext('GET', endpoint, { manufacturerId, brandId })
      );
    }
  },

  async getByIndustry(industry: string): Promise<ManufacturerIndustryInsights> {
    const sanitizedIndustry = sanitizeString(industry, 'industry', { maxLength: 100 });
    const endpoint = `${BASE_PATH}/industry/${encodeURIComponent(sanitizedIndustry)}`;
    try {
      const response = await manufacturerApi.get<
        ApiResponse<ManufacturerIndustryInsights>
      >(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch manufacturers by industry',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createProfileLogContext('GET', endpoint, { industry: sanitizedIndustry })
      );
    }
  },

  async getAvailableIndustries(): Promise<string[]> {
    const endpoint = `${BASE_PATH}/industries/available`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ industries: string[] }>>(endpoint);
      const { industries } = baseApi.handleResponse(
        response,
        'Failed to fetch available industries',
        500
      );
      return industries;
    } catch (error) {
      throw handleApiError(error, createProfileLogContext('GET', endpoint));
    }
  },

  async getAvailableServices(): Promise<string[]> {
    const endpoint = `${BASE_PATH}/services/available`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ services: string[] }>>(endpoint);
      const { services } = baseApi.handleResponse(
        response,
        'Failed to fetch available services',
        500
      );
      return services;
    } catch (error) {
      throw handleApiError(error, createProfileLogContext('GET', endpoint));
    }
  },

  async listProfiles(): Promise<ManufacturerProfile[]> {
    const endpoint = `${BASE_PATH}/profiles/list`;
    try {
      const response = await manufacturerApi.get<
        ApiResponse<{ profiles: ManufacturerProfile[] }>
      >(endpoint);
      const { profiles } = baseApi.handleResponse(
        response,
        'Failed to list manufacturer profiles',
        500
      );
      return profiles;
    } catch (error) {
      throw handleApiError(error, createProfileLogContext('GET', endpoint));
    }
  }
};

export default manufacturerProfileApi;
