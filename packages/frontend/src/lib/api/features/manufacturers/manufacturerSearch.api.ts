import { manufacturerApi } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  AdvancedSearchFilters,
  ManufacturerAdvancedSearchOptions as AdvancedSearchOptions,
  AdvancedSearchResult,
  SearchSuggestion,
  ManufacturerComparison,
  TrendAnalysis,
  IndustryBenchmark,
  ManufacturerSearchComparisonCriteria as SearchComparisonCriteria
} from '@/lib/types/features/manufacturers';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString,
  sanitizeOptionalArray,
  sanitizeArray
} from '@/lib/validation/sanitizers/primitives';

type HttpMethod = 'GET' | 'POST';

const BASE_PATH = '/search';

const createSearchLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'manufacturers',
  module: 'search',
  method,
  endpoint,
  ...context
});

export interface AdvancedSearchQueryOptions extends AdvancedSearchOptions {}

export interface AdvancedSearchResponse {
  results: AdvancedSearchResult[];
  total: number;
  page: number;
  totalPages: number;
  searchTime: number;
  suggestions?: SearchSuggestion[];
}

const sanitizeRange = (
  value: { min?: number; max?: number } | undefined,
  field: string,
  options: { min?: number; max?: number; integer?: boolean } = {}
) => {
  if (!value) {
    return undefined;
  }

  const sanitizedRange = {
    min: sanitizeOptionalNumber(value.min, `${field}.min`, options),
    max: sanitizeOptionalNumber(value.max, `${field}.max`, options)
  };

  return baseApi.sanitizeRequestData(sanitizedRange);
};

const sanitizeAdvancedFilters = (filters: AdvancedSearchFilters) => {
  const sanitizedFilters = {
    name: sanitizeOptionalString(filters.name, 'name', { maxLength: 200 }),
    industry: sanitizeOptionalString(filters.industry, 'industry', { maxLength: 100 }),
    location: sanitizeOptionalString(filters.location, 'location', { maxLength: 200 }),
    verificationStatus: sanitizeOptionalString(filters.verificationStatus, 'verificationStatus', {
      allowedValues: ['verified', 'pending', 'unverified'] as const
    }),
    size: sanitizeOptionalString(filters.size, 'size', {
      allowedValues: ['small', 'medium', 'large', 'enterprise'] as const
    }),
    establishedYear: sanitizeRange(filters.establishedYear, 'establishedYear', {
      min: 1800,
      max: new Date().getFullYear(),
      integer: true
    }),
    certifications: sanitizeOptionalArray(
      filters.certifications,
      'certifications',
      (certification, index) =>
        sanitizeString(certification, `certifications[${index}]`, {
          maxLength: 200
        }),
      { maxLength: 50 }
    ),
    productCategories: sanitizeOptionalArray(
      filters.productCategories,
      'productCategories',
      (category, index) =>
        sanitizeString(category, `productCategories[${index}]`, {
          maxLength: 200
        }),
      { maxLength: 50 }
    ),
    sustainabilityRating: sanitizeRange(filters.sustainabilityRating, 'sustainabilityRating', {
      min: 0,
      max: 100
    }),
    revenueRange: sanitizeRange(filters.revenueRange, 'revenueRange', {}),
    employeeCount: sanitizeRange(filters.employeeCount, 'employeeCount', {
      min: 0,
      integer: true
    }),
    supplyChainCompliance: sanitizeOptionalBoolean(filters.supplyChainCompliance, 'supplyChainCompliance'),
    hasBlockchainIntegration: sanitizeOptionalBoolean(filters.hasBlockchainIntegration, 'hasBlockchainIntegration'),
    geolocation: filters.geolocation
      ? baseApi.sanitizeRequestData({
          lat: sanitizeOptionalNumber(filters.geolocation.lat, 'geolocation.lat', { min: -90, max: 90 }),
          lng: sanitizeOptionalNumber(filters.geolocation.lng, 'geolocation.lng', { min: -180, max: 180 }),
          radius: sanitizeOptionalNumber(filters.geolocation.radius, 'geolocation.radius', {
            min: 0,
            max: 10000
          })
        })
      : undefined
  };

  return baseApi.sanitizeRequestData(sanitizedFilters);
};

const sanitizeAdvancedSearchOptions = (options?: AdvancedSearchQueryOptions) => {
  if (!options) {
    return undefined;
  }

  const normalizedOptions = options as AdvancedSearchOptions | undefined;

  const params: Record<string, unknown> = {
    sortBy: sanitizeOptionalString(normalizedOptions?.sortBy, 'sortBy', {
      allowedValues: ['relevance', 'name', 'establishedYear', 'verificationStatus', 'sustainabilityRating', 'distance'] as const
    }),
    sortOrder: sanitizeOptionalString(normalizedOptions?.sortOrder, 'sortOrder', {
      allowedValues: ['asc', 'desc'] as const
    }),
    page: sanitizeOptionalNumber(normalizedOptions?.page, 'page', { min: 1, integer: true }),
    limit: sanitizeOptionalNumber(normalizedOptions?.limit, 'limit', { min: 1, max: 100, integer: true }),
    includeInactive: sanitizeOptionalBoolean(normalizedOptions?.includeInactive, 'includeInactive'),
    fuzzySearch: sanitizeOptionalBoolean(normalizedOptions?.fuzzySearch, 'fuzzySearch'),
    highlightMatches: sanitizeOptionalBoolean(normalizedOptions?.highlightMatches, 'highlightMatches')
  };

  return baseApi.sanitizeQueryParams(params);
};

const sanitizeComparisonCriteria = (criteria?: SearchComparisonCriteria) => {
  if (!criteria) {
    return undefined;
  }

  return baseApi.sanitizeRequestData({
    financialMetrics: sanitizeOptionalBoolean(criteria.financialMetrics, 'criteria.financialMetrics'),
    sustainabilityScores: sanitizeOptionalBoolean(criteria.sustainabilityScores, 'criteria.sustainabilityScores'),
    productPortfolio: sanitizeOptionalBoolean(criteria.productPortfolio, 'criteria.productPortfolio'),
    certifications: sanitizeOptionalBoolean(criteria.certifications, 'criteria.certifications'),
    supplyChainMetrics: sanitizeOptionalBoolean(criteria.supplyChainMetrics, 'criteria.supplyChainMetrics'),
    customerSatisfaction: sanitizeOptionalBoolean(criteria.customerSatisfaction, 'criteria.customerSatisfaction'),
    innovationIndex: sanitizeOptionalBoolean(criteria.innovationIndex, 'criteria.innovationIndex')
  });
};

export const manufacturerSearchApi = {
  async advancedSearch(
    filters: AdvancedSearchFilters,
    options?: AdvancedSearchQueryOptions
  ): Promise<AdvancedSearchResponse> {
    const endpoint = `${BASE_PATH}/advanced`;
    try {
      const response = await manufacturerApi.post<ApiResponse<AdvancedSearchResponse>>(
        endpoint,
        sanitizeAdvancedFilters(filters),
        {
          params: sanitizeAdvancedSearchOptions(options)
        }
      );
      return baseApi.handleResponse(
        response,
        'Failed to execute advanced manufacturer search',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSearchLogContext('POST', endpoint, {
          filters: Object.keys(filters),
          options
        })
      );
    }
  },

  async compareManufacturers(
    manufacturerIds: string[],
    criteria?: SearchComparisonCriteria
  ): Promise<ManufacturerComparison> {
    const endpoint = `${BASE_PATH}/compare`;
    try {
      const sanitizedIds = sanitizeArray(
        manufacturerIds,
        'manufacturerIds',
        (id, index) => sanitizeObjectId(id as string, `manufacturerIds[${index}]`),
        { minLength: 2, maxLength: 10 }
      );
      const response = await manufacturerApi.post<ApiResponse<ManufacturerComparison>>(
        endpoint,
        baseApi.sanitizeRequestData({
          manufacturerIds: sanitizedIds,
          criteria: sanitizeComparisonCriteria(criteria)
        })
      );
      return baseApi.handleResponse(
        response,
        'Failed to compare manufacturers',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSearchLogContext('POST', endpoint, {
          manufacturerIds,
          criteria
        })
      );
    }
  },

  async getTrendAnalysis(
    manufacturerId: string,
    params: { metric: string; timeframe: TrendAnalysis['timeframe'] }
  ): Promise<TrendAnalysis> {
    const endpoint = `${BASE_PATH}/${sanitizeObjectId(manufacturerId, 'manufacturerId')}/trend-analysis`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ trendAnalysis: TrendAnalysis }>>(
        endpoint,
        {
          params: baseApi.sanitizeQueryParams({
            metric: sanitizeString(params.metric, 'metric', { maxLength: 100 }),
            timeframe: sanitizeString(params.timeframe, 'timeframe', {
              allowedValues: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const
            })
          })
        }
      );
      const { trendAnalysis } = baseApi.handleResponse(
        response,
        'Failed to fetch trend analysis',
        500
      );
      return trendAnalysis;
    } catch (error) {
      throw handleApiError(
        error,
        createSearchLogContext('GET', endpoint, { manufacturerId, ...params })
      );
    }
  },

  async getIndustryBenchmarks(industry: string): Promise<IndustryBenchmark> {
    const sanitizedIndustry = sanitizeString(industry, 'industry', { maxLength: 100 });
    const endpoint = `${BASE_PATH}/industry-benchmarks`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ benchmark: IndustryBenchmark }>>(
        endpoint,
        {
          params: baseApi.sanitizeQueryParams({
            industry: sanitizedIndustry
          })
        }
      );
      const { benchmark } = baseApi.handleResponse(
        response,
        'Failed to fetch industry benchmarks',
        500
      );
      return benchmark;
    } catch (error) {
      throw handleApiError(
        error,
        createSearchLogContext('GET', endpoint, { industry: sanitizedIndustry })
      );
    }
  }
};

export default manufacturerSearchApi;
