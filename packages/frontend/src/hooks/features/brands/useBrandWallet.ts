'use client';

// src/hooks/features/brands/useBrandWallet.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import brandWalletApi, {
  type BatchTokenDiscountPayload,
  type CertificateWalletPayload,
  type TokenDiscountUpdatePayload,
  type VerificationMessagePayload,
  type WalletChangePayload,
  type WalletOwnershipPayload,
  type WalletValidationPayload
} from '@/lib/api/features/brands/brandWallet.api';
import type {
  BrandCertificateWalletUpdate,
  BrandWalletStatistics,
  TokenDiscountInfo,
  WalletOwnershipResult,
  WalletValidationResult,
  WalletVerificationStatus
} from '@/lib/types/features/brands';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type VerificationStatusQueryOptions = Omit<
  UseQueryOptions<WalletVerificationStatus, ApiError, WalletVerificationStatus, QueryKey>,
  'queryKey' | 'queryFn'
>;

type StatisticsQueryOptions = Omit<
  UseQueryOptions<BrandWalletStatistics, ApiError, BrandWalletStatistics, QueryKey>,
  'queryKey' | 'queryFn'
>;

export const brandWalletQueryKeys = {
  root: ['brands', 'wallet'] as const,
  verificationStatus: () => [...brandWalletQueryKeys.root, 'verification-status'] as const,
  statistics: () => [...brandWalletQueryKeys.root, 'statistics'] as const
};

export const brandWalletMutationKeys = {
  validateWallet: [...brandWalletQueryKeys.root, 'validate'] as const,
  verifyOwnership: [...brandWalletQueryKeys.root, 'verify-ownership'] as const,
  updateDiscounts: [...brandWalletQueryKeys.root, 'token-discounts', 'update'] as const,
  updateCertificateWallet: [...brandWalletQueryKeys.root, 'certificate', 'update'] as const,
  batchDiscounts: [...brandWalletQueryKeys.root, 'token-discounts', 'batch'] as const,
  handleChange: [...brandWalletQueryKeys.root, 'change'] as const,
  verificationMessage: [...brandWalletQueryKeys.root, 'verification-message'] as const
};

export const useWalletVerificationStatus = (
  options?: VerificationStatusQueryOptions
): UseQueryResult<WalletVerificationStatus, ApiError> => {
  return useQuery({
    queryKey: brandWalletQueryKeys.verificationStatus(),
    queryFn: () => brandWalletApi.getVerificationStatus(),
    ...options
  });
};

export const useBrandWalletStatistics = (
  options?: StatisticsQueryOptions
): UseQueryResult<BrandWalletStatistics, ApiError> => {
  return useQuery({
    queryKey: brandWalletQueryKeys.statistics(),
    queryFn: () => brandWalletApi.getWalletStatistics(),
    ...options
  });
};

export const useValidateWallet = (
  options?: MutationConfig<WalletValidationResult, WalletValidationPayload>
): UseMutationResult<WalletValidationResult, ApiError, WalletValidationPayload, unknown> => {
  return useMutation({
    mutationKey: brandWalletMutationKeys.validateWallet,
    mutationFn: brandWalletApi.validateWallet,
    ...options
  });
};

export const useVerifyWalletOwnership = (
  options?: MutationConfig<WalletOwnershipResult, WalletOwnershipPayload>
): UseMutationResult<WalletOwnershipResult, ApiError, WalletOwnershipPayload, unknown> => {
  return useMutation({
    mutationKey: brandWalletMutationKeys.verifyOwnership,
    mutationFn: brandWalletApi.verifyWalletOwnership,
    ...options
  });
};

export const useUpdateTokenDiscounts = (
  options?: MutationConfig<TokenDiscountInfo, TokenDiscountUpdatePayload>
): UseMutationResult<TokenDiscountInfo, ApiError, TokenDiscountUpdatePayload, unknown> => {
  return useMutation({
    mutationKey: brandWalletMutationKeys.updateDiscounts,
    mutationFn: brandWalletApi.updateTokenDiscounts,
    ...options
  });
};

export const useUpdateCertificateWallet = (
  options?: MutationConfig<BrandCertificateWalletUpdate, CertificateWalletPayload>
): UseMutationResult<BrandCertificateWalletUpdate, ApiError, CertificateWalletPayload, unknown> => {
  return useMutation({
    mutationKey: brandWalletMutationKeys.updateCertificateWallet,
    mutationFn: brandWalletApi.updateCertificateWallet,
    ...options
  });
};

export const useBatchUpdateTokenDiscounts = (
  options?: MutationConfig<TokenDiscountInfo[], BatchTokenDiscountPayload>
): UseMutationResult<TokenDiscountInfo[], ApiError, BatchTokenDiscountPayload, unknown> => {
  return useMutation({
    mutationKey: brandWalletMutationKeys.batchDiscounts,
    mutationFn: brandWalletApi.batchUpdateTokenDiscounts,
    ...options
  });
};

export const useHandleWalletChange = (
  options?: MutationConfig<string, WalletChangePayload>
): UseMutationResult<string, ApiError, WalletChangePayload, unknown> => {
  return useMutation({
    mutationKey: brandWalletMutationKeys.handleChange,
    mutationFn: brandWalletApi.handleWalletChange,
    ...options
  });
};

export const useGenerateWalletVerificationMessage = (
  options?: MutationConfig<string, VerificationMessagePayload | undefined>
): UseMutationResult<string, ApiError, VerificationMessagePayload | undefined, unknown> => {
  return useMutation({
    mutationKey: brandWalletMutationKeys.verificationMessage,
    mutationFn: (payload?: VerificationMessagePayload) =>
      brandWalletApi.generateVerificationMessage(payload),
    ...options
  });
};
