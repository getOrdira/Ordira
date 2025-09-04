// src/lib/blockchain/hooks/useTokenBalance.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAccount, useReadContract, useBalance, useBlockNumber } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { apiClient } from '@/lib/api/client';
import { getContractAddress, getContractABI } from '../config/contracts';
import { supportedChains, getChainConfig } from '../config/chains';
import type { Address } from 'viem';

// Types
interface TokenInfo {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
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
  chainId: number;
}

// Hook to get native ETH balance for connected wallet
export function useNativeBalance(chainId?: number) {
  const { address, isConnected } = useAccount();
  
  return useBalance({
    address,
    chainId,
    query: {
      enabled: !!address && isConnected,
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // Refetch every minute
    },
  });
}

// Hook to get ERC20 token balance for connected wallet
export function useTokenBalance(tokenAddress?: Address, chainId?: number) {
  const { address: walletAddress, isConnected } = useAccount();
  const { data: blockNumber } = useBlockNumber({ chainId });
  
  // Get token decimals
  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: getContractABI('tokenContract'),
    functionName: 'decimals',
    chainId,
    query: {
      enabled: !!tokenAddress && isConnected,
      staleTime: Infinity, // Decimals never change
    },
  });

  // Get token symbol
  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: getContractABI('tokenContract'),
    functionName: 'symbol',
    chainId,
    query: {
      enabled: !!tokenAddress && isConnected,
      staleTime: Infinity, // Symbol never changes
    },
  });

  // Get token name
  const { data: name } = useReadContract({
    address: tokenAddress,
    abi: getContractABI('tokenContract'),
    functionName: 'name',
    chainId,
    query: {
      enabled: !!tokenAddress && isConnected,
      staleTime: Infinity, // Name never changes
    },
  });

  // Get balance
  const { data: balance, isLoading, error, refetch } = useReadContract({
    address: tokenAddress,
    abi: getContractABI('tokenContract'),
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    chainId,
    query: {
      enabled: !!tokenAddress && !!walletAddress && isConnected,
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // Refetch every minute
    },
  });

  return useQuery({
    queryKey: ['token-balance', tokenAddress, walletAddress, chainId, blockNumber],
    queryFn: async (): Promise<TokenBalance | null> => {
      if (!tokenAddress || !walletAddress || !balance || !decimals || !symbol) {
        return null;
      }

      const formatted = formatUnits(balance, decimals);
      
      return {
        address: tokenAddress,
        symbol: symbol as string,
        decimals: decimals as number,
        balance,
        formatted,
        chainId: chainId || 1,
        lastUpdated: Date.now(),
      };
    },
    enabled: !!tokenAddress && !!walletAddress && !!balance && !!decimals && !!symbol,
    staleTime: 30000,
  });
}

// Hook to get token balances across multiple chains
export function useMultiChainTokenBalance(tokenAddresses?: Record<number, Address>) {
  const { address: walletAddress, isConnected } = useAccount();

  return useQuery({
    queryKey: ['multi-chain-token-balance', tokenAddresses, walletAddress],
    queryFn: async (): Promise<TokenBalance[]> => {
      if (!tokenAddresses || !walletAddress) return [];

      const balances: TokenBalance[] = [];
      
      // Process each chain
      for (const [chainId, tokenAddress] of Object.entries(tokenAddresses)) {
        try {
          const chainIdNum = parseInt(chainId);
          const chainConfig = getChainConfig(chainIdNum);
          
          if (!chainConfig?.isSupported) continue;

          // This would require implementing cross-chain balance fetching
          // For now, return empty array - implement based on your multicall strategy
        } catch (error) {
          console.warn(`Failed to fetch balance on chain ${chainId}:`, error);
        }
      }
      
      return balances;
    },
    enabled: !!tokenAddresses && !!walletAddress && isConnected,
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });
}

// Hook to get platform token balance on primary chain
export function usePlatformTokenBalance() {
  const { address, isConnected, chainId } = useAccount();
  
  // Get token address for current or primary chain
  const tokenAddress = getContractAddress(chainId || 8453, 'tokenContract');
  
  return useTokenBalance(tokenAddress, chainId);
}

// Hook to check token discount eligibility via API
export function useTokenDiscount(walletAddress?: Address) {
  return useQuery({
    queryKey: ['token-discount', walletAddress],
    queryFn: async (): Promise<TokenDiscount> => {
      return apiClient.get<TokenDiscount>(`/brands/wallet/discounts?walletAddress=${walletAddress}`);
    },
    enabled: !!walletAddress,
    staleTime: 120000, // 2 minutes - discount eligibility doesn't change often
    retry: 2,
  });
}

// Hook to apply token discount (through API)
export function useApplyTokenDiscount() {
  return useMutation({
    mutationFn: async (data: {
      walletAddress: Address;
      orderAmount: string;
      paymentId?: string;
    }) => {
      return apiClient.post<{
        success: boolean;
        discountApplied: string;
        newTotal: string;
        transactionId: string;
      }>('/brands/wallet/discounts/apply', data);
    },
  });
}

// Hook to get token info (name, symbol, decimals)
export function useTokenInfo(tokenAddress?: Address, chainId?: number) {
  const { data: name } = useReadContract({
    address: tokenAddress,
    abi: getContractABI('tokenContract'),
    functionName: 'name',
    chainId,
    query: {
      enabled: !!tokenAddress,
      staleTime: Infinity, // Token info never changes
    },
  });

  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: getContractABI('tokenContract'),
    functionName: 'symbol',
    chainId,
    query: {
      enabled: !!tokenAddress,
      staleTime: Infinity,
    },
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: getContractABI('tokenContract'),
    functionName: 'decimals',
    chainId,
    query: {
      enabled: !!tokenAddress,
      staleTime: Infinity,
    },
  });

  return useQuery({
    queryKey: ['token-info', tokenAddress, chainId],
    queryFn: async (): Promise<TokenInfo | null> => {
      if (!tokenAddress || !name || !symbol || decimals === undefined) {
        return null;
      }

      return {
        address: tokenAddress,
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
        chainId: chainId || 1,
      };
    },
    enabled: !!tokenAddress && !!name && !!symbol && decimals !== undefined,
    staleTime: Infinity, // Token info never changes
  });
}

// Hook to get historical token balance (via API for analytics)
export function useTokenBalanceHistory(walletAddress?: Address, days = 30) {
  return useQuery({
    queryKey: ['token-balance-history', walletAddress, days],
    queryFn: async () => {
      return apiClient.get<{
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
      }>(`/brands/wallet/balance/history?walletAddress=${walletAddress}&days=${days}`);
    },
    enabled: !!walletAddress,
    staleTime: 300000, // 5 minutes
  });
}

// Hook to get token price and USD value
export function useTokenPrice(tokenAddress?: Address, chainId?: number) {
  return useQuery({
    queryKey: ['token-price', tokenAddress, chainId],
    queryFn: async () => {
      return apiClient.get<{
        price: number;
        change24h: number;
        marketCap?: number;
        volume24h?: number;
        lastUpdated: string;
      }>(`/tokens/price?address=${tokenAddress}&chainId=${chainId}`);
    },
    enabled: !!tokenAddress,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}

// Hook to calculate token balance with USD value
export function useTokenBalanceWithValue(tokenAddress?: Address, chainId?: number) {
  const tokenBalance = useTokenBalance(tokenAddress, chainId);
  const tokenPrice = useTokenPrice(tokenAddress, chainId);

  return useQuery({
    queryKey: ['token-balance-with-value', tokenBalance.data, tokenPrice.data],
    queryFn: async () => {
      if (!tokenBalance.data || !tokenPrice.data) return null;

      const balanceNumber = parseFloat(tokenBalance.data.formatted);
      const usdValue = balanceNumber * tokenPrice.data.price;

      return {
        ...tokenBalance.data,
        usdValue,
        price: tokenPrice.data.price,
        change24h: tokenPrice.data.change24h,
      };
    },
    enabled: !!tokenBalance.data && !!tokenPrice.data,
    staleTime: 30000,
  });
}

// Hook to get minimum token balance for discounts (from API config)
export function useMinimumTokenBalance() {
  return useQuery({
    queryKey: ['minimum-token-balance'],
    queryFn: async () => {
      return apiClient.get<{
        minimumBalance: string;
        discountPercentage: number;
        tokenSymbol: string;
        chainId: number;
      }>('/brands/wallet/discounts/config');
    },
    staleTime: 300000, // 5 minutes - config doesn't change often
  });
}