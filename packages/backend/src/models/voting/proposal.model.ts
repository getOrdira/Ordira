// src/models/voting/proposal.model.ts
import { Schema, model, Document, Types } from 'mongoose';
import { logger } from '../../services/infrastructure/logging/index'; 

export type ProposalStatus = 'draft' | 'active' | 'completed' | 'cancelled' | 'deactivated';

export interface IProposal extends Document {
  // Basic proposal information
  proposalId: string; // Unique ID (can match blockchain proposalId once deployed)
  title: string;
  description: string;
  category?: string;
  
  // Owner and association
  businessId: Types.ObjectId;
  
  // Rich media
  imageUrl?: string;
  media?: Types.ObjectId[]; // References to Media model
  
  // Blockchain integration
  blockchainProposalId?: string; // ID from smart contract
  contractAddress?: string; // Voting contract address
  metadataUri?: string; // IPFS or other URI for blockchain metadata
  txHash?: string; // Transaction hash of creation
  
  // Status and lifecycle
  status: ProposalStatus;
  startTime?: Date; // When voting starts
  endTime?: Date; // When voting ends
  duration?: number; // Duration in seconds
  
  // Products being voted on
  productIds: Types.ObjectId[]; // Products that can be selected in this proposal
  
  // Voting settings
  allowMultipleSelections: boolean;
  maxSelections?: number;
  requireReason: boolean; // Require users to explain their selection
  
  // Analytics
  voteCount: number;
  participantCount: number;
  viewCount: number;
  
  // Metadata
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  
  // Instance methods
  activate(): Promise<IProposal>;
  deactivate(): Promise<IProposal>;
  complete(): Promise<IProposal>;
  cancel(): Promise<IProposal>;
  incrementVoteCount(): Promise<IProposal>;
  incrementParticipantCount(): Promise<IProposal>;
  incrementViewCount(): Promise<IProposal>;
  isActive(): boolean;
  canVote(): boolean;
  addProduct(productId: string): Promise<IProposal>;
  removeProduct(productId: string): Promise<IProposal>;
}

const ProposalSchema = new Schema<IProposal>({
  proposalId: {
    type: String,
    required: [true, 'Proposal ID is required'],
    unique: true,
    trim: true,
    index: true,
    maxlength: [100, 'Proposal ID cannot exceed 100 characters']
  },
  
  title: {
    type: String,
    required: [true, 'Proposal title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: true
  },
  
  description: {
    type: String,
    required: [true, 'Proposal description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters'],
    index: true
  },
  
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: [true, 'Business ID is required'],
    index: true
  },
  
  imageUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Image URL must be a valid HTTP/HTTPS URL'
    }
  },
  
  media: [{
    type: Types.ObjectId,
    ref: 'Media',
    validate: {
      validator: function(media: Types.ObjectId[]) {
        return media.length <= 10;
      },
      message: 'Proposal cannot have more than 10 media files'
    }
  }],
  
  // Blockchain fields
  blockchainProposalId: {
    type: String,
    trim: true,
    sparse: true,
    index: true
  },
  
  contractAddress: {
    type: String,
    trim: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format']
  },
  
  metadataUri: {
    type: String,
    trim: true
  },
  
  txHash: {
    type: String,
    trim: true,
    match: [/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format']
  },
  
  // Status
  status: {
    type: String,
    enum: {
      values: ['draft', 'active', 'completed', 'cancelled', 'deactivated'],
      message: 'Status must be draft, active, completed, cancelled, or deactivated'
    },
    default: 'draft',
    index: true
  },
  
  startTime: {
    type: Date,
    index: true
  },
  
  endTime: {
    type: Date,
    index: true,
    validate: {
      validator: function(this: IProposal, v: Date) {
        return !v || !this.startTime || v > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  
  duration: {
    type: Number,
    min: [0, 'Duration cannot be negative'],
    max: [365 * 24 * 60 * 60, 'Duration cannot exceed 1 year']
  },
  
  // Products
  productIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
    validate: {
      validator: function(products: Types.ObjectId[]) {
        return products.length > 0 && products.length <= 100;
      },
      message: 'Proposal must have between 1 and 100 products'
    }
  }],
  
  // Voting settings
  allowMultipleSelections: {
    type: Boolean,
    default: false
  },
  
  maxSelections: {
    type: Number,
    min: [1, 'Max selections must be at least 1'],
    max: [50, 'Max selections cannot exceed 50'],
    validate: {
      validator: function(this: IProposal, v: number) {
        return !this.allowMultipleSelections || (v && v > 0);
      },
      message: 'Max selections is required when multiple selections are allowed'
    }
  },
  
  requireReason: {
    type: Boolean,
    default: false
  },
  
  // Analytics
  voteCount: {
    type: Number,
    default: 0,
    min: [0, 'Vote count cannot be negative'],
    index: true
  },
  
  participantCount: {
    type: Number,
    default: 0,
    min: [0, 'Participant count cannot be negative']
  },
  
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative']
  },
  
  // Metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high'],
      message: 'Priority must be low, medium, or high'
    },
    default: 'medium',
    index: true
  },
  
  publishedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
});

// ====================
// INDEXES FOR PERFORMANCE
// ====================

// Primary business queries
ProposalSchema.index({ businessId: 1, status: 1, createdAt: -1 });
ProposalSchema.index({ businessId: 1, category: 1, status: 1 });

// Status and time-based queries
ProposalSchema.index({ status: 1, startTime: 1 });
ProposalSchema.index({ status: 1, endTime: 1 });
ProposalSchema.index({ status: 1, createdAt: -1 });

// Analytics queries
ProposalSchema.index({ voteCount: -1, createdAt: -1 });
ProposalSchema.index({ participantCount: -1, createdAt: -1 });

// Blockchain integration
ProposalSchema.index({ contractAddress: 1, blockchainProposalId: 1 });

// Text search
ProposalSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    tags: 8
  }
});

// ====================
// VIRTUALS
// ====================

ProposalSchema.virtual('isExpired').get(function() {
  return this.endTime && this.endTime < new Date();
});

ProposalSchema.virtual('isScheduled').get(function() {
  return this.startTime && this.startTime > new Date();
});

ProposalSchema.virtual('timeRemaining').get(function() {
  if (!this.endTime) return null;
  const remaining = this.endTime.getTime() - Date.now();
  return remaining > 0 ? remaining : 0;
});

ProposalSchema.virtual('engagementRate').get(function() {
  if (this.viewCount === 0) return 0;
  return Math.round((this.participantCount / this.viewCount) * 100);
});

// ====================
// INSTANCE METHODS
// ====================

ProposalSchema.methods.activate = function(): Promise<IProposal> {
  this.status = 'active';
  if (!this.publishedAt) {
    this.publishedAt = new Date();
  }
  if (!this.startTime) {
    this.startTime = new Date();
  }
  logger.info('Proposal activated', { proposalId: this.proposalId });
  return this.save();
};

ProposalSchema.methods.deactivate = function(): Promise<IProposal> {
  if (this.status === 'active') {
    this.status = 'deactivated';
    logger.info('Proposal deactivated', { proposalId: this.proposalId });
  }
  return this.save();
};

ProposalSchema.methods.complete = function(): Promise<IProposal> {
  this.status = 'completed';
  if (!this.endTime) {
    this.endTime = new Date();
  }
  logger.info('Proposal completed', { proposalId: this.proposalId });
  return this.save();
};

ProposalSchema.methods.cancel = function(): Promise<IProposal> {
  this.status = 'cancelled';
  logger.info('Proposal cancelled', { proposalId: this.proposalId });
  return this.save();
};

ProposalSchema.methods.incrementVoteCount = function(): Promise<IProposal> {
  this.voteCount = (this.voteCount || 0) + 1;
  return this.save();
};

ProposalSchema.methods.incrementParticipantCount = function(): Promise<IProposal> {
  this.participantCount = (this.participantCount || 0) + 1;
  return this.save();
};

ProposalSchema.methods.incrementViewCount = function(): Promise<IProposal> {
  this.viewCount = (this.viewCount || 0) + 1;
  return this.save();
};

ProposalSchema.methods.isActive = function(): boolean {
  if (this.status !== 'active') return false;
  const now = new Date();
  if (this.startTime && this.startTime > now) return false;
  if (this.endTime && this.endTime < now) return false;
  return true;
};

ProposalSchema.methods.canVote = function(): boolean {
  return this.isActive();
};

ProposalSchema.methods.addProduct = function(productId: string): Promise<IProposal> {
  if (!this.productIds.includes(productId as any)) {
    this.productIds.push(productId as any);
  }
  return this.save();
};

ProposalSchema.methods.removeProduct = function(productId: string): Promise<IProposal> {
  this.productIds = this.productIds.filter(id => id.toString() !== productId);
  return this.save();
};

// ====================
// STATIC METHODS
// ====================

ProposalSchema.statics.findActiveProposals = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    $or: [
      { startTime: { $lte: now } },
      { startTime: null }
    ],
  }).sort({ createdAt: -1 });
};

ProposalSchema.statics.findByBusiness = function(businessId: string, status?: ProposalStatus) {
  const query: any = { businessId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

ProposalSchema.statics.searchProposals = function(businessId: string, searchTerm: string) {
  return this.find({
    businessId,
    $text: { $search: searchTerm }
  }, {
    score: { $meta: 'textScore' }
  }).sort({
    score: { $meta: 'textScore' },
    createdAt: -1
  });
};

ProposalSchema.statics.getProposalStats = function(businessId: string) {
  return this.aggregate([
    { $match: { businessId: businessId as any } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalVotes: { $sum: '$voteCount' },
        totalParticipants: { $sum: '$participantCount' },
        averageVotes: { $avg: '$voteCount' }
      }
    }
  ]);
};

// ====================
// MIDDLEWARE
// ====================

// Pre-save: Clean up data
ProposalSchema.pre('save', function(next) {
  // Deduplicate tags
  if (this.tags && this.tags.length > 0) {
    this.tags = [...new Set(
      this.tags
        .filter(tag => tag && tag.trim())
        .map(tag => tag.toLowerCase().trim())
    )];
  }
  
  // Auto-set end time if duration is provided
  if (this.isModified('duration') && this.duration && this.startTime && !this.endTime) {
    this.endTime = new Date(this.startTime.getTime() + (this.duration * 1000));
  }
  
  // Auto-set publishedAt when activated
  if (this.isModified('status') && this.status === 'active' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

export const Proposal = model<IProposal>('Proposal', ProposalSchema);


