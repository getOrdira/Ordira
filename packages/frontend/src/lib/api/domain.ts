// src/lib/api/domain.ts

import { api } from './client';
import { ApiError } from '@/lib/types/common';

// Enhanced response interfaces matching backend controller responses
export interface DomainMappingResponse {
  success: boolean;
  mapping: DomainMapping;
  limits: {
    maxDomains: number;
    autoSslRenewal: boolean;
    customCertificates: boolean;
    healthMonitoring: boolean;
    performanceAnalytics: boolean;
  };
  usage: {
    currentDomains: number;
    remainingSlots: number;
  };
  setup?: {
    dnsRecords: Array<{
      type: string;
      name: string;
      value: string;
      ttl: number;
      instructions: string;
    }>;
    verification: {
      method: string;
      token?: string;
      steps: string[];
    };
    troubleshooting: string[];
  };
  health?: {
    overall: 'healthy' | 'warning' | 'error';
    dns: any;
    ssl: any;
    connectivity: any;
    performance: any;
    recommendations: string[];
  };
}

export interface DomainHealthResponse {
  domain: string;
  health: {
    overall: 'healthy' | 'warning' | 'error';
    dns: {
      status: 'healthy' | 'warning' | 'error';
      details: any;
    };
    ssl: {
      status: 'healthy' | 'warning' | 'error';
      details: any;
    };
    connectivity: {
      status: 'healthy' | 'warning' | 'error';
      details: any;
    };
    performance: {
      responseTime: number;
      uptime: number;
      status: string;
    };
  };
  metrics: {
    responseTime: number;
    uptime: number;
    lastDowntime?: string;
  };
  issues: string[];
  recommendations: string[];
  lastChecked: string;
}

export interface DomainVerificationResponse {
  success: boolean;
  verification: {
    domainId: string;
    domain: string;
    verifiedAt: string;
    method: string;
    verifiedBy: string;
  };
  activation: {
    activated: boolean;
    sslIssued: boolean;
    dnsConfigured: boolean;
  };
  nextSteps: string[];
  message: string;
}

export interface CertificateRenewalResponse {
  success: boolean;
  renewal: {
    domainId: string;
    domain: string;
    renewedAt: string;
    newExpiry: string;
    certificateId: string;
  };
  certificate: {
    issuer: string;
    validFrom: string;
    validTo: string;
    autoRenewal: boolean;
  };
  message: string;
}

export interface DomainAnalyticsResponse {
  domain: string;
  timeframe: string;
  traffic: {
    totalRequests: number;
    uniqueVisitors: number;
    pageViews: number;
    bounceRate: number;
    dailyStats: Array<{
      date: string;
      requests: number;
      visitors: number;
      responseTime: number;
    }>;
  };
  performance: {
    averageResponseTime: number;
    uptime: number;
    errorRate: number;
    loadTime: number;
    performanceScore: number;
  };
  errors: {
    total: number;
    by4xx: number;
    by5xx: number;
    topErrors: Array<{
      code: number;
      count: number;
      percentage: number;
    }>;
  };
  insights: string[];
}

export interface DomainMapping {
  _id: string;
  business: string;
  hostname: string;
  domain: string;
  status: 'pending_verification' | 'active' | 'error' | 'deleting';
  certificateType: 'letsencrypt' | 'custom';
  forceHttps: boolean;
  autoRenewal: boolean;
  isActive: boolean;
  isVerified: boolean;
  verificationMethod: 'dns' | 'file' | 'email';
  verificationToken?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  sslEnabled: boolean;
  sslExpiresAt?: Date;
  sslStatus: 'unknown' | 'active' | 'expired' | 'expiring_soon' | 'error';
  certificateExpiry?: Date;
  certificateInfo?: {
    issuer: string;
    validFrom: Date;
    validTo: Date;
    fingerprint?: string;
    serialNumber?: string;
  };
  lastCertificateRenewal?: Date;
  renewedBy?: string;
  customCertificate?: {
    certificate: string;
    privateKey: string;
    chainCertificate?: string;
    uploadedAt: Date;
    uploadedBy: string;
  };
  cnameTarget: string;
  dnsRecords?: Array<{
    type: 'CNAME' | 'A' | 'TXT';
    name: string;
    value: string;
    ttl?: number;
    required?: boolean;
  }>;
  dnsStatus: 'unknown' | 'verified' | 'error' | 'pending';
  healthStatus: 'unknown' | 'healthy' | 'warning' | 'error';
  lastHealthCheck?: Date;
  averageResponseTime?: number;
  uptimePercentage?: number;
  lastDowntime?: Date;
  performanceMetrics?: {
    responseTime: number;
    uptime: number;
    errorRate: number;
    lastChecked: Date;
  };
  lastAccessedAt?: Date;
  requestCount: number;
  analyticsData?: {
    totalRequests: number;
    uniqueVisitors: number;
    errorCount: number;
    lastReset: Date;
  };
  planLevel: 'foundation' | 'growth' | 'premium' | 'enterprise';
  createdBy: string;
  updatedBy?: string;
  mappingMetadata?: {
    ipAddress?: string;
    userAgent?: string;
    user?: string;
    source?: string;
    timestamp?: Date;
    changedFields?: string[];
    updateReason?: string;
  };
  deletedBy?: string;
  deletionReason?: string;
  updateMetadata?: {
    changedFields?: string[];
    updateReason?: string;
    ipAddress?: string;
    timestamp?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export const domainApi = {
  
  // ===== DOMAIN MAPPING MANAGEMENT =====
  
  /**
   * Get list of domain mappings with enhanced metadata
   * GET /api/domain-mappings
   */
  getDomainMappings: async (params?: {
    business?: string;
    status?: string;
    includeHealth?: boolean;
  }): Promise<{
    mappings: DomainMapping[];
    summary: {
      total: number;
      active: number;
      pendingVerification: number;
      errors: number;
    };
    planLimits: {
      maxDomains: number;
      remainingSlots: number;
    };
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.business) queryParams.set('business', params.business);
      if (params?.status) queryParams.set('status', params.status);
      if (params?.includeHealth) queryParams.set('includeHealth', String(params.includeHealth));

      const response = await api.get<{
        mappings: DomainMapping[];
        summary: {
          total: number;
          active: number;
          pendingVerification: number;
          errors: number;
        };
        planLimits: {
          maxDomains: number;
          remainingSlots: number;
        };
      }>(`/api/domain-mappings?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get domain mappings error:', error);
      throw error;
    }
  },

  /**
   * Get single domain mapping with comprehensive details
   * GET /api/domain-mappings/:id
   */
  getDomainMapping: async (id: string): Promise<DomainMappingResponse> => {
    try {
      const response = await api.get<DomainMappingResponse>(`/api/domain-mappings/${id}`);
      return response;
    } catch (error) {
      console.error('Get domain mapping error:', error);
      throw error;
    }
  },

  /**
   * Create new domain mapping with plan validation
   * POST /api/domain-mappings
   */
  createDomainMapping: async (data: {
    domain: string;
    verificationMethod: 'dns' | 'file' | 'email';
    certificateType?: 'letsencrypt' | 'custom';
    forceHttps?: boolean;
    autoRenewal?: boolean;
    customCertificate?: DomainMapping['customCertificate'];
    mappingMetadata?: DomainMapping['mappingMetadata'];
  }): Promise<DomainMappingResponse> => {
    try {
      const response = await api.post<DomainMappingResponse>('/api/domain-mappings', data);
      return response;
    } catch (error) {
      console.error('Create domain mapping error:', error);
      throw error;
    }
  },

  /**
   * Update existing domain mapping
   * PATCH /api/domain-mappings/:id
   */
  updateDomainMapping: async (id: string, data: Partial<DomainMapping> & {
    updateMetadata?: DomainMapping['updateMetadata'];
  }): Promise<DomainMapping> => {
    try {
      const response = await api.patch<DomainMapping>(`/api/domain-mappings/${id}`, data);
      return response;
    } catch (error) {
      console.error('Update domain mapping error:', error);
      throw error;
    }
  },

  /**
   * Delete domain mapping with cleanup
   * DELETE /api/domain-mappings/:id
   */
  deleteDomainMapping: async (id: string, deletionReason?: string): Promise<{
    success: boolean;
    deleted: DomainMapping;
    cleanup: {
      sslRevoked: boolean;
      dnsCleared: boolean;
      cacheCleared: boolean;
    };
  }> => {
    try {
      const response = await api.delete<{
        success: boolean;
        deleted: DomainMapping;
        cleanup: {
          sslRevoked: boolean;
          dnsCleared: boolean;
          cacheCleared: boolean;
        };
      }>(`/api/domain-mappings/${id}`, {
        data: { deletionReason }
      });
      return response;
    } catch (error) {
      console.error('Delete domain mapping error:', error);
      throw error;
    }
  },

  // ===== DOMAIN VERIFICATION =====
  
  /**
   * Verify domain ownership and activate
   * POST /api/domain-mappings/:id/verify
   */
  verifyDomain: async (id: string, verificationMethod: 'dns' | 'file' | 'email' = 'dns'): Promise<DomainVerificationResponse> => {
    try {
      const response = await api.post<DomainVerificationResponse>(`/api/domain-mappings/${id}/verify`, {
        verificationMethod
      });
      return response;
    } catch (error) {
      console.error('Verify domain error:', error);
      throw error;
    }
  },

  /**
   * Generate new verification token
   * POST /api/domain-mappings/:id/generate-token
   */
  generateVerificationToken: async (id: string): Promise<{
    token: string;
    verificationMethod: string;
    instructions: string[];
  }> => {
    try {
      const response = await api.post<{
        token: string;
        verificationMethod: string;
        instructions: string[];
      }>(`/api/domain-mappings/${id}/generate-token`, {});
      return response;
    } catch (error) {
      console.error('Generate verification token error:', error);
      throw error;
    }
  },

  /**
   * Check verification status
   * GET /api/domain-mappings/:id/verification-status
   */
  checkVerificationStatus: async (id: string): Promise<{
    verified: boolean;
    status: string;
    checks: {
      dns: boolean;
      ssl: boolean;
      connectivity: boolean;
    };
    nextSteps: string[];
  }> => {
    try {
      const response = await api.get<{
        verified: boolean;
        status: string;
        checks: {
          dns: boolean;
          ssl: boolean;
          connectivity: boolean;
        };
        nextSteps: string[];
      }>(`/api/domain-mappings/${id}/verification-status`);
      return response;
    } catch (error) {
      console.error('Check verification status error:', error);
      throw error;
    }
  },

  // ===== SSL CERTIFICATE MANAGEMENT =====
  
  /**
   * Get SSL certificate status
   * GET /api/brand-settings/domain-mapping/ssl
   */
  getSslStatus: async (): Promise<{
    certificates: Array<{
      domain: string;
      issuer: string;
      validFrom: string;
      validTo: string;
      status: string;
      autoRenewal: boolean;
    }>;
    summary: {
      total: number;
      active: number;
      expiringSoon: number;
      expired: number;
    };
  }> => {
    try {
      const response = await api.get<{
        certificates: Array<{
          domain: string;
          issuer: string;
          validFrom: string;
          validTo: string;
          status: string;
          autoRenewal: boolean;
        }>;
        summary: {
          total: number;
          active: number;
          expiringSoon: number;
          expired: number;
        };
      }>('/api/brand-settings/domain-mapping/ssl');
      return response;
    } catch (error) {
      console.error('Get SSL status error:', error);
      throw error;
    }
  },

  /**
   * Update SSL configuration
   * PUT /api/brand-settings/domain-mapping/ssl
   */
  updateSslConfig: async (data: {
    autoRenewal?: boolean;
    forceHttps?: boolean;
    customCertificate?: {
      certificate: string;
      privateKey: string;
      chainCertificate?: string;
    };
  }): Promise<DomainMapping> => {
    try {
      const response = await api.put<DomainMapping>('/api/brand-settings/domain-mapping/ssl', data);
      return response;
    } catch (error) {
      console.error('Update SSL config error:', error);
      throw error;
    }
  },

  /**
   * Manually renew SSL certificate
   * POST /api/brand-settings/domain-mapping/ssl/renew
   */
  renewCertificate: async (domainId: string): Promise<CertificateRenewalResponse> => {
    try {
      const response = await api.post<CertificateRenewalResponse>('/api/brand-settings/domain-mapping/ssl/renew', {
        domainId
      });
      return response;
    } catch (error) {
      console.error('Renew certificate error:', error);
      throw error;
    }
  },

  /**
   * Toggle force HTTPS redirect
   * POST /api/brand-settings/domain-mapping/ssl/force-https
   */
  updateForceHttps: async (enabled: boolean): Promise<{
    success: boolean;
    forceHttps: boolean;
    affectedDomains: string[];
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        forceHttps: boolean;
        affectedDomains: string[];
      }>('/api/brand-settings/domain-mapping/ssl/force-https', { enabled });
      return response;
    } catch (error) {
      console.error('Update force HTTPS error:', error);
      throw error;
    }
  },

  // ===== DNS MANAGEMENT =====
  
  /**
   * Get DNS configuration instructions
   * GET /api/brand-settings/domain-mapping/dns
   */
  getDnsInstructions: async (domain?: string): Promise<{
    instructions: Array<{
      type: string;
      name: string;
      value: string;
      ttl: number;
      priority?: number;
      description: string;
    }>;
    verification: {
      howToVerify: string[];
      commonIssues: string[];
      troubleshooting: string[];
    };
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (domain) queryParams.set('domain', domain);

      const response = await api.get<{
        instructions: Array<{
          type: string;
          name: string;
          value: string;
          ttl: number;
          priority?: number;
          description: string;
        }>;
        verification: {
          howToVerify: string[];
          commonIssues: string[];
          troubleshooting: string[];
        };
      }>(`/api/brand-settings/domain-mapping/dns?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get DNS instructions error:', error);
      throw error;
    }
  },

  /**
   * Validate DNS configuration
   * POST /api/brand-settings/domain-mapping/dns/validate
   */
  validateDnsConfig: async (domain: string): Promise<{
    valid: boolean;
    records: Array<{
      type: string;
      name: string;
      value: string;
      status: 'valid' | 'invalid' | 'missing';
      currentValue?: string;
      error?: string;
    }>;
    propagationComplete: boolean;
    estimatedPropagationTime?: number;
  }> => {
    try {
      const response = await api.post<{
        valid: boolean;
        records: Array<{
          type: string;
          name: string;
          value: string;
          status: 'valid' | 'invalid' | 'missing';
          currentValue?: string;
          error?: string;
        }>;
        propagationComplete: boolean;
        estimatedPropagationTime?: number;
      }>('/api/brand-settings/domain-mapping/dns/validate', { domain });
      return response;
    } catch (error) {
      console.error('Validate DNS config error:', error);
      throw error;
    }
  },

  // ===== HEALTH MONITORING =====
  
  /**
   * Get real-time domain health
   * GET /api/brand-settings/domain-mapping/health
   */
  getDomainHealth: async (domainId?: string): Promise<DomainHealthResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (domainId) queryParams.set('domainId', domainId);

      const response = await api.get<DomainHealthResponse>(
        `/api/brand-settings/domain-mapping/health?${queryParams.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Get domain health error:', error);
      throw error;
    }
  },

  /**
   * Test domain configuration
   * POST /api/brand-settings/domain-mapping/test
   */
  testDomainConfiguration: async (domain: string): Promise<{
    success: boolean;
    tests: {
      dnsResolution: {
        passed: boolean;
        resolvedIp?: string;
        error?: string;
      };
      connectivity: {
        passed: boolean;
        responseTime?: number;
        error?: string;
      };
      ssl: {
        passed: boolean;
        certificate?: any;
        error?: string;
      };
    };
    recommendations: string[];
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        tests: {
          dnsResolution: {
            passed: boolean;
            resolvedIp?: string;
            error?: string;
          };
          connectivity: {
            passed: boolean;
            responseTime?: number;
            error?: string;
          };
          ssl: {
            passed: boolean;
            certificate?: any;
            error?: string;
          };
        };
        recommendations: string[];
      }>('/api/brand-settings/domain-mapping/test', { domain });
      return response;
    } catch (error) {
      console.error('Test domain configuration error:', error);
      throw error;
    }
  },

  // ===== ANALYTICS AND PERFORMANCE =====
  
  /**
   * Get domain analytics
   * GET /api/domain-mappings/:id/analytics
   */
  getDomainAnalytics: async (domainId: string, timeframe = '7d'): Promise<DomainAnalyticsResponse> => {
    try {
      const response = await api.get<DomainAnalyticsResponse>(
        `/api/domain-mappings/${domainId}/analytics?timeframe=${timeframe}`
      );
      return response;
    } catch (error) {
      console.error('Get domain analytics error:', error);
      throw error;
    }
  },

  /**
   * Record performance metrics
   * POST /api/domain-mappings/:id/record-metrics
   */
  recordPerformanceMetrics: async (id: string, metrics: {
    responseTime: number;
    uptime: number;
    errorRate: number;
    loadTime?: number;
  }): Promise<{
    success: boolean;
    metrics: DomainMapping['performanceMetrics'];
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        metrics: DomainMapping['performanceMetrics'];
      }>(`/api/domain-mappings/${id}/record-metrics`, { metrics });
      return response;
    } catch (error) {
      console.error('Record performance metrics error:', error);
      throw error;
    }
  },

  /**
   * Increment request count for tracking
   * POST /api/domain-mappings/:id/increment-request
   */
  incrementRequestCount: async (id: string): Promise<{
    requestCount: number;
    lastAccessedAt: string;
  }> => {
    try {
      const response = await api.post<{
        requestCount: number;
        lastAccessedAt: string;
      }>(`/api/domain-mappings/${id}/increment-request`, {});
      return response;
    } catch (error) {
      console.error('Increment request count error:', error);
      throw error;
    }
  },

  // ===== CONFIGURATION HISTORY =====
  
  /**
   * Get domain configuration history
   * GET /api/brand-settings/domain-mapping/history
   */
  getDomainHistory: async (params?: {
    domainId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    history: Array<{
      id: string;
      domain: string;
      action: string;
      changes: Record<string, any>;
      performedBy: string;
      performedAt: string;
      reason?: string;
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.domainId) queryParams.set('domainId', params.domainId);
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.offset) queryParams.set('offset', String(params.offset));

      const response = await api.get<{
        history: Array<{
          id: string;
          domain: string;
          action: string;
          changes: Record<string, any>;
          performedBy: string;
          performedAt: string;
          reason?: string;
        }>;
        pagination: {
          total: number;
          limit: number;
          offset: number;
        };
      }>(`/api/brand-settings/domain-mapping/history?${queryParams.toString()}`);
      return response;
    } catch (error) {
      console.error('Get domain history error:', error);
      throw error;
    }
  },

  /**
   * Rollback to previous domain configuration
   * POST /api/brand-settings/domain-mapping/rollback
   */
  rollbackDomainConfig: async (data: {
    domainId: string;
    historyEntryId: string;
    reason?: string;
  }): Promise<{
    success: boolean;
    rolledBack: DomainMapping;
    previousConfig: any;
    rollbackDetails: {
      performedAt: string;
      performedBy: string;
      reason?: string;
    };
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        rolledBack: DomainMapping;
        previousConfig: any;
        rollbackDetails: {
          performedAt: string;
          performedBy: string;
          reason?: string;
        };
      }>('/api/brand-settings/domain-mapping/rollback', data);
      return response;
    } catch (error) {
      console.error('Rollback domain config error:', error);
      throw error;
    }
  },
};

// ===== LEGACY FUNCTIONS (Deprecated) =====

/**
 * @deprecated Use domainApi.getDomainMappings instead
 */
export const getDomainMappings = async (businessId?: string): Promise<DomainMapping[]> => {
  console.warn('getDomainMappings is deprecated, use domainApi.getDomainMappings instead');
  const response = await domainApi.getDomainMappings({ business: businessId });
  return response.mappings;
};

/**
 * @deprecated Use domainApi.getDomainMapping instead
 */
export const getDomainMapping = async (id: string): Promise<DomainMapping> => {
  console.warn('getDomainMapping is deprecated, use domainApi.getDomainMapping instead');
  const response = await domainApi.getDomainMapping(id);
  return response.mapping;
};

/**
 * @deprecated Use domainApi.createDomainMapping instead
 */
export const createDomainMapping = async (data: any): Promise<DomainMapping> => {
  console.warn('createDomainMapping is deprecated, use domainApi.createDomainMapping instead');
  const response = await domainApi.createDomainMapping(data);
  return response.mapping;
};

/**
 * @deprecated Use domainApi.updateDomainMapping instead
 */
export const updateDomainMapping = async (id: string, data: any): Promise<DomainMapping> => {
  console.warn('updateDomainMapping is deprecated, use domainApi.updateDomainMapping instead');
  return domainApi.updateDomainMapping(id, data);
};

/**
 * @deprecated Use domainApi.deleteDomainMapping instead
 */
export const deleteDomainMapping = async (id: string, reason?: string): Promise<DomainMapping> => {
  console.warn('deleteDomainMapping is deprecated, use domainApi.deleteDomainMapping instead');
  const response = await domainApi.deleteDomainMapping(id, reason);
  return response.deleted;
};

/**
 * @deprecated Use domainApi.generateVerificationToken instead
 */
export const generateVerificationToken = async (id: string): Promise<DomainMapping> => {
  console.warn('generateVerificationToken is deprecated, use domainApi.generateVerificationToken instead');
  await domainApi.generateVerificationToken(id);
  return domainApi.updateDomainMapping(id, {});
};

/**
 * @deprecated Use domainApi.verifyDomain instead
 */
export const markAsVerified = async (id: string): Promise<DomainMapping> => {
  console.warn('markAsVerified is deprecated, use domainApi.verifyDomain instead');
  await domainApi.verifyDomain(id);
  return domainApi.updateDomainMapping(id, {});
};

/**
 * @deprecated Use domainApi.incrementRequestCount instead
 */
export const incrementRequestCount = async (id: string): Promise<DomainMapping> => {
  console.warn('incrementRequestCount is deprecated, use domainApi.incrementRequestCount instead');
  await domainApi.incrementRequestCount(id);
  return domainApi.updateDomainMapping(id, {});
};

/**
 * @deprecated Use domainApi.updateSslConfig instead
 */
export const updateSSLInfo = async (id: string, expiresAt: Date): Promise<DomainMapping> => {
  console.warn('updateSSLInfo is deprecated, use domainApi.updateSslConfig instead');
  return domainApi.updateSslConfig({ autoRenewal: true });
};

/**
 * @deprecated Use domainApi.validateDnsConfig instead
 */
export const setDNSRecords = async (id: string, records: any): Promise<DomainMapping> => {
  console.warn('setDNSRecords is deprecated, use domainApi.validateDnsConfig instead');
  await domainApi.validateDnsConfig(id);
  return domainApi.updateDomainMapping(id, {});
};

/**
 * @deprecated Use domainApi.getDomainHealth instead
 */
export const updateHealthStatus = async (id: string, status: any): Promise<DomainMapping> => {
  console.warn('updateHealthStatus is deprecated, use domainApi.getDomainHealth instead');
  await domainApi.getDomainHealth(id);
  return domainApi.updateDomainMapping(id, {});
};

/**
 * @deprecated Use domainApi.recordPerformanceMetrics instead
 */
export const recordPerformanceMetrics = async (id: string, metrics: any): Promise<DomainMapping> => {
  console.warn('recordPerformanceMetrics is deprecated, use domainApi.recordPerformanceMetrics instead');
  await domainApi.recordPerformanceMetrics(id, metrics);
  return domainApi.updateDomainMapping(id, {});
};

/**
 * @deprecated Use domainApi.getDomainMapping instead
 */
export const getSetupInstructions = async (id: string): Promise<any> => {
  console.warn('getSetupInstructions is deprecated, use domainApi.getDomainMapping instead');
  const response = await domainApi.getDomainMapping(id);
  return response.setup;
};