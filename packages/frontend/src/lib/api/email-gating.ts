// src/lib/api/email-gating.ts

import { api } from './client';

// Enhanced response interfaces matching backend controller responses
export interface EmailGatingSettingsResponse {
  success: boolean;
  message: string;
  data: {
    settings: EmailGatingConfig;
    analytics: {
      totalCustomers: number;
      activeCustomers: number;
      registeredCustomers: number;
      sources: Array<{ source: string; count: number }>;
    };
    recommendations: string[];
    retrievedAt: string;
  };
}

export interface EmailGatingUpdateResponse {
  success: boolean;
  message: string;
  data: {
    settings: EmailGatingConfig;
    changes: {
      updated: string[];
      impact: string[];
    };
    warnings: string[];
    updatedAt: string;
  };
}

export interface CustomerListResponse {
  success: boolean;
  message: string;
  data: {
    customers: AllowedCustomer[];
    summary: {
      total: number;
      active: number;
      vip: number;
      totalVotes: number;
    };
    filters: {
      availableSources: string[];
      availableTags: string[];
    };
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface EmailCheckResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    allowed: boolean;
    reason?: string;
    customer?: AllowedCustomer;
    settings: {
      enabled: boolean;
      mode: string;
      accessDeniedMessage?: string;
    };
    checkedAt: string;
  };
}

export interface CustomerImportResponse {
  success: boolean;
  message: string;
  data: {
    summary: {
      totalRows: number;
      imported: number;
      updated: number;
      failed: number;
      batchId: string;
    };
    analysis: {
      duplicates: number;
      invalidEmails: number;
      successRate: number;
    };
    errors: string[];
    recommendations: string[];
    csvFormat: {
      requiredColumns: string[];
      optionalColumns: string[];
      example: string;
    };
    importedAt: string;
  };
}

export interface SyncResponse {
  success: boolean;
  message: string;
  data: {
    summary: {
      synced: number;
      errors: number;
    };
    errors: string[];
    recommendations: string[];
    syncedAt: string;
  };
}

export interface CustomerAnalyticsResponse {
  success: boolean;
  message: string;
  data: {
    analytics: {
      overview: {
        total: number;
        active: number;
        registered: number;
        vip: number;
        totalVotes: number;
      };
      sources: Array<{
        source: string;
        count: number;
        percentage: number;
      }>;
      engagement: {
        highEngagement: number;
        mediumEngagement: number;
        lowEngagement: number;
        noEngagement: number;
      };
      timeline: Array<{
        date: string;
        added: number;
        votes: number;
        activeUsers: number;
      }>;
    };
    insights: any;
    recommendations: string[];
    benchmarks: any;
    generatedAt: string;
  };
}

export interface AllowedCustomer {
  _id: string;
  business: string;
  email: string;
  findByEmail?: string;
  firstName?: string;
  lastName?: string;
  customerSource: 'manual' | 'shopify' | 'woocommerce' | 'csv_import' | 'api_import';
  externalCustomerId?: string;
  importBatch?: string;
  importedAt?: Date;
  importedBy?: string;
  isActive: boolean;
  hasAccess: boolean;
  accessRevokedAt?: Date;
  accessRevokedBy?: string;
  accessRevokedReason?: string;
  lastVotingAccess?: Date;
  totalVotingAccesses: number;
  totalVotes: number;
  registeredAt?: Date;
  tags: string[];
  notes?: string;
  vipStatus: boolean;
  syncStatus: 'synced' | 'pending' | 'failed' | 'manual';
  lastSyncAt?: Date;
  syncError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailGatingConfig {
  enabled: boolean;
  mode: 'whitelist' | 'blacklist' | 'disabled';
  allowUnregistered: boolean;
  requireApproval: boolean;
  autoSyncEnabled: boolean;
  syncSources: ('shopify' | 'woocommerce' | 'csv' | 'api')[];
  welcomeEmailEnabled: boolean;
  accessDeniedMessage: string;
  gatingRules?: {
    domainWhitelist?: string[];
    domainBlacklist?: string[];
    emailPatterns?: string[];
    maxVotesPerEmail?: number;
    votingWindow?: {
      enabled: boolean;
      startDate?: Date;
      endDate?: Date;
      timezone?: string;
    };
    geographicRestrictions?: {
      enabled: boolean;
      allowedCountries?: string[];
      blockedCountries?: string[];
    };
    ipWhitelist?: string[];
    ipBlacklist?: string[];
  };
  gatingAnalytics?: {
    totalEmailsChecked: number;
    totalEmailsAllowed: number;
    totalEmailsDenied: number;
    lastResetDate?: Date;
    dailyStats?: Array<{
      date: string;
      checked: number;
      allowed: number;
      denied: number;
      topDenialReasons: string[];
    }>;
  };
  integrationSettings?: {
    syncWithCRM?: boolean;
    crmWebhookUrl?: string;
    notifyOnDenial?: boolean;
    notifyOnApproval?: boolean;
    customWebhookUrl?: string;
    slackNotifications?: {
      enabled: boolean;
      webhookUrl?: string;
      channel?: string;
      notifyOnDenial?: boolean;
      notifyOnApproval?: boolean;
    };
  };
}

export const emailGatingApi = {
  
  // ===== EMAIL GATING SETTINGS =====
  
  /**
   * Get email gating settings with analytics context
   * GET /api/email-gating/settings
   */
  getSettings: async (): Promise<EmailGatingSettingsResponse> => {
    try {
      const response = await api.get<EmailGatingSettingsResponse>('/api/email-gating/settings');
      return response;
    } catch (error) {
      console.error('Get email gating settings error:', error);
      throw error;
    }
  },

  /**
   * Update email gating settings
   * PUT /api/email-gating/settings
   */
  updateSettings: async (data: Partial<EmailGatingConfig>): Promise<EmailGatingUpdateResponse> => {
    try {
      const response = await api.put<EmailGatingUpdateResponse>('/api/email-gating/settings', data);
      return response;
    } catch (error) {
      console.error('Update email gating settings error:', error);
      throw error;
    }
  },

  // ===== CUSTOMER MANAGEMENT =====
  
  /**
   * Get list of allowed customers with filtering
   * GET /api/email-gating/customers
   */
  getCustomers: async (params?: {
    source?: string;
    hasAccess?: boolean;
    isActive?: boolean;
    vipStatus?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<CustomerListResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.source) queryParams.set('source', params.source);
      if (params?.hasAccess !== undefined) queryParams.set('hasAccess', String(params.hasAccess));
      if (params?.isActive !== undefined) queryParams.set('isActive', String(params.isActive));
      if (params?.vipStatus !== undefined) queryParams.set('vipStatus', String(params.vipStatus));
      if (params?.search) queryParams.set('search', params.search);
      if (params?.page) queryParams.set('page', String(params.page));
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder);

      const response = await api.get<CustomerListResponse>(
        `/api/email-gating/customers?${queryParams.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Get customers error:', error);
      throw error;
    }
  },

  /**
   * Get single customer by email
   * GET /api/email-gating/customers/email/:email
   */
  getCustomerByEmail: async (email: string): Promise<{
    success: boolean;
    customer: AllowedCustomer | null;
    found: boolean;
  }> => {
    try {
      const response = await api.get<{
        success: boolean;
        customer: AllowedCustomer | null;
        found: boolean;
      }>(`/api/email-gating/customers/email/${encodeURIComponent(email)}`);
      return response;
    } catch (error) {
      console.error('Get customer by email error:', error);
      throw error;
    }
  },

  /**
   * Add single customer manually
   * POST /api/email-gating/customers
   */
  addCustomer: async (data: {
    email: string;
    firstName?: string;
    lastName?: string;
    tags?: string[];
    vipStatus?: boolean;
    externalCustomerId?: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    customer: AllowedCustomer;
    message: string;
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        customer: AllowedCustomer;
        message: string;
      }>('/api/email-gating/customers', data);
      return response;
    } catch (error) {
      console.error('Add customer error:', error);
      throw error;
    }
  },

  /**
   * Update customer information
   * PUT /api/email-gating/customers/:id
   */
  updateCustomer: async (id: string, data: Partial<AllowedCustomer>): Promise<{
    success: boolean;
    customer: AllowedCustomer;
    changes: string[];
  }> => {
    try {
      const response = await api.put<{
        success: boolean;
        customer: AllowedCustomer;
        changes: string[];
      }>(`/api/email-gating/customers/${id}`, data);
      return response;
    } catch (error) {
      console.error('Update customer error:', error);
      throw error;
    }
  },

  /**
   * Delete customer from allowed list
   * DELETE /api/email-gating/customers/:id
   */
  deleteCustomer: async (id: string): Promise<{
    success: boolean;
    deleted: boolean;
    customerId: string;
    deletedAt: string;
    impact: {
      access: string;
      voting: string;
      data: string;
    };
    warning: string;
  }> => {
    try {
      const response = await api.delete<{
        success: boolean;
        deleted: boolean;
        customerId: string;
        deletedAt: string;
        impact: {
          access: string;
          voting: string;
          data: string;
        };
        warning: string;
      }>(`/api/email-gating/customers/${id}`);
      return response;
    } catch (error) {
      console.error('Delete customer error:', error);
      throw error;
    }
  },

  // ===== ACCESS CONTROL =====
  
  /**
   * Check if email is allowed access
   * GET /api/email-gating/check/:email
   */
  checkEmailAccess: async (email: string): Promise<EmailCheckResponse> => {
    try {
      const response = await api.get<EmailCheckResponse>(
        `/api/email-gating/check/${encodeURIComponent(email)}`
      );
      return response;
    } catch (error) {
      console.error('Check email access error:', error);
      throw error;
    }
  },

  /**
   * Grant access to customer
   * POST /api/email-gating/customers/:id/grant
   */
  grantAccess: async (customerId: string): Promise<{
    success: boolean;
    customer: AllowedCustomer;
    granted: {
      grantedBy: string;
      grantedAt: string;
    };
    impact: string;
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        customer: AllowedCustomer;
        granted: {
          grantedBy: string;
          grantedAt: string;
        };
        impact: string;
      }>(`/api/email-gating/customers/${customerId}/grant`, {});
      return response;
    } catch (error) {
      console.error('Grant access error:', error);
      throw error;
    }
  },

  /**
   * Revoke access from customer
   * POST /api/email-gating/customers/:id/revoke
   */
  revokeAccess: async (customerId: string, reason?: string): Promise<{
    success: boolean;
    customer: AllowedCustomer;
    revocation: {
      reason: string;
      revokedBy: string;
      revokedAt: string;
    };
    impact: {
      votingAccess: string;
      existingVotes: string;
      notification: string;
    };
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        customer: AllowedCustomer;
        revocation: {
          reason: string;
          revokedBy: string;
          revokedAt: string;
        };
        impact: {
          votingAccess: string;
          existingVotes: string;
          notification: string;
        };
      }>(`/api/email-gating/customers/${customerId}/revoke`, { reason });
      return response;
    } catch (error) {
      console.error('Revoke access error:', error);
      throw error;
    }
  },

  /**
   * Restore access for customer
   * POST /api/email-gating/customers/:id/restore
   */
  restoreAccess: async (customerId: string): Promise<{
    success: boolean;
    customer: AllowedCustomer;
    restoration: {
      restoredBy: string;
      restoredAt: string;
    };
    impact: string;
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        customer: AllowedCustomer;
        restoration: {
          restoredBy: string;
          restoredAt: string;
        };
        impact: string;
      }>(`/api/email-gating/customers/${customerId}/restore`, {});
      return response;
    } catch (error) {
      console.error('Restore access error:', error);
      throw error;
    }
  },

  // ===== BULK OPERATIONS =====
  
  /**
   * Bulk import customers from CSV
   * POST /api/email-gating/customers/import-csv
   */
  importFromCsv: async (csvData: string): Promise<CustomerImportResponse> => {
    try {
      const response = await api.post<CustomerImportResponse>('/api/email-gating/customers/import-csv', {
        csvData
      });
      return response;
    } catch (error) {
      console.error('Import from CSV error:', error);
      throw error;
    }
  },

  /**
   * Bulk add customers
   * POST /api/email-gating/customers/bulk-add
   */
  bulkAddCustomers: async (customers: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    tags?: string[];
    vipStatus?: boolean;
    externalCustomerId?: string;
  }>): Promise<{
    success: boolean;
    message: string;
    data: {
      summary: {
        total: number;
        added: number;
        updated: number;
        failed: number;
      };
      results: Array<{
        email: string;
        status: 'added' | 'updated' | 'failed';
        customer?: AllowedCustomer;
        error?: string;
      }>;
      errors: string[];
    };
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        data: {
          summary: {
            total: number;
            added: number;
            updated: number;
            failed: number;
          };
          results: Array<{
            email: string;
            status: 'added' | 'updated' | 'failed';
            customer?: AllowedCustomer;
            error?: string;
          }>;
          errors: string[];
        };
      }>('/api/email-gating/customers/bulk-add', { customers });
      return response;
    } catch (error) {
      console.error('Bulk add customers error:', error);
      throw error;
    }
  },

  /**
   * Bulk update customer access
   * POST /api/email-gating/customers/bulk-access
   */
  bulkUpdateAccess: async (data: {
    customerIds: string[];
    action: 'grant' | 'revoke';
    reason?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      summary: {
        total: number;
        updated: number;
        failed: number;
      };
      results: Array<{
        customerId: string;
        status: 'updated' | 'failed';
        error?: string;
      }>;
      impact: string;
    };
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        data: {
          summary: {
            total: number;
            updated: number;
            failed: number;
          };
          results: Array<{
            customerId: string;
            status: 'updated' | 'failed';
            error?: string;
          }>;
          impact: string;
        };
      }>('/api/email-gating/customers/bulk-access', data);
      return response;
    } catch (error) {
      console.error('Bulk update access error:', error);
      throw error;
    }
  },

  // ===== INTEGRATION SYNCING =====
  
  /**
   * Sync customers from Shopify
   * POST /api/email-gating/customers/sync-shopify
   */
  syncFromShopify: async (): Promise<SyncResponse> => {
    try {
      const response = await api.post<SyncResponse>('/api/email-gating/customers/sync-shopify', {});
      return response;
    } catch (error) {
      console.error('Sync from Shopify error:', error);
      throw error;
    }
  },

  /**
   * Sync customers from WooCommerce
   * POST /api/email-gating/customers/sync-woocommerce
   */
  syncFromWooCommerce: async (): Promise<SyncResponse> => {
    try {
      const response = await api.post<SyncResponse>('/api/email-gating/customers/sync-woocommerce', {});
      return response;
    } catch (error) {
      console.error('Sync from WooCommerce error:', error);
      throw error;
    }
  },

  /**
   * Generic sync from any configured source
   * POST /api/email-gating/customers/sync
   */
  syncFromSource: async (source: 'shopify' | 'woocommerce' | 'csv' | 'api'): Promise<SyncResponse> => {
    try {
      const response = await api.post<SyncResponse>('/api/email-gating/customers/sync', { source });
      return response;
    } catch (error) {
      console.error('Sync from source error:', error);
      throw error;
    }
  },

  // ===== ANALYTICS =====
  
  /**
   * Get comprehensive customer analytics
   * GET /api/email-gating/analytics
   */
  getAnalytics: async (params?: {
    timeRange?: string;
    includeTimeline?: boolean;
  }): Promise<CustomerAnalyticsResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.timeRange) queryParams.set('timeRange', params.timeRange);
      if (params?.includeTimeline) queryParams.set('includeTimeline', String(params.includeTimeline));

      const response = await api.get<CustomerAnalyticsResponse>(
        `/api/email-gating/analytics?${queryParams.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Get analytics error:', error);
      throw error;
    }
  },

  /**
   * Get customer engagement summary
   * GET /api/email-gating/engagement
   */
  getEngagementSummary: async (): Promise<{
    overview: {
      totalCustomers: number;
      activeThisMonth: number;
      averageVotesPerCustomer: number;
      engagementRate: number;
    };
    segments: Array<{
      segment: string;
      count: number;
      percentage: number;
      avgVotes: number;
    }>;
    trends: Array<{
      date: string;
      activeCustomers: number;
      newCustomers: number;
      votes: number;
    }>;
  }> => {
    try {
      const response = await api.get<{
        overview: {
          totalCustomers: number;
          activeThisMonth: number;
          averageVotesPerCustomer: number;
          engagementRate: number;
        };
        segments: Array<{
          segment: string;
          count: number;
          percentage: number;
          avgVotes: number;
        }>;
        trends: Array<{
          date: string;
          activeCustomers: number;
          newCustomers: number;
          votes: number;
        }>;
      }>('/api/email-gating/engagement');
      return response;
    } catch (error) {
      console.error('Get engagement summary error:', error);
      throw error;
    }
  },

  // ===== VOTING ACCESS TRACKING =====
  
  /**
   * Record voting access for customer
   * POST /api/email-gating/customers/:id/voting-access
   */
  recordVotingAccess: async (customerId: string): Promise<{
    success: boolean;
    customer: AllowedCustomer;
    access: {
      recorded: boolean;
      totalAccesses: number;
      lastAccess: string;
    };
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        customer: AllowedCustomer;
        access: {
          recorded: boolean;
          totalAccesses: number;
          lastAccess: string;
        };
      }>(`/api/email-gating/customers/${customerId}/voting-access`, {});
      return response;
    } catch (error) {
      console.error('Record voting access error:', error);
      throw error;
    }
  },

  /**
   * Get voting access history for customer
   * GET /api/email-gating/customers/:id/voting-history
   */
  getVotingHistory: async (customerId: string): Promise<{
    customer: AllowedCustomer;
    history: Array<{
      accessedAt: string;
      ipAddress?: string;
      userAgent?: string;
      votesSubmitted: number;
    }>;
    summary: {
      totalAccesses: number;
      totalVotes: number;
      firstAccess?: string;
      lastAccess?: string;
    };
  }> => {
    try {
      const response = await api.get<{
        customer: AllowedCustomer;
        history: Array<{
          accessedAt: string;
          ipAddress?: string;
          userAgent?: string;
          votesSubmitted: number;
        }>;
        summary: {
          totalAccesses: number;
          totalVotes: number;
          firstAccess?: string;
          lastAccess?: string;
        };
      }>(`/api/email-gating/customers/${customerId}/voting-history`);
      return response;
    } catch (error) {
      console.error('Get voting history error:', error);
      throw error;
    }
  },
};

// ===== LEGACY FUNCTIONS (Deprecated) =====

/**
 * @deprecated Use emailGatingApi.getSettings instead
 */
export const getEmailGatingConfig = async (): Promise<EmailGatingConfig> => {
  console.warn('getEmailGatingConfig is deprecated, use emailGatingApi.getSettings instead');
  const response = await emailGatingApi.getSettings();
  return response.data.settings;
};

/**
 * @deprecated Use emailGatingApi.updateSettings instead
 */
export const updateEmailGatingConfig = async (data: Partial<EmailGatingConfig>): Promise<EmailGatingConfig> => {
  console.warn('updateEmailGatingConfig is deprecated, use emailGatingApi.updateSettings instead');
  const response = await emailGatingApi.updateSettings(data);
  return response.data.settings;
};

/**
 * @deprecated Use emailGatingApi.checkEmailAccess instead
 */
export const checkEmailAllowed = async (email: string): Promise<{ allowed: boolean }> => {
  console.warn('checkEmailAllowed is deprecated, use emailGatingApi.checkEmailAccess instead');
  const response = await emailGatingApi.checkEmailAccess(email);
  return { allowed: response.data.allowed };
};

/**
 * @deprecated Use emailGatingApi.getCustomers instead
 */
export const getAllowedCustomers = async (businessId?: string): Promise<AllowedCustomer[]> => {
  console.warn('getAllowedCustomers is deprecated, use emailGatingApi.getCustomers instead');
  const response = await emailGatingApi.getCustomers();
  return response.data.customers;
};

/**
 * @deprecated Use emailGatingApi.getCustomerByEmail instead
 */
export const getAllowedCustomerByEmail = async (email: string): Promise<AllowedCustomer | null> => {
  console.warn('getAllowedCustomerByEmail is deprecated, use emailGatingApi.getCustomerByEmail instead');
  const response = await emailGatingApi.getCustomerByEmail(email);
  return response.customer;
};

/**
 * @deprecated Use emailGatingApi.grantAccess instead
 */
export const grantCustomerAccess = async (id: string): Promise<AllowedCustomer> => {
  console.warn('grantCustomerAccess is deprecated, use emailGatingApi.grantAccess instead');
  const response = await emailGatingApi.grantAccess(id);
  return response.customer;
};

/**
 * @deprecated Use emailGatingApi.revokeAccess instead
 */
export const revokeCustomerAccess = async (id: string, reason?: string): Promise<AllowedCustomer> => {
  console.warn('revokeCustomerAccess is deprecated, use emailGatingApi.revokeAccess instead');
  const response = await emailGatingApi.revokeAccess(id, reason);
  return response.customer;
};

/**
 * @deprecated Use emailGatingApi.recordVotingAccess instead
 */
export const recordVotingAccess = async (id: string): Promise<AllowedCustomer> => {
  console.warn('recordVotingAccess is deprecated, use emailGatingApi.recordVotingAccess instead');
  const response = await emailGatingApi.recordVotingAccess(id);
  return response.customer;
};

/**
 * @deprecated Use emailGatingApi.updateCustomer instead
 */
export const updateCustomerFromExternal = async (id: string, data: any): Promise<AllowedCustomer> => {
  console.warn('updateCustomerFromExternal is deprecated, use emailGatingApi.updateCustomer instead');
  const response = await emailGatingApi.updateCustomer(id, data);
  return response.customer;
};

/**
 * @deprecated Use emailGatingApi.bulkAddCustomers instead
 */
export const bulkImportCustomers = async (customers: any[], source: string): Promise<{ imported: number; errors: string[] }> => {
  console.warn('bulkImportCustomers is deprecated, use emailGatingApi.bulkAddCustomers instead');
  const response = await emailGatingApi.bulkAddCustomers(customers);
  return { imported: response.data.summary.added, errors: response.data.errors };
};

/**
 * @deprecated Use emailGatingApi.syncFromSource instead
 */
export const syncCustomers = async (source: string): Promise<{ synced: number; errors: string[] }> => {
  console.warn('syncCustomers is deprecated, use emailGatingApi.syncFromSource instead');
  const response = await emailGatingApi.syncFromSource(source as any);
  return { synced: response.data.summary.synced, errors: response.data.errors };
};

/**
 * @deprecated Use emailGatingApi.getAnalytics instead
 */
export const getCustomerStats = async (): Promise<{
  total: number;
  active: number;
  registered: number;
  totalVotes: number;
  vipCustomers: number;
  bySource: Array<{ source: string; active: number }>;
}> => {
  console.warn('getCustomerStats is deprecated, use emailGatingApi.getAnalytics instead');
  const response = await emailGatingApi.getAnalytics();
  return {
    total: response.data.analytics.overview.total,
    active: response.data.analytics.overview.active,
    registered: response.data.analytics.overview.registered,
    totalVotes: response.data.analytics.overview.totalVotes,
    vipCustomers: response.data.analytics.overview.vip,
    bySource: response.data.analytics.sources.map(s => ({ source: s.source, active: s.count })),
  };
};