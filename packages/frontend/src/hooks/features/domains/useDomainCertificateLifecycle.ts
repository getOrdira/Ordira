'use client';

// src/hooks/features/domains/useDomainCertificateLifecycle.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import domainCertificateLifecycleApi, {
  type CertificateSummary,
  type LifecycleRequestOptions
} from '@/lib/api/features/domains/domainCertificateLifecycle.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type LifecycleResult = Awaited<
  ReturnType<typeof domainCertificateLifecycleApi.issueManagedCertificate>
>;
type DomainRecord = Awaited<
  ReturnType<typeof domainCertificateLifecycleApi.revokeManagedCertificate>
>;
type AutoRenewalSchedule = Awaited<
  ReturnType<typeof domainCertificateLifecycleApi.scheduleAutoRenewal>
>;

type LifecycleMutationVariables = {
  domainId: string;
  options?: LifecycleRequestOptions;
};

type AutoRenewalVariables = {
  domainId: string;
  daysBeforeExpiry?: number;
};

export const domainCertificateLifecycleQueryKeys = {
  root: ['domains', 'certificate-lifecycle'] as const,
  summary: (domainId: string) =>
    [...domainCertificateLifecycleQueryKeys.root, 'summary', domainId] as const
};

export const domainCertificateLifecycleMutationKeys = {
  issue: [...domainCertificateLifecycleQueryKeys.root, 'issue'] as const,
  renew: [...domainCertificateLifecycleQueryKeys.root, 'renew'] as const,
  revoke: [...domainCertificateLifecycleQueryKeys.root, 'revoke'] as const,
  autoRenewal: [...domainCertificateLifecycleQueryKeys.root, 'auto-renewal'] as const
};

export const useDomainCertificateSummary = (
  domainId: string,
  options?: QueryOptions<CertificateSummary>
): UseQueryResult<CertificateSummary, ApiError> => {
  return useQuery({
    queryKey: domainCertificateLifecycleQueryKeys.summary(domainId),
    queryFn: () => domainCertificateLifecycleApi.getCertificateSummary(domainId),
    enabled: Boolean(domainId) && (options?.enabled ?? true),
    ...options
  });
};

export const useIssueManagedCertificate = (
  options?: MutationConfig<LifecycleResult, LifecycleMutationVariables>
): UseMutationResult<LifecycleResult, ApiError, LifecycleMutationVariables, unknown> => {
  return useMutation({
    mutationKey: domainCertificateLifecycleMutationKeys.issue,
    mutationFn: ({ domainId, options: requestOptions }) =>
      domainCertificateLifecycleApi.issueManagedCertificate(domainId, requestOptions),
    ...options
  });
};

export const useRenewManagedCertificate = (
  options?: MutationConfig<LifecycleResult, LifecycleMutationVariables>
): UseMutationResult<LifecycleResult, ApiError, LifecycleMutationVariables, unknown> => {
  return useMutation({
    mutationKey: domainCertificateLifecycleMutationKeys.renew,
    mutationFn: ({ domainId, options: requestOptions }) =>
      domainCertificateLifecycleApi.renewManagedCertificate(domainId, requestOptions),
    ...options
  });
};

export const useRevokeManagedCertificate = (
  options?: MutationConfig<DomainRecord, string>
): UseMutationResult<DomainRecord, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: domainCertificateLifecycleMutationKeys.revoke,
    mutationFn: domainCertificateLifecycleApi.revokeManagedCertificate,
    ...options
  });
};

export const useScheduleCertificateAutoRenewal = (
  options?: MutationConfig<AutoRenewalSchedule, AutoRenewalVariables>
): UseMutationResult<AutoRenewalSchedule, ApiError, AutoRenewalVariables, unknown> => {
  return useMutation({
    mutationKey: domainCertificateLifecycleMutationKeys.autoRenewal,
    mutationFn: ({ domainId, daysBeforeExpiry }) =>
      domainCertificateLifecycleApi.scheduleAutoRenewal(domainId, daysBeforeExpiry),
    ...options
  });
};
