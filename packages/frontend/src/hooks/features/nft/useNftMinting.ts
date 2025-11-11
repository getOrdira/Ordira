'use client';

// src/hooks/features/nft/useNftMinting.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import nftMintingApi from '@/lib/api/features/nft/nftMinting.api';
import type { NftMintParams, NftMintResult } from '@/lib/types/features/nft';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const nftMintingMutationKeys = {
  mint: ['nfts', 'minting', 'mint'] as const
};

export const useMintNft = (
  options?: MutationConfig<NftMintResult, NftMintParams>
): UseMutationResult<NftMintResult, ApiError, NftMintParams, unknown> => {
  return useMutation({
    mutationKey: nftMintingMutationKeys.mint,
    mutationFn: nftMintingApi.mintNft,
    ...options
  });
};
