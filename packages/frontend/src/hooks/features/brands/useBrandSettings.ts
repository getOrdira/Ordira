'use client';

// src/hooks/features/brands/useBrandSettings.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import brandSettingsApi, {
  type DomainValidationInput,
  type ExportSettingsParams,
  type ImportSettingsPayload,
  type IntegrationSyncPayload,
  type IntegrationTestInput,
  type WalletValidationInput
} from '@/lib/api/features/brands/brandSettings.api';
import type {
  BrandDomainInstruction,
  BrandDomainValidationResult,
  BrandSettingsExportData,
  BrandSettingsHealth,
  BrandSettingsSyncResult,
  BrandSettingsTestResult,
  BrandSettingsFormData,
  EnhancedBrandSettings,
  IntegrationStatus,
  UpdateBrandSettingsInput,
  WalletValidationResult
} from '@/lib/types/features/brands';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type SettingsQueryOptions = Omit<
  UseQueryOptions<EnhancedBrandSettings, ApiError, EnhancedBrandSettings, QueryKey>,
  'queryKey' | 'queryFn'
>;

type StatusQueryOptions = Omit<
  UseQueryOptions<IntegrationStatus, ApiError, IntegrationStatus, QueryKey>,
  'queryKey' | 'queryFn'
>;

type DomainInstructionQueryOptions = Omit<
  UseQueryOptions<BrandDomainInstruction, ApiError, BrandDomainInstruction, QueryKey>,
  'queryKey' | 'queryFn'
>;

type SettingsHealthQueryOptions = Omit<
  UseQueryOptions<BrandSettingsHealth, ApiError, BrandSettingsHealth, QueryKey>,
  'queryKey' | 'queryFn'
>;

type UpdateBrandSettingsVariables =
  Partial<BrandSettingsFormData> & Partial<UpdateBrandSettingsInput>;

export const brandSettingsQueryKeys = {
  root: ['brands', 'settings'] as const,
  details: () => [...brandSettingsQueryKeys.root, 'details'] as const,
  status: () => [...brandSettingsQueryKeys.root, 'status'] as const,
  instructions: () => [...brandSettingsQueryKeys.root, 'instructions'] as const,
  health: () => [...brandSettingsQueryKeys.root, 'health'] as const
};

export const brandSettingsMutationKeys = {
  update: [...brandSettingsQueryKeys.root, 'update'] as const,
  testIntegration: [...brandSettingsQueryKeys.root, 'integration', 'test'] as const,
  validateDomain: [...brandSettingsQueryKeys.root, 'domain', 'validate'] as const,
  validateWallet: [...brandSettingsQueryKeys.root, 'wallet', 'validate'] as const,
  exportSettings: [...brandSettingsQueryKeys.root, 'export'] as const,
  importSettings: [...brandSettingsQueryKeys.root, 'import'] as const,
  syncIntegration: [...brandSettingsQueryKeys.root, 'integration', 'sync'] as const
};

export const useBrandSettings = (
  options?: SettingsQueryOptions
): UseQueryResult<EnhancedBrandSettings, ApiError> => {
  return useQuery({
    queryKey: brandSettingsQueryKeys.details(),
    queryFn: () => brandSettingsApi.getSettings(),
    ...options
  });
};

export const useIntegrationStatusQuery = (
  options?: StatusQueryOptions
): UseQueryResult<IntegrationStatus, ApiError> => {
  return useQuery({
    queryKey: brandSettingsQueryKeys.status(),
    queryFn: () => brandSettingsApi.getIntegrationStatus(),
    ...options
  });
};

export const useBrandDomainInstructions = (
  options?: DomainInstructionQueryOptions
): UseQueryResult<BrandDomainInstruction, ApiError> => {
  return useQuery({
    queryKey: brandSettingsQueryKeys.instructions(),
    queryFn: () => brandSettingsApi.getDomainSetupInstructions(),
    ...options
  });
};

export const useBrandSettingsHealth = (
  options?: SettingsHealthQueryOptions
): UseQueryResult<BrandSettingsHealth, ApiError> => {
  return useQuery({
    queryKey: brandSettingsQueryKeys.health(),
    queryFn: () => brandSettingsApi.getSettingsHealth(),
    ...options
  });
};

export const useUpdateBrandSettings = (
  options?: MutationConfig<EnhancedBrandSettings, UpdateBrandSettingsVariables>
): UseMutationResult<EnhancedBrandSettings, ApiError, UpdateBrandSettingsVariables, unknown> => {
  return useMutation({
    mutationKey: brandSettingsMutationKeys.update,
    mutationFn: brandSettingsApi.updateSettings,
    ...options
  });
};

export const useTestBrandIntegration = (
  options?: MutationConfig<BrandSettingsTestResult, IntegrationTestInput>
): UseMutationResult<BrandSettingsTestResult, ApiError, IntegrationTestInput, unknown> => {
  return useMutation({
    mutationKey: brandSettingsMutationKeys.testIntegration,
    mutationFn: brandSettingsApi.testIntegration,
    ...options
  });
};

export const useValidateBrandDomain = (
  options?: MutationConfig<BrandDomainValidationResult, DomainValidationInput>
): UseMutationResult<BrandDomainValidationResult, ApiError, DomainValidationInput, unknown> => {
  return useMutation({
    mutationKey: brandSettingsMutationKeys.validateDomain,
    mutationFn: brandSettingsApi.validateDomain,
    ...options
  });
};

export const useValidateBrandWallet = (
  options?: MutationConfig<WalletValidationResult, WalletValidationInput>
): UseMutationResult<WalletValidationResult, ApiError, WalletValidationInput, unknown> => {
  return useMutation({
    mutationKey: brandSettingsMutationKeys.validateWallet,
    mutationFn: brandSettingsApi.validateWallet,
    ...options
  });
};

export const useExportBrandSettings = (
  options?: MutationConfig<BrandSettingsExportData, ExportSettingsParams>
): UseMutationResult<BrandSettingsExportData, ApiError, ExportSettingsParams, unknown> => {
  return useMutation({
    mutationKey: brandSettingsMutationKeys.exportSettings,
    mutationFn: brandSettingsApi.exportSettings,
    ...options
  });
};

export const useImportBrandSettings = (
  options?: MutationConfig<void, ImportSettingsPayload>
): UseMutationResult<void, ApiError, ImportSettingsPayload, unknown> => {
  return useMutation({
    mutationKey: brandSettingsMutationKeys.importSettings,
    mutationFn: brandSettingsApi.importSettings,
    ...options
  });
};

export const useSyncBrandIntegration = (
  options?: MutationConfig<BrandSettingsSyncResult, IntegrationSyncPayload>
): UseMutationResult<BrandSettingsSyncResult, ApiError, IntegrationSyncPayload, unknown> => {
  return useMutation({
    mutationKey: brandSettingsMutationKeys.syncIntegration,
    mutationFn: brandSettingsApi.syncIntegration,
    ...options
  });
};
