// src/lib/api/nfts.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/errors'; // Shared error type from common types

export interface NftCertificate {
  _id: string;
  business: string;
  product: string;
  recipient: string;
  tokenId: string;
  txHash: string;
  contractAddress?: string;
  status: 'minted' | 'pending_transfer' | 'transferred_to_brand' | 'transfer_failed' | 'revoked';
  mintedToRelayer: boolean;
  transferredToBrand?: boolean;
  brandWallet?: string;
  transferTxHash?: string;
  transferredAt?: Date;
  transferFailed?: boolean;
  transferError?: string;
  transferAttempts: number;
  maxTransferAttempts: number;
  nextTransferAttempt?: Date;
  autoTransferEnabled: boolean;
  transferDelayMinutes: number;
  transferTimeout: number;
  metadata?: {
    customMessage?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
      display_type?: string;
    }>;
    expirationDate?: Date;
    certificateLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
  };
  deliveryOptions?: {
    scheduleDate?: Date;
    priority?: 'standard' | 'priority' | 'urgent';
    notifyRecipient?: boolean;
  };
  web3Options?: {
    autoTransfer?: boolean;
    transferDelay?: number;
    brandWallet?: string;
    requireCustomerConfirmation?: boolean;
    gasOptimization?: boolean;
  };
  batchId?: string;
  templateId?: string;
  delivered?: boolean;
  deliveredAt?: Date;
  viewCount: number;
  lastViewedAt?: Date;
  verificationUrl?: string;
  revoked?: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NftContract {
  _id: string;
  business: string;
  contractAddress: string;
  name: string;
  symbol: string;
  deployedAt: Date;
  network: string;
  status: 'active' | 'paused' | 'deprecated';
  totalSupply: number;
  maxSupply?: number;
  royaltyPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NftAnalytics {
  summary: {
    totalMinted: number;
    totalTransferred: number;
    transferSuccessRate: number;
    averageGasCost: string;
  };
  trends: any[];
  topProducts: any[];
  recentActivity: Array<{
    type: 'mint' | 'transfer' | 'burn';
    tokenId: string;
    timestamp: Date;
    txHash: string;
  }>;
}

export interface VerificationResult {
  isAuthentic: boolean;
  owner: string;
  mintedAt: Date;
  metadata: any;
  network: string;
  blockNumber: number;
  transactionHash: string;
  certificate?: NftCertificate;
}

// Response interfaces
export interface NftListResponse {
  success: boolean;
  message: string;
  data: {
    nfts: NftCertificate[];
    pagination: any;
    stats: any;
  };
}

export interface BatchMintResponse {
  success: boolean;
  message: string;
  data: {
    batchId: string;
    certificates: NftCertificate[];
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
    errors?: string[];
  };
}

// ===== CONTRACT MANAGEMENT =====

/**
 * Deploys new NFT contract for the business.
 * @param data - Contract deployment parameters
 * @returns Promise<any>
 */
export const deployNftContract = async (data: {
  name: string;
  symbol: string;
  maxSupply?: number;
  royaltyPercentage?: number;
  baseTokenURI?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>('/api/nfts/deploy', data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to deploy NFT contract', 500);
  }
};

/**
 * Lists all NFT contracts for the business.
 * @param params - Query parameters
 * @returns Promise<NftContract[]>
 */
export const getNftContracts = async (params?: {
  status?: 'active' | 'paused' | 'deprecated';
  page?: number;
  limit?: number;
}): Promise<NftContract[]> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {contracts: NftContract[]}}>('/api/nfts/contracts', {
      params,
    });
    return response.data.contracts;
  } catch (error) {
    throw new ApiError('Failed to fetch NFT contracts', 500);
  }
};

// ===== NFT MINTING =====

/**
 * Mints a single NFT certificate.
 * @param data - Mint data
 * @returns Promise<NftCertificate>
 */
export const mintNft = async (data: {
  product: string;
  recipient: string;
  metadata?: NftCertificate['metadata'];
  web3Options?: NftCertificate['web3Options'];
  deliveryOptions?: NftCertificate['deliveryOptions'];
  templateId?: string;
}): Promise<NftCertificate> => {
  try {
    const response = await apiClient.post<{success: boolean; data: {nft: NftCertificate}}>('/api/nfts/mint', data);
    return response.data.nft;
  } catch (error) {
    throw new ApiError('Failed to mint NFT', 500);
  }
};

/**
 * Mints a single NFT using specific endpoint.
 * @param data - Single mint data
 * @returns Promise<NftCertificate>
 */
export const mintSingleNft = async (data: {
  recipient: string;
  metadata: any;
  contractAddress?: string;
}): Promise<NftCertificate> => {
  try {
    const response = await apiClient.post<{success: boolean; data: {nft: NftCertificate}}>('/api/nfts/mint/single', data);
    return response.data.nft;
  } catch (error) {
    throw new ApiError('Failed to mint single NFT', 500);
  }
};

/**
 * Mints NFT certificate for product.
 * @param data - Certificate mint data
 * @returns Promise<NftCertificate>
 */
export const mintCertificateNft = async (data: {
  productId: string;
  recipient: string;
  certificateLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
  customMessage?: string;
  expirationDate?: Date;
}): Promise<NftCertificate> => {
  try {
    const response = await apiClient.post<{success: boolean; data: {certificate: NftCertificate}}>('/api/nfts/mint/certificate', data);
    return response.data.certificate;
  } catch (error) {
    throw new ApiError('Failed to mint certificate NFT', 500);
  }
};

/**
 * Batch mints multiple NFTs.
 * @param certificates - Array of mint data
 * @param batchId - Optional batch ID
 * @returns Promise<BatchMintResponse>
 */
export const batchMintNfts = async (
  certificates: Array<{
    product: string;
    recipient: string;
    metadata?: any;
  }>,
  batchId?: string
): Promise<BatchMintResponse> => {
  try {
    const response = await apiClient.post<BatchMintResponse>('/api/nfts/mint/batch', {
      certificates,
      batchId,
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to batch mint NFTs', 500);
  }
};

/**
 * Airdrops NFTs to multiple recipients.
 * @param data - Airdrop data
 * @returns Promise<BatchMintResponse>
 */
export const airdropNfts = async (data: {
  recipients: string[];
  metadata: any;
  contractAddress?: string;
  templateId?: string;
}): Promise<BatchMintResponse> => {
  try {
    const response = await apiClient.post<BatchMintResponse>('/api/nfts/mint/airdrop', data);
    return response;
  } catch (error) {
    throw new ApiError('Failed to airdrop NFTs', 500);
  }
};

/**
 * Creates lazy mint voucher.
 * @param data - Lazy mint data
 * @returns Promise<any>
 */
export const createLazyMint = async (data: {
  recipient: string;
  metadata: any;
  voucher?: any;
}): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>('/api/nfts/mint/lazy', data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to create lazy mint', 500);
  }
};

/**
 * Mints NFT with media upload.
 * @param file - Media file
 * @param data - Mint data
 * @returns Promise<NftCertificate>
 */
export const mintNftWithMedia = async (file: File, data: {
  recipient: string;
  metadata: any;
}): Promise<NftCertificate> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('recipient', data.recipient);
    formData.append('metadata', JSON.stringify(data.metadata));

    const response = await apiClient.post<{success: boolean; data: {nft: NftCertificate}}>('/api/nfts/mint/with-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.nft;
  } catch (error) {
    throw new ApiError('Failed to mint NFT with media', 500);
  }
};

/**
 * Mints NFT from template.
 * @param data - Template mint data
 * @returns Promise<NftCertificate>
 */
export const mintFromTemplate = async (data: {
  templateId: string;
  recipient: string;
  customizations?: any;
}): Promise<NftCertificate> => {
  try {
    const response = await apiClient.post<{success: boolean; data: {nft: NftCertificate}}>('/api/nfts/mint/from-template', data);
    return response.data.nft;
  } catch (error) {
    throw new ApiError('Failed to mint NFT from template', 500);
  }
};

/**
 * Mints generative NFT.
 * @param data - Generative mint data
 * @returns Promise<NftCertificate>
 */
export const mintGenerativeNft = async (data: {
  recipient: string;
  generativeRules: any;
  seed?: string;
}): Promise<NftCertificate> => {
  try {
    const response = await apiClient.post<{success: boolean; data: {nft: NftCertificate}}>('/api/nfts/mint/generative', data);
    return response.data.nft;
  } catch (error) {
    throw new ApiError('Failed to mint generative NFT', 500);
  }
};

/**
 * Validates minting parameters before execution.
 * @param data - Parameters to validate
 * @returns Promise<any>
 */
export const validateMintingParams = async (data: {
  recipient: string;
  contractAddress?: string;
  metadata: any;
}): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>('/api/nfts/mint/validate', data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to validate minting parameters', 500);
  }
};

/**
 * Gets minting quota and usage.
 * @returns Promise<any>
 */
export const getMintingQuota = async (): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>('/api/nfts/mint/quota');
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch minting quota', 500);
  }
};

/**
 * Estimates gas costs for minting.
 * @param params - Gas estimation parameters
 * @returns Promise<any>
 */
export const estimateMintingGas = async (params: {
  recipient: string;
  contractAddress?: string;
  batchSize?: number;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>('/api/nfts/mint/estimate-gas', {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to estimate minting gas', 500);
  }
};

/**
 * Gets minting job history.
 * @param params - Query parameters
 * @returns Promise<any>
 */
export const getMintingJobs = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>('/api/nfts/mint/jobs', {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch minting jobs', 500);
  }
};

/**
 * Gets specific minting job status.
 * @param jobId - Job ID
 * @returns Promise<any>
 */
export const getMintingJobStatus = async (jobId: string): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/nfts/mint/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch minting job status', 500);
  }
};

/**
 * Retries failed minting job.
 * @param jobId - Job ID
 * @returns Promise<any>
 */
export const retryMintingJob = async (jobId: string): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>(`/api/nfts/mint/jobs/${jobId}/retry`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to retry minting job', 500);
  }
};

/**
 * Cancels minting job.
 * @param jobId - Job ID
 * @returns Promise<any>
 */
export const cancelMintingJob = async (jobId: string): Promise<any> => {
  try {
    const response = await apiClient.delete<{success: boolean; data: any}>(`/api/nfts/mint/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to cancel minting job', 500);
  }
};

/**
 * Schedules minting for later execution.
 * @param data - Schedule data
 * @returns Promise<any>
 */
export const scheduleMinting = async (data: {
  scheduleTime: Date;
  mintData: any;
  recurring?: boolean;
}): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>('/api/nfts/mint/schedule', data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to schedule minting', 500);
  }
};

/**
 * Gets minting templates.
 * @param params - Query parameters
 * @returns Promise<any>
 */
export const getMintingTemplates = async (params?: {
  category?: string;
  page?: number;
  limit?: number;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>('/api/nfts/mint/templates', {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch minting templates', 500);
  }
};

/**
 * Creates minting template.
 * @param data - Template data
 * @returns Promise<any>
 */
export const createMintingTemplate = async (data: {
  name: string;
  description?: string;
  metadata: any;
  category?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>('/api/nfts/mint/templates', data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to create minting template', 500);
  }
};

/**
 * Gets minting analytics.
 * @param params - Analytics parameters
 * @returns Promise<any>
 */
export const getMintingAnalytics = async (params?: {
  startDate?: string;
  endDate?: string;
  breakdown?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>('/api/nfts/mint/analytics', {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch minting analytics', 500);
  }
};

// ===== NFT MANAGEMENT =====

/**
 * Lists NFTs/certificates for the business.
 * @param params - Query parameters
 * @returns Promise<NftListResponse>
 */
export const getNfts = async (params?: {
  business?: string;
  status?: NftCertificate['status'];
  product?: string;
  page?: number;
  limit?: number;
}): Promise<NftListResponse> => {
  try {
    const response = await apiClient.get<NftListResponse>('/api/nfts', {
      params,
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch NFTs', 500);
  }
};

/**
 * Gets a single NFT by ID.
 * @param id - NFT ID
 * @returns Promise<NftCertificate>
 */
export const getNft = async (id: string): Promise<NftCertificate> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {nft: NftCertificate}}>(`/api/nfts/${id}`);
    return response.data.nft;
  } catch (error) {
    throw new ApiError('Failed to fetch NFT', 500);
  }
};

/**
 * Gets NFT metadata.
 * @param id - NFT ID
 * @param params - Query parameters
 * @returns Promise<any>
 */
export const getNftMetadata = async (id: string, params?: {
  includeIPFS?: boolean;
  refreshFromSource?: boolean;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/nfts/${id}/metadata`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch NFT metadata', 500);
  }
};

/**
 * Updates NFT metadata (if mutable).
 * @param id - NFT ID
 * @param metadata - Updated metadata
 * @returns Promise<NftCertificate>
 */
export const updateNftMetadata = async (id: string, metadata: any): Promise<NftCertificate> => {
  try {
    const response = await apiClient.put<{success: boolean; data: {nft: NftCertificate}}>(`/api/nfts/${id}/metadata`, { metadata });
    return response.data.nft;
  } catch (error) {
    throw new ApiError('Failed to update NFT metadata', 500);
  }
};

/**
 * Refreshes NFT metadata from IPFS/external source.
 * @param id - NFT ID
 * @returns Promise<any>
 */
export const refreshNftMetadata = async (id: string): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>(`/api/nfts/${id}/metadata/refresh`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to refresh NFT metadata', 500);
  }
};

/**
 * Gets NFT attributes and traits.
 * @param id - NFT ID
 * @returns Promise<any>
 */
export const getNftAttributes = async (id: string): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/nfts/${id}/attributes`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch NFT attributes', 500);
  }
};

/**
 * Updates NFT attributes.
 * @param id - NFT ID
 * @param attributes - Updated attributes
 * @returns Promise<any>
 */
export const updateNftAttributes = async (id: string, attributes: any[]): Promise<any> => {
  try {
    const response = await apiClient.put<{success: boolean; data: any}>(`/api/nfts/${id}/attributes`, { attributes });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to update NFT attributes', 500);
  }
};

// ===== OWNERSHIP AND TRANSFERS =====

/**
 * Gets NFT ownership information.
 * @param id - NFT ID
 * @returns Promise<any>
 */
export const getNftOwnership = async (id: string): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/nfts/${id}/ownership`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch NFT ownership', 500);
  }
};

/**
 * Gets current NFT owner.
 * @param id - NFT ID
 * @returns Promise<any>
 */
export const getNftOwner = async (id: string): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/nfts/${id}/owner`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch NFT owner', 500);
  }
};

/**
 * Transfers NFT to brand wallet.
 * @param id - NFT ID
 * @param data - Transfer data
 * @returns Promise<NftCertificate>
 */
export const transferNft = async (id: string, data?: {
  toAddress?: string;
  gasOptimization?: boolean;
}): Promise<NftCertificate> => {
  try {
    const response = await apiClient.post<{success: boolean; data: {nft: NftCertificate}}>(`/api/nfts/${id}/transfer`, data);
    return response.data.nft;
  } catch (error) {
    throw new ApiError('Failed to transfer NFT', 500);
  }
};

/**
 * Transfers NFT using main transfer endpoint.
 * @param data - Transfer data
 * @returns Promise<any>
 */
export const transferNftGeneral = async (data: {
  tokenId: string;
  contractAddress: string;
  toAddress: string;
  fromAddress?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>('/api/nfts/transfer', data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to transfer NFT', 500);
  }
};

/**
 * Batch transfers multiple NFTs.
 * @param data - Batch transfer data
 * @returns Promise<any>
 */
export const batchTransferNfts = async (data: {
  transfers: Array<{
    nftId: string;
    toAddress: string;
  }>;
}): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>(`/api/nfts/transfer/batch`, data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to batch transfer NFTs', 500);
  }
};

/**
 * Schedules NFT transfer.
 * @param id - NFT ID
 * @param data - Schedule data
 * @returns Promise<any>
 */
export const scheduleNftTransfer = async (id: string, data: {
  scheduleTime: Date;
  toAddress: string;
  recurring?: boolean;
}): Promise<any> => {
  try {
    const response = await apiClient.post<{success: boolean; data: any}>(`/api/nfts/${id}/transfer/schedule`, data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to schedule NFT transfer', 500);
  }
};

/**
 * Estimates gas for transfer transaction.
 * @param id - NFT ID
 * @param params - Gas estimation parameters
 * @returns Promise<any>
 */
export const estimateTransferGas = async (id: string, params: {
  toAddress: string;
  gasOptimization?: boolean;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/nfts/${id}/transfer/estimate-gas`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to estimate transfer gas', 500);
  }
};

/**
 * Gets transfer history.
 * @param id - NFT ID
 * @param params - Query parameters
 * @returns Promise<any>
 */
export const getTransferHistory = async (id: string, params?: {
  page?: number;
  limit?: number;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/nfts/${id}/transfer-history`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch transfer history', 500);
  }
};

// ===== VERIFICATION =====

/**
 * Verifies NFT authenticity.
 * @param tokenId - Token ID
 * @param contractAddress - Contract address
 * @returns Promise<VerificationResult>
 */
export const verifyNft = async (tokenId: string, contractAddress?: string): Promise<VerificationResult> => {
  try {
    const response = await apiClient.get<{success: boolean; data: VerificationResult}>(`/api/nfts/verify/${tokenId}`, {
      params: { contractAddress },
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to verify NFT', 500);
  }
};

/**
 * Gets NFT verification status.
 * @param id - NFT ID
 * @returns Promise<any>
 */
export const getNftVerification = async (id: string): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/nfts/${id}/verification`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch NFT verification', 500);
  }
};

// ===== ANALYTICS =====

/**
 * Gets comprehensive NFT analytics.
 * @param params - Analytics parameters
 * @returns Promise<NftAnalytics>
 */
export const getNftAnalytics = async (params?: {
  startDate?: string;
  endDate?: string;
  breakdown?: string;
  metrics?: string[];
}): Promise<NftAnalytics> => {
  try {
    const response = await apiClient.get<{success: boolean; data: NftAnalytics}>('/api/nfts/analytics', {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch NFT analytics', 500);
  }
};

/**
 * Gets NFT analytics for specific NFT.
 * @param id - NFT ID
 * @param params - Analytics parameters
 * @returns Promise<any>
 */
export const getNftAnalyticsById = async (id: string, params?: {
  includeMarketData?: boolean;
  includeUtilityMetrics?: boolean;
}): Promise<any> => {
  try {
    const response = await apiClient.get<{success: boolean; data: any}>(`/api/nfts/${id}/analytics`, {
      params,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch NFT analytics', 500);
  }
};

// ===== CERTIFICATES =====

/**
 * Lists all issued certificates.
 * @param params - Query parameters
 * @returns Promise<NftCertificate[]>
 */
export const getCertificates = async (params?: {
  productId?: string;
  status?: NftCertificate['status'];
  page?: number;
  limit?: number;
}): Promise<NftCertificate[]> => {
  try {
    const response = await apiClient.get<{success: boolean; data: {certificates: NftCertificate[]}}>('/api/nfts/certificates', {
      params,
    });
    return response.data.certificates;
  } catch (error) {
    throw new ApiError('Failed to fetch certificates', 500);
  }
};

/**
 * Revokes/burns an NFT.
 * @param tokenId - Token ID
 * @param data - Revoke data
 * @returns Promise<any>
 */
export const burnNft = async (tokenId: string, data: {
  contractAddress: string;
  reason?: string;
}): Promise<any> => {
  try {
    const response = await apiClient.delete<{success: boolean; data: any}>(`/api/nfts/${tokenId}`, {
      data,
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to burn NFT', 500);
  }
};

// Legacy function aliases for backward compatibility
export const listCertificates = getCertificates;
export const revokeNft = (id: string, reason?: string) => 
  burnNft(id, { contractAddress: '', reason });