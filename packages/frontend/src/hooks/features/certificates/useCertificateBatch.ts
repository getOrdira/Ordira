'use client';

// src/hooks/features/certificates/useCertificateBatch.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import certificateBatchApi, {
  type BatchCreateJobPayload,
  type CalculateDurationPayload
} from '@/lib/api/features/certificates/certificateBatch.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type BatchProgressResponse = Awaited<ReturnType<typeof certificateBatchApi.getBatchProgress>>;
type ActiveJobsResponse = Awaited<ReturnType<typeof certificateBatchApi.getActiveBatchJobs>>;
type BatchStatsResponse = Awaited<ReturnType<typeof certificateBatchApi.getBatchJobStatistics>>;
type BatchLimitsResponse = Awaited<ReturnType<typeof certificateBatchApi.getBatchLimits>>;
type BatchPriorityResponse = Awaited<ReturnType<typeof certificateBatchApi.determineBatchPriority>>;
type CreateBatchJobResponse = Awaited<ReturnType<typeof certificateBatchApi.createBatchJob>>;
type CancelBatchJobResponse = Awaited<ReturnType<typeof certificateBatchApi.cancelBatchJob>>;
type RetryBatchResponse = Awaited<ReturnType<typeof certificateBatchApi.retryFailedBatchItems>>;
type CalculateDurationResponse = Awaited<ReturnType<typeof certificateBatchApi.calculateBatchDuration>>;

const certificateBatchQueryKeys = {
  root: ['certificates', 'batch'] as const,
  progress: (batchId: string) => [...certificateBatchQueryKeys.root, 'progress', batchId] as const,
  activeJobs: () => [...certificateBatchQueryKeys.root, 'active'] as const,
  statistics: () => [...certificateBatchQueryKeys.root, 'statistics'] as const,
  limits: (plan: string) => [...certificateBatchQueryKeys.root, 'limits', plan] as const,
  priority: (plan?: string) => [...certificateBatchQueryKeys.root, 'priority', plan ?? null] as const
};

export const useBatchProgress = (
  batchId: string,
  options?: QueryOptions<BatchProgressResponse>
): UseQueryResult<BatchProgressResponse, ApiError> => {
  return useQuery({
    queryKey: certificateBatchQueryKeys.progress(batchId),
    queryFn: () => certificateBatchApi.getBatchProgress(batchId),
    enabled: Boolean(batchId) && (options?.enabled ?? true),
    ...options
  });
};

export const useActiveBatchJobs = (
  options?: QueryOptions<ActiveJobsResponse>
): UseQueryResult<ActiveJobsResponse, ApiError> => {
  return useQuery({
    queryKey: certificateBatchQueryKeys.activeJobs(),
    queryFn: () => certificateBatchApi.getActiveBatchJobs(),
    ...options
  });
};

export const useBatchJobStatistics = (
  options?: QueryOptions<BatchStatsResponse>
): UseQueryResult<BatchStatsResponse, ApiError> => {
  return useQuery({
    queryKey: certificateBatchQueryKeys.statistics(),
    queryFn: () => certificateBatchApi.getBatchJobStatistics(),
    ...options
  });
};

export const useBatchLimits = (
  plan: string,
  options?: QueryOptions<BatchLimitsResponse>
): UseQueryResult<BatchLimitsResponse, ApiError> => {
  return useQuery({
    queryKey: certificateBatchQueryKeys.limits(plan),
    queryFn: () => certificateBatchApi.getBatchLimits(plan),
    enabled: Boolean(plan) && (options?.enabled ?? true),
    ...options
  });
};

export const useBatchPriority = (
  plan?: string,
  options?: QueryOptions<BatchPriorityResponse>
): UseQueryResult<BatchPriorityResponse, ApiError> => {
  return useQuery({
    queryKey: certificateBatchQueryKeys.priority(plan),
    queryFn: () => certificateBatchApi.determineBatchPriority(plan),
    ...options
  });
};

export const useCreateBatchCertificateJob = (
  options?: MutationOptions<CreateBatchJobResponse, BatchCreateJobPayload>
): UseMutationResult<CreateBatchJobResponse, ApiError, BatchCreateJobPayload, unknown> => {
  return useMutation({
    mutationKey: [...certificateBatchQueryKeys.root, 'create'],
    mutationFn: certificateBatchApi.createBatchJob,
    ...options
  });
};

export const useCancelBatchJob = (
  options?: MutationOptions<CancelBatchJobResponse, string>
): UseMutationResult<CancelBatchJobResponse, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: [...certificateBatchQueryKeys.root, 'cancel'],
    mutationFn: certificateBatchApi.cancelBatchJob,
    ...options
  });
};

export const useRetryFailedBatchItems = (
  options?: MutationOptions<RetryBatchResponse, string>
): UseMutationResult<RetryBatchResponse, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: [...certificateBatchQueryKeys.root, 'retry'],
    mutationFn: certificateBatchApi.retryFailedBatchItems,
    ...options
  });
};

export const useCalculateBatchDuration = (
  options?: MutationOptions<CalculateDurationResponse, CalculateDurationPayload>
): UseMutationResult<CalculateDurationResponse, ApiError, CalculateDurationPayload, unknown> => {
  return useMutation({
    mutationKey: [...certificateBatchQueryKeys.root, 'calculate-duration'],
    mutationFn: certificateBatchApi.calculateBatchDuration,
    ...options
  });
};
