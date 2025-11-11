// src/lib/api/integrations/ecommerce/ecommerceProviders.api.ts
// Ecommerce providers API aligned with backend routes/integrations/ecommerce/ecommerceProviders.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import type { EcommerceProvider } from '@/lib/types/integrations/ecommerce';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import { sanitizeString } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/integrations/ecommerce/providers';

type HttpMethod = 'GET';

const SUPPORTED_PROVIDERS: readonly EcommerceProvider[] = ['shopify', 'wix', 'woocommerce'];

const createProvidersLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'integrations',
  module: 'ecommerce.providers',
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

export interface ProviderSummary {
  provider: EcommerceProvider | string;
  hasOrders: boolean;
  hasProducts: boolean;
  hasWebhooks: boolean;
  hasAnalytics: boolean;
  hasConnectionHealth: boolean;
}

export interface ListProvidersResponse {
  providers: ProviderSummary[];
}

export interface ProviderCapabilitiesResponse {
  provider: EcommerceProvider;
  adapters: {
    hasOrders: boolean;
    hasProducts: boolean;
    hasWebhooks: boolean;
    hasAnalytics: boolean;
    hasConnection: boolean;
  };
}

export const ecommerceProvidersApi = {
  /**
   * List supported ecommerce providers.
   * GET /api/integrations/ecommerce/providers
   */
  async listProviders(): Promise<ListProvidersResponse> {
    const endpoint = BASE_PATH;

    try {
      const response = await api.get<ApiResponse<ListProvidersResponse>>(endpoint);
      return baseApi.handleResponse(response, 'Failed to list ecommerce providers', 500);
    } catch (error) {
      throw handleApiError(error, createProvidersLogContext('GET', endpoint));
    }
  },

  /**
   * Retrieve capability metadata for a provider.
   * GET /api/integrations/ecommerce/providers/:provider/capabilities
   */
  async getProviderCapabilities(provider: EcommerceProvider | string): Promise<ProviderCapabilitiesResponse> {
    const sanitizedProvider = sanitizeProvider(provider);
    const endpoint = `${BASE_PATH}/${sanitizedProvider}/capabilities`;

    try {
      const response = await api.get<ApiResponse<ProviderCapabilitiesResponse>>(endpoint);
      return baseApi.handleResponse(response, 'Failed to fetch ecommerce provider capabilities', 500);
    } catch (error) {
      throw handleApiError(
        error,
        createProvidersLogContext('GET', endpoint, { provider: sanitizedProvider })
      );
    }
  }
};

export default ecommerceProvidersApi;
