// src/lib/api/api-keys.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/types/common'; // Shared error type from common types

const BASE_PATH = '/api/brand/api-keys';

// Revoke updates and returns updated IApiKey
export interface ApiKey {
  _id: string;
  business: string; // Types.ObjectId as string
  keyId: string;
  revoked: boolean;
  createdAt: Date;
  updatedAt?: Date;
  name: string;
  permissions: string[]; // e.g., ['read', 'write', ...]
  expiresAt?: Date;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  allowedOrigins?: string[];
  description?: string;
  planLevel?: string;
  createdBy?: string; // Types.ObjectId or string
  revokedAt?: Date;
  revokedBy?: string;
  reason?: string;
  rotatedAt?: Date;
  rotatedBy?: string;
  rotationReason?: string;
  updatedBy?: string;
  lastUsed?: Date;
  usageCount: number;
  isActive?: boolean;
  scopes?: string[];
}

// Create response includes plaintext secret (assumed from controller, as hashedSecret is stored but plaintext returned once)
export interface CreateApiKeyResponse {
    keyId: string;
    secret: string;
    apiKey: ApiKey;
    usage: {
      currentKeys: number;
      maxKeys: number;
      remainingKeys: number;
    };
    planInfo: {
      currentPlan: string;
      permissions: string[];
      rateLimits: { requestsPerMinute: number; requestsPerDay: number };
    };
  }

/**
 * Fetches list of API keys for the business.
 * @param businessId - Optional business ID (for admin views if applicable)
 * @returns Promise<ApiKey[]>
 */
export const getApiKeys = async (businessId?: string): Promise<ApiKey[]> => {
  try {
    const response = await apiClient.get<ApiKey[]>('/api/brand/api-keys', {
      params: { businessId },
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch API keys', error);
  }
};

/**
 * Fetches a single API key by keyId.
 * @param keyId - The keyId to fetch
 * @returns Promise<ApiKey>
 */
export const getApiKey = async (keyId: string): Promise<ApiKey> => {
  try {
    const response = await apiClient.get<ApiKey>(`/api/brand/api-keys/${keyId}`);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to fetch API key', error);
  }
};

/**
 * Creates a new API key.
 * Response: CreateApiKeyResponse with plaintext secret (generated in controller/service)
 * @param data - API key creation data
 * @returns Promise<CreateApiKeyResponse>
 */
export const createApiKey = async (data: {
  name: string;
  permissions: string[];
  expiresAt?: Date;
  rateLimits?: { requestsPerMinute: number; requestsPerDay: number };
  allowedOrigins?: string[];
  description?: string;
  scopes?: string[];
}): Promise<CreateApiKeyResponse> => {
  try {
    const response = await apiClient.post<CreateApiKeyResponse>(`${BASE_PATH}`, data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to create API key', error);
  }
};

/**
 * Updates an existing API key (e.g., rotate, change permissions).
 * Response: Updated ApiKey
 * @param keyId - The keyId to update
 * @param data - Update data
 * @returns Promise<ApiKey>
 */
export const updateApiKey = async (keyId: string, data: {
  name?: string;
  permissions?: string[];
  expiresAt?: Date;
  rateLimits?: { requestsPerMinute: number; requestsPerDay: number };
  allowedOrigins?: string[];
  description?: string;
  scopes?: string[];
  rotationReason?: string;
}): Promise<ApiKey> => {
  try {
    const response = await apiClient.patch<ApiKey>(`${BASE_PATH}`, data);
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to update API key', error);
  }
};

/**
 * Revokes an API key (sets revoked=true).
 * Response: Updated ApiKey with revoked=true, revokedAt, etc.
 * @param keyId - The keyId to revoke
 * @param reason - Optional revocation reason
 * @returns Promise<ApiKey>
 */
export const revokeApiKey = async (keyId: string, reason?: string): Promise<ApiKey> => {
  try {
    const response = await apiClient.delete<ApiKey>(`/api/brand/api-keys/${keyId}`, {
      data: { reason },
    });
    return response.data;
  } catch (error) {
    throw new ApiError('Failed to revoke API key', error);
  }
};