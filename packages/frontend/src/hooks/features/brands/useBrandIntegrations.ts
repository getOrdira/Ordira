'use client';

// src/hooks/features/brands/useBrandIntegrations.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import brandIntegrationsApi, {
  type ShopifyIntegrationInput,
  type WooCommerceIntegrationInput,
  type WixIntegrationInput
} from '@/lib/api/features/brands/brandIntegrations.api';
import type {
  BrandConfiguredIntegration,
  BrandIntegrationRemovalResult,
  BrandIntegrationStatistics,
  ConnectionTestResult,
  IntegrationStatus,
  ShopifyIntegrationData
} from '@/lib/types/features/brands';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type StatusQueryOptions = Omit<
  UseQueryOptions<IntegrationStatus, ApiError, IntegrationStatus, QueryKey>,
  'queryKey' | 'queryFn'
>;

type IntegrationsQueryOptions = Omit<
  UseQueryOptions<string[], ApiError, string[], QueryKey>,
  'queryKey' | 'queryFn'
>;

type StatsQueryOptions = Omit<
  UseQueryOptions<BrandIntegrationStatistics, ApiError, BrandIntegrationStatistics, QueryKey>,
  'queryKey' | 'queryFn'
>;

export const brandIntegrationsQueryKeys = {
  root: ['brands', 'integrations'] as const,
  status: () => [...brandIntegrationsQueryKeys.root, 'status'] as const,
  configured: () => [...brandIntegrationsQueryKeys.root, 'configured'] as const,
  available: () => [...brandIntegrationsQueryKeys.root, 'available'] as const,
  statistics: () => [...brandIntegrationsQueryKeys.root, 'statistics'] as const
};

export const brandIntegrationsMutationKeys = {
  testShopify: [...brandIntegrationsQueryKeys.root, 'shopify', 'test'] as const,
  configureShopify: [...brandIntegrationsQueryKeys.root, 'shopify', 'configure'] as const,
  configureWoo: [...brandIntegrationsQueryKeys.root, 'woocommerce', 'configure'] as const,
  configureWix: [...brandIntegrationsQueryKeys.root, 'wix', 'configure'] as const,
  update: [...brandIntegrationsQueryKeys.root, 'update'] as const,
  remove: [...brandIntegrationsQueryKeys.root, 'remove'] as const,
  permissions: [...brandIntegrationsQueryKeys.root, 'permissions'] as const
};

export const useIntegrationStatus = (
  options?: StatusQueryOptions
): UseQueryResult<IntegrationStatus, ApiError> => {
  return useQuery({
    queryKey: brandIntegrationsQueryKeys.status(),
    queryFn: () => brandIntegrationsApi.getStatus(),
    ...options
  });
};

export const useConfiguredIntegrations = (
  options?: IntegrationsQueryOptions
): UseQueryResult<string[], ApiError> => {
  return useQuery({
    queryKey: brandIntegrationsQueryKeys.configured(),
    queryFn: () => brandIntegrationsApi.getConfiguredIntegrations(),
    ...options
  });
};

export const useAvailableIntegrations = (
  options?: IntegrationsQueryOptions
): UseQueryResult<string[], ApiError> => {
  return useQuery({
    queryKey: brandIntegrationsQueryKeys.available(),
    queryFn: () => brandIntegrationsApi.getAvailableIntegrations(),
    ...options
  });
};

export const useIntegrationStatistics = (
  options?: StatsQueryOptions
): UseQueryResult<BrandIntegrationStatistics, ApiError> => {
  return useQuery({
    queryKey: brandIntegrationsQueryKeys.statistics(),
    queryFn: () => brandIntegrationsApi.getIntegrationStatistics(),
    ...options
  });
};

export const useTestShopifyIntegration = (
  options?: MutationConfig<ConnectionTestResult, ShopifyIntegrationData>
): UseMutationResult<ConnectionTestResult, ApiError, ShopifyIntegrationData, unknown> => {
  return useMutation({
    mutationKey: brandIntegrationsMutationKeys.testShopify,
    mutationFn: brandIntegrationsApi.testShopifyConnection,
    ...options
  });
};

export const useConfigureShopifyIntegration = (
  options?: MutationConfig<BrandConfiguredIntegration, ShopifyIntegrationInput>
): UseMutationResult<BrandConfiguredIntegration, ApiError, ShopifyIntegrationInput, unknown> => {
  return useMutation({
    mutationKey: brandIntegrationsMutationKeys.configureShopify,
    mutationFn: brandIntegrationsApi.configureShopifyIntegration,
    ...options
  });
};

export const useConfigureWooCommerceIntegration = (
  options?: MutationConfig<BrandConfiguredIntegration, WooCommerceIntegrationInput>
): UseMutationResult<BrandConfiguredIntegration, ApiError, WooCommerceIntegrationInput, unknown> => {
  return useMutation({
    mutationKey: brandIntegrationsMutationKeys.configureWoo,
    mutationFn: brandIntegrationsApi.configureWooCommerceIntegration,
    ...options
  });
};

export const useConfigureWixIntegration = (
  options?: MutationConfig<BrandConfiguredIntegration, WixIntegrationInput>
): UseMutationResult<BrandConfiguredIntegration, ApiError, WixIntegrationInput, unknown> => {
  return useMutation({
    mutationKey: brandIntegrationsMutationKeys.configureWix,
    mutationFn: brandIntegrationsApi.configureWixIntegration,
    ...options
  });
};

export const useUpdateBrandIntegration = (
  options?: MutationConfig<UpdateIntegrationResponse, { type: string; payload: Record<string, unknown> }>
): UseMutationResult<UpdateIntegrationResponse, ApiError, { type: string; payload: Record<string, unknown> }, unknown> => {
  return useMutation({
    mutationKey: brandIntegrationsMutationKeys.update,
    mutationFn: ({ type, payload }) => brandIntegrationsApi.updateIntegration(type, payload),
    ...options
  });
};

export const useRemoveBrandIntegration = (
  options?: MutationConfig<BrandIntegrationRemovalResult, string>
): UseMutationResult<BrandIntegrationRemovalResult, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: brandIntegrationsMutationKeys.remove,
    mutationFn: brandIntegrationsApi.removeIntegration,
    ...options
  });
};

export const useCheckIntegrationPermissions = (
  options?: MutationConfig<boolean, string>
): UseMutationResult<boolean, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: brandIntegrationsMutationKeys.permissions,
    mutationFn: brandIntegrationsApi.checkIntegrationPermissions,
    ...options
  });
};
type UpdateIntegrationResponse = Awaited<ReturnType<typeof brandIntegrationsApi.updateIntegration>>;
