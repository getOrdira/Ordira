'use client';

// src/hooks/integrations/domains/useDomainIntegration.ts

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import domainIntegrationApi, {
  type CertificateIssuePayload,
  type CertificateOperationResponse,
  type CertificateSummaryResponse,
  type DnsEvaluationPayload,
  type DnsEvaluationResponse,
  type DomainInstructionResponse,
  type DomainParams
} from '@/lib/api/integrations/domains/domainIntegration.api';
import { ApiError } from '@/lib/errors/errors';

type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData, QueryKey>,
  'queryKey' | 'queryFn'
>;

type MutationConfig<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables, unknown>,
  'mutationFn'
>;

const normalizeObject = <T>(value?: T) => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return Object.keys(value).length ? (value as Record<string, unknown>) : null;
};

const domainIntegrationQueryKeysRoot = ['integrations', 'domains'] as const;

export const domainIntegrationQueryKeys = {
  root: domainIntegrationQueryKeysRoot,
  instructions: (params: DomainParams) =>
    [...domainIntegrationQueryKeysRoot, params.domainId, 'instructions', normalizeObject(params)] as const,
  certificateSummary: (params: DomainParams) =>
    [...domainIntegrationQueryKeysRoot, params.domainId, 'certificate', 'summary', normalizeObject(params)] as const
};

export const domainIntegrationMutationKeys = {
  evaluateDns: (params: DomainParams) =>
    [...domainIntegrationQueryKeysRoot, params.domainId, 'evaluate-dns'] as const,
  issueCertificate: (params: DomainParams) =>
    [...domainIntegrationQueryKeysRoot, params.domainId, 'certificate', 'issue'] as const,
  autoRenew: (params: DomainParams) =>
    [...domainIntegrationQueryKeysRoot, params.domainId, 'certificate', 'auto-renew'] as const
};

/**
 * Retrieve DNS instruction set for a domain.
 */
export const useDnsInstructionSet = (
  params: DomainParams,
  options?: QueryOptions<DomainInstructionResponse>
): UseQueryResult<DomainInstructionResponse, ApiError> => {
  return useQuery({
    queryKey: domainIntegrationQueryKeys.instructions(params),
    queryFn: () => domainIntegrationApi.getDnsInstructionSet(params),
    enabled: Boolean(params.domainId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Evaluate current DNS records for domain readiness.
 */
export const useEvaluateDnsRecords = (
  params: DomainParams,
  options?: MutationConfig<DnsEvaluationResponse, DnsEvaluationPayload>
): UseMutationResult<DnsEvaluationResponse, ApiError, DnsEvaluationPayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: domainIntegrationMutationKeys.evaluateDns(params),
    mutationFn: (payload) => domainIntegrationApi.evaluateDnsRecords(params, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: domainIntegrationQueryKeys.instructions(params)
      });
      void queryClient.invalidateQueries({ queryKey: domainIntegrationQueryKeys.root });
    },
    ...options
  });
};

/**
 * Issue managed certificate for a domain.
 */
export const useIssueManagedCertificate = (
  params: DomainParams,
  options?: MutationConfig<CertificateOperationResponse, CertificateIssuePayload>
): UseMutationResult<CertificateOperationResponse, ApiError, CertificateIssuePayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: domainIntegrationMutationKeys.issueCertificate(params),
    mutationFn: (payload) => domainIntegrationApi.issueManagedCertificate(params, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: domainIntegrationQueryKeys.certificateSummary(params)
      });
      void queryClient.invalidateQueries({ queryKey: domainIntegrationQueryKeys.root });
    },
    ...options
  });
};

/**
 * Schedule certificate auto-renewal for a domain.
 */
export const useScheduleCertificateAutoRenewal = (
  params: DomainParams,
  options?: MutationConfig<CertificateOperationResponse, CertificateIssuePayload>
): UseMutationResult<CertificateOperationResponse, ApiError, CertificateIssuePayload, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: domainIntegrationMutationKeys.autoRenew(params),
    mutationFn: (payload) => domainIntegrationApi.scheduleCertificateAutoRenewal(params, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: domainIntegrationQueryKeys.certificateSummary(params)
      });
      void queryClient.invalidateQueries({ queryKey: domainIntegrationQueryKeys.root });
    },
    ...options
  });
};

/**
 * Retrieve domain certificate summary.
 */
export const useCertificateSummary = (
  params: DomainParams,
  options?: QueryOptions<CertificateSummaryResponse>
): UseQueryResult<CertificateSummaryResponse, ApiError> => {
  return useQuery({
    queryKey: domainIntegrationQueryKeys.certificateSummary(params),
    queryFn: () => domainIntegrationApi.getCertificateSummary(params),
    enabled: Boolean(params.domainId) && (options?.enabled ?? true),
    ...options
  });
};

/**
 * Main hook that provides access to all domain integration operations.
 */
export interface UseDomainIntegrationOptions {
  queries?: {
    instructions?: QueryOptions<DomainInstructionResponse>;
    certificateSummary?: QueryOptions<CertificateSummaryResponse>;
  };
  mutations?: {
    evaluateDns?: MutationConfig<DnsEvaluationResponse, DnsEvaluationPayload>;
    issueCertificate?: MutationConfig<CertificateOperationResponse, CertificateIssuePayload>;
    autoRenew?: MutationConfig<CertificateOperationResponse, CertificateIssuePayload>;
  };
}

export interface UseDomainIntegrationResult {
  // Queries
  instructions: (params: DomainParams) => UseQueryResult<DomainInstructionResponse, ApiError>;
  certificateSummary: (params: DomainParams) => UseQueryResult<CertificateSummaryResponse, ApiError>;

  // Mutations
  evaluateDns: (
    params: DomainParams
  ) => UseMutationResult<DnsEvaluationResponse, ApiError, DnsEvaluationPayload, unknown>;
  issueCertificate: (
    params: DomainParams
  ) => UseMutationResult<CertificateOperationResponse, ApiError, CertificateIssuePayload, unknown>;
  autoRenew: (
    params: DomainParams
  ) => UseMutationResult<CertificateOperationResponse, ApiError, CertificateIssuePayload, unknown>;
}

export const useDomainIntegration = (
  options: UseDomainIntegrationOptions = {}
): UseDomainIntegrationResult => {
  return {
    instructions: (params: DomainParams) =>
      useDnsInstructionSet(params, options.queries?.instructions),
    certificateSummary: (params: DomainParams) =>
      useCertificateSummary(params, options.queries?.certificateSummary),
    evaluateDns: (params: DomainParams) =>
      useEvaluateDnsRecords(params, options.mutations?.evaluateDns),
    issueCertificate: (params: DomainParams) =>
      useIssueManagedCertificate(params, options.mutations?.issueCertificate),
    autoRenew: (params: DomainParams) =>
      useScheduleCertificateAutoRenewal(params, options.mutations?.autoRenew)
  };
};
