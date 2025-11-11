// src/lib/api/integrations/ecommerce/wix.api.ts
// Wix integration API aligned with backend routes/integrations/ecommerce/wix.routes.ts

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
  sanitizeOptionalString,
  sanitizeString,
  sanitizeUrl
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/integrations/wix';

type HttpMethod = 'GET' | 'POST';

const createWixLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'integrations',
  module: 'ecommerce.wix',
  method,
  endpoint,
  ...context
});

const sanitizeBusinessId = (businessId: string) => sanitizeObjectId(businessId, 'businessId');

export interface WixInstallPayload {
  returnUrl?: string;
}

export interface WixInstallResponse {
  provider: 'wix';
  businessId: string;
  url: string;
  state: string;
  expiresAt: string;
}

export interface WixCallbackParams {
  code: string;
  state: string;
  instance_id?: string;
  context?: string;
}

export interface WixCallbackResponse {
  provider: 'wix';
  success: boolean;
}

export interface WixStatusResponse {
  provider: 'wix';
  businessId: string;
  status: {
    connected: boolean;
    instanceId?: string;
    connectedAt?: string;
    lastSyncAt?: string;
  };
}

export interface WixHealthResponse {
  provider: 'wix';
  businessId: string;
  healthy: boolean;
}

export interface WixSyncPayload {
  syncType?: 'products' | 'orders' | 'customers' | 'all';
  forceSync?: boolean;
}

export interface WixSyncResponse {
  provider: 'wix';
  businessId: string;
  syncType: string;
  result: ProductSyncResult;
}

export interface WixWebhookResponse {
  provider: 'wix';
  businessId: string;
  result: OrderProcessingResult;
}

const buildQueryWithBusinessId = (businessId: string) =>
  baseApi.sanitizeQueryParams({
    businessId: sanitizeBusinessId(businessId)
  });

export const wixApi = {
  /**
   * Generate Wix install URL.
   * POST /api/integrations/wix/connect
   */
  async generateInstallUrl(businessId: string, payload: WixInstallPayload = {}): Promise<WixInstallResponse> {
    const endpoint = `${BASE_PATH}/connect`;
    const params = buildQueryWithBusinessId(businessId);

    const returnUrl = sanitizeOptionalString(payload.returnUrl, 'returnUrl', {
      trim: true,
      maxLength: 500
    });

    const body = baseApi.sanitizeRequestData({
      ...(returnUrl ? { returnUrl } : {})
    });

    try {
      const response = await api.post<ApiResponse<WixInstallResponse>>(endpoint, body, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to generate Wix install URL', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createWixLogContext('POST', endpoint, {
          businessId: params.businessId
        })
      );
    }
  },

  /**
   * Handle Wix OAuth callback.
   * GET /api/integrations/wix/callback
   */
  async handleOAuthCallback(params: WixCallbackParams): Promise<WixCallbackResponse> {
    const endpoint = `${BASE_PATH}/callback`;

    const query = baseApi.sanitizeQueryParams({
      code: sanitizeString(params.code, 'code', { trim: true, minLength: 1, maxLength: 200 }),
      state: sanitizeString(params.state, 'state', { trim: true, minLength: 1, maxLength: 500 }),
      instance_id: sanitizeOptionalString(params.instance_id, 'instance_id', { trim: true, maxLength: 200 }),
      context: sanitizeOptionalString(params.context, 'context', { trim: true, maxLength: 500 })
    });

    try {
      const response = await api.get<ApiResponse<WixCallbackResponse>>(endpoint, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to process Wix OAuth callback', 400);
    } catch (error) {
      throw handleApiError(error, createWixLogContext('GET', endpoint));
    }
  },

  /**
   * Retrieve Wix connection status.
   * GET /api/integrations/wix/status
   */
  async getConnectionStatus(businessId: string): Promise<WixStatusResponse> {
    const endpoint = `${BASE_PATH}/status`;
    const params = buildQueryWithBusinessId(businessId);

    try {
      const response = await api.get<ApiResponse<WixStatusResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to fetch Wix connection status', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createWixLogContext('GET', endpoint, { businessId: params.businessId })
      );
    }
  },

  /**
   * Test Wix connection.
   * GET /api/integrations/wix/test
   */
  async testConnection(businessId: string): Promise<WixHealthResponse> {
    const endpoint = `${BASE_PATH}/test`;
    const params = buildQueryWithBusinessId(businessId);

    try {
      const response = await api.get<ApiResponse<WixHealthResponse>>(endpoint, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to test Wix connection', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createWixLogContext('GET', endpoint, { businessId: params.businessId })
      );
    }
  },

  /**
   * Trigger Wix sync.
   * POST /api/integrations/wix/sync
   */
  async syncProducts(businessId: string, payload: WixSyncPayload = {}): Promise<WixSyncResponse> {
    const endpoint = `${BASE_PATH}/sync`;
    const params = buildQueryWithBusinessId(businessId);

    const body = baseApi.sanitizeRequestData({
      syncType: sanitizeOptionalString(payload.syncType, 'syncType', {
        allowedValues: ['products', 'orders', 'customers', 'all']
      }) as WixSyncPayload['syncType'],
      forceSync: sanitizeOptionalBoolean(payload.forceSync, 'forceSync')
    });

    try {
      const response = await api.post<ApiResponse<WixSyncResponse>>(endpoint, body, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to trigger Wix sync', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createWixLogContext('POST', endpoint, {
          businessId: params.businessId,
          syncType: body.syncType
        })
      );
    }
  },

  /**
   * Process Wix webhook payload.
   * POST /api/integrations/wix/webhook
   */
  async handleWebhook(businessId: string, payload: Record<string, unknown>): Promise<WixWebhookResponse> {
    const endpoint = `${BASE_PATH}/webhook`;
    const params = buildQueryWithBusinessId(businessId);
    const body = baseApi.sanitizeRequestData(payload ?? {});

    try {
      const response = await api.post<ApiResponse<WixWebhookResponse>>(endpoint, body, {
        params
      });
      return baseApi.handleResponse(response, 'Failed to process Wix webhook payload', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createWixLogContext('POST', endpoint, { businessId: params.businessId })
      );
    }
  }
};

export default wixApi;
