'use client';

// src/hooks/features/nft/useNftDeployment.ts

import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import nftDeploymentApi from '@/lib/api/features/nft/nftDeployment.api';
import type { NftDeployContractParams, NftDeploymentResult } from '@/lib/types/features/nft';
import { ApiError } from '@/lib/errors/errors';

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

export const nftDeploymentMutationKeys = {
  deploy: ['nfts', 'deployment', 'deploy'] as const
};

export const useDeployNftContract = (
  options?: MutationConfig<NftDeploymentResult, NftDeployContractParams>
): UseMutationResult<NftDeploymentResult, ApiError, NftDeployContractParams, unknown> => {
  return useMutation({
    mutationKey: nftDeploymentMutationKeys.deploy,
    mutationFn: nftDeploymentApi.deployContract,
    ...options
  });
};
