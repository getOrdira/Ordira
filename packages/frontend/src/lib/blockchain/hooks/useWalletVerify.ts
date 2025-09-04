// src/lib/blockchain/hooks/useWalletVerify.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount, useSignMessage } from 'wagmi';
import { apiClient } from '@/lib/api/client';
import type { Address } from 'viem';

// Types
interface WalletVerificationStatus {
  isVerified: boolean;
  verifiedAt?: string;
  verificationTxHash?: string;
  expiresAt?: string;
  requiresReverification: boolean;
  verificationMethod: 'signature' | 'transaction' | 'none';
  lastAttempt?: {
    timestamp: string;
    status: 'success' | 'failed' | 'pending';
    error?: string;
  };
}

interface VerificationChallenge {
  message: string;
  nonce: string;
  expiresAt: string;
  challengeId: string;
}

interface VerifyWalletRequest {
  walletAddress: Address;
  signature: string;
  message: string;
  challengeId: string;
  chainId?: number;
}

interface VerifyWalletResponse {
  success: boolean;
  verified: boolean;
  txHash?: string;
  expiresAt?: string;
  features: string[];
  message: string;
}

// Hook to get wallet verification status
export function useWalletVerificationStatus(walletAddress?: Address) {
  return useQuery({
    queryKey: ['wallet-verification-status', walletAddress],
    queryFn: async (): Promise<WalletVerificationStatus> => {
      return apiClient.get<WalletVerificationStatus>(`/brands/wallet/verify/status?address=${walletAddress}`);
    },
    enabled: !!walletAddress,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Check every 5 minutes
  });
}

// Hook to request verification challenge
export function useRequestVerificationChallenge() {
  return useMutation({
    mutationFn: async (walletAddress: Address): Promise<VerificationChallenge> => {
      return apiClient.post<VerificationChallenge>('/brands/wallet/verify/challenge', {
        walletAddress,
      });
    },
  });
}

// Hook to verify wallet ownership
export function useVerifyWallet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: VerifyWalletRequest): Promise<VerifyWalletResponse> => {
      return apiClient.post<VerifyWalletResponse>('/brands/wallet/verify', request);
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries on successful verification
      queryClient.invalidateQueries({ 
        queryKey: ['wallet-verification-status', variables.walletAddress] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['wallet-overview'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['certificates'] 
      });
    },
  });
}

// Hook for complete wallet verification flow
export function useWalletVerificationFlow() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const requestChallenge = useRequestVerificationChallenge();
  const verifyWallet = useVerifyWallet();
  const verificationStatus = useWalletVerificationStatus(address);
  
  const startVerification = async () => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      // Step 1: Request verification challenge
      const challenge = await requestChallenge.mutateAsync(address);
      
      // Step 2: Sign the challenge message
      const signature = await signMessageAsync({
        message: challenge.message,
      });
      
      // Step 3: Submit verification
      const result = await verifyWallet.mutateAsync({
        walletAddress: address,
        signature,
        message: challenge.message,
        challengeId: challenge.challengeId,
      });
      
      return result;
    } catch (error) {
      console.error('Wallet verification failed:', error);
      throw error;
    }
  };
  
  return {
    // Current verification status
    isVerified: verificationStatus.data?.isVerified || false,
    verificationStatus: verificationStatus.data,
    isLoadingStatus: verificationStatus.isLoading,
    
    // Verification flow
    startVerification,
    isVerifying: requestChallenge.isPending || verifyWallet.isPending,
    
    // Individual step states
    isRequestingChallenge: requestChallenge.isPending,
    isSubmittingVerification: verifyWallet.isPending,
    
    // Errors
    error: requestChallenge.error || verifyWallet.error || verificationStatus.error,
    
    // Results
    verificationResult: verifyWallet.data,
    
    // Refresh status
    refreshStatus: verificationStatus.refetch,
  };
}

// Hook to check if verification is required for specific actions
export function useVerificationRequirement(action: 'transfer' | 'voting' | 'discount') {
  const { address } = useAccount();
  
  return useQuery({
    queryKey: ['verification-requirement', action, address],
    queryFn: async () => {
      return apiClient.get<{
        required: boolean;
        reason?: string;
        currentPlan: string;
        upgradeRequired: boolean;
        features: string[];
      }>(`/brands/wallet/verify/requirement?action=${action}&address=${address}`);
    },
    enabled: !!address,
    staleTime: 300000, // 5 minutes - requirements don't change often
  });
}

// Hook to get verification history
export function useWalletVerificationHistory(walletAddress?: Address) {
  return useQuery({
    queryKey: ['wallet-verification-history', walletAddress],
    queryFn: async () => {
      return apiClient.get<{
        verifications: Array<{
          id: string;
          timestamp: string;
          status: 'success' | 'failed' | 'expired';
          method: 'signature' | 'transaction';
          txHash?: string;
          expiresAt?: string;
          ipAddress?: string;
          userAgent?: string;
        }>;
        totalVerifications: number;
        lastSuccessfulVerification?: string;
        securityScore: number;
      }>(`/brands/wallet/verify/history?address=${walletAddress}`);
    },
    enabled: !!walletAddress,
    staleTime: 300000, // 5 minutes
  });
}

// Hook to revoke wallet verification
export function useRevokeWalletVerification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      walletAddress: Address;
      reason?: string;
    }) => {
      return apiClient.post<{
        success: boolean;
        message: string;
      }>('/brands/wallet/verify/revoke', data);
    },
    onSuccess: (data, variables) => {
      // Invalidate verification-related queries
      queryClient.invalidateQueries({ 
        queryKey: ['wallet-verification-status', variables.walletAddress] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['wallet-overview'] 
      });
    },
  });
}

// Hook to check verification expiry and renewal
export function useVerificationExpiry(walletAddress?: Address) {
  const verificationStatus = useWalletVerificationStatus(walletAddress);
  
  return useQuery({
    queryKey: ['verification-expiry', walletAddress, verificationStatus.data?.expiresAt],
    queryFn: async () => {
      const expiresAt = verificationStatus.data?.expiresAt;
      if (!expiresAt) return null;
      
      const expiryDate = new Date(expiresAt);
      const now = new Date();
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();
      
      const daysUntilExpiry = Math.ceil(timeUntilExpiry / (1000 * 60 * 60 * 24));
      
      return {
        expiresAt: expiryDate,
        timeUntilExpiry,
        daysUntilExpiry,
        isExpired: timeUntilExpiry <= 0,
        isExpiringSoon: daysUntilExpiry <= 7 && daysUntilExpiry > 0,
        needsRenewal: daysUntilExpiry <= 30,
      };
    },
    enabled: !!verificationStatus.data?.expiresAt,
    refetchInterval: 3600000, // Check every hour
  });
}

// Hook for automated verification renewal
export function useAutoVerificationRenewal() {
  const { address } = useAccount();
  const verificationFlow = useWalletVerificationFlow();
  const expiry = useVerificationExpiry(address);
  
  return useMutation({
    mutationFn: async () => {
      if (!expiry.data?.needsRenewal) {
        throw new Error('Verification renewal not needed');
      }
      
      return await verificationFlow.startVerification();
    },
    onSuccess: () => {
      // Verification flow hook already invalidates necessary queries
    },
  });
}

// Hook to get verification requirements by plan
export function useVerificationPlanRequirements() {
  return useQuery({
    queryKey: ['verification-plan-requirements'],
    queryFn: async () => {
      return apiClient.get<{
        foundation: {
          required: boolean;
          features: string[];
          method: 'signature' | 'transaction';
          validityPeriod: number; // in days
        };
        growth: {
          required: boolean;
          features: string[];
          method: 'signature' | 'transaction';
          validityPeriod: number;
        };
        premium: {
          required: boolean;
          features: string[];
          method: 'signature' | 'transaction';
          validityPeriod: number;
        };
        enterprise: {
          required: boolean;
          features: string[];
          method: 'signature' | 'transaction';
          validityPeriod: number;
          requiresMultisig?: boolean;
          additionalSecurity?: string[];
        };
      }>('/brands/wallet/verify/plan-requirements');
    },
    staleTime: Infinity, // Plan requirements rarely change
  });
}

// Hook for bulk wallet verification (enterprise feature)
export function useBulkWalletVerification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (wallets: Array<{
      address: Address;
      signature: string;
      message: string;
      challengeId: string;
    }>) => {
      return apiClient.post<{
        successful: number;
        failed: number;
        results: Array<{
          address: Address;
          success: boolean;
          error?: string;
        }>;
      }>('/brands/wallet/verify/bulk', { wallets });
    },
    onSuccess: () => {
      // Invalidate all wallet verification queries
      queryClient.invalidateQueries({ 
        queryKey: ['wallet-verification-status'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['wallet-overview'] 
      });
    },
  });
}