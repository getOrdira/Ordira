// src/lib/api/integrations/ecommerce/ecommerceOperations.api.ts
// Ecommerce operations API aligned with backend routes/integrations/ecommerce/ecommerceOperations.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  EcommerceProvider,
  ProductSyncResult,
  OrderProcessingResult
} from '@/lib/types/integrations/ecommerce';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeBoolean,
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalJsonObject,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/integrations/ecommerce';

type HttpMethod = 'GET' | 'POST';

const SUPPORTED_PROVIDERS: readonly EcommerceProvider[] = ['shopify', 'wix', 'woocommerce'];

const createEcommerceOperationsLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'integrations',
  module: 'ecommerce.operations',
  method,
  endpoint,
  ...context
});

const sanitizeProvider = (provider: EcommerceProvider | string, field: string = 'provider'): EcommerceProvider =>
  sanitizeString(provider, field, {
    allowedValues: SUPPORTED_PROVIDERS,
    toLowerCase: true,
    trim: true
  }) as EcommerceProvider;

const sanitizeBusinessId = (businessId: string) => sanitizeObjectId(businessId, 'businessId');

export interface ProductSyncParams {
  businessId: string;
  provider: EcommerceProvider | string;
}

export interface ProductSyncOptionsInput {
  fullSync?: boolean;
  batchSize?: number;
  cursor?: string | null;
  metadata?: Record<string, unknown>;
  recordSyncTimestamp?: boolean;
}

export interface ProductSyncResponse {
  provider: EcommerceProvider;
  businessId: string;
  result: ProductSyncResult;
}

const buildProviderEndpoint = (provider: EcommerceProvider, suffix: string) => `${BASE_PATH}/${provider}${suffix}`;

const sanitizeProductSyncOptions = (options: ProductSyncOptionsInput = {}) => {
  const metadata = sanitizeOptionalJsonObject<Record<string, unknown>>(options.metadata, 'metadata');

  return baseApi.sanitizeRequestData({
    fullSync: options.fullSync === undefined ? undefined : sanitizeBoolean(options.fullSync, 'fullSync'),
    batchSize: sanitizeOptionalNumber(options.batchSize, 'batchSize', { integer: true, min: 1, max: 500 }),
    cursor:
      options.cursor === null
        ? null
        : sanitizeOptionalString(options.cursor ?? undefined, 'cursor', {
            trim: true,
            maxLength: 500
          }),
    metadata,
    recordSyncTimestamp: sanitizeOptionalBoolean(options.recordSyncTimestamp, 'recordSyncTimestamp')
  });
};

export interface OrderProcessingParams {
  businessId: string;
  provider: EcommerceProvider | string;
  orderId: string;
}

export interface OrderProcessingPayload {
  skipCertificateCreation?: boolean;
  metadata?: Record<string, unknown>;
  source?: 'webhook' | 'manual' | 'api';
}

export interface OrderProcessingResponse {
  provider: EcommerceProvider;
  businessId: string;
  result: OrderProcessingResult;
}

export interface OrderWebhookParams {
  businessId: string;
  provider: EcommerceProvider | string;
  signature?: string;
  timestamp?: string;
}

export interface OrderWebhookResponse {
  provider: EcommerceProvider;
  businessId: string;
  result: OrderProcessingResult;
}

export const ecommerceOperationsApi = {
  /**
   * Trigger ecommerce product synchronisation.
   * POST /api/integrations/ecommerce/:provider/products/sync
   */
  async syncProducts(
    params: ProductSyncParams,
    options: ProductSyncOptionsInput = {}
  ): Promise<ProductSyncResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const endpoint = buildProviderEndpoint(provider, '/products/sync');

    const body = sanitizeProductSyncOptions(options);
    const query = baseApi.sanitizeQueryParams({
      businessId
    });

    try {
      const response = await api.post<ApiResponse<ProductSyncResponse>>(endpoint, body, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to run ecommerce product sync', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createEcommerceOperationsLogContext('POST', endpoint, {
          businessId,
          provider,
          hasCursor: body.cursor !== undefined,
          fullSync: body.fullSync
        })
      );
    }
  },

  /**
   * Process an ecommerce order by identifier.
   * POST /api/integrations/ecommerce/:provider/orders/:orderId/process
   */
  async processOrderById(
    params: OrderProcessingParams,
    payload: OrderProcessingPayload = {}
  ): Promise<OrderProcessingResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const orderId = sanitizeString(params.orderId, 'orderId', { trim: true, minLength: 1, maxLength: 200 });
    const endpoint = buildProviderEndpoint(provider, `/orders/${orderId}/process`);

    const metadata = sanitizeOptionalJsonObject<Record<string, unknown>>(payload.metadata, 'metadata');

    const body = baseApi.sanitizeRequestData({
      skipCertificateCreation: sanitizeOptionalBoolean(payload.skipCertificateCreation, 'skipCertificateCreation'),
      metadata,
      source: sanitizeOptionalString(payload.source, 'source', {
        allowedValues: ['webhook', 'manual', 'api']
      }) as OrderProcessingPayload['source']
    });

    const query = baseApi.sanitizeQueryParams({
      businessId
    });

    try {
      const response = await api.post<ApiResponse<OrderProcessingResponse>>(endpoint, body, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to process ecommerce order', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createEcommerceOperationsLogContext('POST', endpoint, {
          businessId,
          provider,
          orderId
        })
      );
    }
  },

  /**
   * Forward an order webhook payload for processing.
   * POST /api/integrations/ecommerce/webhook/:provider/order
   */
  async processOrderWebhook(
    params: OrderWebhookParams,
    payload: Record<string, unknown>
  ): Promise<OrderWebhookResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const endpoint = `${BASE_PATH}/webhook/${provider}/order`;

    const query = baseApi.sanitizeQueryParams({
      businessId,
      signature: sanitizeOptionalString(params.signature, 'signature', { trim: true, maxLength: 500 }),
      timestamp: sanitizeOptionalString(params.timestamp, 'timestamp', { trim: true, maxLength: 100 })
    });

    const body = baseApi.sanitizeRequestData(payload ?? {});

    try {
      const response = await api.post<ApiResponse<OrderWebhookResponse>>(endpoint, body, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to process ecommerce webhook payload', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createEcommerceOperationsLogContext('POST', endpoint, {
          businessId,
          provider,
          hasSignature: Boolean(query.signature)
        })
      );
    }
  }
};

export default ecommerceOperationsApi;
