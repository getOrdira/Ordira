// src/lib/api/integrations/ecommerce/ecommerceHealth.api.ts
// Ecommerce health API aligned with backend routes/integrations/ecommerce/ecommerceHealth.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  EcommerceProvider,
  ExpectedWebhookDefinition,
  ConnectionHealthReport,
  IntegrationAnalyticsReport
} from '@/lib/types/integrations/ecommerce';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeArray,
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalJsonObject,
  sanitizeString,
  sanitizeUrl
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/integrations/ecommerce';

type HttpMethod = 'GET' | 'POST';

const SUPPORTED_PROVIDERS: readonly EcommerceProvider[] = ['shopify', 'wix', 'woocommerce'];

const createEcommerceHealthLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'integrations',
  module: 'ecommerce.health',
  method,
  endpoint,
  ...context
});

const sanitizeProvider = (provider: EcommerceProvider | string, field: string = 'provider'): EcommerceProvider => {
  return sanitizeString(provider, field, {
    allowedValues: SUPPORTED_PROVIDERS,
    toLowerCase: true,
    trim: true
  }) as EcommerceProvider;
};

const sanitizeBusinessId = (businessId: string) => sanitizeObjectId(businessId, 'businessId');

export interface ConnectionHealthParams {
  businessId: string;
  provider: EcommerceProvider | string;
  includeWebhookDiff?: boolean;
}

export interface ExpectedWebhookInput {
  topic: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

const sanitizeExpectedWebhooks = (webhooks?: ExpectedWebhookInput[]) => {
  if (!webhooks) {
    return undefined;
  }

  return sanitizeArray(
    webhooks,
    'expectedWebhooks',
    (webhook, index) => {
      const topic = sanitizeString(webhook?.topic, `expectedWebhooks[${index}].topic`, {
        trim: true,
        minLength: 1,
        maxLength: 200
      });

      const callbackUrl = sanitizeUrl(webhook?.callbackUrl, `expectedWebhooks[${index}].callbackUrl`, {
        allowedProtocols: ['http:', 'https:']
      });

      const metadata = sanitizeOptionalJsonObject<Record<string, unknown>>(
        webhook?.metadata,
        `expectedWebhooks[${index}].metadata`
      );

      return {
        topic,
        callbackUrl,
        ...(metadata ? { metadata } : {})
      } as ExpectedWebhookDefinition;
    },
    { minLength: 1 }
  );
};

export interface ConnectionHealthResponse {
  provider: EcommerceProvider;
  businessId: string;
  report: ConnectionHealthReport;
}

export interface ConnectionHealthPayload {
  expectedWebhooks: ExpectedWebhookInput[];
}

export interface IntegrationAnalyticsParams {
  businessId: string;
  provider: EcommerceProvider | string;
  includeHealthDetails?: boolean;
}

export interface IntegrationAnalyticsResponse {
  provider: EcommerceProvider;
  businessId: string;
  report: IntegrationAnalyticsReport;
}

const buildHealthEndpoint = (provider: EcommerceProvider, suffix: string = '') =>
  `${BASE_PATH}/${provider}/health${suffix}`;

const buildAnalyticsEndpoint = (provider: EcommerceProvider) => `${BASE_PATH}/${provider}/analytics`;

export const ecommerceHealthApi = {
  /**
   * Retrieve ecommerce connection health report.
   * GET /api/integrations/ecommerce/:provider/health
   */
  async getConnectionHealthReport(params: ConnectionHealthParams): Promise<ConnectionHealthResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const endpoint = buildHealthEndpoint(provider);
    const query = baseApi.sanitizeQueryParams({
      businessId,
      includeWebhookDiff: sanitizeOptionalBoolean(params.includeWebhookDiff, 'includeWebhookDiff')
    });

    try {
      const response = await api.get<ApiResponse<ConnectionHealthResponse>>(endpoint, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to fetch ecommerce connection health', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createEcommerceHealthLogContext('GET', endpoint, {
          businessId,
          includeWebhookDiff: query.includeWebhookDiff
        })
      );
    }
  },

  /**
   * Generate ecommerce connection health report with expected webhook definitions.
   * POST /api/integrations/ecommerce/:provider/health
   */
  async generateConnectionHealthReport(
    params: ConnectionHealthParams,
    payload: ConnectionHealthPayload
  ): Promise<ConnectionHealthResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const endpoint = buildHealthEndpoint(provider);

    const query = baseApi.sanitizeQueryParams({
      businessId,
      includeWebhookDiff: sanitizeOptionalBoolean(params.includeWebhookDiff, 'includeWebhookDiff')
    });

    const expectedWebhooks = sanitizeExpectedWebhooks(payload?.expectedWebhooks);
    const body = baseApi.sanitizeRequestData({
      expectedWebhooks
    });

    try {
      const response = await api.post<ApiResponse<ConnectionHealthResponse>>(endpoint, body, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to generate ecommerce connection health report', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createEcommerceHealthLogContext('POST', endpoint, {
          businessId,
          includeWebhookDiff: query.includeWebhookDiff,
          expectedCount: expectedWebhooks?.length ?? 0
        })
      );
    }
  },

  /**
   * Retrieve ecommerce integration analytics snapshot.
   * GET /api/integrations/ecommerce/:provider/analytics
   */
  async getIntegrationAnalytics(params: IntegrationAnalyticsParams): Promise<IntegrationAnalyticsResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const endpoint = buildAnalyticsEndpoint(provider);

    const query = baseApi.sanitizeQueryParams({
      businessId,
      includeHealthDetails: sanitizeOptionalBoolean(params.includeHealthDetails, 'includeHealthDetails')
    });

    try {
      const response = await api.get<ApiResponse<IntegrationAnalyticsResponse>>(endpoint, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to fetch ecommerce integration analytics', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createEcommerceHealthLogContext('GET', endpoint, {
          businessId,
          includeHealthDetails: query.includeHealthDetails
        })
      );
    }
  }
};

export default ecommerceHealthApi;
