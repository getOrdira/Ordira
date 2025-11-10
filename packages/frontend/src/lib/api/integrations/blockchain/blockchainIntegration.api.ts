// src/lib/api/integrations/blockchain/blockchainIntegration.api.ts
// Blockchain integration API aligned with backend routes/integrations/blockchain/blockchainIntegration.routes.ts

import { api } from '../../client';
import baseApi from '../../core/base.api';
import type { ApiResponse } from '@/lib/types/core';
import { handleApiError } from '@/lib/validation/middleware/apiError';
import {
  sanitizeEthereumAddress,
  sanitizeTransactionHash
} from '@/lib/validation/sanitizers/blockchain';
import { sanitizeOptionalObjectId, sanitizeString } from '@/lib/validation/sanitizers/primitives';

const BASE_PATH = '/integrations/blockchain';

type HttpMethod = 'GET';

const createBlockchainIntegrationLogContext = (
  method: HttpMethod,
  endpoint: string,
  context?: Record<string, unknown>
) => ({
  feature: 'integrations',
  module: 'blockchain',
  method,
  endpoint,
  ...context
});

export interface BlockchainNetworkStatus {
  network: {
    chainId: string | null;
    name: string | null;
  };
  blockNumber: number;
  gas: {
    gasPriceWei: string | null;
    gasPriceEth: string | null;
    maxFeePerGasWei: string | null;
    maxPriorityFeePerGasWei: string | null;
  };
}

export interface BlockchainGasPrice {
  gasPriceWei: string | null;
  gasPriceEth: string | null;
  maxFeePerGasWei: string | null;
  maxPriorityFeePerGasWei: string | null;
}

export interface BlockchainTransactionReceipt {
  txHash: string;
  receipt: Record<string, unknown> | null;
}

export interface BlockchainAddressBalance {
  address: string;
  balanceWei: string;
  balanceEth: string;
}

export interface TransactionReceiptQuery {
  txHash: string;
}

export interface AddressBalanceQuery {
  address: string;
  businessId?: string;
}

const sanitizeTransactionReceiptQuery = (query: TransactionReceiptQuery) => {
  return baseApi.sanitizeQueryParams({
    txHash: sanitizeTransactionHash(query.txHash, 'txHash')
  });
};

const sanitizeAddressBalanceQuery = (query: AddressBalanceQuery) => {
  return baseApi.sanitizeQueryParams({
    address: sanitizeEthereumAddress(query.address, 'address'),
    businessId: sanitizeOptionalObjectId(query.businessId, 'businessId')
  });
};

export const blockchainIntegrationApi = {
  /**
   * Retrieve network status details.
   * GET /api/integrations/blockchain/network/status
   */
  async getNetworkStatus(): Promise<BlockchainNetworkStatus> {
    const endpoint = `${BASE_PATH}/network/status`;

    try {
      const response = await api.get<ApiResponse<BlockchainNetworkStatus>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch blockchain network status',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBlockchainIntegrationLogContext('GET', endpoint)
      );
    }
  },

  /**
   * Retrieve current gas price information.
   * GET /api/integrations/blockchain/gas/price
   */
  async getGasPrice(): Promise<BlockchainGasPrice> {
    const endpoint = `${BASE_PATH}/gas/price`;

    try {
      const response = await api.get<ApiResponse<BlockchainGasPrice>>(endpoint);
      return baseApi.handleResponse(
        response,
        'Failed to fetch blockchain gas price',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBlockchainIntegrationLogContext('GET', endpoint)
      );
    }
  },

  /**
   * Retrieve transaction receipt details.
   * GET /api/integrations/blockchain/transaction/receipt
   */
  async getTransactionReceipt(
    query: TransactionReceiptQuery
  ): Promise<BlockchainTransactionReceipt> {
    const endpoint = `${BASE_PATH}/transaction/receipt`;
    const params = sanitizeTransactionReceiptQuery(query);

    try {
      const response = await api.get<ApiResponse<BlockchainTransactionReceipt>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch blockchain transaction receipt',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBlockchainIntegrationLogContext('GET', endpoint, {
          txHash: params.txHash ? sanitizeString(params.txHash, 'txHash') : undefined
        })
      );
    }
  },

  /**
   * Retrieve balance for a wallet address.
   * GET /api/integrations/blockchain/address/balance
   */
  async getAddressBalance(
    query: AddressBalanceQuery
  ): Promise<BlockchainAddressBalance> {
    const endpoint = `${BASE_PATH}/address/balance`;
    const params = sanitizeAddressBalanceQuery(query);

    try {
      const response = await api.get<ApiResponse<BlockchainAddressBalance>>(endpoint, {
        params
      });
      return baseApi.handleResponse(
        response,
        'Failed to fetch blockchain address balance',
        500
      );
    } catch (error) {
      throw handleApiError(
        error,
        createBlockchainIntegrationLogContext('GET', endpoint, {
          address: params.address
        })
      );
    }
  }
};

export default blockchainIntegrationApi;