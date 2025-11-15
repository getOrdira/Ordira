'use client';

// src/hooks/features/supplyChain/useSupplyChainQrCode.ts

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import supplyChainQrCodeApi, {
  type BatchQrCodeResponse,
  type CertificateQrCodeResponse,
  type QrCodeDeactivateResponse,
  type QrCodeParseResponse,
  type QrCodeRegenerateResponse,
  type QrCodeStatisticsResponse,
  type QrCodeValidateResponse,
  type QrCodeWithLogoResponse,
  type SupplyChainQrCodeResponse,
  type VotingQrCodeResponse
} from '@/lib/api/features/supplyChain/supplyChainQrCode.api';
import type {
  ICertificateQrCodeRequest,
  IQrCodeGenerationRequest,
  ISupplyChainQrCodeRequest,
  IVotingQrCodeRequest
} from '@/lib/types/features/supplyChain';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const normalizeObject = <T>(value?: T) => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return Object.keys(value).length ? (value as Record<string, unknown>) : null;
};

export const supplyChainQrCodeQueryKeys = {
  root: ['supply-chain', 'qr-code'] as const,
  statistics: (query: { businessId?: string; contractAddress: string }) =>
    [...supplyChainQrCodeQueryKeys.root, 'statistics', normalizeObject(query)] as const
};

export const supplyChainQrCodeMutationKeys = {
  generateSupplyChain: [...supplyChainQrCodeQueryKeys.root, 'generate-supply-chain'] as const,
  generateCertificate: [...supplyChainQrCodeQueryKeys.root, 'generate-certificate'] as const,
  generateVoting: [...supplyChainQrCodeQueryKeys.root, 'generate-voting'] as const,
  generateWithLogo: [...supplyChainQrCodeQueryKeys.root, 'generate-with-logo'] as const,
  batch: [...supplyChainQrCodeQueryKeys.root, 'batch'] as const,
  parse: [...supplyChainQrCodeQueryKeys.root, 'parse'] as const,
  validate: [...supplyChainQrCodeQueryKeys.root, 'validate'] as const,
  regenerate: [...supplyChainQrCodeQueryKeys.root, 'regenerate'] as const,
  deactivate: [...supplyChainQrCodeQueryKeys.root, 'deactivate'] as const
};

/**
 * Generate supply chain tracking QR code.
 */
export const useGenerateSupplyChainQrCode = (
  options?: MutationConfig<SupplyChainQrCodeResponse, ISupplyChainQrCodeRequest>
): UseMutationResult<SupplyChainQrCodeResponse, ApiError, ISupplyChainQrCodeRequest, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainQrCodeMutationKeys.generateSupplyChain,
    mutationFn: (payload) => supplyChainQrCodeApi.generateSupplyChainQrCode(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplyChainQrCodeQueryKeys.root });
    },
    ...options
  });
};

/**
 * Generate certificate verification QR code.
 */
export const useGenerateCertificateQrCode = (
  options?: MutationConfig<CertificateQrCodeResponse, ICertificateQrCodeRequest>
): UseMutationResult<CertificateQrCodeResponse, ApiError, ICertificateQrCodeRequest, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainQrCodeMutationKeys.generateCertificate,
    mutationFn: (payload) => supplyChainQrCodeApi.generateCertificateQrCode(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplyChainQrCodeQueryKeys.root });
    },
    ...options
  });
};

/**
 * Generate voting QR code.
 */
export const useGenerateVotingQrCode = (
  options?: MutationConfig<VotingQrCodeResponse, IVotingQrCodeRequest>
): UseMutationResult<VotingQrCodeResponse, ApiError, IVotingQrCodeRequest, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainQrCodeMutationKeys.generateVoting,
    mutationFn: (payload) => supplyChainQrCodeApi.generateVotingQrCode(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplyChainQrCodeQueryKeys.root });
    },
    ...options
  });
};

/**
 * Generate QR code with logo overlay.
 */
export const useGenerateQrCodeWithLogo = (
  options?: MutationConfig<QrCodeWithLogoResponse, IQrCodeGenerationRequest & { logoUrl: string }>
): UseMutationResult<
  QrCodeWithLogoResponse,
  ApiError,
  IQrCodeGenerationRequest & { logoUrl: string },
  unknown
> => {
  return useMutation({
    mutationKey: supplyChainQrCodeMutationKeys.generateWithLogo,
    mutationFn: (payload) => supplyChainQrCodeApi.generateQrCodeWithLogo(payload),
    ...options
  });
};

/**
 * Generate multiple QR codes in batch.
 */
export const useGenerateBatchQrCodes = (
  options?: MutationConfig<
    BatchQrCodeResponse,
    IQrCodeGenerationRequest[] | { requests: IQrCodeGenerationRequest[] }
  >
): UseMutationResult<
  BatchQrCodeResponse,
  ApiError,
  IQrCodeGenerationRequest[] | { requests: IQrCodeGenerationRequest[] },
  unknown
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainQrCodeMutationKeys.batch,
    mutationFn: (payload) => supplyChainQrCodeApi.generateBatchQrCodes(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplyChainQrCodeQueryKeys.root });
    },
    ...options
  });
};

/**
 * Parse QR code data.
 */
export const useParseQrCodeData = (
  options?: MutationConfig<QrCodeParseResponse, { qrCodeData: string }>
): UseMutationResult<QrCodeParseResponse, ApiError, { qrCodeData: string }, unknown> => {
  return useMutation({
    mutationKey: supplyChainQrCodeMutationKeys.parse,
    mutationFn: (payload) => supplyChainQrCodeApi.parseQrCodeData(payload),
    ...options
  });
};

/**
 * Validate QR code data payload.
 */
export const useValidateQrCodeData = (
  options?: MutationConfig<QrCodeValidateResponse, { data: Record<string, unknown> }>
): UseMutationResult<QrCodeValidateResponse, ApiError, { data: Record<string, unknown> }, unknown> => {
  return useMutation({
    mutationKey: supplyChainQrCodeMutationKeys.validate,
    mutationFn: (payload) => supplyChainQrCodeApi.validateQrCodeData(payload),
    ...options
  });
};

/**
 * Retrieve QR code statistics for a business.
 */
export const useQrCodeStatistics = (
  query: { businessId?: string; contractAddress: string },
  options?: QueryOptions<QrCodeStatisticsResponse>
): UseQueryResult<QrCodeStatisticsResponse, ApiError> => {
  return useQuery({
    queryKey: supplyChainQrCodeQueryKeys.statistics(query),
    queryFn: () => supplyChainQrCodeApi.getQrCodeStatistics(query),
    enabled: Boolean(query.contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Regenerate QR code.
 */
export const useRegenerateQrCode = (
  options?: MutationConfig<QrCodeRegenerateResponse, IQrCodeGenerationRequest>
): UseMutationResult<QrCodeRegenerateResponse, ApiError, IQrCodeGenerationRequest, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainQrCodeMutationKeys.regenerate,
    mutationFn: (payload) => supplyChainQrCodeApi.regenerateQrCode(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplyChainQrCodeQueryKeys.root });
    },
    ...options
  });
};

/**
 * Deactivate QR code.
 */
export const useDeactivateQrCode = (
  options?: MutationConfig<QrCodeDeactivateResponse, { qrCodeId: string; reason?: string }>
): UseMutationResult<QrCodeDeactivateResponse, ApiError, { qrCodeId: string; reason?: string }, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainQrCodeMutationKeys.deactivate,
    mutationFn: (payload) => supplyChainQrCodeApi.deactivateQrCode(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplyChainQrCodeQueryKeys.root });
    },
    ...options
  });
};

/**
 * Main hook that provides access to all supply chain QR code operations.
 */
export interface UseSupplyChainQrCodeOptions {
  queries?: {
    statistics?: QueryOptions<QrCodeStatisticsResponse>;
  };
  mutations?: {
    generateSupplyChain?: MutationConfig<SupplyChainQrCodeResponse, ISupplyChainQrCodeRequest>;
    generateCertificate?: MutationConfig<CertificateQrCodeResponse, ICertificateQrCodeRequest>;
    generateVoting?: MutationConfig<VotingQrCodeResponse, IVotingQrCodeRequest>;
    generateWithLogo?: MutationConfig<QrCodeWithLogoResponse, IQrCodeGenerationRequest & { logoUrl: string }>;
    batch?: MutationConfig<
      BatchQrCodeResponse,
      IQrCodeGenerationRequest[] | { requests: IQrCodeGenerationRequest[] }
    >;
    parse?: MutationConfig<QrCodeParseResponse, { qrCodeData: string }>;
    validate?: MutationConfig<QrCodeValidateResponse, { data: Record<string, unknown> }>;
    regenerate?: MutationConfig<QrCodeRegenerateResponse, IQrCodeGenerationRequest>;
    deactivate?: MutationConfig<QrCodeDeactivateResponse, { qrCodeId: string; reason?: string }>;
  };
}

export interface UseSupplyChainQrCodeResult {
  // Queries
  statistics: (
    query: { businessId?: string; contractAddress: string }
  ) => UseQueryResult<QrCodeStatisticsResponse, ApiError>;

  // Mutations
  generateSupplyChain: UseMutationResult<
    SupplyChainQrCodeResponse,
    ApiError,
    ISupplyChainQrCodeRequest,
    unknown
  >;
  generateCertificate: UseMutationResult<
    CertificateQrCodeResponse,
    ApiError,
    ICertificateQrCodeRequest,
    unknown
  >;
  generateVoting: UseMutationResult<VotingQrCodeResponse, ApiError, IVotingQrCodeRequest, unknown>;
  generateWithLogo: UseMutationResult<
    QrCodeWithLogoResponse,
    ApiError,
    IQrCodeGenerationRequest & { logoUrl: string },
    unknown
  >;
  batch: UseMutationResult<
    BatchQrCodeResponse,
    ApiError,
    IQrCodeGenerationRequest[] | { requests: IQrCodeGenerationRequest[] },
    unknown
  >;
  parse: UseMutationResult<QrCodeParseResponse, ApiError, { qrCodeData: string }, unknown>;
  validate: UseMutationResult<
    QrCodeValidateResponse,
    ApiError,
    { data: Record<string, unknown> },
    unknown
  >;
  regenerate: UseMutationResult<
    QrCodeRegenerateResponse,
    ApiError,
    IQrCodeGenerationRequest,
    unknown
  >;
  deactivate: UseMutationResult<
    QrCodeDeactivateResponse,
    ApiError,
    { qrCodeId: string; reason?: string },
    unknown
  >;
}

export const useSupplyChainQrCode = (
  options: UseSupplyChainQrCodeOptions = {}
): UseSupplyChainQrCodeResult => {
  const generateSupplyChain = useGenerateSupplyChainQrCode(options.mutations?.generateSupplyChain);
  const generateCertificate = useGenerateCertificateQrCode(options.mutations?.generateCertificate);
  const generateVoting = useGenerateVotingQrCode(options.mutations?.generateVoting);
  const generateWithLogo = useGenerateQrCodeWithLogo(options.mutations?.generateWithLogo);
  const batch = useGenerateBatchQrCodes(options.mutations?.batch);
  const parse = useParseQrCodeData(options.mutations?.parse);
  const validate = useValidateQrCodeData(options.mutations?.validate);
  const regenerate = useRegenerateQrCode(options.mutations?.regenerate);
  const deactivate = useDeactivateQrCode(options.mutations?.deactivate);

  return {
    statistics: (query: { businessId?: string; contractAddress: string }) =>
      useQrCodeStatistics(query, options.queries?.statistics),
    generateSupplyChain,
    generateCertificate,
    generateVoting,
    generateWithLogo,
    batch,
    parse,
    validate,
    regenerate,
    deactivate
  };
};
