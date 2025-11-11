'use client';

// src/hooks/features/manufacturers/useManufacturerHelpers.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import manufacturerHelpersApi from '@/lib/api/features/manufacturers/manufacturerHelpers.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const normalizeOptions = <T extends Record<string, unknown> | undefined>(value?: T) => {
  if (!value) {
    return null;
  }
  return Object.keys(value).length ? { ...value } : null;
};

type GenerateAnalyticsParams = Parameters<typeof manufacturerHelpersApi.generateAnalytics>;
type GenerateAnalyticsVariables = {
  manufacturerId: GenerateAnalyticsParams[0];
  options?: GenerateAnalyticsParams[1];
};

type ValidateRegistrationPayload = Parameters<
  typeof manufacturerHelpersApi.validateRegistration
>[0];

type ValidateUpdatePayload = Parameters<typeof manufacturerHelpersApi.validateUpdate>[0];

type FormatForPublicPayload = Parameters<typeof manufacturerHelpersApi.formatForPublic>[0];
type SanitizeSearchParamsPayload = Parameters<
  typeof manufacturerHelpersApi.sanitizeSearchParams
>[0];
type ManufacturerRecord = Record<string, unknown>;

export const manufacturerHelpersQueryKeys = {
  root: ['manufacturers', 'helpers'] as const,
  analytics: (manufacturerId: string, options?: GenerateAnalyticsParams[1]) =>
    [...manufacturerHelpersQueryKeys.root, 'analytics', manufacturerId, normalizeOptions(options)] as const
};

export const manufacturerHelpersMutationKeys = {
  validateRegistration: [...manufacturerHelpersQueryKeys.root, 'validate-registration'] as const,
  validateUpdate: [...manufacturerHelpersQueryKeys.root, 'validate-update'] as const,
  invalidateCaches: [...manufacturerHelpersQueryKeys.root, 'invalidate-caches'] as const,
  formatPublic: [...manufacturerHelpersQueryKeys.root, 'format-public'] as const,
  profileComplete: [...manufacturerHelpersQueryKeys.root, 'profile-complete'] as const,
  sanitizeSearch: [...manufacturerHelpersQueryKeys.root, 'sanitize-search'] as const
};

export const useManufacturerAnalytics = (
  manufacturerId: GenerateAnalyticsParams[0],
  optionsArg?: GenerateAnalyticsParams[1],
  options?: QueryOptions<Record<string, unknown>>
): UseQueryResult<Record<string, unknown>, ApiError> => {
  return useQuery({
    queryKey: manufacturerHelpersQueryKeys.analytics(manufacturerId, optionsArg),
    queryFn: () => manufacturerHelpersApi.generateAnalytics(manufacturerId, optionsArg),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useValidateManufacturerRegistration = (
  options?: MutationConfig<{ valid: boolean; message: string }, ValidateRegistrationPayload>
): UseMutationResult<
  { valid: boolean; message: string },
  ApiError,
  ValidateRegistrationPayload,
  unknown
> => {
  return useMutation({
    mutationKey: manufacturerHelpersMutationKeys.validateRegistration,
    mutationFn: manufacturerHelpersApi.validateRegistration,
    ...options
  });
};

export const useValidateManufacturerUpdate = (
  options?: MutationConfig<{ valid: boolean; message: string }, ValidateUpdatePayload>
): UseMutationResult<
  { valid: boolean; message: string },
  ApiError,
  ValidateUpdatePayload,
  unknown
> => {
  return useMutation({
    mutationKey: manufacturerHelpersMutationKeys.validateUpdate,
    mutationFn: manufacturerHelpersApi.validateUpdate,
    ...options
  });
};

export const useInvalidateManufacturerCaches = (
  options?: MutationConfig<string, string>
): UseMutationResult<string, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: manufacturerHelpersMutationKeys.invalidateCaches,
    mutationFn: manufacturerHelpersApi.invalidateCaches,
    ...options
  });
};

export const useFormatManufacturerForPublic = (
  options?: MutationConfig<ManufacturerRecord, FormatForPublicPayload>
): UseMutationResult<ManufacturerRecord, ApiError, FormatForPublicPayload, unknown> => {
  return useMutation({
    mutationKey: manufacturerHelpersMutationKeys.formatPublic,
    mutationFn: manufacturerHelpersApi.formatForPublic,
    ...options
  });
};

export const useIsManufacturerProfileComplete = (
  options?: MutationConfig<boolean, ManufacturerRecord>
): UseMutationResult<boolean, ApiError, ManufacturerRecord, unknown> => {
  return useMutation({
    mutationKey: manufacturerHelpersMutationKeys.profileComplete,
    mutationFn: manufacturerHelpersApi.isProfileComplete,
    ...options
  });
};

export const useSanitizeManufacturerSearchParams = (
  options?: MutationConfig<Record<string, unknown>, SanitizeSearchParamsPayload>
): UseMutationResult<Record<string, unknown>, ApiError, SanitizeSearchParamsPayload, unknown> => {
  return useMutation({
    mutationKey: manufacturerHelpersMutationKeys.sanitizeSearch,
    mutationFn: manufacturerHelpersApi.sanitizeSearchParams,
    ...options
  });
};
