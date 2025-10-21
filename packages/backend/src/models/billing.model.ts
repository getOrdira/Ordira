// src/models/billing.model.ts
import { Schema, model, Document, Types } from 'mongoose';
import { logger } from '../utils/logger';

export interface IBilling extends Document {
  business: Types.ObjectId;
  
  // Stripe integration
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionItemId?: string;
  stripePaymentMethodId?: string;
  
  // Plan and subscription details
  plan: 'foundation' | 'growth' | 'premium' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete' | 'paused';
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete';
  
  // Billing period information
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  
  // Payment information
  billingEmail?: string;
  paymentMethod?: {
    type: string;
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
  };
  
  // Invoice and payment tracking
  nextInvoiceDate?: Date;
  nextInvoiceAmount?: number;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  totalRevenue?: number;
  
  // Token discounts and Web3 integration
  tokenDiscounts?: any;
  activeDiscountApplied?: boolean;
  tokenDiscountsUpdatedAt?: Date;
  discountAppliedAt?: Date;
  discountRemovedAt?: Date;
  discountApplicationError?: string;
  discountRemovalReason?: string;
  walletAddress?: string;
  
  // Loyalty and referral discounts
  loyaltyDiscount?: {
    type: string;
    discount: number;
    description: string;
    validUntil?: Date;
  };
  loyaltyDiscountScheduled?: boolean;
  referralCode?: string;
  referredBy?: Types.ObjectId;
  
  // Renewal and billing cycle tracking
  lastRenewalAt?: Date;
  renewalCount?: number;
  consecutivePayments?: number;
  missedPayments?: number;
  
  // Usage tracking and overage
  currentUsage?: {
    apiCalls: number;
    certificates: number;
    votes: number;
    storage: number;
    bandwidth: number;
    lastUpdated: Date;
  };
  
  // Overage charges
  lastOverageCharge?: number;
  lastOverageDate?: Date;
  totalOverageCharges?: number;
  
  // Billing notifications and preferences
  notificationSettings?: {
    upcomingRenewal: boolean;
    paymentFailed: boolean;
    usageWarnings: boolean;
    planChanges: boolean;
    emailPreferences: string[];
  };
  
  // Financial tracking
  monthlyRevenue?: number;
  yearlyRevenue?: number;
  lifetimeValue?: number;
  averageMonthlySpend?: number;
  
  // Cancellation and churn data
  cancellationReason?: string;
  cancellationFeedback?: string;
  cancellationSurveyData?: any;
  retentionOffers?: Array<{
    offerType: string;
    discount: number;
    validUntil: Date;
    accepted: boolean;
    createdAt: Date;
  }>;
  
  // Billing address
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  
  // Tax information
  taxId?: string;
  taxRate?: number;
  taxExempt?: boolean;
  
  // Metadata and versioning
  version?: number;
  metadata?: any;
  internalNotes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  isActive(): boolean;
  hasValidPaymentMethod(): boolean;
  getDaysUntilRenewal(): number;
  getUsageUtilization(): any;
  canDowngradeTo(newPlan: string): boolean;
  calculateMonthlyRevenue(): number;
  isEligibleForDiscount(): boolean;
  getPaymentHistory(): Promise<any[]>;
}

const BillingSchema = new Schema<IBilling>(
  {
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business reference is required'],
      unique: true,
      index: true
    },
    
    // Stripe integration
    stripeCustomerId: {
      type: String,
      trim: true,
      index: true,
      sparse: true
    },
    stripeSubscriptionId: {
      type: String,
      trim: true,
      index: true,
      sparse: true
    },
    stripeSubscriptionItemId: {
      type: String,
      trim: true
    },
    stripePaymentMethodId: {
      type: String,
      trim: true
    },
    
    // Plan and subscription details
    plan: {
      type: String,
      enum: ['foundation', 'growth', 'premium', 'enterprise'],
      default: 'foundation',
      required: [true, 'Plan is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'paused'],
      default: 'active',
      required: [true, 'Status is required'],
      index: true
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete']
    },
    
    // Billing period information
    currentPeriodStart: {
      type: Date,
      index: true
    },
    currentPeriodEnd: {
      type: Date,
      index: true
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },
    canceledAt: {
      type: Date
    },
    trialStart: {
      type: Date
    },
    trialEnd: {
      type: Date
    },
    
    // Payment information
    billingEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    paymentMethod: {
      type: {
        type: String,
        enum: ['card', 'bank_account', 'paypal']
      },
      last4: String,
      brand: String,
      expiryMonth: {
        type: Number,
        min: 1,
        max: 12
      },
      expiryYear: {
        type: Number,
        min: new Date().getFullYear()
      }
    },
    
    // Invoice and payment tracking
    nextInvoiceDate: {
      type: Date
    },
    nextInvoiceAmount: {
      type: Number,
      min: 0
    },
    lastPaymentDate: {
      type: Date
    },
    lastPaymentAmount: {
      type: Number,
      min: 0
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Token discounts and Web3 integration
    tokenDiscounts: {
      type: Schema.Types.Mixed // Flexible schema for different discount structures
    },
    activeDiscountApplied: {
      type: Boolean,
      default: false
    },
    tokenDiscountsUpdatedAt: {
      type: Date
    },
    discountAppliedAt: {
      type: Date
    },
    discountRemovedAt: {
      type: Date
    },
    discountApplicationError: {
      type: String,
      trim: true
    },
    discountRemovalReason: {
      type: String,
      trim: true
    },
    walletAddress: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum wallet address']
    },
    
    // Loyalty and referral discounts
    loyaltyDiscount: {
      type: {
        type: String,
        required: true
      },
      discount: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      description: {
        type: String,
        required: true
      },
      validUntil: Date
    },
    loyaltyDiscountScheduled: {
      type: Boolean,
      default: false
    },
    referralCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'Business'
    },
    
    // Renewal and billing cycle tracking
    lastRenewalAt: {
      type: Date
    },
    renewalCount: {
      type: Number,
      default: 0,
      min: 0
    },
    consecutivePayments: {
      type: Number,
      default: 0,
      min: 0
    },
    missedPayments: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Usage tracking
    currentUsage: {
      apiCalls: {
        type: Number,
        default: 0,
        min: 0
      },
      certificates: {
        type: Number,
        default: 0,
        min: 0
      },
      votes: {
        type: Number,
        default: 0,
        min: 0
      },
      storage: {
        type: Number,
        default: 0,
        min: 0
      },
      bandwidth: {
        type: Number,
        default: 0,
        min: 0
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    },
    
    // Overage charges
    lastOverageCharge: {
      type: Number,
      default: 0,
      min: 0
    },
    lastOverageDate: {
      type: Date
    },
    totalOverageCharges: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Billing notifications and preferences
    notificationSettings: {
      upcomingRenewal: {
        type: Boolean,
        default: true
      },
      paymentFailed: {
        type: Boolean,
        default: true
      },
      usageWarnings: {
        type: Boolean,
        default: true
      },
      planChanges: {
        type: Boolean,
        default: true
      },
      emailPreferences: [{
        type: String,
        enum: ['marketing', 'product_updates', 'billing', 'security']
      }]
    },
    
    // Financial tracking
    monthlyRevenue: {
      type: Number,
      default: 0,
      min: 0
    },
    yearlyRevenue: {
      type: Number,
      default: 0,
      min: 0
    },
    lifetimeValue: {
      type: Number,
      default: 0,
      min: 0
    },
    averageMonthlySpend: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Cancellation and churn data
    cancellationReason: {
      type: String,
      trim: true
    },
    cancellationFeedback: {
      type: String,
      trim: true,
      maxlength: [1000, 'Feedback cannot exceed 1000 characters']
    },
    cancellationSurveyData: {
      type: Schema.Types.Mixed
    },
    retentionOffers: [{
      offerType: {
        type: String,
        required: true
      },
      discount: {
        type: Number,
        required: true,
        min: 0,
        max: 100
      },
      validUntil: {
        type: Date,
        required: true
      },
      accepted: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Billing address
    billingAddress: {
      line1: {
        type: String,
        trim: true,
        maxlength: [100, 'Address line 1 cannot exceed 100 characters']
      },
      line2: {
        type: String,
        trim: true,
        maxlength: [100, 'Address line 2 cannot exceed 100 characters']
      },
      city: {
        type: String,
        trim: true,
        maxlength: [50, 'City cannot exceed 50 characters']
      },
      state: {
        type: String,
        trim: true,
        maxlength: [50, 'State cannot exceed 50 characters']
      },
      postal_code: {
        type: String,
        trim: true,
        maxlength: [20, 'Postal code cannot exceed 20 characters']
      },
      country: {
        type: String,
        trim: true,
        uppercase: true,
        length: [2, 'Country must be a 2-letter ISO code']
      }
    },
    
    // Tax information
    taxId: {
      type: String,
      trim: true,
      maxlength: [50, 'Tax ID cannot exceed 50 characters']
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 100
    },
    taxExempt: {
      type: Boolean,
      default: false
    },
    
    // Metadata and versioning
    version: {
      type: Number,
      default: 1
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    internalNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Internal notes cannot exceed 2000 characters']
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ===== INDEXES =====
BillingSchema.index({ business: 1 }, { unique: true });
BillingSchema.index({ stripeCustomerId: 1 }, { sparse: true });
BillingSchema.index({ stripeSubscriptionId: 1 }, { sparse: true });
BillingSchema.index({ plan: 1, status: 1 });
BillingSchema.index({ currentPeriodEnd: 1 });
BillingSchema.index({ nextInvoiceDate: 1 });
BillingSchema.index({ lastRenewalAt: -1 });
BillingSchema.index({ 'currentUsage.lastUpdated': -1 });

// ===== VIRTUALS =====
BillingSchema.virtual('isActiveSubscription').get(function() {
  return ['active', 'trialing'].includes(this.status);
});

BillingSchema.virtual('daysUntilRenewal').get(function() {
  if (!this.currentPeriodEnd) return null;
  const now = new Date();
  const renewal = new Date(this.currentPeriodEnd);
  return Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
});

BillingSchema.virtual('revenueThisMonth').get(function() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // This would need to be calculated from actual payment records
  return this.monthlyRevenue || 0;
});

BillingSchema.virtual('subscriptionAge').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const created = new Date(this.createdAt);
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
});

// ===== INSTANCE METHODS =====

/**
 * Check if billing account is active
 */
BillingSchema.methods.isActive = function(): boolean {
  return ['active', 'trialing'].includes(this.status);
};

/**
 * Check if account has valid payment method
 */
BillingSchema.methods.hasValidPaymentMethod = function(): boolean {
  return !!(this.stripePaymentMethodId || this.paymentMethod);
};

/**
 * Get days until next renewal
 */
BillingSchema.methods.getDaysUntilRenewal = function(): number {
  if (!this.currentPeriodEnd) return -1;
  const now = new Date();
  const renewal = new Date(this.currentPeriodEnd);
  return Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Get usage utilization as percentages
 */
BillingSchema.methods.getUsageUtilization = function(): any {
  if (!this.currentUsage) return {};
  
  const planLimits = {
    foundation: { apiCalls: 1000, certificates: 10, votes: 100 },
    growth: { apiCalls: 10000, certificates: 100, votes: 1000 },
    premium: { apiCalls: 100000, certificates: 1000, votes: 10000 },
    enterprise: { apiCalls: 1000000, certificates: 10000, votes: 100000 }
  };
  
  const limits = planLimits[this.plan as keyof typeof planLimits];
  
  return {
    apiCalls: Math.round((this.currentUsage.apiCalls / limits.apiCalls) * 100),
    certificates: Math.round((this.currentUsage.certificates / limits.certificates) * 100),
    votes: Math.round((this.currentUsage.votes / limits.votes) * 100)
  };
};

/**
 * Check if account can downgrade to a specific plan
 */
BillingSchema.methods.canDowngradeTo = function(newPlan: string): boolean {
  if (!this.currentUsage) return true;
  
  const planLimits = {
    foundation: { apiCalls: 1000, certificates: 10, votes: 100 },
    growth: { apiCalls: 10000, certificates: 100, votes: 1000 },
    premium: { apiCalls: 100000, certificates: 1000, votes: 10000 },
    enterprise: { apiCalls: 1000000, certificates: 10000, votes: 100000 }
  };
  
  const newLimits = planLimits[newPlan as keyof typeof planLimits];
  if (!newLimits) return false;
  
  return (
    this.currentUsage.apiCalls <= newLimits.apiCalls &&
    this.currentUsage.certificates <= newLimits.certificates &&
    this.currentUsage.votes <= newLimits.votes
  );
};

/**
 * Calculate monthly revenue for this account
 */
BillingSchema.methods.calculateMonthlyRevenue = function(): number {
  const planPricing = {
    foundation: 0,
    growth: 29,
    premium: 99,
    enterprise: 299
  };
  
  return planPricing[this.plan as keyof typeof planPricing] || 0;
};

/**
 * Check if account is eligible for discounts
 */
BillingSchema.methods.isEligibleForDiscount = function(): boolean {
  // Eligible if no active discount and not on foundation plan
  return !this.activeDiscountApplied && this.plan !== 'foundation';
};

/**
 * Get payment history (would need to implement with actual Stripe calls)
 */
BillingSchema.methods.getPaymentHistory = async function(): Promise<any[]> {
  // This would fetch from Stripe API
  return [];
};

// ===== PRE/POST HOOKS =====

/**
 * Pre-save hook for calculations and validation
 */
BillingSchema.pre('save', function(next) {
  // Update lifetime value
  if (this.isModified('totalRevenue')) {
    this.lifetimeValue = this.totalRevenue;
  }
  
  // Calculate average monthly spend
  if (this.isModified('totalRevenue') || this.isModified('createdAt')) {
    const monthsSinceCreation = Math.max(1, 
      Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30))
    );
    this.averageMonthlySpend = this.totalRevenue / monthsSinceCreation;
  }
  
  // Update version for significant changes
  const significantFields = ['plan', 'status', 'stripeSubscriptionId', 'tokenDiscounts'];
  if (significantFields.some(field => this.isModified(field))) {
    this.version = (this.version || 0) + 1;
  }
  
  next();
});

/**
 * Post-save hook for notifications and cache management
 */
BillingSchema.post('save', function(doc) {
  // Log significant billing changes
  if (doc.isModified('plan')) {
    logger.info('Billing plan changed for business ${doc.business}: ${doc.plan}');
  }
  
  if (doc.isModified('status')) {
    logger.info('Billing status changed for business ${doc.business}: ${doc.status}');
  }
  
  if (doc.isModified('tokenDiscounts')) {
    logger.info('Token discounts updated for business ${doc.business}');
  }
});

/**
 * Pre-remove hook for cleanup (query middleware)
 */
BillingSchema.pre('deleteOne', { document: false, query: true }, async function() {
  const doc = await this.model.findOne(this.getQuery());
  if (doc) {
    logger.info('Removing billing record for business ${doc.business}');
    // Could trigger cleanup of Stripe resources, cancel subscriptions, etc.
  }
});

export const Billing = model<IBilling>('Billing', BillingSchema);