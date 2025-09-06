// src/lib/blockchain/types/certificates.ts
import type { Address, Hash } from 'viem';

// Base Certificate Types (aligned with backend Certificate model)
export interface Certificate {
  id: string;
  business: string;
  product: string;
  recipient: string;
  
  // Blockchain data
  tokenId?: string;
  contractAddress?: Address;
  txHash?: Hash;
  blockNumber?: number;
  mintedAt?: string;
  
  // Transfer data (relayer wallet system)
  transferTxHash?: Hash;
  transferredToBrand?: boolean;
  transferredAt?: string;
  transferFailed?: boolean;
  transferFailureReason?: string;
  transferAttempts?: number;
  maxTransferAttempts?: number;
  nextTransferAttempt?: string;
  
  // Brand wallet info
  brandWallet?: Address;
  autoTransferEnabled?: boolean;
  
  // Status and metadata
  status: CertificateStatus;
  metadata?: CertificateMetadata;
  delivered?: boolean;
  deliveredAt?: string;
  deliveryMethod?: 'email' | 'sms' | 'wallet' | 'manual';
  
  // Analytics
  viewCount?: number;
  lastViewedAt?: string;
  verificationUrl?: string;
  
  // Revocation (burn)
  revoked?: boolean;
  revokedAt?: string;
  revokedReason?: string;
  revocationTxHash?: Hash;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Certificate NFT representation (for blockchain reads)
export interface CertificateNFT {
  tokenId: string;
  contractAddress: Address;
  owner: Address;
  tokenUri: string;
  metadata?: CertificateMetadata;
  mintTxHash?: Hash;
  transferTxHash?: Hash;
  mintedAt?: string;
  transferredAt?: string;
}

// Certificate metadata (NFT standard + business data)
export interface CertificateMetadata {
  // Standard NFT metadata
  name: string;
  description: string;
  image: string;
  external_url?: string;
  animation_url?: string;
  
  // Certificate-specific attributes
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: 'string' | 'number' | 'date' | 'boost_number' | 'boost_percentage';
  }>;
  
  // Business metadata
  brand?: string;
  product?: string;
  certificateId?: string;
  serialNumber?: string;
  batchNumber?: string;
  manufacturingDate?: string;
  expirationDate?: string;
  qualityCertifications?: string[];
  
  // Verification metadata
  verificationHash?: string;
  issuer?: string;
  issuedAt?: string;
}

// Certificate status enum
export type CertificateStatus = 
  | 'pending'    // Being processed
  | 'minted'     // Minted on blockchain
  | 'transferred' // Transferred to brand wallet
  | 'delivered'  // Delivered to recipient
  | 'failed'     // Minting or transfer failed
  | 'revoked';   // Revoked/burned

// Certificate transfer ownership status
export type CertificateOwnershipStatus = 
  | 'relayer'   // In relayer wallet
  | 'brand'     // In brand wallet
  | 'external'  // In external wallet
  | 'revoked';  // Burned/revoked

// Minting requests and responses
export interface CertificateMintRequest {
  productId: string;
  recipient: string;
  quantity?: number;
  contactMethod?: 'email' | 'wallet';
  
  // Optional certificate data
  certificateData?: {
    serialNumber?: string;
    manufacturingDate?: string;
    expiryDate?: string;
    batchNumber?: string;
    qualityCertifications?: string[];
    customAttributes?: Array<{
      trait_type: string;
      value: string | number;
      display_type?: string;
    }>;
  };
  
  // Delivery options
  deliveryOptions?: {
    method?: 'email' | 'sms' | 'wallet' | 'manual';
    scheduleDate?: string;
    notifyRecipient?: boolean;
    customMessage?: string;
  };
  
  // Transfer options (for relayer system)
  transferOptions?: {
    autoTransfer?: boolean;
    transferDelay?: number; // minutes
    priority?: 'low' | 'medium' | 'high';
  };
}

export interface CertificateMintResponse {
  success: boolean;
  certificateId?: string;
  tokenId?: string;
  txHash?: Hash;
  contractAddress?: Address;
  recipient?: string;
  
  // Transfer info
  transferScheduled?: boolean;
  estimatedTransferTime?: string;
  autoTransferEnabled?: boolean;
  
  // Delivery info
  estimatedDelivery?: string;
  deliveryMethod?: string;
  
  // Next steps and guidance
  nextSteps?: string[];
  message?: string;
  
  // Costs and gas
  mintingCost?: string;
  gasUsed?: string;
}

// Batch minting
export interface BatchCertificateMintRequest {
  certificates: CertificateMintRequest[];
  batchOptions?: {
    delayBetweenMints?: number; // seconds
    maxConcurrent?: number;
    failureMode?: 'continue' | 'stop'; // continue on individual failures or stop
  };
}

export interface BatchCertificateMintResponse {
  success: boolean;
  totalRequested: number;
  successful: number;
  failed: number;
  results: Array<{
    certificateId?: string;
    recipient: string;
    success: boolean;
    error?: string;
    txHash?: Hash;
  }>;
  batchId?: string;
  estimatedDuration?: number; // seconds
}

// Transfer requests and responses (through relayer)
export interface CertificateTransferRequest {
  certificateIds: string[];
  recipientAddress?: Address; // If not provided, uses brand's configured wallet
  transferOptions?: {
    priority?: 'low' | 'medium' | 'high';
    scheduleTime?: string;
    gasLimit?: string;
    customMessage?: string;
  };
}

export interface CertificateTransferResponse {
  success: boolean;
  transferId?: string;
  
  // Eligible/ineligible breakdown
  eligibleCertificates: string[];
  ineligibleCertificates: Array<{
    certificateId: string;
    reason: string;
  }>;
  
  // Transaction info
  txHash?: Hash;
  estimatedGas?: string;
  estimatedCost?: string;
  
  // Scheduling
  scheduledFor?: string;
  estimatedCompletion?: string;
  
  message?: string;
}

// Transfer eligibility check
export interface CertificateTransferEligibility {
  eligible: boolean;
  eligibleCertificates: string[];
  ineligibleCertificates: Array<{
    id: string;
    reason: string;
  }>;
  
  // Requirements
  estimatedGas?: string;
  requiredWalletVerification?: boolean;
  minimumBalance?: string;
  
  // Recommendations
  recommendations?: string[];
}

// Blockchain status and verification
export interface CertificateBlockchainData {
  certificateId: string;
  tokenId: string;
  contractAddress: Address;
  currentOwner: Address;
  
  // Ownership analysis
  isInRelayerWallet: boolean;
  canBeTransferred: boolean;
  ownershipStatus: CertificateOwnershipStatus;
  
  // Blockchain state
  lastTransferBlock?: number;
  mintBlock?: number;
  isVerified: boolean;
  
  // Transfer history
  transferHistory: Array<{
    from: Address;
    to: Address;
    txHash: Hash;
    blockNumber: number;
    timestamp: number;
    gasUsed?: string;
    gasPrice?: string;
  }>;
  
  // Health check
  blockchainHealthy: boolean;
  lastSyncAt?: string;
  syncIssues?: string[];
}

// Certificate analytics and stats
export interface CertificateStats {
  total: number;
  byStatus: Record<CertificateStatus, number>;
  
  // Transfer analytics
  transferred: number;
  inRelayerWallet: number;
  transferSuccessRate: number; // percentage
  averageTransferTime: number; // minutes
  
  // Temporal analytics
  monthlyMinted: number;
  weeklyMinted: number;
  dailyMinted: number;
  
  // Performance metrics
  averageMintTime: number; // seconds
  gasEfficiency: {
    averageGasUsed: string;
    totalGasUsed: string;
    costSavings: string; // from relayer system
  };
  
  // Health metrics
  failureRate: number; // percentage
  retryRate: number; // percentage
  revocationRate: number; // percentage
}

// Certificate search and filtering
export interface CertificateFilters {
  status?: CertificateStatus | CertificateStatus[];
  recipient?: string;
  productId?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  transferStatus?: 'pending' | 'completed' | 'failed';
  ownershipStatus?: CertificateOwnershipStatus;
  includeBlockchainData?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'mintedAt' | 'transferredAt' | 'tokenId';
  sortOrder?: 'asc' | 'desc';
}

export interface CertificateSearchResult {
  certificates: Certificate[];
  total: number;
  filtered: number;
  hasMore: boolean;
  nextOffset?: number;
}

// Certificate verification result
export interface CertificateVerificationResult {
  isValid: boolean;
  certificate?: Certificate;
  blockchainData?: CertificateBlockchainData;
  
  // Verification details
  verifiedAt: string;
  verificationMethod: 'blockchain' | 'database' | 'hybrid';
  
  // Issues found
  issues?: Array<{
    type: 'warning' | 'error';
    message: string;
    code: string;
  }>;
  
  // Verification proof
  proof?: {
    txHash: Hash;
    blockNumber: number;
    ownershipProof: string;
    metadataHash?: string;
  };
}