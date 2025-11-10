'use client';

// src/hooks/features/brands/useBrandCustomerAccess.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import brandCustomerAccessApi, {
  type CustomerBulkUpdatePayload,
  type CustomerListParams,
  type EmailGatingSettingsUpdate
} from '@/lib/api/features/brands/brandCustomerAccess.api';
import type {
  BrandCustomerAnalytics,
  BrandCustomerBulkUpdateResult,
  BrandCustomerDeleteResult,
  BrandCustomerEmailAccessCheck,
  BrandCustomerGrantResult,
  BrandCustomerImportResult,
  BrandCustomerSyncResult,
  CustomerImportData,
  CustomerSummary,
  EmailGatingSettings
} from '@/lib/types/features/brands';
import type { PaginatedResponse } from '@/lib/types/core';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type CustomersQueryOptions = Omit<
  UseQueryOptions<PaginatedResponse<CustomerSummary>, ApiError, PaginatedResponse<CustomerSummary>, QueryKey>,
  'queryKey' | 'queryFn'
>;

type SettingsQueryOptions = Omit<
  UseQueryOptions<EmailGatingSettings, ApiError, EmailGatingSettings, QueryKey>,
  'queryKey' | 'queryFn'
>;

type AnalyticsQueryOptions = Omit<
  UseQueryOptions<BrandCustomerAnalytics, ApiError, BrandCustomerAnalytics, QueryKey>,
  'queryKey' | 'queryFn'
>;

const normalizeListParams = (params?: CustomerListParams) => {
  if (!params) {
    return null;
  }
  return {
    page: params.page ?? 1,
    limit: params.limit ?? 25,
    search: params.search ?? '',
    status: params.status ?? 'active',
    sortBy: params.sortBy ?? 'createdAt',
    sortOrder: params.sortOrder ?? 'desc'
  };
};

export const brandCustomerAccessQueryKeys = {
  root: ['brands', 'customer-access'] as const,
  list: (params?: CustomerListParams) =>
    [...brandCustomerAccessQueryKeys.root, 'customers', normalizeListParams(params)] as const,
  settings: () => [...brandCustomerAccessQueryKeys.root, 'settings'] as const,
  analytics: () => [...brandCustomerAccessQueryKeys.root, 'analytics'] as const
};

export const brandCustomerAccessMutationKeys = {
  checkEmail: [...brandCustomerAccessQueryKeys.root, 'check-email'] as const,
  grantAccess: [...brandCustomerAccessQueryKeys.root, 'grant-access'] as const,
  addCustomers: [...brandCustomerAccessQueryKeys.root, 'add-customers'] as const,
  importCsv: [...brandCustomerAccessQueryKeys.root, 'import-csv'] as const,
  syncShopify: [...brandCustomerAccessQueryKeys.root, 'sync-shopify'] as const,
  updateSettings: [...brandCustomerAccessQueryKeys.root, 'settings', 'update'] as const,
  revokeAccess: [...brandCustomerAccessQueryKeys.root, 'revoke'] as const,
  restoreAccess: [...brandCustomerAccessQueryKeys.root, 'restore'] as const,
  deleteCustomer: [...brandCustomerAccessQueryKeys.root, 'delete'] as const,
  bulkUpdate: [...brandCustomerAccessQueryKeys.root, 'bulk-update'] as const
};

export const useBrandCustomers = (
  params?: CustomerListParams,
  options?: CustomersQueryOptions
): UseQueryResult<PaginatedResponse<CustomerSummary>, ApiError> => {
  return useQuery({
    queryKey: brandCustomerAccessQueryKeys.list(params),
    queryFn: () => brandCustomerAccessApi.getCustomers(params),
    ...options
  });
};

export const useEmailGatingSettings = (
  options?: SettingsQueryOptions
): UseQueryResult<EmailGatingSettings, ApiError> => {
  return useQuery({
    queryKey: brandCustomerAccessQueryKeys.settings(),
    queryFn: () => brandCustomerAccessApi.getEmailGatingSettings(),
    ...options
  });
};

export const useBrandCustomerAnalytics = (
  options?: AnalyticsQueryOptions
): UseQueryResult<BrandCustomerAnalytics, ApiError> => {
  return useQuery({
    queryKey: brandCustomerAccessQueryKeys.analytics(),
    queryFn: () => brandCustomerAccessApi.getCustomerAnalytics(),
    ...options
  });
};

export const useCheckCustomerEmailAccess = (
  options?: MutationConfig<BrandCustomerEmailAccessCheck, string>
): UseMutationResult<BrandCustomerEmailAccessCheck, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: brandCustomerAccessMutationKeys.checkEmail,
    mutationFn: brandCustomerAccessApi.checkEmailAccess,
    ...options
  });
};

export const useGrantCustomerVotingAccess = (
  options?: MutationConfig<BrandCustomerGrantResult, string>
): UseMutationResult<BrandCustomerGrantResult, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: brandCustomerAccessMutationKeys.grantAccess,
    mutationFn: brandCustomerAccessApi.grantVotingAccess,
    ...options
  });
};

export const useAddBrandCustomers = (
  options?: MutationConfig<BrandCustomerImportResult, CustomerImportData[]>
): UseMutationResult<BrandCustomerImportResult, ApiError, CustomerImportData[], unknown> => {
  return useMutation({
    mutationKey: brandCustomerAccessMutationKeys.addCustomers,
    mutationFn: brandCustomerAccessApi.addCustomers,
    ...options
  });
};

export const useImportBrandCustomersCsv = (
  options?: MutationConfig<BrandCustomerImportResult, File>
): UseMutationResult<BrandCustomerImportResult, ApiError, File, unknown> => {
  return useMutation({
    mutationKey: brandCustomerAccessMutationKeys.importCsv,
    mutationFn: brandCustomerAccessApi.importCustomersFromCsv,
    ...options
  });
};

export const useSyncBrandCustomersFromShopify = (
  options?: MutationConfig<BrandCustomerSyncResult, void>
): UseMutationResult<BrandCustomerSyncResult, ApiError, void, unknown> => {
  return useMutation({
    mutationKey: brandCustomerAccessMutationKeys.syncShopify,
    mutationFn: () => brandCustomerAccessApi.syncFromShopify(),
    ...options
  });
};

export const useUpdateEmailGatingSettings = (
  options?: MutationConfig<EmailGatingSettings, EmailGatingSettingsUpdate>
): UseMutationResult<EmailGatingSettings, ApiError, EmailGatingSettingsUpdate, unknown> => {
  return useMutation({
    mutationKey: brandCustomerAccessMutationKeys.updateSettings,
    mutationFn: brandCustomerAccessApi.updateEmailGatingSettings,
    ...options
  });
};

export const useRevokeCustomerAccess = (
  options?: MutationConfig<CustomerSummary | undefined, string>
): UseMutationResult<CustomerSummary | undefined, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: brandCustomerAccessMutationKeys.revokeAccess,
    mutationFn: brandCustomerAccessApi.revokeCustomerAccess,
    ...options
  });
};

export const useRestoreCustomerAccess = (
  options?: MutationConfig<CustomerSummary | undefined, string>
): UseMutationResult<CustomerSummary | undefined, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: brandCustomerAccessMutationKeys.restoreAccess,
    mutationFn: brandCustomerAccessApi.restoreCustomerAccess,
    ...options
  });
};

export const useDeleteBrandCustomer = (
  options?: MutationConfig<BrandCustomerDeleteResult, string>
): UseMutationResult<BrandCustomerDeleteResult, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: brandCustomerAccessMutationKeys.deleteCustomer,
    mutationFn: brandCustomerAccessApi.deleteCustomer,
    ...options
  });
};

export const useBulkUpdateCustomerAccess = (
  options?: MutationConfig<BrandCustomerBulkUpdateResult, CustomerBulkUpdatePayload>
): UseMutationResult<BrandCustomerBulkUpdateResult, ApiError, CustomerBulkUpdatePayload, unknown> => {
  return useMutation({
    mutationKey: brandCustomerAccessMutationKeys.bulkUpdate,
    mutationFn: brandCustomerAccessApi.bulkUpdateCustomerAccess,
    ...options
  });
};
