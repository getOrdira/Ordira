/**
 * Usage Types
 * 
 * Re-exports backend usage types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  UsageCategory,
  UsageUpdate,
  UsageCounters,
  UsageLimitEntry,
  UsageLimits,
  UsageTrends,
  UsageProjections,
  UsageAnalytics,
  UsageCheck,
  UsageAnalyticsOptions,
  UsageLimitsOptions,
  UsagePlanCacheEntry
} from '@backend/services/usage/utils/types';

// Re-export all backend types
export type {
  UsageCategory,
  UsageUpdate,
  UsageCounters,
  UsageLimitEntry,
  UsageLimits,
  UsageTrends,
  UsageProjections,
  UsageAnalytics,
  UsageCheck,
  UsageAnalyticsOptions,
  UsageLimitsOptions,
  UsagePlanCacheEntry
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Usage display type with enhanced UI fields
 */
export interface UsageDisplay extends UsageLimits {
  _ui?: {
    formattedUsage?: Record<UsageCategory, string>;
    formattedLimits?: Record<UsageCategory, string>;
    formattedRemaining?: Record<UsageCategory, string>;
    statusBadges?: Record<UsageCategory, 'ok' | 'warning' | 'critical'>;
    progressBars?: Record<UsageCategory, number>; // 0-100
    nextResetDate?: string;
    formattedResetDate?: string;
  };
}

/**
 * Usage analytics display with enhanced UI fields
 */
export interface UsageAnalyticsDisplay extends UsageAnalytics {
  _ui?: {
    trendsChart?: {
      labels: string[];
      datasets: Array<{
        label: string;
        data: number[];
        color?: string;
      }>;
    };
    projectionsFormatted?: Record<UsageCategory, string>;
    recommendationsPriority?: Array<{
      priority: 'high' | 'medium' | 'low';
      recommendation: string;
    }>;
  };
}

