// src/services/blockchain/provider.service.ts

import { JsonRpcProvider, Wallet, Contract } from 'ethers';

export class BlockchainProviderService {
  private static provider: JsonRpcProvider | null = null;
  private static signer: Wallet | null = null;

  /**
   * Get the blockchain provider (singleton pattern for efficiency)
   */
  static getProvider(): JsonRpcProvider {
    if (!this.provider) {
      const rpcUrl = process.env.BASE_RPC_URL || process.env.RPC_URL;
      if (!rpcUrl) {
        throw new Error('Missing BASE_RPC_URL or RPC_URL environment variable');
      }
      this.provider = new JsonRpcProvider(rpcUrl);
    }
    return this.provider;
  }

  /**
   * Get the blockchain signer (singleton pattern for efficiency)
   */
  static getSigner(): Wallet {
    if (!this.signer) {
      const pk = process.env.PRIVATE_KEY;
      if (!pk) {
        throw new Error('Missing PRIVATE_KEY environment variable');
      }
      this.signer = new Wallet(pk, this.getProvider());
    }
    return this.signer;
  }

  /**
   * Create a contract instance with the signer
   */
  static getContract(address: string, abi: any): Contract {
    return new Contract(address, abi, this.getSigner());
  }

  /**
   * Create a read-only contract instance with the provider
   */
  static getReadOnlyContract(address: string, abi: any): Contract {
    return new Contract(address, abi, this.getProvider());
  }

  /**
   * Get current block number
   */
  static async getCurrentBlockNumber(): Promise<number> {
    return this.getProvider().getBlockNumber();
  }

  /**
   * Get network information
   */
  static async getNetwork() {
    return this.getProvider().getNetwork();
  }

  /**
   * Get gas price
   */
  static async getGasPrice() {
    return this.getProvider().getFeeData();
  }

  /**
   * Wait for transaction confirmation
   */
  static async waitForTransaction(txHash: string, confirmations: number = 1) {
    return this.getProvider().waitForTransaction(txHash, confirmations);
  }

  /**
   * Get transaction receipt
   */
  static async getTransactionReceipt(txHash: string) {
    return this.getProvider().getTransactionReceipt(txHash);
  }

  /**
   * Get balance of an address
   */
  static async getBalance(address: string) {
    return this.getProvider().getBalance(address);
  }
}