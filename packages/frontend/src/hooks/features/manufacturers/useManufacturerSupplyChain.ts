'use client';

// src/hooks/features/manufacturers/useManufacturerSupplyChain.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import manufacturerSupplyChainApi, {
  type CreateEndpointPayload,
  type DeployContractPayload,
  type DeactivateContractResult,
  type LogSupplyChainEventPayload,
  type RegisterProductPayload,
  type SupplyChainStatistics,
  type UpdateEndpointStatusPayload
} from '@/lib/api/features/manufacturers/manufacturerSupplyChain.api';
import type {
  BatchQrCodeResult,
  ProductQrCodeInfo,
  QrCodeGenerationResult,
  SupplyChainContractInfo,
  SupplyChainDashboard,
  SupplyChainEndpoint,
  SupplyChainEvent,
  SupplyChainProduct
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

const manufacturerSupplyChainQueryKeys = {
  root: ['manufacturers', 'supply-chain'] as const,
  contract: (manufacturerId: string) =>
    [...manufacturerSupplyChainQueryKeys.root, 'contract', manufacturerId] as const,
  endpoints: (manufacturerId: string) =>
    [...manufacturerSupplyChainQueryKeys.root, 'endpoints', manufacturerId] as const,
  products: (manufacturerId: string) =>
    [...manufacturerSupplyChainQueryKeys.root, 'products', manufacturerId] as const,
  events: (manufacturerId: string, productId: string) =>
    [...manufacturerSupplyChainQueryKeys.root, 'events', manufacturerId, productId] as const,
  dashboard: (manufacturerId: string) =>
    [...manufacturerSupplyChainQueryKeys.root, 'dashboard', manufacturerId] as const,
  productQr: (manufacturerId: string, productId: string) =>
    [...manufacturerSupplyChainQueryKeys.root, 'product-qr', manufacturerId, productId] as const,
  statistics: (manufacturerId: string) =>
    [...manufacturerSupplyChainQueryKeys.root, 'statistics', manufacturerId] as const
};

export const manufacturerSupplyChainMutationKeys = {
  deployContract: [...manufacturerSupplyChainQueryKeys.root, 'deploy-contract'] as const,
  deactivateContract: [...manufacturerSupplyChainQueryKeys.root, 'deactivate-contract'] as const,
  createEndpoint: [...manufacturerSupplyChainQueryKeys.root, 'create-endpoint'] as const,
  updateEndpointStatus: [...manufacturerSupplyChainQueryKeys.root, 'update-endpoint'] as const,
  registerProduct: [...manufacturerSupplyChainQueryKeys.root, 'register-product'] as const,
  logEvent: [...manufacturerSupplyChainQueryKeys.root, 'log-event'] as const,
  batchQrCodes: [...manufacturerSupplyChainQueryKeys.root, 'batch-qr'] as const
};

type DeployContractVariables = {
  manufacturerId: string;
  payload: DeployContractPayload;
};

type CreateEndpointVariables = {
  manufacturerId: string;
  payload: CreateEndpointPayload;
};

type UpdateEndpointStatusVariables = {
  manufacturerId: string;
  payload: UpdateEndpointStatusPayload;
};

type RegisterProductVariables = {
  manufacturerId: string;
  payload: RegisterProductPayload;
};

type LogEventVariables = {
  manufacturerId: string;
  payload: LogSupplyChainEventPayload;
};

type GenerateBatchQrVariables = {
  manufacturerId: string;
  productIds: string[];
};

export const useDeploySupplyChainContract = (
  options?: MutationConfig<SupplyChainContractInfo, DeployContractVariables>
): UseMutationResult<SupplyChainContractInfo, ApiError, DeployContractVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerSupplyChainMutationKeys.deployContract,
    mutationFn: ({ manufacturerId, payload }) =>
      manufacturerSupplyChainApi.deployContract(manufacturerId, payload),
    ...options
  });
};

export const useSupplyChainContractInfo = (
  manufacturerId: string,
  options?: QueryOptions<SupplyChainContractInfo | null>
): UseQueryResult<SupplyChainContractInfo | null, ApiError> => {
  return useQuery({
    queryKey: manufacturerSupplyChainQueryKeys.contract(manufacturerId),
    queryFn: () => manufacturerSupplyChainApi.getContractInfo(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useDeactivateSupplyChainContract = (
  options?: MutationConfig<DeactivateContractResult, string>
): UseMutationResult<DeactivateContractResult, ApiError, string, unknown> => {
  return useMutation({
    mutationKey: manufacturerSupplyChainMutationKeys.deactivateContract,
    mutationFn: manufacturerSupplyChainApi.deactivateContract,
    ...options
  });
};

export const useCreateSupplyChainEndpoint = (
  options?: MutationConfig<SupplyChainEndpoint, CreateEndpointVariables>
): UseMutationResult<SupplyChainEndpoint, ApiError, CreateEndpointVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerSupplyChainMutationKeys.createEndpoint,
    mutationFn: ({ manufacturerId, payload }) =>
      manufacturerSupplyChainApi.createEndpoint(manufacturerId, payload),
    ...options
  });
};

export const useSupplyChainEndpoints = (
  manufacturerId: string,
  options?: QueryOptions<SupplyChainEndpoint[]>
): UseQueryResult<SupplyChainEndpoint[], ApiError> => {
  return useQuery({
    queryKey: manufacturerSupplyChainQueryKeys.endpoints(manufacturerId),
    queryFn: () => manufacturerSupplyChainApi.getEndpoints(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useUpdateSupplyChainEndpointStatus = (
  options?: MutationConfig<SupplyChainEndpoint, UpdateEndpointStatusVariables>
): UseMutationResult<SupplyChainEndpoint, ApiError, UpdateEndpointStatusVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerSupplyChainMutationKeys.updateEndpointStatus,
    mutationFn: ({ manufacturerId, payload }) =>
      manufacturerSupplyChainApi.updateEndpointStatus(manufacturerId, payload),
    ...options
  });
};

export const useRegisterSupplyChainProduct = (
  options?: MutationConfig<SupplyChainProduct, RegisterProductVariables>
): UseMutationResult<SupplyChainProduct, ApiError, RegisterProductVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerSupplyChainMutationKeys.registerProduct,
    mutationFn: ({ manufacturerId, payload }) =>
      manufacturerSupplyChainApi.registerProduct(manufacturerId, payload),
    ...options
  });
};

export const useSupplyChainProducts = (
  manufacturerId: string,
  options?: QueryOptions<SupplyChainProduct[]>
): UseQueryResult<SupplyChainProduct[], ApiError> => {
  return useQuery({
    queryKey: manufacturerSupplyChainQueryKeys.products(manufacturerId),
    queryFn: () => manufacturerSupplyChainApi.getProducts(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useLogSupplyChainEvent = (
  options?: MutationConfig<SupplyChainEvent, LogEventVariables>
): UseMutationResult<SupplyChainEvent, ApiError, LogEventVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerSupplyChainMutationKeys.logEvent,
    mutationFn: ({ manufacturerId, payload }) =>
      manufacturerSupplyChainApi.logEvent(manufacturerId, payload),
    ...options
  });
};

export const useSupplyChainEvents = (
  manufacturerId: string,
  productId: string,
  options?: QueryOptions<SupplyChainEvent[]>
): UseQueryResult<SupplyChainEvent[], ApiError> => {
  return useQuery({
    queryKey: manufacturerSupplyChainQueryKeys.events(manufacturerId, productId),
    queryFn: () => manufacturerSupplyChainApi.getProductEvents(manufacturerId, productId),
    enabled: Boolean(manufacturerId) && Boolean(productId) && (options?.enabled ?? true),
    ...options
  });
};

export const useSupplyChainDashboard = (
  manufacturerId: string,
  options?: QueryOptions<SupplyChainDashboard>
): UseQueryResult<SupplyChainDashboard, ApiError> => {
  return useQuery({
    queryKey: manufacturerSupplyChainQueryKeys.dashboard(manufacturerId),
    queryFn: () => manufacturerSupplyChainApi.getDashboard(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};

export const useGenerateProductQrCode = (
  manufacturerId: string,
  productId: string,
  options?: QueryOptions<QrCodeGenerationResult>
): UseQueryResult<QrCodeGenerationResult, ApiError> => {
  return useQuery({
    queryKey: manufacturerSupplyChainQueryKeys.productQr(manufacturerId, productId),
    queryFn: () => manufacturerSupplyChainApi.generateProductQrCode(manufacturerId, productId),
    enabled: Boolean(manufacturerId) && Boolean(productId) && (options?.enabled ?? true),
    ...options
  });
};

export const useGenerateBatchProductQrCodes = (
  options?: MutationConfig<BatchQrCodeResult[], GenerateBatchQrVariables>
): UseMutationResult<BatchQrCodeResult[], ApiError, GenerateBatchQrVariables, unknown> => {
  return useMutation({
    mutationKey: manufacturerSupplyChainMutationKeys.batchQrCodes,
    mutationFn: ({ manufacturerId, productIds }) =>
      manufacturerSupplyChainApi.generateBatchQrCodes(manufacturerId, productIds),
    ...options
  });
};

export const useProductQrCodeInfo = (
  manufacturerId: string,
  productId: string,
  options?: QueryOptions<ProductQrCodeInfo>
): UseQueryResult<ProductQrCodeInfo, ApiError> => {
  return useQuery({
    queryKey: [...manufacturerSupplyChainQueryKeys.productQr(manufacturerId, productId), 'info'],
    queryFn: () => manufacturerSupplyChainApi.getProductQrCodeInfo(manufacturerId, productId),
    enabled: Boolean(manufacturerId) && Boolean(productId) && (options?.enabled ?? true),
    ...options
  });
};

export const useSupplyChainStatistics = (
  manufacturerId: string,
  options?: QueryOptions<SupplyChainStatistics>
): UseQueryResult<SupplyChainStatistics, ApiError> => {
  return useQuery({
    queryKey: manufacturerSupplyChainQueryKeys.statistics(manufacturerId),
    queryFn: () => manufacturerSupplyChainApi.getStatistics(manufacturerId),
    enabled: Boolean(manufacturerId) && (options?.enabled ?? true),
    ...options
  });
};
