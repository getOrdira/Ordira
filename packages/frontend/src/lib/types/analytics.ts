// src/lib/types/analytics.ts

import Joi from 'joi';
import { commonSchemas, dateRangeSchema } from '../validation/utils';
import { ApiResponse, PaginatedResponse, AnalyticsSummary, TimeRange, KeyValuePair } from './common';

/**
 * Analytics Data interface
 * Based on backend analytics.controller.ts and metrics in models like brandSettings, certificate, billing
 */
export interface AnalyticsData {
  period: string;
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversionRate?: number;
  growth?: {
    users: number;
    sessions: number;
    engagement: number;
  };
  totalCertificates: number;
  totalVotes: number;
  totalProducts: number;
  totalPageViews: number;
  totalUniqueVisitors: number;
  engagementRate: number;
}

/**
 * Certificate Analytics
 * Aligned with certificate.model.ts analytics
 */
export interface CertificateAnalytics {
  totalCertificates: number;
  mintedCertificates: number;
  transferredCertificates: number;
  failedTransfers: number;
  averageTransferTime: number;
  viewCount: number;
  lastViewedAt?: string;
}

/**
 * Vote Analytics
 * From votes.controller.ts and brandSettings, adjusted for product selection voting
 */
export interface VoteAnalytics {
  totalVotes: number;
  topProducts: { productId: string; selectionCount: number }[];
  participationRate: number;
  topVoters: { userId: string; voteCount: number }[];
  timeSeries: { date: string; votes: number }[];
}

/**
 * Billing Analytics
 * From billing.model.ts
 */
export interface BillingAnalytics {
  monthlyRevenue: number;
  yearlyRevenue: number;
  lifetimeValue: number;
  averageMonthlySpend: number;
  currentUsage: {
    apiCalls: number;
    certificates: number;
    votes: number;
    storage: number;
    bandwidth: number;
    lastUpdated: string;
  };
}

/**
 * Domain Analytics
 * From domainMapping.model.ts
 */
export interface DomainAnalytics {
  requestCount: number;
  averageResponseTime: number;
  uptimePercentage: number;
  errorRate: number;
  uniqueVisitors: number;
  lastHealthCheck?: string;
}

/**
 * Query Params for Analytics
 */
export interface AnalyticsQuery {
  timeRange: TimeRange;
  metrics?: string[]; // e.g., ['votes', 'certificates']
  groupBy?: 'day' | 'week' | 'month';
}

/**
 * Paginated Analytics Response
 */
export type PaginatedAnalytics = PaginatedResponse<AnalyticsData>;

/**
 * Type guards
 */
export function isAnalyticsData(obj: any): obj is AnalyticsData {
  return obj && typeof obj.totalVotes === 'number' && typeof obj.totalCertificates === 'number';
}

// ===== JOI VALIDATION SCHEMAS =====
// Aligned with backend analytics validation schemas

/**
 * Base analytics query validation schema
 * Based on backend baseAnalyticsQuerySchema
 */
export const baseAnalyticsQuerySchema = Joi.object({
  startDate: commonSchemas.date.optional(),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date'
    }),
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
    .optional()
    .messages({
      'any.only': 'Timeframe must be 24h, 7d, 30d, 90d, 1y, or all'
    }),
  groupBy: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .optional()
    .messages({
      'any.only': 'Group by must be hour, day, week, or month'
    }),
  format: Joi.string()
    .valid('json', 'csv', 'xlsx')
    .default('json')
    .optional()
    .messages({
      'any.only': 'Format must be json, csv, or xlsx'
    }),
  metrics: Joi.array()
    .items(Joi.string().valid(
      'votes', 'certificates', 'connections', 'revenue', 'transactions', 
      'engagement', 'users', 'sessions', 'pageviews'
    ))
    .min(1)
    .max(10)
    .optional()
    .messages({
      'array.min': 'At least one metric must be specified',
      'array.max': 'Cannot request more than 10 metrics',
      'any.only': 'Invalid metric specified'
    })
});

/**
 * Analytics query validation schema
 * Based on backend analyticsQuerySchema
 */
export const analyticsQuerySchema = Joi.object<AnalyticsQuery>({
  timeRange: Joi.object<TimeRange>({
    start: commonSchemas.date.required(),
    end: Joi.date()
      .iso()
      .min(Joi.ref('start'))
      .required()
      .messages({
        'date.min': 'End date must be after start date',
        'any.required': 'End date is required'
      }),
    timezone: Joi.string()
      .max(50)
      .default('UTC')
      .optional(),
    preset: Joi.string()
      .valid('today', 'yesterday', 'last7days', 'last30days', 'last90days', 'custom')
      .optional()
  }).required(),
  
  metrics: Joi.array()
    .items(Joi.string().valid('votes', 'certificates'))
    .min(1)
    .max(5)
    .optional()
    .messages({
      'array.min': 'At least one metric is required',
      'array.max': 'Cannot request more than 5 metrics'
    }),
  
  groupBy: Joi.string()
    .valid('day', 'week', 'month')
    .default('day')
    .optional()
});

/**
 * Votes analytics query validation schema
 * Updated for product selection voting analytics
 */
export const votesAnalyticsQuerySchema = Joi.object({
  startDate: commonSchemas.date.optional(),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date'
    }),
  proposalId: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Proposal ID cannot exceed 100 characters'
    }),
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
    .optional(),
  groupBy: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .optional(),
  metrics: Joi.array()
    .items(Joi.string().valid(
      'total_votes', 'participation_rate', 'proposal_success_rate',
      'total_product_selections', 'unique_voters', 'engagement_score',
      'conversion_rate', 'completion_rate'
    ))
    .min(1)
    .max(8)
    .optional()
    .messages({
      'array.min': 'At least one metric is required',
      'array.max': 'Cannot request more than 8 metrics'
    }),
  includeProductBreakdown: Joi.boolean().default(false),
  includeVoterDetails: Joi.boolean().default(false)
});

/**
 * Certificate analytics query validation schema
 * Based on backend certificate analytics patterns
 */
export const certificateAnalyticsQuerySchema = Joi.object({
  startDate: commonSchemas.date.optional(),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional(),
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
    .optional(),
  groupBy: Joi.string()
    .valid('hour', 'day', 'week', 'month')
    .default('day')
    .optional(),
  metrics: Joi.array()
    .items(Joi.string().valid(
      'total_certificates', 'minted_certificates', 'transferred_certificates',
      'failed_transfers', 'average_transfer_time', 'view_count',
      'unique_holders', 'transfer_success_rate'
    ))
    .min(1)
    .max(8)
    .optional(),
  includeTransferDetails: Joi.boolean().default(false),
  includeBatchAnalysis: Joi.boolean().default(false)
});

/**
 * Billing analytics query validation schema
 * Based on backend billing analytics patterns
 */
export const billingAnalyticsQuerySchema = Joi.object({
  startDate: commonSchemas.date.optional(),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional(),
  timeframe: Joi.string()
    .valid('30d', '90d', '1y', 'all')
    .default('30d')
    .optional(),
  groupBy: Joi.string()
    .valid('day', 'week', 'month')
    .default('month')
    .optional(),
  metrics: Joi.array()
    .items(Joi.string().valid(
      'monthly_revenue', 'yearly_revenue', 'lifetime_value',
      'usage_costs', 'plan_changes', 'churn_rate', 'growth_rate'
    ))
    .min(1)
    .max(7)
    .optional(),
  includePlanBreakdown: Joi.boolean().default(true),
  includeUsageAnalysis: Joi.boolean().default(false),
  includeRevenueProjections: Joi.boolean().default(false)
});

/**
 * Domain analytics query validation schema
 * Based on backend domain monitoring patterns
 */
export const domainAnalyticsQuerySchema = Joi.object({
  startDate: commonSchemas.date.optional(),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional(),
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d')
    .default('7d')
    .optional(),
  groupBy: Joi.string()
    .valid('hour', 'day', 'week')
    .default('day')
    .optional(),
  metrics: Joi.array()
    .items(Joi.string().valid(
      'request_count', 'response_time', 'uptime', 'error_rate',
      'unique_visitors', 'bandwidth_usage', 'ssl_health'
    ))
    .min(1)
    .max(7)
    .optional(),
  includeHealthChecks: Joi.boolean().default(true),
  includePerformanceMetrics: Joi.boolean().default(true)
});

/**
 * Export analytics data validation schema
 * For exporting analytics data in various formats
 */
export const exportAnalyticsSchema = Joi.object({
  query: baseAnalyticsQuerySchema.required(),
  format: Joi.string()
    .valid('json', 'csv', 'xlsx', 'pdf')
    .default('json')
    .messages({
      'any.only': 'Export format must be json, csv, xlsx, or pdf'
    }),
  includeCharts: Joi.boolean().default(false),
  includeRawData: Joi.boolean().default(true),
  compressOutput: Joi.boolean().default(false),
  fileName: Joi.string()
    .trim()
    .max(100)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .messages({
      'string.max': 'File name cannot exceed 100 characters',
      'string.pattern.base': 'File name can only contain letters, numbers, hyphens, and underscores'
    })
});

/**
 * Real-time analytics subscription validation schema
 * For WebSocket subscriptions to real-time analytics
 */
export const realtimeAnalyticsSchema = Joi.object({
  metrics: Joi.array()
    .items(Joi.string().valid(
      'live_votes', 'active_users', 'certificate_transfers',
      'api_requests', 'errors', 'response_times'
    ))
    .min(1)
    .max(5)
    .required()
    .messages({
      'array.min': 'At least one metric is required for real-time updates',
      'array.max': 'Cannot subscribe to more than 5 real-time metrics'
    }),
  updateInterval: Joi.number()
    .integer()
    .min(1000) // 1 second minimum
    .max(60000) // 1 minute maximum
    .default(5000) // 5 seconds default
    .messages({
      'number.min': 'Update interval must be at least 1 second',
      'number.max': 'Update interval cannot exceed 1 minute'
    }),
  bufferSize: Joi.number()
    .integer()
    .min(10)
    .max(1000)
    .default(100)
    .optional()
    .messages({
      'number.min': 'Buffer size must be at least 10',
      'number.max': 'Buffer size cannot exceed 1000'
    })
});

/**
 * Export all analytics validation schemas for easy importing
 */
export const analyticsValidationSchemas = {
  baseAnalyticsQuery: baseAnalyticsQuerySchema,
  analyticsQuery: analyticsQuerySchema,
  votesAnalytics: votesAnalyticsQuerySchema,
  certificateAnalytics: certificateAnalyticsQuerySchema,
  billingAnalytics: billingAnalyticsQuerySchema,
  domainAnalytics: domainAnalyticsQuerySchema,
  exportAnalytics: exportAnalyticsSchema,
  realtimeAnalytics: realtimeAnalyticsSchema
};