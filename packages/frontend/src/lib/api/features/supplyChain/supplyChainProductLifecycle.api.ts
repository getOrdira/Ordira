// src/lib/api/features/supplyChain/supplyChainProductLifecycle.api.ts
// Supply chain product lifecycle API aligned with backend routes/features/supplyChain/supplyChainProductLifecycle.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  IEventLoggingResponse,
  IProductLifecycleAnalytics,
  IProductLifecycleResponse,
  IProductStatusResponse,
  IBatchEventLoggingResponse
} from '@backend/services/supplyChain/features/productLifeCycle.service';
import type { IApiResponse, SupplyChainEventType } from '@/lib/types/features/supplyChain';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeNumber,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeEthereumAddress } from '@/lib/validation/sanitizers/blockchain';

const BASE_PATH = '/supply-chain/product-lifecycle';
const EVENT_TYPES = [
  'sourced',
  'manufactured',
  'quality_checked',
  'packaged',
  'shipped',
  'delivered'
] as const;

type HttpMethod = 'GET' | 'POST';

const createSupplyChainProductLifecycleLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'supplyChain',
  module: 'productLifecycle',
  method,
  endpoint,
  ...context
});

export interface ProductLifecycleQuery {
  businessId?: string;
  contractAddress: string;
  productId: string;
}

export interface LifecycleBaseQuery {
  businessId?: string;
  contractAddress: string;
}

export interface LogProductEventPayload {
  businessId?: string;
  contractAddress: string;
  productId: string;
  eventType: SupplyChainEventType;
  location: string;
  details?: string;
  endpointId?: number;
}

export interface BatchLogEventsPayload {
  businessId?: string;
  contractAddress: string;
  events: Array<{
    productId: string;
    eventType: SupplyChainEventType;
    location: string;
    details?: string;
    endpointId?: number;
  }>;
}

export interface ProductLifecycleResponse {
  businessId: string;
  contractAddress: string;
  productId: string;
  result: IApiResponse<IProductLifecycleResponse>;
}

export interface LogProductEventResponse {
  businessId: string;
  contractAddress: string;
  productId: string;
  result: IApiResponse<IEventLoggingResponse>;
}

export interface ProductStatusResponse {
  businessId: string;
  contractAddress: string;
  productId: string;
  result: IApiResponse<IProductStatusResponse>;
}

export interface BatchLogEventsResponse {
  businessId: string;
  contractAddress: string;
  result: IApiResponse<IBatchEventLoggingResponse>;
}

export interface ProductLifecycleAnalyticsResponse {
  businessId: string;
  contractAddress: string;
  result: IApiResponse<IProductLifecycleAnalytics>;
}

const sanitizeBaseFields = (payload: { businessId?: string; contractAddress: string }) => ({
  businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
  contractAddress: sanitizeEthereumAddress(payload.contractAddress, 'contractAddress')
});

const sanitizeProductId = (productId: string) =>
  sanitizeString(productId, 'productId', {
    trim: true,
    minLength: 1,
    maxLength: 200
  });

const sanitizeEventType = (eventType: SupplyChainEventType, field: string) =>
  sanitizeString(eventType, field, {
    allowedValues: EVENT_TYPES,
    trim: true,
    toLowerCase: true
  }) as SupplyChainEventType;

const sanitizeLocation = (location: string, field: string) =>
  sanitizeString(location, field, {
    trim: true,
    minLength: 1,
    maxLength: 200
  });

const sanitizeDetails = (details: string | undefined, field: string) =>
  sanitizeOptionalString(details, field, {
    trim: true,
    maxLength: 2000,
    defaultValue: ''
  }) ?? '';

const sanitizeEndpointId = (endpointId: number | undefined, field: string) =>
  endpointId === undefined
    ? undefined
    : sanitizeNumber(endpointId, field, { integer: true, min: 0 });

const buildLifecycleQueryParams = (query: ProductLifecycleQuery) =>
  baseApi.sanitizeQueryParams({
    ...sanitizeBaseFields(query),
    productId: sanitizeProductId(query.productId)
  });

const buildLogEventBody = (payload: LogProductEventPayload) =>
  baseApi.sanitizeRequestData({
    ...sanitizeBaseFields(payload),
    productId: sanitizeProductId(payload.productId),
    eventType: sanitizeEventType(payload.eventType, 'eventType'),
    location: sanitizeLocation(payload.location, 'location'),
    details: sanitizeDetails(payload.details, 'details'),
    endpointId: sanitizeEndpointId(payload.endpointId, 'endpointId')
  });

const buildBatchEventsBody = (payload: BatchLogEventsPayload) =>
  baseApi.sanitizeRequestData({
    ...sanitizeBaseFields(payload),
    events: (payload.events ?? []).map((event, index) => ({
      productId: sanitizeProductId(event.productId),
      eventType: sanitizeEventType(event.eventType, `events[${index}].eventType`),
      location: sanitizeLocation(event.location, `events[${index}].location`),
      details: sanitizeDetails(event.details, `events[${index}].details`),
      endpointId: sanitizeEndpointId(event.endpointId, `events[${index}].endpointId`)
    }))
  });

export const supplyChainProductLifecycleApi = {
  /**
   * Retrieve product lifecycle details.
   * GET /api/supply-chain/product-lifecycle/lifecycle
   */
  async getProductLifecycle(
    query: ProductLifecycleQuery
  ): Promise<ProductLifecycleResponse> {
    const endpoint = `${BASE_PATH}/lifecycle`;
    const params = buildLifecycleQueryParams(query);

    try {
      const response = await api.get<ApiResponse<ProductLifecycleResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch product lifecycle',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainProductLifecycleLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          productId: params.productId
        })
      );
    }
  },

  /**
   * Log a product lifecycle event.
   * POST /api/supply-chain/product-lifecycle/log-event
   */
  async logProductEvent(payload: LogProductEventPayload): Promise<LogProductEventResponse> {
    const endpoint = `${BASE_PATH}/log-event`;
    const sanitizedPayload = buildLogEventBody(payload);

    try {
      const response = await api.post<ApiResponse<LogProductEventResponse>>(
        endpoint,
        sanitizedPayload
      );
      return baseApi.handleResponse(
        response,
        'Failed to log product lifecycle event',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainProductLifecycleLogContext('POST', endpoint, {
          businessId: sanitizedPayload.businessId,
          contractAddress: sanitizedPayload.contractAddress,
          productId: sanitizedPayload.productId,
          eventType: sanitizedPayload.eventType
        })
      );
    }
  },

  /**
   * Retrieve product lifecycle status.
   * GET /api/supply-chain/product-lifecycle/status
   */
  async getProductStatus(query: ProductLifecycleQuery): Promise<ProductStatusResponse> {
    const endpoint = `${BASE_PATH}/status`;
    const params = buildLifecycleQueryParams(query);

    try {
      const response = await api.get<ApiResponse<ProductStatusResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch product lifecycle status',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainProductLifecycleLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress,
          productId: params.productId
        })
      );
    }
  },

  /**
   * Batch log product lifecycle events.
   * POST /api/supply-chain/product-lifecycle/batch-log-events
   */
  async batchLogEvents(payload: BatchLogEventsPayload): Promise<BatchLogEventsResponse> {
    const endpoint = `${BASE_PATH}/batch-log-events`;
    const sanitizedPayload = buildBatchEventsBody(payload);

    try {
      const response = await api.post<ApiResponse<BatchLogEventsResponse>>(
        endpoint,
        sanitizedPayload
      );
      return baseApi.handleResponse(
        response,
        'Failed to batch log product lifecycle events',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainProductLifecycleLogContext('POST', endpoint, {
          businessId: sanitizedPayload.businessId,
          contractAddress: sanitizedPayload.contractAddress,
          batchSize: Array.isArray(sanitizedPayload.events) ? sanitizedPayload.events.length : 0
        })
      );
    }
  },

  /**
   * Retrieve product lifecycle analytics.
   * GET /api/supply-chain/product-lifecycle/analytics
   */
  async getProductLifecycleAnalytics(
    query: LifecycleBaseQuery
  ): Promise<ProductLifecycleAnalyticsResponse> {
    const endpoint = `${BASE_PATH}/analytics`;
    const params = baseApi.sanitizeQueryParams(sanitizeBaseFields(query));

    try {
      const response = await api.get<ApiResponse<ProductLifecycleAnalyticsResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch product lifecycle analytics',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainProductLifecycleLogContext('GET', endpoint, {
          businessId: params.businessId,
          contractAddress: params.contractAddress
        })
      );
    }
  }
};

export default supplyChainProductLifecycleApi;