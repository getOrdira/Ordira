/**
 * Subscription Types
 * 
 * Re-exports backend subscription types as the single source of truth,
 * with frontend-specific extensions when needed.
 */

// ===== RE-EXPORT BACKEND TYPES =====
// Import types for use in extends clauses
import type {
  SubscriptionPlanType,
  BrandPlanKey,
  ManufacturerPlanKey,
  PlanIdentifier,
  BrandPlanDefinition,
  ManufacturerPlanDefinition,
  PlanDefinition,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SubscriptionUsageMetrics,
  SubscriptionFeatureFlags,
  SubscriptionBillingSummary,
  SubscriptionOverageSummary,
  SubscriptionSummary,
  UsageLimitsCheck,
  TierComparison,
  TierChangeAnalysis,
  SubscriptionHealth,
  SubscriptionUsageTrends,
  SubscriptionUsageProjections,
  SubscriptionInsights,
  SubscriptionDocument
} from '@backend/services/subscriptions/utils/types';

// Re-export all backend types
export type {
  SubscriptionPlanType,
  BrandPlanKey,
  ManufacturerPlanKey,
  PlanIdentifier,
  BrandPlanDefinition,
  ManufacturerPlanDefinition,
  PlanDefinition,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SubscriptionUsageMetrics,
  SubscriptionFeatureFlags,
  SubscriptionBillingSummary,
  SubscriptionOverageSummary,
  SubscriptionSummary,
  UsageLimitsCheck,
  TierComparison,
  TierChangeAnalysis,
  SubscriptionHealth,
  SubscriptionUsageTrends,
  SubscriptionUsageProjections,
  SubscriptionInsights,
  SubscriptionDocument
};

// ===== FRONTEND-SPECIFIC EXTENSIONS =====
// Types that extend backend types with frontend-specific fields

/**
 * Subscription plan display type with enhanced UI fields
 */
export interface SubscriptionPlanDisplay {
  key: BrandPlanKey | ManufacturerPlanKey;
  type: SubscriptionPlanType;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: SubscriptionFeatureFlags;
  limits: SubscriptionUsageMetrics;
  _ui?: {
    isPopular?: boolean;
    isRecommended?: boolean;
    isCurrent?: boolean;
    savings?: string; // e.g., "Save 20%"
    badge?: 'new' | 'popular' | 'recommended';
    highlightColor?: string;
  };
}

/**
 * Subscription usage display with enhanced UI fields
 */
export interface SubscriptionUsageDisplay extends SubscriptionUsageMetrics {
  _ui?: {
    percentages: SubscriptionUsageMetrics;
    statusBadges: Record<keyof SubscriptionUsageMetrics, 'ok' | 'warning' | 'critical'>;
    progressBars: Record<keyof SubscriptionUsageMetrics, number>; // 0-100
    nextResetDate?: string;
    formattedResetDate?: string;
  };
}

/**
 * Subscription billing display with enhanced UI fields
 */
export interface SubscriptionBillingDisplay extends SubscriptionBillingSummary {
  _ui?: {
    formattedNextBillingDate?: string;
    formattedNextPaymentAmount?: string;
    formattedTrialEndsAt?: string;
    daysUntilBilling?: number;
    daysUntilTrialEnd?: number;
    isTrialActive?: boolean;
    statusBadge?: 'active' | 'trial' | 'expiring' | 'past_due';
  };
}

/**
 * Subscription upgrade/downgrade options
 */
export interface SubscriptionChangeOptions {
  currentTier: string;
  availableTiers: SubscriptionPlanDisplay[];
  canUpgrade: boolean;
  canDowngrade: boolean;
  upgradeOptions: SubscriptionPlanDisplay[];
  downgradeOptions: SubscriptionPlanDisplay[];
  _ui?: {
    recommendedUpgrade?: BrandPlanKey | ManufacturerPlanKey;
    changeImpact?: {
      immediate: string[];
      billing: string[];
      additionalSteps: string[];
    };
  };
}

/**
 * Subscription management form data
 */
export interface SubscriptionManagementFormData {
  action: 'upgrade' | 'downgrade' | 'cancel' | 'resume' | 'update_billing';
  targetTier?: BrandPlanKey | ManufacturerPlanKey;
  billingCycle?: 'monthly' | 'yearly';
  cancelAtPeriodEnd?: boolean;
  _ui?: {
    validationErrors?: Record<string, string>;
    confirmationRequired?: boolean;
    estimatedChanges?: TierChangeAnalysis;
  };
}

