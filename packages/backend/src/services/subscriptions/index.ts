import {
  BillingDataService,
  billingDataService
} from './core/billingData.service';
import {
  SubscriptionDataService,
  subscriptionDataService
} from './core/subscriptionData.service';
import {
  SubscriptionLifecycleService,
  subscriptionLifecycleService
} from './core/subscriptionLifecycle.service';
import {
  StripeGatewayService,
  stripeGatewayService
} from './core/stripeGateway.service';
import {
  TokenBalanceService,
  tokenBalanceService
} from './core/tokenBalance.service';
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
  BillingManagementService,
  billingManagementService
} from './features/billingManagement.service';
import {
  TokenDiscountService,
  tokenDiscountService
} from './features/tokenDiscount.service';
import {
  SubscriptionPlanValidationService,
  subscriptionPlanValidationService
} from './validation/planValidation.service';
import { SubscriptionError } from './utils/errors';
import { BillingPlanUtils, billingPlanUtils } from './utils/billingPlan.utils';
import {
  BillingValidationService,
  billingValidationService
} from './validation/billingValidation.service';

export {
  BillingDataService,
  billingDataService,
  SubscriptionDataService,
  subscriptionDataService,
  SubscriptionLifecycleService,
  subscriptionLifecycleService,
  StripeGatewayService,
  stripeGatewayService,
  TokenBalanceService,
  tokenBalanceService,
  SubscriptionUsageLimitsService,
  subscriptionUsageLimitsService,
  SubscriptionAnalyticsService,
  subscriptionAnalyticsService,
  SubscriptionTierManagementService,
  subscriptionTierManagementService,
  BillingManagementService,
  billingManagementService,
  TokenDiscountService,
  tokenDiscountService,
  SubscriptionPlanValidationService,
  subscriptionPlanValidationService,
  SubscriptionError,
  BillingPlanUtils,
  billingPlanUtils,
  BillingValidationService,
  billingValidationService
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
export type {
  TokenDiscount,
  DiscountEligibility,
  StripeDiscountApplication
} from './features/tokenDiscount.service';

export const subscriptionServices = {
  data: subscriptionDataService,
  lifecycle: subscriptionLifecycleService,
  stripeGateway: stripeGatewayService,
  tokenBalance: tokenBalanceService,
  usageLimits: subscriptionUsageLimitsService,
  analytics: subscriptionAnalyticsService,
  tierManagement: subscriptionTierManagementService,
  validation: subscriptionPlanValidationService,
  billing: billingManagementService,
  tokenDiscounts: tokenDiscountService
};
