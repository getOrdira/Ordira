import {
  SubscriptionDataService,
  subscriptionDataService
} from './core/subscriptionData.service';
import {
  SubscriptionLifecycleService,
  subscriptionLifecycleService
} from './core/subscriptionLifecycle.service';
import {
  SubscriptionUsageLimitsService,
  subscriptionUsageLimitsService
} from './features/usageLimits.service';
import {
  SubscriptionAnalyticsService,
  subscriptionAnalyticsService
} from './features/analytics.service';
import {
  SubscriptionTierManagementService,
  subscriptionTierManagementService
} from './features/tierManagement.service';
import {
  SubscriptionPlanValidationService,
  subscriptionPlanValidationService
} from './validation/planValidation.service';
import { SubscriptionError } from './utils/errors';

export {
  SubscriptionDataService,
  subscriptionDataService,
  SubscriptionLifecycleService,
  subscriptionLifecycleService,
  SubscriptionUsageLimitsService,
  subscriptionUsageLimitsService,
  SubscriptionAnalyticsService,
  subscriptionAnalyticsService,
  SubscriptionTierManagementService,
  subscriptionTierManagementService,
  SubscriptionPlanValidationService,
  subscriptionPlanValidationService,
  SubscriptionError
};

export type {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SubscriptionSummary,
  SubscriptionUsageMetrics,
  SubscriptionFeatureFlags,
  SubscriptionBillingSummary,
  SubscriptionOverageSummary,
  UsageLimitsCheck,
  SubscriptionHealth,
  SubscriptionUsageTrends,
  SubscriptionUsageProjections,
  SubscriptionInsights,
  TierComparison,
  TierChangeAnalysis
} from './utils/types';

export const subscriptionServices = {
  data: subscriptionDataService,
  lifecycle: subscriptionLifecycleService,
  usageLimits: subscriptionUsageLimitsService,
  analytics: subscriptionAnalyticsService,
  tierManagement: subscriptionTierManagementService,
  validation: subscriptionPlanValidationService
};
