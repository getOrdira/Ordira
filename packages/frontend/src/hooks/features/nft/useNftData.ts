'use client';

// src/hooks/features/nft/useNftData.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import nftDataApi from '@/lib/api/features/nft/nftData.api';
import type {
  NftCertificateRecord,
  NftContractInfo,
  NftContractRecord,
  NftVerificationResult,
  NftCertificateListFilters,
  NftCertificateListResponse
} from '@/lib/types/features/nft';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

const normalizeParams = <T extends object | undefined>(params?: T) => {
  if (!params) {
    return null;
  }
  const entries = Object.entries(params as Record<string, unknown>);
  return entries.length ? Object.fromEntries(entries) : null;
};

export const nftDataQueryKeys = {
  root: ['nfts', 'data'] as const,
  certificates: (filters?: NftCertificateListFilters) =>
    [...nftDataQueryKeys.root, 'certificates', normalizeParams(filters)] as const,
  contracts: () => [...nftDataQueryKeys.root, 'contracts'] as const,
  contract: (address: string) => [...nftDataQueryKeys.root, 'contract', address] as const,
  tokenUri: (address: string, tokenId: string) =>
    [...nftDataQueryKeys.root, 'token-uri', address, tokenId] as const,
  tokenOwner: (address: string, tokenId: string) =>
    [...nftDataQueryKeys.root, 'token-owner', address, tokenId] as const,
  verification: (address: string, tokenId: string) =>
    [...nftDataQueryKeys.root, 'verification', address, tokenId] as const
};

export const useNftCertificates = (
  filters?: NftCertificateListFilters,
  options?: QueryOptions<NftCertificateListResponse>
): UseQueryResult<NftCertificateListResponse, ApiError> => {
  return useQuery({
    queryKey: nftDataQueryKeys.certificates(filters),
    queryFn: () => nftDataApi.listCertificates(filters),
    ...options
  });
};

export const useNftContracts = (
  options?: QueryOptions<NftContractRecord[]>
): UseQueryResult<NftContractRecord[], ApiError> => {
  return useQuery({
    queryKey: nftDataQueryKeys.contracts(),
    queryFn: () => nftDataApi.listContracts(),
    ...options
  });
};

export const useNftContractMetadata = (
  contractAddress: string,
  options?: QueryOptions<NftContractInfo>
): UseQueryResult<NftContractInfo, ApiError> => {
  return useQuery({
    queryKey: nftDataQueryKeys.contract(contractAddress),
    queryFn: () => nftDataApi.getContractMetadata(contractAddress),
    enabled: Boolean(contractAddress) && (options?.enabled ?? true),
    ...options
  });
};

export const useNftTokenUri = (
  contractAddress: string,
  tokenId: string,
  options?: QueryOptions<string>
): UseQueryResult<string, ApiError> => {
  return useQuery({
    queryKey: nftDataQueryKeys.tokenUri(contractAddress, tokenId),
    queryFn: () => nftDataApi.getTokenUri(contractAddress, tokenId),
    enabled:
      Boolean(contractAddress) && Boolean(tokenId) && (options?.enabled ?? true),
    ...options
  });
};

export const useNftTokenOwner = (
  contractAddress: string,
  tokenId: string,
  options?: QueryOptions<string>
): UseQueryResult<string, ApiError> => {
  return useQuery({
    queryKey: nftDataQueryKeys.tokenOwner(contractAddress, tokenId),
    queryFn: () => nftDataApi.getTokenOwner(contractAddress, tokenId),
    enabled:
      Boolean(contractAddress) && Boolean(tokenId) && (options?.enabled ?? true),
    ...options
  });
};

export const useVerifyNft = (
  contractAddress: string,
  tokenId: string,
  options?: QueryOptions<NftVerificationResult>
): UseQueryResult<NftVerificationResult, ApiError> => {
  return useQuery({
    queryKey: nftDataQueryKeys.verification(contractAddress, tokenId),
    queryFn: () => nftDataApi.verifyNft(contractAddress, tokenId),
    enabled:
      Boolean(contractAddress) && Boolean(tokenId) && (options?.enabled ?? true),
    ...options
  });
};
