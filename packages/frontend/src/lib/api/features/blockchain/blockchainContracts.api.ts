// src/lib/api/features/blockchain/blockchainContracts.api.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import { ApiError } from '@/lib/errors';
import type {
  TokenBalance,
  TransactionReceipt,
  NetworkInfo,
} from '@backend/services/types/blockchain.types';

type GasPriority = 'slow' | 'standard' | 'fast';

interface TokenBalanceResponse extends TokenBalance {}

interface MultipleTokenBalancesResponse {
  requested: number;
  balances: TokenBalance[];
}

interface EthBalanceResponse {
  address: string;
  balance: string;
  balanceFormatted: string;
}

interface TransactionReceiptResponse {
  txHash: string;
  receipt: TransactionReceipt | null;
}

interface TransactionStatusResponse {
  txHash: string;
  status: 'pending' | 'success' | 'failed' | 'not_found';
}

type WaitForTransactionResponse = TransactionReceipt;

interface GasPriceResponse {
  priority: GasPriority;
  gasPrice: string;
  gasPriceWei: string;
}

interface EstimateGasResponse {
  contractAddress: string;
  methodName: string;
  gasEstimate: string;
}

interface BatchCallResponse {
  requested: number;
  results: unknown[];
}

export interface ContractReadCall {
  contractAddress: string;
  abi: unknown[];
  methodName: string;
  params?: unknown[];
}

export interface WaitForTransactionOptions {
  confirmations?: number;
  timeout?: number;
}

export interface TransactionReceiptOptions {
  maxRetries?: number;
}

export interface GasEstimateRequest {
  contractAddress: string;
  abi: unknown[];
  methodName: string;
  params?: unknown[];
}

const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/i;
const TRANSACTION_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/i;

const sanitizeQuery = (query: Record<string, unknown>): Record<string, unknown> => {
  return Object.entries(query).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const logDebug = (message: string, context?: Record<string, unknown>): void => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug(`[blockchainApi] ${message}`, context ?? {});
  }
};

const logError = (message: string, error: unknown): void => {
  // eslint-disable-next-line no-console
  console.error(`[blockchainApi] ${message}`, error);
};

const throwValidationError = (message: string): never => {
  throw new ApiError(message, 400, 'CLIENT_VALIDATION_ERROR');
};

const sanitizeEthereumAddress = (address: string): string => {
  if (typeof address !== 'string') {
    throwValidationError('Address must be a string');
  }
  const normalized = address.trim();
  if (!ETHEREUM_ADDRESS_REGEX.test(normalized)) {
    throwValidationError('Address must be a valid Ethereum address');
  }
  return normalized;
};

const sanitizeEthereumAddresses = (addresses: string[]): string[] => {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throwValidationError('Addresses must be a non-empty array');
  }

  const unique = new Set<string>();
  addresses.forEach((address) => {
    unique.add(sanitizeEthereumAddress(address));
  });

  return Array.from(unique);
};

const sanitizeTransactionHash = (txHash: string): string => {
  if (typeof txHash !== 'string') {
    throwValidationError('Transaction hash must be a string');
  }
  const normalized = txHash.trim();
  if (!TRANSACTION_HASH_REGEX.test(normalized)) {
    throwValidationError('Transaction hash must be a valid hash');
  }
  return normalized;
};

const sanitizeConfirmations = (confirmations?: number): number | undefined => {
  if (confirmations === undefined) {
    return undefined;
  }

  if (!Number.isInteger(confirmations) || confirmations < 1 || confirmations > 50) {
    throwValidationError('Confirmations must be an integer between 1 and 50');
  }

  return confirmations;
};

const sanitizeTimeout = (timeout?: number): number | undefined => {
  if (timeout === undefined) {
    return undefined;
  }

  if (!Number.isInteger(timeout) || timeout < 1_000 || timeout > 1_800_000) {
    throwValidationError('Timeout must be between 1,000 and 1,800,000 milliseconds');
  }

  return timeout;
};

const sanitizePriority = (priority?: GasPriority): GasPriority | undefined => {
  if (!priority) {
    return undefined;
  }
  if (priority !== 'slow' && priority !== 'standard' && priority !== 'fast') {
    throwValidationError("Priority must be one of 'slow', 'standard', or 'fast'");
  }
  return priority;
};

const sanitizeAbi = (abi: unknown[]): unknown[] => {
  if (!Array.isArray(abi) || abi.length === 0) {
    throwValidationError('ABI must be a non-empty array');
  }
  return abi;
};

const sanitizeParams = (params?: unknown[]): unknown[] => {
  if (params === undefined || params === null) {
    return [];
  }
  if (!Array.isArray(params)) {
    throwValidationError('Params must be an array');
  }
  return params;
};

const sanitizeContractCalls = (calls: ContractReadCall[]): ContractReadCall[] => {
  if (!Array.isArray(calls) || calls.length === 0) {
    throwValidationError('Calls must be a non-empty array');
  }

  return calls.map((call) => {
    if (!call || typeof call !== 'object') {
      throwValidationError('Each call must be an object');
    }

    return {
      contractAddress: sanitizeEthereumAddress(call.contractAddress),
      abi: sanitizeAbi(call.abi),
      methodName: typeof call.methodName === 'string' && call.methodName.trim().length > 0
        ? call.methodName.trim()
        : throwValidationError('Method name is required for each call'),
      params: sanitizeParams(call.params ?? []),
    };
  });
};

/**
 * Blockchain Contracts API
 *
 * Handles blockchain-related utility calls.
 * Routes: /api/blockchain/contracts/*
 */
export const blockchainContractsApi = {
  /**
   * Get ERC20 token balance for an address.
   * GET /blockchain/contracts/token/balance
   */
  async getTokenBalance(address: string): Promise<TokenBalanceResponse> {
    const normalizedAddress = sanitizeEthereumAddress(address);
    try {
      logDebug('Fetching token balance', { address: normalizedAddress });
      const response = await api.get<ApiResponse<TokenBalanceResponse>>(
        '/blockchain/contracts/token/balance',
        {
          params: { address: normalizedAddress },
        },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch token balance',
        500,
      );
    } catch (error) {
      logError('Token balance request failed', error);
      throw error;
    }
  },

  /**
   * Get ERC20 token balances for multiple addresses.
   * POST /blockchain/contracts/token/balances
   */
  async getMultipleTokenBalances(addresses: string[]): Promise<MultipleTokenBalancesResponse> {
    const sanitizedAddresses = sanitizeEthereumAddresses(addresses);
    try {
      logDebug('Fetching multiple token balances', { count: sanitizedAddresses.length });
      const response = await api.post<ApiResponse<MultipleTokenBalancesResponse>>(
        '/blockchain/contracts/token/balances',
        {
          addresses: sanitizedAddresses,
        },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch token balances',
        500,
      );
    } catch (error) {
      logError('Multiple token balances request failed', error);
      throw error;
    }
  },

  /**
   * Get ETH balance for an address.
   * GET /blockchain/contracts/eth/balance
   */
  async getETHBalance(address: string): Promise<EthBalanceResponse> {
    const normalizedAddress = sanitizeEthereumAddress(address);
    try {
      logDebug('Fetching ETH balance', { address: normalizedAddress });
      const response = await api.get<ApiResponse<EthBalanceResponse>>(
        '/blockchain/contracts/eth/balance',
        {
          params: { address: normalizedAddress },
        },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch ETH balance',
        500,
      );
    } catch (error) {
      logError('ETH balance request failed', error);
      throw error;
    }
  },

  /**
   * Get transaction receipt with optional retry logic.
   * GET /blockchain/contracts/transactions/receipt
   */
  async getTransactionReceipt(
    txHash: string,
    options: TransactionReceiptOptions = {},
  ): Promise<TransactionReceiptResponse> {
    const normalizedHash = sanitizeTransactionHash(txHash);
    const { maxRetries } = options;

    if (maxRetries !== undefined && (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 10)) {
      throwValidationError('maxRetries must be an integer between 0 and 10');
    }

    try {
      logDebug('Fetching transaction receipt', { txHash: normalizedHash, maxRetries });
      const response = await api.get<ApiResponse<TransactionReceiptResponse>>(
        '/blockchain/contracts/transactions/receipt',
        {
          params: sanitizeQuery({ txHash: normalizedHash, maxRetries }),
        },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch transaction receipt',
        500,
      );
    } catch (error) {
      logError('Transaction receipt request failed', error);
      throw error;
    }
  },

  /**
   * Get transaction status (pending/success/failed/not_found).
   * GET /blockchain/contracts/transactions/status
   */
  async getTransactionStatus(txHash: string): Promise<TransactionStatusResponse> {
    const normalizedHash = sanitizeTransactionHash(txHash);
    try {
      logDebug('Fetching transaction status', { txHash: normalizedHash });
      const response = await api.get<ApiResponse<TransactionStatusResponse>>(
        '/blockchain/contracts/transactions/status',
        {
          params: { txHash: normalizedHash },
        },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch transaction status',
        500,
      );
    } catch (error) {
      logError('Transaction status request failed', error);
      throw error;
    }
  },

  /**
   * Wait for transaction confirmation.
   * GET /blockchain/contracts/transactions/wait
   */
  async waitForTransaction(
    txHash: string,
    options: WaitForTransactionOptions = {},
  ): Promise<WaitForTransactionResponse> {
    const normalizedHash = sanitizeTransactionHash(txHash);
    const confirmations = sanitizeConfirmations(options.confirmations);
    const timeout = sanitizeTimeout(options.timeout);

    try {
      logDebug('Waiting for transaction confirmation', {
        txHash: normalizedHash,
        confirmations,
        timeout,
      });

      const response = await api.get<ApiResponse<WaitForTransactionResponse>>(
        '/blockchain/contracts/transactions/wait',
        {
          params: sanitizeQuery({
            txHash: normalizedHash,
            confirmations,
            timeout,
          }),
        },
      );

      return baseApi.handleResponse(
        response,
        'Failed to confirm transaction',
        500,
      );
    } catch (error) {
      logError('Wait for transaction request failed', error);
      throw error;
    }
  },

  /**
   * Get current network information.
   * GET /blockchain/contracts/network
   */
  async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      logDebug('Fetching network info');
      const response = await api.get<ApiResponse<NetworkInfo>>(
        '/blockchain/contracts/network',
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch network info',
        500,
      );
    } catch (error) {
      logError('Network info request failed', error);
      throw error;
    }
  },

  /**
   * Get optimal gas price based on priority.
   * GET /blockchain/contracts/gas-price
   */
  async getOptimalGasPrice(priority?: GasPriority): Promise<GasPriceResponse> {
    const sanitizedPriority = sanitizePriority(priority);
    try {
      logDebug('Fetching optimal gas price', { priority: sanitizedPriority });
      const response = await api.get<ApiResponse<GasPriceResponse>>(
        '/blockchain/contracts/gas-price',
        {
          params: sanitizeQuery({ priority: sanitizedPriority }),
        },
      );

      return baseApi.handleResponse(
        response,
        'Failed to fetch gas price',
        500,
      );
    } catch (error) {
      logError('Gas price request failed', error);
      throw error;
    }
  },

  /**
   * Estimate gas for a contract call.
   * POST /blockchain/contracts/gas/estimate
   */
  async estimateGas(request: GasEstimateRequest): Promise<EstimateGasResponse> {
    const contractAddress = sanitizeEthereumAddress(request.contractAddress);
    const abi = sanitizeAbi(request.abi);
    const methodName = typeof request.methodName === 'string' && request.methodName.trim().length > 0
      ? request.methodName.trim()
      : throwValidationError('Method name is required');
    const params = sanitizeParams(request.params);

    try {
      logDebug('Estimating gas', { contractAddress, methodName, paramsCount: params.length });
      const response = await api.post<ApiResponse<EstimateGasResponse>>(
        '/blockchain/contracts/gas/estimate',
        {
          contractAddress,
          abi,
          methodName,
          params,
        },
      );

      return baseApi.handleResponse(
        response,
        'Failed to estimate gas',
        500,
      );
    } catch (error) {
      logError('Gas estimation request failed', error);
      throw error;
    }
  },

  /**
   * Check if an address is a contract.
   * GET /blockchain/contracts/contract/check
   */
  async isContract(address: string): Promise<{ address: string; isContract: boolean }> {
    const normalizedAddress = sanitizeEthereumAddress(address);
    try {
      logDebug('Checking if address is contract', { address: normalizedAddress });
      const response = await api.get<ApiResponse<{ address: string; isContract: boolean }>>(
        '/blockchain/contracts/contract/check',
        {
          params: { address: normalizedAddress },
        },
      );

      return baseApi.handleResponse(
        response,
        'Failed to check contract status',
        500,
      );
    } catch (error) {
      logError('Contract check request failed', error);
      throw error;
    }
  },

  /**
   * Execute batch read-only contract calls.
   * POST /blockchain/contracts/batch-call
   */
  async batchCall(calls: ContractReadCall[]): Promise<BatchCallResponse> {
    const sanitizedCalls = sanitizeContractCalls(calls);
    try {
      logDebug('Executing batch contract calls', { calls: sanitizedCalls.length });
      const response = await api.post<ApiResponse<BatchCallResponse>>(
        '/blockchain/contracts/batch-call',
        {
          calls: sanitizedCalls.map((call) => ({
            ...call,
            params: sanitizeParams(call.params),
          })),
        },
      );

      return baseApi.handleResponse(
        response,
        'Failed to execute batch calls',
        500,
      );
    } catch (error) {
      logError('Batch call request failed', error);
      throw error;
    }
  },
};

export default blockchainContractsApi;

