// src/controllers/features/blockchain/blockchainContracts.controller.ts
// Enhanced blockchain utilities controller

import { Response } from 'express';
import { BlockchainBaseController, BlockchainBaseRequest } from './blockchainBase.controller';
import { BlockchainContractsService } from '../../../services/blockchain/contracts.service';
import { ErrorHelpers } from '../../utils/error.helpers';

interface TokenBalanceRequest extends BlockchainBaseRequest {
  validatedQuery?: {
    address?: string;
  };
}

interface MultipleBalanceRequest extends BlockchainBaseRequest {
  validatedBody?: {
    addresses?: string[];
  };
}

interface TransactionReceiptRequest extends BlockchainBaseRequest {
  validatedQuery?: {
    txHash?: string;
    maxRetries?: number;
  };
}

interface TransactionStatusRequest extends BlockchainBaseRequest {
  validatedQuery?: {
    txHash?: string;
  };
}

interface WaitTransactionRequest extends BlockchainBaseRequest {
  validatedQuery?: {
    txHash?: string;
    confirmations?: number;
    timeout?: number;
  };
}

interface NetworkInfoRequest extends BlockchainBaseRequest {}

interface GasPriceRequest extends BlockchainBaseRequest {
  validatedQuery?: {
    priority?: 'slow' | 'standard' | 'fast';
  };
}

interface EstimateGasRequest extends BlockchainBaseRequest {
  validatedBody?: {
    contractAddress?: string;
    abi?: any[];
    methodName?: string;
    params?: any[];
  };
}

interface IsContractRequest extends BlockchainBaseRequest {
  validatedQuery?: {
    address?: string;
  };
}

interface BatchCallRequest extends BlockchainBaseRequest {
  validatedBody?: {
    calls?: Array<{
      contractAddress: string;
      abi: any[];
      methodName: string;
      params: any[];
    }>;
  };
}

/**
 * Controller exposing enhanced blockchain utility operations
 * Extends basic blockchain functionality with advanced features
 */
export class BlockchainContractsController extends BlockchainBaseController {
  /**
   * Get ERC20 token balance for an address
   */
  async getTokenBalance(req: TokenBalanceRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      await this.captureProviderHealth();
      this.recordPerformance(req, 'BLOCKCHAIN_GET_TOKEN_BALANCE');

      const address = this.requireEthereumAddress(req, 'address');

      const balance = await BlockchainContractsService.getTokenBalance(address);

      this.logAction(req, 'BLOCKCHAIN_GET_TOKEN_BALANCE_SUCCESS', {
        address,
        balance: balance.balanceFormatted
      });

      return {
        address: balance.address,
        balance: balance.balance,
        balanceFormatted: balance.balanceFormatted
      };
    }, res, 'Token balance retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get multiple token balances in a batch
   */
  async getMultipleTokenBalances(req: MultipleBalanceRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      await this.captureProviderHealth();
      this.recordPerformance(req, 'BLOCKCHAIN_GET_MULTIPLE_TOKEN_BALANCES');

      const addresses = req.validatedBody?.addresses ?? (req.body as any)?.addresses;

      if (!Array.isArray(addresses)) {
        throw ErrorHelpers.createError('Addresses must be an array', 400, 'INVALID_ADDRESSES');
      }

      const balances = await BlockchainContractsService.getMultipleTokenBalances(addresses);

      this.logAction(req, 'BLOCKCHAIN_GET_MULTIPLE_TOKEN_BALANCES_SUCCESS', {
        requested: addresses.length,
        returned: balances.length
      });

      return {
        requested: addresses.length,
        balances
      };
    }, res, 'Token balances retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get ETH balance for an address
   */
  async getETHBalance(req: TokenBalanceRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      await this.captureProviderHealth();
      this.recordPerformance(req, 'BLOCKCHAIN_GET_ETH_BALANCE');

      const address = this.requireEthereumAddress(req, 'address');

      const balance = await BlockchainContractsService.getETHBalance(address);

      this.logAction(req, 'BLOCKCHAIN_GET_ETH_BALANCE_SUCCESS', {
        address,
        balance: balance.balanceFormatted
      });

      return {
        address,
        balance: balance.balance,
        balanceFormatted: balance.balanceFormatted
      };
    }, res, 'ETH balance retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get transaction receipt with retry logic
   */
  async getTransactionReceipt(req: TransactionReceiptRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      await this.captureProviderHealth();
      this.recordPerformance(req, 'BLOCKCHAIN_GET_TRANSACTION_RECEIPT');

      const txHash = this.requireTransactionHash(req, 'txHash');

      const maxRetries = req.validatedQuery?.maxRetries ?? (req.query as any)?.maxRetries ?? 3;

      const receipt = await BlockchainContractsService.getTransactionReceipt(txHash, maxRetries);

      this.logAction(req, 'BLOCKCHAIN_GET_TRANSACTION_RECEIPT_SUCCESS', {
        txHash,
        found: !!receipt
      });

      const result = {
        txHash,
        receipt
      };
      
      return result;
    }, res, 'Transaction receipt retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get transaction status (pending/success/failed/not_found)
   */
  async getTransactionStatus(req: TransactionStatusRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'BLOCKCHAIN_GET_TRANSACTION_STATUS');

      const txHash = this.requireTransactionHash(req, 'txHash');

      const status = await BlockchainContractsService.getTransactionStatus(txHash);

      this.logAction(req, 'BLOCKCHAIN_GET_TRANSACTION_STATUS_SUCCESS', {
        txHash,
        status
      });

      return {
        txHash,
        status
      };
    }, res, 'Transaction status retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Wait for transaction confirmation with timeout
   */
  async waitForTransaction(req: WaitTransactionRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      await this.captureProviderHealth();
      this.recordPerformance(req, 'BLOCKCHAIN_WAIT_FOR_TRANSACTION');

      const txHash = this.requireTransactionHash(req, 'txHash');

      const confirmations = req.validatedQuery?.confirmations ?? (req.query as any)?.confirmations ?? 1;

      const timeout = req.validatedQuery?.timeout ?? (req.query as any)?.timeout ?? 300000;

      const receipt = await BlockchainContractsService.waitForTransaction(
        txHash,
        confirmations,
        timeout
      );

      this.logAction(req, 'BLOCKCHAIN_WAIT_FOR_TRANSACTION_SUCCESS', {
        txHash,
        confirmations,
        blockNumber: receipt.blockNumber
      });

      return receipt;
    }, res, 'Transaction confirmed successfully', this.getRequestMeta(req));
  }

  /**
   * Get current network information
   */
  async getNetworkInfo(req: NetworkInfoRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'BLOCKCHAIN_GET_NETWORK_INFO');

      const networkInfo = await BlockchainContractsService.getNetworkInfo();

      this.logAction(req, 'BLOCKCHAIN_GET_NETWORK_INFO_SUCCESS', {
        chainId: networkInfo.chainId,
        blockNumber: networkInfo.blockNumber
      });

      return networkInfo;
    }, res, 'Network information retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get optimal gas price based on priority
   */
  async getOptimalGasPrice(req: GasPriceRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      await this.captureProviderHealth();
      this.recordPerformance(req, 'BLOCKCHAIN_GET_OPTIMAL_GAS_PRICE');

      const priority =
        this.parseGasPriority(req.validatedQuery?.priority ?? (req.query as any)?.priority);

      const gasPrice = await BlockchainContractsService.getOptimalGasPrice(priority);

      this.logAction(req, 'BLOCKCHAIN_GET_OPTIMAL_GAS_PRICE_SUCCESS', {
        priority,
        gasPrice
      });

      return {
        priority,
        gasPrice,
        gasPriceWei: gasPrice
      };
    }, res, 'Optimal gas price retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Estimate gas for a contract call
   */
  async estimateGas(req: EstimateGasRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      await this.captureProviderHealth();
      this.recordPerformance(req, 'BLOCKCHAIN_ESTIMATE_GAS');

      const contractAddress = this.requireEthereumAddress(req, 'contractAddress');

      const abi = req.validatedBody?.abi ?? (req.body as any)?.abi;
      if (!this.validateAbi(abi)) {
        throw ErrorHelpers.createError('ABI must be a non-empty array', 400, 'INVALID_ABI');
      }

      const methodName = this.getRequestString(req, 'methodName');

      if (!methodName) {
        throw ErrorHelpers.createError('Method name is required', 400, 'MISSING_METHOD_NAME');
      }

      const params = this.normalizeParams(
        req.validatedBody?.params ?? (req.body as any)?.params
      );

      const gasEstimate = await BlockchainContractsService.estimateGas(
        contractAddress,
        abi,
        methodName,
        params
      );

      this.logAction(req, 'BLOCKCHAIN_ESTIMATE_GAS_SUCCESS', {
        contractAddress,
        methodName,
        gasEstimate
      });

      return {
        contractAddress,
        methodName,
        gasEstimate
      };
    }, res, 'Gas estimate retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Check if an address is a contract
   */
  async isContract(req: IsContractRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      this.recordPerformance(req, 'BLOCKCHAIN_IS_CONTRACT');

      const address = this.requireEthereumAddress(req, 'address');

      const isContractResult = await BlockchainContractsService.isContract(address);

      this.logAction(req, 'BLOCKCHAIN_IS_CONTRACT_SUCCESS', {
        address,
        isContract: isContractResult
      });

      return {
        address,
        isContract: isContractResult
      };
    }, res, 'Contract check completed successfully', this.getRequestMeta(req));
  }

  /**
   * Execute batch read-only contract calls
   */
  async batchCall(req: BatchCallRequest, res: Response): Promise<void> {
    await this.handleAsync(async () => {
      await this.captureProviderHealth();
      this.recordPerformance(req, 'BLOCKCHAIN_BATCH_CALL');

      const calls =
        req.validatedBody?.calls ?? (req.body as any)?.calls;

      if (!Array.isArray(calls) || calls.length === 0) {
        throw ErrorHelpers.createError('Calls must be a non-empty array', 400, 'INVALID_CALLS');
      }

      const results = await BlockchainContractsService.batchCall(calls);

      this.logAction(req, 'BLOCKCHAIN_BATCH_CALL_SUCCESS', {
        calls: calls.length,
        results: results.length
      });

      return {
        requested: calls.length,
        results
      };
    }, res, 'Batch calls executed successfully', this.getRequestMeta(req));
  }

}

export const blockchainContractsController = new BlockchainContractsController();

