// src/lib/blockchain/types/tokens.ts
import type { Address } from 'viem';

// Basic token information (ERC20 standard + metadata)
export interface TokenInfo {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: bigint;
  logoUri?: string;
  chainId: number;
  
  // Token metadata
  description?: string;
  website?: string;
  social?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
  
  // Platform-specific data
  isPlatformToken?: boolean;
  isVerified?: boolean;
  contractVerified?: boolean;
}

// Token balance representation
export interface TokenBalance {
  address: Address;
  symbol: string;
  name?: string;
  decimals: number;
  balance: bigint;
  formatted: string;
  
  // USD value data
  usdValue?: number;
  usdPrice?: number;
  
  // Chain and timing
  chainId: number;
  lastUpdated: number;
  
  // Additional metadata
  logoUri?: string;
  isNative?: boolean;
}

// Multi-chain token balance
export interface MultiChainTokenBalance {
  tokenAddress: Address;
  symbol: string;
  name: string;
  totalBalance: string; // Formatted total across all chains
  totalUsdValue?: number;
  
  // Balances by chain
  balancesByChain: Array<{
    chainId: number;
    networkName: string;
    balance: TokenBalance;
  }>;
  
  lastUpdated: number;
}

// Token price and market data
export interface TokenPrice {
  address: Address;
  chainId: number;
  symbol: string;
  
  // Price data
  price: number; // USD price
  change24h: number; // Percentage change
  change7d?: number;
  change30d?: number;
  
  // Market data
  marketCap?: number;
  volume24h?: number;
  circulatingSupply?: number;
  
  // Platform data
  priceSource: 'coingecko' | 'dexscreener' | 'internal' | 'oracle';
  lastUpdated: string;
  isStale?: boolean;
}

// Token discount system (core business logic)
export interface TokenDiscount {
  // Eligibility
  eligible: boolean;
  discountPercentage: number;
  
  // Balance requirements
  currentBalance: string;
  minimumRequired: string;
  shortfall?: string;
  
  // Token information
  tokenSymbol: string;
  tokenAddress: Address;
  chainId: number;
  
  // Discount limits
  maxDiscountAmount?: string;
  maxDiscountPercentage?: number;
  
  // Validity
  validUntil?: string;
  validFrom?: string;
  isActive: boolean;
  
  // Usage tracking
  usageCount?: number;
  maxUsages?: number;
  
  // Tiers (for different discount levels)
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
}

// Token discount configuration (admin/backend)
export interface TokenDiscountConfig {
  // Basic settings
  enabled: boolean;
  tokenAddress: Address;
  chainId: number;
  
  // Discount tiers
  tiers: Array<{
    name: string;
    minimumBalance: string;
    discountPercentage: number;
    maxDiscountAmount?: string;
    color?: string;
    benefits?: string[];
  }>;
  
  // Global limits
  globalMaxDiscount?: string;
  globalMaxUsages?: number;
  cooldownPeriod?: number; // hours between uses
  
  // Validity
  validFrom: string;
  validUntil?: string;
  
  // Usage restrictions
  restrictToPlans?: ('foundation' | 'growth' | 'premium' | 'enterprise')[];
  restrictToNewCustomers?: boolean;
  
  lastUpdated: string;
  updatedBy: string;
}

// Apply discount request/response
export interface ApplyTokenDiscountRequest {
  walletAddress: Address;
  orderAmount: string;
  paymentId?: string;
  discountCode?: string;
  currency?: 'USD' | 'EUR' | 'GBP';
}

export interface ApplyTokenDiscountResponse {
  success: boolean;
  
  // Discount details
  discountApplied: string; // Amount discounted
  discountPercentage: number;
  originalAmount: string;
  newTotal: string;
  
  // Transaction tracking
  transactionId: string;
  discountId: string;
  
  // Validity
  expiresAt: string;
  
  // Token info used
  tokenBalance: string;
  tokenSymbol: string;
  tier: string;
  
  message?: string;
}

// Token balance history (for analytics)
export interface TokenBalanceHistory {
  walletAddress: Address;
  tokenAddress: Address;
  chainId: number;
  
  // Historical data points
  data: Array<{
    date: string;
    balance: string;
    balanceFormatted: string;
    usdValue?: number;
    price?: number;
  }>;
  
  // Summary statistics
  summary: {
    currentBalance: string;
    highestBalance: string;
    lowestBalance: string;
    averageBalance: string;
    totalTransactions: number;
    firstTransaction?: string;
    lastTransaction?: string;
  };
  
  // Trends
  trends: {
    balanceChange7d: number; // percentage
    balanceChange30d: number;
    averageGrowthRate: number;
    volatility: number; // standard deviation
  };
}

// Token transaction history
export interface TokenTransaction {
  hash: Address;
  blockNumber: number;
  timestamp: number;
  
  // Transaction details
  from: Address;
  to: Address;
  value: string;
  valueFormatted: string;
  
  // Token info
  tokenAddress: Address;
  tokenSymbol: string;
  tokenDecimals: number;
  
  // Transaction type
  type: 'transfer' | 'mint' | 'burn' | 'approval';
  direction: 'in' | 'out';
  
  // Gas and costs
  gasUsed?: string;
  gasPrice?: string;
  gasCost?: string;
  
  // Status
  status: 'success' | 'failed';
  
  // Platform context
  relatedTo?: 'discount' | 'reward' | 'purchase' | 'transfer';
}

// Token search and discovery
export interface TokenSearchFilter {
  query?: string;
  chainId?: number;
  verified?: boolean;
  minLiquidity?: number;
  maxSupply?: number;
  category?: 'defi' | 'nft' | 'gaming' | 'utility' | 'governance';
}

export interface TokenSearchResult {
  tokens: TokenInfo[];
  total: number;
  hasMore: boolean;
  nextPage?: number;
}

// Token analytics for platform
export interface TokenAnalytics {
  tokenAddress: Address;
  chainId: number;
  
  // Usage statistics
  totalHolders: number;
  activeHolders: number; // holders with balance > 0
  totalTransfers: number;
  
  // Platform-specific analytics
  discountUsage: {
    totalDiscountsApplied: number;
    totalDiscountValue: string;
    averageDiscountAmount: string;
    popularTier: string;
  };
  
  // Holder distribution
  holderDistribution: Array<{
    range: string; // e.g., "1-10", "10-100", "100-1000"
    count: number;
    percentage: number;
  }>;
  
  // Time-based analytics
  timeRange: string;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  
  lastUpdated: string;
}

// Token allowance (for ERC20 approvals)
export interface TokenAllowance {
  owner: Address;
  spender: Address;
  tokenAddress: Address;
  allowance: bigint;
  allowanceFormatted: string;
  
  // Status
  isUnlimited: boolean;
  isExpired?: boolean;
  
  // Metadata
  spenderName?: string; // e.g., "Uniswap V3 Router"
  approvedAt?: string;
  lastUsed?: string;
  
  chainId: number;
}

// Token reward system (for platform engagement)
export interface TokenReward {
  id: string;
  userId: string;
  
  // Reward details
  amount: string;
  amountFormatted: string;
  tokenAddress: Address;
  tokenSymbol: string;
  
  // Reason for reward
  action: 'signup' | 'verify_wallet' | 'first_certificate' | 'referral' | 'milestone';
  description: string;
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  claimedAt?: string;
  
  // Transaction info
  txHash?: Address;
  blockNumber?: number;
  
  // Validity
  expiresAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Platform token staking (future feature)
export interface TokenStaking {
  id: string;
  userId: string;
  
  // Staking details
  stakedAmount: string;
  stakedAmountFormatted: string;
  tokenAddress: Address;
  
  // Rewards
  rewardsEarned: string;
  rewardsEarnedFormatted: string;
  apy: number; // Annual percentage yield
  
  // Timing
  stakedAt: string;
  unstakeRequestedAt?: string;
  canUnstakeAt?: string;
  
  // Status
  status: 'active' | 'unstaking' | 'unstaked';
  
  // Transaction hashes
  stakeTxHash: Address;
  unstakeTxHash?: Address;
  
  chainId: number;
}

// Token validation utilities
export interface TokenValidationResult {
  isValid: boolean;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    code: string;
    message: string;
  }>;
  
  // Contract analysis
  contractVerified: boolean;
  hasProxy: boolean;
  proxyType?: string;
  
  // Security analysis
  securityScore: number; // 0-100
  securityRisks: string[];
  
  // Liquidity analysis
  hasLiquidity: boolean;
  liquidityScore: number;
  
  lastChecked: string;
}