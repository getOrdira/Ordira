'use client';

// src/hooks/features/nft/useNftBurning.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import nftBurningApi from '@/lib/api/features/nft/nftBurning.api';
import type { NftBurnParams, NftBurnResult } from '@/lib/types/features/nft';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const nftBurningMutationKeys = {
  burn: ['nfts', 'burning', 'burn'] as const
};

export const useBurnNft = (
  options?: MutationConfig<NftBurnResult, NftBurnParams>
): UseMutationResult<NftBurnResult, ApiError, NftBurnParams, unknown> => {
  return useMutation({
    mutationKey: nftBurningMutationKeys.burn,
    mutationFn: nftBurningApi.burnNft,
    ...options
  });
};
