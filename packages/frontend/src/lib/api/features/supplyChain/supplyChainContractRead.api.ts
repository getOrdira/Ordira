// src/lib/api/features/supplyChain/supplyChainContractRead.api.ts
// Supply chain contract read API aligned with backend routes/features/supplyChain/supplyChainContractRead.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { IContractReadResult } from '@backend/services/supplyChain/core/contractRead.service';
import type {
  IContractStats,
  ISupplyChainEndpoint,
  ISupplyChainEvent,
  ISupplyChainProduct
} from '@/lib/types/features/supplyChain';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeNumber,
  sanitizeOptionalBoolean,
  sanitizeOptionalNumber,
  sanitizeOptionalObjectId,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeEthereumAddress } from '@/lib/validation/sanitizers/blockchain';

const BASE_PATH = '/supply-chain/contract';

type HttpMethod = 'GET';

const createSupplyChainContractReadLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'supplyChain',
  module: 'contractRead',
  method,
  endpoint,
  ...context
});

export interface ContractReadBaseQuery {
  businessId?: string;
  contractAddress: string;
}

export interface ContractReadListQuery extends ContractReadBaseQuery {
  includeInactive?: boolean;
  limit?: number;
  page?: number;
  offset?: number;
}

export interface ContractReadProductEventsQuery extends ContractReadBaseQuery {
  productId: string;
  limit?: number;
  page?: number;
  offset?: number;
}

export interface EntityByNumericIdQuery extends ContractReadBaseQuery {
  id: number | string;
}

export interface ContractStatsResponse {
  businessId: string;
  contractAddress: string;
  result: IContractReadResult<IContractStats>;
}

export interface ContractEndpointsResponse {
  businessId: string;
  contractAddress: string;
  result: IContractReadResult<ISupplyChainEndpoint[]>;
}

export interface ContractProductsResponse {
  businessId: string;
  contractAddress: string;
  result: IContractReadResult<ISupplyChainProduct[]>;
}

export interface ProductEventsResponse {
  businessId: string;
  contractAddress: string;
  productId: string;
  result: IContractReadResult<ISupplyChainEvent[]>;
}

export interface EndpointByIdResponse {
  businessId: string;
  contractAddress: string;
  endpointId: number;
  result: IContractReadResult<ISupplyChainEndpoint>;
}

export interface ProductByIdResponse {
  businessId: string;
  contractAddress: string;
  productId: number;
  result: IContractReadResult<ISupplyChainProduct>;
}

export interface EventByIdResponse {
  businessId: string;
  contractAddress: string;
  eventId: number;
  result: IContractReadResult<ISupplyChainEvent>;
}

const sanitizeBaseFields = (query: ContractReadBaseQuery) => ({
  businessId: sanitizeOptionalObjectId(query.businessId, 'businessId'),
  contractAddress: sanitizeEthereumAddress(query.contractAddress, 'contractAddress')
});

const sanitizeListOptions = (query: ContractReadListQuery) => ({
  includeInactive: sanitizeOptionalBoolean(query.includeInactive, 'includeInactive'),
  limit: sanitizeOptionalNumber(query.limit, 'limit', { integer: true, min: 1, max: 500 }),
  page: sanitizeOptionalNumber(query.page, 'page', { integer: true, min: 1 }),
  offset: sanitizeOptionalNumber(query.offset, 'offset', { integer: true, min: 0 })
});

const sanitizeProductId = (productId: string) =>
  sanitizeString(productId, 'productId', {
    trim: true,
    minLength: 1,
    maxLength: 200
  });

const sanitizeNumericId = (value: number | string, field: string) =>
  sanitizeNumber(value, field, { integer: true, min: 0 });

const toQueryParams = (fields: Record<string, unknown>) => baseApi.sanitizeQueryParams(fields);

export const supplyChainContractReadApi = {
  /**
   * Retrieve contract statistics.
   * GET /api/supply-chain/contract/read/stats
   */
  async getContractStats(query: ContractReadBaseQuery): Promise<ContractStatsResponse> {
    const endpoint = `${BASE_PATH}/read/stats`;
    const params = toQueryParams({
      ...sanitizeBaseFields(query)
    });

    try {
      const response = await api.get<ApiResponse<ContractStatsResponse>>(endpoint, { params });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain contract statistics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractReadLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress
        })
      );
    }
  },

  /**
   * Retrieve contract endpoints with pagination.
   * GET /api/supply-chain/contract/read/endpoints
   */
  async getContractEndpoints(
    query: ContractReadListQuery
  ): Promise<ContractEndpointsResponse> {
    const endpoint = `${BASE_PATH}/read/endpoints`;
    const params = toQueryParams({
      ...sanitizeBaseFields(query),
      ...sanitizeListOptions(query)
    });

    try {
      const response = await api.get<ApiResponse<ContractEndpointsResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain endpoints',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractReadLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          includeInactive: params.includeInactive,
          limit: params.limit,
          page: params.page,
          offset: params.offset
        })
      );
    }
  },

  /**
   * Retrieve contract products with pagination.
   * GET /api/supply-chain/contract/read/products
   */
  async getContractProducts(
    query: ContractReadListQuery
  ): Promise<ContractProductsResponse> {
    const endpoint = `${BASE_PATH}/read/products`;
    const params = toQueryParams({
      ...sanitizeBaseFields(query),
      ...sanitizeListOptions(query)
    });

    try {
      const response = await api.get<ApiResponse<ContractProductsResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain products',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractReadLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          includeInactive: params.includeInactive,
          limit: params.limit,
          page: params.page,
          offset: params.offset
        })
      );
    }
  },

  /**
   * Retrieve product events with pagination.
   * GET /api/supply-chain/contract/read/product-events
   */
  async getProductEvents(
    query: ContractReadProductEventsQuery
  ): Promise<ProductEventsResponse> {
    const endpoint = `${BASE_PATH}/read/product-events`;
    const params = toQueryParams({
      ...sanitizeBaseFields(query),
      productId: sanitizeProductId(query.productId),
      limit: sanitizeOptionalNumber(query.limit, 'limit', { integer: true, min: 1, max: 500 }),
      page: sanitizeOptionalNumber(query.page, 'page', { integer: true, min: 1 }),
      offset: sanitizeOptionalNumber(query.offset, 'offset', { integer: true, min: 0 })
    });

    try {
      const response = await api.get<ApiResponse<ProductEventsResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain product events',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractReadLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          productId: params.productId,
          limit: params.limit,
          page: params.page,
          offset: params.offset
        })
      );
    }
  },

  /**
   * Retrieve endpoint by numeric identifier.
   * GET /api/supply-chain/contract/read/endpoint
   */
  async getEndpointById(
    query: EntityByNumericIdQuery
  ): Promise<EndpointByIdResponse> {
    const endpoint = `${BASE_PATH}/read/endpoint`;
    const sanitizedId = sanitizeNumericId(query.id, 'endpointId');
    const params = toQueryParams({
      ...sanitizeBaseFields(query),
      endpointId: sanitizedId
    });

    try {
      const response = await api.get<ApiResponse<EndpointByIdResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain endpoint',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractReadLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          endpointId: sanitizedId
        })
      );
    }
  },

  /**
   * Retrieve product by numeric identifier.
   * GET /api/supply-chain/contract/read/product
   */
  async getProductById(
    query: EntityByNumericIdQuery
  ): Promise<ProductByIdResponse> {
    const endpoint = `${BASE_PATH}/read/product`;
    const sanitizedId = sanitizeNumericId(query.id, 'productId');
    const params = toQueryParams({
      ...sanitizeBaseFields(query),
      productId: sanitizedId
    });

    try {
      const response = await api.get<ApiResponse<ProductByIdResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain product',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractReadLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          productId: sanitizedId
        })
      );
    }
  },

  /**
   * Retrieve event by numeric identifier.
   * GET /api/supply-chain/contract/read/event
   */
  async getEventById(
    query: EntityByNumericIdQuery
  ): Promise<EventByIdResponse> {
    const endpoint = `${BASE_PATH}/read/event`;
    const sanitizedId = sanitizeNumericId(query.id, 'eventId');
    const params = toQueryParams({
      ...sanitizeBaseFields(query),
      eventId: sanitizedId
    });

    try {
      const response = await api.get<ApiResponse<EventByIdResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch supply chain event',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractReadLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          eventId: sanitizedId
        })
      );
    }
  }
};

export default supplyChainContractReadApi;