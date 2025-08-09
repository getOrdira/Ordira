// src/models/notification.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  business?: Types.ObjectId;
  manufacturer?: Types.ObjectId;
  type: string;
  message: string;
  data?: any;
  read: boolean;
  
  // Enhanced fields
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'system' | 'billing' | 'certificate' | 'vote' | 'invite' | 'order' | 'security';
  title?: string;
  actionUrl?: string;
  expiresAt?: Date;
  
  // Delivery tracking
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed';
  deliveryChannels?: Array<'in_app' | 'email' | 'sms' | 'push'>;
  deliveryAttempts?: number;
  lastDeliveryAttempt?: Date;
  
  // Instance methods
  markAsRead(): Promise<INotification>;
  markAsDelivered(): Promise<INotification>;
  isExpired(): boolean;
  canRetryDelivery(): boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    business: { 
      type: Types.ObjectId, 
      ref: 'Business',
      validate: {
        validator: function() {
          return !!(this.business || this.manufacturer);
        },
        message: 'Either business or manufacturer must be specified'
      }
    },
    manufacturer: { 
      type: Types.ObjectId, 
      ref: 'Manufacturer',
      validate: {
        validator: function() {
          return !!(this.business || this.manufacturer);
        },
        message: 'Either business or manufacturer must be specified'
      }
    },
    type: { 
      type: String, 
      required: [true, 'Notification type is required'],
      trim: true,
      maxlength: [50, 'Type cannot exceed 50 characters'],
      index: true
    },
    message: { 
      type: String, 
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    data: { 
      type: Schema.Types.Mixed,
      validate: {
        validator: function(v: any) {
          return !v || JSON.stringify(v).length <= 5000; // 5KB limit
        },
        message: 'Data size cannot exceed 5KB'
      }
    },
    read: { 
      type: Boolean, 
      default: false,
      index: true
    },
    
    // Enhanced fields
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true
    },
    category: {
      type: String,
      enum: ['system', 'billing', 'certificate', 'vote', 'invite', 'order', 'security'],
      required: [true, 'Category is required'],
      index: true
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    actionUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v) || /^\//.test(v);
        },
        message: 'Action URL must be a valid URL or relative path'
      }
    },
    expiresAt: {
      type: Date,
      validate: {
        validator: function(v: Date) {
          return !v || v > new Date();
        },
        message: 'Expiration date must be in the future'
      },
      index: true
    },
    
    // Delivery tracking
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending',
      index: true
    },
    deliveryChannels: [{
      type: String,
      enum: ['in_app', 'email', 'sms', 'push']
    }],
    deliveryAttempts: {
      type: Number,
      default: 0,
      min: [0, 'Delivery attempts cannot be negative']
    },
    lastDeliveryAttempt: {
      type: Date
    }
  },
  { 
    timestamps: { createdAt: true, updatedAt: true },
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for performance
NotificationSchema.index({ business: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ manufacturer: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ category: 1, priority: 1 });
NotificationSchema.index({ deliveryStatus: 1 });
NotificationSchema.index({ expiresAt: 1 });

// Compound indexes
NotificationSchema.index({ business: 1, category: 1, read: 1 });
NotificationSchema.index({ manufacturer: 1, category: 1, read: 1 });

// TTL index for expired notifications
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for recipient type
NotificationSchema.virtual('recipientType').get(function() {
  return this.business ? 'business' : 'manufacturer';
});

// Virtual for recipient ID
NotificationSchema.virtual('recipientId').get(function() {
  return this.business?.toString() || this.manufacturer?.toString();
});

// Virtual for age in hours
NotificationSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});

// Instance methods
NotificationSchema.methods.markAsRead = function(): Promise<INotification> {
  this.read = true;
  return this.save();
};

NotificationSchema.methods.markAsDelivered = function(): Promise<INotification> {
  this.deliveryStatus = 'delivered';
  this.lastDeliveryAttempt = new Date();
  return this.save();
};

NotificationSchema.methods.incrementDeliveryAttempt = function(): Promise<INotification> {
  this.deliveryAttempts += 1;
  this.lastDeliveryAttempt = new Date();
  
  // Mark as failed after 3 attempts
  if (this.deliveryAttempts >= 3) {
    this.deliveryStatus = 'failed';
  }
  
  return this.save();
};

NotificationSchema.methods.isExpired = function(): boolean {
  return !!(this.expiresAt && this.expiresAt <= new Date());
};

NotificationSchema.methods.canRetryDelivery = function(): boolean {
  return this.deliveryStatus === 'failed' && this.deliveryAttempts < 3;
};

// Static methods
NotificationSchema.statics.findUnreadForBusiness = function(businessId: string) {
  return this.find({ 
    business: businessId, 
    read: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ priority: -1, createdAt: -1 });
};

NotificationSchema.statics.findUnreadForManufacturer = function(manufacturerId: string) {
  return this.find({ 
    manufacturer: manufacturerId, 
    read: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ priority: -1, createdAt: -1 });
};

NotificationSchema.statics.findByCategory = function(recipientId: string, recipientType: 'business' | 'manufacturer', category: string) {
  const filter: any = { category };
  filter[recipientType] = recipientId;
  
  return this.find(filter).sort({ createdAt: -1 });
};

NotificationSchema.statics.markAllAsRead = function(recipientId: string, recipientType: 'business' | 'manufacturer') {
  const filter: any = { read: false };
  filter[recipientType] = recipientId;
  
  return this.updateMany(filter, { read: true });
};

NotificationSchema.statics.getUnreadCount = function(recipientId: string, recipientType: 'business' | 'manufacturer') {
  const filter: any = { 
    read: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  };
  filter[recipientType] = recipientId;
  
  return this.countDocuments(filter);
};

NotificationSchema.statics.findPendingDelivery = function() {
  return this.find({
    deliveryStatus: 'pending',
    deliveryAttempts: { $lt: 3 }
  }).sort({ priority: -1, createdAt: 1 });
};

NotificationSchema.statics.getNotificationStats = function(recipientId: string, recipientType: 'business' | 'manufacturer') {
  const filter: any = {};
  filter[recipientType] = new Types.ObjectId(recipientId);
  
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$category',
        total: { $sum: 1 },
        unread: { $sum: { $cond: ['$read', 0, 1] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } }
      }
    },
    { $sort: { total: -1 } }
  ]);
};

NotificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lte: new Date() }
  });
};

// Pre-save middleware
NotificationSchema.pre('save', function(next) {
  // Ensure only one recipient type is set
  if (this.business && this.manufacturer) {
    return next(new Error('Notification cannot have both business and manufacturer recipients'));
  }
  
  // Set default expiration for certain types
  if (this.isNew && !this.expiresAt) {
    if (['invite', 'order'].includes(this.category)) {
      this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }
  
  next();
});

export const Notification = model<INotification>('Notification', NotificationSchema);
