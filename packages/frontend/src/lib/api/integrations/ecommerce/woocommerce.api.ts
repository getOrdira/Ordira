// src/lib/api/integrations/ecommerce/woocommerce.api.ts
// WooCommerce integration API aligned with backend routes/integrations/ecommerce/woocommerce.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  ProductSyncResult,
  OrderProcessingResult
} from '@/lib/types/integrations/ecommerce';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeBoolean,
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString,
  sanitizeUrl
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/integrations/woocommerce';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

const createWooLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'integrations',
  module: 'ecommerce.woocommerce',
  method,
  endpoint,
  ...context
});

const sanitizeBusinessId = (businessId: string) => sanitizeObjectId(businessId, 'businessId');

export interface WooConnectPayload {
  domain: string;
  consumerKey: string;
  consumerSecret: string;
  version?: string;
  verifySsl?: boolean;
}

export interface WooConnectResponse {
  provider: 'woocommerce';
  businessId: string;
  domain: string;
  verified: boolean;
  storeName?: string;
  version?: string;
  currency?: string;
  verifySsl: boolean;
}

export interface WooStatusResponse {
  provider: 'woocommerce';
  businessId: string;
  status: {
    connected: boolean;
    domain?: string;
    connectedAt?: string;
    lastSyncAt?: string;
  };
}

export interface WooDisconnectResponse {
  provider: 'woocommerce';
  businessId: string;
  disconnected: boolean;
  disconnectedAt: string;
}

export interface WooHealthResponse {
  provider: 'woocommerce';
  businessId: string;
  healthy: boolean;
}

export interface WooSyncPayload {
  syncType?: 'products' | 'orders' | 'customers' | 'all';
  forceSync?: boolean;
  batchSize?: number;
}

export interface WooSyncResponse {
  provider: 'woocommerce';
  businessId: string;
  syncType: string;
  batchSize: number;
  result: ProductSyncResult;
}

export interface WooWebhookResponse {
  provider: 'woocommerce';
  businessId: string;
  result: OrderProcessingResult;
}

const buildQueryWithBusinessId = (businessId: string) =>
  baseApi.sanitizeQueryParams({
    businessId: sanitizeBusinessId(businessId)
  });

export const woocommerceApi = {
  /**
   * Connect WooCommerce store.
   * POST /api/integrations/woocommerce/connect
   */
  async connect(businessId: string, payload: WooConnectPayload): Promise<WooConnectResponse> {
    const endpoint = `${BASE_PATH}/connect`;
    const params = buildQueryWithBusinessId(businessId);

    const domain = sanitizeUrl(payload.domain, 'domain', { allowedProtocols: ['http:', 'https:'] });
    const consumerKey = sanitizeString(payload.consumerKey, 'consumerKey', { trim: true, minLength: 1, maxLength: 200 });
    const consumerSecret = sanitizeString(payload.consumerSecret, 'consumerSecret', {
      trim: true,
      minLength: 1,
      maxLength: 200
    });
    const version = sanitizeOptionalString(payload.version, 'version', { trim: true, maxLength: 50 });
    const verifySsl =
      payload.verifySsl === undefined ? undefined : sanitizeBoolean(payload.verifySsl, 'verifySsl');

    const body = baseApi.sanitizeRequestData({
      domain,
      consumerKey,
      consumerSecret,
      ...(version ? { version } : {}),
      ...(verifySsl !== undefined ? { verifySsl } : {})
    });

    try {
      const response = await api.post<ApiResponse<WooConnectResponse>>(endpoint, body, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to connect WooCommerce store', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createWooLogContext('POST', endpoint, {
          businessId: params.businessId,
          domain
        })
      );
    }
  },

  /**
   * Retrieve WooCommerce connection status.
   * GET /api/integrations/woocommerce/status
   */
  async getConnectionStatus(businessId: string): Promise<WooStatusResponse> {
    const endpoint = `${BASE_PATH}/status`;
    const params = buildQueryWithBusinessId(businessId);

    try {
      const response = await api.get<ApiResponse<WooStatusResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to fetch WooCommerce connection status', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createWooLogContext('GET', endpoint, { businessId: params.businessId })
      );
    }
  },

  /**
   * Disconnect WooCommerce store.
   * DELETE /api/integrations/woocommerce/disconnect
   */
  async disconnect(businessId: string): Promise<WooDisconnectResponse> {
    const endpoint = `${BASE_PATH}/disconnect`;
    const params = buildQueryWithBusinessId(businessId);

    try {
      const response = await api.delete<ApiResponse<WooDisconnectResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to disconnect WooCommerce store', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createWooLogContext('DELETE', endpoint, { businessId: params.businessId })
      );
    }
  },

  /**
   * Test WooCommerce connection.
   * GET /api/integrations/woocommerce/test
   */
  async testConnection(businessId: string): Promise<WooHealthResponse> {
    const endpoint = `${BASE_PATH}/test`;
    const params = buildQueryWithBusinessId(businessId);

    try {
      const response = await api.get<ApiResponse<WooHealthResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to test WooCommerce connection', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createWooLogContext('GET', endpoint, { businessId: params.businessId })
      );
    }
  },

  /**
   * Trigger WooCommerce sync.
   * POST /api/integrations/woocommerce/sync
   */
  async syncProducts(
    businessId: string,
    payload: WooSyncPayload = {}
  ): Promise<WooSyncResponse> {
    const endpoint = `${BASE_PATH}/sync`;
    const params = buildQueryWithBusinessId(businessId);

    const body = baseApi.sanitizeRequestData({
      syncType: sanitizeOptionalString(payload.syncType, 'syncType', {
        allowedValues: ['products', 'orders', 'customers', 'all']
      }) as WooSyncPayload['syncType'],
      forceSync: sanitizeOptionalBoolean(payload.forceSync, 'forceSync'),
      batchSize: sanitizeOptionalNumber(payload.batchSize, 'batchSize', { integer: true, min: 1, max: 500 })
    });

    try {
      const response = await api.post<ApiResponse<WooSyncResponse>>(endpoint, body, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to trigger WooCommerce sync', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createWooLogContext('POST', endpoint, {
          businessId: params.businessId,
          syncType: body.syncType,
          batchSize: body.batchSize
        })
      );
    }
  },

  /**
   * Process WooCommerce webhook payload.
   * POST /api/integrations/woocommerce/webhook
   */
  async handleWebhook(businessId: string, payload: Record<string, unknown>): Promise<WooWebhookResponse> {
    const endpoint = `${BASE_PATH}/webhook`;
    const params = buildQueryWithBusinessId(businessId);
    const body = baseApi.sanitizeRequestData(payload ?? {});

    try {
      const response = await api.post<ApiResponse<WooWebhookResponse>>(endpoint, body, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to process WooCommerce webhook payload', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createWooLogContext('POST', endpoint, { businessId: params.businessId })
      );
    }
  }
};

export default woocommerceApi;
