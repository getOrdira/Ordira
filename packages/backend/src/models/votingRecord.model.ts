// src/models/votingRecord.model.ts
import { Schema, model, Document, Types, Model } from 'mongoose';

export interface IVotingRecord extends Document {
  business: Types.ObjectId; // Changed from string to ObjectId for consistency
  proposalId: string;
  voteId: string;
  timestamp: Date;
  
  // UPDATED: Product selection fields (primary voting data)
  selectedProductId: string; // Required - the product that was selected
  productName?: string; // Optional product name for reference
  productImageUrl?: string; // Optional product image URL
  selectionReason?: string; // Optional reason for selection
  
  // Enhanced voter data
  voterAddress?: string;
  voterEmail?: string; // For email gating integration
  
  // Blockchain data
  blockNumber?: number;
  gasUsed?: string;
  transactionHash?: string; // Track which batch transaction included this vote
  batchId?: string; // Reference to batch submission
  
  // Analytics and metadata
  userAgent?: string;
  ipAddress?: string;
  votingSource?: 'web' | 'mobile' | 'api' | 'widget';
  
  // Email gating context
  emailGatingApplied?: boolean;
  emailGatingMode?: 'whitelist' | 'blacklist' | 'disabled';
  gatingRulesMatched?: string[]; // Which rules allowed/denied this vote
  
  // Processing status
  isVerified: boolean;
  verificationHash?: string;
  processedAt?: Date;
  
  // Instance methods
  markAsVerified(hash: string): Promise<IVotingRecord>;
  getAnalyticsData(): any;
  
  createdAt: Date;
  updatedAt: Date;
}

interface IVotingRecordModel extends Model<IVotingRecord> {
  getProductSelectionStats(businessId: string, proposalId?: string): Promise<any[]>;
  getTopProducts(businessId: string, limit?: number): Promise<any[]>;
  getSelectionTrends(businessId: string, days?: number): Promise<any[]>;
  getVoterSelectionHistory(businessId: string, voterAddress: string): Promise<any[]>;
  getAnalytics(businessId: string, startDate: Date, endDate: Date): Promise<any[]>;
  getEmailGatingAnalytics(businessId: string): Promise<any[]>;
}

const VotingRecordSchema = new Schema<IVotingRecord>(
  {
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business reference is required'],
      index: true
    },
    proposalId: {
      type: String,
      required: [true, 'Selection round ID is required'],
      trim: true,
      index: true,
      maxlength: [100, 'Proposal ID cannot exceed 100 characters']
    },
    voteId: {
      type: String,
      required: [true, 'Selection ID is required'],
      unique: true,
      index: true,
      trim: true,
      maxlength: [100, 'Vote ID cannot exceed 100 characters']
    },
    timestamp: {
      type: Date,
      default: () => new Date(),
      index: true
    },
    
    // UPDATED: Product selection fields (replaces voteChoice)
    selectedProductId: {
      type: String,
      required: [true, 'Selected product ID is required'],
      trim: true,
      index: true,
      maxlength: [100, 'Product ID cannot exceed 100 characters'],
      validate: {
        validator: function(v: string) {
          return /^[a-zA-Z0-9_-]+$/.test(v);
        },
        message: 'Product ID can only contain letters, numbers, hyphens and underscores'
      }
    },
    productName: {
      type: String,
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
      index: true,
      sparse: true
    },
    productImageUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true;
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Product image URL must be a valid HTTP/HTTPS URL'
      }
    },
    selectionReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Selection reason cannot exceed 1000 characters']
    },
    
    // Enhanced voter data
    voterAddress: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid voter address format'],
      index: true,
      sparse: true
    },
    voterEmail: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(email: string) {
          if (!email) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Invalid email format'
      },
      index: true,
      sparse: true
    },
    
    // Blockchain data
    blockNumber: {
      type: Number,
      min: [0, 'Block number must be positive'],
      index: true,
      sparse: true
    },
    gasUsed: {
      type: String,
      trim: true,
      validate: {
        validator: function(gas: string) {
          if (!gas) return true;
          return /^\d+$/.test(gas);
        },
        message: 'Gas used must be a numeric string'
      }
    },
    transactionHash: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format'],
      index: true,
      sparse: true
    },
    batchId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
      maxlength: [100, 'Batch ID cannot exceed 100 characters']
    },
    
    // Analytics and metadata
    userAgent: {
      type: String,
      trim: true,
      maxlength: [500, 'User agent cannot exceed 500 characters']
    },
    ipAddress: {
      type: String,
      trim: true,
      validate: {
        validator: function(ip: string) {
          if (!ip) return true;
          // IPv4 or IPv6 validation
          const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6 = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4.test(ip) || ipv6.test(ip);
        },
        message: 'Invalid IP address format'
      }
    },
    votingSource: {
      type: String,
      enum: ['web', 'mobile', 'api', 'widget'],
      default: 'web',
      index: true
    },
    
    // Email gating context
    emailGatingApplied: {
      type: Boolean,
      default: false,
      index: true
    },
    emailGatingMode: {
      type: String,
      enum: ['whitelist', 'blacklist', 'disabled'],
      index: true,
      sparse: true
    },
    gatingRulesMatched: [{
      type: String,
      trim: true,
      maxlength: [100, 'Gating rule name cannot exceed 100 characters']
    }],
    
    // Processing status
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    verificationHash: {
      type: String,
      trim: true,
      match: [/^[a-fA-F0-9]{64}$/, 'Invalid verification hash format'],
      sparse: true
    },
    processedAt: {
      type: Date,
      index: true
    }
  },
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        // Don't expose sensitive data
        delete ret.ipAddress;
        delete ret.verificationHash;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// ===== INDEXES =====

// Core business queries
VotingRecordSchema.index({ business: 1, timestamp: -1 });
VotingRecordSchema.index({ business: 1, proposalId: 1 });

// UPDATED: Product selection indexes (replaces voteChoice indexes)
VotingRecordSchema.index({ business: 1, selectedProductId: 1 });
VotingRecordSchema.index({ business: 1, proposalId: 1, selectedProductId: 1 });
VotingRecordSchema.index({ selectedProductId: 1, timestamp: -1 });

// Voter and email gating indexes
VotingRecordSchema.index({ business: 1, emailGatingApplied: 1 });
VotingRecordSchema.index({ voterAddress: 1, timestamp: -1 });
VotingRecordSchema.index({ voterEmail: 1, timestamp: -1 });

// Blockchain and processing indexes
VotingRecordSchema.index({ proposalId: 1, timestamp: -1 });
VotingRecordSchema.index({ transactionHash: 1 }, { sparse: true });
VotingRecordSchema.index({ batchId: 1 }, { sparse: true });

// Analytics indexes
VotingRecordSchema.index({ business: 1, votingSource: 1, timestamp: -1 });
VotingRecordSchema.index({ business: 1, isVerified: 1, timestamp: -1 });

// TTL index - auto-expire after 2 years for GDPR compliance
VotingRecordSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 730 * 24 * 60 * 60 } // 2 years
);

// ===== VIRTUALS =====

VotingRecordSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.timestamp.getTime()) / (1000 * 60 * 60 * 24));
});

VotingRecordSchema.virtual('isOnChain').get(function() {
  return !!(this.transactionHash && this.blockNumber);
});

VotingRecordSchema.virtual('batchInfo').get(function() {
  return {
    batchId: this.batchId,
    transactionHash: this.transactionHash,
    blockNumber: this.blockNumber,
    gasUsed: this.gasUsed,
    onChain: !!(this.transactionHash && this.blockNumber)
  };
});

VotingRecordSchema.virtual('productInfo').get(function() {
  return {
    selectedProductId: this.selectedProductId,
    productName: this.productName,
    productImageUrl: this.productImageUrl,
    selectionReason: this.selectionReason
  };
});

// ===== INSTANCE METHODS =====

/**
 * Mark vote as verified with hash
 */
VotingRecordSchema.methods.markAsVerified = function(hash: string): Promise<IVotingRecord> {
  this.isVerified = true;
  this.verificationHash = hash;
  this.processedAt = new Date();
  return this.save();
};

/**
 * Get analytics-friendly data representation
 */
VotingRecordSchema.methods.getAnalyticsData = function() {
  return {
    voteId: this.voteId,
    proposalId: this.proposalId,
    selectedProductId: this.selectedProductId,
    productName: this.productName,
    timestamp: this.timestamp,
    votingSource: this.votingSource,
    emailGatingApplied: this.emailGatingApplied,
    emailGatingMode: this.emailGatingMode,
    isVerified: this.isVerified,
    onChain: this.isOnChain,
    daysSinceVote: this.ageInDays
  };
};

// ===== STATIC METHODS =====

/**
 * UPDATED: Get product selection statistics for a business
 */
VotingRecordSchema.statics.getProductSelectionStats = function(businessId: string, proposalId?: string) {
  const match: any = { business: businessId };
  if (proposalId) match.proposalId = proposalId;
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: { 
          proposalId: '$proposalId', 
          selectedProductId: '$selectedProductId' 
        },
        count: { $sum: 1 },
        productName: { $first: '$productName' },
        verifiedCount: { 
          $sum: { $cond: ['$isVerified', 1, 0] } 
        },
        onChainCount: { 
          $sum: { $cond: [{ $and: ['$transactionHash', '$blockNumber'] }, 1, 0] } 
        },
        emailGatedCount: { 
          $sum: { $cond: ['$emailGatingApplied', 1, 0] } 
        },
        lastSelectedAt: { $max: '$timestamp' }
      }
    },
    {
      $group: {
        _id: '$_id.proposalId',
        productSelections: {
          $push: {
            productId: '$_id.selectedProductId',
            productName: '$productName',
            selectionCount: '$count',
            verifiedCount: '$verifiedCount',
            onChainCount: '$onChainCount',
            emailGatedCount: '$emailGatedCount',
            lastSelectedAt: '$lastSelectedAt'
          }
        },
        totalSelections: { $sum: '$count' },
        totalVerified: { $sum: '$verifiedCount' },
        totalOnChain: { $sum: '$onChainCount' },
        totalEmailGated: { $sum: '$emailGatedCount' }
      }
    },
    {
      $addFields: {
        productSelections: {
          $sortArray: {
            input: '$productSelections',
            sortBy: { selectionCount: -1 }
          }
        },
        verificationRate: {
          $cond: [
            { $gt: ['$totalSelections', 0] },
            { $multiply: [{ $divide: ['$totalVerified', '$totalSelections'] }, 100] },
            0
          ]
        },
        onChainRate: {
          $cond: [
            { $gt: ['$totalSelections', 0] },
            { $multiply: [{ $divide: ['$totalOnChain', '$totalSelections'] }, 100] },
            0
          ]
        },
        emailGatingRate: {
          $cond: [
            { $gt: ['$totalSelections', 0] },
            { $multiply: [{ $divide: ['$totalEmailGated', '$totalSelections'] }, 100] },
            0
          ]
        }
      }
    }
  ]);
};

/**
 * Get top products across all selection rounds
 */
VotingRecordSchema.statics.getTopProducts = function(businessId: string, limit: number = 10) {
  return this.aggregate([
    { $match: { business: businessId } },
    {
      $group: {
        _id: '$selectedProductId',
        totalSelections: { $sum: 1 },
        productName: { $first: '$productName' },
        lastSelectedAt: { $max: '$timestamp' },
        uniqueVoters: { $addToSet: '$voterAddress' },
        verifiedSelections: { $sum: { $cond: ['$isVerified', 1, 0] } }
      }
    },
    {
      $addFields: {
        uniqueVoterCount: { $size: '$uniqueVoters' }
      }
    },
    { $sort: { totalSelections: -1 } },
    { $limit: limit },
    {
      $project: {
        productId: '$_id',
        productName: 1,
        totalSelections: 1,
        verifiedSelections: 1,
        uniqueVoterCount: 1,
        lastSelectedAt: 1,
        _id: 0
      }
    }
  ]);
};

/**
 * Get voter selection history
 */
VotingRecordSchema.statics.getVoterSelectionHistory = function(businessId: string, voterAddress: string) {
  return this.find({ 
    business: businessId,
    voterAddress: voterAddress
  })
  .sort({ timestamp: -1 })
  .select('proposalId selectedProductId productName timestamp selectionReason isVerified')
  .lean();
};

/**
 * Get selection trends over time
 */
VotingRecordSchema.statics.getSelectionTrends = function(businessId: string, days: number = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    { 
      $match: { 
        business: businessId,
        timestamp: { $gte: startDate }
      } 
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          productId: '$selectedProductId'
        },
        count: { $sum: 1 },
        productName: { $first: '$productName' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        products: {
          $push: {
            productId: '$_id.productId',
            productName: '$productName',
            selections: '$count'
          }
        },
        totalSelections: { $sum: '$count' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

/**
 * UPDATED: Get analytics for a time period (now includes product selection data)
 */
VotingRecordSchema.statics.getAnalytics = function(
  businessId: string, 
  startDate: Date, 
  endDate: Date
) {
  return this.aggregate([
    {
      $match: {
        business: businessId,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          source: '$votingSource',
          productId: '$selectedProductId'
        },
        count: { $sum: 1 },
        productName: { $first: '$productName' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        sources: {
          $push: {
            source: '$_id.source',
            productId: '$_id.productId',
            productName: '$productName',
            count: '$count'
          }
        },
        totalSelections: { $sum: '$count' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

/**
 * Get email gating effectiveness analytics
 */
VotingRecordSchema.statics.getEmailGatingAnalytics = function(businessId: string) {
  return this.aggregate([
    {
      $match: {
        business: businessId,
        emailGatingApplied: true
      }
    },
    {
      $group: {
        _id: {
          mode: '$emailGatingMode',
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
        },
        count: { $sum: 1 },
        verifiedCount: { $sum: { $cond: ['$isVerified', 1, 0] } }
      }
    },
    {
      $group: {
        _id: '$_id.mode',
        dailyStats: {
          $push: {
            date: '$_id.date',
            selections: '$count',
            verified: '$verifiedCount'
          }
        },
        totalSelections: { $sum: '$count' },
        totalVerified: { $sum: '$verifiedCount' }
      }
    }
  ]);
};

/**
 * Find votes by batch ID
 */
VotingRecordSchema.statics.findByBatch = function(batchId: string) {
  return this.find({ batchId }).sort({ timestamp: 1 });
};

/**
 * Get votes pending blockchain submission
 */
VotingRecordSchema.statics.findPendingBlockchain = function(businessId: string) {
  return this.find({
    business: businessId,
    isVerified: true,
    transactionHash: { $exists: false }
  }).sort({ timestamp: 1 });
};

/**
 * Clean up old unverified votes
 */
VotingRecordSchema.statics.cleanupUnverified = function(olderThanDays: number = 7) {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    isVerified: false,
    timestamp: { $lt: cutoffDate }
  });
};

// ===== PRE/POST HOOKS =====

/**
 * Pre-save processing
 */
VotingRecordSchema.pre('save', function(next) {
  // Set processedAt when marking as verified
  if (this.isModified('isVerified') && this.isVerified && !this.processedAt) {
    this.processedAt = new Date();
  }
  
  // Generate verification hash if verified but no hash
  if (this.isVerified && !this.verificationHash) {
    const crypto = require('crypto');
    const data = `${this.business}-${this.proposalId}-${this.voteId}-${this.selectedProductId}-${this.timestamp.getTime()}`;
    this.verificationHash = crypto.createHash('sha256').update(data).digest('hex');
  }
  
  next();
});

/**
 * Post-save hook for analytics updates
 */
VotingRecordSchema.post('save', function(doc) {
  // Emit events for real-time analytics
  if (doc.isModified('transactionHash')) {
    process.nextTick(() => {
      console.log(`Product selection ${doc.voteId} confirmed on blockchain: ${doc.transactionHash}`);
    });
  }
  
  if (doc.isModified('isVerified')) {
    process.nextTick(() => {
      console.log(`Product selection ${doc.voteId} verification status: ${doc.isVerified ? 'verified' : 'unverified'}`);
    });
  }
  
  // Log product selection for analytics
  if (doc.isNew) {
    process.nextTick(() => {
      console.log(`Product selected: ${doc.selectedProductId} (${doc.productName || 'unknown'}) in round ${doc.proposalId}`);
    });
  }
});

export const VotingRecord = model<IVotingRecord, IVotingRecordModel>('VotingRecord', VotingRecordSchema);

