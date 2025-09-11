// src/lib/types/api-keys.ts

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

export interface CreateApiKeyRequest {
  name: string;
  permissions: string[];
  expiresAt?: Date;
  rateLimits?: { requestsPerMinute: number; requestsPerDay: number };
  allowedOrigins?: string[];
  description?: string;
  scopes?: string[];
}

export interface UpdateApiKeyRequest {
  name?: string;
  permissions?: string[];
  expiresAt?: Date;
  rateLimits?: { requestsPerMinute: number; requestsPerDay: number };
  allowedOrigins?: string[];
  description?: string;
  scopes?: string[];
  rotationReason?: string;
}

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

export interface ApiKeyUsage {
  keyId: string;
  requests: number;
  lastUsed: Date;
  usageByEndpoint: Record<string, number>;
  usageByDay: Array<{
    date: string;
    requests: number;
  }>;
  rateLimitStatus: {
    requestsPerMinute: number;
    requestsPerDay: number;
    remainingRequests: number;
    resetTime: Date;
  };
}
