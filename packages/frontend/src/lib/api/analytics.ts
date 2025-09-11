// src/lib/api/analytics.ts

import apiClient from './client'; // Base Axios client with auth interceptors
import { ApiError } from '@/lib/errors'; // Shared error type from common types

// Exact response types based on model aggregates and assumed controller responses
export interface AnalyticsOverview {
  total: number; // e.g., customers or general count
  active: number;
  registered: number;
  totalVotes: number;
  vipCustomers: number;
  bySource: Array<{ source: string; active: number }>; // From allowedCustomer.getCustomerStats
  totalCertificates: number;
  totalProducts: number;
  revenue: number; // From billing.model.ts totalRevenue
}

export interface VoteAnalytics {
  totalVotes: number;
  byProduct: Array<{ _id: string; count: number }>; // Aggregate from votingRecord
  topProducts: Array<{ productId: string; title: string; votes: number }>;
}

export interface RevenueAnalytics {
    totalRevenue: number;
    monthlyRecurringRevenue: number;
    averageRevenuePerUser: number;
    revenueGrowth: number;
    monthlyStats: Array<{ month: string; revenue: number; customers: number }>;
}

export interface ChurnAnalytics {
    churnRate: number;
    retentionRate: number;
    monthlyChurn: Array<{ month: string; churned: number; retained: number }>;
    churnReasons: Array<{ reason: string; count: number }>;
}
  

export interface CertificateAnalytics {
  totalMinted: number; // Count by status 'minted'
  totalTransferred: number; // transferredToBrand: true
  totalFailed: number; // transferFailed: true
  averageTransferTime: number;
  totalGasUsed: string;
  monthlyStats: Array<{ month: string; transfers: number; success: number; failures: number }>; // From brandSettings.transferAnalytics.monthlyStats
}

export interface ProductAnalytics {
  totalProducts: number;
  totalViews: number;
  byViews: Array<{ _id: string; viewCount: number }>; // From collection.model.ts aggregates
  topProducts: Array<{ productId: string; title: string; views: number }>;
}

export interface EngagementAnalytics {
  totalEmailsChecked: number;
  totalEmailsAllowed: number;
  totalEmailsDenied: number;
  dailyStats: Array<{ date: string; checked: number; allowed: number; denied: number; topDenialReasons: string[] }>; // From brandSettings.emailGating.gatingAnalytics
  activeCustomers: number; // From allowedCustomer isActive/hasAccess
  vipCustomers: number;
}

export interface TransactionAnalytics {
  totalTransfers: number;
  successfulTransfers: number;
  failedTransfers: number;
  totalGasUsed: string;
  averageTransferTime: number;
  monthlyStats: Array<{ month: string; success: number; failures: number }>; // Aligned with certificate post-save updates
}

/**
 * Fetches overall analytics overview.
 * Endpoint: GET /api/analytics (from analytics.routes.ts)
 * Response: Matches aggregates like allowedCustomer.getCustomerStats() + overview from analytics.service.ts
 */
export const getAnalyticsOverview = async (businessId?: string): Promise<AnalyticsOverview> => {
  try {
    const response = await apiClient.get<AnalyticsOverview>('/api/analytics', {
      params: { businessId },
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch analytics overview', 500);
  }
};

/**
 * Fetches vote analytics.
 * Endpoint: GET /api/analytics/votes
 * Response: Aggregates from votingRecord.model.ts and pendingVote.model.ts
 */
export const getVoteAnalytics = async (businessId?: string): Promise<VoteAnalytics> => {
  try {
    const response = await apiClient.get<VoteAnalytics>('/api/analytics/votes', {
      params: { businessId },
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch vote analytics', 500);
  }
};

/**
 * Fetches certificate analytics.
 * Endpoint: GET /api/analytics/certificates
 * Response: From certificate.model.ts aggregates and brandSettings.transferAnalytics
 */
export const getCertificateAnalytics = async (businessId?: string): Promise<CertificateAnalytics> => {
  try {
    const response = await apiClient.get<CertificateAnalytics>('/api/analytics/certificates', {
      params: { businessId },
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch certificate analytics', 500);
  }
};

/**
 * Fetches product analytics.
 * Endpoint: GET /api/analytics/products
 * Response: From product.model.ts and collection.model.ts viewCount aggregates
 */
export const getProductAnalytics = async (businessId?: string): Promise<ProductAnalytics> => {
  try {
    const response = await apiClient.get<ProductAnalytics>('/api/analytics/products', {
      params: { businessId },
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch product analytics', 500);
  }
};

/**
 * Fetches Revenue Analytics
 * @param businessId 
 * @returns 
 */
export const getRevenueAnalytics = async (businessId?: string): Promise<RevenueAnalytics> => {
    try {
      const response = await apiClient.get<RevenueAnalytics>('/api/analytics/revenue', {
        params: { businessId },
      });
      return response;
    } catch (error) {
      throw new ApiError('Failed to fetch revenue analytics', 500);
    }
};

/**
 * Fetches engagement analytics.
 * Endpoint: GET /api/analytics/engagement
 * Response: From allowedCustomer.getCustomerStats and brandSettings.gatingAnalytics
 */
export const getEngagementAnalytics = async (businessId?: string): Promise<EngagementAnalytics> => {
  try {
    const response = await apiClient.get<EngagementAnalytics>('/api/analytics/engagement', {
      params: { businessId },
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch engagement analytics', 500);
  }
};

/**
 * Fetches transaction analytics.
 * Endpoint: GET /api/analytics/transactions
 * Response: From brandSettings.transferAnalytics and certificate transfers
 */
export const getTransactionAnalytics = async (businessId?: string): Promise<TransactionAnalytics> => {
  try {
    const response = await apiClient.get<TransactionAnalytics>('/api/analytics/transactions', {
      params: { businessId },
    });
    return response;
  } catch (error) {
    throw new ApiError('Failed to fetch transaction analytics', 500);
  }
};