// src/models/infrastructure/invitation.model.ts
import { Schema, model, Document, Types } from 'mongoose';
import { logger } from '../../services/infrastructure/logging';

export interface IInvitation extends Document {
  brand: Types.ObjectId;
  manufacturer: Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled' | 'disconnected';
  
  // Enhanced fields (from controller)
  invitationToken?: string;
  message?: string;
  expiresAt: Date;
  respondedAt?: Date;
  
  // Invitation details (from controller)
  invitationType: 'collaboration' | 'manufacturing' | 'partnership' | 'custom';
  terms?: {
    proposedCommission?: number;
    minimumOrderQuantity?: number;
    deliveryTimeframe?: string;
    specialRequirements?: string[];
  };
  
  // Response data (from controller)
  responseMessage?: string;
  counterOffer?: {
    commission?: number;
    minimumOrderQuantity?: number;
    deliveryTimeframe?: string;
    additionalTerms?: string;
  };
  
  // Additional service-referenced fields
  manufacturers?: Types.ObjectId[]; // Referenced in service for BrandSettings
  brands?: Types.ObjectId[]; // Referenced in service for Manufacturer
  
  // Virtual properties
  timeRemaining?: number;
  urgencyLevel?: string;
  summary?: {
    id: string;
    brandId: string;
    manufacturerId: string;
    status: string;
    type: string;
    createdAt: Date;
    expiresAt: Date;
    timeRemaining: number;
    urgency: string;
  };
  
  // Instance methods (from both files)
  isExpired(): boolean;
  canRespond(): boolean;
  accept(message?: string): Promise<IInvitation>;
  decline(message?: string): Promise<IInvitation>;
  cancel(): Promise<IInvitation>;
  generateToken(): string;
  setCounterOffer(offer: any): Promise<IInvitation>;
  
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>({
  brand: { 
    type: Schema.Types.ObjectId, 
    ref: 'BrandSettings', 
    required: [true, 'Brand reference is required'],
    index: true
  },
  manufacturer: { 
    type: Schema.Types.ObjectId, 
    ref: 'Manufacturer', 
    required: [true, 'Manufacturer reference is required'],
    index: true
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled', 'disconnected'],
    default: 'pending',
    index: true
  },
  
  // Enhanced fields
  invitationToken: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    select: false // Don't include in queries by default
  },
  message: {
    type: String,
    trim: true,
    maxlength: [1000, 'Invitation message cannot exceed 1000 characters']
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
    validate: {
      validator: function(v: Date) {
        return v > new Date();
      },
      message: 'Expiration date must be in the future'
    },
    index: true
  },
  respondedAt: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return !v || v <= new Date();
      },
      message: 'Response date cannot be in the future'
    }
  },
  
  // Invitation details
  invitationType: {
    type: String,
    enum: ['collaboration', 'manufacturing', 'partnership', 'custom'],
    default: 'collaboration',
    required: true
  },
  terms: {
    proposedCommission: {
      type: Number,
      min: [0, 'Commission cannot be negative'],
      max: [100, 'Commission cannot exceed 100%']
    },
    minimumOrderQuantity: {
      type: Number,
      min: [1, 'Minimum order quantity must be at least 1']
    },
    deliveryTimeframe: {
      type: String,
      trim: true,
      maxlength: [100, 'Delivery timeframe cannot exceed 100 characters']
    },
    specialRequirements: [{
      type: String,
      trim: true,
      maxlength: [200, 'Special requirement cannot exceed 200 characters']
    }]
  },
  
  // Response data
  responseMessage: {
    type: String,
    trim: true,
    maxlength: [1000, 'Response message cannot exceed 1000 characters']
  },
  counterOffer: {
    commission: {
      type: Number,
      min: [0, 'Commission cannot be negative'],
      max: [100, 'Commission cannot exceed 100%']
    },
    minimumOrderQuantity: {
      type: Number,
      min: [1, 'Minimum order quantity must be at least 1']
    },
    deliveryTimeframe: {
      type: String,
      trim: true,
      maxlength: [100, 'Delivery timeframe cannot exceed 100 characters']
    },
    additionalTerms: {
      type: String,
      trim: true,
      maxlength: [500, 'Additional terms cannot exceed 500 characters']
    }
  }
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.invitationToken;
      // Add computed fields for API responses
      ret.id = ret._id.toString();
      ret.timeRemaining = doc.timeRemaining;
      ret.daysSinceCreated = doc.daysSinceCreated;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// ===== INDEXES =====
// Performance indexes for common queries
InvitationSchema.index({ brand: 1, status: 1 });
InvitationSchema.index({ manufacturer: 1, status: 1 });
InvitationSchema.index({ status: 1, expiresAt: 1 });
InvitationSchema.index({ createdAt: -1 });
InvitationSchema.index({ expiresAt: 1 });
InvitationSchema.index({ invitationType: 1 });
InvitationSchema.index({ respondedAt: -1 }, { sparse: true });

// Compound indexes for complex queries
InvitationSchema.index({ brand: 1, manufacturer: 1 });
InvitationSchema.index({ brand: 1, manufacturer: 1, status: 1 });
InvitationSchema.index({ status: 1, invitationType: 1 });
InvitationSchema.index({ brand: 1, status: 1, createdAt: -1 });
InvitationSchema.index({ manufacturer: 1, status: 1, createdAt: -1 });

// ===== VIRTUALS =====
// Virtual for time remaining
InvitationSchema.virtual('timeRemaining').get(function() {
  if (this.status !== 'pending') return null;
  const now = new Date();
  if (this.expiresAt <= now) return 0;
  return Math.floor((this.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)); // hours
});

// Virtual for days since creation
InvitationSchema.virtual('daysSinceCreated').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Virtual for response time (if responded)
InvitationSchema.virtual('responseTimeHours').get(function() {
  if (!this.respondedAt) return null;
  return Math.floor((this.respondedAt.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60));
});

// Virtual for urgency level
InvitationSchema.virtual('urgencyLevel').get(function(this: IInvitation) {
  if (this.status !== 'pending') return 'none';
  const hoursRemaining = this.timeRemaining || 0;
  if (hoursRemaining <= 24) return 'high';
  if (hoursRemaining <= 72) return 'medium';
  return 'low';
});

// Virtual for invitation summary
InvitationSchema.virtual('summary').get(function(this: IInvitation) {
  return {
    id: this._id.toString(),
    brandId: this.brand.toString(),
    manufacturerId: this.manufacturer.toString(),
    status: this.status,
    type: this.invitationType,
    createdAt: this.createdAt,
    expiresAt: this.expiresAt,
    timeRemaining: this.timeRemaining || 0,
    urgency: this.urgencyLevel || 'none'
  };
});

// ===== INSTANCE METHODS =====

/**
 * Check if invitation is expired
 */
InvitationSchema.methods.isExpired = function(): boolean {
  return this.expiresAt <= new Date();
};

/**
 * Check if invitation can be responded to
 */
InvitationSchema.methods.canRespond = function(): boolean {
  return this.status === 'pending' && !this.isExpired();
};

/**
 * Accept the invitation
 */
InvitationSchema.methods.accept = function(message?: string): Promise<IInvitation> {
  if (!this.canRespond()) {
    throw new Error('Cannot accept this invitation');
  }
  
  this.status = 'accepted';
  this.respondedAt = new Date();
  if (message) this.responseMessage = message;
  
  return this.save();
};

/**
 * Decline the invitation
 */
InvitationSchema.methods.decline = function(message?: string): Promise<IInvitation> {
  if (!this.canRespond()) {
    throw new Error('Cannot decline this invitation');
  }
  
  this.status = 'declined';
  this.respondedAt = new Date();
  if (message) this.responseMessage = message;
  
  return this.save();
};

/**
 * Cancel the invitation (brand-side action)
 */
InvitationSchema.methods.cancel = function(): Promise<IInvitation> {
  if (this.status !== 'pending') {
    throw new Error('Can only cancel pending invitations');
  }
  
  this.status = 'cancelled';
  this.respondedAt = new Date();
  
  return this.save();
};

/**
 * Generate unique invitation token
 */
InvitationSchema.methods.generateToken = function(): string {
  const crypto = require('crypto');
  const token = crypto.randomBytes(16).toString('hex');
  this.invitationToken = token;
  return token;
};

/**
 * Set counter offer from manufacturer
 */
InvitationSchema.methods.setCounterOffer = function(offer: any): Promise<IInvitation> {
  this.counterOffer = {
    commission: offer.commission,
    minimumOrderQuantity: offer.minimumOrderQuantity,
    deliveryTimeframe: offer.deliveryTimeframe,
    additionalTerms: offer.additionalTerms
  };
  return this.save();
};

// ===== STATIC METHODS =====

/**
 * Find pending invitations for a brand
 */
InvitationSchema.statics.findPendingForBrand = function(brandId: string) {
  return this.find({ 
    brand: brandId, 
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('manufacturer', 'name email industry location');
};

/**
 * Find pending invitations for a manufacturer
 */
InvitationSchema.statics.findPendingForManufacturer = function(manufacturerId: string) {
  return this.find({ 
    manufacturer: manufacturerId, 
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate({
    path: 'brand',
    populate: {
      path: 'business',
      select: 'businessName'
    }
  });
};

/**
 * Find expired invitations
 */
InvitationSchema.statics.findExpired = function() {
  return this.find({
    status: 'pending',
    expiresAt: { $lte: new Date() }
  });
};

/**
 * Find invitation by token
 */
InvitationSchema.statics.findByToken = function(token: string) {
  return this.findOne({ 
    invitationToken: token,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate(['brand', 'manufacturer']);
};

/**
 * Get invitation statistics for a brand
 */
InvitationSchema.statics.getInvitationStats = function(brandId: string) {
  return this.aggregate([
    { $match: { brand: new Types.ObjectId(brandId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgResponseTime: {
          $avg: {
            $cond: [
              { $ne: ['$respondedAt', null] },
              { $subtract: ['$respondedAt', '$createdAt'] },
              null
            ]
          }
        }
      }
    }
  ]);
};

/**
 * Get manufacturer invitation statistics
 */
InvitationSchema.statics.getManufacturerStats = function(manufacturerId: string) {
  return this.aggregate([
    { $match: { manufacturer: new Types.ObjectId(manufacturerId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgResponseTime: {
          $avg: {
            $cond: [
              { $ne: ['$respondedAt', null] },
              { $subtract: ['$respondedAt', '$createdAt'] },
              null
            ]
          }
        }
      }
    }
  ]);
};

/**
 * Find invitations by type
 */
InvitationSchema.statics.findByType = function(invitationType: string) {
  return this.find({ invitationType }).populate(['brand', 'manufacturer']);
};

/**
 * Find recent activity for dashboard
 */
InvitationSchema.statics.findRecentActivity = function(
  entityId: string, 
  entityType: 'brand' | 'manufacturer', 
  limit: number = 10
) {
  const matchField = entityType === 'brand' ? 'brand' : 'manufacturer';
  
  return this.find({ [matchField]: entityId })
    .sort({ 
      $expr: {
        $cond: [
          { $ne: ['$respondedAt', null] },
          '$respondedAt',
          '$createdAt'
        ]
      }
    })
    .limit(limit)
    .populate(entityType === 'brand' ? 'manufacturer' : 'brand');
};

/**
 * Get connection analytics
 */
InvitationSchema.statics.getConnectionAnalytics = function(brandId: string, timeframe: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);
  
  return this.aggregate([
    { 
      $match: { 
        brand: new Types.ObjectId(brandId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        totalInvitations: { $sum: 1 },
        accepted: { 
          $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
        },
        declined: { 
          $sum: { $cond: [{ $eq: ['$status', 'declined'] }, 1, 0] }
        },
        pending: { 
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
};

/**
 * Mark expired invitations
 */
InvitationSchema.statics.markExpiredInvitations = function() {
  return this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lte: new Date() }
    },
    {
      $set: { 
        status: 'expired',
        respondedAt: new Date()
      }
    }
  );
};

/**
 * Get global invitation metrics
 */
InvitationSchema.statics.getGlobalMetrics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalInvitations: { $sum: 1 },
        totalAccepted: { 
          $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
        },
        totalDeclined: { 
          $sum: { $cond: [{ $eq: ['$status', 'declined'] }, 1, 0] }
        },
        totalPending: { 
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        avgResponseTime: {
          $avg: {
            $cond: [
              { $ne: ['$respondedAt', null] },
              { $subtract: ['$respondedAt', '$createdAt'] },
              null
            ]
          }
        }
      }
    }
  ]);
};

// ===== PRE/POST HOOKS =====

/**
 * Pre-save middleware for validation and defaults
 */
InvitationSchema.pre('save', function(next) {
  // Generate invitation token if new
  if (this.isNew && !this.invitationToken) {
    this.generateToken();
  }
  
  // Set default expiration (30 days from now)
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  // Set respondedAt when status changes from pending
  if (this.isModified('status') && this.status !== 'pending' && !this.respondedAt) {
    this.respondedAt = new Date();
  }
  
  // Validate counter offer if provided
  if (this.counterOffer && this.status !== 'pending') {
    if (this.counterOffer.commission && (this.counterOffer.commission < 0 || this.counterOffer.commission > 100)) {
      return next(new Error('Counter offer commission must be between 0 and 100'));
    }
  }
  
  next();
});

/**
 * Pre-validate middleware
 */
InvitationSchema.pre('validate', function(next) {
  // Ensure expiration is in the future for new invitations
  if (this.isNew && this.expiresAt && this.expiresAt <= new Date()) {
    return next(new Error('Expiration date must be in the future'));
  }
  
  // Validate that brand and manufacturer are different
  if (this.brand && this.manufacturer && this.brand.toString() === this.manufacturer.toString()) {
    return next(new Error('Brand and manufacturer cannot be the same'));
  }
  
  next();
});

/**
 * Post-save middleware for notifications and updates
 */
InvitationSchema.post('save', function(doc) {
  // Send notifications based on status changes
  if (this.isModified('status')) {
    process.nextTick(async () => {
      try {
        const { notificationsService } = await import('../../services/notifications/notifications.service');
        const { Business } = await import('../core/business.model');
        const { Manufacturer } = await import('../core/manufacturer.model');
        
        switch (doc.status) {
          case 'accepted':
            // Update connections in both BrandSettings and Manufacturer models
            const { BrandSettings } = await import('../brands/brandSettings.model');
            
            await Promise.all([
              BrandSettings.findOneAndUpdate(
                { business: doc.brand },
                { $addToSet: { manufacturers: doc.manufacturer } }
              ),
              Manufacturer.findByIdAndUpdate(
                doc.manufacturer,
                { $addToSet: { brands: doc.brand } }
              )
            ]);
            
            // Notify brand that invitation was accepted
            const { eventHandlerService, NotificationEventType, NotificationCategory, NotificationPriority } = await import('../../services/notifications');
            
            await eventHandlerService.handle({
              type: NotificationEventType.ConnectionAccepted,
              recipient: { businessId: doc.brand.toString() },
              payload: {
                manufacturerId: doc.manufacturer.toString(),
                brandId: doc.brand.toString(),
                invitationId: doc._id.toString(),
              },
              metadata: {
                category: NotificationCategory.Connection,
                priority: NotificationPriority.Medium,
                title: 'Connection invitation accepted',
                message: 'Your connection invitation was accepted.',
                actionUrl: `/brand/connections/${doc.manufacturer.toString()}`,
              },
            });
            break;
            
          case 'declined':
            // Send email notification for decline
            const business = await Business.findById(doc.brand).select('email businessName');
            const manufacturer = await Manufacturer.findById(doc.manufacturer).select('name');
            
            if (business?.email && manufacturer) {
              await notificationsService.sendEmail(
                business.email,
                'Invitation Declined',
                `The manufacturer ${manufacturer.name} has declined your collaboration invitation.`
              );
            }
            break;
            
          case 'cancelled':
            // Send email notification for cancellation
            const mfg = await Manufacturer.findById(doc.manufacturer).select('email');
            const biz = await Business.findById(doc.brand).select('businessName');
            
            if (mfg?.email && biz) {
              await notificationsService.sendEmail(
                mfg.email,
                'Invitation Cancelled',
                `The brand ${biz.businessName} has cancelled their collaboration invitation.`
              );
            }
            break;
        }
      } catch (error) {
        logger.error('Failed to send notification for invitation ${doc._id}:', error);
      }
    });
  }
  
  // Log invitation activity for analytics
  process.nextTick(() => {
    logger.info('Invitation ${doc._id} updated: ${doc.status} (${doc.invitationType})');
  });
});

/**
 * Pre-remove hook for cleanup (document-level)
 */
InvitationSchema.pre('remove', function(this: IInvitation, next) {
  logger.info('Removing invitation ${this._id} between brand ${this.brand} and manufacturer ${this.manufacturer}');
  next();
});

/**
 * Pre-deleteOne hook for cleanup (query-level)
 */
InvitationSchema.pre(['deleteOne', 'findOneAndDelete'], async function() {
  try {
    // Get the document that will be deleted
    const doc = await this.model.findOne(this.getQuery()) as IInvitation;
    if (doc) {
      logger.info('Removing invitation ${doc._id} between brand ${doc.brand} and manufacturer ${doc.manufacturer}');
    }
  } catch (error) {
    logger.error('Error in pre-delete hook:', error);
  }
});

/**
 * Post-remove hook for cleanup notifications
 */
InvitationSchema.post('remove', function(doc) {
  process.nextTick(async () => {
    try {
      // If this was an accepted invitation, remove the connection
      if (doc.status === 'accepted') {
        const { BrandSettings } = await import('../brands/brandSettings.model');
        const { Manufacturer } = await import('../core/manufacturer.model');
        
        await Promise.all([
          BrandSettings.findOneAndUpdate(
            { business: doc.brand },
            { $pull: { manufacturers: doc.manufacturer } }
          ),
          Manufacturer.findByIdAndUpdate(
            doc.manufacturer,
            { $pull: { brands: doc.brand } }
          )
        ]);
        
        logger.info('Connection removed between brand ${doc.brand} and manufacturer ${doc.manufacturer}');
      }
    } catch (error) {
      logger.error('Failed to cleanup connection for removed invitation ${doc._id}:', error);
    }
  });
});

// Schedule task to mark expired invitations (can be called by a cron job)
InvitationSchema.statics.scheduleExpirationCheck = function(this: any) {
  setInterval(async () => {
    try {
      const result = await this.markExpiredInvitations();
      if (result.modifiedCount > 0) {
        logger.info('Marked ${result.modifiedCount} invitations as expired');
      }
    } catch (error) {
      logger.error('Failed to mark expired invitations:', error);
    }
  }, 60 * 60 * 1000); // Check every hour
};

export const Invitation = model<IInvitation>('Invitation', InvitationSchema);



