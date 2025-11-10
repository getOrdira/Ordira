'use client';

// src/hooks/features/brands/useBrandVerification.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import brandVerificationApi, {
  type BusinessVerificationStatusUpdate,
  type VerificationDocumentsPayload,
  type VerificationStatisticsParams
} from '@/lib/api/features/brands/brandVerification.api';
import type {
  BrandVerificationEmailResult,
  BrandVerificationHistoryEntry,
  BrandVerificationSendEmailResult,
  BrandVerificationStatistics,
  BrandVerificationSubmissionResult,
  DetailedVerificationStatus,
  VerificationStatus
} from '@/lib/types/features/brands';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type StatusQueryOptions = Omit<
  UseQueryOptions<VerificationStatus, ApiError, VerificationStatus, QueryKey>,
  'queryKey' | 'queryFn'
>;

type DetailedStatusQueryOptions = Omit<
  UseQueryOptions<DetailedVerificationStatus, ApiError, DetailedVerificationStatus, QueryKey>,
  'queryKey' | 'queryFn'
>;

type HistoryQueryOptions = Omit<
  UseQueryOptions<BrandVerificationHistoryEntry[], ApiError, BrandVerificationHistoryEntry[], QueryKey>,
  'queryKey' | 'queryFn'
>;

type StatisticsQueryOptions = Omit<
  UseQueryOptions<BrandVerificationStatistics, ApiError, BrandVerificationStatistics, QueryKey>,
  'queryKey' | 'queryFn'
>;

const normalizeStatisticsParams = (params?: VerificationStatisticsParams) => {
  if (!params) {
    return null;
  }
  return { ...params };
};

export const brandVerificationQueryKeys = {
  root: ['brands', 'verification'] as const,
  status: () => [...brandVerificationQueryKeys.root, 'status'] as const,
  detailedStatus: () => [...brandVerificationQueryKeys.root, 'status', 'detailed'] as const,
  history: () => [...brandVerificationQueryKeys.root, 'history'] as const,
  statistics: (params?: VerificationStatisticsParams) =>
    [...brandVerificationQueryKeys.root, 'statistics', normalizeStatisticsParams(params)] as const
};

export const brandVerificationMutationKeys = {
  submit: [...brandVerificationQueryKeys.root, 'submit'] as const,
  verifyEmail: [...brandVerificationQueryKeys.root, 'email', 'verify'] as const,
  sendEmail: [...brandVerificationQueryKeys.root, 'email', 'send'] as const,
  updateStatus: [...brandVerificationQueryKeys.root, 'status', 'update'] as const
};

export const useBrandVerificationStatus = (
  options?: StatusQueryOptions
): UseQueryResult<VerificationStatus, ApiError> => {
  return useQuery({
    queryKey: brandVerificationQueryKeys.status(),
    queryFn: () => brandVerificationApi.getStatus(),
    ...options
  });
};

export const useDetailedBrandVerificationStatus = (
  options?: DetailedStatusQueryOptions
): UseQueryResult<DetailedVerificationStatus, ApiError> => {
  return useQuery({
    queryKey: brandVerificationQueryKeys.detailedStatus(),
    queryFn: () => brandVerificationApi.getDetailedStatus(),
    ...options
  });
};

export const useBrandVerificationHistory = (
  options?: HistoryQueryOptions
): UseQueryResult<BrandVerificationHistoryEntry[], ApiError> => {
  return useQuery({
    queryKey: brandVerificationQueryKeys.history(),
    queryFn: () => brandVerificationApi.getHistory(),
    ...options
  });
};

export const useBrandVerificationStatistics = (
  params?: VerificationStatisticsParams,
  options?: StatisticsQueryOptions
): UseQueryResult<BrandVerificationStatistics, ApiError> => {
  return useQuery({
    queryKey: brandVerificationQueryKeys.statistics(params),
    queryFn: () => brandVerificationApi.getStatistics(params),
    ...options
  });
};

export const useSubmitBrandVerificationDocuments = (
  options?: MutationConfig<BrandVerificationSubmissionResult, VerificationDocumentsPayload>
): UseMutationResult<
  BrandVerificationSubmissionResult,
  ApiError,
  VerificationDocumentsPayload,
  unknown
> => {
  return useMutation({
    mutationKey: brandVerificationMutationKeys.submit,
    mutationFn: brandVerificationApi.submitVerification,
    ...options
  });
};

export const useVerifyBrandEmail = (
  options?: MutationConfig<BrandVerificationEmailResult, string>
): UseMutationResult<BrandVerificationEmailResult, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: brandVerificationMutationKeys.verifyEmail,
    mutationFn: brandVerificationApi.verifyEmail,
    ...options
  });
};

export const useSendBrandVerificationEmail = (
  options?: MutationConfig<BrandVerificationSendEmailResult, void>
): UseMutationResult<BrandVerificationSendEmailResult, ApiError, void, unknown> => {
  return useMutation({
    mutationKey: brandVerificationMutationKeys.sendEmail,
    mutationFn: () => brandVerificationApi.sendEmailVerification(),
    ...options
  });
};

export const useUpdateBusinessVerificationStatus = (
  options?: MutationConfig<string, BusinessVerificationStatusUpdate>
): UseMutationResult<string, ApiError, BusinessVerificationStatusUpdate, unknown> => {
  return useMutation({
    mutationKey: brandVerificationMutationKeys.updateStatus,
    mutationFn: brandVerificationApi.updateBusinessStatus,
    ...options
  });
};
