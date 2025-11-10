'use client';

// src/hooks/features/certificates/useCertificateValidation.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import certificateValidationApi from '@/lib/api/features/certificates/certificateValidation.api';
import { ApiError } from '@/lib/errors/errors';

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type DuplicateCertificateResponse = Awaited<ReturnType<typeof certificateValidationApi.checkDuplicateCertificate>>;
type ProductOwnershipResponse = Awaited<ReturnType<typeof certificateValidationApi.validateProductOwnership>>;
type TransferParametersResponse = Awaited<ReturnType<typeof certificateValidationApi.validateTransferParameters>>;
type WalletValidationResponse = Awaited<ReturnType<typeof certificateValidationApi.validateWalletAddress>>;
type RelayerWalletResponse = Awaited<ReturnType<typeof certificateValidationApi.validateRelayerWallet>>;
type MetadataValidationResponse = Awaited<ReturnType<typeof certificateValidationApi.validateCertificateMetadata>>;
type BatchInputValidationResponse = Awaited<ReturnType<typeof certificateValidationApi.validateBatchInputs>>;
type OwnershipValidationResponse = Awaited<ReturnType<typeof certificateValidationApi.validateCertificateOwnership>>;
type TransferableValidationResponse = Awaited<ReturnType<typeof certificateValidationApi.validateCertificateTransferable>>;

interface DuplicateCertificateVariables {
  productId: string;
  recipient: string;
}

interface ProductOwnershipVariables {
  productId: string;
}

interface WalletValidationVariables {
  address: string;
}

interface CertificateIdVariables {
  certificateId: string;
}

export const useCheckDuplicateCertificate = (
  options?: MutationOptions<DuplicateCertificateResponse, DuplicateCertificateVariables>
): UseMutationResult<DuplicateCertificateResponse, ApiError, DuplicateCertificateVariables, unknown> => {
  return useMutation({
    mutationKey: ['certificates', 'validation', 'duplicate'],
    mutationFn: ({ productId, recipient }) => certificateValidationApi.checkDuplicateCertificate(productId, recipient),
    ...options
  });
};

export const useValidateCertificateProductOwnership = (
  options?: MutationOptions<ProductOwnershipResponse, ProductOwnershipVariables>
): UseMutationResult<ProductOwnershipResponse, ApiError, ProductOwnershipVariables, unknown> => {
  return useMutation({
    mutationKey: ['certificates', 'validation', 'product-ownership'],
    mutationFn: ({ productId }) => certificateValidationApi.validateProductOwnership(productId),
    ...options
  });
};

export const useValidateTransferParameters = (
  options?: MutationOptions<
    TransferParametersResponse,
    Parameters<typeof certificateValidationApi.validateTransferParameters>[0]
  >
): UseMutationResult<
  TransferParametersResponse,
  ApiError,
  Parameters<typeof certificateValidationApi.validateTransferParameters>[0],
  unknown
> => {
  return useMutation({
    mutationKey: ['certificates', 'validation', 'transfer-params'],
    mutationFn: certificateValidationApi.validateTransferParameters,
    ...options
  });
};

export const useValidateWalletAddress = (
  options?: MutationOptions<WalletValidationResponse, WalletValidationVariables>
): UseMutationResult<WalletValidationResponse, ApiError, WalletValidationVariables, unknown> => {
  return useMutation({
    mutationKey: ['certificates', 'validation', 'wallet'],
    mutationFn: ({ address }) => certificateValidationApi.validateWalletAddress(address),
    ...options
  });
};

export const useValidateRelayerWallet = (
  options?: MutationOptions<
    RelayerWalletResponse,
    Parameters<typeof certificateValidationApi.validateRelayerWallet>[0]
  >
): UseMutationResult<
  RelayerWalletResponse,
  ApiError,
  Parameters<typeof certificateValidationApi.validateRelayerWallet>[0],
  unknown
> => {
  return useMutation({
    mutationKey: ['certificates', 'validation', 'relayer-wallet'],
    mutationFn: certificateValidationApi.validateRelayerWallet,
    ...options
  });
};

export const useValidateCertificateMetadata = (
  options?: MutationOptions<MetadataValidationResponse, Record<string, unknown>>
): UseMutationResult<MetadataValidationResponse, ApiError, Record<string, unknown>, unknown> => {
  return useMutation({
    mutationKey: ['certificates', 'validation', 'metadata'],
    mutationFn: certificateValidationApi.validateCertificateMetadata,
    ...options
  });
};

export const useValidateBatchInputs = (
  options?: MutationOptions<
    BatchInputValidationResponse,
    Parameters<typeof certificateValidationApi.validateBatchInputs>[0]
  >
): UseMutationResult<
  BatchInputValidationResponse,
  ApiError,
  Parameters<typeof certificateValidationApi.validateBatchInputs>[0],
  unknown
> => {
  return useMutation({
    mutationKey: ['certificates', 'validation', 'batch-inputs'],
    mutationFn: certificateValidationApi.validateBatchInputs,
    ...options
  });
};

export const useValidateCertificateOwnership = (
  options?: MutationOptions<OwnershipValidationResponse, CertificateIdVariables>
): UseMutationResult<OwnershipValidationResponse, ApiError, CertificateIdVariables, unknown> => {
  return useMutation({
    mutationKey: ['certificates', 'validation', 'ownership'],
    mutationFn: ({ certificateId }) => certificateValidationApi.validateCertificateOwnership(certificateId),
    ...options
  });
};

export const useValidateCertificateTransferable = (
  options?: MutationOptions<TransferableValidationResponse, CertificateIdVariables>
): UseMutationResult<TransferableValidationResponse, ApiError, CertificateIdVariables, unknown> => {
  return useMutation({
    mutationKey: ['certificates', 'validation', 'transferable'],
    mutationFn: ({ certificateId }) => certificateValidationApi.validateCertificateTransferable(certificateId),
    ...options
  });
};
