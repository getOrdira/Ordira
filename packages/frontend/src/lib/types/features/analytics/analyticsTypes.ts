/**
 * Analytics Types
 * 
 * Re-exports backend analytics types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  AnalyticsGrouping,
  AnalyticsTimeRange,
  AnalyticsRequestContext,
  VotingLeaderboardEntry,
  VotingDailyBreakdownEntry,
  VotingSourceBreakdown,
  PlatformVotingAnalytics,
  BusinessAnalyticsSnapshot,
  ProductMediaUploadStats,
  ProductPerformanceEntry,
  ProductAnalyticsSnapshot,
  ManufacturerAnalyticsSnapshot,
  SystemHealthMetrics,
  DashboardAnalyticsSnapshot,
  AnalyticsReportType,
  AnalyticsReportRequest,
  AnalyticsReportPayload,
  DashboardAggregationOptions,
  ReportingOptions,
  CachedAnalyticsDescriptor
} from '@backend/services/analytics/utils/types';

// Re-export all backend types
export type {
  AnalyticsGrouping,
  AnalyticsTimeRange,
  AnalyticsRequestContext,
  VotingLeaderboardEntry,
  VotingDailyBreakdownEntry,
  VotingSourceBreakdown,
  PlatformVotingAnalytics,
  BusinessAnalyticsSnapshot,
  ProductMediaUploadStats,
  ProductPerformanceEntry,
  ProductAnalyticsSnapshot,
  ManufacturerAnalyticsSnapshot,
  SystemHealthMetrics,
  DashboardAnalyticsSnapshot,
  AnalyticsReportType,
  AnalyticsReportRequest,
  AnalyticsReportPayload,
  DashboardAggregationOptions,
  ReportingOptions,
  CachedAnalyticsDescriptor
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Analytics dashboard display with enhanced UI fields
 */
export interface AnalyticsDashboardDisplay extends DashboardAnalyticsSnapshot {
  _ui?: {
    charts?: {
      votingTrends?: {
        labels: string[];
        datasets: Array<{
          label: string;
          data: number[];
          color?: string;
        }>;
      };
      productPerformance?: {
        labels: string[];
        datasets: Array<{
          label: string;
          data: number[];
          color?: string;
        }>;
      };
      businessBreakdown?: {
        labels: string[];
        datasets: Array<{
          label: string;
          data: number[];
          color?: string;
        }>;
      };
    };
    formattedMetrics?: {
      totalVotes?: string;
      totalProducts?: string;
      totalBusinesses?: string;
      avgVotesPerProduct?: string;
    };
    updatedAtFormatted?: string;
    relativeUpdateTime?: string;
  };
}

/**
 * Analytics report display options
 */
export interface AnalyticsReportDisplayOptions {
  reportType: AnalyticsReportType;
  timeRange?: AnalyticsTimeRange;
  includeRawData?: boolean;
  format?: 'json' | 'csv' | 'pdf' | 'html';
  _ui?: {
    validationErrors?: Record<string, string>;
    isGenerating?: boolean;
    downloadUrl?: string;
  };
}

