// src/models/subscription.model.ts

import { Schema, model, Document } from 'mongoose';

export interface ISubscription extends Document {
  business: string;
  tier: 'foundation' | 'growth' | 'premium' | 'enterprise';
  voteLimit: number;
  nftLimit: number;
  surchargePerVote: number;
  surchargePerNft: number;
  allowOverage: boolean;
  
  // Enhanced tracking
  currentVoteUsage: number;
  currentNftUsage: number;
  lastResetDate: Date;
  nextBillingDate: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    business: {
      type: String,
      required: [true, 'Business ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    tier: {
      type: String,
      enum: ['foundation', 'growth', 'premium', 'enterprise'],
      required: [true, 'Subscription tier is required'],
      index: true
    },
    voteLimit: { type: Number, required: true },
    nftLimit: { type: Number, required: true },
    surchargePerVote: { type: Number, required: true, default: 0 },
    surchargePerNft: { type: Number, required: true, default: 0 },
    allowOverage: { type: Boolean, required: true },
    
    currentVoteUsage: { type: Number, default: 0, min: 0 },
    currentNftUsage: { type: Number, default: 0, min: 0 },
    lastResetDate: { type: Date, default: Date.now },
    nextBillingDate: { type: Date, required: true }
  },
  { timestamps: true }
);

// Auto-set limits based on tier
SubscriptionSchema.pre('validate', function (next) {
  const tierLimits = {
    foundation: { votes: 100, nfts: 50, overage: false },
    growth: { votes: 500, nfts: 150, overage: false },
    premium: { votes: 2000, nfts: 500, overage: false },
    enterprise: { votes: -1, nfts: -1, overage: true }
  };
  
  const limits = tierLimits[this.tier];
  this.voteLimit = limits.votes;
  this.nftLimit = limits.nfts;
  this.allowOverage = limits.overage;
  
  next();
});

export const Subscription = model<ISubscription>('Subscription', SubscriptionSchema);
