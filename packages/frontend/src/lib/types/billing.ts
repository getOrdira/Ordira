// src/lib/types/billing.ts

import Joi from 'joi';
import { commonSchemas } from '../validation/utils';
import { ApiResponse, PaginatedResponse, TimeRange } from './common';

/**
 * Billing plan types
 * Based on backend IBilling model plan field
 */
export type BillingPlan = 'foundation' | 'growth' | 'premium' | 'enterprise';

/**
 * Billing status types
 * Based on backend IBilling model status field
 */
export type BillingStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete' | 'paused';

/**
 * Subscription status types
 * Based on backend IBilling model subscriptionStatus field
 */
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete';

/**
 * Payment method interface
 * Based on backend IBilling model paymentMethod field
 */
export interface PaymentMethod {
  type: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

/**
 * Token discount interface
 * Based on backend IBilling model tokenDiscounts field
 */
export interface TokenDiscount {
  tokenType: string;
  discountPercentage: number;
  minimumTokens: number;
  maximumDiscount: number;
  isActive: boolean;
  appliedAt?: Date;
  expiresAt?: Date;
}

/**
 * Billing interface
 * Based on backend IBilling model
 */
export interface Billing {
  _id: string;
  business: string; // Business ID reference
  
  // Stripe integration
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionItemId?: string;
  stripePaymentMethodId?: string;
  
  // Plan and subscription details
  plan: BillingPlan;
  status: BillingStatus;
  subscriptionStatus?: SubscriptionStatus;
  
  // Billing period information
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  
  // Payment information
  billingEmail?: string;
  paymentMethod?: PaymentMethod;
  
  // Invoice and payment tracking
  nextInvoiceDate?: Date;
  nextInvoiceAmount?: number;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  totalRevenue?: number;
  
  // Token discounts and Web3 integration
  tokenDiscounts?: TokenDiscount[];
  activeDiscountApplied?: boolean;
  tokenDiscountsUpdatedAt?: Date;
  discountAppliedAt?: Date;
  discountRemovedAt?: Date;
  discountApplicationError?: string;
  discountRemovalReason?: string;
  
  // Usage tracking
  usageMetrics?: {
    certificatesGenerated: number;
    votesProcessed: number;
    apiCalls: number;
    storageUsed: number; // in bytes
    bandwidthUsed: number; // in bytes
  };
  
  // Plan limits
  planLimits?: {
    maxCertificates: number;
    maxVotes: number;
    maxApiCalls: number;
    maxStorage: number; // in bytes
    maxBandwidth: number; // in bytes
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Billing analytics interface
 * For dashboard analytics and reporting
 */
export interface BillingAnalytics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  revenueGrowth: number;
  churnRate: number;
  retentionRate: number;
  monthlyStats: Array<{
    month: string;
    revenue: number;
    customers: number;
    churned: number;
    retained: number;
  }>;
  planDistribution: Array<{
    plan: BillingPlan;
    count: number;
    percentage: number;
  }>;
  paymentMethodDistribution: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * Checkout session response
 * For Stripe checkout session creation
 */
export interface CheckoutSessionResponse {
  sessionId: string;
  sessionUrl: string;
  planDetails: {
    selectedPlan: BillingPlan;
    planFeatures: string[];
    isUpgrade: boolean;
    isDowngrade: boolean;
    upgradeFrom?: BillingPlan;
  };
  pricing: {
    subtotal: number;
    discount?: number;
    total: number;
    currency: string;
  };
  discounts: {
    tokenDiscount?: string;
    couponCode?: string;
  };
  nextSteps: string[];
}

/**
 * Plan change response
 * For plan upgrade/downgrade operations
 */
export interface PlanChangeResponse {
  success: boolean;
  planChange: {
    from: BillingPlan;
    to: BillingPlan;
    effective: string;
  };
  billing: {
    nextChargeAmount: number;
    nextChargeDate: string;
    prorationCredit?: number;
  };
  features: {
    unlocked: string[];
    removed: string[];
  };
}

/**
 * Cancellation response
 * For subscription cancellation
 */
export interface CancellationResponse {
  success: boolean;
  cancellation: {
    effectiveDate: string;
    reason?: string;
    feedback?: string;
  };
  access: {
    retainsAccessUntil: string;
    featuresAvailable: string[];
  };
}

/**
 * Usage response
 * For usage tracking and limits
 */
export interface UsageResponse {
  current: {
    certificatesGenerated: number;
    votesProcessed: number;
    apiCalls: number;
    storageUsed: number;
    bandwidthUsed: number;
  };
  limits: {
    maxCertificates: number;
    maxVotes: number;
    maxApiCalls: number;
    maxStorage: number;
    maxBandwidth: number;
  };
  usage: {
    certificatesPercentage: number;
    votesPercentage: number;
    apiCallsPercentage: number;
    storagePercentage: number;
    bandwidthPercentage: number;
  };
  resetDate: string;
}

/**
 * Invoice details
 * For invoice management
 */
export interface InvoiceDetails {
  id: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount: number;
  currency: string;
  created: Date;
  dueDate?: Date;
  paidAt?: Date;
  description?: string;
  lineItems: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  downloadUrl?: string;
}

/**
 * Payment method response
 * For payment method management
 */
export interface PaymentMethodResponse {
  id: string;
  type: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  created: Date;
}

/**
 * Discount information
 * For discount management
 */
export interface DiscountInfo {
  id: string;
  type: 'coupon' | 'token' | 'promotional';
  code?: string;
  name: string;
  description?: string;
  value: number;
  valueType: 'percentage' | 'fixed';
  currency?: string;
  validFrom: Date;
  validUntil?: Date;
  isActive: boolean;
  usageCount: number;
  maxUses?: number;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Bulk operation response
 * For bulk billing operations
 */
export interface BulkOperationResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
  results: Array<{
    id: string;
    status: 'success' | 'failed';
    message?: string;
  }>;
}

// ===== JOI VALIDATION SCHEMAS =====

/**
 * Billing plan validation schema
 */
export const billingPlanSchema = Joi.string()
  .valid('foundation', 'growth', 'premium', 'enterprise')
  .required()
  .messages({
    'any.only': 'Plan must be one of: foundation, growth, premium, enterprise'
  });

/**
 * Billing status validation schema
 */
export const billingStatusSchema = Joi.string()
  .valid('active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'paused')
  .required()
  .messages({
    'any.only': 'Status must be one of: active, canceled, past_due, unpaid, trialing, incomplete, paused'
  });

/**
 * Payment method validation schema
 */
export const paymentMethodSchema = Joi.object({
  type: Joi.string().required(),
  last4: Joi.string().length(4).optional(),
  brand: Joi.string().optional(),
  expiryMonth: Joi.number().min(1).max(12).optional(),
  expiryYear: Joi.number().min(new Date().getFullYear()).optional()
});

/**
 * Token discount validation schema
 */
export const tokenDiscountSchema = Joi.object({
  tokenType: Joi.string().required(),
  discountPercentage: Joi.number().min(0).max(100).required(),
  minimumTokens: Joi.number().min(0).required(),
  maximumDiscount: Joi.number().min(0).required(),
  isActive: Joi.boolean().default(true),
  appliedAt: Joi.date().optional(),
  expiresAt: Joi.date().optional()
});

/**
 * Usage metrics validation schema
 */
export const usageMetricsSchema = Joi.object({
  certificatesGenerated: Joi.number().min(0).default(0),
  votesProcessed: Joi.number().min(0).default(0),
  apiCalls: Joi.number().min(0).default(0),
  storageUsed: Joi.number().min(0).default(0),
  bandwidthUsed: Joi.number().min(0).default(0)
});

/**
 * Plan limits validation schema
 */
export const planLimitsSchema = Joi.object({
  maxCertificates: Joi.number().min(0).required(),
  maxVotes: Joi.number().min(0).required(),
  maxApiCalls: Joi.number().min(0).required(),
  maxStorage: Joi.number().min(0).required(),
  maxBandwidth: Joi.number().min(0).required()
});

/**
 * Billing update validation schema
 */
export const billingUpdateSchema = Joi.object({
  plan: billingPlanSchema.optional(),
  billingEmail: commonSchemas.optionalEmail,
  paymentMethod: paymentMethodSchema.optional(),
  cancelAtPeriodEnd: Joi.boolean().optional(),
  tokenDiscounts: Joi.array().items(tokenDiscountSchema).optional()
});

/**
 * Checkout session request validation schema
 */
export const checkoutSessionRequestSchema = Joi.object({
  plan: billingPlanSchema.required(),
  successUrl: commonSchemas.url.required(),
  cancelUrl: commonSchemas.url.required(),
  couponCode: Joi.string().optional(),
  tokenDiscount: Joi.string().optional()
});

/**
 * Plan change request validation schema
 */
export const planChangeRequestSchema = Joi.object({
  newPlan: billingPlanSchema.required(),
  immediate: Joi.boolean().default(false),
  reason: Joi.string().max(500).optional()
});

/**
 * Cancellation request validation schema
 */
export const cancellationRequestSchema = Joi.object({
  reason: Joi.string().max(500).optional(),
  feedback: Joi.string().max(1000).optional(),
  immediate: Joi.boolean().default(false)
});

/**
 * Export all billing validation schemas
 */
export const billingValidationSchemas = {
  billingPlan: billingPlanSchema,
  billingStatus: billingStatusSchema,
  paymentMethod: paymentMethodSchema,
  tokenDiscount: tokenDiscountSchema,
  usageMetrics: usageMetricsSchema,
  planLimits: planLimitsSchema,
  billingUpdate: billingUpdateSchema,
  checkoutSessionRequest: checkoutSessionRequestSchema,
  planChangeRequest: planChangeRequestSchema,
  cancellationRequest: cancellationRequestSchema
};
