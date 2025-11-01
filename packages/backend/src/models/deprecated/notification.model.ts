// src/models/notification.model.ts
import { Schema, model, Document, Types } from 'mongoose';
import { logger } from '../../utils/logger';

export interface INotification extends Document {
  business?: Types.ObjectId; // References Business model
  manufacturer?: Types.ObjectId; // References Manufacturer model
  recipientType?: 'business' | 'manufacturer' | 'user';
  recipientId?: string;
  type: string;
  message: string;
  data?: any;
  read: boolean;
  
  // Enhanced fields (aligned with controller validation)
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'system' | 'billing' | 'certificate' | 'vote' | 'invite' | 'order' | 'security' | 'auth' | 'wallet' | 'messaging' | 'usage' | 'settings' | 'bulk' | 'connection' | 'account';
  title?: string;
  actionUrl?: string;
  expiresAt?: Date;
  
  // Delivery tracking (aligned with service delivery methods)
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed';
  deliveryChannels?: Array<'in_app' | 'email' | 'sms' | 'push' | 'slack' | 'webhook'>;
  deliveryAttempts?: number;
  lastDeliveryAttempt?: Date;
  deliveryError?: string;
  
  // Bulk notification tracking (aligned with service bulk methods)
  batchId?: string;
  bulkNotification?: boolean;
  recipientEmail?: string;
  recipientName?: string;
  
  // Archive and management (aligned with controller bulk actions)
  archived?: boolean;
  archivedAt?: Date;
  deletedAt?: Date; // For soft delete
  
  // Notification lifecycle tracking
  viewedAt?: Date;
  clickedAt?: Date;
  interactionCount?: number;
  
  // Template and personalization (aligned with service email templates)
  templateId?: string;
  templateData?: Record<string, any>;
  personalizedMessage?: string;
  
  // Instance methods (aligned with service requirements)
  markAsRead(): Promise<INotification>;
  markAsDelivered(): Promise<INotification>;
  markAsViewed(): Promise<INotification>;
  markAsClicked(): Promise<INotification>;
  incrementDeliveryAttempt(error?: string): Promise<INotification>;
  archive(): Promise<INotification>;
  unarchive(): Promise<INotification>;
  softDelete(): Promise<INotification>;
  isExpired(): boolean;
  canRetryDelivery(): boolean;
  isUrgent(): boolean;
  getRecipientInfo(): { id: string; type: 'business' | 'manufacturer' };
  shouldAutoExpire(): boolean;
  getDeliveryPriority(): number;
  
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    // Core recipient fields (aligned with service dual support)
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      sparse: true,
      index: true,
      validate: {
        validator: function() {
          return !!(this.business || this.manufacturer);
        },
        message: 'Either business or manufacturer must be specified'
      }
    },
    manufacturer: {
      type: Schema.Types.ObjectId,
      ref: 'Manufacturer',
      sparse: true,
      index: true,
      validate: {
        validator: function() {
          return !!(this.business || this.manufacturer);
        },
        message: 'Either business or manufacturer must be specified'
      }
    },
    
    // Core notification fields (aligned with controller validation)
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
      maxlength: [2000, 'Message cannot exceed 2000 characters'] // Increased for service needs
    },
    data: { 
      type: Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function(v: any) {
          if (!v) return true;
          try {
            return JSON.stringify(v).length <= 10000; // 10KB limit for service data
          } catch {
            return false;
          }
        },
        message: 'Data size cannot exceed 10KB'
      }
    },
    read: { 
      type: Boolean, 
      default: false,
      index: true
    },
    
    // Enhanced fields (aligned with controller validation)
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true
    },
    category: {
      type: String,
      enum: ['system', 'billing', 'certificate', 'vote', 'invite', 'order', 'security', 'auth', 'wallet', 'messaging', 'usage', 'settings', 'bulk', 'connection', 'account'],
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
    
    // Delivery tracking (aligned with service delivery methods)
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending',
      index: true
    },
    deliveryChannels: [{
      type: String,
      enum: ['in_app', 'email', 'sms', 'push', 'slack', 'webhook'],
      default: 'in_app'
    }],
    deliveryAttempts: {
      type: Number,
      default: 0,
      min: [0, 'Delivery attempts cannot be negative'],
      max: [10, 'Delivery attempts cannot exceed 10']
    },
    lastDeliveryAttempt: {
      type: Date,
      index: true
    },
    deliveryError: {
      type: String,
      trim: true,
      maxlength: [500, 'Delivery error cannot exceed 500 characters']
    },
    
    // Bulk notification tracking (aligned with service bulk methods)
    batchId: {
      type: String,
      trim: true,
      maxlength: [100, 'Batch ID cannot exceed 100 characters'],
      index: true
    },
    bulkNotification: {
      type: Boolean,
      default: false,
      index: true
    },
    recipientEmail: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Recipient email must be valid'
      }
    },
    recipientName: {
      type: String,
      trim: true,
      maxlength: [200, 'Recipient name cannot exceed 200 characters']
    },
    
    // Archive and management (aligned with controller bulk actions)
    archived: {
      type: Boolean,
      default: false,
      index: true
    },
    archivedAt: {
      type: Date,
      index: true
    },
    deletedAt: {
      type: Date, // For soft delete functionality
      index: true
    },
    
    // Notification lifecycle tracking (aligned with service analytics)
    viewedAt: {
      type: Date,
      index: true
    },
    clickedAt: {
      type: Date
    },
    interactionCount: {
      type: Number,
      default: 0,
      min: [0, 'Interaction count cannot be negative']
    },
    
    // Template and personalization (aligned with service email templates)
    templateId: {
      type: String,
      trim: true,
      maxlength: [100, 'Template ID cannot exceed 100 characters']
    },
    templateData: {
      type: Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function(v: any) {
          if (!v) return true;
          try {
            return JSON.stringify(v).length <= 5000; // 5KB limit for template data
          } catch {
            return false;
          }
        },
        message: 'Template data size cannot exceed 5KB'
      }
    },
    personalizedMessage: {
      type: String,
      trim: true,
      maxlength: [2000, 'Personalized message cannot exceed 2000 characters']
    }
  },
  { 
    timestamps: { createdAt: true, updatedAt: true },
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        // Don't include soft deleted notifications in JSON
        if (ret.deletedAt) {
          return null;
        }
        return ret;
      }
    }
  }
);

// Indexes for Performance (optimized for service queries)
NotificationSchema.index({ business: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ manufacturer: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ business: 1, category: 1, read: 1 });
NotificationSchema.index({ manufacturer: 1, category: 1, read: 1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ category: 1, priority: 1 });
NotificationSchema.index({ deliveryStatus: 1, deliveryAttempts: 1 });
NotificationSchema.index({ priority: 1, createdAt: -1 });

// Service-specific indexes
NotificationSchema.index({ batchId: 1 });
NotificationSchema.index({ bulkNotification: 1, deliveryStatus: 1 });
NotificationSchema.index({ archived: 1, archivedAt: -1 });
NotificationSchema.index({ deletedAt: 1 }, { sparse: true });

// TTL index for expired notifications
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Query helper for active notifications (not soft deleted)
NotificationSchema.statics.findActive = function() {
  return this.find({ deletedAt: { $exists: false } });
};

// Virtuals (aligned with service return types)
NotificationSchema.virtual('recipientType').get(function() {
  return this.business ? 'business' : 'manufacturer';
});

NotificationSchema.virtual('recipientId').get(function() {
  return this.business?.toString() || this.manufacturer?.toString();
});

NotificationSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});

NotificationSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

NotificationSchema.virtual('isRecent').get(function() {
  const ageInHours = Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
  return ageInHours <= 24;
});

NotificationSchema.virtual('needsAttention').get(function() {
  return !this.read && ['urgent', 'high'].includes(this.priority);
});

NotificationSchema.virtual('deliveryStatusInfo').get(function() {
  return {
    status: this.deliveryStatus,
    attempts: this.deliveryAttempts,
    canRetry: this.canRetryDelivery(),
    lastAttempt: this.lastDeliveryAttempt,
    error: this.deliveryError
  };
});

// Instance Methods (aligned with service requirements)
NotificationSchema.methods.markAsRead = function(): Promise<INotification> {
  this.read = true;
  if (!this.viewedAt) {
    this.viewedAt = new Date();
  }
  return this.save();
};

NotificationSchema.methods.markAsDelivered = function(): Promise<INotification> {
  this.deliveryStatus = 'delivered';
  this.lastDeliveryAttempt = new Date();
  this.deliveryError = undefined;
  return this.save();
};

NotificationSchema.methods.markAsViewed = function(): Promise<INotification> {
  this.viewedAt = new Date();
  this.interactionCount = (this.interactionCount || 0) + 1;
  return this.save();
};

NotificationSchema.methods.markAsClicked = function(): Promise<INotification> {
  this.clickedAt = new Date();
  this.interactionCount = (this.interactionCount || 0) + 1;
  if (!this.read) {
    this.read = true;
  }
  return this.save();
};

NotificationSchema.methods.incrementDeliveryAttempt = function(error?: string): Promise<INotification> {
  this.deliveryAttempts = (this.deliveryAttempts || 0) + 1;
  this.lastDeliveryAttempt = new Date();
  
  if (error) {
    this.deliveryError = error;
  }
  
  // Mark as failed after max attempts
  if (this.deliveryAttempts >= 3) {
    this.deliveryStatus = 'failed';
  }
  
  return this.save();
};

NotificationSchema.methods.archive = function(): Promise<INotification> {
  this.archived = true;
  this.archivedAt = new Date();
  return this.save();
};

NotificationSchema.methods.unarchive = function(): Promise<INotification> {
  this.archived = false;
  this.archivedAt = undefined;
  return this.save();
};

NotificationSchema.methods.softDelete = function(): Promise<INotification> {
  this.deletedAt = new Date();
  return this.save();
};

NotificationSchema.methods.isExpired = function(): boolean {
  return !!(this.expiresAt && this.expiresAt <= new Date());
};

NotificationSchema.methods.canRetryDelivery = function(): boolean {
  return this.deliveryStatus === 'failed' && (this.deliveryAttempts || 0) < 3;
};

NotificationSchema.methods.isUrgent = function(): boolean {
  return this.priority === 'urgent';
};

NotificationSchema.methods.getRecipientInfo = function(): { id: string; type: 'business' | 'manufacturer' } {
  return {
    id: this.recipientId,
    type: this.recipientType
  };
};

NotificationSchema.methods.shouldAutoExpire = function(): boolean {
  // Auto-expire certain categories after 30 days
  const autoExpireCategories = ['invite', 'order'];
  return autoExpireCategories.includes(this.category) && this.ageInDays > 30;
};

NotificationSchema.methods.getDeliveryPriority = function(): number {
  const priorityMap = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
  };
  return priorityMap[this.priority] || 2;
};

// Static Methods (aligned with service search methods)
NotificationSchema.statics.findUnreadForBusiness = function(businessId: string) {
  return this.find({ 
    business: businessId, 
    read: false,
    deletedAt: { $exists: false },
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
    deletedAt: { $exists: false },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ priority: -1, createdAt: -1 });
};

NotificationSchema.statics.findByCategory = function(
  recipientId: string, 
  recipientType: 'business' | 'manufacturer', 
  category: string
) {
  const filter: any = { 
    category,
    deletedAt: { $exists: false }
  };
  filter[recipientType] = recipientId;
  
  return this.find(filter).sort({ createdAt: -1 });
};

NotificationSchema.statics.markAllAsRead = function(
  recipientId: string, 
  recipientType: 'business' | 'manufacturer'
) {
  const filter: any = { 
    read: false,
    deletedAt: { $exists: false }
  };
  filter[recipientType] = recipientId;
  
  return this.updateMany(filter, { 
    read: true,
    viewedAt: new Date()
  });
};

NotificationSchema.statics.getUnreadCount = function(
  recipientId: string, 
  recipientType: 'business' | 'manufacturer'
) {
  const filter: any = { 
    read: false,
    deletedAt: { $exists: false },
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
    deliveryAttempts: { $lt: 3 },
    deletedAt: { $exists: false }
  }).sort({ priority: -1, createdAt: 1 });
};

// Service analytics methods (aligned with service stats)
NotificationSchema.statics.getNotificationStats = function(
  recipientId: string, 
  recipientType: 'business' | 'manufacturer'
) {
  const filter: any = {
    deletedAt: { $exists: false }
  };
  filter[recipientType] = new Types.ObjectId(recipientId);
  
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$category',
        total: { $sum: 1 },
        unread: { $sum: { $cond: ['$read', 0, 1] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] } }
      }
    },
    { $sort: { total: -1 } }
  ]);
};

NotificationSchema.statics.getComprehensiveStats = function(
  recipientId: string, 
  recipientType: 'business' | 'manufacturer'
) {
  const filter: any = {
    deletedAt: { $exists: false }
  };
  filter[recipientType] = new Types.ObjectId(recipientId);
  
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: ['$read', 0, 1] } },
        byType: { 
          $push: { 
            type: '$type', 
            category: '$category', 
            priority: '$priority',
            read: '$read'
          } 
        },
        recentCount: {
          $sum: {
            $cond: [
              { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        },
        deliveryIssues: {
          $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Bulk operations (aligned with service bulk methods)
NotificationSchema.statics.bulkMarkAsRead = function(notificationIds: string[]) {
  return this.updateMany(
    { 
      _id: { $in: notificationIds },
      deletedAt: { $exists: false }
    },
    { 
      read: true,
      viewedAt: new Date()
    }
  );
};

NotificationSchema.statics.bulkArchive = function(notificationIds: string[]) {
  return this.updateMany(
    { 
      _id: { $in: notificationIds },
      deletedAt: { $exists: false }
    },
    { 
      archived: true,
      archivedAt: new Date()
    }
  );
};

NotificationSchema.statics.bulkSoftDelete = function(notificationIds: string[]) {
  return this.updateMany(
    { 
      _id: { $in: notificationIds },
      deletedAt: { $exists: false }
    },
    { 
      deletedAt: new Date()
    }
  );
};

// Cleanup methods (aligned with service cleanup)
NotificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lte: new Date() }
  });
};

NotificationSchema.statics.cleanupOldRead = function(daysToKeep: number = 90) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  return this.deleteMany({
    read: true,
    createdAt: { $lt: cutoffDate },
    priority: { $in: ['low', 'medium'] } // Keep high/urgent notifications longer
  });
};

NotificationSchema.statics.findForCleanup = function(daysToKeep: number = 90) {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  return this.find({
    read: true,
    createdAt: { $lt: cutoffDate }
  }).select('_id type category createdAt');
};

// Batch operations (aligned with service batch functionality)
NotificationSchema.statics.createBulkNotifications = function(notifications: Array<{
  recipientId: string;
  recipientType: 'business' | 'manufacturer';
  type: string;
  category: string;
  message: string;
  priority?: string;
  batchId?: string;
  templateId?: string;
  templateData?: any;
}>) {
  const docs = notifications.map(notification => ({
    [notification.recipientType]: notification.recipientId,
    type: notification.type,
    category: notification.category,
    message: notification.message,
    priority: notification.priority || 'medium',
    batchId: notification.batchId,
    templateId: notification.templateId,
    templateData: notification.templateData,
    bulkNotification: true,
    deliveryChannels: ['in_app']
  }));
  
  return this.insertMany(docs);
};

NotificationSchema.statics.findByBatchId = function(batchId: string) {
  return this.find({ 
    batchId,
    deletedAt: { $exists: false }
  }).sort({ createdAt: -1 });
};

NotificationSchema.statics.getBatchStats = function(batchId: string) {
  return this.aggregate([
    { $match: { batchId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'failed'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'pending'] }, 1, 0] } },
        read: { $sum: { $cond: ['$read', 1, 0] } }
      }
    }
  ]);
};

// Advanced filtering (aligned with controller filtering)
NotificationSchema.statics.findWithFilters = function(
  recipientId: string,
  recipientType: 'business' | 'manufacturer',
  filters: {
    type?: string;
    category?: string;
    priority?: string;
    read?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    archived?: boolean;
  } = {}
) {
  const query: any = {
    deletedAt: { $exists: false }
  };
  query[recipientType] = recipientId;
  
  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = filters.category;
  if (filters.priority) query.priority = filters.priority;
  if (filters.read !== undefined) query.read = filters.read;
  if (filters.archived !== undefined) query.archived = filters.archived;
  
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
    if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
  }
  
  return this.find(query);
};

// Pre-save middleware (aligned with service validation)
NotificationSchema.pre('save', function(next) {
  // Ensure only one recipient type is set
  if (this.business && this.manufacturer) {
    return next(new Error('Notification cannot have both business and manufacturer recipients'));
  }
  
  // Set default expiration for certain categories
  if (this.isNew && !this.expiresAt) {
    if (['invite', 'order'].includes(this.category)) {
      this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }
  
  // Set default delivery channels
  if (this.isNew && (!this.deliveryChannels || this.deliveryChannels.length === 0)) {
    this.deliveryChannels = ['in_app'];
  }
  
  // Generate batch ID for bulk notifications if not set
  if (this.isNew && this.bulkNotification && !this.batchId) {
    this.batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  next();
});

// Post-save middleware for analytics and logging
NotificationSchema.post('save', function(doc) {
  // Log high priority notifications (remove doc.isNew as it's not available in post-save)
  if (doc.priority === 'urgent') {
    logger.info(`Urgent notification created: ${doc.type} for ${doc.recipientType || 'unknown'} ${doc.recipientId || 'unknown'}`);
  }
  
  // Log delivery failures
  if (doc.isModified('deliveryStatus') && doc.deliveryStatus === 'failed') {
    logger.info(`Notification delivery failed: ${doc._id} - ${doc.deliveryError}`);
  }
  
  // Log bulk notification completion
  if (doc.bulkNotification && doc.isModified('deliveryStatus') && doc.deliveryStatus === 'delivered') {
    logger.info(`Bulk notification delivered: Batch ${doc.batchId}`);
  }
});

// Pre-remove middleware for cleanup logging
NotificationSchema.pre('remove', function(this: INotification, next) {
  logger.info(`Removing notification: ${this.type} for ${this.recipientType || 'unknown'}`);
  next();
});

export const Notification = model<INotification>('Notification', NotificationSchema);
