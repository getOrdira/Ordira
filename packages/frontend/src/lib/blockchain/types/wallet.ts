// src/lib/blockchain/types/wallet.ts
import type { Address, Hash } from 'viem';

// Core wallet connection state
export interface WalletConnection {
  address: Address;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number;
  
  // Verification status
  isVerified?: boolean;
  verificationTxHash?: Hash;
  verificationExpiresAt?: string;
  
  // ENS and metadata
  ensName?: string;
  ensAvatar?: string;
  
  // Connector info
  connectorId?: string;
  connectorName?: string;
  
  // Connection quality
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  lastSeen?: string;
}

// Comprehensive wallet overview (from backend API)
export interface WalletOverview {
  // Connection state
  isConnected: boolean;
  address?: Address;
  chainId?: number;
  networkName?: string;
  
  // Verification state
  isVerified: boolean;
  verificationStatus: 'verified' | 'pending' | 'unverified' | 'failed' | 'expired';
  lastVerificationAt?: string;
  verificationExpiresAt?: string;
  
  // Wallet metadata
  walletType?: string;
  ensName?: string;
  
  // Transfer capabilities
  canReceiveTransfers: boolean;
  transferEligibility?: {
    eligible: boolean;
    reasons?: string[];
  };
  
  // Platform features
  web3Features: {
    tokenDiscounts: boolean;
    certificateTransfers: boolean;
    voting: boolean;
    staking: boolean;
  };
  
  // Account status
  accountAge?: number; // days since first connection
  totalTransactions?: number;
  lastActivity?: string;
}

// Wallet verification system
export interface WalletVerificationChallenge {
  message: string;
  nonce: string;
  challengeId: string;
  expiresAt: string;
  domain?: string;
}

export interface WalletVerificationRequest {
  walletAddress: Address;
  signature: Hash;
  message: string;
  challengeId: string;
  chainId?: number;
  timestamp?: number;
}

export interface WalletVerificationResponse {
  success: boolean;
  verified: boolean;
  
  // Transaction info (if on-chain verification)
  txHash?: Hash;
  blockNumber?: number;
  
  // Expiry information
  expiresAt?: string;
  validityPeriod?: number; // days
  
  // Features unlocked
  features: string[];
  
  // Next steps
  message: string;
  nextSteps?: string[];
}

export interface WalletVerificationStatus {
  isVerified: boolean;
  verifiedAt?: string;
  verificationTxHash?: Hash;
  expiresAt?: string;
  
  // Verification details
  requiresReverification: boolean;
  verificationMethod: 'signature' | 'transaction' | 'none';
  
  // Last attempt info
  lastAttempt?: {
    timestamp: string;
    status: 'success' | 'failed' | 'pending';
    error?: string;
    challengeId?: string;
  };
  
  // Security score
  securityScore?: number; // 0-100
  trustLevel?: 'low' | 'medium' | 'high';
}

// Wallet verification history
export interface WalletVerificationHistory {
  verifications: Array<{
    id: string;
    timestamp: string;
    status: 'success' | 'failed' | 'expired' | 'revoked';
    method: 'signature' | 'transaction';
    
    // Transaction data (if applicable)
    txHash?: Hash;
    blockNumber?: number;
    
    // Validity period
    expiresAt?: string;
    expiredAt?: string;
    
    // Context
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    
    // Failure reasons
    failureReason?: string;
  }>;
  
  // Summary statistics
  totalVerifications: number;
  successfulVerifications: number;
  lastSuccessfulVerification?: string;
  averageValidityPeriod?: number; // days
  securityScore: number; // 0-100, based on verification patterns
}

// Wallet security settings
export interface WalletSecuritySettings {
  // Transfer security
  requireSignatureForTransfers: boolean;
  transferCooldownPeriod: number; // minutes
  maxTransferAmount?: string;
  
  // Multi-signature settings
  enableMultisig: boolean;
  multisigThreshold: number;
  allowedSigners: Address[];
  
  // Session management
  sessionTimeout: number; // minutes
  requireReauthForSensitive: boolean;
  
  // Notification preferences
  notifyOnTransfers: boolean;
  notifyOnLogins: boolean;
  notifyOnSecurityChanges: boolean;
  
  // Security features
  whitelistedAddresses: Address[];
  blacklistedAddresses: Address[];
  restrictToKnownNetworks: boolean;
  
  // Backup and recovery
  hasBackup: boolean;
  lastBackupAt?: string;
  backupEncrypted: boolean;
  
  // Timestamps
  lastUpdated: string;
  updatedBy: string;
}

// Wallet analytics and usage data
export interface WalletAnalytics {
  // Basic usage
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  
  // Gas analytics
  totalGasUsed: string;
  averageGasPrice: string;
  totalGasCost: string; // in ETH
  gasSavings: string; // from relayer system
  
  // Certificate operations
  certificatesReceived: number;
  certificatesTransferred: number;
  certificateTransferSuccessRate: number; // percentage
  
  // Token operations
  tokenBalance: {
    current: string;
    highest: string;
    lowest: string;
    averageOver30d: string;
  };
  
  // Discount usage
  discountsUsed: number;
  discountsSaved: string; // USD value
  discountTierAchieved?: string;
  
  // Platform engagement
  daysActive: number;
  lastActiveDate: string;
  featureUsage: {
    voting: number;
    certificateViewing: number;
    walletConnections: number;
  };
  
  // Time range for analytics
  timeRange: string; // e.g., "30d", "90d", "1y"
  generatedAt: string;
}

// Wallet health monitoring
export interface WalletHealthStatus {
  isHealthy: boolean;
  overallScore: number; // 0-100
  
  // Health indicators
  issues: Array<{
    type: 'critical' | 'warning' | 'info';
    category: 'connection' | 'security' | 'performance' | 'balance';
    message: string;
    code: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  
  // Specific health metrics
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  networkLatency?: number; // ms
  balanceHealth: {
    hasMinimumBalance: boolean;
    canPayGasFees: boolean;
    lowBalanceWarning: boolean;
  };
  
  // Security health
  securityHealth: {
    verificationStatus: 'verified' | 'unverified' | 'expired';
    unusualActivity: boolean;
    suspiciousPatterns: string[];
  };
  
  // Recommendations
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
    estimatedImpact: string;
  }>;
  
  lastChecked: string;
}

// Wallet connection request/response
export interface ConnectWalletRequest {
  walletAddress: Address;
  chainId: number;
  walletType?: string;
  connectorId?: string;
  
  // Optional verification data
  signature?: Hash;
  message?: string;
  timestamp?: number;
  
  // Device and context info
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    isMobile?: boolean;
  };
}

export interface ConnectWalletResponse {
  success: boolean;
  
  // Connection details
  walletAddress: Address;
  chainId: number;
  networkName: string;
  
  // Verification requirements
  requiresVerification: boolean;
  verificationMessage?: string;
  verificationRequired?: boolean;
  
  // Available features
  features: string[];
  featureDetails: {
    tokenDiscounts: boolean;
    certificateTransfers: boolean;
    voting: boolean;
    premiumFeatures: boolean;
  };
  
  // Next steps
  nextSteps: string[];
  message: string;
  
  // Session info
  sessionId?: string;
  expiresAt?: string;
}

// Wallet disconnection
export interface DisconnectWalletRequest {
  walletAddress: Address;
  removeFromBackend?: boolean;
  reason?: 'user_requested' | 'security' | 'network_change' | 'error';
}

export interface DisconnectWalletResponse {
  success: boolean;
  message: string;
  clearedData: string[]; // What data was cleared
}

// Wallet backup and recovery
export interface WalletBackup {
  backupId: string;
  createdAt: string;
  expiresAt: string;
  
  // Backup contents
  backupType: 'settings' | 'full' | 'security_only';
  includesSettings: boolean;
  includesTransactionHistory: boolean;
  includesSecuritySettings: boolean;
  
  // Download info
  downloadUrl: string;
  downloadExpiresAt: string;
  downloadCount: number;
  maxDownloads: number;
  
  // Encryption
  isEncrypted: boolean;
  encryptionMethod?: string;
  
  // Size and verification
  fileSizeBytes: number;
  checksumHash: string;
  
  // Status
  status: 'creating' | 'ready' | 'expired' | 'downloaded';
}

export interface CreateWalletBackupRequest {
  backupType: 'settings' | 'full' | 'security_only';
  encryptWithPassword?: boolean;
  password?: string;
  includeTransactionHistory?: boolean;
  retentionDays?: number; // How long to keep the backup
}

export interface CreateWalletBackupResponse {
  success: boolean;
  backup: WalletBackup;
  message: string;
  
  // Security warnings
  securityReminders: string[];
}

// Network and chain utilities
export interface NetworkInfo {
  chainId: number;
  name: string;
  shortName: string;
  currency: string;
  isTestnet: boolean;
  
  // RPC and explorer
  rpcUrl: string;
  explorerUrl: string;
  explorerApiUrl?: string;
  
  // Network characteristics
  blockTime: number; // seconds
  confirmations: number; // required confirmations
  gasMultiplier: number; // gas buffer multiplier
  
  // Status
  isSupported: boolean;
  isHealthy: boolean;
  averageLatency?: number; // ms
}

export interface NetworkStatus {
  chainId: number;
  isHealthy: boolean;
  
  // Connection metrics
  latency?: number; // ms
  blockNumber?: number;
  lastBlockTime?: number;
  
  // Issues
  issues: string[];
  lastChecked: string;
  
  // Performance
  avgBlockTime?: number;
  networkCongestion?: 'low' | 'medium' | 'high';
  
  error?: string;
}

// Wallet utilities and helpers
export interface WalletCapabilities {
  // Basic capabilities
  supportsSignTypedData: boolean;
  supportsChainSwitching: boolean;
  supportsEIP1559: boolean; // Type 2 transactions
  supportsPersonalSign: boolean;
  
  // Advanced features
  supportsWalletConnect: boolean;
  supportsBatchTransactions: boolean;
  supportsGasEstimation: boolean;
  
  // Wallet-specific features
  walletName: string;
  walletVersion?: string;
  isHardwareWallet: boolean;
  isMobileWallet: boolean;
  isInjected: boolean;
  
  // Security features
  supportsHardwareWallets: boolean;
  supportsMultisig: boolean;
  hasBuiltInSwap: boolean;
}

// Wallet balance information
export interface WalletBalance {
  // Native currency balance
  nativeBalance: {
    balance: bigint;
    formatted: string;
    symbol: string;
    usdValue?: number;
  };
  
  // Token balances
  tokenBalances: Array<{
    address: Address;
    symbol: string;
    name: string;
    balance: bigint;
    formatted: string;
    decimals: number;
    usdValue?: number;
    logoUri?: string;
  }>;
  
  // Total portfolio value
  totalUsdValue?: number;
  
  // Chain info
  chainId: number;
  networkName: string;
  
  // Update info
  lastUpdated: number;
  isStale: boolean;
}

// Transaction history
export interface WalletTransaction {
  hash: Hash;
  blockNumber: number;
  timestamp: number;
  
  // Transaction details
  from: Address;
  to: Address;
  value: string;
  valueFormatted: string;
  
  // Gas information
  gasUsed?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasCost?: string;
  
  // Transaction type
  type: 'send' | 'receive' | 'contract_interaction' | 'token_transfer' | 'approval';
  status: 'success' | 'failed' | 'pending';
  
  // Token information (if token transfer)
  tokenAddress?: Address;
  tokenSymbol?: string;
  tokenDecimals?: number;
  
  // Platform context
  relatedTo?: 'certificate' | 'discount' | 'voting' | 'verification' | 'other';
  description?: string;
  
  // Transaction metadata
  nonce: number;
  confirmations: number;
  chainId: number;
}

// Supported wallets configuration
export interface SupportedWallet {
  id: string;
  name: string;
  icon?: string;
  
  // Availability
  isInstalled: boolean;
  isReady: boolean;
  isSupported: boolean;
  
  // Download information
  downloadUrl?: string;
  installInstructions?: string;
  
  // Wallet characteristics
  type: 'injected' | 'walletconnect' | 'hardware' | 'mobile';
  isMobile: boolean;
  isDesktop: boolean;
  isHardware: boolean;
  
  // Features
  capabilities: string[];
  popularityRank?: number;
  isRecommended?: boolean;
}

// Wallet connection errors
export interface WalletError {
  code: string;
  message: string;
  details?: string;
  
  // Error categorization
  type: 'connection' | 'network' | 'user_rejected' | 'unsupported' | 'security' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Recovery suggestions
  canRetry: boolean;
  suggestions: string[];
  
  // Context
  walletType?: string;
  chainId?: number;
  timestamp: number;
}

// Wallet session management
export interface WalletSession {
  sessionId: string;
  walletAddress: Address;
  
  // Session details
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isActive: boolean;
  
  // Session context
  chainId: number;
  walletType: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Permissions
  permissions: string[];
  restrictedActions?: string[];
  
  // Security
  requiresReauth: boolean;
  authLevel: 'basic' | 'verified' | 'high_security';
}