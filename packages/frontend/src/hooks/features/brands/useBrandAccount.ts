'use client';

// src/hooks/features/brands/useBrandAccount.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import brandAccountApi, {
  type BrandAccountProfileParams,
  type BrandAccountUpdateInput,
  type BrandVerificationPayload
} from '@/lib/api/features/brands/brandAccount.api';
import {
  type BrandAccountDeactivationRequest,
  type BrandAccountDeactivationResult,
  type BrandAccountOverview,
  type BrandAccountReactivationResult,
  type BrandProfile,
  type BrandProfileCompleteness,
  type BrandVerificationSubmissionResult,
  type ProfilePictureUploadResult,
  type VerificationStatus
} from '@/lib/types/features/brands';
import { ApiError } from '@/lib/errors/errors';

const normalizeProfileParams = (params?: BrandAccountProfileParams) => {
  if (!params) {
    return null;
  }
  return { ...params };
};

export const brandAccountQueryKeys = {
  root: ['brands', 'account'] as const,
  profile: (params?: BrandAccountProfileParams) =>
    [...brandAccountQueryKeys.root, 'profile', normalizeProfileParams(params)] as const,
  verificationStatus: () => [...brandAccountQueryKeys.root, 'verification'] as const,
  completeness: () => [...brandAccountQueryKeys.root, 'completeness'] as const,
  recommendations: () => [...brandAccountQueryKeys.root, 'recommendations'] as const
};

export const brandAccountMutationKeys = {
  update: [...brandAccountQueryKeys.root, 'update'] as const,
  uploadPicture: [...brandAccountQueryKeys.root, 'picture', 'upload'] as const,
  removePicture: [...brandAccountQueryKeys.root, 'picture', 'remove'] as const,
  submitVerification: [...brandAccountQueryKeys.root, 'verification', 'submit'] as const,
  deactivate: [...brandAccountQueryKeys.root, 'deactivate'] as const,
  reactivate: [...brandAccountQueryKeys.root, 'reactivate'] as const
};

type ProfileQueryOptions = Omit<
  UseQueryOptions<BrandAccountOverview, ApiError, BrandAccountOverview, QueryKey>,
  'queryKey' | 'queryFn'
>;

type VerificationStatusQueryOptions = Omit<
  UseQueryOptions<VerificationStatus, ApiError, VerificationStatus, QueryKey>,
  'queryKey' | 'queryFn'
>;

type CompletenessQueryOptions = Omit<
  UseQueryOptions<BrandProfileCompleteness, ApiError, BrandProfileCompleteness, QueryKey>,
  'queryKey' | 'queryFn'
>;

type RecommendationsQueryOptions = Omit<
  UseQueryOptions<string[], ApiError, string[], QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const useBrandAccountProfile = (
  params?: BrandAccountProfileParams,
  options?: ProfileQueryOptions
): UseQueryResult<BrandAccountOverview, ApiError> => {
  return useQuery({
    queryKey: brandAccountQueryKeys.profile(params),
    queryFn: () => brandAccountApi.getProfile(params),
    ...options
  });
};

export const useBrandVerificationStatus = (
  options?: VerificationStatusQueryOptions
): UseQueryResult<VerificationStatus, ApiError> => {
  return useQuery({
    queryKey: brandAccountQueryKeys.verificationStatus(),
    queryFn: () => brandAccountApi.getVerificationStatus(),
    ...options
  });
};

export const useBrandProfileCompleteness = (
  options?: CompletenessQueryOptions
): UseQueryResult<BrandProfileCompleteness, ApiError> => {
  return useQuery({
    queryKey: brandAccountQueryKeys.completeness(),
    queryFn: () => brandAccountApi.getProfileCompleteness(),
    ...options
  });
};

export const useBrandProfileRecommendations = (
  options?: RecommendationsQueryOptions
): UseQueryResult<string[], ApiError> => {
  return useQuery({
    queryKey: brandAccountQueryKeys.recommendations(),
    queryFn: () => brandAccountApi.getProfileRecommendations(),
    ...options
  });
};

export const useUpdateBrandAccount = (
  options?: MutationConfig<BrandProfile & Record<string, unknown>, BrandAccountUpdateInput>
): UseMutationResult<
  BrandProfile & Record<string, unknown>,
  ApiError,
  BrandAccountUpdateInput,
  unknown
> => {
  return useMutation({
    mutationKey: brandAccountMutationKeys.update,
    mutationFn: brandAccountApi.updateProfile,
    ...options
  });
};

export const useUploadBrandProfilePicture = (
  options?: MutationConfig<ProfilePictureUploadResult, File>
): UseMutationResult<ProfilePictureUploadResult, ApiError, File, unknown> => {
  return useMutation({
    mutationKey: brandAccountMutationKeys.uploadPicture,
    mutationFn: brandAccountApi.uploadProfilePicture,
    ...options
  });
};

export const useRemoveBrandProfilePicture = (
  options?: MutationConfig<string, void>
): UseMutationResult<string, ApiError, void, unknown> => {
  return useMutation({
    mutationKey: brandAccountMutationKeys.removePicture,
    mutationFn: () => brandAccountApi.removeProfilePicture(),
    ...options
  });
};

export const useSubmitBrandVerification = (
  options?: MutationConfig<BrandVerificationSubmissionResult, BrandVerificationPayload>
): UseMutationResult<
  BrandVerificationSubmissionResult,
  ApiError,
  BrandVerificationPayload,
  unknown
> => {
  return useMutation({
    mutationKey: brandAccountMutationKeys.submitVerification,
    mutationFn: brandAccountApi.submitVerification,
    ...options
  });
};

export const useDeactivateBrandAccount = (
  options?: MutationConfig<BrandAccountDeactivationResult, BrandAccountDeactivationRequest>
): UseMutationResult<
  BrandAccountDeactivationResult,
  ApiError,
  BrandAccountDeactivationRequest,
  unknown
> => {
  return useMutation({
    mutationKey: brandAccountMutationKeys.deactivate,
    mutationFn: brandAccountApi.deactivateAccount,
    ...options
  });
};

export const useReactivateBrandAccount = (
  options?: MutationConfig<BrandAccountReactivationResult, void>
): UseMutationResult<BrandAccountReactivationResult, ApiError, void, unknown> => {
  return useMutation({
    mutationKey: brandAccountMutationKeys.reactivate,
    mutationFn: () => brandAccountApi.reactivateAccount(),
    ...options
  });
};
