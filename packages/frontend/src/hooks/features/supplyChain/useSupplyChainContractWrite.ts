'use client';

// src/hooks/features/supplyChain/useSupplyChainContractWrite.ts

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import supplyChainContractWriteApi, {
  type BatchCreateEndpointsPayload,
  type BatchEndpointsResponse,
  type BatchEventsResponse,
  type BatchLogEventsPayload,
  type BatchProductsResponse,
  type BatchRegisterProductsPayload,
  type CreateEndpointPayload,
  type CreateEndpointResponse,
  type GasEstimateResponse,
  type LogEventPayload,
  type LogEventResponse,
  type RegisterProductPayload,
  type RegisterProductResponse
} from '@/lib/api/features/supplyChain/supplyChainContractWrite.api';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const supplyChainContractWriteMutationKeys = {
  createEndpoint: ['supply-chain', 'contract', 'write', 'create-endpoint'] as const,
  registerProduct: ['supply-chain', 'contract', 'write', 'register-product'] as const,
  logEvent: ['supply-chain', 'contract', 'write', 'log-event'] as const,
  batchEndpoints: ['supply-chain', 'contract', 'write', 'batch-endpoints'] as const,
  batchProducts: ['supply-chain', 'contract', 'write', 'batch-products'] as const,
  batchEvents: ['supply-chain', 'contract', 'write', 'batch-events'] as const,
  estimateEndpointGas: ['supply-chain', 'contract', 'write', 'estimate-endpoint-gas'] as const,
  estimateProductGas: ['supply-chain', 'contract', 'write', 'estimate-product-gas'] as const,
  estimateEventGas: ['supply-chain', 'contract', 'write', 'estimate-event-gas'] as const
};

/**
 * Create an endpoint on the supply chain contract.
 */
export const useCreateEndpoint = (
  options?: MutationConfig<CreateEndpointResponse, CreateEndpointPayload>
): UseMutationResult<CreateEndpointResponse, ApiError, CreateEndpointPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainContractWriteMutationKeys.createEndpoint,
    mutationFn: (payload) => supplyChainContractWriteApi.createEndpoint(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supply-chain', 'contract'] });
    },
    ...options
  });
};

/**
 * Register a product on the supply chain contract.
 */
export const useRegisterProduct = (
  options?: MutationConfig<RegisterProductResponse, RegisterProductPayload>
): UseMutationResult<RegisterProductResponse, ApiError, RegisterProductPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainContractWriteMutationKeys.registerProduct,
    mutationFn: (payload) => supplyChainContractWriteApi.registerProduct(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supply-chain', 'contract'] });
    },
    ...options
  });
};

/**
 * Log an event on the supply chain contract.
 */
export const useLogEvent = (
  options?: MutationConfig<LogEventResponse, LogEventPayload>
): UseMutationResult<LogEventResponse, ApiError, LogEventPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainContractWriteMutationKeys.logEvent,
    mutationFn: (payload) => supplyChainContractWriteApi.logEvent(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supply-chain', 'contract'] });
    },
    ...options
  });
};

/**
 * Batch create supply chain endpoints.
 */
export const useBatchCreateEndpoints = (
  options?: MutationConfig<BatchEndpointsResponse, BatchCreateEndpointsPayload>
): UseMutationResult<BatchEndpointsResponse, ApiError, BatchCreateEndpointsPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainContractWriteMutationKeys.batchEndpoints,
    mutationFn: (payload) => supplyChainContractWriteApi.batchCreateEndpoints(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supply-chain', 'contract'] });
    },
    ...options
  });
};

/**
 * Batch register supply chain products.
 */
export const useBatchRegisterProducts = (
  options?: MutationConfig<BatchProductsResponse, BatchRegisterProductsPayload>
): UseMutationResult<BatchProductsResponse, ApiError, BatchRegisterProductsPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainContractWriteMutationKeys.batchProducts,
    mutationFn: (payload) => supplyChainContractWriteApi.batchRegisterProducts(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supply-chain', 'contract'] });
    },
    ...options
  });
};

/**
 * Batch log supply chain events.
 */
export const useBatchLogEvents = (
  options?: MutationConfig<BatchEventsResponse, BatchLogEventsPayload>
): UseMutationResult<BatchEventsResponse, ApiError, BatchLogEventsPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: supplyChainContractWriteMutationKeys.batchEvents,
    mutationFn: (payload) => supplyChainContractWriteApi.batchLogEvents(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supply-chain', 'contract'] });
    },
    ...options
  });
};

/**
 * Estimate gas for creating an endpoint.
 */
export const useEstimateCreateEndpointGas = (
  options?: MutationConfig<GasEstimateResponse, CreateEndpointPayload>
): UseMutationResult<GasEstimateResponse, ApiError, CreateEndpointPayload, unknown> => {
  return useMutation({
    mutationKey: supplyChainContractWriteMutationKeys.estimateEndpointGas,
    mutationFn: (payload) => supplyChainContractWriteApi.estimateCreateEndpointGas(payload),
    ...options
  });
};

/**
 * Estimate gas for registering a product.
 */
export const useEstimateRegisterProductGas = (
  options?: MutationConfig<GasEstimateResponse, RegisterProductPayload>
): UseMutationResult<GasEstimateResponse, ApiError, RegisterProductPayload, unknown> => {
  return useMutation({
    mutationKey: supplyChainContractWriteMutationKeys.estimateProductGas,
    mutationFn: (payload) => supplyChainContractWriteApi.estimateRegisterProductGas(payload),
    ...options
  });
};

/**
 * Estimate gas for logging an event.
 */
export const useEstimateLogEventGas = (
  options?: MutationConfig<GasEstimateResponse, LogEventPayload>
): UseMutationResult<GasEstimateResponse, ApiError, LogEventPayload, unknown> => {
  return useMutation({
    mutationKey: supplyChainContractWriteMutationKeys.estimateEventGas,
    mutationFn: (payload) => supplyChainContractWriteApi.estimateLogEventGas(payload),
    ...options
  });
};

/**
 * Main hook that provides access to all supply chain contract write operations.
 */
export interface UseSupplyChainContractWriteOptions {
  mutations?: {
    createEndpoint?: MutationConfig<CreateEndpointResponse, CreateEndpointPayload>;
    registerProduct?: MutationConfig<RegisterProductResponse, RegisterProductPayload>;
    logEvent?: MutationConfig<LogEventResponse, LogEventPayload>;
    batchEndpoints?: MutationConfig<BatchEndpointsResponse, BatchCreateEndpointsPayload>;
    batchProducts?: MutationConfig<BatchProductsResponse, BatchRegisterProductsPayload>;
    batchEvents?: MutationConfig<BatchEventsResponse, BatchLogEventsPayload>;
    estimateEndpointGas?: MutationConfig<GasEstimateResponse, CreateEndpointPayload>;
    estimateProductGas?: MutationConfig<GasEstimateResponse, RegisterProductPayload>;
    estimateEventGas?: MutationConfig<GasEstimateResponse, LogEventPayload>;
  };
}

export interface UseSupplyChainContractWriteResult {
  // Mutations
  createEndpoint: UseMutationResult<CreateEndpointResponse, ApiError, CreateEndpointPayload, unknown>;
  registerProduct: UseMutationResult<RegisterProductResponse, ApiError, RegisterProductPayload, unknown>;
  logEvent: UseMutationResult<LogEventResponse, ApiError, LogEventPayload, unknown>;
  batchEndpoints: UseMutationResult<
    BatchEndpointsResponse,
    ApiError,
    BatchCreateEndpointsPayload,
    unknown
  >;
  batchProducts: UseMutationResult<
    BatchProductsResponse,
    ApiError,
    BatchRegisterProductsPayload,
    unknown
  >;
  batchEvents: UseMutationResult<BatchEventsResponse, ApiError, BatchLogEventsPayload, unknown>;
  estimateEndpointGas: UseMutationResult<GasEstimateResponse, ApiError, CreateEndpointPayload, unknown>;
  estimateProductGas: UseMutationResult<GasEstimateResponse, ApiError, RegisterProductPayload, unknown>;
  estimateEventGas: UseMutationResult<GasEstimateResponse, ApiError, LogEventPayload, unknown>;
}

export const useSupplyChainContractWrite = (
  options: UseSupplyChainContractWriteOptions = {}
): UseSupplyChainContractWriteResult => {
  const createEndpoint = useCreateEndpoint(options.mutations?.createEndpoint);
  const registerProduct = useRegisterProduct(options.mutations?.registerProduct);
  const logEvent = useLogEvent(options.mutations?.logEvent);
  const batchEndpoints = useBatchCreateEndpoints(options.mutations?.batchEndpoints);
  const batchProducts = useBatchRegisterProducts(options.mutations?.batchProducts);
  const batchEvents = useBatchLogEvents(options.mutations?.batchEvents);
  const estimateEndpointGas = useEstimateCreateEndpointGas(options.mutations?.estimateEndpointGas);
  const estimateProductGas = useEstimateRegisterProductGas(options.mutations?.estimateProductGas);
  const estimateEventGas = useEstimateLogEventGas(options.mutations?.estimateEventGas);

  return {
    createEndpoint,
    registerProduct,
    logEvent,
    batchEndpoints,
    batchProducts,
    batchEvents,
    estimateEndpointGas,
    estimateProductGas,
    estimateEventGas
  };
};
