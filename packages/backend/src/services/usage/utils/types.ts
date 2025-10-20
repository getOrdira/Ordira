import type { PlanKey } from '../../../constants/plans';

export type UsageCategory = 'certificates' | 'votes' | 'apiCalls' | 'storage';

export interface UsageUpdate {
  certificates?: number;
  votes?: number;
  apiCalls?: number;
  storage?: number;
}

export interface UsageCounters {
  certificates: number;
  votes: number;
  apiCalls: number;
  storage: number;
  lastUpdated: Date;
}

export interface UsageLimitEntry {
  used: number;
  limit: number;
  percentage: number;
}

export interface UsageLimits {
  certificates: UsageLimitEntry;
  votes: UsageLimitEntry;
  apiCalls: UsageLimitEntry;
  storage: UsageLimitEntry;
}

export interface UsageTrends {
  certificates: number[];
  votes: number[];
  apiCalls: number[];
  storage: number[];
}

export interface UsageProjections {
  certificates?: string;
  votes?: string;
  apiCalls?: string;
  storage?: string;
}

export interface UsageAnalytics {
  currentUsage: UsageLimits;
  trends: UsageTrends;
  recommendations: string[];
  projectedExhaustion: UsageProjections;
}

export interface UsageCheck {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  percentage: number;
  overage?: number;
}

export interface UsageAnalyticsOptions {
  days?: number;
  includeProjections?: boolean;
  includeTrends?: boolean;
}

export interface UsageLimitsOptions {
  useCache?: boolean;
}

export interface UsagePlanCacheEntry {
  plan: PlanKey;
  cachedAt: string;
}