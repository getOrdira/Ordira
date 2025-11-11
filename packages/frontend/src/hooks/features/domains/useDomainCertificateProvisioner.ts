'use client';

// src/hooks/features/domains/useDomainCertificateProvisioner.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import domainCertificateProvisionerApi, {
  type CertificateInfoResponse,
  type CertificateListResponse,
  type CertificateProvisionPayload,
  type CertificateProvisionResponse,
  type CertificateRevocationResponse
} from '@/lib/api/features/domains/domainCertificateProvisioner.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const domainCertificateProvisionerQueryKeys = {
  root: ['domains', 'certificate-provisioner'] as const,
  list: () => [...domainCertificateProvisionerQueryKeys.root, 'list'] as const,
  info: (hostname: string) =>
    [...domainCertificateProvisionerQueryKeys.root, 'info', hostname] as const
};

export const domainCertificateProvisionerMutationKeys = {
  provision: [...domainCertificateProvisionerQueryKeys.root, 'provision'] as const,
  renew: [...domainCertificateProvisionerQueryKeys.root, 'renew'] as const,
  revoke: [...domainCertificateProvisionerQueryKeys.root, 'revoke'] as const
};

export const useProvisionedCertificates = (
  options?: QueryOptions<CertificateListResponse>
): UseQueryResult<CertificateListResponse, ApiError> => {
  return useQuery({
    queryKey: domainCertificateProvisionerQueryKeys.list(),
    queryFn: () => domainCertificateProvisionerApi.listCertificates(),
    ...options
  });
};

export const useCertificateInfo = (
  hostname: string,
  options?: QueryOptions<CertificateInfoResponse>
): UseQueryResult<CertificateInfoResponse, ApiError> => {
  return useQuery({
    queryKey: domainCertificateProvisionerQueryKeys.info(hostname),
    queryFn: () => domainCertificateProvisionerApi.getCertificateInfo(hostname),
    enabled: Boolean(hostname) && (options?.enabled ?? true),
    ...options
  });
};

export const useProvisionDomainCertificate = (
  options?: MutationConfig<CertificateProvisionResponse, CertificateProvisionPayload>
): UseMutationResult<
  CertificateProvisionResponse,
  ApiError,
  CertificateProvisionPayload,
  unknown
> => {
  return useMutation({
    mutationKey: domainCertificateProvisionerMutationKeys.provision,
    mutationFn: domainCertificateProvisionerApi.provisionCertificate,
    ...options
  });
};

export const useRenewDomainCertificate = (
  options?: MutationConfig<CertificateProvisionResponse, CertificateProvisionPayload>
): UseMutationResult<
  CertificateProvisionResponse,
  ApiError,
  CertificateProvisionPayload,
  unknown
> => {
  return useMutation({
    mutationKey: domainCertificateProvisionerMutationKeys.renew,
    mutationFn: domainCertificateProvisionerApi.renewCertificate,
    ...options
  });
};

export const useRevokeDomainCertificate = (
  options?: MutationConfig<CertificateRevocationResponse, CertificateProvisionPayload>
): UseMutationResult<
  CertificateRevocationResponse,
  ApiError,
  CertificateProvisionPayload,
  unknown
> => {
  return useMutation({
    mutationKey: domainCertificateProvisionerMutationKeys.revoke,
    mutationFn: domainCertificateProvisionerApi.revokeCertificate,
    ...options
  });
};
