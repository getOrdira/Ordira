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

import domainStorageApi, {
  type CountAllDomainsResponse,
  type CountDomainsResponse,
  type CreateDomainMappingPayload,
  type DeleteDomainResponse,
  type DomainListFilter,
  type DomainListResponse,
  type UpdateDomainMappingPayload
} from '@/lib/api/features/domains/domainStorage.api';
import type {
  DomainMappingRecord,
  ManagedCertificatePersistence
} from '@backend/services/domains/core/domainStorage.service';
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

type RecordManagedCertificateVariables = {
  domainId: string;
  payload: ManagedCertificatePersistence;
};

export const domainStorageQueryKeys = {
  root: ['domains', 'storage'] as const,
  list: (filter?: DomainListFilter) =>
    [...domainStorageQueryKeys.root, 'list', normalizeParams(filter)] as const,
  byId: (domainId: string) => [...domainStorageQueryKeys.root, 'id', domainId] as const,
  byDomain: (domain: string) => [...domainStorageQueryKeys.root, 'domain', domain] as const,
  count: () => [...domainStorageQueryKeys.root, 'count'] as const,
  countAll: (filter?: Record<string, unknown>) =>
    [...domainStorageQueryKeys.root, 'count-all', normalizeParams(filter)] as const
};

export const domainStorageMutationKeys = {
  create: [...domainStorageQueryKeys.root, 'create'] as const,
  update: [...domainStorageQueryKeys.root, 'update'] as const,
  delete: [...domainStorageQueryKeys.root, 'delete'] as const,
  recordCertificate: [...domainStorageQueryKeys.root, 'certificate', 'record'] as const,
  clearCertificate: [...domainStorageQueryKeys.root, 'certificate', 'clear'] as const
};

export const useDomainStorageList = (
  filter?: DomainListFilter,
  options?: QueryOptions<DomainListResponse>
): UseQueryResult<DomainListResponse, ApiError> => {
  return useQuery({
    queryKey: domainStorageQueryKeys.list(filter),
    queryFn: () => domainStorageApi.listDomains(filter),
    ...options
  });
};

export const useDomainStorageById = (
  domainId: string,
  options?: QueryOptions<DomainMappingRecord>
): UseQueryResult<DomainMappingRecord, ApiError> => {
  return useQuery({
    queryKey: domainStorageQueryKeys.byId(domainId),
    queryFn: () => domainStorageApi.getDomainById(domainId),
    enabled: Boolean(domainId) && (options?.enabled ?? true),
    ...options
  });
};

export const useDomainStorageByDomain = (
  domain: string,
  options?: QueryOptions<DomainMappingRecord>
): UseQueryResult<DomainMappingRecord, ApiError> => {
  return useQuery({
    queryKey: domainStorageQueryKeys.byDomain(domain),
    queryFn: () => domainStorageApi.getDomainByDomain(domain),
    enabled: Boolean(domain) && (options?.enabled ?? true),
    ...options
  });
};

export const useDomainStorageCount = (
  options?: QueryOptions<CountDomainsResponse>
): UseQueryResult<CountDomainsResponse, ApiError> => {
  return useQuery({
    queryKey: domainStorageQueryKeys.count(),
    queryFn: () => domainStorageApi.countDomains(),
    ...options
  });
};

export const useDomainStorageCountAll = (
  filter?: Record<string, unknown>,
  options?: QueryOptions<CountAllDomainsResponse>
): UseQueryResult<CountAllDomainsResponse, ApiError> => {
  return useQuery({
    queryKey: domainStorageQueryKeys.countAll(filter),
    queryFn: () => domainStorageApi.countAllDomains(filter),
    ...options
  });
};

export const useCreateDomainMapping = (
  options?: MutationConfig<DomainMappingRecord, CreateDomainMappingPayload>
): UseMutationResult<DomainMappingRecord, ApiError, CreateDomainMappingPayload, unknown> => {
  return useMutation({
    mutationKey: domainStorageMutationKeys.create,
    mutationFn: domainStorageApi.createDomainMapping,
    ...options
  });
};

type UpdateDomainMappingVariables = {
  domainId: string;
  updates: UpdateDomainMappingPayload;
};

export const useUpdateDomainMapping = (
  options?: MutationConfig<DomainMappingRecord, UpdateDomainMappingVariables>
): UseMutationResult<DomainMappingRecord, ApiError, UpdateDomainMappingVariables, unknown> => {
  return useMutation({
    mutationKey: domainStorageMutationKeys.update,
    mutationFn: ({ domainId, updates }) => domainStorageApi.updateDomainMapping(domainId, updates),
    ...options
  });
};

export const useDeleteDomainMapping = (
  options?: MutationConfig<DeleteDomainResponse, string>
): UseMutationResult<DeleteDomainResponse, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: domainStorageMutationKeys.delete,
    mutationFn: domainStorageApi.deleteDomainMapping,
    ...options
  });
};

export const useRecordManagedCertificate = (
  options?: MutationConfig<DomainMappingRecord, RecordManagedCertificateVariables>
): UseMutationResult<DomainMappingRecord, ApiError, RecordManagedCertificateVariables, unknown> => {
  return useMutation({
    mutationKey: domainStorageMutationKeys.recordCertificate,
    mutationFn: ({ domainId, payload }) =>
      domainStorageApi.recordManagedCertificate(domainId, payload),
    ...options
  });
};

export const useClearManagedCertificate = (
  options?: MutationConfig<DomainMappingRecord, string>
): UseMutationResult<DomainMappingRecord, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: domainStorageMutationKeys.clearCertificate,
    mutationFn: domainStorageApi.clearManagedCertificate,
    ...options
  });
};
