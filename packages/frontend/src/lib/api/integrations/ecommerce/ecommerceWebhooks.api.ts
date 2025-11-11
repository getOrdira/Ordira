// src/lib/api/integrations/ecommerce/ecommerceWebhooks.api.ts
// Ecommerce webhooks API aligned with backend routes/integrations/ecommerce/ecommerceWebhooks.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  EcommerceProvider,
  ExpectedWebhookDefinition,
  ProviderWebhookRecord,
  WebhookDiff,
  WebhookReconciliationResult
} from '@/lib/types/integrations/ecommerce';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalJsonObject,
  sanitizeOptionalString,
  sanitizeString,
  sanitizeUrl
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/integrations/ecommerce/webhooks';

type HttpMethod = 'GET' | 'POST';

const SUPPORTED_PROVIDERS: readonly EcommerceProvider[] = ['shopify', 'wix', 'woocommerce'];

const createWebhooksLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'integrations',
  module: 'ecommerce.webhooks',
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

export interface ExpectedWebhookInput {
  topic: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

const sanitizeExpectedWebhooks = (webhooks: ExpectedWebhookInput[], field: string) =>
  sanitizeArray(
    webhooks,
    field,
    (webhook, index) => {
      const rawWebhook = (webhook ?? {}) as Record<string, unknown>;

      const topic = sanitizeString(rawWebhook.topic, `${field}[${index}].topic`, {
        trim: true,
        minLength: 1,
        maxLength: 200
      });

      const callbackUrl = sanitizeUrl(rawWebhook.callbackUrl, `${field}[${index}].callbackUrl`, {
        allowedProtocols: ['http:', 'https:']
      });

      const method = sanitizeOptionalString(rawWebhook.method, `${field}[${index}].method`, {
        allowedValues: ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'],
        toUpperCase: true,
        trim: true
      }) as ExpectedWebhookDefinition['method'];

      const format = sanitizeOptionalString(rawWebhook.format, `${field}[${index}].format`, {
        allowedValues: ['json', 'xml'],
        toLowerCase: true,
        trim: true
      }) as ExpectedWebhookDefinition['format'];

      const rawHeaders = sanitizeOptionalJsonObject<Record<string, unknown>>(
        rawWebhook.headers,
        `${field}[${index}].headers`
      );

      const headers =
        rawHeaders &&
        Object.entries(rawHeaders).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value === undefined || value === null) {
            return acc;
          }
          acc[key] = sanitizeString(value, `${field}[${index}].headers.${key}`, {
            trim: true,
            maxLength: 500
          });
          return acc;
        }, {});

      const metadata = sanitizeOptionalJsonObject<Record<string, unknown>>(
        rawWebhook.metadata,
        `${field}[${index}].metadata`
      );

      const definition: ExpectedWebhookDefinition = {
        topic,
        address: callbackUrl,
        ...(method ? { method } : {}),
        ...(format ? { format } : {}),
        ...(headers && Object.keys(headers).length ? { headers } : {}),
        ...(metadata ? { metadata } : {})
      };

      return definition;
    },
    { minLength: 1 }
  );

export interface ListProviderWebhooksParams {
  businessId: string;
  provider: EcommerceProvider | string;
}

export interface ListProviderWebhooksResponse {
  provider: EcommerceProvider;
  businessId: string;
  webhooks: ProviderWebhookRecord[];
}

export interface WebhookDiffResponse {
  provider: EcommerceProvider;
  businessId: string;
  diff: WebhookDiff;
}

export interface WebhookReconciliationResponse extends WebhookReconciliationResult {}

export interface ReconcileWebhooksPayload {
  expected: ExpectedWebhookInput[];
  dryRun?: boolean;
}

export interface DiffWebhooksPayload {
  expected: ExpectedWebhookInput[];
}

export interface BuildCallbackUrlPayload {
  appUrl: string;
  relativePath: string;
  queryParams?: Record<string, string | number | boolean | undefined>;
}

export interface BuildCallbackUrlResponse {
  provider: EcommerceProvider;
  url: string;
}

const buildProviderEndpoint = (provider: EcommerceProvider, suffix: string = '') =>
  `${BASE_PATH}/${provider}${suffix}`;

export const ecommerceWebhooksApi = {
  /**
   * List provider webhooks.
   * GET /api/integrations/ecommerce/webhooks/:provider
   */
  async listProviderWebhooks(params: ListProviderWebhooksParams): Promise<ListProviderWebhooksResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const endpoint = buildProviderEndpoint(provider);

    const query = baseApi.sanitizeQueryParams({
      businessId
    });

    try {
      const response = await api.get<ApiResponse<ListProviderWebhooksResponse>>(endpoint, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to list ecommerce provider webhooks', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createWebhooksLogContext('GET', endpoint, {
          businessId,
          provider
        })
      );
    }
  },

  /**
   * Calculate diff between expected and existing webhooks.
   * POST /api/integrations/ecommerce/webhooks/:provider/diff
   */
  async diffWebhooks(
    params: ListProviderWebhooksParams,
    payload: DiffWebhooksPayload
  ): Promise<WebhookDiffResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const endpoint = buildProviderEndpoint(provider, '/diff');

    const expected = sanitizeExpectedWebhooks(payload.expected, 'expected');

    const body = baseApi.sanitizeRequestData({
      expected
    });

    const query = baseApi.sanitizeQueryParams({
      businessId
    });

    try {
      const response = await api.post<ApiResponse<WebhookDiffResponse>>(endpoint, body, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to diff ecommerce webhooks', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createWebhooksLogContext('POST', endpoint, {
          businessId,
          provider,
          expectedCount: expected.length
        })
      );
    }
  },

  /**
   * Reconcile provider webhooks with expected definitions.
   * POST /api/integrations/ecommerce/webhooks/:provider/reconcile
   */
  async reconcileWebhooks(
    params: ListProviderWebhooksParams,
    payload: ReconcileWebhooksPayload
  ): Promise<WebhookReconciliationResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const endpoint = buildProviderEndpoint(provider, '/reconcile');

    const expected = sanitizeExpectedWebhooks(payload.expected, 'expected');
    const dryRun = sanitizeOptionalBoolean(payload.dryRun, 'dryRun');

    const body = baseApi.sanitizeRequestData({
      expected,
      ...(dryRun !== undefined ? { dryRun } : {})
    });

    const query = baseApi.sanitizeQueryParams({
      businessId
    });

    try {
      const response = await api.post<ApiResponse<WebhookReconciliationResponse>>(endpoint, body, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to reconcile ecommerce webhooks', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createWebhooksLogContext('POST', endpoint, {
          businessId,
          provider,
          expectedCount: expected.length,
          dryRun
        })
      );
    }
  },

  /**
   * Build webhook callback URL for a provider.
   * POST /api/integrations/ecommerce/webhooks/:provider/callback-url
   */
  async buildCallbackUrl(
    provider: EcommerceProvider | string,
    payload: BuildCallbackUrlPayload
  ): Promise<BuildCallbackUrlResponse> {
    const sanitizedProvider = sanitizeProvider(provider);
    const endpoint = buildProviderEndpoint(sanitizedProvider, '/callback-url');

    const appUrl = sanitizeUrl(payload.appUrl, 'appUrl', { allowedProtocols: ['http:', 'https:'] });
    const relativePath = sanitizeString(payload.relativePath, 'relativePath', {
      trim: true,
      minLength: 1,
      maxLength: 500
    });

    const queryParamsInput = sanitizeOptionalJsonObject<Record<string, string | number | boolean | undefined>>(
      payload.queryParams,
      'queryParams'
    );

    const queryParams =
      queryParamsInput &&
      Object.entries(queryParamsInput).reduce<Record<string, string | number | boolean>>((acc, [key, value]) => {
        if (value === undefined || value === null) {
          return acc;
        }
        if (typeof value === 'boolean' || typeof value === 'number') {
          acc[key] = value;
          return acc;
        }
        acc[key] = sanitizeString(value, `queryParams.${key}`, { trim: true, maxLength: 200 });
        return acc;
      }, {});

    const body = baseApi.sanitizeRequestData({
      appUrl,
      relativePath,
      ...(queryParams && Object.keys(queryParams).length ? { queryParams } : {})
    });

    try {
      const response = await api.post<ApiResponse<BuildCallbackUrlResponse>>(endpoint, body);
      return baseApi.handleResponse(response, 'Failed to build ecommerce webhook callback URL', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createWebhooksLogContext('POST', endpoint, {
          provider: sanitizedProvider,
          hasQueryParams: Boolean(queryParams && Object.keys(queryParams).length > 0)
        })
      );
    }
  }
};

export default ecommerceWebhooksApi;
