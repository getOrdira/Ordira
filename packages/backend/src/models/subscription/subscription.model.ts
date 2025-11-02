// src/models/subscription/subscription.model.ts
import { Schema, model, Document, Types, Model } from 'mongoose';

export interface ISubscription extends Document {
  // Core subscription information
  business: Types.ObjectId;
  tier: 'foundation' | 'growth' | 'premium' | 'enterprise';
  
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
  billingCycle: 'monthly' | 'yearly';
  
  // Subscription state
  status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'paused';
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
  features: {
    analytics: boolean;
    apiAccess: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
    webhooks: boolean;
    customDomain: boolean;
    whiteLabel: boolean;
    sla: boolean;
  };
  
  // Usage analytics
  usageHistory: Array<{
    date: Date;
    votes: number;
    nfts: number;
    apiCalls: number;
    storage: number;
  }>;
  
  // Billing history
  billingHistory: Array<{
    date: Date;
    amount: number;
    type: 'subscription' | 'overage' | 'discount';
    description: string;
    status: 'paid' | 'pending' | 'failed';
  }>;
  
  // Instance methods
  incrementVoteUsage(count?: number): Promise<ISubscription>;
  incrementNftUsage(count?: number): Promise<ISubscription>;
  incrementApiUsage(count?: number): Promise<ISubscription>;
  incrementStorageUsage(bytes: number): Promise<ISubscription>;
  resetUsage(): Promise<ISubscription>;
  checkVoteLimit(votesToAdd?: number): Promise<{ allowed: boolean; overage?: number }>;
  checkNftLimit(nftsToAdd?: number): Promise<{ allowed: boolean; overage?: number }>;
  checkApiLimit(callsToAdd?: number): Promise<{ allowed: boolean; overage?: number }>;
  checkStorageLimit(bytesToAdd: number): Promise<{ allowed: boolean; overage?: number }>;
  calculateOverageCost(): Promise<number>;
  getUsagePercentages(): any;
  canUpgrade(): boolean;
  canDowngrade(): boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface - extends Model instead of Document
export interface ISubscriptionModel extends Model<ISubscription> {
  findByBusiness(businessId: string): Promise<ISubscription | null>;
  getActiveSubscriptions(): Promise<ISubscription[]>;
  getSubscriptionsByTier(tier: string): Promise<ISubscription[]>;
  getExpiringSoons(days?: number): Promise<ISubscription[]>;
  getUsageStats(businessId?: string): Promise<any>;
  bulkResetUsage(): Promise<any>;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    // Core subscription information
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business reference is required'],
      unique: true,
      index: true
    },
    
    tier: {
      type: String,
      enum: {
        values: ['foundation', 'growth', 'premium', 'enterprise'],
        message: 'Tier must be foundation, growth, premium, or enterprise'
      },
      required: [true, 'Subscription tier is required'],
      index: true
    },
    
    // Usage limits (automatically set based on tier)
    voteLimit: { 
      type: Number, 
      required: true,
      min: [-1, 'Vote limit cannot be less than -1 (unlimited)']
    },
    
    nftLimit: { 
      type: Number, 
      required: true,
      min: [-1, 'NFT limit cannot be less than -1 (unlimited)']
    },
    
    apiLimit: {
      type: Number,
      required: true,
      min: [-1, 'API limit cannot be less than -1 (unlimited)']
    },
    
    storageLimit: {
      type: Number, // in GB
      required: true,
      min: [0, 'Storage limit cannot be negative']
    },
    
    // Overage pricing
    surchargePerVote: { 
      type: Number, 
      required: true, 
      default: 0,
      min: [0, 'Surcharge cannot be negative']
    },
    
    surchargePerNft: { 
      type: Number, 
      required: true, 
      default: 0,
      min: [0, 'Surcharge cannot be negative']
    },
    
    surchargePerApiCall: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Surcharge cannot be negative']
    },
    
    surchargePerGBStorage: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Surcharge cannot be negative']
    },
    
    allowOverage: { 
      type: Boolean, 
      required: true,
      default: false
    },
    
    // Current usage tracking
    currentVoteUsage: { 
      type: Number, 
      default: 0, 
      min: [0, 'Vote usage cannot be negative'],
      index: true
    },
    
    currentNftUsage: { 
      type: Number, 
      default: 0, 
      min: [0, 'NFT usage cannot be negative'],
      index: true
    },
    
    currentApiUsage: {
      type: Number,
      default: 0,
      min: [0, 'API usage cannot be negative'],
      index: true
    },
    
    currentStorageUsage: {
      type: Number, // in bytes
      default: 0,
      min: [0, 'Storage usage cannot be negative']
    },
    
    // Billing cycle management
    lastResetDate: { 
      type: Date, 
      default: Date.now,
      index: true
    },
    
    nextBillingDate: { 
      type: Date, 
      required: true,
      index: true
    },
    
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    
    // Subscription state
    status: {
      type: String,
      enum: ['active', 'inactive', 'past_due', 'canceled', 'paused'],
      default: 'active',
      index: true
    },
    
    isTrialPeriod: {
      type: Boolean,
      default: false,
      index: true
    },
    
    trialEndsAt: {
      type: Date,
      index: true
    },
    
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },
    
    pausedAt: {
      type: Date
    },
    
    // Payment integration
    stripeSubscriptionId: {
      type: String,
      sparse: true,
      index: true
    },
    
    stripePriceId: {
      type: String
    },
    
    lastPaymentDate: {
      type: Date
    },
    
    nextPaymentAmount: {
      type: Number,
      min: [0, 'Payment amount cannot be negative']
    },
    
    // Feature flags based on tier
    features: {
      analytics: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      webhooks: { type: Boolean, default: false },
      customDomain: { type: Boolean, default: false },
      whiteLabel: { type: Boolean, default: false },
      sla: { type: Boolean, default: false }
    },
    
    // Usage analytics (for trending and reporting)
    usageHistory: [{
      date: { type: Date, required: true },
      votes: { type: Number, default: 0 },
      nfts: { type: Number, default: 0 },
      apiCalls: { type: Number, default: 0 },
      storage: { type: Number, default: 0 }
    }],
    
    // Billing history
    billingHistory: [{
      date: { type: Date, required: true },
      amount: { type: Number, required: true },
      type: { 
        type: String, 
        enum: ['subscription', 'overage', 'discount'],
        required: true 
      },
      description: { type: String, required: true },
      status: { 
        type: String, 
        enum: ['paid', 'pending', 'failed'],
        required: true 
      }
    }]
  },
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// ====================
// INDEXES FOR PERFORMANCE
// ====================

// Primary business lookup
SubscriptionSchema.index({ business: 1 });

// Tier-based queries
SubscriptionSchema.index({ tier: 1, status: 1 });

// Billing cycle queries
SubscriptionSchema.index({ nextBillingDate: 1, status: 1 });
SubscriptionSchema.index({ lastResetDate: 1 });

// Trial and payment queries
SubscriptionSchema.index({ isTrialPeriod: 1, trialEndsAt: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 });

// Usage monitoring
SubscriptionSchema.index({ currentVoteUsage: 1, voteLimit: 1 });
SubscriptionSchema.index({ currentNftUsage: 1, nftLimit: 1 });

// ====================
// VALIDATION MIDDLEWARE
// ====================

// Pre-validate: Set tier-based limits and features
SubscriptionSchema.pre('validate', function (next) {
  const tierConfig = {
    foundation: { 
      votes: 100, 
      nfts: 50, 
      api: 1000,
      storage: 1,
      overage: false,
      features: {
        analytics: true,
        apiAccess: true,
        customBranding: false,
        prioritySupport: false,
        webhooks: false,
        customDomain: false,
        whiteLabel: false,
        sla: false
      }
    },
    growth: { 
      votes: 500, 
      nfts: 150, 
      api: 10000,
      storage: 5,
      overage: false,
      features: {
        analytics: true,
        apiAccess: true,
        customBranding: true,
        prioritySupport: true,
        webhooks: true,
        customDomain: false,
        whiteLabel: false,
        sla: false
      }
    },
    premium: { 
      votes: 2000, 
      nfts: 500, 
      api: 100000,
      storage: 25,
      overage: true,
      features: {
        analytics: true,
        apiAccess: true,
        customBranding: true,
        prioritySupport: true,
        webhooks: true,
        customDomain: true,
        whiteLabel: false,
        sla: false
      }
    },
    enterprise: { 
      votes: -1, 
      nfts: -1, 
      api: -1,
      storage: 100,
      overage: true,
      features: {
        analytics: true,
        apiAccess: true,
        customBranding: true,
        prioritySupport: true,
        webhooks: true,
        customDomain: true,
        whiteLabel: true,
        sla: true
      }
    }
  };
  
  const config = tierConfig[this.tier];
  if (config) {
    this.voteLimit = config.votes;
    this.nftLimit = config.nfts;
    this.apiLimit = config.api;
    this.storageLimit = config.storage;
    this.allowOverage = config.overage;
    this.features = { ...this.features, ...config.features };
  }
  
  next();
});

// Pre-save: Set next billing date if not provided
SubscriptionSchema.pre('save', function(next) {
  if (!this.nextBillingDate) {
    const nextBilling = new Date();
    if (this.billingCycle === 'yearly') {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    } else {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
    this.nextBillingDate = nextBilling;
  }
  
  next();
});

// ====================
// VIRTUAL PROPERTIES
// ====================

// Virtual for usage percentages
SubscriptionSchema.virtual('usagePercentages').get(function() {
  return {
    votes: this.voteLimit === -1 ? 0 : (this.currentVoteUsage / this.voteLimit) * 100,
    nfts: this.nftLimit === -1 ? 0 : (this.currentNftUsage / this.nftLimit) * 100,
    api: this.apiLimit === -1 ? 0 : (this.currentApiUsage / this.apiLimit) * 100,
    storage: this.storageLimit === 0 ? 0 : (this.currentStorageUsage / (this.storageLimit * 1024 * 1024 * 1024)) * 100
  };
});

// Virtual for days until billing
SubscriptionSchema.virtual('daysUntilBilling').get(function() {
  const now = new Date();
  const diffTime = this.nextBillingDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for trial status
SubscriptionSchema.virtual('trialStatus').get(function() {
  if (!this.isTrialPeriod) return 'not_trial';
  if (!this.trialEndsAt) return 'trial_active';
  
  const now = new Date();
  if (this.trialEndsAt > now) return 'trial_active';
  return 'trial_expired';
});

// ====================
// INSTANCE METHODS
// ====================

// Usage increment methods
SubscriptionSchema.methods.incrementVoteUsage = function(count = 1): Promise<ISubscription> {
  this.currentVoteUsage += count;
  return this.save();
};

SubscriptionSchema.methods.incrementNftUsage = function(count = 1): Promise<ISubscription> {
  this.currentNftUsage += count;
  return this.save();
};

SubscriptionSchema.methods.incrementApiUsage = function(count = 1): Promise<ISubscription> {
  this.currentApiUsage += count;
  return this.save();
};

SubscriptionSchema.methods.incrementStorageUsage = function(bytes: number): Promise<ISubscription> {
  this.currentStorageUsage += bytes;
  return this.save();
};

// Usage reset (called monthly)
SubscriptionSchema.methods.resetUsage = function(): Promise<ISubscription> {
  // Store current usage in history before reset
  this.usageHistory.push({
    date: new Date(),
    votes: this.currentVoteUsage,
    nfts: this.currentNftUsage,
    apiCalls: this.currentApiUsage,
    storage: this.currentStorageUsage
  });
  
  // Keep only last 12 months of history
  if (this.usageHistory.length > 12) {
    this.usageHistory = this.usageHistory.slice(-12);
  }
  
  // Reset current usage
  this.currentVoteUsage = 0;
  this.currentNftUsage = 0;
  this.currentApiUsage = 0;
  this.lastResetDate = new Date();
  
  return this.save();
};

// Limit checking methods
SubscriptionSchema.methods.checkVoteLimit = function(votesToAdd = 1): Promise<{ allowed: boolean; overage?: number }> {
  if (this.voteLimit === -1) return Promise.resolve({ allowed: true });
  
  const projected = this.currentVoteUsage + votesToAdd;
  if (projected <= this.voteLimit) {
    return Promise.resolve({ allowed: true });
  }
  
  const overage = projected - this.voteLimit;
  return Promise.resolve({ 
    allowed: this.allowOverage, 
    overage 
  });
};

SubscriptionSchema.methods.checkNftLimit = function(nftsToAdd = 1): Promise<{ allowed: boolean; overage?: number }> {
  if (this.nftLimit === -1) return Promise.resolve({ allowed: true });
  
  const projected = this.currentNftUsage + nftsToAdd;
  if (projected <= this.nftLimit) {
    return Promise.resolve({ allowed: true });
  }
  
  const overage = projected - this.nftLimit;
  return Promise.resolve({ 
    allowed: this.allowOverage, 
    overage 
  });
};

SubscriptionSchema.methods.checkApiLimit = function(callsToAdd = 1): Promise<{ allowed: boolean; overage?: number }> {
  if (this.apiLimit === -1) return Promise.resolve({ allowed: true });
  
  const projected = this.currentApiUsage + callsToAdd;
  if (projected <= this.apiLimit) {
    return Promise.resolve({ allowed: true });
  }
  
  const overage = projected - this.apiLimit;
  return Promise.resolve({ 
    allowed: this.allowOverage, 
    overage 
  });
};

SubscriptionSchema.methods.checkStorageLimit = function(bytesToAdd: number): Promise<{ allowed: boolean; overage?: number }> {
  const limitBytes = this.storageLimit * 1024 * 1024 * 1024; // Convert GB to bytes
  const projected = this.currentStorageUsage + bytesToAdd;
  
  if (projected <= limitBytes) {
    return Promise.resolve({ allowed: true });
  }
  
  const overage = projected - limitBytes;
  return Promise.resolve({ 
    allowed: this.allowOverage, 
    overage 
  });
};

// Calculate total overage cost
SubscriptionSchema.methods.calculateOverageCost = function(): Promise<number> {
  let cost = 0;
  
  // Vote overage
  if (this.voteLimit !== -1 && this.currentVoteUsage > this.voteLimit) {
    const voteOverage = this.currentVoteUsage - this.voteLimit;
    cost += voteOverage * this.surchargePerVote;
  }
  
  // NFT overage
  if (this.nftLimit !== -1 && this.currentNftUsage > this.nftLimit) {
    const nftOverage = this.currentNftUsage - this.nftLimit;
    cost += nftOverage * this.surchargePerNft;
  }
  
  // API overage
  if (this.apiLimit !== -1 && this.currentApiUsage > this.apiLimit) {
    const apiOverage = this.currentApiUsage - this.apiLimit;
    cost += apiOverage * this.surchargePerApiCall;
  }
  
  // Storage overage
  const limitBytes = this.storageLimit * 1024 * 1024 * 1024;
  if (this.currentStorageUsage > limitBytes) {
    const storageOverageGB = (this.currentStorageUsage - limitBytes) / (1024 * 1024 * 1024);
    cost += storageOverageGB * this.surchargePerGBStorage;
  }
  
  return Promise.resolve(cost);
};

// Get usage percentages
SubscriptionSchema.methods.getUsagePercentages = function(): any {
  return {
    votes: this.voteLimit === -1 ? 0 : Math.min((this.currentVoteUsage / this.voteLimit) * 100, 100),
    nfts: this.nftLimit === -1 ? 0 : Math.min((this.currentNftUsage / this.nftLimit) * 100, 100),
    api: this.apiLimit === -1 ? 0 : Math.min((this.currentApiUsage / this.apiLimit) * 100, 100),
    storage: this.storageLimit === 0 ? 0 : Math.min((this.currentStorageUsage / (this.storageLimit * 1024 * 1024 * 1024)) * 100, 100)
  };
};

// Plan change validation
SubscriptionSchema.methods.canUpgrade = function(): boolean {
  const tierOrder = ['foundation', 'growth', 'premium', 'enterprise'];
  const currentIndex = tierOrder.indexOf(this.tier);
  return currentIndex < tierOrder.length - 1;
};

SubscriptionSchema.methods.canDowngrade = function(): boolean {
  const tierOrder = ['foundation', 'growth', 'premium', 'enterprise'];
  const currentIndex = tierOrder.indexOf(this.tier);
  return currentIndex > 0;
};

// ====================
// STATIC METHODS
// ====================

// Find subscription by business
SubscriptionSchema.statics.findByBusiness = function(businessId: string) {
  return this.findOne({ business: businessId });
};

// Get all active subscriptions
SubscriptionSchema.statics.getActiveSubscriptions = function() {
  return this.find({ status: 'active' });
};

// Get subscriptions by tier
SubscriptionSchema.statics.getSubscriptionsByTier = function(tier: string) {
  return this.find({ tier, status: 'active' });
};

// Get subscriptions expiring soon
SubscriptionSchema.statics.getExpiringSoons = function(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + days);
  
  return this.find({
    status: 'active',
    nextBillingDate: { $lte: cutoffDate }
  });
};

// Get comprehensive usage statistics
SubscriptionSchema.statics.getUsageStats = function(businessId?: string) {
  const match: any = {};
  if (businessId) match.business = businessId;
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$tier',
        count: { $sum: 1 },
        avgVoteUsage: { $avg: '$currentVoteUsage' },
        avgNftUsage: { $avg: '$currentNftUsage' },
        avgApiUsage: { $avg: '$currentApiUsage' },
        avgStorageUsage: { $avg: '$currentStorageUsage' },
        totalRevenue: { $sum: '$nextPaymentAmount' }
      }
    }
  ]);
};

// Bulk reset usage for all subscriptions (monthly cron job)
SubscriptionSchema.statics.bulkResetUsage = function() {
  return this.updateMany(
    { 
      lastResetDate: { 
        $lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
      }
    },
    {
      $set: {
        currentVoteUsage: 0,
        currentNftUsage: 0,
        currentApiUsage: 0,
        lastResetDate: new Date()
      }
    }
  );
};

export const Subscription = model<ISubscription, ISubscriptionModel>('Subscription', SubscriptionSchema);

