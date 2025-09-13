// src/lib/blockchain/config/chains.ts
import { Chain } from 'viem';

// Define supported chains for the platform
export const base = {
  id: 8453,
  name: 'Base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://mainnet.base.org'] },
    default: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://basescan.org' },
  },
  testnet: false,
} as const satisfies Chain;

export const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://sepolia.base.org'] },
    default: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Base Sepolia Explorer', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
} as const satisfies Chain;

export const mainnet = {
  id: 1,
  name: 'Ethereum',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://cloudflare-eth.com'] },
    default: { http: ['https://cloudflare-eth.com'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://etherscan.io' },
  },
  testnet: false,
} as const satisfies Chain;


// Array of all supported chains
export const supportedChains = [base, baseSepolia, mainnet] as const;

// Default chain based on environment
export const defaultChain = process.env.NODE_ENV === 'development' ? baseSepolia : base;

// Chain configuration mapping
export const chainConfig = {
  [base.id]: {
    name: 'Base',
    shortName: 'base',
    explorerUrl: 'https://basescan.org',
    explorerApiUrl: 'https://api.basescan.org/api',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org',
    currency: 'ETH',
    isTestnet: false,
    isSupported: true,
    gasMultiplier: 1.1, // 10% gas buffer for Base
    blockTime: 2, // ~2 seconds per block
    confirmations: 1, // Base is fast, 1 confirmation is usually enough
  },
  [baseSepolia.id]: {
    name: 'Base Sepolia',
    shortName: 'base-sepolia', 
    explorerUrl: 'https://sepolia.basescan.org',
    explorerApiUrl: 'https://api-sepolia.basescan.org/api',
    rpcUrl: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    currency: 'ETH',
    isTestnet: true,
    isSupported: true,
    gasMultiplier: 1.2, // Higher buffer for testnet
    blockTime: 2,
    confirmations: 1,
  },
  [mainnet.id]: {
    name: 'Ethereum',
    shortName: 'ethereum',
    explorerUrl: 'https://etherscan.io',
    explorerApiUrl: 'https://api.etherscan.io/api',
    rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://cloudflare-eth.com',
    currency: 'ETH',
    isTestnet: false,
    isSupported: true, // For token balance checking only
    gasMultiplier: 1.3, // Higher gas buffer for mainnet
    blockTime: 12, // ~12 seconds per block
    confirmations: 3, // More confirmations for security
  },
} as const;

// Primary chain for certificate operations (where relayer wallet operates)
export const primaryChain = base;

// Chain for voting operations (can be same as primary)
export const votingChain = base;

// Helper functions
export function getChainById(chainId: number) {
  return supportedChains.find(chain => chain.id === chainId);
}

export function getChainConfig(chainId: number) {
  return chainConfig[chainId as keyof typeof chainConfig];
}

export function isChainSupported(chainId: number): boolean {
  return chainId in chainConfig && chainConfig[chainId as keyof typeof chainConfig].isSupported;
}

export function isTestnet(chainId: number): boolean {
  return chainConfig[chainId as keyof typeof chainConfig]?.isTestnet || false;
}

export function getExplorerUrl(chainId: number, txHash?: string): string {
  const config = getChainConfig(chainId);
  if (!config) return '';
  
  if (txHash) {
    return `${config.explorerUrl}/tx/${txHash}`;
  }
  return config.explorerUrl;
}

export function getExplorerAddressUrl(chainId: number, address: string): string {
  const config = getChainConfig(chainId);
  if (!config) return '';
  return `${config.explorerUrl}/address/${address}`;
}

// Network status check URLs (for health monitoring)
export const networkHealthUrls = {
  [base.id]: 'https://mainnet.base.org',
  [baseSepolia.id]: 'https://sepolia.base.org', 
  [mainnet.id]: 'https://cloudflare-eth.com',
} as const;