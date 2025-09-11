import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// ===== TYPES =====

interface BaseAnalyticsQuery {
  startDate?: string;
  endDate?: string;
  timeframe?: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  format?: 'json' | 'csv' | 'xlsx';
  metrics?: Array<'votes' | 'certificates' | 'connections' | 'revenue' | 'transactions' | 'engagement'>;
}

interface VotesAnalyticsQuery {
  startDate?: string;
  endDate?: string;
  timeframe?: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  format?: 'json' | 'csv' | 'xlsx';
  proposalId?: string;
  metrics?: Array<'total_votes' | 'participation_rate' | 'proposal_success_rate' | 'avg_response_time'>;
}

interface ProductAnalyticsQuery extends BaseAnalyticsQuery {
  includeCompetitorComparison?: boolean;
  includeVoterDemographics?: boolean;
  includeSelectionReasons?: boolean;
}

interface ManufacturerAnalyticsQuery {
  timeframe?: string;
  brandId?: string;
  metrics?: Array<'connections' | 'orders' | 'certificates' | 'product_selections'>;
  includeProductDemand?: boolean;
  includeMarketInsights?: boolean;
}

interface AnalyticsOverview {
  summary: {
    totalVotes: number;
    totalCertificates: number;
    totalConnections: number;
    totalRevenue: number;
    [key: string]: any;
  };
  trends: Array<{
    date: string;
    value: number;
    metric: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    votes: number;
    rank: number;
  }>;
  businessMetrics: {
    engagementRate: number;
    conversionRate: number;
    retentionRate: number;
  };
  metadata: {
    businessId: string;
    timeframe: string;
    generatedAt: string;
  };
}

interface VotingAnalytics {
  votingSummary: {
    totalVotes: number;
    totalProposals: number;
    participationRate: number;
    averageResponseTime: string;
  };
  proposalMetrics: Array<{
    proposalId: string;
    title: string;
    totalVotes: number;
    status: 'active' | 'closed' | 'draft';
    winningProduct?: {
      id: string;
      name: string;
      votes: number;
    };
  }>;
  trends: Array<{
    date: string;
    votes: number;
    participation: number;
  }>;
  voterDemographics: {
    byRegion: Record<string, number>;
    byAge: Record<string, number>;
    byEngagement: Record<string, number>;
  };
}

interface ProductAnalytics {
  productMetrics: {
    totalSelections: number;
    winRate: number;
    averageVotes: number;
    popularityRank: number;
  };
  selectionTrends: Array<{
    date: string;
    selections: number;
    rank: number;
  }>;
  voterFeedback: {
    reasons: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
    averageRating: number;
  };
  competitorComparison?: {
    competitors: Array<{
      name: string;
      selections: number;
      rank: number;
    }>;
  };
  manufacturerInsights: {
    productionDemand: string;
    popularityRank: number | null;
    selectionReasons: Array<any>;
    competitorComparison: Record<string, any>;
    productionRecommendation: string | null;
  };
}

interface ManufacturerAnalytics {
  summary: Record<string, any>;
  brandMetrics: {
    totalConnected: number;
    activeCollaborations: number;
    newConnectionsInPeriod: number;
  };
  collaborationMetrics: {
    active: number;
    pending: number;
    completed: number;
  };
  productDemand?: {
    opportunities: Array<any>;
    trends: Record<string, any>;
  };
  marketData?: {
    trends: Record<string, any>;
    insights: Array<any>;
  };
  businessInsights: {
    connectedBrands: number;
    activeCollaborations: number;
    productionOpportunities: Array<any>;
    marketTrends: Record<string, any>;
  };
}

// ===== API FUNCTIONS =====

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const analyticsApi = {
  // Overview analytics
  getOverview: (params?: BaseAnalyticsQuery): Promise<AnalyticsOverview> =>
    api.get('/analytics', { params }).then(res => res.data),

  // Voting analytics
  getVotingAnalytics: (params?: VotesAnalyticsQuery): Promise<VotingAnalytics> =>
    api.get('/analytics/votes', { params }).then(res => res.data),

  // Product analytics
  getProductAnalytics: (params?: ProductAnalyticsQuery): Promise<ProductAnalytics> =>
    api.get('/analytics/products', { params }).then(res => res.data),

  getProductAnalyticsById: (productId: string, params?: ProductAnalyticsQuery): Promise<ProductAnalytics> =>
    api.get(`/analytics/products/${productId}`, { params }).then(res => res.data),

  // Manufacturer analytics
  getManufacturerAnalytics: (params?: ManufacturerAnalyticsQuery): Promise<ManufacturerAnalytics> =>
    api.get('/analytics/manufacturer', { params }).then(res => res.data),

  // Export analytics
  exportAnalytics: (type: 'overview' | 'votes' | 'products', params: any) =>
    api.get(`/analytics/export/${type}`, { 
      params: { ...params, format: 'csv' },
      responseType: 'blob'
    }).then(res => res.data),
};

// ===== HOOKS =====

/**
 * Get analytics overview with summary metrics
 */
export function useAnalyticsOverview(params?: BaseAnalyticsQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['analytics', 'overview', params],
    queryFn: () => analyticsApi.getOverview(params),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Get voting analytics and metrics
 */
export function useVotingAnalytics(params?: VotesAnalyticsQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['analytics', 'voting', params],
    queryFn: () => analyticsApi.getVotingAnalytics(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

/**
 * Get product analytics
 */
export function useProductAnalytics(params?: ProductAnalyticsQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['analytics', 'products', params],
    queryFn: () => analyticsApi.getProductAnalytics(params),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Get analytics for specific product
 */
export function useProductAnalyticsById(
  productId: string | null | undefined, 
  params?: ProductAnalyticsQuery, 
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['analytics', 'products', productId, params],
    queryFn: () => analyticsApi.getProductAnalyticsById(productId!, params),
    enabled: (options?.enabled ?? true) && !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Get manufacturer analytics (manufacturer only)
 */
export function useManufacturerAnalytics(
  params?: ManufacturerAnalyticsQuery, 
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['analytics', 'manufacturer', params],
    queryFn: () => analyticsApi.getManufacturerAnalytics(params),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Export analytics data
 */
export function useExportAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, params }: { type: 'overview' | 'votes' | 'products'; params: any }) =>
      analyticsApi.exportAnalytics(type, params),
    onSuccess: (data, variables) => {
      // Create download link
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${variables.type}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Export failed:', error);
    },
  });
}

/**
 * Refresh all analytics data
 */
export function useRefreshAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Invalidate all analytics queries
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      return true;
    },
    onSuccess: () => {
      console.log('Analytics data refreshed');
    },
  });
}

/**
 * Real-time analytics subscription hook
 */
export function useRealtimeAnalytics(enabled: boolean = false) {
  const queryClient = useQueryClient();

  // This would integrate with your WebSocket or SSE setup
  // For now, we'll just periodically refetch
  const query = useQuery({
    queryKey: ['analytics', 'realtime'],
    queryFn: () => analyticsApi.getOverview({ timeframe: '24h' }),
    enabled,
    refetchInterval: enabled ? 30 * 1000 : false, // 30 seconds
    refetchIntervalInBackground: true,
  });

  // Update relevant cached data when data changes
  React.useEffect(() => {
    if (query.data) {
      queryClient.setQueryData(['analytics', 'overview'], query.data);
    }
  }, [query.data, queryClient]);

  return query;
}

/**
 * Analytics insights and recommendations
 */
export function useAnalyticsInsights(timeframe: '24h' | '7d' | '30d' | '90d' | '1y' | 'all' = '30d') {
  return useQuery({
    queryKey: ['analytics', 'insights', timeframe],
    queryFn: async () => {
      const [overview, voting, products] = await Promise.all([
        analyticsApi.getOverview({ timeframe }),
        analyticsApi.getVotingAnalytics({ timeframe }),
        analyticsApi.getProductAnalytics({ timeframe }),
      ]);

      // Generate insights based on data
      const insights = [];

      if (voting.votingSummary.participationRate < 0.3) {
        insights.push({
          type: 'warning',
          title: 'Low Participation Rate',
          message: 'Consider improving engagement strategies to increase voting participation.',
          metric: 'participation',
          value: voting.votingSummary.participationRate,
        });
      }

      if (products.productMetrics.winRate > 0.8) {
        insights.push({
          type: 'success',
          title: 'High Product Win Rate',
          message: 'Your products are performing exceptionally well in selections.',
          metric: 'winRate',
          value: products.productMetrics.winRate,
        });
      }

      return {
        insights,
        overview,
        voting,
        products,
        recommendations: generateRecommendations(overview, voting, products),
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Helper function to generate recommendations
function generateRecommendations(overview: any, voting: any, products: any) {
  const recommendations = [];

  if (voting.votingSummary.participationRate < 0.5) {
    recommendations.push({
      priority: 'high',
      category: 'engagement',
      action: 'Increase voter engagement',
      details: 'Send targeted notifications and incentives to boost participation.',
    });
  }

  if (products.productMetrics.popularityRank > 10) {
    recommendations.push({
      priority: 'medium',
      category: 'product',
      action: 'Improve product positioning',
      details: 'Consider updating product descriptions or marketing strategies.',
    });
  }

  return recommendations;
}