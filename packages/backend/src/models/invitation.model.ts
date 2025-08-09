// src/models/invitation.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IInvitation extends Document {
  brand: Types.ObjectId;
  manufacturer: Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  
  // Enhanced fields
  invitationToken?: string;
  message?: string;
  expiresAt: Date;
  respondedAt?: Date;
  
  // Invitation details
  invitationType: 'collaboration' | 'manufacturing' | 'partnership' | 'custom';
  terms?: {
    proposedCommission?: number;
    minimumOrderQuantity?: number;
    deliveryTimeframe?: string;
    specialRequirements?: string[];
  };
  
  // Response data
  responseMessage?: string;
  counterOffer?: {
    commission?: number;
    minimumOrderQuantity?: number;
    deliveryTimeframe?: string;
    additionalTerms?: string;
  };
  
  // Instance methods
  isExpired(): boolean;
  canRespond(): boolean;
  accept(message?: string): Promise<IInvitation>;
  decline(message?: string): Promise<IInvitation>;
  cancel(): Promise<IInvitation>;
  
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
    enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
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
      return ret;
    }
  }
});

// Indexes for performance
InvitationSchema.index({ brand: 1, status: 1 });
InvitationSchema.index({ manufacturer: 1, status: 1 });
InvitationSchema.index({ status: 1, expiresAt: 1 });
InvitationSchema.index({ createdAt: -1 });
InvitationSchema.index({ expiresAt: 1 });

// Compound indexes
InvitationSchema.index({ brand: 1, manufacturer: 1 });
InvitationSchema.index({ brand: 1, manufacturer: 1, status: 1 }, { unique: true });

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

// Instance methods
InvitationSchema.methods.isExpired = function(): boolean {
  return this.expiresAt <= new Date();
};

InvitationSchema.methods.canRespond = function(): boolean {
  return this.status === 'pending' && !this.isExpired();
};

InvitationSchema.methods.accept = function(message?: string): Promise<IInvitation> {
  if (!this.canRespond()) {
    throw new Error('Cannot accept this invitation');
  }
  
  this.status = 'accepted';
  this.respondedAt = new Date();
  if (message) this.responseMessage = message;
  
  return this.save();
};

InvitationSchema.methods.decline = function(message?: string): Promise<IInvitation> {
  if (!this.canRespond()) {
    throw new Error('Cannot decline this invitation');
  }
  
  this.status = 'declined';
  this.respondedAt = new Date();
  if (message) this.responseMessage = message;
  
  return this.save();
};

InvitationSchema.methods.cancel = function(): Promise<IInvitation> {
  if (this.status !== 'pending') {
    throw new Error('Can only cancel pending invitations');
  }
  
  this.status = 'cancelled';
  this.respondedAt = new Date();
  
  return this.save();
};

InvitationSchema.methods.generateToken = function(): string {
  const token = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
  this.invitationToken = token;
  return token;
};

InvitationSchema.methods.setCounterOffer = function(offer: any): Promise<IInvitation> {
  this.counterOffer = offer;
  return this.save();
};

// Static methods
InvitationSchema.statics.findPendingForBrand = function(brandId: string) {
  return this.find({ 
    brand: brandId, 
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('manufacturer', 'name email industry');
};

InvitationSchema.statics.findPendingForManufacturer = function(manufacturerId: string) {
  return this.find({ 
    manufacturer: manufacturerId, 
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('brand');
};

InvitationSchema.statics.findExpired = function() {
  return this.find({
    status: 'pending',
    expiresAt: { $lte: new Date() }
  });
};

InvitationSchema.statics.findByToken = function(token: string) {
  return this.findOne({ 
    invitationToken: token,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate(['brand', 'manufacturer']);
};

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

// Pre-save middleware
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
  
  next();
});

// Scheduled task to mark expired invitations
InvitationSchema.statics.markExpiredInvitations = function() {
  return this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lte: new Date() }
    },
    {
      $set: { status: 'expired' }
    }
  );
};

export const Invitation = model<IInvitation>('Invitation', InvitationSchema);
