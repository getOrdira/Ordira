'use client';

// src/hooks/features/manufacturers/useManufacturerMedia.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import manufacturerMediaApi from '@/lib/api/features/manufacturers/manufacturerMedia.api';
import type {
  BrandAssets,
  MediaAnalytics,
  MediaGallery,
  QRCodeResult,
  UploadedFile
} from '@/lib/types/features/manufacturers';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type UploadFileParams = Parameters<typeof manufacturerMediaApi.uploadFile>;
type ProcessImageParams = Parameters<typeof manufacturerMediaApi.processImage>;
type GenerateQrCodeParams = Parameters<typeof manufacturerMediaApi.generateQrCode>;
type CreateGalleryParams = Parameters<typeof manufacturerMediaApi.createGallery>;
type DeleteFileParams = Parameters<typeof manufacturerMediaApi.deleteFile>;

type UploadFileVariables = {
  manufacturerId: UploadFileParams[0];
  file: UploadFileParams[1];
  options?: UploadFileParams[2];
};

type ProcessImageVariables = {
  manufacturerId: ProcessImageParams[0];
  fileId: ProcessImageParams[1];
  options: ProcessImageParams[2];
};

type GenerateQrCodeVariables = {
  manufacturerId: GenerateQrCodeParams[0];
  data: GenerateQrCodeParams[1];
  options?: GenerateQrCodeParams[2];
};

type CreateGalleryVariables = {
  manufacturerId: CreateGalleryParams[0];
  payload: CreateGalleryParams[1];
};

type DeleteFileVariables = {
  manufacturerId: DeleteFileParams[0];
  fileId: DeleteFileParams[1];
};

export const manufacturerMediaQueryKeys = {
  root: ['manufacturers', 'media'] as const,
  brandAssets: (manufacturerId: string) =>
    [...manufacturerMediaQueryKeys.root, 'brand-assets', manufacturerId] as const,
  analytics: (manufacturerId: string) =>
    [...manufacturerMediaQueryKeys.root, 'analytics', manufacturerId] as const
};

export const manufacturerMediaMutationKeys = {
  upload: [...manufacturerMediaQueryKeys.root, 'upload'] as const,
  process: [...manufacturerMediaQueryKeys.root, 'process'] as const,
  qrCode: [...manufacturerMediaQueryKeys.root, 'qr-code'] as const,
  gallery: [...manufacturerMediaQueryKeys.root, 'gallery'] as const,
  deleteFile: [...manufacturerMediaQueryKeys.root, 'delete-file'] as const
};

export const useManufacturerBrandAssets = (
  manufacturerId: string,
  options?: QueryOptions<BrandAssets>
): UseQueryResult<BrandAssets, ApiError> => {
  return useQuery({
    queryKey: manufacturerMediaQueryKeys.brandAssets(manufacturerId),
    queryFn: () => manufacturerMediaApi.getBrandAssets(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerMediaAnalytics = (
  manufacturerId: string,
  options?: QueryOptions<MediaAnalytics>
): UseQueryResult<MediaAnalytics, ApiError> => {
  return useQuery({
    queryKey: manufacturerMediaQueryKeys.analytics(manufacturerId),
    queryFn: () => manufacturerMediaApi.getMediaAnalytics(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useUploadManufacturerFile = (
  options?: MutationConfig<UploadedFile, UploadFileVariables>
): UseMutationResult<UploadedFile, ApiError, UploadFileVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerMediaMutationKeys.upload,
    mutationFn: ({ manufacturerId, file, options: uploadOptions }) =>
      manufacturerMediaApi.uploadFile(manufacturerId, file, uploadOptions),
    ...options
  });
};

export const useProcessManufacturerImage = (
  options?: MutationConfig<UploadedFile, ProcessImageVariables>
): UseMutationResult<UploadedFile, ApiError, ProcessImageVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerMediaMutationKeys.process,
    mutationFn: ({ manufacturerId, fileId, options: processingOptions }) =>
      manufacturerMediaApi.processImage(manufacturerId, fileId, processingOptions),
    ...options
  });
};

export const useGenerateManufacturerQrCode = (
  options?: MutationConfig<QRCodeResult, GenerateQrCodeVariables>
): UseMutationResult<QRCodeResult, ApiError, GenerateQrCodeVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerMediaMutationKeys.qrCode,
    mutationFn: ({ manufacturerId, data, options: qrOptions }) =>
      manufacturerMediaApi.generateQrCode(manufacturerId, data, qrOptions),
    ...options
  });
};

export const useCreateManufacturerGallery = (
  options?: MutationConfig<MediaGallery, CreateGalleryVariables>
): UseMutationResult<MediaGallery, ApiError, CreateGalleryVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerMediaMutationKeys.gallery,
    mutationFn: ({ manufacturerId, payload }) =>
      manufacturerMediaApi.createGallery(manufacturerId, payload),
    ...options
  });
};

export const useDeleteManufacturerFile = (
  options?: MutationConfig<string, DeleteFileVariables>
): UseMutationResult<string, ApiError, DeleteFileVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerMediaMutationKeys.deleteFile,
    mutationFn: ({ manufacturerId, fileId }) =>
      manufacturerMediaApi.deleteFile(manufacturerId, fileId),
    ...options
  });
};
