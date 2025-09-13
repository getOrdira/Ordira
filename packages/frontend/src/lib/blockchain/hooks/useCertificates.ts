// src/lib/blockchain/hooks/useCertificates.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import apiClient from '@/lib/api/client';
import { getContractAddress, getContractABI } from '../config/contracts';
import { primaryChain } from '../config/chains';
import type { Address } from 'viem';

// Types
interface CertificateNFT {
  tokenId: string;
  contractAddress: Address;
  owner: Address;
  tokenUri: string;
  metadata?: {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  mintTxHash?: string;
  transferTxHash?: string;
}

interface CertificateTransferRequest {
  certificateIds: string[];
  recipientAddress?: Address;
  transferOptions?: {
    priority?: 'low' | 'medium' | 'high';
    scheduleTime?: Date;
  };
}

interface CertificateTransferResponse {
  success: boolean;
  transferId?: string;
  txHash?: string;
  estimatedGas?: string;
  message?: string;
}

interface CertificateBlockchainData {
  tokenId: string;
  currentOwner: Address;
  isInRelayerWallet: boolean;
  canBeTransferred: boolean;
  transferHistory: Array<{
    from: Address;
    to: Address;
    txHash: string;
    timestamp: number;
  }>;
}

// Hook to get certificates from API (combines backend data with blockchain verification)
export function useCertificates(filters?: {
  status?: 'all' | 'minted' | 'pending' | 'failed';
  includeBlockchainData?: boolean;
}) {
  return useQuery({
    queryKey: ['certificates', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters?.includeBlockchainData) {
        params.append('includeBlockchainData', 'true');
      }
      
      const queryString = params.toString();
      const url = queryString ? `/certificates?${queryString}` : '/certificates';
      
      return apiClient.get<CertificateNFT[]>(url);
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute to sync blockchain state
  });
}

// Hook to get specific certificate with detailed blockchain data
export function useCertificate(certificateId: string, includeBlockchain = true) {
  return useQuery({
    queryKey: ['certificate', certificateId, includeBlockchain],
    queryFn: async () => {
      const params = includeBlockchain ? '?includeBlockchainData=true' : '';
      return apiClient.get<CertificateNFT>(`/certificates/${certificateId}${params}`);
    },
    enabled: !!certificateId,
    staleTime: 20000, // 20 seconds
  });
}

// Hook to get certificate blockchain status
export function useCertificateBlockchainStatus(certificateId: string) {
  return useQuery({
    queryKey: ['certificate-blockchain-status', certificateId],
    queryFn: async () => {
      return apiClient.get<CertificateBlockchainData>(`/certificates/${certificateId}/blockchain-status`);
    },
    enabled: !!certificateId,
    staleTime: 15000, // 15 seconds - blockchain data changes frequently
    refetchInterval: 30000, // Check blockchain status every 30 seconds
  });
}

// Hook to get certificates owned by a specific wallet (direct blockchain query)
export function useCertificatesOwnedByWallet(walletAddress?: Address) {
  const certificateContract = getContractAddress(primaryChain.id, 'certificateNFT');
  
  // Get balance first
  const { data: balance } = useReadContract({
    address: certificateContract,
    abi: getContractABI('certificateNFT'),
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    query: {
      enabled: !!walletAddress && !!certificateContract,
    },
  });

  // Get all token IDs owned by the wallet
  const tokenQueries = Array.from({ length: Number(balance || 0) }, (_, index) => ({
    address: certificateContract,
    abi: getContractABI('certificateNFT'),
    functionName: 'tokenOfOwnerByIndex',
    args: [walletAddress!, BigInt(index)],
  }));

  const { data: tokenIds } = useReadContracts({
    contracts: tokenQueries,
    query: {
      enabled: !!walletAddress && !!certificateContract && Number(balance || 0) > 0,
    },
  });

  // Get token URIs for metadata
  const uriQueries = (tokenIds || []).map((tokenIdResult) => ({
    address: certificateContract,
    abi: getContractABI('certificateNFT'),
    functionName: 'tokenURI',
    args: [tokenIdResult.result as unknown as bigint],
  }));

  const { data: tokenUris } = useReadContracts({
    contracts: uriQueries,
    query: {
      enabled: !!(tokenIds?.length),
    },
  });

  return useQuery({
    queryKey: ['certificates-owned', walletAddress, tokenIds, tokenUris],
    queryFn: async () => {
      if (!tokenIds || !tokenUris) return [];

      const certificates: CertificateNFT[] = [];
      
      for (let i = 0; i < tokenIds.length; i++) {
        const tokenIdResult = tokenIds[i];
        const uriResult = tokenUris[i];
        
        if (tokenIdResult.status === 'success' && uriResult.status === 'success') {
          let metadata = undefined;
          
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
            contractAddress: certificateContract!,
            owner: walletAddress!,
            tokenUri: uriResult.result as string,
            metadata,
          });
        }
      }
      
      return certificates;
    },
    enabled: !!walletAddress && !!tokenIds && !!tokenUris,
    staleTime: 60000, // 1 minute
  });
}

// Hook to request certificate transfer (through relayer)
export function useRequestCertificateTransfer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: CertificateTransferRequest): Promise<CertificateTransferResponse> => {
      return apiClient.post<CertificateTransferResponse>('/certificates/transfer', request);
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      variables.certificateIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ['certificate', id] });
        queryClient.invalidateQueries({ queryKey: ['certificate-blockchain-status', id] });
      });
    },
  });
}

// Hook to check certificate transfer eligibility
export function useCertificateTransferEligibility(certificateIds: string[]) {
  return useQuery({
    queryKey: ['certificate-transfer-eligibility', certificateIds],
    queryFn: async () => {
      return apiClient.post<{
        eligible: boolean;
        eligibleCertificates: string[];
        ineligibleCertificates: Array<{
          id: string;
          reason: string;
        }>;
        estimatedGas?: string;
        requiredWalletVerification?: boolean;
      }>('/certificates/transfer/check-eligibility', { certificateIds });
    },
    enabled: certificateIds.length > 0,
    staleTime: 10000, // 10 seconds
  });
}

// Hook to get certificate transfer history
export function useCertificateTransferHistory(certificateId: string) {
  return useQuery({
    queryKey: ['certificate-transfer-history', certificateId],
    queryFn: async () => {
      return apiClient.get<{
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
      }>(`/certificates/${certificateId}/blockchain-status/transfer-history`);
    },
    enabled: !!certificateId,
    staleTime: 300000, // 5 minutes - transfer history doesn't change often
  });
}

// Hook to refresh certificate blockchain status (force sync)
export function useRefreshCertificateStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (certificateId: string) => {
      return apiClient.post<{ success: boolean; message: string }>(
        `/certificates/${certificateId}/blockchain-status/refresh`
      );
    },
    onSuccess: (data, certificateId) => {
      // Invalidate related queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['certificate', certificateId] });
      queryClient.invalidateQueries({ queryKey: ['certificate-blockchain-status', certificateId] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
  });
}

// Hook to get certificate stats with blockchain insights
export function useCertificateStats() {
  return useQuery({
    queryKey: ['certificate-stats'],
    queryFn: () => apiClient.get<{
      total: number;
      minted: number;
      pending: number;
      failed: number;
      transferred: number;
      inRelayerWallet: number;
      monthlyMinted: number;
      transferSuccessRate: number;
      averageTransferTime: number;
    }>('/certificates/stats'),
    staleTime: 60000, // 1 minute
  });
}