// src/models/certificates/nftCertificate.model.ts

import { Schema, model, Document, Types } from 'mongoose';
import { logger } from '../../services/infrastructure/logging';

export interface INftCertificate extends Document {
  business: Types.ObjectId; // References Business model
  product: Types.ObjectId; // References Product model
  recipient: string;
  tokenId: string;
  tokenUri: string;
  txHash: string;
  mintedAt: Date;
  
  // Enhanced blockchain data (aligned with service interfaces)
  contractAddress?: string;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  status: 'pending' | 'minted' | 'failed' | 'transferred' | 'pending_transfer' | 'transfer_failed' | 'revoked';
  
  // Auto-transfer functionality (aligned with service auto-transfer)
  mintedToRelayer?: boolean;
  autoTransferEnabled?: boolean;
  transferDelayMinutes?: number;
  maxTransferAttempts?: number;
  transferTimeout?: number;
  transferAttempts?: number;
  nextTransferAttempt?: Date;
  transferredToBrand?: boolean;
  transferredAt?: Date;
  transferTxHash?: string;
  transferFailed?: boolean;
  transferError?: string;
  
  // Certificate metadata (aligned with service mint parameters)
  certificateData?: {
    serialNumber?: string;
    batchNumber?: string;
    qualityScore?: number;
    certificationLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
    validUntil?: Date;
    issuerSignature?: string;
  };
  metadata?: Record<string, any>; // General metadata for NFT
  
  // Transfer tracking (aligned with service transfer history)
  transferHistory?: Array<{
    from: string;
    to: string;
    txHash: string;
    timestamp: Date;
    gasUsed?: string;
    gasPrice?: string;
    reason?: string;
  }>;
  
  // Analytics (aligned with service analytics)
  viewCount: number;
  lastViewedAt?: Date;
  verificationUrl?: string;
  
  // Revocation/Burn tracking (aligned with service burn functionality)
  revoked?: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  revocationTxHash?: string;
  
  // Service tracking
  totalCost?: string;
  deploymentCost?: string;
  
  // Instance methods (aligned with service requirements)
  isValid(): boolean;
  hasExpired(): boolean;
  incrementViewCount(): Promise<INftCertificate>;
  addTransfer(from: string, to: string, txHash: string, gasUsed?: string, gasPrice?: string): Promise<INftCertificate>;
  updateBlockchainData(blockNumber: number, gasUsed?: string, gasPrice?: string): Promise<INftCertificate>;
  scheduleTransfer(delayMinutes?: number): Promise<INftCertificate>;
  markTransferFailed(error: string): Promise<INftCertificate>;
  retryTransfer(): Promise<boolean>;
  canRetryTransfer(): boolean;
  markAsRevoked(reason?: string, txHash?: string): Promise<INftCertificate>;
  calculateTotalCost(): string;
  isOwnedByBrand(): boolean;
  isOwnedByRelayer(): boolean;
  getOwnershipStatus(): 'relayer' | 'brand' | 'external' | 'revoked';
  generateVerificationUrl(): string;
}

const NftCertificateSchema = new Schema<INftCertificate>(
  {
    // Core required fields (aligned with service requirements)
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business', // Aligned with service references
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
    
    // Enhanced blockchain data (aligned with service interfaces)
    contractAddress: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address format'],
      index: true
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
      enum: ['pending', 'minted', 'failed', 'transferred', 'pending_transfer', 'transfer_failed', 'revoked'],
      default: 'minted',
      index: true
    },
    
    // Auto-transfer functionality (aligned with service auto-transfer)
    mintedToRelayer: {
      type: Boolean,
      default: true
    },
    autoTransferEnabled: {
      type: Boolean,
      default: false
    },
    transferDelayMinutes: {
      type: Number,
      min: [0, 'Transfer delay cannot be negative'],
      max: [10080, 'Transfer delay cannot exceed 1 week'], // 7 days in minutes
      default: 5
    },
    maxTransferAttempts: {
      type: Number,
      min: [1, 'Max transfer attempts must be at least 1'],
      max: [10, 'Max transfer attempts cannot exceed 10'],
      default: 3
    },
    transferTimeout: {
      type: Number,
      min: [60000, 'Transfer timeout must be at least 1 minute'], // 1 minute in ms
      max: [3600000, 'Transfer timeout cannot exceed 1 hour'], // 1 hour in ms
      default: 300000 // 5 minutes
    },
    transferAttempts: {
      type: Number,
      default: 0,
      min: [0, 'Transfer attempts cannot be negative']
    },
    nextTransferAttempt: {
      type: Date,
      index: true
    },
    transferredToBrand: {
      type: Boolean,
      default: false,
      index: true
    },
    transferredAt: {
      type: Date,
      index: true
    },
    transferTxHash: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{64}$/, 'Invalid transfer transaction hash format']
    },
    transferFailed: {
      type: Boolean,
      default: false,
      index: true
    },
    transferError: {
      type: String,
      trim: true,
      maxlength: [1000, 'Transfer error cannot exceed 1000 characters']
    },
    
    // Certificate metadata (aligned with service mint parameters)
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
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function(v: any) {
          if (!v) return true;
          try {
            return JSON.stringify(v).length <= 10000; // 10KB limit for metadata
          } catch {
            return false;
          }
        },
        message: 'Metadata size cannot exceed 10KB'
      }
    },
    
    // Transfer tracking (aligned with service transfer history)
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
      },
      gasUsed: {
        type: String,
        trim: true
      },
      gasPrice: {
        type: String,
        trim: true
      },
      reason: {
        type: String,
        trim: true,
        maxlength: [200, 'Transfer reason cannot exceed 200 characters']
      }
    }],
    
    // Analytics (aligned with service analytics)
    viewCount: {
      type: Number,
      default: 0,
      min: [0, 'View count cannot be negative']
    },
    lastViewedAt: {
      type: Date
    },
    verificationUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Verification URL must be a valid HTTP/HTTPS URL'
      }
    },
    
    // Revocation/Burn tracking (aligned with service burn functionality)
    revoked: {
      type: Boolean,
      default: false,
      index: true
    },
    revokedAt: {
      type: Date,
      index: true
    },
    revokedReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Revocation reason cannot exceed 500 characters']
    },
    revocationTxHash: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{64}$/, 'Invalid revocation transaction hash format']
    },
    
    // Service tracking (aligned with service cost calculations)
    totalCost: {
      type: String,
      trim: true,
      default: '0'
    },
    deploymentCost: {
      type: String,
      trim: true,
      default: '0'
    }
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for Performance (optimized for service queries)
NftCertificateSchema.index({ business: 1, tokenId: 1 }, { unique: true });
NftCertificateSchema.index({ business: 1, mintedAt: -1 });
NftCertificateSchema.index({ business: 1, status: 1 });
NftCertificateSchema.index({ business: 1, status: 1, mintedAt: -1 });
NftCertificateSchema.index({ product: 1 });
NftCertificateSchema.index({ recipient: 1 });
NftCertificateSchema.index({ txHash: 1 });
NftCertificateSchema.index({ contractAddress: 1 });
NftCertificateSchema.index({ contractAddress: 1, tokenId: 1 });

// Compound indexes for service operations
NftCertificateSchema.index({ recipient: 1, status: 1 });
NftCertificateSchema.index({ transferredToBrand: 1, status: 1 });
NftCertificateSchema.index({ autoTransferEnabled: 1, status: 1 });
NftCertificateSchema.index({ nextTransferAttempt: 1, transferFailed: 1 });
NftCertificateSchema.index({ revoked: 1, revokedAt: -1 });

// Sparse indexes for optional fields
NftCertificateSchema.index({ transferTxHash: 1 }, { sparse: true });
NftCertificateSchema.index({ revocationTxHash: 1 }, { sparse: true });

// Virtuals (aligned with service return types)
NftCertificateSchema.virtual('recipientType').get(function() {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(this.recipient) ? 'email' : 'wallet';
});

NftCertificateSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.mintedAt.getTime()) / (1000 * 60 * 60 * 24));
});

NftCertificateSchema.virtual('transferCount').get(function() {
  return this.transferHistory?.length || 0;
});

NftCertificateSchema.virtual('isTransferPending').get(function() {
  return this.status === 'pending_transfer' || (
    this.autoTransferEnabled && 
    !this.transferredToBrand && 
    this.status === 'minted'
  );
});

NftCertificateSchema.virtual('canRetry').get(function() {
  return this.transferAttempts < this.maxTransferAttempts && this.status === 'transfer_failed';
});

NftCertificateSchema.virtual('ownershipStatus').get(function() {
  return this.getOwnershipStatus();
});

NftCertificateSchema.virtual('isExpired').get(function() {
  return this.hasExpired();
});

// Instance Methods (aligned with service requirements)
NftCertificateSchema.methods.isValid = function(): boolean {
  if (this.status === 'failed' || this.revoked) return false;
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

NftCertificateSchema.methods.addTransfer = function(
  from: string, 
  to: string, 
  txHash: string, 
  gasUsed?: string, 
  gasPrice?: string
): Promise<INftCertificate> {
  if (!this.transferHistory) this.transferHistory = [];
  
  this.transferHistory.push({
    from,
    to,
    txHash,
    timestamp: new Date(),
    gasUsed,
    gasPrice
  });
  
  this.recipient = to;
  this.transferredToBrand = true;
  this.transferredAt = new Date();
  this.transferTxHash = txHash;
  this.status = 'transferred';
  
  return this.save();
};

NftCertificateSchema.methods.updateBlockchainData = function(
  blockNumber: number, 
  gasUsed?: string, 
  gasPrice?: string
): Promise<INftCertificate> {
  this.blockNumber = blockNumber;
  if (gasUsed) this.gasUsed = gasUsed;
  if (gasPrice) this.gasPrice = gasPrice;
  if (this.status === 'pending') {
    this.status = 'minted';
  }
  
  // Update total cost calculation
  if (gasUsed && gasPrice) {
    try {
      const cost = (BigInt(gasUsed) * BigInt(gasPrice)).toString();
      this.totalCost = cost;
    } catch (error) {
      logger.warn('Failed to calculate total cost:', error);
    }
  }
  
  return this.save();
};

NftCertificateSchema.methods.scheduleTransfer = function(delayMinutes?: number): Promise<INftCertificate> {
  const delay = delayMinutes || this.transferDelayMinutes || 5;
  this.nextTransferAttempt = new Date(Date.now() + delay * 60 * 1000);
  this.status = 'pending_transfer';
  this.autoTransferEnabled = true;
  return this.save();
};

NftCertificateSchema.methods.markTransferFailed = function(error: string): Promise<INftCertificate> {
  this.transferFailed = true;
  this.transferError = error;
  this.status = 'transfer_failed';
  this.transferAttempts = (this.transferAttempts || 0) + 1;
  
  // Schedule next retry if under max attempts
  if (this.transferAttempts < (this.maxTransferAttempts || 3)) {
    const retryDelay = Math.min(this.transferAttempts * 30, 240); // Exponential backoff, max 4 hours
    this.nextTransferAttempt = new Date(Date.now() + retryDelay * 60 * 1000);
  }
  
  return this.save();
};

NftCertificateSchema.methods.retryTransfer = async function(): Promise<boolean> {
  if (!this.canRetryTransfer()) {
    return false;
  }
  
  try {
    // This would typically call the NFT service to retry the transfer
    // For now, we'll simulate the retry logic
    this.transferAttempts = (this.transferAttempts || 0) + 1;
    this.status = 'pending_transfer';
    this.transferFailed = false;
    this.transferError = undefined;
    this.nextTransferAttempt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    await this.save();
    return true;
  } catch (error) {
    await this.markTransferFailed(`Retry failed: ${error.message}`);
    return false;
  }
};

NftCertificateSchema.methods.canRetryTransfer = function(): boolean {
  return (
    this.transferFailed &&
    this.status === 'transfer_failed' &&
    (this.transferAttempts || 0) < (this.maxTransferAttempts || 3) &&
    (!this.nextTransferAttempt || this.nextTransferAttempt <= new Date())
  );
};

NftCertificateSchema.methods.markAsRevoked = function(reason?: string, txHash?: string): Promise<INftCertificate> {
  this.revoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  this.revocationTxHash = txHash;
  this.status = 'revoked';
  return this.save();
};

NftCertificateSchema.methods.calculateTotalCost = function(): string {
  if (this.gasUsed && this.gasPrice) {
    try {
      return (BigInt(this.gasUsed) * BigInt(this.gasPrice)).toString();
    } catch (error) {
      logger.warn('Failed to calculate total cost:', error);
    }
  }
  return this.totalCost || '0';
};

NftCertificateSchema.methods.isOwnedByBrand = function(): boolean {
  return this.transferredToBrand && this.status === 'transferred';
};

NftCertificateSchema.methods.isOwnedByRelayer = function(): boolean {
  return !this.transferredToBrand && ['minted', 'pending_transfer', 'transfer_failed'].includes(this.status);
};

NftCertificateSchema.methods.getOwnershipStatus = function(): 'relayer' | 'brand' | 'external' | 'revoked' {
  if (this.revoked) return 'revoked';
  if (this.isOwnedByBrand()) return 'brand';
  if (this.isOwnedByRelayer()) return 'relayer';
  return 'external';
};

NftCertificateSchema.methods.generateVerificationUrl = function(): string {
  if (this.verificationUrl) return this.verificationUrl;
  
  const baseUrl = process.env.FRONTEND_BASE_URL || 'https://app.example.com';
  const url = `${baseUrl}/verify/${this.contractAddress}/${this.tokenId}`;
  this.verificationUrl = url;
  return url;
};

// Static Methods (aligned with service search methods)
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

NftCertificateSchema.statics.findByStatus = function(businessId: string, status: string) {
  return this.find({ business: businessId, status })
    .populate('product', 'title sku')
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
        avgQualityScore: { $avg: '$certificateData.qualityScore' },
        totalGasUsed: { $sum: { $toDouble: '$gasUsed' } }
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
    status: { $in: ['minted', 'transferred'] },
    revoked: { $ne: true }
  }).populate(['business', 'product']);
};

NftCertificateSchema.statics.getPopularCertificates = function(businessId: string, limit: number = 10) {
  return this.find({ 
    business: businessId,
    status: { $in: ['minted', 'transferred'] },
    revoked: { $ne: true }
  })
    .sort({ viewCount: -1, mintedAt: -1 })
    .limit(limit)
    .populate('product', 'title');
};

// Analytics methods (aligned with service analytics)
NftCertificateSchema.statics.getCertificateAnalytics = function(businessId: string) {
  return this.aggregate([
    { $match: { business: new Types.ObjectId(businessId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        minted: { $sum: { $cond: [{ $eq: ['$status', 'minted'] }, 1, 0] } },
        transferred: { $sum: { $cond: [{ $eq: ['$status', 'transferred'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'transfer_failed'] }, 1, 0] } },
        revoked: { $sum: { $cond: ['$revoked', 1, 0] } },
        totalViews: { $sum: '$viewCount' },
        totalGasUsed: { $sum: { $toDouble: '$gasUsed' } },
        avgTransferTime: { $avg: { $subtract: ['$transferredAt', '$mintedAt'] } }
      }
    }
  ]);
};

NftCertificateSchema.statics.getOwnershipStats = function(businessId: string) {
  return this.aggregate([
    { $match: { business: new Types.ObjectId(businessId) } },
    {
      $group: {
        _id: null,
        relayerHeld: { 
          $sum: { 
            $cond: [
              { $and: [{ $eq: ['$transferredToBrand', false] }, { $ne: ['$revoked', true] }] }, 
              1, 
              0
            ] 
          }
        },
        brandOwned: { 
          $sum: { 
            $cond: [
              { $and: [{ $eq: ['$transferredToBrand', true] }, { $ne: ['$revoked', true] }] }, 
              1, 
              0
            ] 
          }
        },
        revoked: { $sum: { $cond: ['$revoked', 1, 0] } }
      }
    }
  ]);
};

NftCertificateSchema.statics.getPendingTransfers = function(businessId: string) {
  return this.find({
    business: businessId,
    status: 'pending_transfer',
    autoTransferEnabled: true,
    nextTransferAttempt: { $lte: new Date() }
  }).sort({ nextTransferAttempt: 1 });
};

NftCertificateSchema.statics.getFailedTransfers = function(businessId: string, limit: number = 10) {
  return this.find({
    business: businessId,
    transferFailed: true,
    status: 'transfer_failed',
    transferAttempts: { $lt: 3 },
    nextTransferAttempt: { $lte: new Date() }
  }).limit(limit);
};

NftCertificateSchema.statics.getRecentActivity = function(businessId: string, limit: number = 10) {
  return this.find({ business: businessId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('tokenId status transferredAt transferTxHash mintedAt txHash')
    .lean();
};

// Pre-save middleware (aligned with service validation)
NftCertificateSchema.pre('save', function(next) {
  // Set mintedAt when status changes to minted
  if (this.isModified('status') && this.status === 'minted' && !this.mintedAt) {
    this.mintedAt = new Date();
  }
  
  // Generate verification URL if not set
  if (!this.verificationUrl && this.contractAddress && this.tokenId) {
    this.verificationUrl = this.generateVerificationUrl();
  }
  
  // Auto-schedule transfer for new minted certificates
  if (this.isNew && this.autoTransferEnabled && this.status === 'minted') {
    const delay = this.transferDelayMinutes || 5;
    this.nextTransferAttempt = new Date(Date.now() + delay * 60 * 1000);
    this.status = 'pending_transfer';
  }
  
  // Validate transfer attempts don't exceed maximum
  if (this.transferAttempts && this.transferAttempts > (this.maxTransferAttempts || 3)) {
    this.transferAttempts = this.maxTransferAttempts || 3;
  }
  
  next();
});

// Post-save middleware for analytics and notifications
NftCertificateSchema.post('save', function(doc) {
  // Log minting events
  if (this.isNew && doc.status === 'minted') {
    logger.info('NFT Certificate minted: Token ${doc.tokenId} for business ${doc.business}');
  }
  
  // Log transfer events
  if (this.isModified('transferredToBrand') && doc.transferredToBrand) {
    logger.info('NFT Certificate transferred to brand: Token ${doc.tokenId}');
  }
  
  // Log failed transfers
  if (this.isModified('transferFailed') && doc.transferFailed) {
    logger.info('NFT Certificate transfer failed: Token ${doc.tokenId} - ${doc.transferError}');
  }
  
  // Log revocations
  if (this.isModified('revoked') && doc.revoked) {
    logger.info('NFT Certificate revoked: Token ${doc.tokenId} - ${doc.revokedReason}');
  }
});

/**
 * Pre-remove hook for cleanup (document-level)
 */
NftCertificateSchema.pre('remove', function(this: INftCertificate, next) {
  logger.info('Removing NFT certificate: Token ${this.tokenId}');
  next();
});

/**
 * Pre-deleteOne hook for cleanup (query-level)
 */
NftCertificateSchema.pre(['deleteOne', 'findOneAndDelete'], async function() {
  try {
    // Get the document that will be deleted
    const doc = await this.model.findOne(this.getQuery()) as INftCertificate;
    if (doc) {
      logger.info('Removing NFT certificate: Token ${doc.tokenId}');
    }
  } catch (error) {
    logger.error('Error in pre-delete hook:', error);
  }
});

// Certificate model with proper typing
export const NftCertificate = model<INftCertificate>('NftCertificate', NftCertificateSchema);

// Additional utility type for the Certificate model (backward compatibility)
export const Certificate = NftCertificate;

