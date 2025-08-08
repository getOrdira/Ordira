// services/blockchain/contracts.service.ts
import { Contract, formatUnits } from 'ethers';
import { BlockchainProviderService } from './provider.service';
import { TokenBalance, TransactionReceipt, NetworkInfo } from '../types/blockchain.types';
import erc20Abi from '../../abi/erc20Minimal.json';

/**
 * General blockchain utilities and contract interactions
 * Handles common blockchain operations across different contract types
 */
export class BlockchainContractsService {
  
  /**
   * Get the token contract instance
   */
  private static getTokenContract(): Contract {
    const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
    if (!tokenAddress) {
      throw new Error('TOKEN_CONTRACT_ADDRESS not configured');
    }
    return BlockchainProviderService.getReadOnlyContract(tokenAddress, erc20Abi);
  }

  /**
   * Get ERC20 token balance for an address
   */
  static async getTokenBalance(walletAddress: string): Promise<TokenBalance> {
    try {
      const tokenContract = this.getTokenContract();
      const balance = await tokenContract.balanceOf(walletAddress);
      const balanceFormatted = formatUnits(balance, 18);
      
      return {
        address: walletAddress,
        balance: balance.toString(),
        balanceFormatted
      };
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }

  /**
   * Get multiple token balances in a single call
   */
  static async getMultipleTokenBalances(addresses: string[]): Promise<TokenBalance[]> {
    try {
      const balancePromises = addresses.map(address => 
        this.getTokenBalance(address)
      );
      
      return await Promise.all(balancePromises);
    } catch (error) {
      throw new Error(`Failed to get multiple token balances: ${error.message}`);
    }
  }

  /**
   * Get transaction receipt with retry logic
   */
  static async getTransactionReceipt(
    txHash: string, 
    maxRetries: number = 3
  ): Promise<TransactionReceipt | null> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const receipt = await BlockchainProviderService.getTransactionReceipt(txHash);
        
        if (!receipt) {
          if (i === maxRetries - 1) return null;
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        return {
          txHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status || 0
        };
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`Failed to get transaction receipt: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    return null;
  }

  /**
   * Wait for transaction confirmation
   */
  static async waitForTransaction(
    txHash: string, 
    confirmations: number = 1,
    timeout: number = 300000 // 5 minutes
  ): Promise<TransactionReceipt> {
    try {
      const receipt = await BlockchainProviderService.waitForTransaction(txHash, confirmations);
      
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status || 0
      };
    } catch (error) {
      throw new Error(`Failed to wait for transaction: ${error.message}`);
    }
  }

  /**
   * Get current network information
   */
  static async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      const [network, blockNumber, feeData] = await Promise.all([
        BlockchainProviderService.getNetwork(),
        BlockchainProviderService.getCurrentBlockNumber(),
        BlockchainProviderService.getGasPrice()
      ]);

      return {
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: feeData.gasPrice?.toString() || '0',
        network: network.name
      };
    } catch (error) {
      throw new Error(`Failed to get network info: ${error.message}`);
    }
  }

  /**
   * Estimate gas for a contract call
   */
  static async estimateGas(
    contractAddress: string,
    abi: any[],
    methodName: string,
    params: any[]
  ): Promise<string> {
    try {
      const contract = BlockchainProviderService.getContract(contractAddress, abi);
      const gasEstimate = await contract[methodName].estimateGas(...params);
      
      // Add 20% buffer to the estimate
      const gasWithBuffer = gasEstimate * BigInt(120) / BigInt(100);
      
      return gasWithBuffer.toString();
    } catch (error) {
      throw new Error(`Failed to estimate gas: ${error.message}`);
    }
  }

  /**
   * Check if an address is a valid Ethereum address
   */
  static isValidAddress(address: string): boolean {
    try {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if an address is a contract (has code)
   */
  static async isContract(address: string): Promise<boolean> {
    try {
      const provider = BlockchainProviderService.getProvider();
      const code = await provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get ETH balance for an address
   */
  static async getETHBalance(address: string): Promise<{
    balance: string;
    balanceFormatted: string;
  }> {
    try {
      const balance = await BlockchainProviderService.getBalance(address);
      const balanceFormatted = formatUnits(balance, 18);
      
      return {
        balance: balance.toString(),
        balanceFormatted
      };
    } catch (error) {
      throw new Error(`Failed to get ETH balance: ${error.message}`);
    }
  }

  /**
   * Execute a transaction with retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  /**
   * Get optimal gas price based on network conditions
   */
  static async getOptimalGasPrice(priority: 'slow' | 'standard' | 'fast' = 'standard'): Promise<string> {
    try {
      const feeData = await BlockchainProviderService.getGasPrice();
      const baseGasPrice = feeData.gasPrice!;
      
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
      
      return (baseGasPrice * BigInt(multiplier) / BigInt(100)).toString();
    } catch (error) {
      throw new Error(`Failed to get optimal gas price: ${error.message}`);
    }
  }

  /**
   * Batch multiple read-only contract calls
   */
  static async batchCall(calls: Array<{
    contractAddress: string;
    abi: any[];
    methodName: string;
    params: any[];
  }>): Promise<any[]> {
    try {
      const promises = calls.map(call => {
        const contract = BlockchainProviderService.getReadOnlyContract(call.contractAddress, call.abi);
        return contract[call.methodName](...call.params);
      });
      
      return await Promise.all(promises);
    } catch (error) {
      throw new Error(`Failed to execute batch calls: ${error.message}`);
    }
  }

  /**
   * Check transaction status
   */
  static async getTransactionStatus(txHash: string): Promise<'pending' | 'success' | 'failed' | 'not_found'> {
    try {
      const provider = BlockchainProviderService.getProvider();
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        // Check if transaction exists in mempool
        const tx = await provider.getTransaction(txHash);
        return tx ? 'pending' : 'not_found';
      }
      
      return receipt.status === 1 ? 'success' : 'failed';
    } catch (error) {
      return 'not_found';
    }
  }

  /**
   * Get vote events from a voting contract (used by analytics)
   */
  static async getVoteEventsFromContract(contractAddress: string) {
    try {
      // Import the VotingService to delegate to it
      const { VotingService } = await import('./voting.service');
      return VotingService.getVoteEvents(contractAddress);
    } catch (error) {
      throw new Error(`Failed to get vote events: ${error.message}`);
    }
  }
}