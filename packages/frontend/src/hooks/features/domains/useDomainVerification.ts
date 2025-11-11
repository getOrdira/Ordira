'use client';

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import domainVerificationApi, {
  type MarkVerifiedOptions,
  type MarkVerifiedResponse,
  type ScheduleRecheckOptions,
  type ScheduleRecheckResponse,
  type VerificationRequestOptions,
  type VerifyDomainOptions
} from '@/lib/api/features/domains/domainVerification.api';
import type {
  VerificationResult,
  VerificationStatus
} from '@backend/services/domains/features/domainVerification.service';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type VerificationMutationVariables = {
  domainId: string;
  options?: VerificationRequestOptions;
};

type VerifyDomainVariables = {
  domainId: string;
  options?: VerifyDomainOptions;
};

type MarkVerifiedVariables = {
  domainId: string;
  options?: MarkVerifiedOptions;
};

type ScheduleRecheckVariables = {
  domainId: string;
  options?: ScheduleRecheckOptions;
};

export const domainVerificationQueryKeys = {
  root: ['domains', 'verification'] as const,
  status: (domainId: string) =>
    [...domainVerificationQueryKeys.root, 'status', domainId] as const
};

export const domainVerificationMutationKeys = {
  initiate: [...domainVerificationQueryKeys.root, 'initiate'] as const,
  verify: [...domainVerificationQueryKeys.root, 'verify'] as const,
  markVerified: [...domainVerificationQueryKeys.root, 'mark-verified'] as const,
  scheduleRecheck: [...domainVerificationQueryKeys.root, 'schedule-recheck'] as const
};

export const useDomainVerificationStatus = (
  domainId: string,
  options?: QueryOptions<VerificationStatus>
): UseQueryResult<VerificationStatus, ApiError> => {
  return useQuery({
    queryKey: domainVerificationQueryKeys.status(domainId),
    queryFn: () => domainVerificationApi.getVerificationStatus(domainId),
    enabled: Boolean(domainId) && (options?.enabled ?? true),
    ...options
  });
};

export const useInitiateDomainVerification = (
  options?: MutationConfig<VerificationStatus, VerificationMutationVariables>
): UseMutationResult<VerificationStatus, ApiError, VerificationMutationVariables, unknown> => {
  return useMutation({
    mutationKey: domainVerificationMutationKeys.initiate,
    mutationFn: ({ domainId, options: requestOptions }) =>
      domainVerificationApi.initiateVerification(domainId, requestOptions),
    ...options
  });
};

export const useVerifyDomainConfiguration = (
  options?: MutationConfig<VerificationResult, VerifyDomainVariables>
): UseMutationResult<VerificationResult, ApiError, VerifyDomainVariables, unknown> => {
  return useMutation({
    mutationKey: domainVerificationMutationKeys.verify,
    mutationFn: ({ domainId, options: verifyOptions }) =>
      domainVerificationApi.verifyDomain(domainId, verifyOptions),
    ...options
  });
};

export const useMarkDomainVerified = (
  options?: MutationConfig<MarkVerifiedResponse, MarkVerifiedVariables>
): UseMutationResult<MarkVerifiedResponse, ApiError, MarkVerifiedVariables, unknown> => {
  return useMutation({
    mutationKey: domainVerificationMutationKeys.markVerified,
    mutationFn: ({ domainId, options: markOptions }) =>
      domainVerificationApi.markVerified(domainId, markOptions),
    ...options
  });
};

export const useScheduleDomainVerificationRecheck = (
  options?: MutationConfig<ScheduleRecheckResponse, ScheduleRecheckVariables>
): UseMutationResult<
  ScheduleRecheckResponse,
  ApiError,
  ScheduleRecheckVariables,
  unknown
> => {
  return useMutation({
    mutationKey: domainVerificationMutationKeys.scheduleRecheck,
    mutationFn: ({ domainId, options: recheckOptions }) =>
      domainVerificationApi.scheduleVerificationRecheck(domainId, recheckOptions),
    ...options
  });
};
