// src/lib/blockchain/services/certificateService.ts
import { apiClient } from '@/lib/api/client';
import { readContract, readContracts, waitForTransactionReceipt } from 'viem/actions';
import { createPublicClient, http, parseAbi } from 'viem';
import { getContractAddress, getContractABI } from '../config/contracts';
import { getChainConfig, primaryChain } from '../config/chains';
import type { Address, Hash } from 'viem';

// Types
interface CertificateNFT {
  tokenId: string;
  contractAddress: Address;
  owner: Address;
  tokenUri: string;
  metadata?: CertificateMetadata;
  mintTxHash?: string;
  transferTxHash?: string;
  mintedAt?: string;
  transferredAt?: string;
}

interface CertificateMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
  brand?: string;
  product?: string;
  certificateId?: string;
}

interface CertificateTransferRequest {
  certificateIds: string[];
  recipientAddress?: Address;
  transferOptions?: {
    priority?: 'low' | 'medium' | 'high';
    scheduleTime?: Date;
    gasLimit?: string;
  };
}

interface CertificateTransferResponse {
  success: boolean;
  transferId?: string;
  txHash?: string;
  estimatedGas?: string;
  scheduledFor?: string;
  message?: string;
  eligibleCertificates?: string[];
  ineligibleCertificates?: Array<{
    id: string;
    reason: string;
  }>;
}

interface CertificateMintRequest {
  productId: string;
  recipient: string;
  quantity?: number;
  metadata?: {
    customAttributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
    description?: string;
  };
  deliveryOptions?: {
    method: 'email' | 'sms' | 'wallet';
    scheduleDate?: Date;
    notifyRecipient?: boolean;
  };
}

interface CertificateMintResponse {
  success: boolean;
  certificateId?: string;
  tokenId?: string;
  txHash?: string;
  contractAddress?: Address;
  estimatedDelivery?: string;
  message?: string;
}

interface CertificateBlockchainData {
  tokenId: string;
  currentOwner: Address;
  isInRelayerWallet: boolean;
  canBeTransferred: boolean;
  lastTransferBlock?: number;
  transferHistory?: Array<{
    from: Address;
    to: Address;
    txHash: string;
    blockNumber: number;
    timestamp: number;
  }>;
}

class CertificateService {
  private publicClient;

  constructor() {
    // Initialize public client for blockchain reads
    const chainConfig = getChainConfig(primaryChain.id);
    this.publicClient = createPublicClient({
      chain: primaryChain,
      transport: http(chainConfig?.rpcUrl),
    });
  }

  // ======================
  // API-FIRST OPERATIONS (through relayer)
  // ======================

  /**
   * Get all certificates for the authenticated user
   */
  async getCertificates(filters?: {
    status?: string;
    includeBlockchainData?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<CertificateNFT[]> {
    const params = new URLSearchParams();
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.includeBlockchainData) params.append('includeBlockchainData', 'true');
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const url = queryString ? `/certificates?${queryString}` : '/certificates';
    
    const response = await apiClient.get<CertificateNFT[]>(url);
    return response.data;
  }

  /**
   * Get specific certificate by ID
   */
  async getCertificate(certificateId: string, includeBlockchain = true): Promise<CertificateNFT> {
    const params = includeBlockchain ? '?includeBlockchainData=true' : '';
    const response = await apiClient.get<CertificateNFT>(`/certificates/${certificateId}${params}`);
    return response.data;
  }

  /**
   * Mint new certificate (through relayer)
   */
  async mintCertificate(mintRequest: CertificateMintRequest): Promise<CertificateMintResponse> {
    const response = await apiClient.post<CertificateMintResponse>('/certificates/mint', mintRequest);
    return response.data;
  }

  /**
   * Request certificate transfer (through relayer)
   */
  async requestTransfer(transferRequest: CertificateTransferRequest): Promise<CertificateTransferResponse> {
    const response = await apiClient.post<CertificateTransferResponse>('/certificates/transfer', transferRequest);
    return response.data;
  }

  /**
   * Check certificate transfer eligibility
   */
  async checkTransferEligibility(certificateIds: string[]): Promise<{
    eligible: boolean;
    eligibleCertificates: string[];
    ineligibleCertificates: Array<{
      id: string;
      reason: string;
    }>;
    estimatedGas?: string;
    requiredWalletVerification?: boolean;
  }> {
    const response = await apiClient.post('/certificates/transfer/check-eligibility', {
      certificateIds,
    });
    return response.data;
  }

  /**
   * Get certificate blockchain status
   */
  async getBlockchainStatus(certificateId: string): Promise<CertificateBlockchainData> {
    const response = await apiClient.get<CertificateBlockchainData>(
      `/certificates/${certificateId}/blockchain-status`
    );
    return response.data;
  }

  /**
   * Get certificate transfer history
   */
  async getTransferHistory(certificateId: string): Promise<{
    transfers: Array<{
      from: Address;
      to: Address;
      txHash: string;
      blockNumber: number;
      timestamp: number;
      gasUsed?: string;
      status: 'success' | 'failed';
    }>;
    totalTransfers: number;
  }> {
    const response = await apiClient.get(
      `/certificates/${certificateId}/blockchain-status/transfer-history`
    );
    return response.data;
  }

  /**
   * Force refresh certificate blockchain status
   */
  async refreshBlockchainStatus(certificateId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await apiClient.post(`/certificates/${certificateId}/blockchain-status/refresh`);
    return response.data;
  }

  /**
   * Get certificate stats and analytics
   */
  async getStats(): Promise<{
    total: number;
    minted: number;
    pending: number;
    failed: number;
    transferred: number;
    inRelayerWallet: number;
    monthlyMinted: number;
    transferSuccessRate: number;
    averageTransferTime: number;
  }> {
    const response = await apiClient.get('/certificates/stats');
    return response.data;
  }

  // ======================
  // DIRECT BLOCKCHAIN READS
  // ======================

  /**
   * Get certificate owner directly from blockchain
   */
  async getCertificateOwner(tokenId: string): Promise<Address> {
    const contractAddress = getContractAddress(primaryChain.id, 'certificateNFT');
    if (!contractAddress) {
      throw new Error('Certificate contract not deployed on this chain');
    }

    try {
      const owner = await readContract(this.publicClient, {
        address: contractAddress,
        abi: getContractABI('certificateNFT'),
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
      });

      return owner as Address;
    } catch (error) {
      console.error('Failed to get certificate owner:', error);
      throw new Error('Failed to read certificate ownership from blockchain');
    }
  }

  /**
   * Get certificate token URI directly from blockchain
   */
  async getCertificateTokenURI(tokenId: string): Promise<string> {
    const contractAddress = getContractAddress(primaryChain.id, 'certificateNFT');
    if (!contractAddress) {
      throw new Error('Certificate contract not deployed on this chain');
    }

    try {
      const tokenUri = await readContract(this.publicClient, {
        address: contractAddress,
        abi: getContractABI('certificateNFT'),
        functionName: 'tokenURI',
        args: [BigInt(tokenId)],
      });

      return tokenUri as string;
    } catch (error) {
      console.error('Failed to get token URI:', error);
      throw new Error('Failed to read token URI from blockchain');
    }
  }

  /**
   * Get all certificates owned by a specific wallet
   */
  async getCertificatesOwnedBy(walletAddress: Address): Promise<CertificateNFT[]> {
    const contractAddress = getContractAddress(primaryChain.id, 'certificateNFT');
    if (!contractAddress) {
      return [];
    }

    try {
      // Get balance first
      const balance = await readContract(this.publicClient, {
        address: contractAddress,
        abi: getContractABI('certificateNFT'),
        functionName: 'balanceOf',
        args: [walletAddress],
      });

      if (Number(balance) === 0) {
        return [];
      }

      // Get all token IDs owned by this address
      const tokenQueries = Array.from({ length: Number(balance) }, (_, index) => ({
        address: contractAddress,
        abi: getContractABI('certificateNFT'),
        functionName: 'tokenOfOwnerByIndex',
        args: [walletAddress, BigInt(index)],
      }));

      const tokenIds = await readContracts(this.publicClient, {
        contracts: tokenQueries,
      });

      // Get token URIs for metadata
      const uriQueries = tokenIds
        .filter(result => result.status === 'success')
        .map((result) => ({
          address: contractAddress,
          abi: getContractABI('certificateNFT'),
          functionName: 'tokenURI',
          args: [result.result as bigint],
        }));

      const tokenUris = await readContracts(this.publicClient, {
        contracts: uriQueries,
      });

      // Build certificate objects
      const certificates: CertificateNFT[] = [];
      
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenIdResult = tokenIds[i];
        const uriResult = tokenUris[i];
        
        if (tokenIdResult.status === 'success' && uriResult?.status === 'success') {
          let metadata: CertificateMetadata | undefined;
          
          // Try to fetch metadata from URI
          try {
            if (typeof uriResult.result === 'string') {
              const metadataResponse = await fetch(uriResult.result);
              if (metadataResponse.ok) {
                metadata = await metadataResponse.json();
              }
            }
          } catch (error) {
            console.warn('Failed to fetch metadata for token:', tokenIdResult.result);
          }
          
          certificates.push({
            tokenId: tokenIdResult.result!.toString(),
            contractAddress: contractAddress,
            owner: walletAddress,
            tokenUri: uriResult.result as string,
            metadata,
          });
        }
      }
      
      return certificates;
    } catch (error) {
      console.error('Failed to get certificates owned by wallet:', error);
      return [];
    }
  }

  /**
   * Fetch and parse certificate metadata from IPFS/HTTP
   */
  async getCertificateMetadata(tokenUri: string): Promise<CertificateMetadata | null> {
    try {
      // Handle IPFS URLs
      let fetchUrl = tokenUri;
      if (tokenUri.startsWith('ipfs://')) {
        fetchUrl = `https://gateway.pinata.cloud/ipfs/${tokenUri.slice(7)}`;
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const metadata = await response.json();
      return metadata as CertificateMetadata;
    } catch (error) {
      console.error('Failed to fetch certificate metadata:', error);
      return null;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransactionConfirmation(
    txHash: Hash,
    confirmations = 1,
    timeout = 60000
  ): Promise<{
    success: boolean;
    blockNumber?: number;
    gasUsed?: string;
    status?: 'success' | 'reverted';
  }> {
    try {
      const receipt = await waitForTransactionReceipt(this.publicClient, {
        hash: txHash,
        confirmations,
        timeout,
      });

      return {
        success: receipt.status === 'success',
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
      };
    } catch (error) {
      console.error('Transaction confirmation failed:', error);
      return { success: false };
    }
  }

  // ======================
  // UTILITY METHODS
  // ======================

  /**
   * Validate certificate ID format
   */
  isValidCertificateId(certificateId: string): boolean {
    // Basic validation - adjust based on your ID format
    return /^[a-zA-Z0-9-_]{8,}$/.test(certificateId);
  }

  /**
   * Validate token ID format
   */
  isValidTokenId(tokenId: string): boolean {
    try {
      const num = BigInt(tokenId);
      return num >= 0n;
    } catch {
      return false;
    }
  }

  /**
   * Get explorer URL for transaction
   */
  getTransactionExplorerUrl(txHash: string): string {
    const chainConfig = getChainConfig(primaryChain.id);
    return `${chainConfig?.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Get explorer URL for token
   */
  getTokenExplorerUrl(tokenId: string): string {
    const chainConfig = getChainConfig(primaryChain.id);
    const contractAddress = getContractAddress(primaryChain.id, 'certificateNFT');
    return `${chainConfig?.explorerUrl}/token/${contractAddress}?a=${tokenId}`;
  }
}

// Export singleton instance
export const certificateService = new CertificateService();