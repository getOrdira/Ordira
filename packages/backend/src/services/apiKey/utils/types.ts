// src/services/apiKey/utils/types.ts
// Type definitions for API key services

export interface CreateApiKeyOptions {
  name?: string;
  permissions?: string[];
  expiresAt?: Date;
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  allowedOrigins?: string[];
  description?: string;
  planLevel?: string;
  createdBy?: string;
}

export interface RevokeOptions {
  revokedBy?: string;
  reason?: string;
}

export interface ApiKeyCreationResult {
  keyId: string;
  secret: string;
  key: string; // Full key for immediate use
  id: string;
  name: string;
  permissions: string[];
  createdAt: Date;
}

export interface RateLimitResult {
  limit: number;
  remaining: number;
  resetTime: Date;
}

export interface ApiKeyUsageStats {
  totalRequests: number;
  lastUsed: Date | null;
  topEndpoints: string[];
  rateLimitHits: number;
}

export interface DetailedUsageStats {
  totalRequests: number;
  requestsByDay: Array<{ date: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  errorRate: number;
  averageResponseTime: number;
  lastUsed: Date | null;
  geolocation: Record<string, number>;
}

export interface EnhancedUsageStats extends ApiKeyUsageStats {
  timeframe: string;
  metrics: {
    requestsPerDay: number;
    peakUsage: string | number;
    errorRate: string | number;
    popularEndpoints: string[];
    geolocation: string | Record<string, number>;
  };
  trends: {
    growing: boolean;
    stable: boolean;
    declining: boolean;
  };
}

export interface ApiKeyDetails {
  keyId: string;
  name?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
  createdAt: Date;
  expiresAt?: Date;
  revoked: boolean;
  revokedAt?: Date;
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  allowedOrigins?: string[];
  planLevel?: string;
  isExpired: boolean;
  isActiveAndValid: boolean;
  daysUntilExpiry: number | null;
}

export interface ApiKeyTestResult {
  overall: 'passed' | 'failed';
  tests: {
    existence: { passed: boolean; message: string };
    active: { passed: boolean; message: string };
    notRevoked: { passed: boolean; message: string };
    notExpired: { passed: boolean; message: string };
    hasPermissions: { passed: boolean; message: string };
  };
  recommendations: string[];
}

export interface BulkUpdateResult {
  successful: Array<{ keyId: string; action: string; result: any }>;
  failed: Array<{ keyId: string; error: string }>;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

export interface AuditLogFilters {
  keyId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogResult {
  entries: Array<{
    keyId: string;
    action: string;
    timestamp: Date;
    performedBy?: string;
    details?: any;
  }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ExportApiKeysOptions {
  keyIds?: string[];
  includeUsageStats?: boolean;
  includeAuditLog?: boolean;
  format?: 'json' | 'csv';
}

export interface ExportedApiKey {
  keyId: string;
  name: string;
  description?: string;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
  rateLimits: any;
  allowedOrigins?: string[];
  planLevel: string;
  revoked: boolean;
  usageStats?: ApiKeyUsageStats;
  auditLog?: AuditLogResult;
}

export interface ExportResult {
  exportedAt: string;
  businessId: string;
  totalKeys: number;
  keys: ExportedApiKey[];
}

export interface SecurityRecommendation {
  type: 'security' | 'performance';
  priority: 'low' | 'medium' | 'high';
  message: string;
}

export interface PlanLimits {
  maxKeys: number;
  defaultRateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}

