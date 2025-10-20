import type { CacheOptions } from '../../external/enhanced-cache.service';

/**
 * Shared analytics type definitions used across the modular analytics services.
 */

export type AnalyticsGrouping = 'day' | 'week' | 'month';

export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
}

export interface AnalyticsRequestContext {
  businessId?: string;
  manufacturerId?: string;
  tenantId?: string;
  timeRange?: AnalyticsTimeRange;
  groupBy?: AnalyticsGrouping;
  useCache?: boolean;
}

export interface VotingLeaderboardEntry {
  productId: string;
  productTitle: string;
  voteCount: number;
  certificateCount?: number;
  engagementScore?: number;
}

export interface VotingDailyBreakdownEntry {
  date: string;
  votes: number;
  uniqueVoters: number;
}

export type VotingSourceBreakdown = Record<string, number>;

export interface PlatformVotingAnalytics {
  totalVotes: number;
  uniqueVoters: number;
  verifiedVotes: number;
  unverifiedVotes: number;
  avgVotesPerDay: number;
  topProducts: VotingLeaderboardEntry[];
  votingSources: VotingSourceBreakdown;
  dailyBreakdown: VotingDailyBreakdownEntry[];
}

export interface BusinessAnalyticsSnapshot {
  totalBusinesses: number;
  verifiedBusinesses: number;
  verificationRate: number;
  industriesBreakdown: Record<string, number>;
  plansBreakdown: Record<string, number>;
  avgProfileViews: number;
  recentSignups: number;
  activeBusinesses: number;
}

export interface ProductMediaUploadStats {
  withMedia: number;
  withoutMedia: number;
  avgMediaPerProduct: number;
}

export interface ProductPerformanceEntry {
  id: string;
  title: string;
  voteCount: number;
  certificateCount: number;
  engagementScore: number;
}

export interface ProductAnalyticsSnapshot {
  totalProducts: number;
  activeProducts: number;
  productsByCategory: Record<string, number>;
  avgVotesPerProduct: number;
  topPerformingProducts: ProductPerformanceEntry[];
  mediaUploadStats: ProductMediaUploadStats;
}

export interface ManufacturerAnalyticsSnapshot {
  totalManufacturers: number;
  verifiedManufacturers: number;
  industriesBreakdown: Record<string, number>;
  avgProfileScore: number;
  servicesOfferedStats: Record<string, number>;
  locationStats: Record<string, number>;
  certificationStats: Record<string, number>;
}

export interface SystemHealthMetrics {
  totalUsers: number;
  activeUsers: number;
  systemLoad: number;
  uptime: number;
  responseTime?: number;
  incidentCount?: number;
}

export interface DashboardAnalyticsSnapshot {
  votingAnalytics: PlatformVotingAnalytics;
  businessAnalytics: BusinessAnalyticsSnapshot;
  productAnalytics: ProductAnalyticsSnapshot;
  manufacturerAnalytics: ManufacturerAnalyticsSnapshot;
  systemHealth: SystemHealthMetrics;
  updatedAt: Date;
}

export type AnalyticsReportType = 'monthly-summary' | 'product-performance' | 'voting-trends';

export interface AnalyticsReportRequest {
  businessId: string;
  reportType: AnalyticsReportType;
  timeRange?: AnalyticsTimeRange;
  includeRawData?: boolean;
  useReplica?: boolean;
}

export interface AnalyticsReportPayload {
  metadata: {
    businessId: string;
    generatedAt: Date;
    reportType: AnalyticsReportType;
    timeRange?: AnalyticsTimeRange;
    format: 'json' | 'csv' | 'pdf' | 'html';
  };
  summary: Record<string, unknown>;
  data: Record<string, unknown>;
  raw?: unknown;
}

export interface DashboardAggregationOptions extends AnalyticsRequestContext {
  includeSystemHealth?: boolean;
  useReadReplica?: boolean;
}

export interface ReportingOptions {
  businessId: string;
  reportType: AnalyticsReportType;
  timeRange?: AnalyticsTimeRange;
  useReplica?: boolean;
}

export interface CachedAnalyticsDescriptor {
  segment: string;
  identifier?: string;
  params?: Record<string, unknown>;
  cache?: CacheOptions;
}
