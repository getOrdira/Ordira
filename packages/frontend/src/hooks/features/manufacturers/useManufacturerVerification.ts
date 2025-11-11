'use client';

// src/hooks/features/manufacturers/useManufacturerVerification.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import manufacturerVerificationApi, {
  type ReviewSubmissionPayload,
  type VerificationEligibilityResult
} from '@/lib/api/features/manufacturers/manufacturerVerification.api';
import type {
  DetailedVerificationStatus,
  VerificationRequirement,
  VerificationStatus,
  VerificationSubmissionResult
} from '@/lib/types/features/manufacturers';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type SubmitDocumentsParams = Parameters<typeof manufacturerVerificationApi.submitDocuments>;
type SubmitDocumentsVariables = {
  manufacturerId: SubmitDocumentsParams[0];
  file: SubmitDocumentsParams[1];
  metadata?: SubmitDocumentsParams[2];
};

type ReviewSubmissionVariables = {
  manufacturerId: Parameters<typeof manufacturerVerificationApi.reviewSubmission>[0];
  payload: ReviewSubmissionPayload;
};

export const manufacturerVerificationQueryKeys = {
  root: ['manufacturers', 'verification'] as const,
  status: (manufacturerId: string) =>
    [...manufacturerVerificationQueryKeys.root, 'status', manufacturerId] as const,
  detailedStatus: (manufacturerId: string) =>
    [...manufacturerVerificationQueryKeys.root, 'detailed-status', manufacturerId] as const,
  requirements: (plan?: string) =>
    [...manufacturerVerificationQueryKeys.root, 'requirements', plan ?? null] as const,
  eligibility: (manufacturerId: string) =>
    [...manufacturerVerificationQueryKeys.root, 'eligibility', manufacturerId] as const
};

export const manufacturerVerificationMutationKeys = {
  submitDocuments: [...manufacturerVerificationQueryKeys.root, 'submit-documents'] as const,
  reviewSubmission: [...manufacturerVerificationQueryKeys.root, 'review-submission'] as const
};

export const useManufacturerVerificationStatus = (
  manufacturerId: string,
  options?: QueryOptions<VerificationStatus>
): UseQueryResult<VerificationStatus, ApiError> => {
  return useQuery({
    queryKey: manufacturerVerificationQueryKeys.status(manufacturerId),
    queryFn: () => manufacturerVerificationApi.getStatus(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerDetailedVerificationStatus = (
  manufacturerId: string,
  options?: QueryOptions<DetailedVerificationStatus>
): UseQueryResult<DetailedVerificationStatus, ApiError> => {
  return useQuery({
    queryKey: manufacturerVerificationQueryKeys.detailedStatus(manufacturerId),
    queryFn: () => manufacturerVerificationApi.getDetailedStatus(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useSubmitManufacturerVerificationDocuments = (
  options?: MutationConfig<VerificationSubmissionResult, SubmitDocumentsVariables>
): UseMutationResult<
  VerificationSubmissionResult,
  ApiError,
  SubmitDocumentsVariables,
  unknown
> => {
  return useMutation({
    mutationKey: manufacturerVerificationMutationKeys.submitDocuments,
    mutationFn: ({ manufacturerId, file, metadata }) =>
      manufacturerVerificationApi.submitDocuments(manufacturerId, file, metadata),
    ...options
  });
};

export const useReviewManufacturerVerificationSubmission = (
  options?: MutationConfig<
    { success: boolean; status: 'approved' | 'rejected'; reviewedAt: string | Date; message: string },
    ReviewSubmissionVariables
  >
): UseMutationResult<
  { success: boolean; status: 'approved' | 'rejected'; reviewedAt: string | Date; message: string },
  ApiError,
  ReviewSubmissionVariables,
  unknown
> => {
  return useMutation({
    mutationKey: manufacturerVerificationMutationKeys.reviewSubmission,
    mutationFn: ({ manufacturerId, payload }) =>
      manufacturerVerificationApi.reviewSubmission(manufacturerId, payload),
    ...options
  });
};

export const useManufacturerVerificationRequirements = (
  plan?: string,
  options?: QueryOptions<VerificationRequirement[]>
): UseQueryResult<VerificationRequirement[], ApiError> => {
  return useQuery({
    queryKey: manufacturerVerificationQueryKeys.requirements(plan),
    queryFn: () => manufacturerVerificationApi.getRequirements(plan),
    ...options
  });
};

export const useManufacturerVerificationEligibility = (
  manufacturerId: string,
  options?: QueryOptions<VerificationEligibilityResult>
): UseQueryResult<VerificationEligibilityResult, ApiError> => {
  return useQuery({
    queryKey: manufacturerVerificationQueryKeys.eligibility(manufacturerId),
    queryFn: () => manufacturerVerificationApi.checkEligibility(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};
