// src/lib/blockchain/services/tokenService.ts
import { apiClient } from '@/lib/api/client';
import { readContract, readContracts } from 'viem/actions';
import { createPublicClient, http, formatUnits, parseUnits } from 'viem';
import { getContractAddress, getContractABI } from '../config/contracts';
import { supportedChains, getChainConfig } from '../config/chains';
import type { Address } from 'viem';

// Types
interface TokenInfo {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: bigint;
  logoUri?: string;
  chainId: number;
}

interface TokenBalance {
  address: Address;
  symbol: string;
  decimals: number;
  balance: bigint;
  formatted: string;
  usdValue?: number;
  chainId: number;
  lastUpdated: number;
}

interface TokenDiscount {
  eligible: boolean;
  discountPercentage: number;
  currentBalance: string;
  minimumRequired: string;
  tokenSymbol: string;
  maxDiscountAmount?: string;
  validUntil?: string;
  chainId: number;
}

interface TokenPrice {
  address: Address;
  price: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
  lastUpdated: string;
  chainId: number;
}

interface ApplyDiscountRequest {
  walletAddress: Address;
  orderAmount: string;
  paymentId?: string;
  discountCode?: string;
}

interface ApplyDiscountResponse {
  success: boolean;
  discountApplied: string;
  newTotal: string;
  transactionId: string;
  expiresAt: string;
}

interface TokenBalanceHistory {
  data: Array<{
    date: string;
    balance: string;
    usdValue?: number;
    chainId: number;
  }>;
  summary: {
    highestBalance: string;
    lowestBalance: string;
    averageBalance: string;
    totalTransactions: number;
  };
}

class TokenService {
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
  // API-FIRST OPERATIONS (for discounts and backend integration)
  // ======================

  /**
   * Check token discount eligibility via API
   */
  async checkTokenDiscount(walletAddress: Address): Promise<TokenDiscount> {
    const response = await apiClient.get<TokenDiscount>(`/brands/wallet/discounts?walletAddress=${walletAddress}`);
    return response.data;
  }

  /**
   * Apply token discount to order
   */
  async applyTokenDiscount(discountRequest: ApplyDiscountRequest): Promise<ApplyDiscountResponse> {
    const response = await apiClient.post<ApplyDiscountResponse>('/brands/wallet/discounts/apply', discountRequest);
    return response.data;
  }

  /**
   * Get token discount configuration
   */
  async getDiscountConfig(): Promise<{
    minimumBalance: string;
    discountPercentage: number;
    tokenSymbol: string;
    chainId: number;
    maxDiscountAmount?: string;
  }> {
    const response = await apiClient.get('/brands/wallet/discounts/config');
    return response.data;
  }

  /**
   * Get token balance history from API
   */
  async getBalanceHistory(walletAddress: Address, days = 30): Promise<TokenBalanceHistory> {
    const response = await apiClient.get<TokenBalanceHistory>(
      `/brands/wallet/balance/history?walletAddress=${walletAddress}&days=${days}`
    );
    return response.data;
  }

  /**
   * Get token price from API
   */
  async getTokenPrice(tokenAddress: Address, chainId: number): Promise<TokenPrice> {
    const response = await apiClient.get<TokenPrice>(
      `/tokens/price?address=${tokenAddress}&chainId=${chainId}`
    );
    return response.data;
  }

  // ======================
  // DIRECT BLOCKCHAIN READS
  // ======================

  /**
   * Get token info directly from blockchain
   */
  async getTokenInfo(tokenAddress: Address, chainId: number): Promise<TokenInfo | null> {
    const publicClient = this.publicClients.get(chainId);
    if (!publicClient) {
      throw new Error(`No RPC client configured for chain ${chainId}`);
    }

    try {
      const [name, symbol, decimals, totalSupply] = await readContracts(publicClient, {
        contracts: [
          {
            address: tokenAddress,
            abi: getContractABI('tokenContract'),
            functionName: 'name',
          },
          {
            address: tokenAddress,
            abi: getContractABI('tokenContract'),
            functionName: 'symbol',
          },
          {
            address: tokenAddress,
            abi: getContractABI('tokenContract'),
            functionName: 'decimals',
          },
          {
            address: tokenAddress,
            abi: getContractABI('tokenContract'),
            functionName: 'totalSupply',
          },
        ],
      });

      if (
        name.status === 'success' &&
        symbol.status === 'success' &&
        decimals.status === 'success'
      ) {
        return {
          address: tokenAddress,
          name: name.result as string,
          symbol: symbol.result as string,
          decimals: decimals.result as number,
          totalSupply: totalSupply.status === 'success' ? totalSupply.result as bigint : undefined,
          chainId,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get token info:', error);
      return null;
    }
  }

  /**
   * Get token balance directly from blockchain
   */
  async getTokenBalance(tokenAddress: Address, walletAddress: Address, chainId: number): Promise<TokenBalance | null> {
    const publicClient = this.publicClients.get(chainId);
    if (!publicClient) {
      throw new Error(`No RPC client configured for chain ${chainId}`);
    }

    try {
      const [balance, decimals, symbol] = await readContracts(publicClient, {
        contracts: [
          {
            address: tokenAddress,
            abi: getContractABI('tokenContract'),
            functionName: 'balanceOf',
            args: [walletAddress],
          },
          {
            address: tokenAddress,
            abi: getContractABI('tokenContract'),
            functionName: 'decimals',
          },
          {
            address: tokenAddress,
            abi: getContractABI('tokenContract'),
            functionName: 'symbol',
          },
        ],
      });

      if (
        balance.status === 'success' &&
        decimals.status === 'success' &&
        symbol.status === 'success'
      ) {
        const balanceAmount = balance.result as bigint;
        const tokenDecimals = decimals.result as number;
        const formatted = formatUnits(balanceAmount, tokenDecimals);

        return {
          address: tokenAddress,
          symbol: symbol.result as string,
          decimals: tokenDecimals,
          balance: balanceAmount,
          formatted,
          chainId,
          lastUpdated: Date.now(),
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return null;
    }
  }

  /**
   * Get platform token balance for a wallet
   */
  async getPlatformTokenBalance(walletAddress: Address, chainId: number): Promise<TokenBalance | null> {
    const tokenAddress = getContractAddress(chainId, 'tokenContract');
    if (!tokenAddress) {
      return null;
    }

    return this.getTokenBalance(tokenAddress, walletAddress, chainId);
  }

  /**
   * Get token balances across multiple chains
   */
  async getMultiChainTokenBalances(
    walletAddress: Address,
    tokenAddresses: Record<number, Address>
  ): Promise<TokenBalance[]> {
    const balances: TokenBalance[] = [];

    const promises = Object.entries(tokenAddresses).map(async ([chainId, tokenAddress]) => {
      try {
        const balance = await this.getTokenBalance(tokenAddress, walletAddress, parseInt(chainId));
        if (balance) {
          balances.push(balance);
        }
      } catch (error) {
        console.warn(`Failed to get balance on chain ${chainId}:`, error);
      }
    });

    await Promise.all(promises);
    return balances;
  }

  /**
   * Check if wallet meets minimum token requirement for discount
   */
  async checkMinimumBalanceRequirement(
    walletAddress: Address,
    minimumBalance: string,
    chainId: number
  ): Promise<{
    meetsRequirement: boolean;
    currentBalance: string;
    minimumRequired: string;
    shortfall?: string;
  }> {
    const tokenAddress = getContractAddress(chainId, 'tokenContract');
    if (!tokenAddress) {
      return {
        meetsRequirement: false,
        currentBalance: '0',
        minimumRequired: minimumBalance,
        shortfall: minimumBalance,
      };
    }

    const balance = await this.getTokenBalance(tokenAddress, walletAddress, chainId);
    if (!balance) {
      return {
        meetsRequirement: false,
        currentBalance: '0',
        minimumRequired: minimumBalance,
        shortfall: minimumBalance,
      };
    }

    const minimumBalanceBigInt = parseUnits(minimumBalance, balance.decimals);
    const meetsRequirement = balance.balance >= minimumBalanceBigInt;
    
    let shortfall: string | undefined;
    if (!meetsRequirement) {
      const shortfallAmount = minimumBalanceBigInt - balance.balance;
      shortfall = formatUnits(shortfallAmount, balance.decimals);
    }

    return {
      meetsRequirement,
      currentBalance: balance.formatted,
      minimumRequired: minimumBalance,
      shortfall,
    };
  }

  // ======================
  // TOKEN ANALYTICS AND UTILITIES
  // ======================

  /**
   * Calculate token value in USD
   */
  async calculateTokenValueUSD(
    tokenAddress: Address,
    amount: string,
    chainId: number
  ): Promise<number | null> {
    try {
      const price = await this.getTokenPrice(tokenAddress, chainId);
      const amountFloat = parseFloat(amount);
      return amountFloat * price.price;
    } catch (error) {
      console.error('Failed to calculate USD value:', error);
      return null;
    }
  }

  /**
   * Calculate potential discount amount
   */
  calculateDiscountAmount(
    orderAmount: string,
    discountPercentage: number,
    maxDiscount?: string
  ): string {
    const orderFloat = parseFloat(orderAmount);
    let discountAmount = (orderFloat * discountPercentage) / 100;

    if (maxDiscount) {
      const maxDiscountFloat = parseFloat(maxDiscount);
      discountAmount = Math.min(discountAmount, maxDiscountFloat);
    }

    return discountAmount.toFixed(2);
  }

  /**
   * Format token amount with proper decimals
   */
  formatTokenAmount(amount: bigint | string, decimals: number, displayDecimals = 4): string {
    const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
    const formatted = formatUnits(amountBigInt, decimals);
    const num = parseFloat(formatted);
    
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: displayDecimals,
    });
  }

  /**
   * Parse token amount to Wei/smallest unit
   */
  parseTokenAmount(amount: string, decimals: number): bigint {
    return parseUnits(amount, decimals);
  }

  /**
   * Validate token address format
   */
  isValidTokenAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get token explorer URL
   */
  getTokenExplorerUrl(tokenAddress: Address, chainId: number): string {
    const chainConfig = getChainConfig(chainId);
    return `${chainConfig?.explorerUrl}/token/${tokenAddress}`;
  }

  /**
   * Get wallet token holdings URL on explorer
   */
  getWalletTokensExplorerUrl(walletAddress: Address, chainId: number): string {
    const chainConfig = getChainConfig(chainId);
    return `${chainConfig?.explorerUrl}/address/${walletAddress}#tokentxns`;
  }

  // ======================
  // TOKEN LIST AND DISCOVERY
  // ======================

  /**
   * Get supported tokens for the platform
   */
  async getSupportedTokens(): Promise<TokenInfo[]> {
    const tokens: TokenInfo[] = [];

    for (const chain of supportedChains) {
      const tokenAddress = getContractAddress(chain.id, 'tokenContract');
      if (tokenAddress) {
        const tokenInfo = await this.getTokenInfo(tokenAddress, chain.id);
        if (tokenInfo) {
          tokens.push(tokenInfo);
        }
      }
    }

    return tokens;
  }

  /**
   * Search for token by symbol or address
   */
  async searchToken(query: string, chainId: number): Promise<TokenInfo | null> {
    // If query looks like an address, try to get token info directly
    if (this.isValidTokenAddress(query)) {
      return this.getTokenInfo(query as Address, chainId);
    }

    // Otherwise, search through supported tokens
    const supportedTokens = await this.getSupportedTokens();
    return supportedTokens.find(
      token => 
        token.symbol.toLowerCase() === query.toLowerCase() ||
        token.name.toLowerCase().includes(query.toLowerCase())
    ) || null;
  }

  /**
   * Get default token for a chain (platform token)
   */
  getDefaultToken(chainId: number): Address | null {
    return getContractAddress(chainId, 'tokenContract');
  }
}

// Export singleton instance
export const tokenService = new TokenService();