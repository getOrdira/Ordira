// src/lib/api/integrations/ecommerce/ecommerceOAuth.api.ts
// Ecommerce OAuth API aligned with backend routes/integrations/ecommerce/ecommerceOAuth.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type {
  EcommerceProvider,
  OAuthStatePayload,
  PkcePair
} from '@/lib/types/integrations/ecommerce';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeObjectId,
  sanitizeOptionalBoolean,
  sanitizeOptionalJsonObject,
  sanitizeOptionalNumber,
  sanitizeOptionalString,
  sanitizeString,
  sanitizeUrl
} from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/integrations/ecommerce';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

const SUPPORTED_PROVIDERS: readonly EcommerceProvider[] = ['shopify', 'wix', 'woocommerce'];

const createEcommerceOAuthLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'integrations',
  module: 'ecommerce.oauth',
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

export interface GenerateStateTokenParams {
  businessId: string;
  provider: EcommerceProvider | string;
  ttlSeconds?: number;
}

export interface GenerateStateTokenPayload {
  ttlSeconds?: number;
  metadata?: Record<string, unknown>;
}

export interface GenerateStateTokenResponse {
  provider: EcommerceProvider;
  businessId: string;
  state: string;
  ttlSeconds?: number;
  pkce?: PkcePair;
}

const buildStateEndpoint = (provider: EcommerceProvider) => `${BASE_PATH}/${provider}/state`;
const buildValidateEndpoint = (provider: EcommerceProvider) => `${BASE_PATH}/${provider}/validate`;
const buildAuthorizeUrlEndpoint = (provider: EcommerceProvider) => `${BASE_PATH}/${provider}/authorize-url`;

export interface ValidateStateTokenParams {
  provider: EcommerceProvider | string;
  state: string;
  consume?: boolean;
}

export interface ValidateStateTokenResponse {
  provider: EcommerceProvider;
  state: string;
  payload: OAuthStatePayload;
}

export interface InvalidateStateTokenResponse {
  state: string;
  invalidated: boolean;
  invalidatedAt: string;
}

export interface BuildAuthorizationUrlPayload {
  baseAuthorizeUrl: string;
  params?: Record<string, string | number | null | undefined>;
}

export interface BuildAuthorizationUrlResponse {
  provider: EcommerceProvider;
  url: string;
}

export const ecommerceOAuthApi = {
  /**
   * Generate an OAuth state token for a provider.
   * POST /api/integrations/ecommerce/:provider/state
   */
  async generateStateToken(
    params: GenerateStateTokenParams,
    payload: GenerateStateTokenPayload = {}
  ): Promise<GenerateStateTokenResponse> {
    const provider = sanitizeProvider(params.provider);
    const businessId = sanitizeBusinessId(params.businessId);
    const endpoint = buildStateEndpoint(provider);

    const ttlSeconds = sanitizeOptionalNumber(payload.ttlSeconds ?? params.ttlSeconds, 'ttlSeconds', {
      integer: true,
      min: 30,
      max: 1_800
    });

    const metadata = sanitizeOptionalJsonObject<Record<string, unknown>>(payload.metadata, 'metadata');

    const body = baseApi.sanitizeRequestData({
      ...(ttlSeconds !== undefined ? { ttlSeconds } : {}),
      ...(metadata ? { metadata } : {})
    });

    const query = baseApi.sanitizeQueryParams({
      businessId
    });

    try {
      const response = await api.post<ApiResponse<GenerateStateTokenResponse>>(endpoint, body, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to generate ecommerce OAuth state token', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createEcommerceOAuthLogContext('POST', endpoint, {
          businessId,
          provider,
          ttlSeconds
        })
      );
    }
  },

  /**
   * Validate an OAuth state token.
   * GET /api/integrations/ecommerce/:provider/validate
   */
  async validateStateToken(params: ValidateStateTokenParams): Promise<ValidateStateTokenResponse> {
    const provider = sanitizeProvider(params.provider);
    const state = sanitizeString(params.state, 'state', { trim: true, minLength: 1, maxLength: 500 });
    const endpoint = buildValidateEndpoint(provider);

    const query = baseApi.sanitizeQueryParams({
      state,
      consume: sanitizeOptionalBoolean(params.consume, 'consume')
    });

    try {
      const response = await api.get<ApiResponse<ValidateStateTokenResponse>>(endpoint, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to validate ecommerce OAuth state token', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createEcommerceOAuthLogContext('GET', endpoint, {
          provider,
          state,
          consume: query.consume
        })
      );
    }
  },

  /**
   * Invalidate an OAuth state token.
   * DELETE /api/integrations/ecommerce/state
   */
  async invalidateStateToken(state: string): Promise<InvalidateStateTokenResponse> {
    const sanitizedState = sanitizeString(state, 'state', { trim: true, minLength: 1, maxLength: 500 });
    const endpoint = `${BASE_PATH}/state`;
    const query = baseApi.sanitizeQueryParams({ state: sanitizedState });

    try {
      const response = await api.delete<ApiResponse<InvalidateStateTokenResponse>>(endpoint, {
        params: query
      });
      return baseApi.handleResponse(response, 'Failed to invalidate ecommerce OAuth state token', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createEcommerceOAuthLogContext('DELETE', endpoint, { state: sanitizedState })
      );
    }
  },

  /**
   * Build a provider-specific authorization URL.
   * POST /api/integrations/ecommerce/:provider/authorize-url
   */
  async buildAuthorizationUrl(
    provider: EcommerceProvider | string,
    payload: BuildAuthorizationUrlPayload
  ): Promise<BuildAuthorizationUrlResponse> {
    const sanitizedProvider = sanitizeProvider(provider);
    const endpoint = buildAuthorizeUrlEndpoint(sanitizedProvider);

    const baseAuthorizeUrl = sanitizeUrl(payload.baseAuthorizeUrl, 'baseAuthorizeUrl', {
      allowedProtocols: ['http:', 'https:']
    });

    const paramsInput = sanitizeOptionalJsonObject<Record<string, string | number | null | undefined>>(
      payload.params,
      'params'
    );

    const sanitizedParams =
      paramsInput &&
      Object.entries(paramsInput).reduce<Record<string, string | number>>((acc, [key, value]) => {
        if (value === null || value === undefined) {
          return acc;
        }
        if (typeof value === 'number') {
          acc[key] = value;
          return acc;
        }
        const sanitizedValue = sanitizeString(value, `params.${key}`, {
          trim: true,
          maxLength: 500
        });
        acc[key] = sanitizedValue;
        return acc;
      }, {});

    const body = baseApi.sanitizeRequestData({
      baseAuthorizeUrl,
      ...(sanitizedParams && Object.keys(sanitizedParams).length ? { params: sanitizedParams } : {})
    });

    try {
      const response = await api.post<ApiResponse<BuildAuthorizationUrlResponse>>(endpoint, body);
      return baseApi.handleResponse(response, 'Failed to build ecommerce authorization URL', 400);
    } catch (error) {
      throw handleApiError(
        error,
        createEcommerceOAuthLogContext('POST', endpoint, {
          provider: sanitizedProvider,
          hasParams: Boolean(sanitizedParams && Object.keys(sanitizedParams).length > 0)
        })
      );
    }
  }
};

export default ecommerceOAuthApi;
