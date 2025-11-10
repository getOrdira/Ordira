// src/lib/api/features/supplyChain/supplyChainContractWrite.api.ts
// Supply chain contract write API aligned with backend routes/features/supplyChain/supplyChainContractWrite.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  IEndpointData,
  IProductData,
  IEventData,
  IEndpointResult,
  IProductResult,
  IEventResult,
  SupplyChainEventType
} from '@/lib/types/features/supplyChain';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeNumber,
  sanitizeOptionalBoolean,
  sanitizeOptionalObjectId,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';
import { sanitizeEthereumAddress } from '@/lib/validation/sanitizers/blockchain';

const BASE_PATH = '/supply-chain/contract/write';
const EVENT_TYPES: readonly SupplyChainEventType[] = [
  'sourced',
  'manufactured',
  'quality_checked',
  'packaged',
  'shipped',
  'delivered'
] as const;

type HttpMethod = 'POST';

const createSupplyChainContractWriteLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'supplyChain',
  module: 'contractWrite',
  method,
  endpoint,
  ...context
});

export interface ContractWriteBasePayload {
  businessId?: string;
  contractAddress: string;
}

export interface CreateEndpointPayload extends ContractWriteBasePayload, IEndpointData {}

export interface RegisterProductPayload extends ContractWriteBasePayload, IProductData {}

export interface LogEventPayload extends ContractWriteBasePayload, IEventData {}

export interface BatchCreateEndpointsPayload extends ContractWriteBasePayload {
  endpoints: IEndpointData[];
}

export interface BatchRegisterProductsPayload extends ContractWriteBasePayload {
  products: IProductData[];
}

export interface BatchLogEventsPayload extends ContractWriteBasePayload {
  events: IEventData[];
}

export interface CreateEndpointResponse {
  businessId: string;
  contractAddress: string;
  result: IEndpointResult;
}

export interface RegisterProductResponse {
  businessId: string;
  contractAddress: string;
  result: IProductResult;
}

export interface LogEventResponse {
  businessId: string;
  contractAddress: string;
  result: IEventResult;
}

export interface BatchEndpointsResponse {
  businessId: string;
  contractAddress: string;
  results: IEndpointResult[];
}

export interface BatchProductsResponse {
  businessId: string;
  contractAddress: string;
  results: IProductResult[];
}

export interface BatchEventsResponse {
  businessId: string;
  contractAddress: string;
  results: IEventResult[];
}

export interface GasEstimateResponse {
  businessId: string;
  contractAddress: string;
  gasEstimate: string;
}

const sanitizeBaseBody = (payload: ContractWriteBasePayload) => ({
  businessId: sanitizeOptionalObjectId(payload.businessId, 'businessId'),
  contractAddress: sanitizeEthereumAddress(payload.contractAddress, 'contractAddress')
});

const sanitizeEventType = (value: SupplyChainEventType, field: string) =>
  sanitizeString(value, field, {
    allowedValues: EVENT_TYPES,
    trim: true,
    toLowerCase: true
  }) as SupplyChainEventType;

const sanitizeEndpointData = (
  payload: IEndpointData,
  prefix: string = 'endpoint'
): IEndpointData => ({
  name: sanitizeString(payload.name, `${prefix}.name`, {
    trim: true,
    minLength: 1,
    maxLength: 200
  }),
  eventType: sanitizeEventType(payload.eventType, `${prefix}.eventType`),
  location: sanitizeString(payload.location, `${prefix}.location`, {
    trim: true,
    minLength: 1,
    maxLength: 200
  })
});

const sanitizeProductData = (
  payload: IProductData,
  prefix: string = 'product'
): IProductData => ({
  productId: sanitizeString(payload.productId, `${prefix}.productId`, {
    trim: true,
    minLength: 1,
    maxLength: 200
  }),
  name: sanitizeString(payload.name, `${prefix}.name`, {
    trim: true,
    minLength: 1,
    maxLength: 200
  }),
  description: sanitizeOptionalString(payload.description, `${prefix}.description`, {
    trim: true,
    maxLength: 2000,
    defaultValue: ''
  }) ?? ''
});

const sanitizeEventData = (
  payload: IEventData,
  prefix: string = 'event'
): IEventData => ({
  endpointId: sanitizeNumber(payload.endpointId, `${prefix}.endpointId`, {
    integer: true,
    min: 0
  }),
  productId: sanitizeString(payload.productId, `${prefix}.productId`, {
    trim: true,
    minLength: 1,
    maxLength: 200
  }),
  eventType: sanitizeEventType(payload.eventType as SupplyChainEventType, `${prefix}.eventType`),
  location: sanitizeString(payload.location, `${prefix}.location`, {
    trim: true,
    minLength: 1,
    maxLength: 200
  }),
  details: sanitizeOptionalString(payload.details, `${prefix}.details`, {
    trim: true,
    maxLength: 2000,
    defaultValue: ''
  }) ?? ''
});

const buildCreateEndpointBody = (payload: CreateEndpointPayload) =>
  baseApi.sanitizeRequestData({
    ...sanitizeBaseBody(payload),
    ...sanitizeEndpointData(payload)
  });

const buildRegisterProductBody = (payload: RegisterProductPayload) =>
  baseApi.sanitizeRequestData({
    ...sanitizeBaseBody(payload),
    ...sanitizeProductData(payload)
  });

const buildLogEventBody = (payload: LogEventPayload) =>
  baseApi.sanitizeRequestData({
    ...sanitizeBaseBody(payload),
    ...sanitizeEventData(payload)
  });

const buildBatchEndpointsBody = (payload: BatchCreateEndpointsPayload) =>
  baseApi.sanitizeRequestData({
    ...sanitizeBaseBody(payload),
    endpoints: (payload.endpoints ?? []).map((endpoint, index) =>
      sanitizeEndpointData(endpoint, `endpoints[${index}]`)
    )
  });

const buildBatchProductsBody = (payload: BatchRegisterProductsPayload) =>
  baseApi.sanitizeRequestData({
    ...sanitizeBaseBody(payload),
    products: (payload.products ?? []).map((product, index) =>
      sanitizeProductData(product, `products[${index}]`)
    )
  });

const buildBatchEventsBody = (payload: BatchLogEventsPayload) =>
  baseApi.sanitizeRequestData({
    ...sanitizeBaseBody(payload),
    events: (payload.events ?? []).map((event, index) =>
      sanitizeEventData(event, `events[${index}]`)
    )
  });

const buildGasEstimateBody = (payload: CreateEndpointPayload | RegisterProductPayload | LogEventPayload) =>
  baseApi.sanitizeRequestData({
    ...sanitizeBaseBody(payload),
    ...('endpointId' in payload
      ? sanitizeEventData(payload as IEventData)
      : 'productId' in payload
        ? sanitizeProductData(payload as IProductData)
        : sanitizeEndpointData(payload as IEndpointData)),
    isActive: sanitizeOptionalBoolean((payload as { isActive?: boolean }).isActive, 'isActive')
  });

export const supplyChainContractWriteApi = {
  /**
   * Create an endpoint on the supply chain contract.
   * POST /api/supply-chain/contract/write/endpoints
   */
  async createEndpoint(payload: CreateEndpointPayload): Promise<CreateEndpointResponse> {
    const endpoint = `${BASE_PATH}/endpoints`;
    const sanitizedPayload = buildCreateEndpointBody(payload);

    try {
      const response = await api.post<ApiResponse<CreateEndpointResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to create supply chain endpoint',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractWriteLogContext('POST', endpoint, {
          businessId: sanitizedPayload.businessId,
          contractAddress: sanitizedPayload.contractAddress
        })
      );
    }
  },

  /**
   * Register a product on the supply chain contract.
   * POST /api/supply-chain/contract/write/products
   */
  async registerProduct(payload: RegisterProductPayload): Promise<RegisterProductResponse> {
    const endpoint = `${BASE_PATH}/products`;
    const sanitizedPayload = buildRegisterProductBody(payload);

    try {
      const response = await api.post<ApiResponse<RegisterProductResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to register supply chain product',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractWriteLogContext('POST', endpoint, {
          businessId: sanitizedPayload.businessId,
          contractAddress: sanitizedPayload.contractAddress
        })
      );
    }
  },

  /**
   * Log an event on the supply chain contract.
   * POST /api/supply-chain/contract/write/events
   */
  async logEvent(payload: LogEventPayload): Promise<LogEventResponse> {
    const endpoint = `${BASE_PATH}/events`;
    const sanitizedPayload = buildLogEventBody(payload);

    try {
      const response = await api.post<ApiResponse<LogEventResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to log supply chain event',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractWriteLogContext('POST', endpoint, {
          businessId: sanitizedPayload.businessId,
          contractAddress: sanitizedPayload.contractAddress,
          endpointId: sanitizedPayload.endpointId
        })
      );
    }
  },

  /**
   * Batch create supply chain endpoints.
   * POST /api/supply-chain/contract/write/endpoints/batch
   */
  async batchCreateEndpoints(
    payload: BatchCreateEndpointsPayload
  ): Promise<BatchEndpointsResponse> {
    const endpoint = `${BASE_PATH}/endpoints/batch`;
    const sanitizedPayload = buildBatchEndpointsBody(payload);

    try {
      const response = await api.post<ApiResponse<BatchEndpointsResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to batch create supply chain endpoints',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractWriteLogContext('POST', endpoint, {
          businessId: sanitizedPayload.businessId,
          contractAddress: sanitizedPayload.contractAddress,
          count: Array.isArray(sanitizedPayload.endpoints) ? sanitizedPayload.endpoints.length : 0
        })
      );
    }
  },

  /**
   * Batch register supply chain products.
   * POST /api/supply-chain/contract/write/products/batch
   */
  async batchRegisterProducts(
    payload: BatchRegisterProductsPayload
  ): Promise<BatchProductsResponse> {
    const endpoint = `${BASE_PATH}/products/batch`;
    const sanitizedPayload = buildBatchProductsBody(payload);

    try {
      const response = await api.post<ApiResponse<BatchProductsResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to batch register supply chain products',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractWriteLogContext('POST', endpoint, {
          businessId: sanitizedPayload.businessId,
          contractAddress: sanitizedPayload.contractAddress,
          count: Array.isArray(sanitizedPayload.products) ? sanitizedPayload.products.length : 0
        })
      );
    }
  },

  /**
   * Batch log supply chain events.
   * POST /api/supply-chain/contract/write/events/batch
   */
  async batchLogEvents(payload: BatchLogEventsPayload): Promise<BatchEventsResponse> {
    const endpoint = `${BASE_PATH}/events/batch`;
    const sanitizedPayload = buildBatchEventsBody(payload);

    try {
      const response = await api.post<ApiResponse<BatchEventsResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to batch log supply chain events',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractWriteLogContext('POST', endpoint, {
          businessId: sanitizedPayload.businessId,
          contractAddress: sanitizedPayload.contractAddress,
          count: Array.isArray(sanitizedPayload.events) ? sanitizedPayload.events.length : 0
        })
      );
    }
  },

  /**
   * Estimate gas for creating an endpoint.
   * POST /api/supply-chain/contract/write/estimate-endpoint-gas
   */
  async estimateCreateEndpointGas(payload: CreateEndpointPayload): Promise<GasEstimateResponse> {
    const endpoint = `${BASE_PATH}/estimate-endpoint-gas`;
    const sanitizedPayload = buildGasEstimateBody(payload);

    try {
      const response = await api.post<ApiResponse<GasEstimateResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to estimate gas for endpoint creation',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractWriteLogContext('POST', endpoint, {
          businessId: sanitizedPayload.businessId,
          contractAddress: sanitizedPayload.contractAddress
        })
      );
    }
  },

  /**
   * Estimate gas for registering a product.
   * POST /api/supply-chain/contract/write/estimate-product-gas
   */
  async estimateRegisterProductGas(payload: RegisterProductPayload): Promise<GasEstimateResponse> {
    const endpoint = `${BASE_PATH}/estimate-product-gas`;
    const sanitizedPayload = buildGasEstimateBody(payload);

    try {
      const response = await api.post<ApiResponse<GasEstimateResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to estimate gas for product registration',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractWriteLogContext('POST', endpoint, {
          businessId: sanitizedPayload.businessId,
          contractAddress: sanitizedPayload.contractAddress
        })
      );
    }
  },

  /**
   * Estimate gas for logging an event.
   * POST /api/supply-chain/contract/write/estimate-event-gas
   */
  async estimateLogEventGas(payload: LogEventPayload): Promise<GasEstimateResponse> {
    const endpoint = `${BASE_PATH}/estimate-event-gas`;
    const sanitizedPayload = buildGasEstimateBody(payload);

    try {
      const response = await api.post<ApiResponse<GasEstimateResponse>>(endpoint, sanitizedPayload);
      return baseApi.handleResponse(
        response,
        'Failed to estimate gas for event logging',
        400
      );
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainContractWriteLogContext('POST', endpoint, {
          businessId: sanitizedPayload.businessId,
          contractAddress: sanitizedPayload.contractAddress
        })
      );
    }
  }
};

export default supplyChainContractWriteApi;