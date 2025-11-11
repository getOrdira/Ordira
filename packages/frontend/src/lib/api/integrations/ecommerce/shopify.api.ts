// src/lib/api/integrations/ecommerce/shopify.api.ts
// Shopify integration API aligned with backend routes/integrations/ecommerce/shopify.routes.ts

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

const BASE_PATH = '/integrations/shopify';

type HttpMethod = 'GET' | 'POST';

const createShopifyLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'integrations',
  module: 'ecommerce.shopify',
  method,
  endpoint,
  ...context
});

const sanitizeBusinessId = (businessId: string) => sanitizeObjectId(businessId, 'businessId');

export interface ShopifyInstallPayload {
  shopDomain: string;
  returnUrl?: string;
}

export interface ShopifyInstallResponse {
  provider: 'shopify';
  businessId: string;
  url: string;
  state: string;
  expiresAt: string;
  pkce?: {
    verifier: string;
    challenge: string;
    method: 'S256';
  };
}

export interface ShopifyCallbackParams {
  shop: string;
  code: string;
  state: string;
  hmac?: string;
  timestamp?: string;
}

export interface ShopifyCallbackResponse {
  provider: 'shopify';
  success: boolean;
  shop: string;
}

export interface ShopifyStatusResponse {
  provider: 'shopify';
  businessId: string;
  status: {
    connected: boolean;
    shopDomain?: string;
    connectedAt?: string;
    lastSyncAt?: string;
  };
}

export interface ShopifyHealthResponse {
  provider: 'shopify';
  businessId: string;
  healthy: boolean;
}

export interface ShopifySyncPayload {
  syncType?: 'products' | 'orders' | 'customers' | 'all';
  forceSync?: boolean;
  batchSize?: number;
}

export interface ShopifySyncResponse {
  provider: 'shopify';
  businessId: string;
  syncType: string;
  result: ProductSyncResult;
}

export interface ShopifyWebhookResponse {
  provider: 'shopify';
  businessId: string;
  result: OrderProcessingResult;
}

const buildQueryWithBusinessId = (businessId: string) =>
  baseApi.sanitizeQueryParams({
    businessId: sanitizeBusinessId(businessId)
  });

export const shopifyApi = {
  /**
   * Generate Shopify install URL.
   * POST /api/integrations/shopify/connect
   */
  async generateInstallUrl(
    businessId: string,
    payload: ShopifyInstallPayload
  ): Promise<ShopifyInstallResponse> {
    const query = buildQueryWithBusinessId(businessId);
    const shopDomain = sanitizeString(payload.shopDomain, 'shopDomain', {
      trim: true,
      minLength: 1,
      maxLength: 200
    });

    const returnUrl = sanitizeOptionalString(payload.returnUrl, 'returnUrl', {
      trim: true,
      maxLength: 500
    });

    const body = baseApi.sanitizeRequestData({
      shopDomain,
      ...(returnUrl ? { returnUrl } : {})
    });

    const endpoint = `${BASE_PATH}/connect`;

    try {
      const response = await api.post<ApiResponse<ShopifyInstallResponse>>(endpoint, body, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to generate Shopify install URL', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createShopifyLogContext('POST', endpoint, {
          businessId: query.businessId,
          shopDomain
        })
      );
    }
  },

  /**
   * Handle Shopify OAuth callback.
   * GET /api/integrations/shopify/callback
   */
  async handleOAuthCallback(params: ShopifyCallbackParams): Promise<ShopifyCallbackResponse> {
    const endpoint = `${BASE_PATH}/callback`;

    const query = baseApi.sanitizeQueryParams({
      shop: sanitizeString(params.shop, 'shop', { trim: true, minLength: 1, maxLength: 200 }),
      code: sanitizeString(params.code, 'code', { trim: true, minLength: 1, maxLength: 500 }),
      state: sanitizeString(params.state, 'state', { trim: true, minLength: 1, maxLength: 500 }),
      hmac: sanitizeOptionalString(params.hmac, 'hmac', { trim: true, maxLength: 200 }),
      timestamp: sanitizeOptionalString(params.timestamp, 'timestamp', { trim: true, maxLength: 100 })
    });

    try {
      const response = await api.get<ApiResponse<ShopifyCallbackResponse>>(endpoint, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to process Shopify OAuth callback', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createShopifyLogContext('GET', endpoint, {
          shop: query.shop
        })
      );
    }
  },

  /**
   * Retrieve Shopify connection status.
   * GET /api/integrations/shopify/status
   */
  async getConnectionStatus(businessId: string): Promise<ShopifyStatusResponse> {
    const endpoint = `${BASE_PATH}/status`;
    const params = buildQueryWithBusinessId(businessId);

    try {
      const response = await api.get<ApiResponse<ShopifyStatusResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to fetch Shopify connection status', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createShopifyLogContext('GET', endpoint, { businessId: params.businessId })
      );
    }
  },

  /**
   * Test Shopify connection.
   * GET /api/integrations/shopify/test
   */
  async testConnection(businessId: string): Promise<ShopifyHealthResponse> {
    const endpoint = `${BASE_PATH}/test`;
    const params = buildQueryWithBusinessId(businessId);

    try {
      const response = await api.get<ApiResponse<ShopifyHealthResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to test Shopify connection', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createShopifyLogContext('GET', endpoint, { businessId: params.businessId })
      );
    }
  },

  /**
   * Trigger Shopify sync.
   * POST /api/integrations/shopify/sync
   */
  async syncProducts(
    businessId: string,
    payload: ShopifySyncPayload = {}
  ): Promise<ShopifySyncResponse> {
    const endpoint = `${BASE_PATH}/sync`;
    const params = buildQueryWithBusinessId(businessId);

    const body = baseApi.sanitizeRequestData({
      syncType: sanitizeOptionalString(payload.syncType, 'syncType', {
        allowedValues: ['products', 'orders', 'customers', 'all']
      }) as ShopifySyncPayload['syncType'],
      forceSync: sanitizeOptionalBoolean(payload.forceSync, 'forceSync'),
      batchSize: sanitizeOptionalNumber(payload.batchSize, 'batchSize', { integer: true, min: 1, max: 500 })
    });

    try {
      const response = await api.post<ApiResponse<ShopifySyncResponse>>(endpoint, body, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to trigger Shopify sync', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createShopifyLogContext('POST', endpoint, {
          businessId: params.businessId,
          syncType: body.syncType
        })
      );
    }
  },

  /**
   * Process Shopify webhook payload.
   * POST /api/integrations/shopify/webhook
   */
  async handleWebhook(businessId: string, payload: Record<string, unknown>): Promise<ShopifyWebhookResponse> {
    const endpoint = `${BASE_PATH}/webhook`;
    const params = buildQueryWithBusinessId(businessId);
    const body = baseApi.sanitizeRequestData(payload ?? {});

    try {
      const response = await api.post<ApiResponse<ShopifyWebhookResponse>>(endpoint, body, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to process Shopify webhook payload', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createShopifyLogContext('POST', endpoint, { businessId: params.businessId })
      );
    }
  }
};

export default shopifyApi;
