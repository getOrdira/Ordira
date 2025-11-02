// src/models/voting/pendingVote.model.ts
import { Schema, model, Document } from 'mongoose';

export interface IPendingVote extends Document {
  businessId: string;
  proposalId: string; // This could be "product-selection-round-1" or similar
  userId: string;
  voteId: string;
  
  
  selectedProductId: string; // The product they selected/liked
  productName?: string; // Optional: store product name for reference
  productImageUrl?: string; // Optional: store image URL for reference
  selectionReason?: string; // Optional: why they like this product
  
  userSignature?: string;
  ipAddress?: string;
  userAgent?: string;
  isProcessed: boolean;
  processedAt?: Date;
  verificationHash?: string;
  isVerified: boolean;
  createdAt: Date;
  voteChoice?: string;
  
  // Instance methods
  generateVoteHash(): string;
}

const PendingVoteSchema = new Schema<IPendingVote>({
  businessId: { 
    type: String, 
    required: [true, 'Business ID is required'],
    trim: true,
    index: true,
    maxlength: [100, 'Business ID cannot exceed 100 characters']
  },
  proposalId: { 
    type: String, 
    required: [true, 'Proposal ID is required'],
    trim: true,
    index: true,
    maxlength: [100, 'Proposal ID cannot exceed 100 characters']
  },
  userId: { 
    type: String, 
    required: [true, 'User ID is required'],
    trim: true,
    index: true,
    maxlength: [100, 'User ID cannot exceed 100 characters']
  },
  voteId: { 
    type: String, 
    required: [true, 'Vote ID is required'],
    unique: true,
    trim: true,
    index: true,
    maxlength: [100, 'Vote ID cannot exceed 100 characters']
  },
  
  // Enhanced fields
  selectedProductId: {
    type: String,
    required: [true, 'Selected product ID is required'],
    trim: true,
    index: true
  },
  productName: {
    type: String,
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  productImageUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Product image URL must be a valid HTTP/HTTPS URL'
    }
  },
  selectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Selection reason cannot exceed 500 characters']
  },

  userSignature: {
    type: String,
    trim: true,
    match: [/^0x[a-fA-F0-9]+$/, 'Invalid signature format']
  },
  ipAddress: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        // IPv4 or IPv6 regex
        const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6 = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4.test(v) || ipv6.test(v);
      },
      message: 'Invalid IP address format'
    }
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  },
  isProcessed: {
    type: Boolean,
    default: false,
    index: true
  },
  processedAt: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return !v || v <= new Date();
      },
      message: 'Processed date cannot be in the future'
    }
  },
  
  // Validation and security
  verificationHash: {
    type: String,
    trim: true,
    match: [/^[a-fA-F0-9]{64}$/, 'Invalid verification hash format']
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  
  createdAt: { 
    type: Date, 
    default: () => new Date(),
    index: true
  }
});

// Indexes for performance and constraints
PendingVoteSchema.index({ businessId: 1, proposalId: 1, userId: 1, selectedProductId: 1 }, { unique: true });
PendingVoteSchema.index({ businessId: 1, isProcessed: 1 });
PendingVoteSchema.index({ isProcessed: 1, createdAt: 1 });
PendingVoteSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // 24 hours TTL

// Compound indexes for common queries
PendingVoteSchema.index({ businessId: 1, proposalId: 1, isProcessed: 1 });
PendingVoteSchema.index({ businessId: 1, createdAt: -1 });

// Virtual for age in minutes
PendingVoteSchema.virtual('ageInMinutes').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60));
});

// Instance methods
PendingVoteSchema.methods.markAsProcessed = function(): Promise<IPendingVote> {
  this.isProcessed = true;
  this.processedAt = new Date();
  return this.save();
};

PendingVoteSchema.methods.verify = function(hash: string): Promise<IPendingVote> {
  this.verificationHash = hash;
  this.isVerified = true;
  return this.save();
};

PendingVoteSchema.methods.generateVoteHash = function(): string {
  const crypto = require('crypto');
  const data = `${this.businessId}-${this.proposalId}-${this.userId}-${this.voteChoice}-${this.createdAt.getTime()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Static methods
PendingVoteSchema.statics.findPendingForBusiness = function(businessId: string) {
  return this.find({ 
    businessId, 
    isProcessed: false 
  }).sort({ createdAt: 1 });
};

PendingVoteSchema.statics.findPendingForProposal = function(businessId: string, proposalId: string) {
  return this.find({ 
    businessId, 
    proposalId, 
    isProcessed: false 
  }).sort({ createdAt: 1 });
};

PendingVoteSchema.statics.countPendingVotes = function(businessId: string) {
  return this.countDocuments({ 
    businessId, 
    isProcessed: false 
  });
};

PendingVoteSchema.statics.markBatchAsProcessed = function(voteIds: string[]) {
  return this.updateMany(
    { voteId: { $in: voteIds } },
    { 
      isProcessed: true, 
      processedAt: new Date() 
    }
  );
};

PendingVoteSchema.statics.getVotingStats = function(businessId: string) {
  return this.aggregate([
    { $match: { businessId } },
    {
      $group: {
        _id: {
          proposalId: '$proposalId',
          voteChoice: '$voteChoice'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.proposalId',
        votes: {
          $push: {
            choice: '$_id.voteChoice',
            count: '$count'
          }
        },
        totalVotes: { $sum: '$count' }
      }
    }
  ]);
};

PendingVoteSchema.statics.cleanupProcessed = function(olderThanHours: number = 24) {
  const cutoffDate = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  return this.deleteMany({
    isProcessed: true,
    processedAt: { $lt: cutoffDate }
  });
};

// Pre-save middleware
PendingVoteSchema.pre('save', function(this: IPendingVote, next) {
  // Generate verification hash if not present
  if (this.isNew && !this.verificationHash) {
    this.verificationHash = this.generateVoteHash();
  }
  
  // Set processedAt when marking as processed
  if (this.isModified('isProcessed') && this.isProcessed && !this.processedAt) {
    this.processedAt = new Date();
  }
  
  next();
});

export const PendingVote = model<IPendingVote>('PendingVote', PendingVoteSchema);
