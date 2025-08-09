// src/models/nftCertificate.model.ts

import { Schema, model, Document, Types } from 'mongoose';

export interface INftCertificate extends Document {
  business: Types.ObjectId;
  product: Types.ObjectId;
  recipient: string;
  tokenId: string;
  tokenUri: string;
  txHash: string;
  mintedAt: Date;
  
  // Enhanced blockchain data
  contractAddress?: string;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  status: 'pending' | 'minted' | 'failed' | 'transferred';
  
  // Certificate metadata
  certificateData?: {
    serialNumber?: string;
    batchNumber?: string;
    qualityScore?: number;
    certificationLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
    validUntil?: Date;
    issuerSignature?: string;
  };
  
  // Transfer tracking
  transferHistory?: Array<{
    from: string;
    to: string;
    txHash: string;
    timestamp: Date;
  }>;
  
  // Analytics
  viewCount: number;
  lastViewedAt?: Date;
  
  // Instance methods
  isValid(): boolean;
  hasExpired(): boolean;
  incrementViewCount(): Promise<INftCertificate>;
  addTransfer(from: string, to: string, txHash: string): Promise<INftCertificate>;
}

const NftCertificateSchema = new Schema<INftCertificate>(
  {
    business: {
      type: Schema.Types.ObjectId,
      ref: 'BrandSettings',
      required: [true, 'Business reference is required'],
      index: true
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true
    },
    recipient: { 
      type: String, 
      required: [true, 'Recipient is required'],
      trim: true,
      validate: {
        validator: function(v: string) {
          const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
          const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
          return emailRegex.test(v) || ethAddressRegex.test(v);
        },
        message: 'Recipient must be a valid email or Ethereum address'
      },
      index: true
    },
    tokenId: { 
      type: String, 
      required: [true, 'Token ID is required'],
      trim: true,
      index: true
    },
    tokenUri: { 
      type: String, 
      required: [true, 'Token URI is required'],
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v) || /^ipfs:\/\/.+/.test(v);
        },
        message: 'Token URI must be a valid HTTP/HTTPS or IPFS URL'
      }
    },
    txHash: { 
      type: String, 
      required: [true, 'Transaction hash is required'],
      trim: true,
      match: [/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format'],
      index: true
    },
    mintedAt: { 
      type: Date, 
      default: () => new Date(),
      index: true
    },
    
    // Enhanced blockchain data
    contractAddress: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address format']
    },
    blockNumber: {
      type: Number,
      min: [0, 'Block number must be positive']
    },
    gasUsed: {
      type: String,
      trim: true
    },
    gasPrice: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'minted', 'failed', 'transferred'],
      default: 'minted',
      index: true
    },
    
    // Certificate metadata
    certificateData: {
      serialNumber: {
        type: String,
        trim: true,
        maxlength: [100, 'Serial number cannot exceed 100 characters']
      },
      batchNumber: {
        type: String,
        trim: true,
        maxlength: [100, 'Batch number cannot exceed 100 characters']
      },
      qualityScore: {
        type: Number,
        min: [0, 'Quality score cannot be negative'],
        max: [100, 'Quality score cannot exceed 100']
      },
      certificationLevel: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum']
      },
      validUntil: {
        type: Date,
        validate: {
          validator: function(v: Date) {
            return !v || v > new Date();
          },
          message: 'Valid until date must be in the future'
        }
      },
      issuerSignature: {
        type: String,
        trim: true,
        maxlength: [500, 'Issuer signature cannot exceed 500 characters']
      }
    },
    
    // Transfer tracking
    transferHistory: [{
      from: {
        type: String,
        required: true,
        trim: true,
        match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid from address format']
      },
      to: {
        type: String,
        required: true,
        trim: true,
        match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid to address format']
      },
      txHash: {
        type: String,
        required: true,
        trim: true,
        match: [/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format']
      },
      timestamp: {
        type: Date,
        default: Date.now,
        required: true
      }
    }],
    
    // Analytics
    viewCount: {
      type: Number,
      default: 0,
      min: [0, 'View count cannot be negative']
    },
    lastViewedAt: {
      type: Date
    }
  },
  {
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for performance and uniqueness
NftCertificateSchema.index({ business: 1, tokenId: 1 }, { unique: true });
NftCertificateSchema.index({ business: 1, mintedAt: 1 });
NftCertificateSchema.index({ product: 1 });
NftCertificateSchema.index({ recipient: 1 });
NftCertificateSchema.index({ txHash: 1 });
NftCertificateSchema.index({ status: 1 });
NftCertificateSchema.index({ contractAddress: 1 });

// Compound indexes for monthly usage queries
NftCertificateSchema.index({ business: 1, status: 1, mintedAt: 1 });
NftCertificateSchema.index({ recipient: 1, status: 1 });

// Virtual for recipient type
NftCertificateSchema.virtual('recipientType').get(function() {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(this.recipient) ? 'email' : 'wallet';
});

// Virtual for age in days
NftCertificateSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.mintedAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual for transfer count
NftCertificateSchema.virtual('transferCount').get(function() {
  return this.transferHistory?.length || 0;
});

// Instance methods
NftCertificateSchema.methods.isValid = function(): boolean {
  if (this.status === 'failed') return false;
  if (this.certificateData?.validUntil && this.certificateData.validUntil < new Date()) {
    return false;
  }
  return true;
};

NftCertificateSchema.methods.hasExpired = function(): boolean {
  return !!(this.certificateData?.validUntil && this.certificateData.validUntil < new Date());
};

NftCertificateSchema.methods.incrementViewCount = function(): Promise<INftCertificate> {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

NftCertificateSchema.methods.addTransfer = function(from: string, to: string, txHash: string): Promise<INftCertificate> {
  if (!this.transferHistory) this.transferHistory = [];
  
  this.transferHistory.push({
    from,
    to,
    txHash,
    timestamp: new Date()
  });
  
  this.recipient = to;
  this.status = 'transferred';
  
  return this.save();
};

NftCertificateSchema.methods.updateBlockchainData = function(blockNumber: number, gasUsed?: string, gasPrice?: string): Promise<INftCertificate> {
  this.blockNumber = blockNumber;
  if (gasUsed) this.gasUsed = gasUsed;
  if (gasPrice) this.gasPrice = gasPrice;
  this.status = 'minted';
  return this.save();
};

// Static methods
NftCertificateSchema.statics.findByBusiness = function(businessId: string) {
  return this.find({ business: businessId })
    .populate('product', 'title sku')
    .sort({ mintedAt: -1 });
};

NftCertificateSchema.statics.findByRecipient = function(recipient: string) {
  return this.find({ recipient })
    .populate(['business', 'product'])
    .sort({ mintedAt: -1 });
};

NftCertificateSchema.statics.findByContract = function(contractAddress: string) {
  return this.find({ contractAddress })
    .sort({ mintedAt: -1 });
};

NftCertificateSchema.statics.getMonthlyUsage = function(businessId: string, startDate: Date, endDate: Date) {
  return this.countDocuments({
    business: businessId,
    mintedAt: { $gte: startDate, $lte: endDate },
    status: { $in: ['minted', 'transferred'] }
  });
};

NftCertificateSchema.statics.getBusinessStats = function(businessId: string) {
  return this.aggregate([
    { $match: { business: new Types.ObjectId(businessId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalViews: { $sum: '$viewCount' },
        avgQualityScore: { $avg: '$certificateData.qualityScore' }
      }
    }
  ]);
};

NftCertificateSchema.statics.findExpiring = function(days: number = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    'certificateData.validUntil': { 
      $lte: futureDate,
      $gte: new Date()
    },
    status: { $in: ['minted', 'transferred'] }
  }).populate(['business', 'product']);
};

NftCertificateSchema.statics.getPopularCertificates = function(businessId: string, limit: number = 10) {
  return this.find({ 
    business: businessId,
    status: { $in: ['minted', 'transferred'] }
  })
    .sort({ viewCount: -1, mintedAt: -1 })
    .limit(limit)
    .populate('product', 'title');
};

// Pre-save middleware
NftCertificateSchema.pre('save', function(next) {
  // Set mintedAt when status changes to minted
  if (this.isModified('status') && this.status === 'minted' && !this.mintedAt) {
    this.mintedAt = new Date();
  }
  
  next();
});

export const NftCertificate = model<INftCertificate>('NftCertificate', NftCertificateSchema);
