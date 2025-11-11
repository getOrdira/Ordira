// src/lib/api/integrations/ecommerce/ecommerceIntegrationData.api.ts
// Ecommerce integration data API aligned with backend routes/integrations/ecommerce/ecommerceIntegrationData.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  EcommerceProvider,
  IntegrationCredentialsInput,
  IntegrationRecord
} from '@/lib/types/integrations/ecommerce';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalDate,
  sanitizeOptionalJsonObject,
  sanitizeOptionalString,
  sanitizeString
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/integrations/ecommerce';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

const SUPPORTED_PROVIDERS: readonly EcommerceProvider[] = ['shopify', 'wix', 'woocommerce'];

const createIntegrationDataLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'integrations',
  module: 'ecommerce.integrationData',
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

export interface IntegrationStatusParams {
  businessId: string;
  provider: EcommerceProvider | string;
  includeSecrets?: boolean;
}

export interface IntegrationStatusResponse {
  provider: EcommerceProvider;
  businessId: string;
  record: IntegrationRecord;
}

const buildProviderEndpoint = (provider: EcommerceProvider, suffix: string) => `${BASE_PATH}/${provider}${suffix}`;

const sanitizeCredentialsPayload = (payload: IntegrationCredentialsInput) => {
  const domain = sanitizeOptionalString(payload.domain, 'domain', { trim: true, maxLength: 200 });
  const accessToken = sanitizeOptionalString(payload.accessToken, 'accessToken', { trim: true, maxLength: 500 });
  const refreshToken = sanitizeOptionalString(payload.refreshToken, 'refreshToken', { trim: true, maxLength: 500 });
  const secret = sanitizeOptionalString(payload.secret, 'secret', { trim: true, maxLength: 500 });

  const additionalSecretsInput = sanitizeOptionalJsonObject<Record<string, unknown>>(payload.additionalSecrets, 'additionalSecrets');
  const additionalSecrets =
    additionalSecretsInput &&
    Object.entries(additionalSecretsInput).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value === undefined || value === null) {
        return acc;
      }
      acc[key] = sanitizeString(String(value), `additionalSecrets.${key}`, {
        trim: true,
        maxLength: 500,
        allowEmpty: false
      });
      return acc;
    }, {});

  const metadata = sanitizeOptionalJsonObject<Record<string, unknown>>(payload.metadata, 'metadata');

  return baseApi.sanitizeRequestData({
    ...(domain ? { domain } : {}),
    ...(accessToken ? { accessToken } : {}),
    ...(refreshToken ? { refreshToken } : {}),
    ...(secret ? { secret } : {}),
    ...(additionalSecrets && Object.keys(additionalSecrets).length ? { additionalSecrets } : {}),
    connectedAt: sanitizeOptionalDate(payload.connectedAt, 'connectedAt')?.toISOString(),
    lastSyncAt: sanitizeOptionalDate(payload.lastSyncAt, 'lastSyncAt')?.toISOString(),
    metadata
  });
};

export interface UpsertIntegrationPayload extends Partial<IntegrationCredentialsInput> {}

export interface IntegrationClearResponse {
  provider: EcommerceProvider;
  businessId: string;
  cleared: boolean;
  clearedAt: string;
}

export interface RecordSyncPayload {
  metadata?: Record<string, unknown>;
}

export interface RecordSyncResponse {
  provider: EcommerceProvider;
  businessId: string;
  sync: {
    lastSyncAt: string;
    metadata: Record<string, unknown>;
  };
}

export interface ProviderLookupParams {
  provider: EcommerceProvider | string;
  identifier: string;
}

export interface ProviderLookupResponse {
  provider: EcommerceProvider;
  identifier: string;
  businessId: string | null;
}

export interface ConnectedBusinessesResponse {
  provider: EcommerceProvider;
  businesses: string[];
}

export const ecommerceIntegrationDataApi = {
  /**
   * Retrieve ecommerce integration status.
   * GET /api/integrations/ecommerce/:provider/status
   */
  async getIntegrationStatus(params: IntegrationStatusParams): Promise<IntegrationStatusResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const endpoint = buildProviderEndpoint(provider, '/status');

    const query = baseApi.sanitizeQueryParams({
      businessId,
      includeSecrets: sanitizeOptionalBoolean(params.includeSecrets, 'includeSecrets')
    });

    try {
      const response = await api.get<ApiResponse<IntegrationStatusResponse>>(endpoint, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to fetch ecommerce integration status', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createIntegrationDataLogContext('GET', endpoint, {
          businessId,
          includeSecrets: query.includeSecrets
        })
      );
    }
  },

  /**
   * Upsert ecommerce integration credentials.
   * POST /api/integrations/ecommerce/:provider/credentials
   */
  async upsertIntegrationCredentials(
    params: IntegrationStatusParams,
    payload: UpsertIntegrationPayload
  ): Promise<IntegrationStatusResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const endpoint = buildProviderEndpoint(provider, '/credentials');
    const body = sanitizeCredentialsPayload(payload as IntegrationCredentialsInput);

    const query = baseApi.sanitizeQueryParams({ businessId });

    try {
      const response = await api.post<ApiResponse<IntegrationStatusResponse>>(endpoint, body, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to save ecommerce integration credentials', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createIntegrationDataLogContext('POST', endpoint, {
          businessId,
          hasDomain: Boolean(body.domain),
          hasAccessToken: Boolean(body.accessToken)
        })
      );
    }
  },

  /**
   * Clear ecommerce integration credentials.
   * DELETE /api/integrations/ecommerce/:provider
   */
  async clearIntegration(params: IntegrationStatusParams): Promise<IntegrationClearResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const endpoint = buildProviderEndpoint(provider, '');
    const query = baseApi.sanitizeQueryParams({ businessId });

    try {
      const response = await api.delete<ApiResponse<IntegrationClearResponse>>(endpoint, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to clear ecommerce integration credentials', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createIntegrationDataLogContext('DELETE', endpoint, {
          businessId
        })
      );
    }
  },

  /**
   * Record successful ecommerce integration sync.
   * POST /api/integrations/ecommerce/:provider/sync
   */
  async recordSuccessfulSync(
    params: IntegrationStatusParams,
    payload: RecordSyncPayload = {}
  ): Promise<RecordSyncResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const endpoint = buildProviderEndpoint(provider, '/sync');
    const query = baseApi.sanitizeQueryParams({ businessId });

    const metadata = sanitizeOptionalJsonObject<Record<string, unknown>>(payload.metadata, 'metadata');
    const body = baseApi.sanitizeRequestData({
      ...(metadata ? { metadata } : {})
    });

    try {
      const response = await api.post<ApiResponse<RecordSyncResponse>>(endpoint, body, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to record ecommerce integration sync', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createIntegrationDataLogContext('POST', endpoint, {
          businessId,
          hasMetadata: Boolean(metadata)
        })
      );
    }
  },

  /**
   * Find business by provider identifier.
   * GET /api/integrations/ecommerce/lookup
   */
  async findBusinessByProviderIdentifier(
    params: ProviderLookupParams
  ): Promise<ProviderLookupResponse> {
    const provider = sanitizeProvider(params.provider);
    const identifier = sanitizeString(params.identifier, 'identifier', {
      trim: true,
      minLength: 1,
      maxLength: 500
    });

    const endpoint = `${BASE_PATH}/lookup`;
    const query = baseApi.sanitizeQueryParams({
      provider,
      identifier
    });

    try {
      const response = await api.get<ApiResponse<ProviderLookupResponse>>(endpoint, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to lookup ecommerce integration by identifier', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createIntegrationDataLogContext('GET', endpoint, {
          provider,
          identifier
        })
      );
    }
  },

  /**
   * List business IDs connected to a provider.
   * GET /api/integrations/ecommerce/connected
   */
  async listConnectedBusinesses(provider: EcommerceProvider | string): Promise<ConnectedBusinessesResponse> {
    const sanitizedProvider = sanitizeProvider(provider);
    const endpoint = `${BASE_PATH}/connected`;
    const query = baseApi.sanitizeQueryParams({
      provider: sanitizedProvider
    });

    try {
      const response = await api.get<ApiResponse<ConnectedBusinessesResponse>>(endpoint, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to list connected ecommerce businesses', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createIntegrationDataLogContext('GET', endpoint, {
          provider: sanitizedProvider
        })
      );
    }
  }
};

export default ecommerceIntegrationDataApi;
