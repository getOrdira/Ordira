// src/models/subscription.model.ts

import { Schema, model, Document } from 'mongoose';

export interface Subscription extends Document {
  business:         string;
  tier:             'foundation' | 'growth' | 'premium' | 'enterprise';
  voteLimit:        number;   // -1 for unlimited
  nftLimit:         number;   // -1 for unlimited
  surchargePerVote: number;   // per-unit overage charge
  surchargePerNft:  number;   // per-unit overage charge
  allowOverage:     boolean;  // whether overage billing is enabled
  createdAt:        Date;
  updatedAt:        Date;
}

const SubscriptionSchema = new Schema<Subscription>(
  {
    business: {
      type: String,
      required: true,
      unique: true
    },
    tier: {
      type: String,
      enum: ['foundation', 'growth', 'premium', 'enterprise'],
      required: true
    },
    voteLimit: {
      type: Number,
      required: true
    },
    nftLimit: {
      type: Number,
      required: true
    },
    surchargePerVote: {
      type: Number,
      required: true,
      default: 0
    },
    surchargePerNft: {
      type: Number,
      required: true,
      default: 0
    },
    allowOverage: {
      type: Boolean,
      required: true
    }
  },
  { timestamps: true }
);

// Auto-set limits based on tier before validation
SubscriptionSchema.pre('validate', function (next) {
  switch (this.tier) {
    case 'foundation':
      this.voteLimit        = 100;
      this.nftLimit         = 50;
      this.allowOverage     = false;
      this.surchargePerVote = 0;
      this.surchargePerNft  = 0;
      break;
    case 'growth':
      this.voteLimit        = 500;
      this.nftLimit         = 150;
      this.allowOverage     = false;
      this.surchargePerVote = 0;
      this.surchargePerNft  = 0;
      break;
    case 'premium':
      this.voteLimit        = 2000;
      this.nftLimit         = 500;
      this.allowOverage     = false;
      this.surchargePerVote = 0;
      this.surchargePerNft  = 0;
      break;
    case 'enterprise':
      this.voteLimit        = -1;  // unlimited
      this.nftLimit         = -1;  // unlimited
      this.allowOverage     = true; // use surcharge for overage if needed
      this.surchargePerVote = 0;
      this.surchargePerNft  = 0;
      break;
  }
  next();
});

export const Subscription = model<Subscription>('Subscription', SubscriptionSchema);
