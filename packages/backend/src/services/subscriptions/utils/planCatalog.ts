import { PLAN_DEFINITIONS, PlanKey } from '../../../constants/plans';
import {
  MANUFACTURER_PLAN_DEFINITIONS,
  ManufacturerPlanKey
} from '../../../constants/manufacturerPlans';
import {
  BrandPlanDefinition,
  BrandPlanKey,
  ManufacturerPlanDefinition,
  SubscriptionFeatureFlags,
  SubscriptionPlanType,
  SubscriptionUsageMetrics
} from './types';

const planCatalog = {
  brand: PLAN_DEFINITIONS,
  manufacturer: MANUFACTURER_PLAN_DEFINITIONS
} as const;

const normalizeLimit = (value: number): number => {
  if (Number.isFinite(value)) {
    return value;
  }
  return -1;
};

const normalizeStorage = (value: number): number => {
  if (!Number.isFinite(value)) {
    return -1;
  }
  // Plan storage values are stored in MB; convert to GB while keeping at least 1 GB for small tiers.
  return Math.max(1, Math.round(value / 1024));
};

export const BRAND_PLAN_ORDER: BrandPlanKey[] = [
  'foundation',
  'growth',
  'premium',
  'enterprise'
];

export const MANUFACTURER_PLAN_ORDER: ManufacturerPlanKey[] = [
  'starter',
  'professional',
  'enterprise',
  'unlimited'
];

const BRAND_FEATURE_MATRIX: Record<BrandPlanKey, SubscriptionFeatureFlags> = {
  foundation: {
    analytics: true,
    apiAccess: true,
    customBranding: false,
    prioritySupport: false,
    webhooks: false,
    customDomain: false,
    whiteLabel: false,
    sla: false
  },
  growth: {
    analytics: true,
    apiAccess: true,
    customBranding: true,
    prioritySupport: true,
    webhooks: true,
    customDomain: false,
    whiteLabel: false,
    sla: false
  },
  premium: {
    analytics: true,
    apiAccess: true,
    customBranding: true,
    prioritySupport: true,
    webhooks: true,
    customDomain: true,
    whiteLabel: false,
    sla: false
  },
  enterprise: {
    analytics: true,
    apiAccess: true,
    customBranding: true,
    prioritySupport: true,
    webhooks: true,
    customDomain: true,
    whiteLabel: true,
    sla: true
  }
};

export const listBrandPlans = (): BrandPlanKey[] => Object.keys(PLAN_DEFINITIONS) as BrandPlanKey[];

export const listManufacturerPlans = (): ManufacturerPlanKey[] =>
  Object.keys(MANUFACTURER_PLAN_DEFINITIONS) as ManufacturerPlanKey[];

export const isBrandPlan = (tier: string): tier is BrandPlanKey =>
  (Object.keys(PLAN_DEFINITIONS) as string[]).includes(tier);

export const isManufacturerPlan = (tier: string): tier is ManufacturerPlanKey =>
  (Object.keys(MANUFACTURER_PLAN_DEFINITIONS) as string[]).includes(tier);

export const getBrandPlanDefinition = (tier: BrandPlanKey): BrandPlanDefinition => {
  return PLAN_DEFINITIONS[tier];
};

export const getManufacturerPlanDefinition = (
  tier: ManufacturerPlanKey
): ManufacturerPlanDefinition => {
  return MANUFACTURER_PLAN_DEFINITIONS[tier];
};

export const getBrandUsageLimits = (tier: BrandPlanKey): SubscriptionUsageMetrics => {
  const plan = PLAN_DEFINITIONS[tier];
  return {
    votes: normalizeLimit(plan.votes),
    nfts: normalizeLimit(plan.certificates),
    api: normalizeLimit(plan.apiCalls),
    storage: normalizeStorage(plan.storage)
  };
};

export const getBrandFeatureFlags = (tier: BrandPlanKey): SubscriptionFeatureFlags => {
  return BRAND_FEATURE_MATRIX[tier];
};

export const getBrandAllowOverage = (tier: BrandPlanKey): boolean => {
  return Boolean(PLAN_DEFINITIONS[tier].features.allowOverage);
};

export const getBrandPlanPriceId = (tier: BrandPlanKey): string | undefined => {
  return PLAN_DEFINITIONS[tier].stripePriceId;
};

/**
 * Get manufacturer plan usage limits (mapped to subscription model fields).
 * Manufacturer plans use different metrics, so we map them appropriately.
 */
export const getManufacturerUsageLimits = (tier: ManufacturerPlanKey): SubscriptionUsageMetrics => {
  const plan = MANUFACTURER_PLAN_DEFINITIONS[tier];
  // Map manufacturer-specific limits to subscription model fields
  // This allows the subscription model to work with manufacturer plans
  return {
    votes: normalizeLimit(plan.brandConnections), // Map brandConnections to votes field
    nfts: normalizeLimit(plan.supplyChainProducts), // Map supplyChainProducts to nfts field
    api: normalizeLimit(plan.supplyChainEndpoints), // Map supplyChainEndpoints to api field
    storage: normalizeStorage(plan.storage) // Use explicit storage field
  };
};

/**
 * Feature mapping configuration for manufacturer plans.
 * This provides a clear, maintainable mapping of features for each tier.
 */
const MANUFACTURER_FEATURE_MAPPING: Record<ManufacturerPlanKey, SubscriptionFeatureFlags> = {
  starter: {
    analytics: true,
    apiAccess: true,
    customBranding: false,
    prioritySupport: false,
    webhooks: false,
    customDomain: false,
    whiteLabel: false,
    sla: false
  },
  professional: {
    analytics: true,
    apiAccess: true,
    customBranding: true,
    prioritySupport: true,
    webhooks: true,
    customDomain: false,
    whiteLabel: false,
    sla: false
  },
  enterprise: {
    analytics: true,
    apiAccess: true,
    customBranding: true,
    prioritySupport: true,
    webhooks: true,
    customDomain: true,
    whiteLabel: true,
    sla: true
  },
  unlimited: {
    analytics: true,
    apiAccess: true,
    customBranding: true,
    prioritySupport: true,
    webhooks: true,
    customDomain: true,
    whiteLabel: true,
    sla: true
  }
};

/**
 * Get manufacturer plan feature flags.
 */
export const getManufacturerFeatureFlags = (tier: ManufacturerPlanKey): SubscriptionFeatureFlags => {
  return MANUFACTURER_FEATURE_MAPPING[tier];
};

/**
 * Get manufacturer plan overage allowance.
 */
export const getManufacturerAllowOverage = (tier: ManufacturerPlanKey): boolean => {
  return Boolean(MANUFACTURER_PLAN_DEFINITIONS[tier].features.allowOverage);
};

/**
 * Get manufacturer plan Stripe price ID.
 */
export const getManufacturerPlanPriceId = (tier: ManufacturerPlanKey): string | undefined => {
  return MANUFACTURER_PLAN_DEFINITIONS[tier].stripePriceId;
};

export const getPlanKeys = <T extends SubscriptionPlanType>(
  type: T
): (T extends 'brand' ? BrandPlanKey : ManufacturerPlanKey)[] => {
  return (Object.keys(planCatalog[type]) as Array<PlanKey | ManufacturerPlanKey>) as any;
};
