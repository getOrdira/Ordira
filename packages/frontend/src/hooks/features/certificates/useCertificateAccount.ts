'use client';

// src/hooks/features/certificates/useCertificateAccount.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import certificateAccountApi from '@/lib/api/features/certificates/certificateAccount.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type StatsParams = Parameters<typeof certificateAccountApi.getCertificateStats>[0];
type StatsResponse = Awaited<ReturnType<typeof certificateAccountApi.getCertificateStats>>;
type UsageParams = Parameters<typeof certificateAccountApi.getCertificateUsage>[0];
type UsageResponse = Awaited<ReturnType<typeof certificateAccountApi.getCertificateUsage>>;
type TransferUsageParams = Parameters<typeof certificateAccountApi.getTransferUsage>[0];
type TransferUsageResponse = Awaited<ReturnType<typeof certificateAccountApi.getTransferUsage>>;
type DistributionParams = Parameters<typeof certificateAccountApi.getCertificateDistribution>[0];
type DistributionResponse = Awaited<ReturnType<typeof certificateAccountApi.getCertificateDistribution>>;
type TrendParams = Parameters<typeof certificateAccountApi.getMonthlyCertificateTrends>[0];
type TrendResponse = Awaited<ReturnType<typeof certificateAccountApi.getMonthlyCertificateTrends>>;
type PlanLimitParams = Parameters<typeof certificateAccountApi.checkPlanLimits>[0];
type PlanLimitResponse = Awaited<ReturnType<typeof certificateAccountApi.checkPlanLimits>>;
type SuccessRateParams = Parameters<typeof certificateAccountApi.getSuccessRate>[0];
type SuccessRateResponse = Awaited<ReturnType<typeof certificateAccountApi.getSuccessRate>>;
type TransferStatisticsParams = Parameters<typeof certificateAccountApi.getTransferStatistics>[0];
type TransferStatisticsResponse = Awaited<ReturnType<typeof certificateAccountApi.getTransferStatistics>>;
type OwnershipParams = Parameters<typeof certificateAccountApi.getOwnershipStatus>[0];
type OwnershipResponse = Awaited<ReturnType<typeof certificateAccountApi.getOwnershipStatus>>;
type TransferHealthParams = Parameters<typeof certificateAccountApi.getTransferHealth>[0];
type TransferHealthResponse = Awaited<ReturnType<typeof certificateAccountApi.getTransferHealth>>;

const certificateAccountQueryKeys = {
  root: ['certificates', 'account'] as const,
  stats: (params?: StatsParams) => [...certificateAccountQueryKeys.root, 'stats', params ?? null] as const,
  usage: (params?: UsageParams) => [...certificateAccountQueryKeys.root, 'usage', params ?? null] as const,
  transferUsage: (params?: TransferUsageParams) =>
    [...certificateAccountQueryKeys.root, 'transfer-usage', params ?? null] as const,
  distribution: (params?: DistributionParams) =>
    [...certificateAccountQueryKeys.root, 'distribution', params ?? null] as const,
  trends: (params?: TrendParams) =>
    [...certificateAccountQueryKeys.root, 'trends', params ?? null] as const,
  products: () => [...certificateAccountQueryKeys.root, 'products'] as const,
  planLimits: (params?: PlanLimitParams) =>
    [...certificateAccountQueryKeys.root, 'plan-limits', params ?? null] as const,
  avgProcessingTime: () => [...certificateAccountQueryKeys.root, 'avg-processing-time'] as const,
  successRate: (params?: SuccessRateParams) =>
    [...certificateAccountQueryKeys.root, 'success-rate', params ?? null] as const,
  transferStatistics: (params?: TransferStatisticsParams) =>
    [...certificateAccountQueryKeys.root, 'transfer-statistics', params ?? null] as const,
  globalAnalytics: () => [...certificateAccountQueryKeys.root, 'global-analytics'] as const,
  ownershipStatus: (certificateId: OwnershipParams) =>
    [...certificateAccountQueryKeys.root, 'ownership-status', certificateId] as const,
  transferHealth: (certificateId: TransferHealthParams) =>
    [...certificateAccountQueryKeys.root, 'transfer-health', certificateId] as const
};

export const useCertificateStats = (
  params?: StatsParams,
  options?: QueryOptions<StatsResponse>
): UseQueryResult<StatsResponse, ApiError> => {
  return useQuery({
    queryKey: certificateAccountQueryKeys.stats(params),
    queryFn: () => certificateAccountApi.getCertificateStats(params),
    ...options
  });
};

export const useCertificateUsage = (
  params?: UsageParams,
  options?: QueryOptions<UsageResponse>
): UseQueryResult<UsageResponse, ApiError> => {
  return useQuery({
    queryKey: certificateAccountQueryKeys.usage(params),
    queryFn: () => certificateAccountApi.getCertificateUsage(params),
    ...options
  });
};

export const useCertificateTransferUsage = (
  params?: TransferUsageParams,
  options?: QueryOptions<TransferUsageResponse>
): UseQueryResult<TransferUsageResponse, ApiError> => {
  return useQuery({
    queryKey: certificateAccountQueryKeys.transferUsage(params),
    queryFn: () => certificateAccountApi.getTransferUsage(params),
    ...options
  });
};

export const useCertificateDistribution = (
  params?: DistributionParams,
  options?: QueryOptions<DistributionResponse>
): UseQueryResult<DistributionResponse, ApiError> => {
  return useQuery({
    queryKey: certificateAccountQueryKeys.distribution(params),
    queryFn: () => certificateAccountApi.getCertificateDistribution(params),
    ...options
  });
};

export const useMonthlyCertificateTrends = (
  params?: TrendParams,
  options?: QueryOptions<TrendResponse>
): UseQueryResult<TrendResponse, ApiError> => {
  return useQuery({
    queryKey: certificateAccountQueryKeys.trends(params),
    queryFn: () => certificateAccountApi.getMonthlyCertificateTrends(params),
    ...options
  });
};

export const useCertificatesByProductSummary = (
  options?: QueryOptions<Awaited<ReturnType<typeof certificateAccountApi.getCertificatesByProduct>>>
): UseQueryResult<Awaited<ReturnType<typeof certificateAccountApi.getCertificatesByProduct>>, ApiError> => {
  return useQuery({
    queryKey: certificateAccountQueryKeys.products(),
    queryFn: () => certificateAccountApi.getCertificatesByProduct(),
    ...options
  });
};

export const useCertificatePlanLimits = (
  params?: PlanLimitParams,
  options?: QueryOptions<PlanLimitResponse>
): UseQueryResult<PlanLimitResponse, ApiError> => {
  return useQuery({
    queryKey: certificateAccountQueryKeys.planLimits(params),
    queryFn: () => certificateAccountApi.checkPlanLimits(params),
    ...options
  });
};

export const useAverageCertificateProcessingTime = (
  options?: QueryOptions<Awaited<ReturnType<typeof certificateAccountApi.getAverageProcessingTime>>>
): UseQueryResult<Awaited<ReturnType<typeof certificateAccountApi.getAverageProcessingTime>>, ApiError> => {
  return useQuery({
    queryKey: certificateAccountQueryKeys.avgProcessingTime(),
    queryFn: () => certificateAccountApi.getAverageProcessingTime(),
    ...options
  });
};

export const useCertificateSuccessRate = (
  params?: SuccessRateParams,
  options?: QueryOptions<SuccessRateResponse>
): UseQueryResult<SuccessRateResponse, ApiError> => {
  return useQuery({
    queryKey: certificateAccountQueryKeys.successRate(params),
    queryFn: () => certificateAccountApi.getSuccessRate(params),
    ...options
  });
};

export const useCertificateTransferStatistics = (
  params?: TransferStatisticsParams,
  options?: QueryOptions<TransferStatisticsResponse>
): UseQueryResult<TransferStatisticsResponse, ApiError> => {
  return useQuery({
    queryKey: certificateAccountQueryKeys.transferStatistics(params),
    queryFn: () => certificateAccountApi.getTransferStatistics(params),
    ...options
  });
};

export const useGlobalTransferAnalytics = (
  options?: QueryOptions<Awaited<ReturnType<typeof certificateAccountApi.getGlobalTransferAnalytics>>>
): UseQueryResult<Awaited<ReturnType<typeof certificateAccountApi.getGlobalTransferAnalytics>>, ApiError> => {
  return useQuery({
    queryKey: certificateAccountQueryKeys.globalAnalytics(),
    queryFn: () => certificateAccountApi.getGlobalTransferAnalytics(),
    ...options
  });
};

export const useCertificateOwnershipStatus = (
  certificateId: OwnershipParams,
  options?: QueryOptions<OwnershipResponse>
): UseQueryResult<OwnershipResponse, ApiError> => {
  return useQuery({
    queryKey: certificateAccountQueryKeys.ownershipStatus(certificateId),
    queryFn: () => certificateAccountApi.getOwnershipStatus(certificateId),
    enabled: Boolean(certificateId) && (options?.enabled ?? true),
    ...options
  });
};

export const useCertificateTransferHealth = (
  certificateId: TransferHealthParams,
  options?: QueryOptions<TransferHealthResponse>
): UseQueryResult<TransferHealthResponse, ApiError> => {
  return useQuery({
    queryKey: certificateAccountQueryKeys.transferHealth(certificateId),
    queryFn: () => certificateAccountApi.getTransferHealth(certificateId),
    enabled: Boolean(certificateId) && (options?.enabled ?? true),
    ...options
  });
};
