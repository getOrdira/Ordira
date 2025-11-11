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

import domainRegistryApi, {
  type CertificateRequestOptions,
  type CountAllDomainsResponse,
  type CountDomainsResponse,
  type DeleteDomainResponse,
  type DomainListResponse,
  type RegisterDomainPayload,
  type UpdateDomainConfigurationPayload
} from '@/lib/api/features/domains/domainRegistry.api';
import type { DomainMappingRecord } from '@/lib/types/features/domains';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const normalizeParams = <T extends Record<string, unknown> | undefined>(params?: T) => {
  if (!params) {
    return null;
  }
  return Object.keys(params).length ? { ...params } : null;
};

type ManagedCertificateResult = Awaited<
  ReturnType<typeof domainRegistryApi.issueManagedCertificate>
>;

export const domainRegistryQueryKeys = {
  root: ['domains', 'registry'] as const,
  list: () => [...domainRegistryQueryKeys.root, 'list'] as const,
  count: () => [...domainRegistryQueryKeys.root, 'count'] as const,
  countAll: (filter?: Record<string, unknown>) =>
    [...domainRegistryQueryKeys.root, 'count-all', normalizeParams(filter)] as const,
  byName: (domain: string) => [...domainRegistryQueryKeys.root, 'domain', domain] as const,
  byId: (domainId: string) => [...domainRegistryQueryKeys.root, 'id', domainId] as const,
  certificate: (domainId: string) =>
    [...domainRegistryQueryKeys.root, 'certificate', domainId] as const
};

export const domainRegistryMutationKeys = {
  register: [...domainRegistryQueryKeys.root, 'register'] as const,
  update: [...domainRegistryQueryKeys.root, 'update'] as const,
  delete: [...domainRegistryQueryKeys.root, 'delete'] as const,
  issueCertificate: [...domainRegistryQueryKeys.root, 'certificate', 'issue'] as const,
  renewCertificate: [...domainRegistryQueryKeys.root, 'certificate', 'renew'] as const,
  revokeCertificate: [...domainRegistryQueryKeys.root, 'certificate', 'revoke'] as const
};

export const useDomainRegistryList = (
  options?: QueryOptions<DomainListResponse>
): UseQueryResult<DomainListResponse, ApiError> => {
  return useQuery({
    queryKey: domainRegistryQueryKeys.list(),
    queryFn: () => domainRegistryApi.listDomains(),
    ...options
  });
};

export const useDomainRegistryCount = (
  options?: QueryOptions<CountDomainsResponse>
): UseQueryResult<CountDomainsResponse, ApiError> => {
  return useQuery({
    queryKey: domainRegistryQueryKeys.count(),
    queryFn: () => domainRegistryApi.countDomains(),
    ...options
  });
};

export const useDomainRegistryCountAll = (
  filter?: Record<string, unknown>,
  options?: QueryOptions<CountAllDomainsResponse>
): UseQueryResult<CountAllDomainsResponse, ApiError> => {
  return useQuery({
    queryKey: domainRegistryQueryKeys.countAll(filter),
    queryFn: () => domainRegistryApi.countAllDomains(filter),
    ...options
  });
};

export const useDomainByName = (
  domain: string,
  options?: QueryOptions<DomainMappingRecord>
): UseQueryResult<DomainMappingRecord, ApiError> => {
  return useQuery({
    queryKey: domainRegistryQueryKeys.byName(domain),
    queryFn: () => domainRegistryApi.getDomainByName(domain),
    enabled: Boolean(domain) && (options?.enabled ?? true),
    ...options
  });
};

export const useDomainById = (
  domainId: string,
  options?: QueryOptions<DomainMappingRecord>
): UseQueryResult<DomainMappingRecord, ApiError> => {
  return useQuery({
    queryKey: domainRegistryQueryKeys.byId(domainId),
    queryFn: () => domainRegistryApi.getDomainById(domainId),
    enabled: Boolean(domainId) && (options?.enabled ?? true),
    ...options
  });
};

export const useManagedDomainCertificate = (
  domainId: string,
  options?: QueryOptions<Awaited<ReturnType<typeof domainRegistryApi.getManagedCertificate>>>
): UseQueryResult<
  Awaited<ReturnType<typeof domainRegistryApi.getManagedCertificate>>,
  ApiError
> => {
  return useQuery({
    queryKey: domainRegistryQueryKeys.certificate(domainId),
    queryFn: () => domainRegistryApi.getManagedCertificate(domainId),
    enabled: Boolean(domainId) && (options?.enabled ?? true),
    ...options
  });
};

export const useRegisterDomain = (
  options?: MutationConfig<DomainMappingRecord, RegisterDomainPayload>
): UseMutationResult<DomainMappingRecord, ApiError, RegisterDomainPayload, unknown> => {
  return useMutation({
    mutationKey: domainRegistryMutationKeys.register,
    mutationFn: domainRegistryApi.registerDomain,
    ...options
  });
};

type UpdateDomainVariables = {
  domainId: string;
  updates: UpdateDomainConfigurationPayload;
};

export const useUpdateDomainConfiguration = (
  options?: MutationConfig<DomainMappingRecord, UpdateDomainVariables>
): UseMutationResult<DomainMappingRecord, ApiError, UpdateDomainVariables, unknown> => {
  return useMutation({
    mutationKey: domainRegistryMutationKeys.update,
    mutationFn: ({ domainId, updates }) =>
      domainRegistryApi.updateDomainConfiguration(domainId, updates),
    ...options
  });
};

export const useDeleteDomain = (
  options?: MutationConfig<DeleteDomainResponse, string>
): UseMutationResult<DeleteDomainResponse, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: domainRegistryMutationKeys.delete,
    mutationFn: domainRegistryApi.deleteDomain,
    ...options
  });
};

type CertificateRequestVariables = {
  domainId: string;
  options?: CertificateRequestOptions;
};

export const useIssueManagedDomainCertificate = (
  options?: MutationConfig<ManagedCertificateResult, CertificateRequestVariables>
): UseMutationResult<ManagedCertificateResult, ApiError, CertificateRequestVariables, unknown> => {
  return useMutation({
    mutationKey: domainRegistryMutationKeys.issueCertificate,
    mutationFn: ({ domainId, options: requestOptions }) =>
      domainRegistryApi.issueManagedCertificate(domainId, requestOptions),
    ...options
  });
};

export const useRenewManagedDomainCertificate = (
  options?: MutationConfig<ManagedCertificateResult, CertificateRequestVariables>
): UseMutationResult<ManagedCertificateResult, ApiError, CertificateRequestVariables, unknown> => {
  return useMutation({
    mutationKey: domainRegistryMutationKeys.renewCertificate,
    mutationFn: ({ domainId, options: requestOptions }) =>
      domainRegistryApi.renewManagedCertificate(domainId, requestOptions),
    ...options
  });
};

export const useRevokeManagedDomainCertificate = (
  options?: MutationConfig<DomainMappingRecord, string>
): UseMutationResult<DomainMappingRecord, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: domainRegistryMutationKeys.revokeCertificate,
    mutationFn: domainRegistryApi.revokeManagedCertificate,
    ...options
  });
};
