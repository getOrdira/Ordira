// src/models/certificate.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface ICertificate extends Document {
  business: Types.ObjectId;
  product: string;
  recipient: string;  // Customer email or contact
  tokenId: string;
  txHash: string;
  contractAddress?: string;
  
  // Enhanced transfer tracking fields (from controller and service)
  status: 'minted' | 'pending_transfer' | 'transferred_to_brand' | 'transfer_failed' | 'revoked';
  mintedToRelayer: boolean;
  transferredToBrand?: boolean;
  brandWallet?: string;
  transferTxHash?: string;
  transferredAt?: Date;
  transferFailed?: boolean;
  transferError?: string;
  transferAttempts: number;
  maxTransferAttempts: number;
  nextTransferAttempt?: Date;
  
  // Transfer automation settings (referenced in service)
  autoTransferEnabled: boolean;
  transferDelayMinutes: number;
  transferTimeout: number;
  transferScheduled?: boolean; // Referenced in controller
  transferDelay?: number; // Referenced in controller
  gasUsed?: string; // Referenced in controller
  
  // Certificate metadata (aligned with controller structure)
  metadata?: {
    customMessage?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
      display_type?: string;
    }>;
    expirationDate?: Date;
    certificateLevel?: 'bronze' | 'silver' | 'gold' | 'platinum';
  };
  
  // Delivery options (from controller)
  deliveryOptions?: {
    scheduleDate?: Date;
    priority?: 'standard' | 'priority' | 'urgent';
    notifyRecipient?: boolean;
  };
  
  // Web3 options (from controller)
  web3Options?: {
    autoTransfer?: boolean;
    transferDelay?: number;
    brandWallet?: string;
    requireCustomerConfirmation?: boolean;
    gasOptimization?: boolean;
  };
  
  // Batch processing fields (from service)
  batchId?: string;
  batchRequest?: boolean;
  templateId?: string;
  
  // Delivery tracking (from service)
  delivered?: boolean;
  deliveredAt?: Date;
  deliveryMethod?: string;
  deliveryId?: string;
  deliveryScheduled?: boolean;
  scheduledDeliveryDate?: Date;
  scheduledDeliveryId?: string;
  
  // Analytics and tracking
  viewCount: number;
  lastViewedAt?: Date;
  verificationUrl?: string;
  
  // Revocation
  revoked?: boolean;
  revokedAt?: Date;
  revokedReason?: string;
  
  // Instance methods (from both files)
  incrementViewCount(): Promise<ICertificate>;
  isTransferredToBrand(): boolean;
  canBeTransferred(): boolean;
  getOwnershipStatus(): 'relayer' | 'brand' | 'failed' | 'revoked';
  scheduleTransfer(): Promise<void>;
  executeTransfer(): Promise<boolean>;
  retryTransfer(): Promise<boolean>;
  
  createdAt: Date;
  updatedAt: Date;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    business: { 
      type: Schema.Types.ObjectId, 
      ref: 'Business', 
      required: [true, 'Business reference is required'],
      index: true
    },
    product: { 
      type: String, 
      required: [true, 'Product ID is required'],
      trim: true,
      maxlength: [200, 'Product ID cannot exceed 200 characters'],
      index: true
    },
    recipient: { 
      type: String, 
      required: [true, 'Recipient is required'],
      trim: true,
      maxlength: [255, 'Recipient cannot exceed 255 characters'],
      index: true
    },
    tokenId: { 
      type: String, 
      required: [true, 'Token ID is required'],
      trim: true,
      index: true
    },
    txHash: { 
      type: String, 
      required: [true, 'Transaction hash is required'],
      trim: true,
      match: [/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format'],
      index: true
    },
    contractAddress: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address format'],
      index: true
    },
    
    // Enhanced transfer tracking fields
    status: {
      type: String,
      enum: ['minted', 'pending_transfer', 'transferred_to_brand', 'transfer_failed', 'revoked'],
      default: 'minted',
      required: true,
      index: true
    },
    mintedToRelayer: {
      type: Boolean,
      default: true,
      index: true
    },
    transferredToBrand: {
      type: Boolean,
      default: false,
      index: true
    },
    brandWallet: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid brand wallet address format'],
      index: true
    },
    transferTxHash: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{64}$/, 'Invalid transfer transaction hash format']
    },
    transferredAt: {
      type: Date,
      index: true
    },
    transferFailed: {
      type: Boolean,
      default: false,
      index: true
    },
    transferError: {
      type: String,
      trim: true,
      maxlength: [1000, 'Transfer error message cannot exceed 1000 characters']
    },
    transferAttempts: {
      type: Number,
      default: 0,
      min: [0, 'Transfer attempts cannot be negative']
    },
    maxTransferAttempts: {
      type: Number,
      default: 3,
      min: [1, 'Max transfer attempts must be at least 1'],
      max: [10, 'Max transfer attempts cannot exceed 10']
    },
    nextTransferAttempt: {
      type: Date,
      index: true
    },
    
    // Transfer automation settings
    autoTransferEnabled: {
      type: Boolean,
      default: true,
      index: true
    },
    transferDelayMinutes: {
      type: Number,
      default: 5, // 5 minutes delay after minting
      min: [0, 'Transfer delay cannot be negative'],
      max: [1440, 'Transfer delay cannot exceed 24 hours'] // 24 hours max
    },
    transferTimeout: {
      type: Number,
      default: 300000, // 5 minutes in milliseconds
      min: [30000, 'Transfer timeout must be at least 30 seconds'],
      max: [1800000, 'Transfer timeout cannot exceed 30 minutes']
    },
    transferScheduled: {
      type: Boolean,
      default: false,
      index: true
    },
    transferDelay: {
      type: Number,
      min: [0, 'Transfer delay cannot be negative'],
      max: [1440, 'Transfer delay cannot exceed 24 hours']
    },
    gasUsed: {
      type: String, // Store as string to handle big numbers
      default: '0'
    },
    
    // Certificate metadata
    metadata: {
      customMessage: {
        type: String,
        trim: true,
        maxlength: [1000, 'Custom message cannot exceed 1000 characters']
      },
      attributes: [{
        trait_type: {
          type: String,
          required: true,
          trim: true,
          maxlength: [100, 'Trait type cannot exceed 100 characters']
        },
        value: {
          type: Schema.Types.Mixed,
          required: true
        },
        display_type: {
          type: String,
          trim: true,
          enum: ['number', 'date', 'boost_percentage', 'boost_number']
        }
      }],
      expirationDate: {
        type: Date,
        validate: {
          validator: function(v: Date) {
            return !v || v > new Date();
          },
          message: 'Expiration date must be in the future'
        }
      },
      certificateLevel: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum']
      }
    },
    
    // Delivery options
    deliveryOptions: {
      scheduleDate: {
        type: Date
      },
      priority: {
        type: String,
        enum: ['standard', 'priority', 'urgent'],
        default: 'standard'
      },
      notifyRecipient: {
        type: Boolean,
        default: true
      }
    },
    
    // Web3 options
    web3Options: {
      autoTransfer: {
        type: Boolean,
        default: true
      },
      transferDelay: {
        type: Number,
        min: [0, 'Transfer delay cannot be negative']
      },
      brandWallet: {
        type: String,
        trim: true,
        match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid brand wallet address format']
      },
      requireCustomerConfirmation: {
        type: Boolean,
        default: false
      },
      gasOptimization: {
        type: Boolean,
        default: true
      }
    },
    
    // Batch processing fields
    batchId: {
      type: String,
      trim: true,
      index: true
    },
    batchRequest: {
      type: Boolean,
      default: false
    },
    templateId: {
      type: String,
      trim: true,
      index: true
    },
    
    // Delivery tracking
    delivered: {
      type: Boolean,
      default: false,
      index: true
    },
    deliveredAt: {
      type: Date,
      index: true
    },
    deliveryMethod: {
      type: String,
      enum: ['email', 'sms', 'wallet', 'manual'],
      default: 'email'
    },
    deliveryId: {
      type: String,
      trim: true
    },
    deliveryScheduled: {
      type: Boolean,
      default: false
    },
    scheduledDeliveryDate: {
      type: Date
    },
    scheduledDeliveryId: {
      type: String,
      trim: true
    },
    
    // Analytics
    viewCount: {
      type: Number,
      default: 0,
      min: [0, 'View count cannot be negative']
    },
    lastViewedAt: {
      type: Date,
      index: true
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
    
    // Revocation
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
    }
  },
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        // Add computed fields for API responses
        ret.id = ret._id.toString();
        ret.ownershipStatus = doc.getOwnershipStatus();
        ret.canBeTransferred = doc.canBeTransferred();
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// ===== INDEXES =====
CertificateSchema.index({ business: 1, status: 1 });
CertificateSchema.index({ business: 1, transferredToBrand: 1 });
CertificateSchema.index({ business: 1, transferFailed: 1 });
CertificateSchema.index({ brandWallet: 1, transferredToBrand: 1 });
CertificateSchema.index({ tokenId: 1, contractAddress: 1 }, { unique: true });
CertificateSchema.index({ createdAt: -1 });
CertificateSchema.index({ status: 1, nextTransferAttempt: 1 }); // For automated transfers
CertificateSchema.index({ autoTransferEnabled: 1, status: 1 }); // For transfer eligibility
CertificateSchema.index({ transferAttempts: 1, maxTransferAttempts: 1 }); // For retry logic
CertificateSchema.index({ batchId: 1 }); // For batch processing
CertificateSchema.index({ recipient: 1, product: 1 }); // For duplicate checking
CertificateSchema.index({ delivered: 1, deliveryScheduled: 1 }); // For delivery tracking
CertificateSchema.index({ 'metadata.expirationDate': 1 }, { sparse: true }); // For expiration tracking

// ===== VIRTUALS =====
CertificateSchema.virtual('isExpired').get(function() {
  if (!this.metadata?.expirationDate) return false;
  return new Date() > this.metadata.expirationDate;
});

CertificateSchema.virtual('ownershipStatus').get(function() {
  return this.getOwnershipStatus();
});

CertificateSchema.virtual('blockchainUrl').get(function() {
  const chainId = process.env.CHAIN_ID || '8453';
  const baseUrl = chainId === '8453' 
    ? 'https://basescan.org' 
    : chainId === '84532'
    ? 'https://sepolia.basescan.org'
    : 'https://basescan.org';
  return `${baseUrl}/tx/${this.txHash}`;
});

CertificateSchema.virtual('transferBlockchainUrl').get(function() {
  if (!this.transferTxHash) return null;
  const chainId = process.env.CHAIN_ID || '8453';
  const baseUrl = chainId === '8453' 
    ? 'https://basescan.org' 
    : chainId === '84532'
    ? 'https://sepolia.basescan.org'
    : 'https://basescan.org';
  return `${baseUrl}/tx/${this.transferTxHash}`;
});

CertificateSchema.virtual('canRetryTransfer').get(function() {
  return this.transferAttempts < this.maxTransferAttempts && 
         this.status === 'transfer_failed' && 
         !this.revoked;
});

CertificateSchema.virtual('nextRetryDate').get(function() {
  if (!this.retryTransfer) return null;
  
  // Exponential backoff: 2^attempts * 5 minutes
  const backoffMinutes = Math.pow(2, this.transferAttempts) * 5;
  const nextRetry = new Date(this.updatedAt);
  nextRetry.setMinutes(nextRetry.getMinutes() + backoffMinutes);
  
  return nextRetry;
});

CertificateSchema.virtual('transferHealth').get(function() {
  const issues: string[] = [];
  let score = 100;

  if (this.transferFailed) {
    issues.push('Transfer failed');
    score -= 50;
  }

  if (this.transferAttempts > 1) {
    issues.push('Multiple transfer attempts');
    score -= 20;
  }

  if (this.status === 'pending_transfer' && this.nextTransferAttempt && new Date(this.nextTransferAttempt) < new Date()) {
    issues.push('Transfer overdue');
    score -= 30;
  }

  return {
    status: score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical',
    score: Math.max(0, score),
    issues
  };
});

// ===== INSTANCE METHODS =====

/**
 * Increment view count
 */
CertificateSchema.methods.incrementViewCount = async function(): Promise<ICertificate> {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

/**
 * Check if certificate is transferred to brand
 */
CertificateSchema.methods.isTransferredToBrand = function(): boolean {
  return this.transferredToBrand === true && this.status === 'transferred_to_brand';
};

/**
 * Check if certificate can be transferred
 */
CertificateSchema.methods.canBeTransferred = function(): boolean {
  return (this.status === 'minted' || this.status === 'transfer_failed') && 
         !this.revoked && 
         this.autoTransferEnabled &&
         this.transferAttempts < this.maxTransferAttempts;
};

/**
 * Get ownership status
 */
CertificateSchema.methods.getOwnershipStatus = function(): 'relayer' | 'brand' | 'failed' | 'revoked' {
  if (this.revoked) return 'revoked';
  if (this.transferFailed && this.transferAttempts >= this.maxTransferAttempts) return 'failed';
  if (this.transferredToBrand) return 'brand';
  return 'relayer';
};

/**
 * Schedule automatic transfer after minting
 */
CertificateSchema.methods.scheduleTransfer = async function(): Promise<void> {
  if (!this.autoTransferEnabled || this.status !== 'minted') {
    return;
  }

  try {
    // Import here to avoid circular dependencies
    const { BrandSettings } = await import('../models/brandSettings.model');
    
    // Get brand wallet from business settings
    const brandSettings = await BrandSettings.findOne({ business: this.business });
    
    if (!brandSettings?.certificateWallet && !brandSettings?.web3Settings?.certificateWallet) {
      console.warn(`No brand wallet configured for business ${this.business}. Skipping auto-transfer.`);
      return;
    }

    this.brandWallet = brandSettings.certificateWallet || brandSettings.web3Settings?.certificateWallet;
    this.status = 'pending_transfer';
    this.transferScheduled = true;
    this.nextTransferAttempt = new Date(Date.now() + (this.transferDelayMinutes * 60 * 1000));
    
    await this.save();
    
    console.log(`Scheduled transfer for certificate ${this._id} to wallet ${this.brandWallet}`);
    
  } catch (error: any) {
    console.error(`Failed to schedule transfer for certificate ${this._id}:`, error);
    this.transferError = `Scheduling failed: ${error.message}`;
    this.status = 'transfer_failed';
    await this.save();
  }
};

/**
 * Execute the actual NFT transfer
 */
CertificateSchema.methods.executeTransfer = async function(): Promise<boolean> {
  if (!this.canBeTransferred() || !this.brandWallet) {
    return false;
  }

  this.transferAttempts += 1;
  
  try {
    // Update status to indicate transfer is in progress
    this.status = 'pending_transfer';
    await this.save();

    // Import here to avoid circular dependencies
    const { NftService } = await import('../services/blockchain/nft.service');
    const nftService = new NftService();
    
    // Execute the transfer from relayer wallet to brand wallet
    const transferResult = await nftService.transferNft(this.business.toString(), {
      tokenId: this.tokenId,
      contractAddress: this.contractAddress!,
      fromAddress: process.env.RELAYER_WALLET_ADDRESS!, // Your relayer wallet
      toAddress: this.brandWallet,
      timeout: this.transferTimeout
    });

    // Update certificate with successful transfer
    this.status = 'transferred_to_brand';
    this.transferredToBrand = true;
    this.transferTxHash = transferResult.transactionHash;
    this.transferredAt = new Date();
    this.transferFailed = false;
    this.transferError = undefined;
    this.nextTransferAttempt = undefined;
    this.gasUsed = transferResult.gasUsed || '0';
    
    await this.save();

    // Send success notification
    const { NotificationsService } = await import('../services/external/notifications.service');
    const notificationsService = new NotificationsService();
    await notificationsService.sendTransferSuccessNotification(this.business.toString(), {
      certificateId: this._id.toString(),
      tokenId: this.tokenId,
      brandWallet: this.brandWallet,
      txHash: transferResult.transactionHash
    });

    console.log(`Successfully transferred certificate ${this._id} to brand wallet ${this.brandWallet}`);
    return true;

  } catch (error: any) {
    // Handle transfer failure
    this.status = 'transfer_failed';
    this.transferFailed = true;
    this.transferError = error.message;
    
    // Schedule retry if attempts haven't been exhausted
    if (this.transferAttempts < this.maxTransferAttempts) {
      const backoffMinutes = Math.pow(2, this.transferAttempts) * 5; // Exponential backoff
      this.nextTransferAttempt = new Date(Date.now() + (backoffMinutes * 60 * 1000));
    }
    
    await this.save();

    // Send failure notification
    const { NotificationsService } = await import('../services/external/notifications.service');
    const notificationsService = new NotificationsService();
    await notificationsService.sendTransferFailureNotification(this.business.toString(), {
      certificateId: this._id.toString(),
      tokenId: this.tokenId,
      error: error.message,
      attemptNumber: this.transferAttempts,
      maxAttempts: this.maxTransferAttempts
    });

    console.error(`Transfer failed for certificate ${this._id} (attempt ${this.transferAttempts}/${this.maxTransferAttempts}):`, error);
    return false;
  }
};

/**
 * Retry a failed transfer
 */
CertificateSchema.methods.retryTransfer = async function(): Promise<boolean> {
  if (!this.canRetryTransfer) {
    return false;
  }

  console.log(`Retrying transfer for certificate ${this._id} (attempt ${this.transferAttempts + 1}/${this.maxTransferAttempts})`);
  return this.executeTransfer();
};

// ===== STATIC METHODS =====

/**
 * Find certificates by brand wallet
 */
CertificateSchema.statics.findByBrandWallet = function(brandWallet: string) {
  return this.find({ 
    brandWallet, 
    transferredToBrand: true,
    status: 'transferred_to_brand'
  }).sort({ transferredAt: -1 });
};

/**
 * Find failed transfers for retry
 */
CertificateSchema.statics.findFailedTransfers = function(businessId?: string) {
  const query: any = {
    transferFailed: true,
    status: 'transfer_failed',
    transferAttempts: { $lt: 3 }, // Max attempts
    nextTransferAttempt: { $lte: new Date() }
  };
  
  if (businessId) {
    query.business = businessId;
  }
  
  return this.find(query).sort({ nextTransferAttempt: 1 });
};

/**
 * Find certificates pending transfer
 */
CertificateSchema.statics.findPendingTransfers = function(businessId?: string) {
  const query: any = {
    status: 'pending_transfer',
    nextTransferAttempt: { $lte: new Date() },
    autoTransferEnabled: true,
    revoked: { $ne: true }
  };
  
  if (businessId) {
    query.business = businessId;
  }
  
  return this.find(query).sort({ nextTransferAttempt: 1 });
};

/**
 * Get certificate statistics with transfer metrics
 */
CertificateSchema.statics.getStatistics = async function(businessId: string) {
  const stats = await this.aggregate([
    { $match: { business: Types.ObjectId(businessId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        minted: { 
          $sum: { $cond: [{ $eq: ['$status', 'minted'] }, 1, 0] }
        },
        pendingTransfer: { 
          $sum: { $cond: [{ $eq: ['$status', 'pending_transfer'] }, 1, 0] }
        },
        transferred: { 
          $sum: { $cond: [{ $eq: ['$status', 'transferred_to_brand'] }, 1, 0] }
        },
        failed: { 
          $sum: { $cond: [{ $eq: ['$status', 'transfer_failed'] }, 1, 0] }
        },
        revoked: { 
          $sum: { $cond: [{ $eq: ['$revoked', true] }, 1, 0] }
        },
        avgViewCount: { $avg: '$viewCount' },
        totalViews: { $sum: '$viewCount' },
        avgTransferTime: {
          $avg: {
            $cond: [
              { $and: ['$transferredAt', '$createdAt'] },
              { $subtract: ['$transferredAt', '$createdAt'] },
              null
            ]
          }
        },
        totalTransferAttempts: { $sum: '$transferAttempts' },
        totalGasUsed: {
          $sum: {
            $cond: [
              { $ne: ['$gasUsed', null] },
              { $toLong: '$gasUsed' },
              0
            ]
          }
        }
      }
    }
  ]);

  const result = stats[0] || {
    total: 0,
    minted: 0,
    pendingTransfer: 0,
    transferred: 0,
    failed: 0,
    revoked: 0,
    avgViewCount: 0,
    totalViews: 0,
    avgTransferTime: 0,
    totalTransferAttempts: 0,
    totalGasUsed: 0
  };

  // Calculate success rate
  result.transferSuccessRate = result.total > 0 
    ? Math.round((result.transferred / (result.transferred + result.failed)) * 100) || 0
    : 0;

  return result;
};

/**
 * Find certificates by batch ID
 */
CertificateSchema.statics.findByBatchId = function(batchId: string) {
  return this.find({ batchId }).sort({ createdAt: 1 });
};

/**
 * Get monthly certificate creation stats
 */
CertificateSchema.statics.getMonthlyStats = async function(businessId: string, months: number = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.aggregate([
    { 
      $match: { 
        business: Types.ObjectId(businessId),
        createdAt: { $gte: startDate }
      } 
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 },
        transferred: { 
          $sum: { $cond: [{ $eq: ['$status', 'transferred_to_brand'] }, 1, 0] }
        },
        failed: { 
          $sum: { $cond: [{ $eq: ['$status', 'transfer_failed'] }, 1, 0] }
        }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
};

// ===== PRE/POST HOOKS =====

/**
 * Pre-save hook for validation and defaults
 */
CertificateSchema.pre('save', function(next) {
  // Set verification URL if not provided
  if (!this.verificationUrl && this._id) {
    this.verificationUrl = `${process.env.FRONTEND_URL || 'https://app.example.com'}/certificates/verify/${this._id}`;
  }
  
  // Validate transfer status consistency
  if (this.transferredToBrand && !this.brandWallet) {
    return next(new Error('Brand wallet is required when transferredToBrand is true'));
  }
  
  if (this.transferFailed && !this.transferError) {
    return next(new Error('Transfer error message is required when transferFailed is true'));
  }
  
  // Reset transfer fields when status changes to minted
  if (this.isModified('status') && this.status === 'minted') {
    this.transferFailed = false;
    this.transferError = undefined;
    this.transferAttempts = 0;
    this.nextTransferAttempt = undefined;
  }
  
  // Sync web3Options with top-level transfer settings
  if (this.web3Options?.autoTransfer !== undefined) {
    this.autoTransferEnabled = this.web3Options.autoTransfer;
  }
  
  if (this.web3Options?.transferDelay !== undefined) {
    this.transferDelayMinutes = this.web3Options.transferDelay;
  }
  
  if (this.web3Options?.brandWallet) {
    this.brandWallet = this.web3Options.brandWallet;
  }
  
  next();
});

/**
 * Post-save hook for automatic transfer scheduling and notifications
 */
CertificateSchema.post('save', function(doc) {
  // Schedule automatic transfer when certificate is first minted
  if (doc.isModified('status') && doc.status === 'minted' && doc.autoTransferEnabled) {
    process.nextTick(async () => {
      try {
        await doc.scheduleTransfer();
      } catch (error) {
        console.error(`Failed to schedule automatic transfer for certificate ${doc._id}:`, error);
      }
    });
  }
  
  // Emit events for real-time updates
  if (doc.isModified('status')) {
    process.nextTick(() => {
      console.log(`Certificate ${doc._id} status changed to: ${doc.status}`);
      // You can emit WebSocket events here for real-time dashboard updates
      // Example: socketService.emit(`business:${doc.business}`, 'certificate:status_changed', {
      //   certificateId: doc._id,
      //   newStatus: doc.status,
      //   timestamp: new Date()
      // });
    });
  }

  // Update brand analytics when transfers complete
  if (doc.isModified('transferredToBrand') && doc.transferredToBrand) {
    process.nextTick(async () => {
      try {
        const { BrandSettings } = await import('../models/brandSettings.model');
        const brandSettings = await BrandSettings.findOne({ business: doc.business });
        
        if (brandSettings) {
          await brandSettings.updateTransferAnalytics({
            success: true,
            gasUsed: doc.gasUsed,
            transferTime: doc.transferredAt && doc.createdAt ? 
              doc.transferredAt.getTime() - doc.createdAt.getTime() : undefined
          });
        }
      } catch (error) {
        console.error(`Failed to update transfer analytics for certificate ${doc._id}:`, error);
      }
    });
  }

  // Update analytics on transfer failure
  if (doc.isModified('transferFailed') && doc.transferFailed) {
    process.nextTick(async () => {
      try {
        const { BrandSettings } = await import('../models/brandSettings.model');
        const brandSettings = await BrandSettings.findOne({ business: doc.business });
        
        if (brandSettings) {
          await brandSettings.updateTransferAnalytics({
            success: false,
            transferTime: Date.now() - doc.createdAt.getTime()
          });
        }
      } catch (error) {
        console.error(`Failed to update failure analytics for certificate ${doc._id}:`, error);
      }
    });
  }
});

/**
 * Pre-remove hook to handle cleanup
 */
CertificateSchema.pre('remove', function(next) {
  // Cancel any pending transfers
  if (this.nextTransferAttempt && this.status === 'pending_transfer') {
    console.log(`Cancelling pending transfer for certificate ${this._id}`);
    // Clear the scheduled transfer (implementation depends on your job queue)
    // Example: jobQueue.cancel(`transfer_${this._id}`);
  }
  
  // Log certificate removal for audit trail
  console.log(`Removing certificate ${this._id} for business ${this.business}`);
  
  next();
});

/**
 * Post-remove hook for cleanup notifications
 */
CertificateSchema.post('remove', function(doc) {
  process.nextTick(async () => {
    try {
      // Notify about certificate removal
      const { NotificationsService } = await import('../services/external/notifications.service');
      const notificationsService = new NotificationsService();
      
      await notificationsService.notifyBrandOfCertificateRemoval(
        doc.business.toString(),
        {
          certificateId: doc._id.toString(),
          tokenId: doc.tokenId,
          recipient: doc.recipient,
          removedAt: new Date()
        }
      );
    } catch (error) {
      console.error(`Failed to send removal notification for certificate ${doc._id}:`, error);
    }
  });
});

// Export the model
export const Certificate = model<ICertificate>('Certificate', CertificateSchema);
