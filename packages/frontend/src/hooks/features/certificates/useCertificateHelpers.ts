'use client';

// src/hooks/features/certificates/useCertificateHelpers.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import certificateHelpersApi from '@/lib/api/features/certificates/certificateHelpers.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type OwnershipStatusResponse = Awaited<ReturnType<typeof certificateHelpersApi.getOwnershipStatus>>;
type TransferHealthResponse = Awaited<ReturnType<typeof certificateHelpersApi.getTransferHealth>>;
type TransferUsageParams = Parameters<typeof certificateHelpersApi.getTransferUsage>[0];
type TransferUsageResponse = Awaited<ReturnType<typeof certificateHelpersApi.getTransferUsage>>;
type TransferLimitsResponse = Awaited<ReturnType<typeof certificateHelpersApi.getTransferLimits>>;
type PlanLimitsResponse = Awaited<ReturnType<typeof certificateHelpersApi.getPlanLimits>>;
type CertificateNextStepsParams = Parameters<typeof certificateHelpersApi.getCertificateNextSteps>[0];
type NextStepsResponse = Awaited<ReturnType<typeof certificateHelpersApi.getCertificateNextSteps>>;
type TransferLimitsVariables = Parameters<typeof certificateHelpersApi.getTransferLimits>[0];
type PlanLimitsVariables = Parameters<typeof certificateHelpersApi.getPlanLimits>[0];
type OwnershipStatusVariables = Parameters<typeof certificateHelpersApi.getOwnershipStatus>[0];
type TransferHealthVariables = Parameters<typeof certificateHelpersApi.getTransferHealth>[0];

interface ValidateRecipientVariables {
  recipient: string;
  contactMethod: 'email' | 'sms' | 'wallet';
}

interface ProductOwnershipVariables {
  productId: string;
}

interface TransferUsageQueryOptions extends QueryOptions<TransferUsageResponse> {}

interface TransferLimitsQueryOptions extends QueryOptions<TransferLimitsResponse> {}

interface PlanLimitsQueryOptions extends QueryOptions<PlanLimitsResponse> {}

interface OwnershipStatusQueryOptions extends QueryOptions<OwnershipStatusResponse> {}

interface TransferHealthQueryOptions extends QueryOptions<TransferHealthResponse> {}

const certificateHelpersQueryKeys = {
  root: ['certificates', 'helpers'] as const,
  ownershipStatus: (certificateId: string) => [...certificateHelpersQueryKeys.root, 'ownership-status', certificateId] as const,
  transferHealth: (certificateId: string) => [...certificateHelpersQueryKeys.root, 'transfer-health', certificateId] as const,
  transferUsage: (params?: TransferUsageParams) => [...certificateHelpersQueryKeys.root, 'transfer-usage', params ?? null] as const,
  transferLimits: (plan: string) => [...certificateHelpersQueryKeys.root, 'transfer-limits', plan] as const,
  planLimits: (plan: string) => [...certificateHelpersQueryKeys.root, 'plan-limits', plan] as const
};

export const useCertificateOwnershipStatusHelper = (
  certificateId: OwnershipStatusVariables,
  options?: OwnershipStatusQueryOptions
): UseQueryResult<OwnershipStatusResponse, ApiError> => {
  return useQuery({
    queryKey: certificateHelpersQueryKeys.ownershipStatus(certificateId),
    queryFn: () => certificateHelpersApi.getOwnershipStatus(certificateId),
    enabled: Boolean(certificateId) && (options?.enabled ?? true),
    ...options
  });
};

export const useCertificateTransferHealthHelper = (
  certificateId: TransferHealthVariables,
  options?: TransferHealthQueryOptions
): UseQueryResult<TransferHealthResponse, ApiError> => {
  return useQuery({
    queryKey: certificateHelpersQueryKeys.transferHealth(certificateId),
    queryFn: () => certificateHelpersApi.getTransferHealth(certificateId),
    enabled: Boolean(certificateId) && (options?.enabled ?? true),
    ...options
  });
};

export const useTransferUsageHelper = (
  params?: TransferUsageParams,
  options?: TransferUsageQueryOptions
): UseQueryResult<TransferUsageResponse, ApiError> => {
  return useQuery({
    queryKey: certificateHelpersQueryKeys.transferUsage(params),
    queryFn: () => certificateHelpersApi.getTransferUsage(params),
    ...options
  });
};

export const useTransferLimitsHelper = (
  plan: TransferLimitsVariables,
  options?: TransferLimitsQueryOptions
): UseQueryResult<TransferLimitsResponse, ApiError> => {
  return useQuery({
    queryKey: certificateHelpersQueryKeys.transferLimits(plan),
    queryFn: () => certificateHelpersApi.getTransferLimits(plan),
    enabled: Boolean(plan) && (options?.enabled ?? true),
    ...options
  });
};

export const useCertificatePlanLimitsHelper = (
  plan: PlanLimitsVariables,
  options?: PlanLimitsQueryOptions
): UseQueryResult<PlanLimitsResponse, ApiError> => {
  return useQuery({
    queryKey: certificateHelpersQueryKeys.planLimits(plan),
    queryFn: () => certificateHelpersApi.getPlanLimits(plan),
    enabled: Boolean(plan) && (options?.enabled ?? true),
    ...options
  });
};

export const useValidateCertificateRecipient = (
  options?: MutationOptions<
    Awaited<ReturnType<typeof certificateHelpersApi.validateRecipient>>,
    ValidateRecipientVariables
  >
): UseMutationResult<
  Awaited<ReturnType<typeof certificateHelpersApi.validateRecipient>>,
  ApiError,
  ValidateRecipientVariables,
  unknown
> => {
  return useMutation({
    mutationKey: [...certificateHelpersQueryKeys.root, 'validate-recipient'],
    mutationFn: ({ recipient, contactMethod }) => certificateHelpersApi.validateRecipient(recipient, contactMethod),
    ...options
  });
};

export const useValidateProductOwnership = (
  options?: MutationOptions<
    Awaited<ReturnType<typeof certificateHelpersApi.validateProductOwnership>>,
    ProductOwnershipVariables
  >
): UseMutationResult<
  Awaited<ReturnType<typeof certificateHelpersApi.validateProductOwnership>>,
  ApiError,
  ProductOwnershipVariables,
  unknown
> => {
  return useMutation({
    mutationKey: [...certificateHelpersQueryKeys.root, 'validate-product-ownership'],
    mutationFn: ({ productId }) => certificateHelpersApi.validateProductOwnership(productId),
    ...options
  });
};

export const useCertificateNextSteps = (
  options?: MutationOptions<NextStepsResponse, CertificateNextStepsParams>
): UseMutationResult<NextStepsResponse, ApiError, CertificateNextStepsParams, unknown> => {
  return useMutation({
    mutationKey: [...certificateHelpersQueryKeys.root, 'next-steps'],
    mutationFn: certificateHelpersApi.getCertificateNextSteps,
    ...options
  });
};

export const useCalculateEstimatedGasCost = (
  options?: MutationOptions<
    Awaited<ReturnType<typeof certificateHelpersApi.calculateEstimatedGasCost>>,
    number
  >
): UseMutationResult<Awaited<ReturnType<typeof certificateHelpersApi.calculateEstimatedGasCost>>, ApiError, number, unknown> => {
  return useMutation({
    mutationKey: [...certificateHelpersQueryKeys.root, 'gas-cost'],
    mutationFn: certificateHelpersApi.calculateEstimatedGasCost,
    ...options
  });
};

export const useCalculateMonthlyGrowth = (
  options?: MutationOptions<
    Awaited<ReturnType<typeof certificateHelpersApi.calculateMonthlyGrowth>>,
    Parameters<typeof certificateHelpersApi.calculateMonthlyGrowth>[0]
  >
): UseMutationResult<
  Awaited<ReturnType<typeof certificateHelpersApi.calculateMonthlyGrowth>>,
  ApiError,
  Parameters<typeof certificateHelpersApi.calculateMonthlyGrowth>[0],
  unknown
> => {
  return useMutation({
    mutationKey: [...certificateHelpersQueryKeys.root, 'monthly-growth'],
    mutationFn: certificateHelpersApi.calculateMonthlyGrowth,
    ...options
  });
};

export const useGenerateWeb3Insights = (
  options?: MutationOptions<
    Awaited<ReturnType<typeof certificateHelpersApi.generateWeb3Insights>>,
    Parameters<typeof certificateHelpersApi.generateWeb3Insights>[0]
  >
): UseMutationResult<
  Awaited<ReturnType<typeof certificateHelpersApi.generateWeb3Insights>>,
  ApiError,
  Parameters<typeof certificateHelpersApi.generateWeb3Insights>[0],
  unknown
> => {
  return useMutation({
    mutationKey: [...certificateHelpersQueryKeys.root, 'web3-insights'],
    mutationFn: certificateHelpersApi.generateWeb3Insights,
    ...options
  });
};

export const useGenerateWeb3Recommendations = (
  options?: MutationOptions<
    Awaited<ReturnType<typeof certificateHelpersApi.generateWeb3Recommendations>>,
    Parameters<typeof certificateHelpersApi.generateWeb3Recommendations>[0]
  >
): UseMutationResult<
  Awaited<ReturnType<typeof certificateHelpersApi.generateWeb3Recommendations>>,
  ApiError,
  Parameters<typeof certificateHelpersApi.generateWeb3Recommendations>[0],
  unknown
> => {
  return useMutation({
    mutationKey: [...certificateHelpersQueryKeys.root, 'web3-recommendations'],
    mutationFn: certificateHelpersApi.generateWeb3Recommendations,
    ...options
  });
};
