// src/hooks/use-api-keys.ts

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { ApiKey, CreateApiKeyRequest, UpdateApiKeyRequest, CreateApiKeyResponse, ApiKeyUsage } from '../lib/typessss/api-keys';
import * as apiKeysApi from '@/lib/apis/api-keys';
import { ApiError } from '@/lib/errors';

interface UseApiKeysOptions {
  businessId?: string;
  isActive?: boolean;
  revoked?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UseApiKeysReturn {
  // Data
  apiKeys: ApiKey[];
  apiKey: ApiKey | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  
  // Actions
  createApiKey: UseMutationResult<CreateApiKeyResponse, ApiError, CreateApiKeyRequest>;
  updateApiKey: UseMutationResult<ApiKey, ApiError, { id: string; data: UpdateApiKeyRequest }>;
  revokeApiKey: UseMutationResult<ApiKey, ApiError, { keyId: string; reason?: string }>;
  rotateApiKey: UseMutationResult<ApiKey, ApiError, { keyId: string; reason?: string }>;
  deleteApiKey: UseMutationResult<ApiKey, ApiError, { keyId: string; reason?: string }>;
  
  // Refetch functions
  refetch: () => void;
  refetchApiKey: (id: string) => void;
}

export function useApiKeys(options: UseApiKeysOptions = {}): UseApiKeysReturn {
  const queryClient = useQueryClient();
  
  const {
    businessId,
    isActive,
    revoked,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  // Fetch API keys list
  const {
    data: apiKeysData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ApiKey[], ApiError>({
    queryKey: ['api-keys', 'list', { businessId, isActive, revoked, search, page, limit, sortBy, sortOrder }],
    queryFn: () => apiKeysApi.getApiKeys(businessId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create API key mutation
  const createApiKey = useMutation<CreateApiKeyResponse, ApiError, CreateApiKeyRequest>({
    mutationFn: apiKeysApi.createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', 'list'] });
    },
  });

  // Update API key mutation
  const updateApiKey = useMutation<ApiKey, ApiError, { id: string; data: UpdateApiKeyRequest }>({
    mutationFn: ({ id, data }) => apiKeysApi.updateApiKey(id, data),
    onSuccess: (updatedApiKey) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', 'list'] });
      queryClient.setQueryData(['api-keys', 'detail', updatedApiKey._id], updatedApiKey);
    },
  });

  // Revoke API key mutation
  const revokeApiKey = useMutation<ApiKey, ApiError, { keyId: string; reason?: string }>({
    mutationFn: ({ keyId, reason }) => apiKeysApi.revokeApiKey(keyId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', 'list'] });
    },
  });

  // Rotate API key mutation (using updateApiKey with rotation reason)
  const rotateApiKey = useMutation<ApiKey, ApiError, { keyId: string; reason?: string }>({
    mutationFn: ({ keyId, reason }) => apiKeysApi.updateApiKey(keyId, { rotationReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', 'list'] });
    },
  });

  // Delete API key mutation (using revokeApiKey since that's what's available)
  const deleteApiKey = useMutation<ApiKey, ApiError, { keyId: string; reason?: string }>({
    mutationFn: ({ keyId, reason }) => apiKeysApi.revokeApiKey(keyId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', 'list'] });
    },
  });

  // Refetch specific API key
  const refetchApiKey = (id: string) => {
    queryClient.invalidateQueries({ queryKey: ['api-keys', 'detail', id] });
  };

  return {
    apiKeys: apiKeysData || [],
    apiKey: null, // Will be set by useApiKey hook
    isLoading,
    isError,
    error,
    pagination: {
      page: 1,
      limit: 20,
      total: apiKeysData?.length || 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
    createApiKey,
    updateApiKey,
    revokeApiKey,
    rotateApiKey,
    deleteApiKey,
    refetch,
    refetchApiKey,
  };
}

interface UseApiKeyOptions {
  id: string;
  enabled?: boolean;
}

interface UseApiKeyReturn {
  apiKey: ApiKey | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useApiKey({ id, enabled = true }: UseApiKeyOptions): UseApiKeyReturn {
  const {
    data: apiKey,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ApiKey, ApiError>({
    queryKey: ['api-keys', 'detail', id],
    queryFn: () => apiKeysApi.getApiKey(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    apiKey: apiKey || null,
    isLoading,
    isError,
    error,
    refetch,
  };
}

interface UseApiKeyUsageReturn {
  usage: ApiKeyUsage | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

export function useApiKeyUsage(apiKeyId: string): UseApiKeyUsageReturn {
  const {
    data: usageData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ApiKeyUsage, ApiError>({
    queryKey: ['api-keys', 'usage', apiKeyId],
    queryFn: async () => {
      // Since getApiKeyUsage doesn't exist, we'll create a mock implementation
      // In a real app, this would call the actual API
      throw new Error('API key usage endpoint not implemented');
    },
    enabled: !!apiKeyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    usage: usageData || null,
    isLoading,
    isError,
    error: error as ApiError | null,
    refetch,
  };
}
