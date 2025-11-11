'use client';

// src/hooks/features/manufacturers/useManufacturerAccount.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import manufacturerAccountApi, {
  type AccountActivityQuery,
  type ContactInfoPayload,
  type ManufacturerAccountUpdateInput,
  type MinimumOrderQuantityPayload,
  type ServicesOfferedPayload
} from '@/lib/api/features/manufacturers/manufacturerAccount.api';
import type {
  IManufacturer,
  NotificationPreferences,
  ProfilePictureUploadResult,
  SoftDeleteResult
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

const normalizeParams = <T extends Record<string, unknown> | undefined>(params?: T) => {
  if (!params) {
    return null;
  }
  return Object.keys(params).length ? { ...params } : null;
};

type ManufacturerId = Parameters<typeof manufacturerAccountApi.getAccount>[0];
type ManufacturerAccount = Awaited<ReturnType<typeof manufacturerAccountApi.getAccount>>;
type AccountStats = Awaited<ReturnType<typeof manufacturerAccountApi.getStats>>;
type OwnershipStatus = Awaited<ReturnType<typeof manufacturerAccountApi.validateOwnership>>;
type AccountActivityFilters = AccountActivityQuery;
type AccountActivityResponse = Awaited<
  ReturnType<typeof manufacturerAccountApi.getAccountActivity>
>;
type BasicInfo = Awaited<ReturnType<typeof manufacturerAccountApi.getBasicInfo>>;

type UpdateAccountVariables = {
  manufacturerId: ManufacturerId;
  updates: ManufacturerAccountUpdateInput;
};

type UpdateNotificationVariables = {
  manufacturerId: ManufacturerId;
  preferences: Partial<NotificationPreferences>;
};

type ContactInfoVariables = {
  manufacturerId: ManufacturerId;
  payload: ContactInfoPayload;
};

type ServicesOfferedVariables = {
  manufacturerId: ManufacturerId;
  payload: ServicesOfferedPayload;
};

type MinimumOrderQuantityVariables = {
  manufacturerId: ManufacturerId;
  payload: MinimumOrderQuantityPayload;
};

type UploadProfilePictureVariables = {
  manufacturerId: ManufacturerId;
  file: File;
};

export const manufacturerAccountQueryKeys = {
  root: ['manufacturers', 'account'] as const,
  detail: (manufacturerId: ManufacturerId) =>
    [...manufacturerAccountQueryKeys.root, 'detail', manufacturerId] as const,
  activity: (manufacturerId: ManufacturerId, params?: AccountActivityFilters) =>
    [
      ...manufacturerAccountQueryKeys.root,
      'activity',
      manufacturerId,
      normalizeParams(params)
    ] as const,
  stats: (manufacturerId: ManufacturerId) =>
    [...manufacturerAccountQueryKeys.root, 'stats', manufacturerId] as const,
  basicInfo: (manufacturerId: ManufacturerId) =>
    [...manufacturerAccountQueryKeys.root, 'basic-info', manufacturerId] as const,
  ownership: (manufacturerId: ManufacturerId) =>
    [...manufacturerAccountQueryKeys.root, 'ownership', manufacturerId] as const
};

export const manufacturerAccountMutationKeys = {
  update: [...manufacturerAccountQueryKeys.root, 'update'] as const,
  softDelete: [...manufacturerAccountQueryKeys.root, 'soft-delete'] as const,
  notifications: [...manufacturerAccountQueryKeys.root, 'notifications'] as const,
  deactivate: [...manufacturerAccountQueryKeys.root, 'deactivate'] as const,
  reactivate: [...manufacturerAccountQueryKeys.root, 'reactivate'] as const,
  contact: [...manufacturerAccountQueryKeys.root, 'contact'] as const,
  services: [...manufacturerAccountQueryKeys.root, 'services'] as const,
  moq: [...manufacturerAccountQueryKeys.root, 'moq'] as const,
  uploadPicture: [...manufacturerAccountQueryKeys.root, 'picture', 'upload'] as const,
  removePicture: [...manufacturerAccountQueryKeys.root, 'picture', 'remove'] as const
};

export const useManufacturerAccount = (
  manufacturerId: ManufacturerId,
  options?: QueryOptions<ManufacturerAccount>
): UseQueryResult<ManufacturerAccount, ApiError> => {
  return useQuery({
    queryKey: manufacturerAccountQueryKeys.detail(manufacturerId),
    queryFn: () => manufacturerAccountApi.getAccount(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerAccountActivity = (
  manufacturerId: ManufacturerId,
  params?: AccountActivityFilters,
  options?: QueryOptions<AccountActivityResponse>
): UseQueryResult<AccountActivityResponse, ApiError> => {
  return useQuery({
    queryKey: manufacturerAccountQueryKeys.activity(manufacturerId, params),
    queryFn: () => manufacturerAccountApi.getAccountActivity(manufacturerId, params),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerAccountStats = (
  manufacturerId: ManufacturerId,
  options?: QueryOptions<AccountStats>
): UseQueryResult<AccountStats, ApiError> => {
  return useQuery({
    queryKey: manufacturerAccountQueryKeys.stats(manufacturerId),
    queryFn: () => manufacturerAccountApi.getStats(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useManufacturerBasicInfo = (
  manufacturerId: ManufacturerId,
  options?: QueryOptions<BasicInfo>
): UseQueryResult<BasicInfo, ApiError> => {
  return useQuery({
    queryKey: manufacturerAccountQueryKeys.basicInfo(manufacturerId),
    queryFn: () => manufacturerAccountApi.getBasicInfo(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useValidateManufacturerOwnership = (
  manufacturerId: ManufacturerId,
  options?: QueryOptions<OwnershipStatus>
): UseQueryResult<OwnershipStatus, ApiError> => {
  return useQuery({
    queryKey: manufacturerAccountQueryKeys.ownership(manufacturerId),
    queryFn: () => manufacturerAccountApi.validateOwnership(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useUpdateManufacturerAccount = (
  options?: MutationConfig<IManufacturer, UpdateAccountVariables>
): UseMutationResult<IManufacturer, ApiError, UpdateAccountVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerAccountMutationKeys.update,
    mutationFn: ({ manufacturerId, updates }) =>
      manufacturerAccountApi.updateAccount(manufacturerId, updates),
    ...options
  });
};

export const useSoftDeleteManufacturerAccount = (
  options?: MutationConfig<SoftDeleteResult, ManufacturerId>
): UseMutationResult<SoftDeleteResult, ApiError, ManufacturerId, unknown> => {
  return useMutation({
    mutationKey: manufacturerAccountMutationKeys.softDelete,
    mutationFn: manufacturerAccountApi.softDeleteAccount,
    ...options
  });
};

export const useUpdateManufacturerNotificationPreferences = (
  options?: MutationConfig<NotificationPreferences, UpdateNotificationVariables>
): UseMutationResult<
  NotificationPreferences,
  ApiError,
  UpdateNotificationVariables,
  unknown
> => {
  return useMutation({
    mutationKey: manufacturerAccountMutationKeys.notifications,
    mutationFn: ({ manufacturerId, preferences }) =>
      manufacturerAccountApi.updateNotificationPreferences(manufacturerId, preferences),
    ...options
  });
};

export const useDeactivateManufacturerAccount = (
  options?: MutationConfig<string, ManufacturerId>
): UseMutationResult<string, ApiError, ManufacturerId, unknown> => {
  return useMutation({
    mutationKey: manufacturerAccountMutationKeys.deactivate,
    mutationFn: manufacturerAccountApi.deactivateAccount,
    ...options
  });
};

export const useReactivateManufacturerAccount = (
  options?: MutationConfig<string, ManufacturerId>
): UseMutationResult<string, ApiError, ManufacturerId, unknown> => {
  return useMutation({
    mutationKey: manufacturerAccountMutationKeys.reactivate,
    mutationFn: manufacturerAccountApi.reactivateAccount,
    ...options
  });
};

export const useUpdateManufacturerContactInfo = (
  options?: MutationConfig<IManufacturer, ContactInfoVariables>
): UseMutationResult<IManufacturer, ApiError, ContactInfoVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerAccountMutationKeys.contact,
    mutationFn: ({ manufacturerId, payload }) =>
      manufacturerAccountApi.updateContactInfo(manufacturerId, payload),
    ...options
  });
};

export const useUpdateManufacturerServicesOffered = (
  options?: MutationConfig<IManufacturer, ServicesOfferedVariables>
): UseMutationResult<IManufacturer, ApiError, ServicesOfferedVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerAccountMutationKeys.services,
    mutationFn: ({ manufacturerId, payload }) =>
      manufacturerAccountApi.updateServicesOffered(manufacturerId, payload),
    ...options
  });
};

export const useUpdateManufacturerMinimumOrderQuantity = (
  options?: MutationConfig<IManufacturer, MinimumOrderQuantityVariables>
): UseMutationResult<IManufacturer, ApiError, MinimumOrderQuantityVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerAccountMutationKeys.moq,
    mutationFn: ({ manufacturerId, payload }) =>
      manufacturerAccountApi.updateMinimumOrderQuantity(manufacturerId, payload),
    ...options
  });
};

export const useUploadManufacturerProfilePicture = (
  options?: MutationConfig<ProfilePictureUploadResult, UploadProfilePictureVariables>
): UseMutationResult<
  ProfilePictureUploadResult,
  ApiError,
  UploadProfilePictureVariables,
  unknown
> => {
  return useMutation({
    mutationKey: manufacturerAccountMutationKeys.uploadPicture,
    mutationFn: ({ manufacturerId, file }) =>
      manufacturerAccountApi.uploadProfilePicture(manufacturerId, file),
    ...options
  });
};

export const useRemoveManufacturerProfilePicture = (
  options?: MutationConfig<string, ManufacturerId>
): UseMutationResult<string, ApiError, ManufacturerId, unknown> => {
  return useMutation({
    mutationKey: manufacturerAccountMutationKeys.removePicture,
    mutationFn: manufacturerAccountApi.removeProfilePicture,
    ...options
  });
};
