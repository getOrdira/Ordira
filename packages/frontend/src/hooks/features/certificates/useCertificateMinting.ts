'use client';

// src/hooks/features/certificates/useCertificateMinting.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import certificateMintingApi, {
  type BatchCreateCertificatesRequest,
  type CreateCertificateRequest
} from '@/lib/api/features/certificates/certificateMinting.api';
import { ApiError } from '@/lib/errors/errors';

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type CreateCertificateResponse = Awaited<ReturnType<typeof certificateMintingApi.createCertificate>>;
type BatchCreateCertificatesResponse = Awaited<ReturnType<typeof certificateMintingApi.createBatchCertificates>>;
type UpdateCertificateImageResponse = Awaited<ReturnType<typeof certificateMintingApi.updateCertificateImage>>;
type DeleteCertificateAssetsResponse = Awaited<ReturnType<typeof certificateMintingApi.deleteCertificateAssets>>;

interface UpdateCertificateImageVariables {
  certificateId: string;
  file: File | Blob;
  fileName?: string;
}

export const useCreateCertificate = (
  options?: MutationOptions<CreateCertificateResponse, CreateCertificateRequest>
): UseMutationResult<CreateCertificateResponse, ApiError, CreateCertificateRequest, unknown> => {
  return useMutation({
    mutationKey: ['certificates', 'minting', 'create'],
    mutationFn: certificateMintingApi.createCertificate,
    ...options
  });
};

export const useCreateBatchCertificates = (
  options?: MutationOptions<BatchCreateCertificatesResponse, BatchCreateCertificatesRequest>
): UseMutationResult<BatchCreateCertificatesResponse, ApiError, BatchCreateCertificatesRequest, unknown> => {
  return useMutation({
    mutationKey: ['certificates', 'minting', 'create-batch'],
    mutationFn: certificateMintingApi.createBatchCertificates,
    ...options
  });
};

export const useUpdateCertificateImage = (
  options?: MutationOptions<UpdateCertificateImageResponse, UpdateCertificateImageVariables>
): UseMutationResult<UpdateCertificateImageResponse, ApiError, UpdateCertificateImageVariables, unknown> => {
  return useMutation({
    mutationKey: ['certificates', 'minting', 'update-image'],
    mutationFn: ({ certificateId, file, fileName }) =>
      certificateMintingApi.updateCertificateImage(certificateId, file, fileName),
    ...options
  });
};

export const useDeleteCertificateAssets = (
  options?: MutationOptions<DeleteCertificateAssetsResponse, string>
): UseMutationResult<DeleteCertificateAssetsResponse, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: ['certificates', 'minting', 'delete-assets'],
    mutationFn: certificateMintingApi.deleteCertificateAssets,
    ...options
  });
};
