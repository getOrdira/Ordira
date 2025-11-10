// src/lib/api/features/supplyChain/supplyChainDashboard.api.ts
// Supply chain dashboard API aligned with backend routes/features/supplyChain/supplyChainDashboard.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  IDashboardOverview,
  IEndpointSummary,
  IProductSummary
} from '@backend/services/supplyChain/features/dashboard.service';
import type {
  IDashboardData,
  IApiResponse,
  IPaginatedResponse,
  ISupplyChainAnalytics
} from '@/lib/types/features/supplyChain';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeOptionalBoolean,
  sanitizeOptionalEnum,
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeEthereumAddress } from '@/lib/validation/sanitizers/blockchain';

const BASE_PATH = '/supply-chain/dashboard';
const TIMEFRAME_VALUES = ['day', 'week', 'month', 'year'] as const;
const ANALYTICS_GROUP_BY = ['day', 'week', 'month'] as const;

type HttpMethod = 'GET';
type Timeframe = typeof TIMEFRAME_VALUES[number];
type AnalyticsGroupBy = typeof ANALYTICS_GROUP_BY[number];

const createSupplyChainDashboardLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'supplyChain',
  module: 'dashboard',
  method,
  endpoint,
  ...context
});

export interface DashboardBaseQuery {
  businessId?: string;
  contractAddress: string;
}

export interface DashboardQuery extends DashboardBaseQuery {
  timeframe?: Timeframe;
  includeInactive?: boolean;
}

export interface ProductSummariesQuery extends DashboardBaseQuery {
  limit?: number;
}

export interface DashboardAnalyticsQuery extends DashboardBaseQuery {
  timeframe?: Timeframe;
  groupBy?: AnalyticsGroupBy;
}

export interface DashboardDataResponse {
  businessId: string;
  contractAddress: string;
  result: IApiResponse<IDashboardData>;
}

export interface DashboardOverviewResponse {
  businessId: string;
  contractAddress: string;
  result: IApiResponse<IDashboardOverview>;
}

export interface DashboardProductSummariesResponse {
  businessId: string;
  contractAddress: string;
  result: IPaginatedResponse<IProductSummary>;
}

export interface DashboardEndpointSummariesResponse {
  businessId: string;
  contractAddress: string;
  result: IApiResponse<IEndpointSummary[]>;
}

export interface DashboardAnalyticsResponse {
  businessId: string;
  contractAddress: string;
  result: IApiResponse<ISupplyChainAnalytics>;
}

const sanitizeBaseQuery = (query: DashboardBaseQuery) => ({
  businessId: sanitizeOptionalObjectId(query.businessId, 'businessId'),
  contractAddress: sanitizeEthereumAddress(query.contractAddress, 'contractAddress')
});

const sanitizeDashboardQuery = (query: DashboardQuery) =>
  baseApi.sanitizeQueryParams({
    ...sanitizeBaseQuery(query),
    timeframe: sanitizeOptionalEnum<Timeframe>(query.timeframe, 'timeframe', TIMEFRAME_VALUES),
    includeInactive: sanitizeOptionalBoolean(query.includeInactive, 'includeInactive')
  });

const sanitizeProductSummariesQuery = (query: ProductSummariesQuery) =>
  baseApi.sanitizeQueryParams({
    ...sanitizeBaseQuery(query),
    limit: sanitizeOptionalNumber(query.limit, 'limit', { integer: true, min: 1, max: 100 })
  });

const sanitizeAnalyticsQuery = (query: DashboardAnalyticsQuery) =>
  baseApi.sanitizeQueryParams({
    ...sanitizeBaseQuery(query),
    timeframe: sanitizeOptionalEnum<Timeframe>(query.timeframe, 'timeframe', TIMEFRAME_VALUES),
    groupBy: sanitizeOptionalEnum<AnalyticsGroupBy>(query.groupBy, 'groupBy', ANALYTICS_GROUP_BY)
  });

export const supplyChainDashboardApi = {
  /**
   * Retrieve comprehensive dashboard data.
   * GET /api/supply-chain/dashboard
   */
  async getDashboardData(query: DashboardQuery): Promise<DashboardDataResponse> {
    const endpoint = BASE_PATH;
    const params = sanitizeDashboardQuery(query);

    try {
      const response = await api.get<ApiResponse<DashboardDataResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain dashboard data',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainDashboardLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          timeframe: params.timeframe,
          includeInactive: params.includeInactive
        })
      );
    }
  },

  /**
   * Retrieve dashboard overview.
   * GET /api/supply-chain/dashboard/overview
   */
  async getDashboardOverview(query: DashboardBaseQuery): Promise<DashboardOverviewResponse> {
    const endpoint = `${BASE_PATH}/overview`;
    const params = baseApi.sanitizeQueryParams(sanitizeBaseQuery(query));

    try {
      const response = await api.get<ApiResponse<DashboardOverviewResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain dashboard overview',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainDashboardLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress
        })
      );
    }
  },

  /**
   * Retrieve product summaries.
   * GET /api/supply-chain/dashboard/products
   */
  async getProductSummaries(
    query: ProductSummariesQuery
  ): Promise<DashboardProductSummariesResponse> {
    const endpoint = `${BASE_PATH}/products`;
    const params = sanitizeProductSummariesQuery(query);

    try {
      const response = await api.get<ApiResponse<DashboardProductSummariesResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain product summaries',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainDashboardLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          limit: params.limit
        })
      );
    }
  },

  /**
   * Retrieve endpoint summaries.
   * GET /api/supply-chain/dashboard/endpoints
   */
  async getEndpointSummaries(
    query: DashboardBaseQuery
  ): Promise<DashboardEndpointSummariesResponse> {
    const endpoint = `${BASE_PATH}/endpoints`;
    const params = baseApi.sanitizeQueryParams(sanitizeBaseQuery(query));

    try {
      const response = await api.get<ApiResponse<DashboardEndpointSummariesResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain endpoint summaries',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainDashboardLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress
        })
      );
    }
  },

  /**
   * Retrieve dashboard analytics.
   * GET /api/supply-chain/dashboard/analytics
   */
  async getDashboardAnalytics(
    query: DashboardAnalyticsQuery
  ): Promise<DashboardAnalyticsResponse> {
    const endpoint = `${BASE_PATH}/analytics`;
    const params = sanitizeAnalyticsQuery(query);

    try {
      const response = await api.get<ApiResponse<DashboardAnalyticsResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain dashboard analytics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainDashboardLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          timeframe: params.timeframe,
          groupBy: params.groupBy
        })
      );
    }
  }
};

export default supplyChainDashboardApi;