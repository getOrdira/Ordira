'use client';

// src/hooks/features/certificates/useCertificateData.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import certificateDataApi, {
  type CertificateListParams,
  type CertificateStatusPayload,
  type CertificateUpdatePayload
} from '@/lib/api/features/certificates/certificateData.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type CertificateListResponse = Awaited<ReturnType<typeof certificateDataApi.listCertificates>>;
type CertificateDetailResponse = Awaited<ReturnType<typeof certificateDataApi.getCertificate>>;
type CertificateUpdateResponse = Awaited<ReturnType<typeof certificateDataApi.updateCertificate>>;
type CertificateDeleteResponse = Awaited<ReturnType<typeof certificateDataApi.deleteCertificate>>;
type BulkUpdateResponse = Awaited<ReturnType<typeof certificateDataApi.bulkUpdateCertificates>>;
type StatusUpdateResponse = Awaited<ReturnType<typeof certificateDataApi.updateCertificateStatus>>;
type StatusCountsResponse = Awaited<ReturnType<typeof certificateDataApi.getCertificateCountByStatus>>;
type DateRangeParams = Parameters<typeof certificateDataApi.getCertificatesInDateRange>[0];
type DateRangeResponse = Awaited<ReturnType<typeof certificateDataApi.getCertificatesInDateRange>>;
type LimitedListResponse = Awaited<ReturnType<typeof certificateDataApi.getFailedTransferCertificates>>;
type PendingListResponse = Awaited<ReturnType<typeof certificateDataApi.getPendingTransferCertificates>>;
type ProductListParams = Parameters<typeof certificateDataApi.getCertificatesByProduct>[1];
type ProductListResponse = Awaited<ReturnType<typeof certificateDataApi.getCertificatesByProduct>>;
type RecipientListParams = Parameters<typeof certificateDataApi.getCertificatesByRecipient>[1];
type RecipientListResponse = Awaited<ReturnType<typeof certificateDataApi.getCertificatesByRecipient>>;
type BatchListResponse = Awaited<ReturnType<typeof certificateDataApi.getCertificatesByBatch>>;
type SearchResponse = Awaited<ReturnType<typeof certificateDataApi.searchCertificates>>;

interface UpdateCertificateVariables {
  certificateId: string;
  updates: CertificateUpdatePayload;
}

interface BulkUpdateVariables {
  certificateIds: string[];
  updates: Record<string, unknown>;
}

interface UpdateCertificateStatusVariables {
  certificateId: string;
  payload: CertificateStatusPayload;
}

const certificateDataQueryKeys = {
  root: ['certificates', 'data'] as const,
  list: (params?: CertificateListParams) => [...certificateDataQueryKeys.root, 'list', params ?? null] as const,
  detail: (certificateId: string) => [...certificateDataQueryKeys.root, 'detail', certificateId] as const,
  counts: () => [...certificateDataQueryKeys.root, 'counts'] as const,
  dateRange: (params?: DateRangeParams) => [...certificateDataQueryKeys.root, 'date-range', params ?? null] as const,
  failedTransfers: (limit?: number) => [...certificateDataQueryKeys.root, 'failed-transfers', limit ?? null] as const,
  pendingTransfers: (limit?: number) => [...certificateDataQueryKeys.root, 'pending-transfers', limit ?? null] as const,
  product: (productId: string, params?: ProductListParams) =>
    [...certificateDataQueryKeys.root, 'product', productId, params ?? null] as const,
  recipient: (recipient: string, params?: RecipientListParams) =>
    [...certificateDataQueryKeys.root, 'recipient', recipient, params ?? null] as const,
  batch: (batchId: string) => [...certificateDataQueryKeys.root, 'batch', batchId] as const,
  search: (term: string, limit?: number) => [...certificateDataQueryKeys.root, 'search', term, limit ?? null] as const
};

export const useCertificateList = (
  params?: CertificateListParams,
  options?: QueryOptions<CertificateListResponse>
): UseQueryResult<CertificateListResponse, ApiError> => {
  return useQuery({
    queryKey: certificateDataQueryKeys.list(params),
    queryFn: () => certificateDataApi.listCertificates(params),
    ...options
  });
};

export const useCertificateDetail = (
  certificateId: string,
  options?: QueryOptions<CertificateDetailResponse>
): UseQueryResult<CertificateDetailResponse, ApiError> => {
  return useQuery({
    queryKey: certificateDataQueryKeys.detail(certificateId),
    queryFn: () => certificateDataApi.getCertificate(certificateId),
    enabled: Boolean(certificateId) && (options?.enabled ?? true),
    ...options
  });
};

export const useCertificateStatusCounts = (
  options?: QueryOptions<StatusCountsResponse>
): UseQueryResult<StatusCountsResponse, ApiError> => {
  return useQuery({
    queryKey: certificateDataQueryKeys.counts(),
    queryFn: () => certificateDataApi.getCertificateCountByStatus(),
    ...options
  });
};

export const useCertificatesByDateRange = (
  params?: DateRangeParams,
  options?: QueryOptions<DateRangeResponse>
): UseQueryResult<DateRangeResponse, ApiError> => {
  return useQuery({
    queryKey: certificateDataQueryKeys.dateRange(params),
    queryFn: () => certificateDataApi.getCertificatesInDateRange(params),
    ...options
  });
};

export const useFailedTransferCertificates = (
  limit?: number,
  options?: QueryOptions<LimitedListResponse>
): UseQueryResult<LimitedListResponse, ApiError> => {
  return useQuery({
    queryKey: certificateDataQueryKeys.failedTransfers(limit),
    queryFn: () => certificateDataApi.getFailedTransferCertificates(limit),
    ...options
  });
};

export const usePendingTransferCertificates = (
  limit?: number,
  options?: QueryOptions<PendingListResponse>
): UseQueryResult<PendingListResponse, ApiError> => {
  return useQuery({
    queryKey: certificateDataQueryKeys.pendingTransfers(limit),
    queryFn: () => certificateDataApi.getPendingTransferCertificates(limit),
    ...options
  });
};

export const useCertificatesByProduct = (
  productId: string,
  params?: ProductListParams,
  options?: QueryOptions<ProductListResponse>
): UseQueryResult<ProductListResponse, ApiError> => {
  return useQuery({
    queryKey: certificateDataQueryKeys.product(productId, params),
    queryFn: () => certificateDataApi.getCertificatesByProduct(productId, params),
    enabled: Boolean(productId) && (options?.enabled ?? true),
    ...options
  });
};

export const useCertificatesByRecipient = (
  recipient: string,
  params?: RecipientListParams,
  options?: QueryOptions<RecipientListResponse>
): UseQueryResult<RecipientListResponse, ApiError> => {
  return useQuery({
    queryKey: certificateDataQueryKeys.recipient(recipient, params),
    queryFn: () => certificateDataApi.getCertificatesByRecipient(recipient, params),
    enabled: Boolean(recipient) && (options?.enabled ?? true),
    ...options
  });
};

export const useCertificatesByBatch = (
  batchId: string,
  options?: QueryOptions<BatchListResponse>
): UseQueryResult<BatchListResponse, ApiError> => {
  return useQuery({
    queryKey: certificateDataQueryKeys.batch(batchId),
    queryFn: () => certificateDataApi.getCertificatesByBatch(batchId),
    enabled: Boolean(batchId) && (options?.enabled ?? true),
    ...options
  });
};

export const useCertificateSearch = (
  searchTerm: string,
  limit?: number,
  options?: QueryOptions<SearchResponse>
): UseQueryResult<SearchResponse, ApiError> => {
  return useQuery({
    queryKey: certificateDataQueryKeys.search(searchTerm, limit),
    queryFn: () => certificateDataApi.searchCertificates(searchTerm, limit),
    enabled: Boolean(searchTerm) && (options?.enabled ?? true),
    ...options
  });
};

export const useUpdateCertificate = (
  options?: MutationOptions<CertificateUpdateResponse, UpdateCertificateVariables>
): UseMutationResult<CertificateUpdateResponse, ApiError, UpdateCertificateVariables, unknown> => {
  return useMutation({
    mutationKey: [...certificateDataQueryKeys.root, 'update'],
    mutationFn: ({ certificateId, updates }) => certificateDataApi.updateCertificate(certificateId, updates),
    ...options
  });
};

export const useDeleteCertificate = (
  options?: MutationOptions<CertificateDeleteResponse, string>
): UseMutationResult<CertificateDeleteResponse, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: [...certificateDataQueryKeys.root, 'delete'],
    mutationFn: certificateDataApi.deleteCertificate,
    ...options
  });
};

export const useBulkUpdateCertificates = (
  options?: MutationOptions<BulkUpdateResponse, BulkUpdateVariables>
): UseMutationResult<BulkUpdateResponse, ApiError, BulkUpdateVariables, unknown> => {
  return useMutation({
    mutationKey: [...certificateDataQueryKeys.root, 'bulk-update'],
    mutationFn: ({ certificateIds, updates }) => certificateDataApi.bulkUpdateCertificates(certificateIds, updates),
    ...options
  });
};

export const useUpdateCertificateStatus = (
  options?: MutationOptions<StatusUpdateResponse, UpdateCertificateStatusVariables>
): UseMutationResult<StatusUpdateResponse, ApiError, UpdateCertificateStatusVariables, unknown> => {
  return useMutation({
    mutationKey: [...certificateDataQueryKeys.root, 'status-update'],
    mutationFn: ({ certificateId, payload }) => certificateDataApi.updateCertificateStatus(certificateId, payload),
    ...options
  });
};
