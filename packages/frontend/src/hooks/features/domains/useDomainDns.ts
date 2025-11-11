'use client';

// src/hooks/features/domains/useDomainDns.ts

import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import domainDnsApi, {
  type DnsEvaluationResult,
  type EvaluateDomainRecordsPayload,
  type VerifyDnsOptions
} from '@/lib/api/features/domains/domainDns.api';
import type {
  DnsInstructionSet,
  DnsVerificationResult
} from '@backend/services/domains/features/domainDns.service';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

type VerifyDnsVariables = {
  domainId: string;
  options?: VerifyDnsOptions;
};

export const domainDnsQueryKeys = {
  root: ['domains', 'dns'] as const,
  instructions: (domainId: string) => [...domainDnsQueryKeys.root, 'instructions', domainId] as const
};

export const domainDnsMutationKeys = {
  verify: [...domainDnsQueryKeys.root, 'verify'] as const,
  evaluate: [...domainDnsQueryKeys.root, 'evaluate'] as const
};

export const useDomainDnsInstructions = (
  domainId: string,
  options?: QueryOptions<DnsInstructionSet>
): UseQueryResult<DnsInstructionSet, ApiError> => {
  return useQuery({
    queryKey: domainDnsQueryKeys.instructions(domainId),
    queryFn: () => domainDnsApi.getInstructionSet(domainId),
    enabled: Boolean(domainId) && (options?.enabled ?? true),
    ...options
  });
};

export const useVerifyDomainDns = (
  options?: MutationConfig<DnsVerificationResult, VerifyDnsVariables>
): UseMutationResult<DnsVerificationResult, ApiError, VerifyDnsVariables, unknown> => {
  return useMutation({
    mutationKey: domainDnsMutationKeys.verify,
    mutationFn: ({ domainId, options: verifyOptions }) =>
      domainDnsApi.verifyDnsConfiguration(domainId, verifyOptions),
    ...options
  });
};

export const useEvaluateDomainRecords = (
  options?: MutationConfig<DnsEvaluationResult, EvaluateDomainRecordsPayload>
): UseMutationResult<DnsEvaluationResult, ApiError, EvaluateDomainRecordsPayload, unknown> => {
  return useMutation({
    mutationKey: domainDnsMutationKeys.evaluate,
    mutationFn: domainDnsApi.evaluateDomainRecords,
    ...options
  });
};
