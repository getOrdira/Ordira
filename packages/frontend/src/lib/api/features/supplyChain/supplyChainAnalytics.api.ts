// src/lib/api/features/supplyChain/supplyChainAnalytics.api.ts
// Supply chain analytics API aligned with backend routes/features/supplyChain/supplyChainAnalytics.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { IApiResponse } from '@/lib/types/features/supplyChain';
import type {
  IAnalyticsResponse,
  IEndpointAnalytics,
  IEventAnalytics,
  IPerformanceMetrics,
  IProductAnalytics,
  ITrendAnalysis
} from '@backend/services/supplyChain/features/analytics.service';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalBoolean,
  sanitizeOptionalDate,
  sanitizeOptionalEnum,
  sanitizeOptionalObjectId
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeEthereumAddress } from '@/lib/validation/sanitizers/blockchain';

const BASE_PATH = '/supply-chain/analytics';
const GROUP_BY_VALUES = ['day', 'week', 'month', 'year'] as const;

type HttpMethod = 'GET';
type GroupBy = typeof GROUP_BY_VALUES[number];

const createSupplyChainAnalyticsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'supplyChain',
  module: 'analytics',
  method,
  endpoint,
  ...context
});

export interface SupplyChainAnalyticsQuery {
  businessId?: string;
  contractAddress: string;
  startDate?: string | Date;
  endDate?: string | Date;
  groupBy?: GroupBy;
  includeInactive?: boolean;
}

export interface SupplyChainEventAnalyticsQuery {
  businessId?: string;
  contractAddress: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface SupplyChainBaseAnalyticsQuery {
  businessId?: string;
  contractAddress: string;
}

export interface SupplyChainAnalyticsResponse {
  businessId: string;
  contractAddress: string;
  result: IApiResponse<IAnalyticsResponse>;
}

export interface SupplyChainEventAnalyticsResponse {
  businessId: string;
  contractAddress: string;
  result: IApiResponse<IEventAnalytics>;
}

export interface SupplyChainProductAnalyticsResponse {
  businessId: string;
  contractAddress: string;
  result: IApiResponse<IProductAnalytics>;
}

export interface SupplyChainEndpointAnalyticsResponse {
  businessId: string;
  contractAddress: string;
  result: IApiResponse<IEndpointAnalytics>;
}

export interface SupplyChainPerformanceMetricsResponse {
  businessId: string;
  contractAddress: string;
  result: IApiResponse<IPerformanceMetrics>;
}

export interface SupplyChainTrendAnalysisResponse {
  businessId: string;
  contractAddress: string;
  result: IApiResponse<ITrendAnalysis>;
}

const toIsoString = (value: string | Date | undefined, field: string) => {
  const date = sanitizeOptionalDate(value, field);
  return date ? date.toISOString() : undefined;
};

const sanitizeBaseQuery = (query: SupplyChainBaseAnalyticsQuery) => {
  return baseApi.sanitizeQueryParams({
    businessId: sanitizeOptionalObjectId(query.businessId, 'businessId'),
    contractAddress: sanitizeEthereumAddress(query.contractAddress, 'contractAddress')
  });
};

const sanitizeAnalyticsQuery = (query: SupplyChainAnalyticsQuery) => {
  const base = sanitizeBaseQuery(query);
  return baseApi.sanitizeQueryParams({
    ...base,
    startDate: toIsoString(query.startDate, 'startDate'),
    endDate: toIsoString(query.endDate, 'endDate'),
    groupBy: sanitizeOptionalEnum<GroupBy>(query.groupBy, 'groupBy', GROUP_BY_VALUES),
    includeInactive: sanitizeOptionalBoolean(query.includeInactive, 'includeInactive')
  });
};

const sanitizeEventAnalyticsQuery = (query: SupplyChainEventAnalyticsQuery) => {
  const base = sanitizeBaseQuery(query);
  return baseApi.sanitizeQueryParams({
    ...base,
    startDate: toIsoString(query.startDate, 'startDate'),
    endDate: toIsoString(query.endDate, 'endDate')
  });
};

export const supplyChainAnalyticsApi = {
  /**
   * Retrieve comprehensive analytics for a supply chain contract.
   * GET /api/supply-chain/analytics
   */
  async getAnalytics(query: SupplyChainAnalyticsQuery): Promise<SupplyChainAnalyticsResponse> {
    const endpoint = BASE_PATH;
    const params = sanitizeAnalyticsQuery(query);

    try {
      const response = await api.get<ApiResponse<SupplyChainAnalyticsResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain analytics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAnalyticsLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          hasDateRange: Boolean(params.startDate || params.endDate),
          includeInactive: params.includeInactive
        })
      );
    }
  },

  /**
   * Retrieve event analytics for a contract.
   * GET /api/supply-chain/analytics/events
   */
  async getEventAnalytics(
    query: SupplyChainEventAnalyticsQuery
  ): Promise<SupplyChainEventAnalyticsResponse> {
    const endpoint = `${BASE_PATH}/events`;
    const params = sanitizeEventAnalyticsQuery(query);

    try {
      const response = await api.get<ApiResponse<SupplyChainEventAnalyticsResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain event analytics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAnalyticsLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          hasDateRange: Boolean(params.startDate || params.endDate)
        })
      );
    }
  },

  /**
   * Retrieve product analytics for a contract.
   * GET /api/supply-chain/analytics/products
   */
  async getProductAnalytics(
    query: SupplyChainBaseAnalyticsQuery
  ): Promise<SupplyChainProductAnalyticsResponse> {
    const endpoint = `${BASE_PATH}/products`;
    const params = sanitizeBaseQuery(query);

    try {
      const response = await api.get<ApiResponse<SupplyChainProductAnalyticsResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain product analytics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAnalyticsLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress
        })
      );
    }
  },

  /**
   * Retrieve endpoint analytics for a contract.
   * GET /api/supply-chain/analytics/endpoints
   */
  async getEndpointAnalytics(
    query: SupplyChainBaseAnalyticsQuery
  ): Promise<SupplyChainEndpointAnalyticsResponse> {
    const endpoint = `${BASE_PATH}/endpoints`;
    const params = sanitizeBaseQuery(query);

    try {
      const response = await api.get<ApiResponse<SupplyChainEndpointAnalyticsResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain endpoint analytics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAnalyticsLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress
        })
      );
    }
  },

  /**
   * Retrieve performance metrics for a contract.
   * GET /api/supply-chain/analytics/performance
   */
  async getPerformanceMetrics(
    query: SupplyChainEventAnalyticsQuery
  ): Promise<SupplyChainPerformanceMetricsResponse> {
    const endpoint = `${BASE_PATH}/performance`;
    const params = sanitizeEventAnalyticsQuery(query);

    try {
      const response = await api.get<ApiResponse<SupplyChainPerformanceMetricsResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain performance metrics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAnalyticsLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          hasDateRange: Boolean(params.startDate || params.endDate)
        })
      );
    }
  },

  /**
   * Retrieve trend analysis for a contract.
   * GET /api/supply-chain/analytics/trends
   */
  async getTrendAnalysis(
    query: SupplyChainEventAnalyticsQuery
  ): Promise<SupplyChainTrendAnalysisResponse> {
    const endpoint = `${BASE_PATH}/trends`;
    const params = sanitizeEventAnalyticsQuery(query);

    try {
      const response = await api.get<ApiResponse<SupplyChainTrendAnalysisResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain trend analysis',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainAnalyticsLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          hasDateRange: Boolean(params.startDate || params.endDate)
        })
      );
    }
  }
};

export default supplyChainAnalyticsApi;