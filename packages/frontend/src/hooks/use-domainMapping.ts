// src/hooks/use-domainMapping.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { domainApi } from '@/lib/api/domain';
import { DomainMapping, DomainMappingResponse, DomainHealthResponse, DomainVerificationResponse, CertificateRenewalResponse } from '@/lib/api/domain';
import { ApiError } from '@/lib/errors';

// Types aligned with domain.ts API structure
interface CreateDomainRequest {
  domain: string;
  verificationMethod: 'dns' | 'file' | 'email';
  certificateType?: 'letsencrypt' | 'custom';
  forceHttps?: boolean;
  autoRenewal?: boolean;
  customCertificate?: DomainMapping['customCertificate'];
  mappingMetadata?: DomainMapping['mappingMetadata'];
}

interface UpdateDomainRequest {
  forceHttps?: boolean;
  autoRenewal?: boolean;
  customCertificate?: DomainMapping['customCertificate'];
  updateMetadata?: DomainMapping['updateMetadata'];
}

interface SSLConfigRequest {
  autoRenewal?: boolean;
  forceHttps?: boolean;
  customCertificate?: {
    certificate: string;
    privateKey: string;
    chainCertificate?: string;
  };
}

export const useDomainMapping = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Query for list of domain mappings
  const { data: domainMappingsData, isLoading: isLoadingMappings, error: mappingsError } = useQuery({
    queryKey: ['domainMappings', user?._id],
    queryFn: () => domainApi.getDomainMappings(),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Query for single domain mapping
  const getSingleDomainMapping = (id: string) => useQuery<DomainMappingResponse, ApiError>({
    queryKey: ['domainMapping', id],
    queryFn: () => domainApi.getDomainMapping(id),
    enabled: !!id,
  });

  // Query for domain health check
  const getDomainHealthCheck = (domainId?: string) => useQuery<DomainHealthResponse, ApiError>({
    queryKey: ['domainHealth', domainId],
    queryFn: () => domainApi.getDomainHealth(domainId),
    enabled: !!domainId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Query for SSL status
  const getSSLStatus = () => useQuery({
    queryKey: ['sslStatus', user?._id],
    queryFn: () => domainApi.getSslStatus(),
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Query for DNS instructions
  const getDNSInstructions = (domain?: string) => useQuery({
    queryKey: ['dnsInstructions', domain],
    queryFn: () => domainApi.getDnsInstructions(domain),
    enabled: !!domain,
  });

  // Query for verification status
  const getVerificationStatus = (id: string) => useQuery({
    queryKey: ['verificationStatus', id],
    queryFn: () => domainApi.checkVerificationStatus(id),
    enabled: !!id,
  });

  // Query for domain analytics
  const getDomainAnalytics = (domainId: string, timeframe = '7d') => useQuery({
    queryKey: ['domainAnalytics', domainId, timeframe],
    queryFn: () => domainApi.getDomainAnalytics(domainId, timeframe),
    enabled: !!domainId,
  });

  // Query for domain history
  const getDomainHistory = (params?: { domainId?: string; limit?: number; offset?: number }) => useQuery({
    queryKey: ['domainHistory', params],
    queryFn: () => domainApi.getDomainHistory(params),
    enabled: !!user,
  });

  // Mutation for creating domain mapping
  const createMutation = useMutation<DomainMappingResponse, ApiError, CreateDomainRequest>({
    mutationFn: domainApi.createDomainMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domainMappings'] });
    },
  });

  // Mutation for updating domain mapping
  const updateMutation = useMutation<DomainMapping, ApiError, { id: string; data: UpdateDomainRequest }>({
    mutationFn: ({ id, data }) => domainApi.updateDomainMapping(id, data),
    onSuccess: (updatedDomain) => {
      queryClient.setQueryData(['domainMapping', updatedDomain._id], { mapping: updatedDomain });
      queryClient.invalidateQueries({ queryKey: ['domainMappings'] });
    },
  });

  // Mutation for deleting domain mapping
  const deleteMutation = useMutation<{ success: boolean; deleted: DomainMapping }, ApiError, { id: string; reason?: string }>({
    mutationFn: ({ id, reason }) => domainApi.deleteDomainMapping(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domainMappings'] });
    },
  });

  // Mutation for verifying domain ownership
  const verifyMutation = useMutation<DomainVerificationResponse, ApiError, { id: string; method?: 'dns' | 'file' | 'email' }>({
    mutationFn: ({ id, method = 'dns' }) => domainApi.verifyDomain(id, method),
    onSuccess: (response) => {
      queryClient.setQueryData(['domainMapping', response.verification.domainId], response);
      queryClient.invalidateQueries({ queryKey: ['domainMappings'] });
      queryClient.invalidateQueries({ queryKey: ['verificationStatus'] });
    },
  });

  // Mutation for generating verification token
  const generateTokenMutation = useMutation<{ token: string; verificationMethod: string; instructions: string[] }, ApiError, string>({
    mutationFn: domainApi.generateVerificationToken,
    onSuccess: (_, domainId) => {
      queryClient.invalidateQueries({ queryKey: ['domainMapping', domainId] });
      queryClient.invalidateQueries({ queryKey: ['verificationStatus', domainId] });
    },
  });

  // Mutation for renewing SSL certificate
  const renewCertificateMutation = useMutation<CertificateRenewalResponse, ApiError, string>({
    mutationFn: domainApi.renewCertificate,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['domainMapping', response.renewal.domainId] });
      queryClient.invalidateQueries({ queryKey: ['sslStatus'] });
    },
  });

  // Mutation for updating SSL config
  const updateSSLMutation = useMutation<DomainMapping, ApiError, SSLConfigRequest>({
    mutationFn: domainApi.updateSslConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sslStatus'] });
      queryClient.invalidateQueries({ queryKey: ['domainMappings'] });
    },
  });

  // Mutation for updating force HTTPS
  const updateForceHttpsMutation = useMutation<{ success: boolean; forceHttps: boolean; affectedDomains: string[] }, ApiError, boolean>({
    mutationFn: domainApi.updateForceHttps,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domainMappings'] });
      queryClient.invalidateQueries({ queryKey: ['sslStatus'] });
    },
  });

  // Mutation for validating DNS config
  const validateDNSMutation = useMutation<any, ApiError, string>({
    mutationFn: domainApi.validateDnsConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verificationStatus'] });
    },
  });

  // Mutation for testing domain configuration
  const testDomainMutation = useMutation<any, ApiError, string>({
    mutationFn: domainApi.testDomainConfiguration,
  });

  // Mutation for recording performance metrics
  const recordMetricsMutation = useMutation<any, ApiError, { id: string; metrics: any }>({
    mutationFn: ({ id, metrics }) => domainApi.recordPerformanceMetrics(id, metrics),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['domainMapping', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['domainAnalytics', variables.id] });
    },
  });

  // Mutation for incrementing request count
  const incrementRequestMutation = useMutation<{ requestCount: number; lastAccessedAt: string }, ApiError, string>({
    mutationFn: domainApi.incrementRequestCount,
    onSuccess: (_, domainId) => {
      queryClient.invalidateQueries({ queryKey: ['domainMapping', domainId] });
    },
  });

  // Mutation for rollback configuration
  const rollbackConfigMutation = useMutation<any, ApiError, { domainId: string; historyEntryId: string; reason?: string }>({
    mutationFn: domainApi.rollbackDomainConfig,
    onSuccess: (response) => {
      queryClient.setQueryData(['domainMapping', response.rolledBack._id], { mapping: response.rolledBack });
      queryClient.invalidateQueries({ queryKey: ['domainMappings'] });
      queryClient.invalidateQueries({ queryKey: ['domainHistory'] });
    },
  });

  return {
    // Data from queries
    domainMappings: domainMappingsData?.mappings,
    summary: domainMappingsData?.summary,
    planLimits: domainMappingsData?.planLimits,
    
    // Loading states
    isLoadingMappings,
    mappingsError,
    
    // Query functions
    getSingleDomainMapping,
    getDomainHealthCheck,
    getSSLStatus,
    getDNSInstructions,
    getVerificationStatus,
    getDomainAnalytics,
    getDomainHistory,
    
    // Mutation functions
    createDomainMapping: createMutation.mutate,
    updateDomainMapping: updateMutation.mutate,
    deleteDomainMapping: deleteMutation.mutate,
    verifyDomainOwnership: verifyMutation.mutate,
    generateVerificationToken: generateTokenMutation.mutate,
    renewCertificate: renewCertificateMutation.mutate,
    updateSSLConfig: updateSSLMutation.mutate,
    updateForceHttps: updateForceHttpsMutation.mutate,
    validateDNSConfig: validateDNSMutation.mutate,
    testDomainConfiguration: testDomainMutation.mutate,
    recordPerformanceMetrics: recordMetricsMutation.mutate,
    incrementRequestCount: incrementRequestMutation.mutate,
    rollbackDomainConfig: rollbackConfigMutation.mutate,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isVerifying: verifyMutation.isPending,
    isGeneratingToken: generateTokenMutation.isPending,
    isRenewing: renewCertificateMutation.isPending,
    isUpdatingSSL: updateSSLMutation.isPending,
    isUpdatingForceHttps: updateForceHttpsMutation.isPending,
    isValidatingDNS: validateDNSMutation.isPending,
    isTesting: testDomainMutation.isPending,
    isRecordingMetrics: recordMetricsMutation.isPending,
    isIncrementingRequests: incrementRequestMutation.isPending,
    isRollingBack: rollbackConfigMutation.isPending,
  };
};