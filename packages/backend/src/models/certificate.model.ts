// src/models/certificate.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface ICertificate extends Document {
  business: Types.ObjectId;
  product: Types.ObjectId;
  recipient: string;
  tokenId: string;
  tokenUri: string;
  txHash: string;
  
  // Enhanced fields
  contractAddress?: string;
  blockNumber?: number;
  gasUsed?: string;
  status: 'pending' | 'minted' | 'failed' | 'transferred';
  mintedAt?: Date;
  transferredAt?: Date;
  
  // Metadata
  certificateData?: {
    productName?: string;
    serialNumber?: string;
    manufacturingDate?: Date;
    expiryDate?: Date;
    batchNumber?: string;
    qualityCertifications?: string[];
  };
  
  // Analytics
  viewCount: number;
  lastViewedAt?: Date;
  
  // Instance methods
  isValid(): boolean;
  hasExpired(): boolean;
  incrementViewCount(): Promise<ICertificate>;
  
  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema = new Schema<ICertificate>({
  business: { 
    type: Schema.Types.ObjectId, 
    ref: 'Business', 
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
        // Validate email or Ethereum address
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
        return emailRegex.test(v) || ethAddressRegex.test(v);
      },
      message: 'Recipient must be a valid email or Ethereum address'
    }
  },
  tokenId: { 
    type: String, 
    required: [true, 'Token ID is required'],
    trim: true,
    index: true
  },
  tokenUri: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v) || /^ipfs:\/\/.+/.test(v);
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
  status: {
    type: String,
    enum: ['pending', 'minted', 'failed', 'transferred'],
    default: 'pending',
    index: true
  },
  mintedAt: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return !v || v <= new Date();
      },
      message: 'Minted date cannot be in the future'
    }
  },
  transferredAt: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return !v || v <= new Date();
      },
      message: 'Transferred date cannot be in the future'
    }
  },
  
  // Certificate metadata
  certificateData: {
    productName: {
      type: String,
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters']
    },
    serialNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Serial number cannot exceed 100 characters']
    },
    manufacturingDate: {
      type: Date,
      validate: {
        validator: function(v: Date) {
          return !v || v <= new Date();
        },
        message: 'Manufacturing date cannot be in the future'
      }
    },
    expiryDate: {
      type: Date,
      validate: {
        validator: function(v: Date) {
          return !v || v > new Date();
        },
        message: 'Expiry date must be in the future'
      }
    },
    batchNumber: {
      type: String,
      trim: true,
      maxlength: [100, 'Batch number cannot exceed 100 characters']
    },
    qualityCertifications: [{
      type: String,
      trim: true,
      maxlength: [100, 'Quality certification cannot exceed 100 characters']
    }]
  },
  
  // Analytics
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative']
  },
  lastViewedAt: {
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
  }
});

// Indexes for performance
CertificateSchema.index({ business: 1, createdAt: -1 });
CertificateSchema.index({ product: 1 });
CertificateSchema.index({ recipient: 1 });
CertificateSchema.index({ tokenId: 1 });
CertificateSchema.index({ txHash: 1 });
CertificateSchema.index({ status: 1 });
CertificateSchema.index({ mintedAt: -1 });

// Compound indexes
CertificateSchema.index({ business: 1, status: 1 });
CertificateSchema.index({ business: 1, product: 1 });
CertificateSchema.index({ recipient: 1, status: 1 });

// Unique constraint to prevent duplicate certificates
CertificateSchema.index({ business: 1, tokenId: 1 }, { unique: true });

// Virtual for recipient type
CertificateSchema.virtual('recipientType').get(function() {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(this.recipient) ? 'email' : 'wallet';
});

// Virtual for age in days
CertificateSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Instance methods
CertificateSchema.methods.isValid = function(): boolean {
  if (this.status === 'failed') return false;
  if (this.certificateData?.expiryDate && this.certificateData.expiryDate < new Date()) {
    return false;
  }
  return true;
};

CertificateSchema.methods.hasExpired = function(): boolean {
  return !!(this.certificateData?.expiryDate && this.certificateData.expiryDate < new Date());
};

CertificateSchema.methods.incrementViewCount = function(): Promise<ICertificate> {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

CertificateSchema.methods.markAsMinted = function(blockNumber?: number, gasUsed?: string): Promise<ICertificate> {
  this.status = 'minted';
  this.mintedAt = new Date();
  if (blockNumber) this.blockNumber = blockNumber;
  if (gasUsed) this.gasUsed = gasUsed;
  return this.save();
};

CertificateSchema.methods.markAsTransferred = function(): Promise<ICertificate> {
  this.status = 'transferred';
  this.transferredAt = new Date();
  return this.save();
};

// Static methods
CertificateSchema.statics.findByBusiness = function(businessId: string) {
  return this.find({ business: businessId }).populate('product', 'title sku').sort({ createdAt: -1 });
};

CertificateSchema.statics.findByRecipient = function(recipient: string) {
  return this.find({ recipient }).populate(['business', 'product']).sort({ createdAt: -1 });
};

CertificateSchema.statics.findByStatus = function(status: string) {
  return this.find({ status }).sort({ createdAt: -1 });
};

CertificateSchema.statics.getBusinessStats = function(businessId: string) {
  return this.aggregate([
    { $match: { business: new Types.ObjectId(businessId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalViews: { $sum: '$viewCount' }
      }
    }
  ]);
};

CertificateSchema.statics.findExpiring = function(days: number = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    'certificateData.expiryDate': { 
      $lte: futureDate,
      $gte: new Date()
    },
    status: { $in: ['minted', 'transferred'] }
  }).populate(['business', 'product']);
};

// Pre-save middleware
CertificateSchema.pre('save', function(next) {
  // Set mintedAt when status changes to minted
  if (this.isModified('status') && this.status === 'minted' && !this.mintedAt) {
    this.mintedAt = new Date();
  }
  
  // Set transferredAt when status changes to transferred
  if (this.isModified('status') && this.status === 'transferred' && !this.transferredAt) {
    this.transferredAt = new Date();
  }
  
  next();
});

export const Certificate = model<ICertificate>('Certificate', CertificateSchema);
