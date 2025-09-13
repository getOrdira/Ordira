// src/lib/blockchain/utils/constants.ts
import type { Address } from 'viem';

// ======================
// BLOCKCHAIN NETWORKS
// ======================
export const CHAIN_IDS = {
  BASE: 8453,
  BASE_SEPOLIA: 84532,
  ETHEREUM: 1,
  POLYGON: 137,
} as const;

export const NETWORK_NAMES = {
  [CHAIN_IDS.BASE]: 'Base',
  [CHAIN_IDS.BASE_SEPOLIA]: 'Base Sepolia',
  [CHAIN_IDS.ETHEREUM]: 'Ethereum',
  [CHAIN_IDS.POLYGON]: 'Polygon',
} as const;

export const NATIVE_CURRENCIES = {
  [CHAIN_IDS.BASE]: 'ETH',
  [CHAIN_IDS.BASE_SEPOLIA]: 'ETH',
  [CHAIN_IDS.ETHEREUM]: 'ETH',
  [CHAIN_IDS.POLYGON]: 'MATIC',
} as const;

export const BLOCK_EXPLORERS = {
  [CHAIN_IDS.BASE]: 'https://basescan.org',
  [CHAIN_IDS.BASE_SEPOLIA]: 'https://sepolia.basescan.org',
  [CHAIN_IDS.ETHEREUM]: 'https://etherscan.io',
} as const;

// Primary chain for certificate operations
export const PRIMARY_CHAIN_ID = CHAIN_IDS.BASE;

// Development/testnet chain
export const TESTNET_CHAIN_ID = CHAIN_IDS.BASE_SEPOLIA;

// ======================
// CERTIFICATE CONSTANTS
// ======================
export const CERTIFICATE_STATUS = {
  PENDING: 'pending',
  MINTED: 'minted',
  TRANSFERRED: 'transferred',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  REVOKED: 'revoked',
} as const;

export const CERTIFICATE_OWNERSHIP_STATUS = {
  RELAYER: 'relayer',
  BRAND: 'brand',
  EXTERNAL: 'external',
  REVOKED: 'revoked',
} as const;

export const CERTIFICATE_DELIVERY_METHODS = {
  EMAIL: 'email',
  SMS: 'sms',
  WALLET: 'wallet',
  MANUAL: 'manual',
} as const;

export const CERTIFICATE_TRANSFER_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

// Maximum certificates per batch mint
export const MAX_BATCH_MINT_SIZE = 100;

// Maximum transfer retry attempts
export const MAX_TRANSFER_ATTEMPTS = 3;

// Default transfer delay (minutes)
export const DEFAULT_TRANSFER_DELAY = 5;

// Certificate metadata standards
export const NFT_METADATA_ATTRIBUTES = {
  SERIAL_NUMBER: 'Serial Number',
  BATCH_NUMBER: 'Batch Number',
  MANUFACTURING_DATE: 'Manufacturing Date',
  EXPIRATION_DATE: 'Expiration Date',
  BRAND: 'Brand',
  PRODUCT: 'Product',
  QUALITY_CERTIFICATIONS: 'Quality Certifications',
} as const;

// ======================
// TOKEN CONSTANTS
// ======================
export const TOKEN_STANDARDS = {
  ERC20: 'ERC20',
  ERC721: 'ERC721',
  ERC1155: 'ERC1155',
} as const;

// Platform token decimals (standard ERC20)
export const PLATFORM_TOKEN_DECIMALS = 18;

// Token discount tiers
export const DISCOUNT_TIERS = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
} as const;

// Discount tier configurations
export const DISCOUNT_TIER_CONFIG = {
  [DISCOUNT_TIERS.BRONZE]: {
    minimumBalance: '100000', // 100k tokens
    discountPercentage: 5,
    color: '#CD7F32',
  },
  [DISCOUNT_TIERS.SILVER]: {
    minimumBalance: '250000', // 250k tokens
    discountPercentage: 10,
    color: '#C0C0C0',
  },
  [DISCOUNT_TIERS.GOLD]: {
    minimumBalance: '500000', // 500k tokens
    discountPercentage: 15,
    color: '#FFD700',
  },
  [DISCOUNT_TIERS.PLATINUM]: {
    minimumBalance: '1000000', // 1 million tokens
    discountPercentage: 25,
    color: '#E5E4E2',
  },
} as const;

// Maximum discount amount (USD)
export const MAX_DISCOUNT_AMOUNT = '1000';

// Token balance thresholds for UI display
export const TOKEN_BALANCE_THRESHOLDS = {
  DUST: '0.001', // Below this is considered dust
  LOW: '1',
  MEDIUM: '100',
  HIGH: '1000',
} as const;

// ======================
// WALLET CONSTANTS
// ======================
export const WALLET_CONNECTION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
} as const;

export const WALLET_VERIFICATION_STATUS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const;

export const WALLET_TYPES = {
  METAMASK: 'metamask',
  WALLET_CONNECT: 'walletConnect',
  COINBASE_WALLET: 'coinbaseWallet',
  RAINBOW: 'rainbow',
  TRUST_WALLET: 'trustWallet',
  INJECTED: 'injected',
} as const;

// Wallet verification message template
export const VERIFICATION_MESSAGE_TEMPLATE = `{domain}

I am the owner of wallet address: {address}

This signature proves my ownership of this wallet address.

Nonce: {nonce}
Timestamp: {timestamp}

This signature is only valid for wallet verification on {domain}.`;

// Default verification validity period (days)
export const VERIFICATION_VALIDITY_DAYS = 30;

// Session timeout (minutes)
export const DEFAULT_SESSION_TIMEOUT = 60;

// Maximum allowed signers for multisig
export const MAX_MULTISIG_SIGNERS = 10;

// ======================
// GAS AND TRANSACTION CONSTANTS
// ======================
export const GAS_LIMITS = {
  // ERC20 operations
  TOKEN_TRANSFER: 65000n,
  TOKEN_APPROVAL: 50000n,
  
  // ERC721 operations
  NFT_MINT: 200000n,
  NFT_TRANSFER: 100000n,
  NFT_APPROVAL: 50000n,
  
  // Contract calls
  SIMPLE_READ: 30000n,
  COMPLEX_READ: 100000n,
  WRITE_OPERATION: 150000n,
  
  // Batch operations
  BATCH_TRANSFER: 300000n,
  BATCH_MINT: 500000n,
} as const;

// Gas price multipliers for different priorities
export const GAS_PRICE_MULTIPLIERS = {
  [CERTIFICATE_TRANSFER_PRIORITIES.LOW]: 1.0,
  [CERTIFICATE_TRANSFER_PRIORITIES.MEDIUM]: 1.2,
  [CERTIFICATE_TRANSFER_PRIORITIES.HIGH]: 1.5,
} as const;

// Transaction confirmation requirements by chain
export const CONFIRMATION_REQUIREMENTS = {
  [CHAIN_IDS.BASE]: 1,
  [CHAIN_IDS.BASE_SEPOLIA]: 1,
  [CHAIN_IDS.ETHEREUM]: 3,
  [CHAIN_IDS.POLYGON]: 5,
} as const;

// ======================
// API AND QUERY CONSTANTS
// ======================
export const API_ENDPOINTS = {
  CERTIFICATES: '/certificates',
  CERTIFICATE_MINT: '/certificates/mint',
  CERTIFICATE_TRANSFER: '/certificates/transfer',
  CERTIFICATE_BLOCKCHAIN_STATUS: '/certificates/{id}/blockchain-status',
  
  WALLET_CONNECT: '/brands/wallet/connect',
  WALLET_VERIFY: '/brands/wallet/verify',
  WALLET_OVERVIEW: '/brands/wallet',
  
  TOKEN_DISCOUNT: '/brands/wallet/discounts',
  TOKEN_BALANCE: '/brands/wallet/balance',
  TOKEN_PRICE: '/tokens/price',
} as const;

// React Query stale times (milliseconds)
export const QUERY_STALE_TIMES = {
  CERTIFICATES: 30000, // 30 seconds
  CERTIFICATE_DETAIL: 20000, // 20 seconds
  BLOCKCHAIN_STATUS: 15000, // 15 seconds
  TOKEN_BALANCE: 30000, // 30 seconds
  TOKEN_PRICE: 60000, // 1 minute
  WALLET_OVERVIEW: 60000, // 1 minute
  NETWORK_STATUS: 120000, // 2 minutes
} as const;

// React Query refetch intervals (milliseconds)
export const QUERY_REFETCH_INTERVALS = {
  CERTIFICATES: 60000, // 1 minute
  BLOCKCHAIN_STATUS: 30000, // 30 seconds
  TOKEN_BALANCE: 60000, // 1 minute
  TOKEN_PRICE: 300000, // 5 minutes
  NETWORK_STATUS: 300000, // 5 minutes
} as const;

// ======================
// UI AND UX CONSTANTS
// ======================
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

export const TOAST_DURATIONS = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
} as const;

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  FIRST_PAGE: 1,
} as const;

// Search defaults
export const SEARCH_DEFAULTS = {
  MIN_QUERY_LENGTH: 2,
  DEBOUNCE_DELAY: 300,
  MAX_RECENT_SEARCHES: 5,
} as const;

// ======================
// ERROR CODES
// ======================
export const BLOCKCHAIN_ERROR_CODES = {
  // Connection errors
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  UNSUPPORTED_CHAIN: 'UNSUPPORTED_CHAIN',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // Transaction errors
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  USER_REJECTED: 'USER_REJECTED',
  GAS_LIMIT_EXCEEDED: 'GAS_LIMIT_EXCEEDED',
  
  // Contract errors
  CONTRACT_NOT_FOUND: 'CONTRACT_NOT_FOUND',
  INVALID_CONTRACT_ADDRESS: 'INVALID_CONTRACT_ADDRESS',
  CONTRACT_CALL_FAILED: 'CONTRACT_CALL_FAILED',
  
  // Certificate errors
  CERTIFICATE_NOT_FOUND: 'CERTIFICATE_NOT_FOUND',
  CERTIFICATE_ALREADY_TRANSFERRED: 'CERTIFICATE_ALREADY_TRANSFERRED',
  TRANSFER_NOT_ELIGIBLE: 'TRANSFER_NOT_ELIGIBLE',
  INVALID_RECIPIENT: 'INVALID_RECIPIENT',
  
  // Verification errors
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  SIGNATURE_INVALID: 'SIGNATURE_INVALID',
  VERIFICATION_EXPIRED: 'VERIFICATION_EXPIRED',
  
  // Token errors
  INSUFFICIENT_TOKEN_BALANCE: 'INSUFFICIENT_TOKEN_BALANCE',
  DISCOUNT_NOT_ELIGIBLE: 'DISCOUNT_NOT_ELIGIBLE',
  DISCOUNT_EXPIRED: 'DISCOUNT_EXPIRED',
} as const;

// ======================
// REGEX PATTERNS
// ======================
export const PATTERNS = {
  ETHEREUM_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  TRANSACTION_HASH: /^0x[a-fA-F0-9]{64}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
  DOMAIN: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/,
  IPFS_HASH: /^Qm[a-zA-Z0-9]{44}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  MONGODB_OBJECT_ID: /^[0-9a-fA-F]{24}$/,
} as const;

// ======================
// FEATURE FLAGS
// ======================
export const FEATURE_FLAGS = {
  ENABLE_TOKEN_DISCOUNTS: process.env.NEXT_PUBLIC_ENABLE_TOKEN_DISCOUNTS === 'true',
  ENABLE_CERTIFICATE_TRANSFERS: process.env.NEXT_PUBLIC_ENABLE_CERTIFICATE_TRANSFERS === 'true',
  ENABLE_WALLET_VERIFICATION: process.env.NEXT_PUBLIC_ENABLE_WALLET_VERIFICATION === 'true',
  ENABLE_VOTING: process.env.NEXT_PUBLIC_ENABLE_VOTING === 'true',
  ENABLE_MULTICHAIN: process.env.NEXT_PUBLIC_ENABLE_MULTICHAIN === 'true',
  ENABLE_GAS_OPTIMIZATION: process.env.NEXT_PUBLIC_ENABLE_GAS_OPTIMIZATION === 'true',
  ENABLE_REALTIME_UPDATES: process.env.NEXT_PUBLIC_ENABLE_REALTIME_UPDATES === 'true',
  DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_BLOCKCHAIN === 'true',
} as const;

// ======================
// URLS AND LINKS
// ======================
export const EXTERNAL_URLS = {
  BASE_DOCS: 'https://docs.base.org',
  METAMASK_DOWNLOAD: 'https://metamask.io/download/',
  COINBASE_WALLET_DOWNLOAD: 'https://www.coinbase.com/wallet',
  RAINBOW_DOWNLOAD: 'https://rainbow.me/',
  WALLETCONNECT_DOCS: 'https://docs.walletconnect.com/',
} as const;

// Help and support URLs
export const HELP_URLS = {
  WALLET_SETUP: '/help/wallet-setup',
  CERTIFICATE_TRANSFERS: '/help/certificate-transfers',
  TOKEN_DISCOUNTS: '/help/token-discounts',
  TROUBLESHOOTING: '/help/troubleshooting',
  CONTACT_SUPPORT: '/contact-support',
} as const;