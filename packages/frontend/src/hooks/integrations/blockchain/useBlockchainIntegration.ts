'use client';

// src/hooks/integrations/blockchain/useBlockchainIntegration.ts

import {
  useQuery,
  type UseQueryResult
} from '@tanstack/react-query';

import blockchainIntegrationApi, {
  type AddressBalanceQuery,
  type BlockchainAddressBalance,
  type BlockchainGasPrice,
  type BlockchainNetworkStatus,
  type BlockchainTransactionReceipt,
  type TransactionReceiptQuery
} from '@/lib/api/integrations/blockchain/blockchainIntegration.api';
import { ApiError } from '@/lib/errors/errors';
import { normalizeObject, type FeatureQueryOptions } from '@/hooks/query';

const blockchainIntegrationQueryKeysRoot = ['integrations', 'blockchain'] as const;

export const blockchainIntegrationQueryKeys = {
  root: blockchainIntegrationQueryKeysRoot,
  networkStatus: [...blockchainIntegrationQueryKeysRoot, 'network', 'status'] as const,
  gasPrice: [...blockchainIntegrationQueryKeysRoot, 'gas', 'price'] as const,
  transactionReceipt: (query: TransactionReceiptQuery) =>
    [...blockchainIntegrationQueryKeysRoot, 'transaction', 'receipt', normalizeObject(query)] as const,
  addressBalance: (query: AddressBalanceQuery) =>
    [...blockchainIntegrationQueryKeysRoot, 'address', 'balance', normalizeObject(query)] as const
};

/**
 * Retrieve network status details.
 */
export const useNetworkStatus = (
  options?: FeatureQueryOptions<BlockchainNetworkStatus>
): UseQueryResult<BlockchainNetworkStatus, ApiError> => {
  return useQuery({
    queryKey: blockchainIntegrationQueryKeys.networkStatus,
    queryFn: () => blockchainIntegrationApi.getNetworkStatus(),
    ...options
  });
};

/**
 * Retrieve current gas price information.
 */
export const useGasPrice = (
  options?: FeatureQueryOptions<BlockchainGasPrice>
): UseQueryResult<BlockchainGasPrice, ApiError> => {
  return useQuery({
    queryKey: blockchainIntegrationQueryKeys.gasPrice,
    queryFn: () => blockchainIntegrationApi.getGasPrice(),
    ...options
  });
};

/**
 * Retrieve transaction receipt details.
 */
export const useTransactionReceipt = (
  query: TransactionReceiptQuery,
  options?: FeatureQueryOptions<BlockchainTransactionReceipt>
): UseQueryResult<BlockchainTransactionReceipt, ApiError> => {
  return useQuery({
    queryKey: blockchainIntegrationQueryKeys.transactionReceipt(query),
    queryFn: () => blockchainIntegrationApi.getTransactionReceipt(query),
    enabled: Boolean(query.txHash) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Retrieve balance for a wallet address.
 */
export const useAddressBalance = (
  query: AddressBalanceQuery,
  options?: FeatureQueryOptions<BlockchainAddressBalance>
): UseQueryResult<BlockchainAddressBalance, ApiError> => {
  return useQuery({
    queryKey: blockchainIntegrationQueryKeys.addressBalance(query),
    queryFn: () => blockchainIntegrationApi.getAddressBalance(query),
    enabled: Boolean(query.address) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all blockchain integration operations.
 */
export interface UseBlockchainIntegrationOptions {
  queries?: {
    networkStatus?: FeatureQueryOptions<BlockchainNetworkStatus>;
    gasPrice?: FeatureQueryOptions<BlockchainGasPrice>;
    transactionReceipt?: FeatureQueryOptions<BlockchainTransactionReceipt>;
    addressBalance?: FeatureQueryOptions<BlockchainAddressBalance>;
  };
}

export interface UseBlockchainIntegrationResult {
  // Queries
  networkStatus: () => UseQueryResult<BlockchainNetworkStatus, ApiError>;
  gasPrice: () => UseQueryResult<BlockchainGasPrice, ApiError>;
  transactionReceipt: (
    query: TransactionReceiptQuery
  ) => UseQueryResult<BlockchainTransactionReceipt, ApiError>;
  addressBalance: (
    query: AddressBalanceQuery
  ) => UseQueryResult<BlockchainAddressBalance, ApiError>;
}

export const useBlockchainIntegration = (
  options: UseBlockchainIntegrationOptions = {}
): UseBlockchainIntegrationResult => {
  return {
    networkStatus: () => useNetworkStatus(options.queries?.networkStatus),
    gasPrice: () => useGasPrice(options.queries?.gasPrice),
    transactionReceipt: (query: TransactionReceiptQuery) =>
      useTransactionReceipt(query, options.queries?.transactionReceipt),
    addressBalance: (query: AddressBalanceQuery) =>
      useAddressBalance(query, options.queries?.addressBalance)
  };
};
