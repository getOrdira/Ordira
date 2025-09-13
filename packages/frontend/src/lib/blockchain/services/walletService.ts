// src/lib/blockchain/services/walletService.ts
import apiClient from '@/lib/api/client';
import { createPublicClient, http, verifyMessage, getAddress } from 'viem';
import { supportedChains, getChainConfig, isChainSupported } from '../config/chains';
import type { Address, Hash } from 'viem';

// Types
interface WalletConnection {
  address: Address;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number;
  isVerified?: boolean;
  verificationTxHash?: string;
  ensName?: string;
}

interface WalletVerificationChallenge {
  message: string;
  nonce: string;
  expiresAt: string;
  challengeId: string;
}

interface WalletVerificationRequest {
  walletAddress: Address;
  signature: string;
  message: string;
  challengeId: string;
  chainId?: number;
}

interface WalletVerificationResponse {
  success: boolean;
  verified: boolean;
  txHash?: string;
  expiresAt?: string;
  features: string[];
  message: string;
}

interface WalletOverview {
  isConnected: boolean;
  address?: Address;
  chainId?: number;
  networkName?: string;
  isVerified?: boolean;
  verificationStatus?: 'verified' | 'pending' | 'unverified' | 'failed';
  lastVerificationAt?: string;
  walletType?: string;
  canReceiveTransfers?: boolean;
  web3Features: {
    tokenDiscounts: boolean;
    certificateTransfers: boolean;
    voting: boolean;
  };
}

interface WalletSecuritySettings {
  requireSignatureForTransfers: boolean;
  enableMultisig: boolean;
  multisigThreshold: number;
  allowedSigners: Address[];
  sessionTimeout: number;
  lastUpdated: string;
}

interface WalletAnalytics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalGasUsed: string;
  averageGasPrice: string;
  certificatesReceived: number;
  certificatesTransferred: number;
  tokenBalance: {
    current: string;
    highest: string;
    lowest: string;
  };
  discountsUsed: number;
  discountsSaved: string;
}

interface ConnectWalletRequest {
  walletAddress: Address;
  chainId: number;
  walletType?: string;
  signature?: string;
}

interface ConnectWalletResponse {
  success: boolean;
  requiresVerification: boolean;
  verificationMessage?: string;
  features: string[];
  message: string;
}

class WalletService {
  private publicClients: Map<number, any> = new Map();

  constructor() {
    // Initialize public clients for supported chains
    supportedChains.forEach(chain => {
      const chainConfig = getChainConfig(chain.id);
      if (chainConfig?.rpcUrl) {
        this.publicClients.set(chain.id, createPublicClient({
          chain,
          transport: http(chainConfig.rpcUrl),
        }));
      }
    });
  }

  // ======================
  // WALLET CONNECTION AND REGISTRATION
  // ======================

  /**
   * Register wallet connection with backend
   */
  async connectWallet(request: ConnectWalletRequest): Promise<ConnectWalletResponse> {
    const response = await apiClient.post<ConnectWalletResponse>('/brands/wallet/connect', request);
    return response;
  }

  /**
   * Get wallet overview from backend
   */
  async getWalletOverview(walletAddress?: Address): Promise<WalletOverview> {
    const url = walletAddress 
      ? `/brands/wallet?address=${walletAddress}` 
      : '/brands/wallet';
    
    const response = await apiClient.get<WalletOverview>(url);
    return response;
  }

  /**
   * Disconnect wallet from backend
   */
  async disconnectWallet(removeFromBackend = true): Promise<{ success: boolean }> {
    if (removeFromBackend) {
      const response = await apiClient.delete<{ success: boolean }>('/brands/wallet/disconnect');
      return response;
    }
    return { success: true };
  }

  /**
   * Get wallet health status
   */
  async getWalletHealth(walletAddress: Address, chainId: number): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
    lastChecked: string;
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
    networkLatency?: number;
  }> {
    const response = await apiClient.get<{
      isHealthy: boolean;
      issues: string[];
      recommendations: string[];
      lastChecked: string;
      connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
      networkLatency?: number;
    }>(`/brands/wallet/health?address=${walletAddress}&chainId=${chainId}`);
    return response;
  }

  // ======================
  // WALLET VERIFICATION
  // ======================

  /**
   * Request verification challenge from backend
   */
  async requestVerificationChallenge(walletAddress: Address): Promise<WalletVerificationChallenge> {
    const response = await apiClient.post<WalletVerificationChallenge>('/brands/wallet/verify/challenge', {
      walletAddress,
    });
    return response;
  }

  /**
   * Submit wallet verification
   */
  async verifyWallet(request: WalletVerificationRequest): Promise<WalletVerificationResponse> {
    const response = await apiClient.post<WalletVerificationResponse>('/brands/wallet/verify', request);
    return response;
  }

  /**
   * Get wallet verification status
   */
  async getVerificationStatus(walletAddress: Address): Promise<{
    isVerified: boolean;
    verifiedAt?: string;
    verificationTxHash?: string;
    expiresAt?: string;
    requiresReverification: boolean;
    verificationMethod: 'signature' | 'transaction' | 'none';
    lastAttempt?: {
      timestamp: string;
      status: 'success' | 'failed' | 'pending';
      error?: string;
    };
  }> {
    const response = await apiClient.get<{
      isVerified: boolean;
      verifiedAt?: string;
      verificationTxHash?: string;
      expiresAt?: string;
      requiresReverification: boolean;
      verificationMethod: 'signature' | 'transaction' | 'none';
      lastAttempt?: {
        timestamp: string;
        status: 'success' | 'failed' | 'pending';
        error?: string;
      };
    }>(`/brands/wallet/verify/status?address=${walletAddress}`);
    return response;
  }

  /**
   * Revoke wallet verification
   */
  async revokeVerification(walletAddress: Address, reason?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>('/brands/wallet/verify/revoke', {
      walletAddress,
      reason,
    });
    return response;
  }

  /**
   * Get verification history
   */
  async getVerificationHistory(walletAddress: Address): Promise<{
    verifications: Array<{
      id: string;
      timestamp: string;
      status: 'success' | 'failed' | 'expired';
      method: 'signature' | 'transaction';
      txHash?: string;
      expiresAt?: string;
      ipAddress?: string;
      userAgent?: string;
    }>;
    totalVerifications: number;
    lastSuccessfulVerification?: string;
    securityScore: number;
  }> {
    const response = await apiClient.get<{
      verifications: Array<{
        id: string;
        timestamp: string;
        status: 'success' | 'failed' | 'expired';
        method: 'signature' | 'transaction';
        txHash?: string;
        expiresAt?: string;
        ipAddress?: string;
        userAgent?: string;
      }>;
      totalVerifications: number;
      lastSuccessfulVerification?: string;
      securityScore: number;
    }>(`/brands/wallet/verify/history?address=${walletAddress}`);
    return response;
  }

  // ======================
  // CLIENT-SIDE VERIFICATION UTILITIES
  // ======================

  /**
   * Verify a signature locally (client-side verification)
   */
  async verifySignature(
    message: string,
    signature: string,
    expectedAddress: Address
  ): Promise<boolean> {
    try {
      const isValid = await verifyMessage({
        address: expectedAddress,
        message,
        signature: signature as Hash,
      });
      return isValid;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generate verification message
   */
  generateVerificationMessage(
    walletAddress: Address,
    nonce: string,
    domain: string = 'B2B Manufacturing Platform'
  ): string {
    const timestamp = new Date().toISOString();
    return `${domain}

I am the owner of wallet address: ${walletAddress}

This signature proves my ownership of this wallet address.

Nonce: ${nonce}
Timestamp: ${timestamp}

This signature is only valid for wallet verification on ${domain}.`;
  }

  /**
   * Validate wallet address format
   */
  isValidWalletAddress(address: string): boolean {
    try {
      getAddress(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalize wallet address (checksum)
   */
  normalizeWalletAddress(address: string): Address {
    return getAddress(address);
  }

  // ======================
  // WALLET SECURITY AND SETTINGS
  // ======================

  /**
   * Get wallet security settings
   */
  async getSecuritySettings(): Promise<WalletSecuritySettings> {
    const response = await apiClient.get<WalletSecuritySettings>('/brands/wallet/security');
    return response;
  }

  /**
   * Update wallet security settings
   */
  async updateSecuritySettings(settings: Partial<WalletSecuritySettings>): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await apiClient.put<{
      success: boolean;
      message: string;
    }>('/brands/wallet/security', settings);
    return response;
  }

  /**
   * Create wallet backup
   */
  async createWalletBackup(backupType: 'settings' | 'full'): Promise<{
    success: boolean;
    backupId: string;
    downloadUrl: string;
    expiresAt: string;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      backupId: string;
      downloadUrl: string;
      expiresAt: string;
    }>('/brands/wallet/security/backup', {
      type: backupType,
    });
    return response;
  }

  // ======================
  // WALLET ANALYTICS
  // ======================

  /**
   * Get wallet analytics
   */
  async getWalletAnalytics(timeRange = '30d'): Promise<WalletAnalytics> {
    const response = await apiClient.get<WalletAnalytics>(
      `/brands/wallet/analytics?timeRange=${timeRange}`
    );
    return response;
  }

  // ======================
  // NETWORK AND CHAIN UTILITIES
  // ======================

  /**
   * Check if chain is supported
   */
  isSupportedChain(chainId: number): boolean {
    return isChainSupported(chainId);
  }

  /**
   * Get network information
   */
  getNetworkInfo(chainId: number): {
    name: string;
    shortName: string;
    explorerUrl: string;
    rpcUrl: string;
    currency: string;
    isTestnet: boolean;
  } | null {
    return getChainConfig(chainId);
  }

  /**
   * Get all supported networks
   */
  getSupportedNetworks(): Array<{
    chainId: number;
    name: string;
    shortName: string;
    currency: string;
    isTestnet: boolean;
  }> {
    return supportedChains.map(chain => {
      const config = getChainConfig(chain.id);
      return {
        chainId: chain.id,
        name: config?.name || chain.name,
        shortName: config?.shortName || chain.name.toLowerCase(),
        currency: config?.currency || chain.nativeCurrency.symbol,
        isTestnet: config?.isTestnet || false,
      };
    });
  }

  /**
   * Get network status
   */
  async getNetworkStatus(chainId: number): Promise<{
    isHealthy: boolean;
    blockNumber?: number;
    latency?: number;
    error?: string;
  }> {
    const publicClient = this.publicClients.get(chainId);
    if (!publicClient) {
      return {
        isHealthy: false,
        error: 'No RPC client configured for this chain',
      };
    }

    try {
      const startTime = Date.now();
      const blockNumber = await publicClient.getBlockNumber();
      const latency = Date.now() - startTime;

      return {
        isHealthy: true,
        blockNumber: Number(blockNumber),
        latency,
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown network error',
      };
    }
  }

  // ======================
  // UTILITY METHODS
  // ======================

  /**
   * Get wallet balance (native currency)
   */
  async getWalletBalance(walletAddress: Address, chainId: number): Promise<{
    balance: bigint;
    formatted: string;
    symbol: string;
  } | null> {
    const publicClient = this.publicClients.get(chainId);
    if (!publicClient) {
      return null;
    }

    try {
      const balance = await publicClient.getBalance({
        address: walletAddress,
      });

      const chain = supportedChains.find(c => c.id === chainId);
      const symbol = chain?.nativeCurrency.symbol || 'ETH';
      const decimals = chain?.nativeCurrency.decimals || 18;

      return {
        balance,
        formatted: (Number(balance) / Math.pow(10, decimals)).toFixed(4),
        symbol,
      };
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      return null;
    }
  }

  /**
   * Get transaction count (nonce) for wallet
   */
  async getTransactionCount(walletAddress: Address, chainId: number): Promise<number | null> {
    const publicClient = this.publicClients.get(chainId);
    if (!publicClient) {
      return null;
    }

    try {
      const count = await publicClient.getTransactionCount({
        address: walletAddress,
      });
      return Number(count);
    } catch (error) {
      console.error('Failed to get transaction count:', error);
      return null;
    }
  }

  /**
   * Get wallet explorer URL
   */
  getWalletExplorerUrl(walletAddress: Address, chainId: number): string {
    const chainConfig = getChainConfig(chainId);
    return `${chainConfig?.explorerUrl}/address/${walletAddress}`;
  }

  /**
   * Get transaction explorer URL
   */
  getTransactionExplorerUrl(txHash: Hash, chainId: number): string {
    const chainConfig = getChainConfig(chainId);
    return `${chainConfig?.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Shorten wallet address for display
   */
  shortenAddress(address: Address, startLength = 6, endLength = 4): string {
    if (address.length < startLength + endLength + 2) {
      return address;
    }
    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
  }

  /**
   * Check if address is a contract
   */
  async isContract(address: Address, chainId: number): Promise<boolean> {
    const publicClient = this.publicClients.get(chainId);
    if (!publicClient) {
      return false;
    }

    try {
      const code = await publicClient.getBytecode({ address });
      return !!code && code !== '0x';
    } catch {
      return false;
    }
  }

  /**
   * Generate secure nonce for verification
   */
  generateSecureNonce(): string {
    return crypto.getRandomValues(new Uint8Array(16))
      .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
  }

  /**
   * Validate signature format
   */
  isValidSignature(signature: string): boolean {
    return /^0x[a-fA-F0-9]{130}$/.test(signature);
  }

  /**
   * Check wallet connection health
   */
  async checkConnectionHealth(walletAddress: Address, chainId: number): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check network status
    const networkStatus = await this.getNetworkStatus(chainId);
    if (!networkStatus.isHealthy) {
      issues.push('Network connectivity issues');
      recommendations.push('Try switching to a different RPC endpoint');
    }

    // Check wallet balance for gas
    const balance = await this.getWalletBalance(walletAddress, chainId);
    if (balance && Number(balance.formatted) < 0.001) {
      issues.push('Low balance for transaction fees');
      recommendations.push(`Add ${balance.symbol} to your wallet for transaction fees`);
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

// Export singleton instance
export const walletService = new WalletService();