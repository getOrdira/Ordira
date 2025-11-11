'use client';

// src/hooks/features/nft/useNftTransfer.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import nftTransferApi from '@/lib/api/features/nft/nftTransfer.api';
import type { NftTransferParams, NftTransferResult } from '@/lib/types/features/nft';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const nftTransferMutationKeys = {
  transfer: ['nfts', 'transfer', 'transfer'] as const
};

export const useNftTransfer = (
  options?: MutationConfig<NftTransferResult, NftTransferParams>
): UseMutationResult<NftTransferResult, ApiError, NftTransferParams, unknown> => {
  return useMutation({
    mutationKey: nftTransferMutationKeys.transfer,
    mutationFn: nftTransferApi.transferNft,
    ...options
  });
};
