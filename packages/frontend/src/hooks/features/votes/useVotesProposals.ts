'use client';

// src/hooks/features/votes/useVotesProposals.ts

import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import votesProposalsApi, {
  type BusinessProposalsQuery,
  type BusinessProposalsResponse
} from '@/lib/api/features/votes/votesProposals.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

const normalizeObject = <T>(value?: T) => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return Object.keys(value).length ? (value as Record<string, unknown>) : null;
};

const votesProposalsQueryKeysRoot = ['votes', 'proposals'] as const;

export const votesProposalsQueryKeys = {
  root: votesProposalsQueryKeysRoot,
  businessProposals: (businessId: string, query?: BusinessProposalsQuery) =>
    [...votesProposalsQueryKeysRoot, businessId, normalizeObject(query)] as const
};

/**
 * Retrieve blockchain proposal summaries for a business.
 */
export const useBusinessProposals = (
  businessId: string,
  query?: BusinessProposalsQuery,
  options?: QueryOptions<BusinessProposalsResponse>
): UseQueryResult<BusinessProposalsResponse, ApiError> => {
  return useQuery({
    queryKey: votesProposalsQueryKeys.businessProposals(businessId, query),
    queryFn: () => votesProposalsApi.getBusinessProposals(businessId, query),
    enabled: Boolean(businessId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all voting proposals operations.
 */
export interface UseVotesProposalsOptions {
  queries?: {
    businessProposals?: QueryOptions<BusinessProposalsResponse>;
  };
}

export interface UseVotesProposalsResult {
  // Queries
  businessProposals: (
    businessId: string,
    query?: BusinessProposalsQuery
  ) => UseQueryResult<BusinessProposalsResponse, ApiError>;
}

export const useVotesProposals = (
  options: UseVotesProposalsOptions = {}
): UseVotesProposalsResult => {
  return {
    businessProposals: (businessId: string, query?: BusinessProposalsQuery) =>
      useBusinessProposals(businessId, query, options.queries?.businessProposals)
  };
};
