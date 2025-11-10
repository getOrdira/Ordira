import { manufacturerApi } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  SupplyChainContractInfo,
  SupplyChainEndpoint,
  SupplyChainProduct,
  SupplyChainEvent,
  SupplyChainDashboard,
  ProductQrCodeInfo,
  QrCodeGenerationResult,
  BatchQrCodeResult
} from '@/lib/types/features/manufacturers';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeObjectId,
  sanitizeOptionalNumber,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

type HttpMethod = 'GET' | 'POST' | 'PUT';

const BASE_PATH = '/supply-chain';

const createSupplyChainLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'manufacturers',
  module: 'supply-chain',
  method,
  endpoint,
  ...context
});

export interface DeployContractPayload {
  manufacturerName: string;
}

export interface CreateEndpointPayload {
  name: string;
  eventType: SupplyChainEndpoint['eventType'];
  location: string;
}

export interface RegisterProductPayload {
  productId: string;
  name: string;
  description: string;
}

export interface LogSupplyChainEventPayload {
  endpointId: number;
  productId: string;
  eventType: string;
  location: string;
  details: string;
}

export interface UpdateEndpointStatusPayload {
  endpointId: number;
  isActive: boolean;
}

export interface SupplyChainStatistics {
  totalContracts: number;
  totalEvents: number;
  totalProducts: number;
  averageEventsPerProduct: number;
  mostActiveEndpoint?: {
    name: string;
    eventCount: number;
  };
  recentActivity: {
    eventsToday: number;
    eventsThisWeek: number;
    eventsThisMonth: number;
  };
}

export interface DeactivateContractResult {
  success: boolean;
  message: string;
  deactivatedAt: string | Date;
}

const buildSupplyChainPath = (manufacturerId: string, suffix: string = '') => {
  const sanitizedId = sanitizeObjectId(manufacturerId, 'manufacturerId');
  return `${BASE_PATH}/${sanitizedId}${suffix}`;
};

const sanitizeEndpointPayload = (payload: CreateEndpointPayload) => {
  return baseApi.sanitizeRequestData({
    name: sanitizeString(payload.name, 'name', { maxLength: 200 }),
    eventType: sanitizeString(payload.eventType, 'eventType', {
      allowedValues: ['sourced', 'manufactured', 'quality_checked', 'packaged', 'shipped', 'delivered'] as const
    }),
    location: sanitizeString(payload.location, 'location', { maxLength: 200 })
  });
};

const sanitizeProductPayload = (payload: RegisterProductPayload) => {
  return baseApi.sanitizeRequestData({
    productId: sanitizeString(payload.productId, 'productId', { maxLength: 200 }),
    name: sanitizeString(payload.name, 'name', { maxLength: 200 }),
    description: sanitizeString(payload.description, 'description', { maxLength: 2000 })
  });
};

const sanitizeEventPayload = (payload: LogSupplyChainEventPayload) => {
  return baseApi.sanitizeRequestData({
    endpointId: sanitizeOptionalNumber(payload.endpointId, 'endpointId', { min: 0, integer: true }),
    productId: sanitizeString(payload.productId, 'productId', { maxLength: 200 }),
    eventType: sanitizeString(payload.eventType, 'eventType', { maxLength: 100 }),
    location: sanitizeString(payload.location, 'location', { maxLength: 200 }),
    details: sanitizeString(payload.details, 'details', { maxLength: 2000 })
  });
};

const sanitizeBatchProductIds = (productIds: string[]) =>
  sanitizeArray(
    productIds,
    'productIds',
    (id, index) => sanitizeString(id as string, `productIds[${index}]`, { maxLength: 200 }),
    { minLength: 1, maxLength: 100 }
  );

export const manufacturerSupplyChainApi = {
  async deployContract(
    manufacturerId: string,
    payload: DeployContractPayload
  ): Promise<SupplyChainContractInfo> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/contract/deploy`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ contractInfo: SupplyChainContractInfo }>>(
        endpoint,
        baseApi.sanitizeRequestData({
          manufacturerName: sanitizeString(payload.manufacturerName, 'manufacturerName', { maxLength: 200 })
        })
      );
      const { contractInfo } = baseApi.handleResponse(
        response,
        'Failed to deploy supply chain contract',
        400
      );
      return contractInfo;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('POST', endpoint, { manufacturerId })
      );
    }
  },

  async getContractInfo(manufacturerId: string): Promise<SupplyChainContractInfo | null> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/contract`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ contractInfo: SupplyChainContractInfo | null }>>(
        endpoint
      );
      const { contractInfo } = baseApi.handleResponse(
        response,
        'Failed to fetch supply chain contract info',
        500
      );
      return contractInfo ?? null;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('GET', endpoint, { manufacturerId })
      );
    }
  },

  async deactivateContract(manufacturerId: string): Promise<DeactivateContractResult> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/contract/deactivate`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ deactivationResult: DeactivateContractResult }>>(
        endpoint
      );
      const { deactivationResult } = baseApi.handleResponse(
        response,
        'Failed to deactivate supply chain contract',
        400
      );
      return deactivationResult;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('POST', endpoint, { manufacturerId })
      );
    }
  },

  async createEndpoint(
    manufacturerId: string,
    payload: CreateEndpointPayload
  ): Promise<SupplyChainEndpoint> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/endpoints`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ endpoint: SupplyChainEndpoint }>>(
        endpoint,
        sanitizeEndpointPayload(payload)
      );
      const { endpoint: endpointData } = baseApi.handleResponse(
        response,
        'Failed to create supply chain endpoint',
        400
      );
      return endpointData;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('POST', endpoint, { manufacturerId })
      );
    }
  },

  async getEndpoints(manufacturerId: string): Promise<SupplyChainEndpoint[]> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/endpoints`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ endpoints: SupplyChainEndpoint[] }>>(endpoint);
      const { endpoints } = baseApi.handleResponse(
        response,
        'Failed to fetch supply chain endpoints',
        500
      );
      return endpoints;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('GET', endpoint, { manufacturerId })
      );
    }
  },

  async updateEndpointStatus(
    manufacturerId: string,
    payload: UpdateEndpointStatusPayload
  ): Promise<SupplyChainEndpoint> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/endpoints/status`;
    try {
      const response = await manufacturerApi.put<ApiResponse<{ endpoint: SupplyChainEndpoint }>>(
        endpoint,
        baseApi.sanitizeRequestData({
          endpointId: sanitizeOptionalNumber(payload.endpointId, 'endpointId', { min: 0, integer: true }),
          isActive: payload.isActive
        })
      );
      const { endpoint: endpointData } = baseApi.handleResponse(
        response,
        'Failed to update supply chain endpoint status',
        400
      );
      return endpointData;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('PUT', endpoint, { manufacturerId, endpointId: payload.endpointId })
      );
    }
  },

  async registerProduct(
    manufacturerId: string,
    payload: RegisterProductPayload
  ): Promise<SupplyChainProduct> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/products`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ product: SupplyChainProduct }>>(
        endpoint,
        sanitizeProductPayload(payload)
      );
      const { product } = baseApi.handleResponse(
        response,
        'Failed to register supply chain product',
        400
      );
      return product;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('POST', endpoint, { manufacturerId, productId: payload.productId })
      );
    }
  },

  async getProducts(manufacturerId: string): Promise<SupplyChainProduct[]> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/products`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ products: SupplyChainProduct[] }>>(endpoint);
      const { products } = baseApi.handleResponse(
        response,
        'Failed to fetch supply chain products',
        500
      );
      return products;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('GET', endpoint, { manufacturerId })
      );
    }
  },

  async logEvent(
    manufacturerId: string,
    payload: LogSupplyChainEventPayload
  ): Promise<SupplyChainEvent> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/events`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ event: SupplyChainEvent }>>(
        endpoint,
        sanitizeEventPayload(payload)
      );
      const { event } = baseApi.handleResponse(
        response,
        'Failed to log supply chain event',
        400
      );
      return event;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('POST', endpoint, { manufacturerId, productId: payload.productId })
      );
    }
  },

  async getProductEvents(
    manufacturerId: string,
    productId: string
  ): Promise<SupplyChainEvent[]> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/events`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ events: SupplyChainEvent[] }>>(
        endpoint,
        {
          params: baseApi.sanitizeQueryParams({
            productId: sanitizeString(productId, 'productId', { maxLength: 200 })
          })
        }
      );
      const { events } = baseApi.handleResponse(
        response,
        'Failed to fetch supply chain events',
        500
      );
      return events;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('GET', endpoint, { manufacturerId, productId })
      );
    }
  },

  async getDashboard(manufacturerId: string): Promise<SupplyChainDashboard> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/dashboard`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ dashboard: SupplyChainDashboard }>>(endpoint);
      const { dashboard } = baseApi.handleResponse(
        response,
        'Failed to fetch supply chain dashboard',
        500
      );
      return dashboard;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('GET', endpoint, { manufacturerId })
      );
    }
  },

  async generateProductQrCode(
    manufacturerId: string,
    productId: string
  ): Promise<QrCodeGenerationResult> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/qr-code`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ qrResult: QrCodeGenerationResult }>>(
        endpoint,
        {
          params: baseApi.sanitizeQueryParams({
            productId: sanitizeString(productId, 'productId', { maxLength: 200 })
          })
        }
      );
      const { qrResult } = baseApi.handleResponse(
        response,
        'Failed to generate product QR code',
        500
      );
      return qrResult;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('GET', endpoint, { manufacturerId, productId })
      );
    }
  },

  async generateBatchQrCodes(
    manufacturerId: string,
    productIds: string[]
  ): Promise<BatchQrCodeResult[]> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/qr-code/batch-generate`;
    try {
      const response = await manufacturerApi.post<ApiResponse<{ batchResults: BatchQrCodeResult[] }>>(
        endpoint,
        baseApi.sanitizeRequestData({
          productIds: sanitizeBatchProductIds(productIds)
        })
      );
      const { batchResults } = baseApi.handleResponse(
        response,
        'Failed to generate batch product QR codes',
        400
      );
      return batchResults;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('POST', endpoint, { manufacturerId, productIdsCount: productIds.length })
      );
    }
  },

  async getProductQrCodeInfo(
    manufacturerId: string,
    productId: string
  ): Promise<ProductQrCodeInfo> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/qr-code/info`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ qrInfo: ProductQrCodeInfo }>>(
        endpoint,
        {
          params: baseApi.sanitizeQueryParams({
            productId: sanitizeString(productId, 'productId', { maxLength: 200 })
          })
        }
      );
      const { qrInfo } = baseApi.handleResponse(
        response,
        'Failed to fetch product QR code info',
        500
      );
      return qrInfo;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('GET', endpoint, { manufacturerId, productId })
      );
    }
  },

  async getStatistics(manufacturerId: string): Promise<SupplyChainStatistics> {
    const endpoint = `${buildSupplyChainPath(manufacturerId)}/statistics`;
    try {
      const response = await manufacturerApi.get<ApiResponse<{ statistics: SupplyChainStatistics }>>(endpoint);
      const { statistics } = baseApi.handleResponse(
        response,
        'Failed to fetch supply chain statistics',
        500
      );
      return statistics;
    } catch (error) {
      throw handleApiError(
        error,
        createSupplyChainLogContext('GET', endpoint, { manufacturerId })
      );
    }
  }
};

export default manufacturerSupplyChainApi;
