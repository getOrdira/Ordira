'use client';

// src/hooks/integrations/ecommerce/useEcommerceProviders.ts

import {
  useQuery,
  type UseQueryResult
} from '@tanstack/react-query';

import ecommerceProvidersApi, {
  type ListProvidersResponse,
  type ProviderCapabilitiesResponse
} from '@/lib/api/integrations/ecommerce/ecommerceProviders.api';
import { ApiError } from '@/lib/errors/errors';
import { type FeatureQueryOptions } from '@/hooks/query';

const ecommerceProvidersQueryKeysRoot = ['integrations', 'ecommerce', 'providers'] as const;

export const ecommerceProvidersQueryKeys = {
  root: ecommerceProvidersQueryKeysRoot,
  list: [...ecommerceProvidersQueryKeysRoot, 'list'] as const,
  capabilities: (provider: string) =>
    [...ecommerceProvidersQueryKeysRoot, 'capabilities', provider] as const
};

/**
 * List supported ecommerce providers.
 */
export const useListProviders = (
  options?: FeatureQueryOptions<ListProvidersResponse>
): UseQueryResult<ListProvidersResponse, ApiError> => {
  return useQuery({
    queryKey: ecommerceProvidersQueryKeys.list,
    queryFn: () => ecommerceProvidersApi.listProviders(),
    ...options
  });
};

/**
 * Retrieve capability metadata for a provider.
 */
export const useProviderCapabilities = (
  provider: string,
  options?: FeatureQueryOptions<ProviderCapabilitiesResponse>
): UseQueryResult<ProviderCapabilitiesResponse, ApiError> => {
  return useQuery({
    queryKey: ecommerceProvidersQueryKeys.capabilities(provider),
    queryFn: () => ecommerceProvidersApi.getProviderCapabilities(provider),
    enabled: Boolean(provider) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all ecommerce providers operations.
 */
export interface UseEcommerceProvidersOptions {
  queries?: {
    list?: FeatureQueryOptions<ListProvidersResponse>;
    capabilities?: FeatureQueryOptions<ProviderCapabilitiesResponse>;
  };
}

export interface UseEcommerceProvidersResult {
  // Queries
  list: () => UseQueryResult<ListProvidersResponse, ApiError>;
  capabilities: (provider: string) => UseQueryResult<ProviderCapabilitiesResponse, ApiError>;
}

export const useEcommerceProviders = (
  options: UseEcommerceProvidersOptions = {}
): UseEcommerceProvidersResult => {
  return {
    list: () => useListProviders(options.queries?.list),
    capabilities: (provider: string) =>
      useProviderCapabilities(provider, options.queries?.capabilities)
  };
};
