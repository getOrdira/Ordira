// src/models/media.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IMedia extends Document {
  url: string;
  type: 'image' | 'video' | 'gif' | 'document';
  uploadedBy: Types.ObjectId; // References Business model
  createdAt: Date;
  updatedAt: Date;
  
  // File metadata (aligned with service interfaces)
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  
  // Organization (aligned with controller validation)
  category: 'profile' | 'product' | 'banner' | 'certificate' | 'document';
  resourceId?: string;
  
  // Additional metadata and tags (aligned with service methods)
  metadata?: Record<string, any>;
  tags?: string[];
  description?: string;
  
  // File status and flags (aligned with service validation)
  isActive?: boolean;
  isProcessed?: boolean;
  processingError?: string;
  
  // Access control (aligned with controller security)
  isPublic?: boolean;
  accessPermissions?: string[];
  
  // File versioning
  version?: number;
  parentFileId?: Types.ObjectId;
  
  // Statistics (aligned with service analytics)
  downloadCount?: number;
  lastAccessedAt?: Date;
  lastDownloadedAt?: Date; // Added for service compatibility
  
  // Instance methods (aligned with service requirements)
  incrementDownloadCount(): Promise<IMedia>;
  addTag(tag: string): Promise<IMedia>;
  removeTag(tag: string): Promise<IMedia>;
  updateMetadata(newMetadata: Record<string, any>): Promise<IMedia>;
  isImage(): boolean;
  isVideo(): boolean;
  isDocument(): boolean;
  getPublicUrl(): string;
  formatFileSize(): string;
  getFileExtension(): string;
  isOwnedBy(businessId: string): boolean;
  canBeAccessedBy(businessId?: string): boolean;
}

const MediaSchema = new Schema<IMedia>(
  {
    // Core required fields (aligned with service validation)
    url: { 
      type: String, 
      required: [true, 'URL is required'],
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v);
        },
        message: 'URL must be a valid HTTP/HTTPS URL or local path'
      },
      index: true
    },
    type: { 
      type: String, 
      enum: ['image', 'video', 'gif', 'document'], 
      required: [true, 'Media type is required'],
      index: true
    },
    uploadedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'Business', // Aligned with service references
      required: [true, 'Uploader reference is required'],
      index: true
    },
    
    // File metadata (aligned with service interfaces)
    filename: { 
      type: String, 
      required: [true, 'Filename is required'],
      trim: true,
      maxlength: [255, 'Filename cannot exceed 255 characters'],
      index: true
    },
    originalName: { 
      type: String, 
      required: [true, 'Original name is required'],
      trim: true,
      maxlength: [255, 'Original name cannot exceed 255 characters']
    },
    mimeType: { 
      type: String, 
      required: [true, 'MIME type is required'],
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          return /^[a-z0-9][a-z0-9!#$&\-\^_]*\/[a-z0-9][a-z0-9!#$&\-\^_.]*$/.test(v);
        },
        message: 'Invalid MIME type format'
      },
      index: true
    },
    size: { 
      type: Number, 
      required: [true, 'File size is required'],
      min: [1, 'File size must be at least 1 byte'],
      max: [100 * 1024 * 1024, 'File size cannot exceed 100MB'], // 100MB limit
      index: true
    },
    
    // Organization (aligned with controller validation)
    category: { 
      type: String, 
      enum: ['profile', 'product', 'banner', 'certificate', 'document'],
      default: 'document',
      index: true
    },
    resourceId: { 
      type: String,
      trim: true,
      sparse: true,
      maxlength: [100, 'Resource ID cannot exceed 100 characters'],
      index: true
    },
    
    // Additional metadata (aligned with service methods)
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
    tags: [{ 
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [50, 'Tag cannot exceed 50 characters'],
      validate: {
        validator: function(tags: string[]) {
          return tags.length <= 20; // Max 20 tags as per service validation
        },
        message: 'Maximum 20 tags allowed'
      }
    }],
    description: { 
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // File status (aligned with service validation)
    isActive: { 
      type: Boolean, 
      default: true,
      index: true
    },
    isProcessed: { 
      type: Boolean, 
      default: true 
    },
    processingError: { 
      type: String,
      trim: true,
      maxlength: [1000, 'Processing error cannot exceed 1000 characters']
    },
    
    // Access control (aligned with controller security)
    isPublic: { 
      type: Boolean, 
      default: false,
      index: true
    },
    accessPermissions: [{ 
      type: String,
      trim: true,
      maxlength: [100, 'Access permission cannot exceed 100 characters']
    }],
    
    // File versioning
    version: { 
      type: Number, 
      default: 1,
      min: [1, 'Version must be at least 1']
    },
    parentFileId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Media'
    },
    
    // Statistics (aligned with service analytics)
    downloadCount: { 
      type: Number, 
      default: 0,
      min: [0, 'Download count cannot be negative']
    },
    lastAccessedAt: { 
      type: Date,
      default: Date.now
    },
    lastDownloadedAt: { 
      type: Date // Added for service compatibility
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
MediaSchema.index({ uploadedBy: 1, category: 1 });
MediaSchema.index({ uploadedBy: 1, type: 1 });
MediaSchema.index({ uploadedBy: 1, resourceId: 1 });
MediaSchema.index({ uploadedBy: 1, createdAt: -1 });
MediaSchema.index({ uploadedBy: 1, isActive: 1 });
MediaSchema.index({ tags: 1 });
MediaSchema.index({ filename: 1 });
MediaSchema.index({ mimeType: 1 });
MediaSchema.index({ size: 1 });

// Compound indexes for service search methods
MediaSchema.index({ uploadedBy: 1, category: 1, type: 1 });
MediaSchema.index({ uploadedBy: 1, isActive: 1, createdAt: -1 });
MediaSchema.index({ uploadedBy: 1, isPublic: 1 });

// Text index for search functionality (aligned with service search)
MediaSchema.index({
  originalName: 'text',
  description: 'text',
  tags: 'text',
  filename: 'text'
});

// Virtuals (aligned with service return types)
MediaSchema.virtual('sizeFormatted').get(function() {
  return this.formatFileSize();
});

MediaSchema.virtual('extension').get(function() {
  return this.getFileExtension();
});

MediaSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

MediaSchema.virtual('isExpired').get(function() {
  // Files older than 1 year are considered old
  return this.ageInDays > 365;
});

MediaSchema.virtual('popularityScore').get(function() {
  // Simple popularity calculation
  return (this.downloadCount || 0) * 1.5;
});

// Instance Methods (aligned with service requirements)
MediaSchema.methods.incrementDownloadCount = function(): Promise<IMedia> {
  this.downloadCount = (this.downloadCount || 0) + 1;
  this.lastAccessedAt = new Date();
  this.lastDownloadedAt = new Date();
  return this.save();
};

MediaSchema.methods.addTag = function(tag: string): Promise<IMedia> {
  if (!this.tags) this.tags = [];
  const normalizedTag = tag.toLowerCase().trim();
  if (normalizedTag && !this.tags.includes(normalizedTag) && this.tags.length < 20) {
    this.tags.push(normalizedTag);
  }
  return this.save();
};

MediaSchema.methods.removeTag = function(tag: string): Promise<IMedia> {
  if (!this.tags) return Promise.resolve(this);
  const normalizedTag = tag.toLowerCase().trim();
  this.tags = this.tags.filter(t => t !== normalizedTag);
  return this.save();
};

MediaSchema.methods.updateMetadata = function(newMetadata: Record<string, any>): Promise<IMedia> {
  this.metadata = { ...this.metadata, ...newMetadata };
  return this.save();
};

MediaSchema.methods.isImage = function(): boolean {
  return this.type === 'image';
};

MediaSchema.methods.isVideo = function(): boolean {
  return this.type === 'video';
};

MediaSchema.methods.isDocument = function(): boolean {
  return this.type === 'document';
};

MediaSchema.methods.getPublicUrl = function(): string {
  return this.isPublic ? this.url : '';
};

// Format file size method (aligned with service utility)
MediaSchema.methods.formatFileSize = function(): string {
  if (!this.size || this.size === 0) return '0 Bytes';
  if (this.size < 0) return 'Invalid size';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(this.size) / Math.log(k));
  
  return parseFloat((this.size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file extension method (aligned with service utility)
MediaSchema.methods.getFileExtension = function(): string {
  return this.filename.split('.').pop()?.toLowerCase() || '';
};

// Ownership check (aligned with service security)
MediaSchema.methods.isOwnedBy = function(businessId: string): boolean {
  return this.uploadedBy.toString() === businessId.toString();
};

// Access check (aligned with service security)
MediaSchema.methods.canBeAccessedBy = function(businessId?: string): boolean {
  if (this.isPublic) return true;
  if (!businessId) return false;
  return this.isOwnedBy(businessId);
};

// Static Methods (aligned with service search methods)
MediaSchema.statics.findByBusinessId = function(businessId: string) {
  return this.find({ 
    uploadedBy: businessId, 
    isActive: true 
  }).sort({ createdAt: -1 });
};

MediaSchema.statics.findByCategory = function(businessId: string, category: string) {
  return this.find({ 
    uploadedBy: businessId, 
    category, 
    isActive: true 
  }).sort({ createdAt: -1 });
};

MediaSchema.statics.findByType = function(businessId: string, type: string) {
  return this.find({ 
    uploadedBy: businessId, 
    type, 
    isActive: true 
  }).sort({ createdAt: -1 });
};

MediaSchema.statics.searchFiles = function(businessId: string, searchTerm: string) {
  return this.find({
    uploadedBy: businessId,
    isActive: true,
    $text: { $search: searchTerm }
  }, {
    score: { $meta: 'textScore' }
  }).sort({
    score: { $meta: 'textScore' },
    createdAt: -1
  });
};

// Enhanced search method (aligned with service search functionality)
MediaSchema.statics.searchByQuery = function(
  businessId: string, 
  query: string, 
  options: {
    type?: string;
    category?: string;
    limit?: number;
  } = {}
) {
  const filter: any = {
    uploadedBy: businessId,
    isActive: true,
    $or: [
      { originalName: { $regex: query, $options: 'i' } },
      { filename: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  };

  if (options.type) filter.type = options.type;
  if (options.category) filter.category = options.category;

  return this.find(filter)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Storage statistics method (aligned with service analytics)
MediaSchema.statics.getStorageStats = function(businessId: string) {
  return this.aggregate([
    { $match: { uploadedBy: new Types.ObjectId(businessId), isActive: true } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' },
        averageSize: { $avg: '$size' },
        byType: { 
          $push: { 
            type: '$type', 
            size: '$size' 
          } 
        },
        byCategory: { 
          $push: { 
            category: '$category', 
            size: '$size' 
          } 
        }
      }
    }
  ]);
};

// Get category statistics (aligned with service analytics)
MediaSchema.statics.getCategoryStats = function(businessId: string, category: string) {
  return this.aggregate([
    { 
      $match: { 
        uploadedBy: new Types.ObjectId(businessId), 
        category, 
        isActive: true 
      } 
    },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' },
        averageSize: { $avg: '$size' },
        fileTypes: { 
          $push: '$type'
        }
      }
    }
  ]);
};

// Get type statistics (aligned with service analytics)
MediaSchema.statics.getTypeStats = function(businessId: string) {
  return this.aggregate([
    { $match: { uploadedBy: new Types.ObjectId(businessId), isActive: true } },
    { $group: { _id: '$type', count: { $sum: 1 }, totalSize: { $sum: '$size' } } }
  ]);
};

// Get recent files (aligned with service methods)
MediaSchema.statics.getRecentFiles = function(businessId: string, limit: number = 10) {
  return this.find({ 
    uploadedBy: businessId, 
    isActive: true 
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Get large files (for cleanup operations)
MediaSchema.statics.getLargeFiles = function(businessId: string, minSize: number = 10 * 1024 * 1024) {
  return this.find({ 
    uploadedBy: businessId, 
    isActive: true,
    size: { $gte: minSize }
  })
  .sort({ size: -1 });
};

// Get files by tags (aligned with service filtering)
MediaSchema.statics.findByTags = function(businessId: string, tags: string[]) {
  return this.find({
    uploadedBy: businessId,
    isActive: true,
    tags: { $in: tags }
  }).sort({ createdAt: -1 });
};

// Get orphaned files (files without resourceId when they should have one)
MediaSchema.statics.getOrphanedFiles = function(businessId: string) {
  return this.find({
    uploadedBy: businessId,
    isActive: true,
    resourceId: { $exists: false },
    category: { $ne: 'document' } // Documents can exist without resourceId
  });
};

// Pre-save middleware (aligned with service validation)
MediaSchema.pre('save', function(next) {
  // Clean up tags
  if (this.tags) {
    this.tags = [...new Set(this.tags.map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0))];
    
    // Enforce tag limit
    if (this.tags.length > 20) {
      this.tags = this.tags.slice(0, 20);
    }
  }
  
  // Set lastAccessedAt for new documents
  if (this.isNew) {
    this.lastAccessedAt = new Date();
  }
  
  // Validate metadata size
  if (this.metadata) {
    try {
      const metadataSize = JSON.stringify(this.metadata).length;
      if (metadataSize > 10000) {
        return next(new Error('Metadata size cannot exceed 10KB'));
      }
    } catch (error) {
      return next(new Error('Invalid metadata format'));
    }
  }
  
  next();
});

// Post-save middleware for analytics (aligned with service tracking)
MediaSchema.post('save', function(doc) {
  if (this.isNew) {
    console.log(`Media uploaded: ${doc.filename} by ${doc.uploadedBy}`);
  }
  
  if (this.isModified('downloadCount')) {
    console.log(`Media downloaded: ${doc.filename} (${doc.downloadCount} times)`);
  }
});

// Pre-remove middleware for cleanup
MediaSchema.pre('remove', function(next) {
  console.log(`Removing media: ${this.filename}`);
  next();
});

export const Media = model<IMedia>('Media', MediaSchema);