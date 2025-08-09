// src/models/media.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IMedia extends Document {
  url: string;
  type: 'image' | 'video' | 'gif' | 'document';
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // File metadata
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  
  // Organization
  category: 'profile' | 'product' | 'banner' | 'certificate' | 'document' | 'metadata';
  resourceId?: string;
  
  // Additional metadata and tags
  metadata?: Record<string, any>;
  tags?: string[];
  description?: string;
  
  // File status and flags
  isActive?: boolean;
  isProcessed?: boolean;
  processingError?: string;
  
  // Access control
  isPublic?: boolean;
  accessPermissions?: string[];
  
  // File versioning
  version?: number;
  parentFileId?: Types.ObjectId;
  
  // Statistics
  downloadCount?: number;
  lastAccessedAt?: Date;
  
  // Instance methods
  incrementDownloadCount(): Promise<IMedia>;
  addTag(tag: string): Promise<IMedia>;
  removeTag(tag: string): Promise<IMedia>;
  updateMetadata(newMetadata: Record<string, any>): Promise<IMedia>;
  isImage(): boolean;
  isVideo(): boolean;
  isDocument(): boolean;
  getPublicUrl(): string;
}

const MediaSchema = new Schema<IMedia>(
  {
    // Core required fields
    url: { 
      type: String, 
      required: [true, 'URL is required'],
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v) || /^\/uploads\/.+/.test(v);
        },
        message: 'URL must be a valid HTTP/HTTPS URL or local path'
      }
    },
    type: { 
      type: String, 
      enum: ['image', 'video', 'gif', 'document'], 
      required: [true, 'Media type is required'],
      index: true
    },
    uploadedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'Business', 
      required: [true, 'Uploader reference is required'],
      index: true
    },
    
    // File metadata
    filename: { 
      type: String, 
      required: [true, 'Filename is required'],
      trim: true,
      maxlength: [255, 'Filename cannot exceed 255 characters']
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
      }
    },
    size: { 
      type: Number, 
      required: [true, 'File size is required'],
      min: [1, 'File size must be at least 1 byte'],
      max: [100 * 1024 * 1024, 'File size cannot exceed 100MB'] // 100MB limit
    },
    
    // Organization
    category: { 
      type: String, 
      enum: ['profile', 'product', 'banner', 'certificate', 'document', 'metadata'],
      default: 'document',
      index: true
    },
    resourceId: { 
      type: String,
      trim: true,
      sparse: true,
      maxlength: [100, 'Resource ID cannot exceed 100 characters']
    },
    
    // Additional metadata
    metadata: { 
      type: Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function(v: any) {
          return JSON.stringify(v).length <= 10000; // 10KB limit for metadata
        },
        message: 'Metadata size cannot exceed 10KB'
      }
    },
    tags: [{ 
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    description: { 
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // File status
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
    
    // Access control
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
    
    // Statistics
    downloadCount: { 
      type: Number, 
      default: 0,
      min: [0, 'Download count cannot be negative']
    },
    lastAccessedAt: { 
      type: Date,
      default: Date.now
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

// Indexes for better performance
MediaSchema.index({ uploadedBy: 1, category: 1 });
MediaSchema.index({ uploadedBy: 1, type: 1 });
MediaSchema.index({ uploadedBy: 1, resourceId: 1 });
MediaSchema.index({ uploadedBy: 1, createdAt: -1 });
MediaSchema.index({ tags: 1 });
MediaSchema.index({ isActive: 1 });
MediaSchema.index({ filename: 1 });
MediaSchema.index({ originalName: 'text', description: 'text', tags: 'text' });

// Compound indexes for common queries
MediaSchema.index({ uploadedBy: 1, category: 1, type: 1 });
MediaSchema.index({ uploadedBy: 1, isActive: 1, createdAt: -1 });

// Virtual for file size in human-readable format
MediaSchema.virtual('sizeFormatted').get(function() {
  if (this.size === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(this.size) / Math.log(k));
  
  return parseFloat((this.size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for file extension
MediaSchema.virtual('extension').get(function() {
  return this.filename.split('.').pop()?.toLowerCase() || '';
});

// Virtual for age
MediaSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Instance methods
MediaSchema.methods.incrementDownloadCount = function(): Promise<IMedia> {
  this.downloadCount = (this.downloadCount || 0) + 1;
  this.lastAccessedAt = new Date();
  return this.save();
};

MediaSchema.methods.addTag = function(tag: string): Promise<IMedia> {
  if (!this.tags) this.tags = [];
  const normalizedTag = tag.toLowerCase().trim();
  if (normalizedTag && !this.tags.includes(normalizedTag)) {
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

// Static methods
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

MediaSchema.statics.getStorageStats = function(businessId: string) {
  return this.aggregate([
    { $match: { uploadedBy: new Types.ObjectId(businessId), isActive: true } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' },
        byType: { $push: { type: '$type', size: '$size' } },
        byCategory: { $push: { category: '$category', size: '$size' } }
      }
    }
  ]);
};

// Pre-save middleware
MediaSchema.pre('save', function(next) {
  if (this.tags) {
    this.tags = [...new Set(this.tags.map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0))];
  }
  
  if (this.isNew) {
    this.lastAccessedAt = new Date();
  }
  
  next();
});

export const Media = model<IMedia>('Media', MediaSchema);