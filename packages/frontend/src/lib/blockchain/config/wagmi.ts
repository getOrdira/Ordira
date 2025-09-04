// src/lib/blockchain/config/wagmi.ts
import { createConfig, http } from 'wagmi';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { 
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  rainbowWallet,
  trustWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { base, baseSepolia, mainnet, polygon, supportedChains, defaultChain } from './chains';

// Environment variables
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;
const isDevelopment = process.env.NODE_ENV === 'development';

// Validate required environment variables
if (!walletConnectProjectId) {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect will not work.');
}

// Wallet connector configuration
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
    {
      groupName: 'Popular',
      wallets: [
        rainbowWallet,
        trustWallet,
      ],
    },
    {
      groupName: 'Other',
      wallets: [
        injectedWallet,
      ],
    },
  ],
  {
    appName: 'B2B Manufacturing Platform',
    projectId: walletConnectProjectId,
  }
);

// RPC URL configuration with fallbacks
const rpcUrls = {
  [base.id]: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
  [baseSepolia.id]: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  [mainnet.id]: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://cloudflare-eth.com',
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com',
};

// Create wagmi configuration
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors,
  transports: {
    [base.id]: http(rpcUrls[base.id]),
    [baseSepolia.id]: http(rpcUrls[baseSepolia.id]),
    [mainnet.id]: http(rpcUrls[mainnet.id]),
    [polygon.id]: http(rpcUrls[polygon.id]),
  },
  ssr: true, // Enable server-side rendering support
});

// RainbowKit configuration
export const rainbowKitConfig = {
  appName: 'B2B Manufacturing Platform',
  projectId: walletConnectProjectId,
  chains: supportedChains,
  initialChain: defaultChain,
  
  // Theme configuration
  theme: 'auto' as const, // 'light' | 'dark' | 'auto'
  
  // Modal configuration  
  modalSize: 'compact' as const, // 'compact' | 'wide'
  
  // Custom avatar configuration
  avatar: undefined, // Can be customized later
  
  // Show recent transactions
  showRecentTransactions: true,
  
  // Cool mode (fun animations)
  coolMode: false,
} as const;

// Wagmi client configuration for specific operations
export const wagmiClientConfig = {
  // Polling intervals (in milliseconds)
  pollingInterval: {
    balance: 10000, // 10 seconds
    blockNumber: 4000, // 4 seconds
    transaction: 2000, // 2 seconds
  },
  
  // Cache configuration
  cache: {
    // Time to keep data in cache (in milliseconds)
    blockNumber: 4000,
    balance: 10000,
    transaction: 30000,
  },
  
  // Network connection configuration
  network: {
    // Auto-connect on app load
    autoConnect: true,
    
    // Reconnect on network change
    reconnectOnNetworkChange: true,
    
    // Maximum reconnection attempts
    maxReconnectAttempts: 5,
    
    // Reconnection delay (in milliseconds)
    reconnectDelay: 2000,
  },
  
  // Error handling configuration
  errors: {
    // Retry failed requests
    retryOnFailure: true,
    retryDelay: 1000,
    maxRetries: 3,
  },
} as const;

// Wallet connection preferences
export const walletPreferences = {
  // Preferred wallet order (affects UI ordering)
  preferredWallets: [
    'MetaMask',
    'Coinbase Wallet', 
    'WalletConnect',
    'Rainbow',
  ],
  
  // Mobile wallet preferences
  mobilePreferences: {
    // Prefer in-app browsers on mobile
    preferInAppBrowser: true,
    
    // Show QR code for desktop wallets on mobile
    showQRCode: true,
  },
  
  // Desktop preferences
  desktopPreferences: {
    // Show download links for missing wallets
    showDownloadLinks: true,
    
    // Prefer browser extension wallets
    preferExtensionWallets: true,
  },
} as const;

// Network switching configuration
export const networkSwitchConfig = {
  // Automatically switch to default chain if on unsupported network
  autoSwitch: true,
  
  // Show warning when on unsupported network
  showUnsupportedWarning: true,
  
  // Allowed networks for specific features
  allowedNetworksFor: {
    // Token balance checking (can use any supported network)
    tokenBalance: [base.id, baseSepolia.id, mainnet.id, polygon.id],
    
    // Certificate operations (only on primary networks)
    certificates: [base.id, baseSepolia.id],
    
    // Voting operations (only on primary networks) 
    voting: [base.id, baseSepolia.id],
    
    // Wallet verification (any supported network)
    walletVerification: [base.id, baseSepolia.id, mainnet.id, polygon.id],
  },
} as const;

// Feature flags for blockchain functionality
export const blockchainFeatureFlags = {
  // Core features
  walletConnection: process.env.NEXT_PUBLIC_ENABLE_WALLET_CONNECTION !== 'false',
  tokenDiscounts: process.env.NEXT_PUBLIC_ENABLE_TOKEN_DISCOUNTS === 'true',
  certificateTransfers: process.env.NEXT_PUBLIC_ENABLE_CERTIFICATE_TRANSFERS === 'true',
  walletVerification: process.env.NEXT_PUBLIC_ENABLE_WALLET_VERIFICATION === 'true',
  voting: process.env.NEXT_PUBLIC_ENABLE_VOTING === 'true',
  
  // Advanced features
  multiChainSupport: process.env.NEXT_PUBLIC_ENABLE_MULTICHAIN === 'true',
  gasOptimization: process.env.NEXT_PUBLIC_ENABLE_GAS_OPTIMIZATION === 'true',
  realTimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REALTIME_UPDATES === 'true',
  
  // Development features
  testnetSupport: isDevelopment || process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true',
  debugMode: isDevelopment && process.env.NEXT_PUBLIC_DEBUG_BLOCKCHAIN === 'true',
} as const;

// Development and debugging configuration
export const developmentConfig = {
  // Enable verbose logging in development
  enableLogging: isDevelopment,
  
  // Show detailed error messages
  showDetailedErrors: isDevelopment,
  
  // Enable performance monitoring
  enablePerformanceMonitoring: isDevelopment,
  
  // Mock blockchain calls (for testing without real connections)
  mockBlockchainCalls: process.env.NEXT_PUBLIC_MOCK_BLOCKCHAIN === 'true',
  
  // Test wallet addresses for development
  testWallets: isDevelopment ? [
    '0x742D35cc6d8F6F6bE0b18FdFbA8dF1FfF3a1Da8D', // Test wallet 1
    '0x8B7B3f4B8Db4Aa8F7E8C9F6B5C9c8A7D9E3F2C1A', // Test wallet 2
  ] as const : [],
} as const;

// Export configuration summary for debugging
export const configSummary = {
  chains: supportedChains.length,
  defaultChain: defaultChain.name,
  walletConnectEnabled: !!walletConnectProjectId,
  features: Object.entries(blockchainFeatureFlags)
    .filter(([, enabled]) => enabled)
    .map(([feature]) => feature),
  isDevelopment,
} as const;