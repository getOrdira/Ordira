import { ISubscription } from '../../../models/deprecated/subscription.model';
import { PLAN_DEFINITIONS, PlanKey } from '../../../constants/plans';
import {
  MANUFACTURER_PLAN_DEFINITIONS,
  ManufacturerPlanKey as RawManufacturerPlanKey
} from '../../../constants/manufacturerPlans';

export type SubscriptionPlanType = 'brand' | 'manufacturer';

export type BrandPlanKey = PlanKey;
export type ManufacturerPlanKey = RawManufacturerPlanKey;

export type PlanIdentifier =
  | { type: 'brand'; key: BrandPlanKey }
  | { type: 'manufacturer'; key: ManufacturerPlanKey };

export type BrandPlanDefinition = (typeof PLAN_DEFINITIONS)[BrandPlanKey];
export type ManufacturerPlanDefinition =
  (typeof MANUFACTURER_PLAN_DEFINITIONS)[ManufacturerPlanKey];

export type PlanDefinition<T extends SubscriptionPlanType> = T extends 'brand'
  ? BrandPlanDefinition
  : ManufacturerPlanDefinition;

export interface CreateSubscriptionInput {
  businessId: string;
  tier: string;
  billingCycle?: 'monthly' | 'yearly';
  stripeSubscriptionId?: string;
  isTrialPeriod?: boolean;
  trialDays?: number;
  planType?: SubscriptionPlanType;
}

export interface UpdateSubscriptionInput {
  tier?: string;
  status?: 'active' | 'inactive' | 'past_due' | 'canceled' | 'paused';
  billingCycle?: 'monthly' | 'yearly';
  cancelAtPeriodEnd?: boolean;
}

export interface SubscriptionUsageMetrics {
  votes: number;
  nfts: number;
  api: number;
  storage: number;
}

export interface SubscriptionFeatureFlags {
  analytics: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  webhooks: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
  sla: boolean;
  [feature: string]: boolean;
}

export interface SubscriptionBillingSummary {
  nextBillingDate: Date;
  billingCycle: 'monthly' | 'yearly';
  nextPaymentAmount?: number;
  isTrialPeriod: boolean;
  trialEndsAt?: Date;
}

export interface SubscriptionOverageSummary {
  cost: number;
  allowed: boolean;
  pendingCharges?: number;
}

export interface SubscriptionSummary {
  id: string;
  businessId: string;
  planType: SubscriptionPlanType;
  tier: BrandPlanKey | ManufacturerPlanKey | string;
  status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'paused';
  limits: SubscriptionUsageMetrics;
  usage: SubscriptionUsageMetrics;
  usagePercentages: SubscriptionUsageMetrics;
  features: SubscriptionFeatureFlags;
  billing: SubscriptionBillingSummary;
  overage: SubscriptionOverageSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageLimitsCheck {
  allowed: boolean;
  message?: string;
  overage?: number;
  cost?: number;
  invoiceId?: string;
  chargeId?: string;
  remaining?: number;
  resetDate?: Date;
  planLimit?: number;
  currentUsage?: number;
}

export interface TierComparison {
  current: string;
  canUpgrade: boolean;
  canDowngrade: boolean;
  nextTier?: string | null;
  previousTier?: string | null;
  upgradeOptions: string[];
  downgradeOptions: string[];
}

export interface TierChangeAnalysis {
  tierChange: boolean;
  billingChange: boolean;
  statusChange: boolean;
  immediate: string[];
  billing: string[];
  additionalSteps: string[];
}

export interface SubscriptionHealth {
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  factors: string[];
}

export interface SubscriptionUsageTrends {
  votes: number;
  nfts: number;
  api: number;
  storage: number;
}

export interface SubscriptionUsageProjections extends SubscriptionUsageMetrics {}

export interface SubscriptionInsights {
  health: SubscriptionHealth;
  risks: string[];
  optimization: string[];
  immediateActions: string[];
  plannedActions: string[];
  tierComparison: TierComparison;
}

export type SubscriptionDocument = ISubscription;
