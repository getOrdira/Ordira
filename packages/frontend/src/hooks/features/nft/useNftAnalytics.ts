'use client';

// src/hooks/features/nft/useNftAnalytics.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import nftAnalyticsApi from '@/lib/api/features/nft/nftAnalytics.api';
import type {
  NftAnalyticsOverview,
  NftAnalyticsQuery,
  NftCertificateAnalytics
} from '@/lib/types/features/nft';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

const normalizeQuery = (query?: NftAnalyticsQuery) => {
  if (!query) {
    return null;
  }
  return { ...query };
};

export const nftAnalyticsQueryKeys = {
  root: ['nfts', 'analytics'] as const,
  certificates: () => [...nftAnalyticsQueryKeys.root, 'certificates'] as const,
  overview: (query?: NftAnalyticsQuery) =>
    [...nftAnalyticsQueryKeys.root, 'overview', normalizeQuery(query)] as const
};

export const useNftCertificateAnalytics = (
  options?: QueryOptions<NftCertificateAnalytics>
): UseQueryResult<NftCertificateAnalytics, ApiError> => {
  return useQuery({
    queryKey: nftAnalyticsQueryKeys.certificates(),
    queryFn: () => nftAnalyticsApi.getCertificateAnalytics(),
    ...options
  });
};

export const useNftAnalytics = (
  query?: NftAnalyticsQuery,
  options?: QueryOptions<NftAnalyticsOverview>
): UseQueryResult<NftAnalyticsOverview, ApiError> => {
  return useQuery({
    queryKey: nftAnalyticsQueryKeys.overview(query),
    queryFn: () => nftAnalyticsApi.getAnalytics(query),
    ...options
  });
};
