/**
 * NFT Feature Types
 *
 * Mirrors backend NFT service contracts while providing
 * frontend-friendly aliases and supplemental interfaces.
 */

import type { PaginationMeta } from '@/lib/types/core';

// ===== Re-export backend types with feature-specific aliases =====
export type {
  DeployContractParams as NftDeployContractParams,
  MintParams as NftMintParams,
  BurnParams as NftBurnParams,
  TransferParams as NftTransferParams,
  DeploymentResult as NftDeploymentResult,
  MintResult as NftMintResult,
  VerificationResult as NftVerificationResult,
  CertificateAnalytics as NftCertificateAnalytics,
  Analytics as NftAnalyticsOverview,
  TemplateUploadResult as NftTemplateUploadResult,
} from '@backend/services/blockchain/nft.service';

export type {
  NftContractInfo,
  TransferResult as NftTransferResult,
} from '@backend/services/types/blockchain.types';

/**
 * Supported NFT certificate statuses returned by the backend.
 */
export type NftCertificateStatus =
  | 'minted'
  | 'pending'
  | 'pending_transfer'
  | 'transferred_to_brand'
  | 'transfer_failed'
  | 'revoked';

/**
 * Attribute metadata attached to NFT certificates.
 */
export interface NftCertificateAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

/**
 * NFT certificate metadata payload with optional certificate sub-document.
 */
export interface NftCertificateMetadata {
  name?: string;
  description?: string;
  attributes?: NftCertificateAttribute[];
  imageUrl?: string;
  metadataUri?: string;
  certificate?: {
    recipient?: string;
    issuer?: string;
    issuedAt?: string;
    expiresAt?: string;
    certificateId?: string;
  };
  [key: string]: unknown;
}

/**
 * S3 storage keys associated with minted NFT certificate assets.
 */
export interface NftCertificateS3Keys {
  metadata?: string;
  image?: string;
  thumbnail?: string;
  [key: string]: unknown;
}

/**
 * NFT certificate record as returned by list endpoints.
 */
export interface NftCertificateRecord {
  _id: string;
  business: string;
  product?: string;
  recipient: string;
  tokenId: string;
  txHash?: string;
  contractAddress?: string;
  status: NftCertificateStatus | string;
  mintedAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  mintedToRelayer?: boolean;
  autoTransferEnabled?: boolean;
  transferTxHash?: string;
  imageUrl?: string;
  metadataUri?: string;
  thumbnailUrl?: string;
  verificationUrl?: string;
  s3Keys?: NftCertificateS3Keys;
  metadata?: NftCertificateMetadata;
  additionalFields?: Record<string, unknown>;
}

/**
 * Contract list entry returned by NFT data endpoints.
 */
export interface NftContractRecord {
  _id: string;
  contractAddress: string;
  name: string;
  symbol: string;
  status: 'active' | 'inactive' | 'pending' | 'archived';
  totalSupply?: number;
  maxSupply?: number;
  deployedAt?: string | Date;
  lastMintedAt?: string | Date;
  [key: string]: unknown;
}

/**
 * Query options for listing NFT certificates.
 */
export interface NftCertificateListFilters {
  productId?: string;
  status?: NftCertificateStatus | string;
  sortBy?: 'createdAt' | 'tokenId' | 'mintedAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  page?: number;
}

/**
 * Paginated NFT certificate list response.
 */
export interface NftCertificateListResponse {
  certificates: NftCertificateRecord[];
  pagination: PaginationMeta;
  total: number;
}

/**
 * Analytics query filters accepted by the analytics API.
 */
export interface NftAnalyticsQuery {
  startDate?: Date | string;
  endDate?: Date | string;
  contractAddress?: string;
}

/**
 * Result returned when burning an NFT certificate.
 */
export interface NftBurnResult {
  burnedAt: Date | string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  storageReclaimed: string;
  costsRecovered: string;
}



