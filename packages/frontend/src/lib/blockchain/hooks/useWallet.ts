// src/lib/blockchain/hooks/useWallet.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useChainId, 
  useSwitchChain,
  useConnectors 
} from 'wagmi';
import apiClient from '@/lib/api/client';
import { defaultChain, isChainSupported, getChainConfig } from '../config/chains';
import { blockchainFeatureFlags } from '../config/wagmi';
import type { Address } from 'viem';

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

interface ConnectWalletRequest {
  walletAddress: Address;
  chainId: number;
  walletType?: string;
}

interface ConnectWalletResponse {
  success: boolean;
  requiresVerification: boolean;
  verificationMessage?: string;
  features: string[];
  message: string;
}

// Main wallet connection hook
export function useWallet() {
  const { 
    address, 
    isConnected, 
    isConnecting, 
    isReconnecting,
    connector,
    status 
  } = useAccount();
  
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  
  // Check if current chain is supported
  const isUnsupportedChain = chainId && !isChainSupported(chainId);
  
  // Get chain config for current chain
  const chainConfig = chainId ? getChainConfig(chainId) : undefined;

  // Switch to supported chain
  const switchToSupportedChain = async () => {
    try {
      await switchChain({ chainId: defaultChain.id });
    } catch (error) {
      console.error('Failed to switch chain:', error);
      throw error;
    }
  };

  // Enhanced disconnect function
  const enhancedDisconnect = async () => {
    try {
      await disconnect();
      // Clear any stored wallet state
      localStorage.removeItem('walletConnectModalOpen');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  };

  return {
    // Connection state
    address,
    isConnected: isConnected && !isUnsupportedChain,
    isConnecting: isConnecting || isReconnecting,
    chainId,
    status,
    
    // Chain information
    isUnsupportedChain,
    chainConfig,
    networkName: chainConfig?.name,
    
    // Connector information
    connector,
    connectorName: connector?.name,
    
    // Actions
    disconnect: enhancedDisconnect,
    switchToSupportedChain,
    switchChain,
    
    // Feature availability
    features: {
      tokenDiscounts: blockchainFeatureFlags.tokenDiscounts && isConnected,
      certificateTransfers: blockchainFeatureFlags.certificateTransfers && isConnected,
      walletVerification: blockchainFeatureFlags.walletVerification && isConnected,
      voting: blockchainFeatureFlags.voting && isConnected,
    },
  };
}

// Hook for wallet connection UI
export function useWalletConnection() {
  const { connect, connectors, isPending: isConnecting, error } = useConnect();
  const { isConnected } = useAccount();
  
  // Filter connectors based on availability and preferences
  const availableConnectors = connectors.filter(connector => {
    // Filter out connectors that aren't ready
    if (!connector) return false;
    
    // Add any other filtering logic here
    return true;
  });

  const connectWallet = async (connectorId?: string) => {
    try {
      const connector = connectorId 
        ? connectors.find(c => c.id === connectorId) || connectors[0]
        : connectors[0];
      
      if (!connector) {
        throw new Error('No wallet connector available');
      }

      await connect({ connector });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  return {
    // Connection state
    isConnected,
    isConnecting,
    error,
    
    // Available connectors
    connectors: availableConnectors,
    
    // Actions
    connect: connectWallet,
  };
}

// Hook to register wallet connection with backend API
export function useRegisterWalletConnection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ConnectWalletRequest): Promise<ConnectWalletResponse> => {
      return apiClient.post<ConnectWalletResponse>('/brands/wallet/connect', data);
    },
    onSuccess: () => {
      // Invalidate wallet-related queries
      queryClient.invalidateQueries({ queryKey: ['wallet-overview'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-verification-status'] });
    },
  });
}

// Hook to get wallet overview from API
export function useWalletOverview() {
  const { address, isConnected } = useAccount();
  
  return useQuery({
    queryKey: ['wallet-overview', address],
    queryFn: async (): Promise<WalletOverview> => {
      return apiClient.get<WalletOverview>('/brands/wallet');
    },
    enabled: !!address && isConnected,
    staleTime: 60000, // 1 minute
    retry: 2,
  });
}

// Hook to disconnect wallet from backend
export function useDisconnectWallet() {
  const queryClient = useQueryClient();
  const { disconnect } = useDisconnect();
  
  return useMutation({
    mutationFn: async (data: { removeFromBackend?: boolean } = {}) => {
      // Disconnect from backend first if requested
      if (data.removeFromBackend) {
        await apiClient.delete('/brands/wallet/disconnect');
      }
      
      // Then disconnect from wagmi
      await disconnect();
      
      return { success: true };
    },
    onSuccess: () => {
      // Clear all wallet-related queries
      queryClient.removeQueries({ queryKey: ['wallet-overview'] });
      queryClient.removeQueries({ queryKey: ['wallet-verification-status'] });
      queryClient.removeQueries({ queryKey: ['token-balance'] });
      queryClient.removeQueries({ queryKey: ['token-discount'] });
    },
  });
}

// Hook to check wallet connection status and health
export function useWalletHealth() {
  const { address, isConnected, chainId } = useAccount();
  
  return useQuery({
    queryKey: ['wallet-health', address, chainId],
    queryFn: async () => {
      return apiClient.get<{
        isHealthy: boolean;
        issues: string[];
        recommendations: string[];
        lastChecked: string;
        connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
        networkLatency?: number;
      }>(`/brands/wallet/health?address=${address}&chainId=${chainId}`);
    },
    enabled: !!address && isConnected,
    staleTime: 120000, // 2 minutes
    refetchInterval: 300000, // Check health every 5 minutes
  });
}

// Hook to get wallet analytics
export function useWalletAnalytics(timeRange = '30d') {
  const { address } = useAccount();
  
  return useQuery({
    queryKey: ['wallet-analytics', address, timeRange],
    queryFn: async () => {
      return apiClient.get<{
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
      }>(`/brands/wallet/analytics?timeRange=${timeRange}`);
    },
    enabled: !!address,
    staleTime: 300000, // 5 minutes
  });
}

// Hook to manage wallet security settings
export function useWalletSecurity() {
  const queryClient = useQueryClient();
  
  const updateSecurity = useMutation({
    mutationFn: async (settings: {
      requireSignatureForTransfers?: boolean;
      enableMultisig?: boolean;
      multisigThreshold?: number;
      allowedSigners?: Address[];
      sessionTimeout?: number;
    }) => {
      return apiClient.put<{ success: boolean; message: string }>('/brands/wallet/security', settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-overview'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-security-settings'] });
    },
  });
  
  const getSecuritySettings = useQuery({
    queryKey: ['wallet-security-settings'],
    queryFn: async () => {
      return apiClient.get<{
        requireSignatureForTransfers: boolean;
        enableMultisig: boolean;
        multisigThreshold: number;
        allowedSigners: Address[];
        sessionTimeout: number;
        lastUpdated: string;
      }>('/brands/wallet/security');
    },
    staleTime: 300000, // 5 minutes
  });
  
  return {
    settings: getSecuritySettings.data,
    isLoading: getSecuritySettings.isLoading,
    error: getSecuritySettings.error,
    updateSecurity: updateSecurity.mutate,
    isUpdating: updateSecurity.isPending,
    updateError: updateSecurity.error,
  };
}

// Hook to get supported wallets and their status
export function useSupportedWallets() {
  const connectors = useConnectors();
  
  return useQuery({
    queryKey: ['supported-wallets'],
    queryFn: async () => {
      const walletStatuses = await Promise.all(
        connectors.map(async (connector) => {
          try {
            // Check if wallet is installed
            const provider = await connector.getProvider();
            return {
              id: connector.id,
              name: connector.name,
              icon: connector.icon,
              isInstalled: !!provider,
              isReady: connector.ready,
              downloadUrl: getWalletDownloadUrl(connector.id),
            };
          } catch (error) {
            return {
              id: connector.id,
              name: connector.name,
              icon: connector.icon,
              isInstalled: false,
              isReady: false,
              downloadUrl: getWalletDownloadUrl(connector.id),
            };
          }
        })
      );
      
      return walletStatuses;
    },
    staleTime: Infinity, // Wallet installation status doesn't change during session
  });
}

// Hook for wallet backup and recovery
export function useWalletBackup() {
  return useMutation({
    mutationFn: async (backupType: 'settings' | 'full') => {
      return apiClient.post<{
        success: boolean;
        backupId: string;
        downloadUrl: string;
        expiresAt: string;
      }>('/brands/wallet/security/backup', { type: backupType });
    },
  });
}

// Helper function to get wallet download URLs
function getWalletDownloadUrl(walletId: string): string | undefined {
  const downloadUrls: Record<string, string> = {
    metaMask: 'https://metamask.io/download/',
    coinbaseWallet: 'https://www.coinbase.com/wallet',
    walletConnect: 'https://walletconnect.com/',
    rainbow: 'https://rainbow.me/',
    trust: 'https://trustwallet.com/',
  };
  
  return downloadUrls[walletId];
}

// Hook to check if wallet supports required features
export function useWalletCapabilities() {
  const { connector } = useAccount();
  
  return useQuery({
    queryKey: ['wallet-capabilities', connector?.id],
    queryFn: async () => {
      if (!connector) return null;
      
      try {
        const provider = await connector.getProvider();
        
        return {
          supportsSignTypedData: typeof (provider as any)?.request === 'function',
          supportsChainSwitching: typeof (provider as any)?.request === 'function',
          supportsEIP1559: true, // Most modern wallets support this
          supportsPersonalSign: typeof (provider as any)?.request === 'function',
          name: connector.name,
          version: (provider as any)?.version || 'unknown',
        };
      } catch (error) {
        return null;
      }
    },
    enabled: !!connector,
    staleTime: Infinity, // Capabilities don't change
  });
}

// Hook for automatic wallet reconnection
export function useAutoReconnect() {
  const { isConnected, address } = useAccount();
  const walletOverview = useWalletOverview();
  
  // Auto-register wallet connection with backend when connected
  const registerConnection = useRegisterWalletConnection();
  
  return useQuery({
    queryKey: ['auto-reconnect', address, isConnected],
    queryFn: async () => {
      if (isConnected && address) {
        // Check if wallet is registered with backend
        if (!walletOverview.data?.isConnected) {
          try {
            await registerConnection.mutateAsync({
              walletAddress: address,
              chainId: 8453, // Default to Base
              walletType: 'auto-reconnect',
            });
          } catch (error) {
            console.warn('Failed to auto-register wallet:', error);
          }
        }
      }
      
      return { autoReconnected: true };
    },
    enabled: isConnected && !!address && blockchainFeatureFlags.walletConnection,
    staleTime: 300000, // 5 minutes
  });
}