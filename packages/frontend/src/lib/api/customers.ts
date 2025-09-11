// src/lib/api/customers.ts

import { api } from './client';
import { ApiError } from '@/lib/errors';

export interface Customer {
  _id: string;
  businessId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  status: 'active' | 'inactive' | 'pending' | 'blocked';
  source: 'manual' | 'shopify' | 'woocommerce' | 'csv' | 'api';
  tags?: string[];
  customFields?: Record<string, any>;
  lastVoteAt?: Date;
  totalVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerFilters {
  search?: string;
  status?: Customer['status'];
  source?: Customer['source'];
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'email' | 'firstName' | 'lastName' | 'createdAt' | 'lastVoteAt' | 'totalVotes';
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerListResponse {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  analytics: {
    totalCustomers: number;
    activeCustomers: number;
    newCustomersThisMonth: number;
    customersBySource: Record<string, number>;
    customersByStatus: Record<string, number>;
    averageVotesPerCustomer: number;
  };
}

export interface BulkImportResult {
  imported: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  summary: {
    added: number;
    updated: number;
    skipped: number;
  };
}

export const customersApi = {
  
  /**
   * Get customers list with filters
   * GET /api/brand/customers
   */
  getCustomers: async (filters?: CustomerFilters): Promise<CustomerListResponse> => {
    try {
      const response = await api.get<CustomerListResponse>('/api/brand/customers', {
        params: filters
      });
      return response;
    } catch (error) {
      console.error('Get customers error:', error);
      throw error;
    }
  },

  /**
   * Get single customer by ID
   * GET /api/brand/customers/:id
   */
  getCustomer: async (customerId: string): Promise<Customer> => {
    try {
      const response = await api.get<Customer>(`/api/brand/customers/${customerId}`);
      return response;
    } catch (error) {
      console.error('Get customer error:', error);
      throw error;
    }
  },

  /**
   * Add new customer
   * POST /api/brand/customers
   */
  addCustomer: async (data: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
    tags?: string[];
    customFields?: Record<string, any>;
  }): Promise<Customer> => {
    try {
      const response = await api.post<Customer>('/api/brand/customers', data);
      return response;
    } catch (error) {
      console.error('Add customer error:', error);
      throw error;
    }
  },

  /**
   * Update customer
   * PATCH /api/brand/customers/:id
   */
  updateCustomer: async (customerId: string, data: Partial<Customer>): Promise<Customer> => {
    try {
      const response = await api.patch<Customer>(`/api/brand/customers/${customerId}`, data);
      return response;
    } catch (error) {
      console.error('Update customer error:', error);
      throw error;
    }
  },

  /**
   * Remove customer
   * DELETE /api/brand/customers/:id
   */
  removeCustomer: async (customerId: string): Promise<{ success: boolean }> => {
    try {
      const response = await api.delete<{ success: boolean }>(`/api/brand/customers/${customerId}`);
      return response;
    } catch (error) {
      console.error('Remove customer error:', error);
      throw error;
    }
  },

  /**
   * Bulk import customers from CSV
   * POST /api/brand/customers/bulk-import
   */
  bulkImportCustomers: async (csvData: string): Promise<BulkImportResult> => {
    try {
      const response = await api.post<BulkImportResult>('/api/brand/customers/bulk-import', {
        csvData
      });
      return response;
    } catch (error) {
      console.error('Bulk import customers error:', error);
      throw error;
    }
  },

  /**
   * Sync customers from integration
   * POST /api/brand/customers/sync
   */
  syncCustomers: async (source: 'shopify' | 'woocommerce'): Promise<{
    synced: number;
    added: number;
    updated: number;
    errors: string[];
  }> => {
    try {
      const response = await api.post<{
        synced: number;
        added: number;
        updated: number;
        errors: string[];
      }>('/api/brand/customers/sync', { source });
      return response;
    } catch (error) {
      console.error('Sync customers error:', error);
      throw error;
    }
  },

  /**
   * Export customers to CSV
   * GET /api/brand/customers/export
   */
  exportCustomers: async (filters?: CustomerFilters): Promise<Blob> => {
    try {
      const response = await api.get<Blob>('/api/brand/customers/export', {
        params: filters,
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Export customers error:', error);
      throw error;
    }
  },

  /**
   * Get customer analytics
   * GET /api/brand/customers/analytics
   */
  getCustomerAnalytics: async (timeframe?: '7d' | '30d' | '90d' | '1y'): Promise<{
    totalCustomers: number;
    newCustomers: number;
    activeCustomers: number;
    customersBySource: Record<string, number>;
    customersByStatus: Record<string, number>;
    votingActivity: {
      totalVotes: number;
      averageVotesPerCustomer: number;
      mostActiveCustomers: Array<{
        customerId: string;
        email: string;
        votes: number;
      }>;
    };
    trends: Array<{
      date: string;
      newCustomers: number;
      activeCustomers: number;
      votes: number;
    }>;
  }> => {
    try {
      const response = await api.get<{
        totalCustomers: number;
        newCustomers: number;
        activeCustomers: number;
        customersBySource: Record<string, number>;
        customersByStatus: Record<string, number>;
        votingActivity: {
          totalVotes: number;
          averageVotesPerCustomer: number;
          mostActiveCustomers: Array<{
            customerId: string;
            email: string;
            votes: number;
          }>;
        };
        trends: Array<{
          date: string;
          newCustomers: number;
          activeCustomers: number;
          votes: number;
        }>;
      }>('/api/brand/customers/analytics', {
        params: { timeframe }
      });
      return response;
    } catch (error) {
      console.error('Get customer analytics error:', error);
      throw error;
    }
  },

  /**
   * Update customer tags
   * PATCH /api/brand/customers/:id/tags
   */
  updateCustomerTags: async (customerId: string, tags: string[]): Promise<Customer> => {
    try {
      const response = await api.patch<Customer>(`/api/brand/customers/${customerId}/tags`, {
        tags
      });
      return response;
    } catch (error) {
      console.error('Update customer tags error:', error);
      throw error;
    }
  },

  /**
   * Block/unblock customer
   * PATCH /api/brand/customers/:id/status
   */
  updateCustomerStatus: async (customerId: string, status: Customer['status']): Promise<Customer> => {
    try {
      const response = await api.patch<Customer>(`/api/brand/customers/${customerId}/status`, {
        status
      });
      return response;
    } catch (error) {
      console.error('Update customer status error:', error);
      throw error;
    }
  },

  // ===== ACCESS CONTROL FUNCTIONS =====

  /**
   * Grant access to customer
   * POST /api/brand/customers/:id/access/grant
   */
  grantAccess: async (customerId: string, reason?: string): Promise<{
    success: boolean;
    customer: Customer;
    granted: {
      timestamp: string;
      reason?: string;
      grantedBy: string;
    };
    impact: string;
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        customer: Customer;
        granted: {
          timestamp: string;
          reason?: string;
          grantedBy: string;
        };
        impact: string;
      }>(`/api/brand/customers/${customerId}/access/grant`, { reason });
      return response;
    } catch (error) {
      console.error('Grant customer access error:', error);
      throw error;
    }
  },

  /**
   * Revoke access from customer
   * POST /api/brand/customers/:id/access/revoke
   */
  revokeAccess: async (customerId: string, reason?: string): Promise<{
    success: boolean;
    customer: Customer;
    revocation: {
      timestamp: string;
      reason?: string;
      revokedBy: string;
    };
    impact: {
      votesAffected: number;
      accessHistory: any[];
    };
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        customer: Customer;
        revocation: {
          timestamp: string;
          reason?: string;
          revokedBy: string;
        };
        impact: {
          votesAffected: number;
          accessHistory: any[];
        };
      }>(`/api/brand/customers/${customerId}/access/revoke`, { reason });
      return response;
    } catch (error) {
      console.error('Revoke customer access error:', error);
      throw error;
    }
  },

  /**
   * Restore access to customer
   * POST /api/brand/customers/:id/access/restore
   */
  restoreAccess: async (customerId: string): Promise<{
    success: boolean;
    customer: Customer;
    restoration: {
      timestamp: string;
      restoredBy: string;
    };
    impact: string;
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        customer: Customer;
        restoration: {
          timestamp: string;
          restoredBy: string;
        };
        impact: string;
      }>(`/api/brand/customers/${customerId}/access/restore`);
      return response;
    } catch (error) {
      console.error('Restore customer access error:', error);
      throw error;
    }
  },

  /**
   * Bulk update customer access
   * POST /api/brand/customers/access/bulk
   */
  bulkUpdateAccess: async (data: {
    customerIds: string[];
    action: 'grant' | 'revoke' | 'restore';
    reason?: string;
  }): Promise<{
    success: boolean;
    processed: number;
    results: Array<{
      customerId: string;
      success: boolean;
      error?: string;
    }>;
  }> => {
    try {
      const response = await api.post<{
        success: boolean;
        processed: number;
        results: Array<{
          customerId: string;
          success: boolean;
          error?: string;
        }>;
      }>('/api/brand/customers/access/bulk', data);
      return response;
    } catch (error) {
      console.error('Bulk update customer access error:', error);
      throw error;
    }
  },

  /**
   * Get customer access history
   * GET /api/brand/customers/:id/access/history
   */
  getCustomerAccessHistory: async (customerId: string): Promise<Array<{
    action: 'granted' | 'revoked' | 'restored';
    timestamp: string;
    reason?: string;
    performedBy: string;
  }>> => {
    try {
      const response = await api.get<Array<{
        action: 'granted' | 'revoked' | 'restored';
        timestamp: string;
        reason?: string;
        performedBy: string;
      }>>(`/api/brand/customers/${customerId}/access/history`);
      return response;
    } catch (error) {
      console.error('Get customer access history error:', error);
      throw error;
    }
  },

  /**
   * Get customer by email
   * GET /api/brand/customers/email/:email
   */
  getCustomerByEmail: async (email: string): Promise<{
    success: boolean;
    customer: Customer | null;
    found: boolean;
  }> => {
    try {
      const response = await api.get<{
        success: boolean;
        customer: Customer | null;
        found: boolean;
      }>(`/api/brand/customers/email/${email}`);
      return response;
    } catch (error) {
      console.error('Get customer by email error:', error);
      throw error;
    }
  },

  /**
   * Get customer analytics
   * GET /api/brand/customers/analytics
   */
  getAnalytics: async (options?: { timeRange?: string; includeTimeline?: boolean }): Promise<{
    data: {
      analytics: any;
      insights: any;
      recommendations: string[];
    };
  }> => {
    try {
      const response = await api.get<{
        data: {
          analytics: any;
          insights: any;
          recommendations: string[];
        };
      }>('/api/brand/customers/analytics', { params: options });
      return response;
    } catch (error) {
      console.error('Get customer analytics error:', error);
      throw error;
    }
  },

  /**
   * Get email gating settings
   * GET /api/brand/email-gating/settings
   */
  getSettings: async (): Promise<{
    data: {
      settings: any;
    };
  }> => {
    try {
      const response = await api.get<{
        data: {
          settings: any;
        };
      }>('/api/brand/email-gating/settings');
      return response;
    } catch (error) {
      console.error('Get email gating settings error:', error);
      throw error;
    }
  },

  /**
   * Update email gating settings
   * PATCH /api/brand/email-gating/settings
   */
  updateSettings: async (settings: any): Promise<{
    data: {
      settings: any;
    };
  }> => {
    try {
      const response = await api.patch<{
        data: {
          settings: any;
        };
      }>('/api/brand/email-gating/settings', settings);
      return response;
    } catch (error) {
      console.error('Update email gating settings error:', error);
      throw error;
    }
  }
};
