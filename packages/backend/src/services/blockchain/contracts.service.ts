// services/blockchain/contracts.service.ts
import { Contract, formatUnits } from 'ethers';
import { logger } from '../../utils/logger';
import { BlockchainProviderService } from './provider.service';
import { TokenBalance, TransactionReceipt, NetworkInfo } from '../types/blockchain.types';
import erc20Abi from '../../abi/erc20Minimal.json';
import { 
  getErrorMessage, 
  createAppError
} from '../../middleware/error.middleware';
import { UtilsService } from '../utils/utils.service';

/**
 * Enhanced blockchain utilities and contract interactions
 * Handles common blockchain operations across different contract types with robust error handling
 */
export class BlockchainContractsService {
  
  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Private Utility Methods                                                   */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Validate Ethereum address format
   */
  private static validateAddress(address: string, paramName: string = 'address'): void {
    if (!address || typeof address !== 'string') {
      throw createAppError(`${paramName} is required and must be a string`, 400);
    }

    if (!this.isValidAddress(address)) {
      throw createAppError(`Invalid ${paramName} format: ${address}`, 400);
    }
  }

  /**
   * Validate transaction hash format
   */
  private static validateTxHash(txHash: string): void {
    if (!txHash || typeof txHash !== 'string') {
      throw createAppError('Transaction hash is required and must be a string', 400);
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      throw createAppError(`Invalid transaction hash format: ${txHash}`, 400);
    }
  }

  /**
   * Get the token contract instance with validation
   */
  private static getTokenContract(): Contract {
    const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
    if (!tokenAddress) {
      throw createAppError(
        'TOKEN_CONTRACT_ADDRESS environment variable not configured', 
        500, 
        'MISSING_CONFIG'
      );
    }

    this.validateAddress(tokenAddress, 'TOKEN_CONTRACT_ADDRESS');

    try {
      return BlockchainProviderService.getReadOnlyContract(tokenAddress, erc20Abi);
    } catch (error) {
      throw createAppError(
        `Failed to initialize token contract: ${getErrorMessage(error)}`, 
        500, 
        'CONTRACT_INIT_ERROR'
      );
    }
  }

  /**
   * Log blockchain operation with context
   */
  private static logBlockchainOperation(
    operation: string, 
    success: boolean, 
    metadata?: Record<string, any>
  ): void {
    const timestamp = UtilsService.formatDate(new Date(), {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    logger.info(`[BLOCKCHAIN] ${timestamp} - ${operation} - ${success ? 'SUCCESS' : 'FAILED'}${metadata ? ` - ${JSON.stringify(metadata)}` : ''}`);
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Token Balance Methods                                                     */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Get ERC20 token balance for an address with enhanced error handling
   */
  static async getTokenBalance(walletAddress: string): Promise<TokenBalance> {
    this.validateAddress(walletAddress, 'walletAddress');

    try {
      const tokenContract = this.getTokenContract();
      const balance = await tokenContract.balanceOf(walletAddress);
      const balanceFormatted = formatUnits(balance, 18);
      
      const result = {
        address: walletAddress,
        balance: balance.toString(),
        balanceFormatted
      };

      this.logBlockchainOperation('GET_TOKEN_BALANCE', true, {
        address: walletAddress,
        balance: balanceFormatted
      });

      return result;
    } catch (error) {
      this.logBlockchainOperation('GET_TOKEN_BALANCE', false, {
        address: walletAddress,
        error: getErrorMessage(error)
      });

      throw createAppError(
        `Failed to get token balance for ${walletAddress}: ${getErrorMessage(error)}`, 
        500, 
        'TOKEN_BALANCE_ERROR'
      );
    }
  }

  /**
   * Get multiple token balances with enhanced error handling and partial failure support
   */
  static async getMultipleTokenBalances(addresses: string[]): Promise<TokenBalance[]> {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw createAppError('Addresses array is required and cannot be empty', 400);
    }

    if (addresses.length > 100) {
      throw createAppError('Maximum 100 addresses allowed per batch request', 400);
    }

    // Validate all addresses first
    addresses.forEach((address, index) => {
      this.validateAddress(address, `addresses[${index}]`);
    });

    const results: TokenBalance[] = [];
    const errors: Array<{ address: string; error: string }> = [];

    // Process in smaller batches to avoid overwhelming the RPC
    const batchSize = 10;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (address) => {
        try {
          return await this.getTokenBalance(address);
        } catch (error) {
          errors.push({
            address,
            error: getErrorMessage(error)
          });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null) as TokenBalance[]);
    }

    this.logBlockchainOperation('GET_MULTIPLE_TOKEN_BALANCES', true, {
      requested: addresses.length,
      successful: results.length,
      failed: errors.length
    });

    if (errors.length > 0 && results.length === 0) {
      throw createAppError(
        `Failed to get any token balances. Errors: ${errors.map(e => `${e.address}: ${e.error}`).join('; ')}`, 
        500, 
        'BATCH_TOKEN_BALANCE_ERROR'
      );
    }

    return results;
  }

  /**
   * Get ETH balance for an address with enhanced error handling
   */
  static async getETHBalance(address: string): Promise<{
    balance: string;
    balanceFormatted: string;
  }> {
    this.validateAddress(address, 'address');

    try {
      const balance = await BlockchainProviderService.getBalance(address);
      const balanceFormatted = formatUnits(balance, 18);
      
      const result = {
        balance: balance.toString(),
        balanceFormatted
      };

      this.logBlockchainOperation('GET_ETH_BALANCE', true, {
        address,
        balance: balanceFormatted
      });

      return result;
    } catch (error) {
      this.logBlockchainOperation('GET_ETH_BALANCE', false, {
        address,
        error: getErrorMessage(error)
      });

      throw createAppError(
        `Failed to get ETH balance for ${address}: ${getErrorMessage(error)}`, 
        500, 
        'ETH_BALANCE_ERROR'
      );
    }
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Transaction Methods                                                       */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Get transaction receipt with enhanced retry logic and validation
   */
  static async getTransactionReceipt(
    txHash: string, 
    maxRetries: number = 3
  ): Promise<TransactionReceipt | null> {
    this.validateTxHash(txHash);

    if (typeof maxRetries !== 'number' || maxRetries < 1 || maxRetries > 10) {
      throw createAppError('maxRetries must be a number between 1 and 10', 400);
    }

    return UtilsService.retry(async () => {
      try {
        const receipt = await BlockchainProviderService.getTransactionReceipt(txHash);
        
        if (!receipt) {
          return null;
        }

        const result = {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status || 0
        };

        this.logBlockchainOperation('GET_TRANSACTION_RECEIPT', true, {
          txHash,
          blockNumber: receipt.blockNumber,
          status: receipt.status
        });

        return result;
      } catch (error) {
        this.logBlockchainOperation('GET_TRANSACTION_RECEIPT', false, {
          txHash,
          error: getErrorMessage(error)
        });

        throw createAppError(
          `Failed to get transaction receipt for ${txHash}: ${getErrorMessage(error)}`, 
          500, 
          'TRANSACTION_RECEIPT_ERROR'
        );
      }
    }, maxRetries, 2000);
  }

  /**
   * Wait for transaction confirmation with enhanced error handling
   */
  static async waitForTransaction(
    txHash: string, 
    confirmations: number = 1,
    timeout: number = 300000 // 5 minutes
  ): Promise<TransactionReceipt> {
    this.validateTxHash(txHash);

    if (typeof confirmations !== 'number' || confirmations < 1 || confirmations > 50) {
      throw createAppError('confirmations must be a number between 1 and 50', 400);
    }

    if (typeof timeout !== 'number' || timeout < 1000 || timeout > 1800000) { // Max 30 minutes
      throw createAppError('timeout must be a number between 1000ms and 1800000ms (30 minutes)', 400);
    }

    try {
      const startTime = Date.now();
      const receipt = await BlockchainProviderService.waitForTransaction(txHash, confirmations);
      const elapsedTime = Date.now() - startTime;
      
      if (!receipt) {
        throw createAppError(
          `Transaction receipt not found for ${txHash}`, 
          404, 
          'TRANSACTION_NOT_FOUND'
        );
      }

      const result = {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status || 0
      };

      this.logBlockchainOperation('WAIT_FOR_TRANSACTION', true, {
        txHash,
        confirmations,
        elapsedTime,
        blockNumber: receipt.blockNumber
      });

      return result;
    } catch (error) {
      this.logBlockchainOperation('WAIT_FOR_TRANSACTION', false, {
        txHash,
        confirmations,
        error: getErrorMessage(error)
      });

      throw createAppError(
        `Failed to wait for transaction ${txHash}: ${getErrorMessage(error)}`, 
        500, 
        'TRANSACTION_WAIT_ERROR'
      );
    }
  }

  /**
   * Check transaction status with enhanced validation
   */
  static async getTransactionStatus(txHash: string): Promise<'pending' | 'success' | 'failed' | 'not_found'> {
    this.validateTxHash(txHash);

    try {
      const provider = BlockchainProviderService.getProvider();
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        // Check if transaction exists in mempool
        try {
          const tx = await provider.getTransaction(txHash);
          const status = tx ? 'pending' : 'not_found';
          
          this.logBlockchainOperation('GET_TRANSACTION_STATUS', true, {
            txHash,
            status
          });

          return status;
        } catch (mempoolError) {
          this.logBlockchainOperation('GET_TRANSACTION_STATUS', true, {
            txHash,
            status: 'not_found',
            note: 'Not found in mempool either'
          });

          return 'not_found';
        }
      }
      
      const status = receipt.status === 1 ? 'success' : 'failed';
      
      this.logBlockchainOperation('GET_TRANSACTION_STATUS', true, {
        txHash,
        status,
        blockNumber: receipt.blockNumber
      });

      return status;
    } catch (error) {
      this.logBlockchainOperation('GET_TRANSACTION_STATUS', false, {
        txHash,
        error: getErrorMessage(error)
      });

      // Don't throw error for status check - return not_found instead
      return 'not_found';
    }
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Network and Gas Methods                                                   */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Get current network information with enhanced error handling
   */
  static async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      const [network, blockNumber, feeData] = await Promise.all([
        BlockchainProviderService.getNetwork(),
        BlockchainProviderService.getCurrentBlockNumber(),
        BlockchainProviderService.getGasPrice()
      ]);

      const result = {
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: feeData.gasPrice?.toString() || '0',
        network: network.name
      };

      this.logBlockchainOperation('GET_NETWORK_INFO', true, {
        chainId: result.chainId,
        blockNumber: result.blockNumber,
        network: result.network
      });

      return result;
    } catch (error) {
      this.logBlockchainOperation('GET_NETWORK_INFO', false, {
        error: getErrorMessage(error)
      });

      throw createAppError(
        `Failed to get network info: ${getErrorMessage(error)}`, 
        500, 
        'NETWORK_INFO_ERROR'
      );
    }
  }

  /**
   * Get optimal gas price with enhanced validation and error handling
   */
  static async getOptimalGasPrice(priority: 'slow' | 'standard' | 'fast' = 'standard'): Promise<string> {
    if (!['slow', 'standard', 'fast'].includes(priority)) {
      throw createAppError('priority must be one of: slow, standard, fast');
    }

    try {
      const feeData = await BlockchainProviderService.getGasPrice();
      const baseGasPrice = feeData.gasPrice;
      
      if (!baseGasPrice) {
        throw createAppError(
          'Unable to fetch current gas price from network', 
          500, 
          'GAS_PRICE_UNAVAILABLE'
        );
      }
      
      let multiplier: number;
      switch (priority) {
        case 'slow':
          multiplier = 100; // No increase
          break;
        case 'fast':
          multiplier = 125; // 25% increase
          break;
        default:
          multiplier = 110; // 10% increase
      }
      
      const result = (baseGasPrice * BigInt(multiplier) / BigInt(100)).toString();

      this.logBlockchainOperation('GET_OPTIMAL_GAS_PRICE', true, {
        priority,
        baseGasPrice: baseGasPrice.toString(),
        multiplier,
        result
      });

      return result;
    } catch (error) {
      this.logBlockchainOperation('GET_OPTIMAL_GAS_PRICE', false, {
        priority,
        error: getErrorMessage(error)
      });

      throw createAppError(
        `Failed to get optimal gas price: ${getErrorMessage(error)}`, 
        500, 
        'GAS_PRICE_ERROR'
      );
    }
  }

  /**
   * Estimate gas for a contract call with enhanced validation
   */
  static async estimateGas(
    contractAddress: string,
    abi: any[],
    methodName: string,
    params: any[]
  ): Promise<string> {
    this.validateAddress(contractAddress, 'contractAddress');

    if (!Array.isArray(abi) || abi.length === 0) {
      throw createAppError('ABI is required and must be a non-empty array', 400);
    }

    if (!methodName || typeof methodName !== 'string') {
      throw createAppError('methodName is required and must be a string', 400);
    }

    if (!Array.isArray(params)) {
      throw createAppError('params must be an array', 400);
    }

    try {
      const contract = BlockchainProviderService.getContract(contractAddress, abi);
      
      if (typeof contract[methodName] !== 'function') {
        throw createAppError(`Method '${methodName}' not found in contract ABI`, 400);
      }

      const gasEstimate = await contract[methodName].estimateGas(...params);
      
      // Add 20% buffer to the estimate
      const gasWithBuffer = gasEstimate * BigInt(120) / BigInt(100);
      const result = gasWithBuffer.toString();

      this.logBlockchainOperation('ESTIMATE_GAS', true, {
        contractAddress,
        methodName,
        gasEstimate: gasEstimate.toString(),
        gasWithBuffer: result
      });

      return result;
    } catch (error) {
      this.logBlockchainOperation('ESTIMATE_GAS', false, {
        contractAddress,
        methodName,
        error: getErrorMessage(error)
      });

      throw createAppError(
        `Failed to estimate gas for ${methodName}: ${getErrorMessage(error)}`, 
        500, 
        'GAS_ESTIMATION_ERROR'
      );
    }
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Utility and Validation Methods                                            */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Check if an address is a valid Ethereum address
   */
  static isValidAddress(address: string): boolean {
    try {
      return typeof address === 'string' && /^0x[a-fA-F0-9]{40}$/.test(address);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if an address is a contract with enhanced error handling
   */
  static async isContract(address: string): Promise<boolean> {
    this.validateAddress(address, 'address');

    try {
      const provider = BlockchainProviderService.getProvider();
      const code = await provider.getCode(address);
      const isContract = code !== '0x';

      this.logBlockchainOperation('IS_CONTRACT', true, {
        address,
        isContract,
        codeLength: code.length
      });

      return isContract;
    } catch (error) {
      this.logBlockchainOperation('IS_CONTRACT', false, {
        address,
        error: getErrorMessage(error)
      });

      // Return false instead of throwing for this utility method
      return false;
    }
  }

  /** ─────────────────────────────────────────────────────────────────────────── */
  /** Batch Operations                                                          */
  /** ─────────────────────────────────────────────────────────────────────────── */

  /**
   * Batch multiple read-only contract calls with enhanced error handling
   */
  static async batchCall(calls: Array<{
    contractAddress: string;
    abi: any[];
    methodName: string;
    params: any[];
  }>): Promise<any[]> {
    if (!Array.isArray(calls) || calls.length === 0) {
      throw createAppError('calls array is required and cannot be empty', 400);
    }

    if (calls.length > 50) {
      throw createAppError('Maximum 50 calls allowed per batch request', 400);
    }

    // Validate all calls first
    calls.forEach((call, index) => {
      if (!call || typeof call !== 'object') {
        throw createAppError(`calls[${index}] must be an object`, 400);
      }

      this.validateAddress(call.contractAddress, `calls[${index}].contractAddress`);

      if (!Array.isArray(call.abi)) {
        throw createAppError(`calls[${index}].abi must be an array`, 400);
      }

      if (!call.methodName || typeof call.methodName !== 'string') {
        throw createAppError(`calls[${index}].methodName is required and must be a string`, 400);
      }

      if (!Array.isArray(call.params)) {
        throw createAppError(`calls[${index}].params must be an array`, 400);
      }
    });

    try {
      const promises = calls.map(async (call, index) => {
        try {
          const contract = BlockchainProviderService.getReadOnlyContract(call.contractAddress, call.abi);
          return await contract[call.methodName](...call.params);
        } catch (error) {
          throw createAppError(
            `Batch call ${index} failed: ${getErrorMessage(error)}`, 
            500, 
            'BATCH_CALL_ITEM_ERROR'
          );
        }
      });
      
      const results = await Promise.all(promises);

      this.logBlockchainOperation('BATCH_CALL', true, {
        totalCalls: calls.length,
        successfulCalls: results.length
      });

      return results;
    } catch (error) {
      this.logBlockchainOperation('BATCH_CALL', false, {
        totalCalls: calls.length,
        error: getErrorMessage(error)
      });

      throw createAppError(
        `Failed to execute batch calls: ${getErrorMessage(error)}`, 
        500, 
        'BATCH_CALL_ERROR'
      );
    }
  }

  /**
   * Execute operation with retry logic using UtilsService
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    if (typeof maxRetries !== 'number' || maxRetries < 1 || maxRetries > 10) {
      throw createAppError('maxRetries must be a number between 1 and 10', 400);
    }

    if (typeof baseDelay !== 'number' || baseDelay < 100 || baseDelay > 10000) {
      throw createAppError('baseDelay must be a number between 100 and 10000 milliseconds', 400);
    }

    try {
      return await UtilsService.retry(operation, maxRetries, baseDelay);
    } catch (error) {
      throw createAppError(
        `Operation failed after ${maxRetries} attempts: ${getErrorMessage(error)}`, 
        500, 
        'RETRY_EXHAUSTED'
      );
    }
  }

  /**
   * Get vote events from a voting contract with enhanced error handling
   */
  static async getVoteEventsFromContract(contractAddress: string) {
    this.validateAddress(contractAddress, 'contractAddress');

    try {
      // Dynamic import to avoid circular dependencies
      const { VotingService } = await import('./voting.service');
      const result = await VotingService.getVoteEvents(contractAddress);

      this.logBlockchainOperation('GET_VOTE_EVENTS', true, {
        contractAddress,
        eventsCount: Array.isArray(result) ? result.length : 0
      });

      return result;
    } catch (error) {
      this.logBlockchainOperation('GET_VOTE_EVENTS', false, {
        contractAddress,
        error: getErrorMessage(error)
      });

      throw createAppError(
        `Failed to get vote events from contract ${contractAddress}: ${getErrorMessage(error)}`, 
        500, 
        'VOTE_EVENTS_ERROR'
      );
    }
  }
}