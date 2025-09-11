// src/lib/types/subscriptions.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Subscription tier types
 * Based on backend ISubscription model tier field
 */
export type SubscriptionTier = 'foundation' | 'growth' | 'premium' | 'enterprise';

/**
 * Subscription status types
 * Based on backend ISubscription model status field
 */
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled' | 'paused';

/**
 * Billing cycle types
 * Based on backend ISubscription model billingCycle field
 */
export type BillingCycle = 'monthly' | 'yearly';

/**
 * Feature flags interface
 * Based on backend ISubscription model features field
 */
export interface SubscriptionFeatures {
  analytics: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  advancedIntegrations: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
  advancedAnalytics: boolean;
  customCertificates: boolean;
  bulkOperations: boolean;
  webhookAccess: boolean;
  sso: boolean;
  auditLogs: boolean;
  customFields: boolean;
  advancedSecurity: boolean;
  dedicatedSupport: boolean;
}

/**
 * Usage limits interface
 * Based on backend ISubscription model usage limits
 */
export interface UsageLimits {
  voteLimit: number;
  nftLimit: number;
  apiLimit: number;
  storageLimit: number; // in GB
}

/**
 * Current usage interface
 * Based on backend ISubscription model current usage
 */
export interface CurrentUsage {
  currentVoteUsage: number;
  currentNftUsage: number;
  currentApiUsage: number;
  currentStorageUsage: number; // in bytes
}

/**
 * Overage settings interface
 * Based on backend ISubscription model overage settings
 */
export interface OverageSettings {
  surchargePerVote: number;
  surchargePerNft: number;
  surchargePerApiCall: number;
  surchargePerGBStorage: number;
  allowOverage: boolean;
}

/**
 * Subscription interface
 * Based on backend ISubscription model
 */
export interface Subscription {
  _id: string;
  business: string; // Business ID reference
  tier: SubscriptionTier;
  
  // Usage limits based on tier
  voteLimit: number;
  nftLimit: number;
  apiLimit: number;
  storageLimit: number; // in GB
  
  // Overage settings
  surchargePerVote: number;
  surchargePerNft: number;
  surchargePerApiCall: number;
  surchargePerGBStorage: number;
  allowOverage: boolean;
  
  // Current usage tracking (resets monthly)
  currentVoteUsage: number;
  currentNftUsage: number;
  currentApiUsage: number;
  currentStorageUsage: number; // in bytes
  
  // Billing cycle management
  lastResetDate: Date;
  nextBillingDate: Date;
  billingCycle: BillingCycle;
  
  // Subscription state
  status: SubscriptionStatus;
  isTrialPeriod: boolean;
  trialEndsAt?: Date;
  cancelAtPeriodEnd: boolean;
  pausedAt?: Date;
  
  // Payment and billing
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  lastPaymentDate?: Date;
  nextPaymentAmount?: number;
  
  // Feature flags per tier
  features: SubscriptionFeatures;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription creation request
 * For creating new subscriptions
 */
export interface CreateSubscriptionRequest {
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  isTrialPeriod?: boolean;
  trialEndsAt?: Date;
  customLimits?: Partial<UsageLimits>;
  customOverage?: Partial<OverageSettings>;
}

/**
 * Subscription update request
 * For updating existing subscriptions
 */
export interface UpdateSubscriptionRequest {
  tier?: SubscriptionTier;
  billingCycle?: BillingCycle;
  customLimits?: Partial<UsageLimits>;
  customOverage?: Partial<OverageSettings>;
  pauseSubscription?: boolean;
  resumeSubscription?: boolean;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Subscription list response
 * For paginated subscription lists
 */
export interface SubscriptionListResponse extends PaginatedResponse<Subscription> {
  subscriptions: Subscription[];
  analytics: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    trialSubscriptions: number;
    canceledSubscriptions: number;
    totalRevenue: number;
    averageUsage: {
      votes: number;
      nfts: number;
      apiCalls: number;
      storage: number;
    };
  };
}

/**
 * Subscription detail response
 * For detailed subscription information
 */
export interface SubscriptionDetailResponse {
  subscription: Subscription;
  business: {
    _id: string;
    businessName: string;
    logoUrl?: string;
  };
  usage: {
    current: CurrentUsage;
    limits: UsageLimits;
    overage: OverageSettings;
    usagePercentage: {
      votes: number;
      nfts: number;
      apiCalls: number;
      storage: number;
    };
  };
  billing: {
    nextBillingDate: Date;
    nextPaymentAmount: number;
    lastPaymentDate?: Date;
    billingCycle: BillingCycle;
    stripeSubscriptionId?: string;
  };
  features: SubscriptionFeatures;
  history: Array<{
    action: string;
    timestamp: Date;
    details: string;
  }>;
}

/**
 * Subscription analytics response
 * For subscription analytics and reporting
 */
export interface SubscriptionAnalyticsResponse {
  overview: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    trialSubscriptions: number;
    canceledSubscriptions: number;
    totalRevenue: number;
    averageRevenuePerUser: number;
    churnRate: number;
    retentionRate: number;
  };
  tierDistribution: Array<{
    tier: SubscriptionTier;
    count: number;
    percentage: number;
    revenue: number;
  }>;
  statusDistribution: Array<{
    status: SubscriptionStatus;
    count: number;
    percentage: number;
  }>;
  usageAnalytics: {
    averageUsage: {
      votes: number;
      nfts: number;
      apiCalls: number;
      storage: number;
    };
    overageUsage: {
      votes: number;
      nfts: number;
      apiCalls: number;
      storage: number;
    };
    topUsers: Array<{
      business: string;
      usage: CurrentUsage;
      tier: SubscriptionTier;
    }>;
  };
  monthlyStats: Array<{
    month: string;
    newSubscriptions: number;
    canceledSubscriptions: number;
    revenue: number;
    usage: {
      votes: number;
      nfts: number;
      apiCalls: number;
      storage: number;
    };
  }>;
}

/**
 * Subscription upgrade request
 * For upgrading subscription tiers
 */
export interface SubscriptionUpgradeRequest {
  newTier: SubscriptionTier;
  immediate?: boolean;
  proration?: boolean;
  reason?: string;
}

/**
 * Subscription downgrade request
 * For downgrading subscription tiers
 */
export interface SubscriptionDowngradeRequest {
  newTier: SubscriptionTier;
  effectiveDate?: Date;
  reason?: string;
}

/**
 * Subscription pause request
 * For pausing subscriptions
 */
export interface SubscriptionPauseRequest {
  reason?: string;
  pauseUntil?: Date;
  notifyCustomer?: boolean;
}

/**
 * Subscription resume request
 * For resuming paused subscriptions
 */
export interface SubscriptionResumeRequest {
  reason?: string;
  notifyCustomer?: boolean;
}

/**
 * Subscription cancellation request
 * For canceling subscriptions
 */
export interface SubscriptionCancellationRequest {
  reason?: string;
  feedback?: string;
  immediate?: boolean;
  notifyCustomer?: boolean;
}

/**
 * Subscription settings interface
 * For subscription management settings
 */
export interface SubscriptionSettings {
  tiers: {
    [key in SubscriptionTier]: {
      name: string;
      description: string;
      price: {
        monthly: number;
        yearly: number;
      };
      limits: UsageLimits;
      overage: OverageSettings;
      features: SubscriptionFeatures;
    };
  };
  billing: {
    currency: string;
    taxRate: number;
    prorationEnabled: boolean;
    trialPeriodDays: number;
  };
  notifications: {
    usageAlerts: boolean;
    billingReminders: boolean;
    tierChanges: boolean;
    cancellations: boolean;
    emailNotifications: boolean;
    inAppNotifications: boolean;
  };
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Subscription tier validation schema
 */
export const subscriptionTierSchema = Joi.string()
  .valid('foundation', 'growth', 'premium', 'enterprise')
  .required()
  .messages({
    'any.only': 'Tier must be one of: foundation, growth, premium, enterprise'
  });

/**
 * Subscription status validation schema
 */
export const subscriptionStatusSchema = Joi.string()
  .valid('active', 'inactive', 'past_due', 'canceled', 'paused')
  .required()
  .messages({
    'any.only': 'Status must be one of: active, inactive, past_due, canceled, paused'
  });

/**
 * Billing cycle validation schema
 */
export const billingCycleSchema = Joi.string()
  .valid('monthly', 'yearly')
  .required()
  .messages({
    'any.only': 'Billing cycle must be one of: monthly, yearly'
  });

/**
 * Usage limits validation schema
 */
export const usageLimitsSchema = Joi.object({
  voteLimit: Joi.number().min(0).required(),
  nftLimit: Joi.number().min(0).required(),
  apiLimit: Joi.number().min(0).required(),
  storageLimit: Joi.number().min(0).required()
});

/**
 * Current usage validation schema
 */
export const currentUsageSchema = Joi.object({
  currentVoteUsage: Joi.number().min(0).default(0),
  currentNftUsage: Joi.number().min(0).default(0),
  currentApiUsage: Joi.number().min(0).default(0),
  currentStorageUsage: Joi.number().min(0).default(0)
});

/**
 * Overage settings validation schema
 */
export const overageSettingsSchema = Joi.object({
  surchargePerVote: Joi.number().min(0).required(),
  surchargePerNft: Joi.number().min(0).required(),
  surchargePerApiCall: Joi.number().min(0).required(),
  surchargePerGBStorage: Joi.number().min(0).required(),
  allowOverage: Joi.boolean().default(true)
});

/**
 * Subscription features validation schema
 */
export const subscriptionFeaturesSchema = Joi.object({
  analytics: Joi.boolean().default(false),
  apiAccess: Joi.boolean().default(false),
  customBranding: Joi.boolean().default(false),
  prioritySupport: Joi.boolean().default(false),
  advancedIntegrations: Joi.boolean().default(false),
  customDomain: Joi.boolean().default(false),
  whiteLabel: Joi.boolean().default(false),
  advancedAnalytics: Joi.boolean().default(false),
  customCertificates: Joi.boolean().default(false),
  bulkOperations: Joi.boolean().default(false),
  webhookAccess: Joi.boolean().default(false),
  sso: Joi.boolean().default(false),
  auditLogs: Joi.boolean().default(false),
  customFields: Joi.boolean().default(false),
  advancedSecurity: Joi.boolean().default(false),
  dedicatedSupport: Joi.boolean().default(false)
});

/**
 * Create subscription request validation schema
 */
export const createSubscriptionRequestSchema = Joi.object({
  tier: subscriptionTierSchema.required(),
  billingCycle: billingCycleSchema.required(),
  isTrialPeriod: Joi.boolean().default(false),
  trialEndsAt: Joi.date().min('now').optional(),
  customLimits: usageLimitsSchema.optional(),
  customOverage: overageSettingsSchema.optional()
});

/**
 * Update subscription request validation schema
 */
export const updateSubscriptionRequestSchema = Joi.object({
  tier: subscriptionTierSchema.optional(),
  billingCycle: billingCycleSchema.optional(),
  customLimits: usageLimitsSchema.optional(),
  customOverage: overageSettingsSchema.optional(),
  pauseSubscription: Joi.boolean().optional(),
  resumeSubscription: Joi.boolean().optional(),
  cancelAtPeriodEnd: Joi.boolean().optional()
});

/**
 * Subscription query validation schema
 */
export const subscriptionQuerySchema = Joi.object({
  business: commonSchemas.mongoId.optional(),
  tier: subscriptionTierSchema.optional(),
  status: subscriptionStatusSchema.optional(),
  billingCycle: billingCycleSchema.optional(),
  isTrialPeriod: Joi.boolean().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'tier', 'status', 'nextBillingDate').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Subscription upgrade request validation schema
 */
export const subscriptionUpgradeRequestSchema = Joi.object({
  newTier: subscriptionTierSchema.required(),
  immediate: Joi.boolean().default(false),
  proration: Joi.boolean().default(true),
  reason: Joi.string().max(500).optional()
});

/**
 * Subscription downgrade request validation schema
 */
export const subscriptionDowngradeRequestSchema = Joi.object({
  newTier: subscriptionTierSchema.required(),
  effectiveDate: Joi.date().min('now').optional(),
  reason: Joi.string().max(500).optional()
});

/**
 * Subscription pause request validation schema
 */
export const subscriptionPauseRequestSchema = Joi.object({
  reason: Joi.string().max(500).optional(),
  pauseUntil: Joi.date().min('now').optional(),
  notifyCustomer: Joi.boolean().default(true)
});

/**
 * Subscription resume request validation schema
 */
export const subscriptionResumeRequestSchema = Joi.object({
  reason: Joi.string().max(500).optional(),
  notifyCustomer: Joi.boolean().default(true)
});

/**
 * Subscription cancellation request validation schema
 */
export const subscriptionCancellationRequestSchema = Joi.object({
  reason: Joi.string().max(500).optional(),
  feedback: Joi.string().max(1000).optional(),
  immediate: Joi.boolean().default(false),
  notifyCustomer: Joi.boolean().default(true)
});

/**
 * Export all subscription validation schemas
 */
export const subscriptionValidationSchemas = {
  subscriptionTier: subscriptionTierSchema,
  subscriptionStatus: subscriptionStatusSchema,
  billingCycle: billingCycleSchema,
  usageLimits: usageLimitsSchema,
  currentUsage: currentUsageSchema,
  overageSettings: overageSettingsSchema,
  subscriptionFeatures: subscriptionFeaturesSchema,
  createSubscriptionRequest: createSubscriptionRequestSchema,
  updateSubscriptionRequest: updateSubscriptionRequestSchema,
  subscriptionQuery: subscriptionQuerySchema,
  subscriptionUpgradeRequest: subscriptionUpgradeRequestSchema,
  subscriptionDowngradeRequest: subscriptionDowngradeRequestSchema,
  subscriptionPauseRequest: subscriptionPauseRequestSchema,
  subscriptionResumeRequest: subscriptionResumeRequestSchema,
  subscriptionCancellationRequest: subscriptionCancellationRequestSchema
};
