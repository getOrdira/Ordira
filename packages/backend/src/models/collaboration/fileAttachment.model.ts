// src/models/collaboration/fileAttachment.model.ts
import { Schema, model, Document, Types, Model } from 'mongoose';

/**
 * Version History Entry Interface
 */
export interface IVersionHistoryEntry {
  version: number;
  uploadedAt: Date;
  uploadedBy: Types.ObjectId;
  s3Key: string;
  changeNotes?: string;
}

/**
 * Design Metadata Interface (for design files)
 */
export interface IDesignMetadata {
  format: '3D' | '2D' | 'CAD' | 'PDF' | 'image';
  dimensions?: {
    width: number;
    height: number;
    depth?: number;
  };
  units?: string; // e.g., 'mm', 'cm', 'inches'
  software?: string; // e.g., 'AutoCAD', 'SolidWorks', 'Blender'
  renderUrl?: string; // Preview/thumbnail URL
}

/**
 * Approval History Entry Interface
 */
export interface IApprovalHistoryEntry {
  status: 'approved' | 'rejected' | 'revision_requested';
  approvedBy: Types.ObjectId;
  approverType: 'brand' | 'manufacturer';
  timestamp: Date;
  comments?: string;
}

/**
 * Annotation Interface (for design file markup)
 */
export interface IAnnotation {
  annotationId: string;
  createdBy: Types.ObjectId;
  creatorType: 'brand' | 'manufacturer';
  position: {
    x: number; // Relative coordinates (0-1)
    y: number;
  };
  type: 'comment' | 'dimension' | 'revision' | 'highlight';
  content: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
}

/**
 * File Attachment Document Interface
 * Represents design files, documents, and media with version control
 */
export interface IFileAttachment extends Document {
  // Relationships
  workspaceId: Types.ObjectId; // Reference to Workspace
  uploadedBy: Types.ObjectId; // User who uploaded
  uploaderType: 'brand' | 'manufacturer';

  // File Information
  fileName: string;
  fileType: string; // MIME type
  fileCategory: 'design' | 'technical_spec' | 'sample_photo' | 'production_photo' | 'contract' | 'certificate' | 'other';
  fileSize: number; // bytes

  // S3 Storage
  s3Bucket: string;
  s3Key: string;
  s3Url: string; // Signed URL (temporary)
  s3Region: string;

  // Version Control
  version: number;
  isLatestVersion: boolean;
  parentFileId?: Types.ObjectId; // Reference to previous version
  versionHistory: IVersionHistoryEntry[];

  // Design File Specific
  designMetadata?: IDesignMetadata;

  // Approval Workflow
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  approvalHistory: IApprovalHistoryEntry[];

  // Annotations (for design files)
  annotations: IAnnotation[];

  // Access Control
  accessLevel: 'public' | 'members_only' | 'restricted';
  restrictedTo?: Types.ObjectId[]; // Specific user IDs

  // Metadata
  tags: string[];
  description?: string;
  uploadedAt: Date;
  lastModifiedAt: Date;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;

  // Timestamps (from timestamps: true)
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  hasAccess(userId: string): boolean;
  addAnnotation(annotationData: Partial<IAnnotation>): Promise<IFileAttachment>;
  resolveAnnotation(annotationId: string, resolvedBy: string): Promise<IFileAttachment>;
  approve(userId: string, userType: 'brand' | 'manufacturer', comments?: string): Promise<IFileAttachment>;
  reject(userId: string, userType: 'brand' | 'manufacturer', comments?: string): Promise<IFileAttachment>;
  softDelete(userId: string): Promise<IFileAttachment>;
}

/**
 * File Attachment Static Methods Interface
 */
export interface IFileAttachmentModel extends Model<IFileAttachment> {
  findByWorkspace(workspaceId: string, category?: string): Promise<IFileAttachment[]>;
  findLatestVersions(workspaceId: string): Promise<IFileAttachment[]>;
  getPendingApprovals(userId: string): Promise<IFileAttachment[]>;
  getFileStats(workspaceId: string): Promise<any>;
}

/**
 * Version History Entry Schema
 */
const VersionHistoryEntrySchema = new Schema<IVersionHistoryEntry>({
  version: {
    type: Number,
    required: true,
    min: 1
  },
  uploadedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  s3Key: {
    type: String,
    required: true
  },
  changeNotes: {
    type: String,
    maxlength: 1000
  }
}, { _id: false });

/**
 * Design Metadata Schema
 */
const DesignMetadataSchema = new Schema<IDesignMetadata>({
  format: {
    type: String,
    enum: ['3D', '2D', 'CAD', 'PDF', 'image'],
    required: true
  },
  dimensions: {
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    depth: { type: Number, min: 0 }
  },
  units: {
    type: String,
    maxlength: 20
  },
  software: {
    type: String,
    maxlength: 100
  },
  renderUrl: {
    type: String
  }
}, { _id: false });

/**
 * Approval History Entry Schema
 */
const ApprovalHistoryEntrySchema = new Schema<IApprovalHistoryEntry>({
  status: {
    type: String,
    enum: ['approved', 'rejected', 'revision_requested'],
    required: true
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  approverType: {
    type: String,
    enum: ['brand', 'manufacturer'],
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  comments: {
    type: String,
    maxlength: 2000
  }
}, { _id: true });

/**
 * Annotation Schema
 */
const AnnotationSchema = new Schema<IAnnotation>({
  annotationId: {
    type: String,
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  creatorType: {
    type: String,
    enum: ['brand', 'manufacturer'],
    required: true
  },
  position: {
    x: { type: Number, required: true, min: 0, max: 1 },
    y: { type: Number, required: true, min: 0, max: 1 }
  },
  type: {
    type: String,
    enum: ['comment', 'dimension', 'revision', 'highlight'],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: true });

/**
 * Main File Attachment Schema
 */
const FileAttachmentSchema = new Schema<IFileAttachment>(
  {
    // Relationships
    workspaceId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Workspace ID is required'],
      ref: 'Workspace',
      index: true
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      required: [true, 'Uploader ID is required'],
      ref: 'User',
      index: true
    },
    uploaderType: {
      type: String,
      enum: {
        values: ['brand', 'manufacturer'],
        message: 'Uploader type must be brand or manufacturer'
      },
      required: [true, 'Uploader type is required']
    },

    // File Information
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters']
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
      trim: true,
      maxlength: 100
    },
    fileCategory: {
      type: String,
      enum: {
        values: ['design', 'technical_spec', 'sample_photo', 'production_photo', 'contract', 'certificate', 'other'],
        message: 'Invalid file category'
      },
      required: [true, 'File category is required'],
      index: true
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size cannot be negative']
    },

    // S3 Storage
    s3Bucket: {
      type: String,
      required: [true, 'S3 bucket is required']
    },
    s3Key: {
      type: String,
      required: [true, 'S3 key is required'],
      unique: true,
      index: true
    },
    s3Url: {
      type: String,
      required: [true, 'S3 URL is required']
    },
    s3Region: {
      type: String,
      required: [true, 'S3 region is required'],
      default: 'us-east-1'
    },

    // Version Control
    version: {
      type: Number,
      required: [true, 'Version is required'],
      min: 1,
      default: 1
    },
    isLatestVersion: {
      type: Boolean,
      required: true,
      default: true,
      index: true
    },
    parentFileId: {
      type: Schema.Types.ObjectId,
      ref: 'FileAttachment',
      index: true
    },
    versionHistory: {
      type: [VersionHistoryEntrySchema],
      default: []
    },

    // Design File Specific
    designMetadata: {
      type: DesignMetadataSchema,
      default: undefined
    },

    // Approval Workflow
    approvalStatus: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected', 'revision_requested'],
        message: 'Invalid approval status'
      },
      required: [true, 'Approval status is required'],
      default: 'pending',
      index: true
    },
    approvalHistory: {
      type: [ApprovalHistoryEntrySchema],
      default: []
    },

    // Annotations
    annotations: {
      type: [AnnotationSchema],
      default: []
    },

    // Access Control
    accessLevel: {
      type: String,
      enum: {
        values: ['public', 'members_only', 'restricted'],
        message: 'Invalid access level'
      },
      required: [true, 'Access level is required'],
      default: 'members_only'
    },
    restrictedTo: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: undefined
    },

    // Metadata
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function(tags: string[]) {
          return tags.every(tag => tag.length <= 50);
        },
        message: 'Each tag must be 50 characters or less'
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    uploadedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    lastModifiedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    deletedAt: {
      type: Date
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
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
    },
    toObject: { virtuals: true }
  }
);

// ====================
// INDEXES FOR MONGODB ATLAS PERFORMANCE
// ====================

// Composite index for workspace file listing
FileAttachmentSchema.index({ workspaceId: 1, uploadedAt: -1 });

// Unique index for S3 key
FileAttachmentSchema.index({ s3Key: 1 }, { unique: true });

// Index for uploader's files
FileAttachmentSchema.index({ uploadedBy: 1, uploadedAt: -1 });

// Index for file category filtering
FileAttachmentSchema.index({ fileCategory: 1, workspaceId: 1 });

// Index for approval workflow queries
FileAttachmentSchema.index({ approvalStatus: 1, workspaceId: 1 });

// Index for version control queries
FileAttachmentSchema.index({ isLatestVersion: 1, parentFileId: 1 });

// Index for finding files by tags
FileAttachmentSchema.index({ tags: 1 });

// Index for soft delete queries
FileAttachmentSchema.index({ deletedAt: 1 }, { sparse: true });

// Compound index for annotation queries
FileAttachmentSchema.index({
  workspaceId: 1,
  fileCategory: 1,
  'annotations.resolvedAt': 1
}, { sparse: true });

// Text index for file search
FileAttachmentSchema.index({ fileName: 'text', description: 'text', tags: 'text' });

// ====================
// VIRTUAL PROPERTIES
// ====================

// Virtual for annotation count
FileAttachmentSchema.virtual('annotationCount').get(function() {
  return this.annotations.length;
});

// Virtual for unresolved annotation count
FileAttachmentSchema.virtual('unresolvedAnnotationCount').get(function() {
  return this.annotations.filter((a: IAnnotation) => !a.resolvedAt).length;
});

// Virtual for file size in MB
FileAttachmentSchema.virtual('fileSizeMB').get(function() {
  return (this.fileSize / (1024 * 1024)).toFixed(2);
});

// Virtual for approval count
FileAttachmentSchema.virtual('approvalCount').get(function() {
  return this.approvalHistory.length;
});

// Virtual for is deleted status
FileAttachmentSchema.virtual('isDeleted').get(function() {
  return !!this.deletedAt;
});

// ====================
// INSTANCE METHODS
// ====================

// Check if user has access to file
FileAttachmentSchema.methods.hasAccess = function(userId: string): boolean {
  if (this.accessLevel === 'public' || this.accessLevel === 'members_only') {
    return true;
  }
  if (this.accessLevel === 'restricted' && this.restrictedTo) {
    const userIdStr = userId.toString();
    return this.restrictedTo.some((id: Types.ObjectId) => id.toString() === userIdStr);
  }
  return false;
};

// Add an annotation
FileAttachmentSchema.methods.addAnnotation = function(
  annotationData: Partial<IAnnotation>
): Promise<IFileAttachment> {
  const annotation: IAnnotation = {
    annotationId: new Types.ObjectId().toString(),
    createdBy: annotationData.createdBy!,
    creatorType: annotationData.creatorType!,
    position: annotationData.position!,
    type: annotationData.type!,
    content: annotationData.content!,
    createdAt: new Date()
  };

  this.annotations.push(annotation);
  this.lastModifiedAt = new Date();
  return this.save();
};

// Resolve an annotation
FileAttachmentSchema.methods.resolveAnnotation = function(
  annotationId: string,
  resolvedBy: string
): Promise<IFileAttachment> {
  const annotation = this.annotations.find(
    (a: IAnnotation) => a.annotationId === annotationId
  );

  if (annotation) {
    annotation.resolvedAt = new Date();
    annotation.resolvedBy = new Types.ObjectId(resolvedBy);
    this.lastModifiedAt = new Date();
    return this.save();
  }

  return Promise.reject(new Error('Annotation not found'));
};

// Approve file
FileAttachmentSchema.methods.approve = function(
  userId: string,
  userType: 'brand' | 'manufacturer',
  comments?: string
): Promise<IFileAttachment> {
  this.approvalStatus = 'approved';
  this.approvalHistory.push({
    status: 'approved',
    approvedBy: new Types.ObjectId(userId),
    approverType: userType,
    timestamp: new Date(),
    comments
  } as IApprovalHistoryEntry);
  this.lastModifiedAt = new Date();
  return this.save();
};

// Reject file
FileAttachmentSchema.methods.reject = function(
  userId: string,
  userType: 'brand' | 'manufacturer',
  comments?: string
): Promise<IFileAttachment> {
  this.approvalStatus = 'rejected';
  this.approvalHistory.push({
    status: 'rejected',
    approvedBy: new Types.ObjectId(userId),
    approverType: userType,
    timestamp: new Date(),
    comments
  } as IApprovalHistoryEntry);
  this.lastModifiedAt = new Date();
  return this.save();
};

// Soft delete file
FileAttachmentSchema.methods.softDelete = function(userId: string): Promise<IFileAttachment> {
  this.deletedAt = new Date();
  this.deletedBy = new Types.ObjectId(userId);
  return this.save();
};

// ====================
// STATIC METHODS
// ====================

// Find files by workspace
FileAttachmentSchema.statics.findByWorkspace = function(
  workspaceId: string,
  category?: string
) {
  const query: any = {
    workspaceId,
    deletedAt: null
  };

  if (category) {
    query.fileCategory = category;
  }

  return this.find(query)
    .sort({ uploadedAt: -1 })
    .populate('uploadedBy', 'name email');
};

// Find latest versions only
FileAttachmentSchema.statics.findLatestVersions = function(workspaceId: string) {
  return this.find({
    workspaceId,
    isLatestVersion: true,
    deletedAt: null
  })
    .sort({ uploadedAt: -1 });
};

// Find files pending approval
FileAttachmentSchema.statics.getPendingApprovals = function(userId: string) {
  return this.find({
    approvalStatus: 'pending',
    deletedAt: null,
    // User is in restricted list or file is members_only
    $or: [
      { accessLevel: 'members_only' },
      { restrictedTo: userId }
    ]
  })
    .sort({ uploadedAt: 1 })
    .populate('workspaceId', 'name workspaceId');
};

// Get file statistics for a workspace
FileAttachmentSchema.statics.getFileStats = async function(workspaceId: string) {
  const stats = await this.aggregate([
    {
      $match: {
        workspaceId: new Types.ObjectId(workspaceId),
        deletedAt: null
      }
    },
    {
      $group: {
        _id: '$fileCategory',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        avgSize: { $avg: '$fileSize' },
        pendingApprovals: {
          $sum: { $cond: [{ $eq: ['$approvalStatus', 'pending'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats;
};

// ====================
// MIDDLEWARE
// ====================

// Pre-save: Update lastModifiedAt
FileAttachmentSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModifiedAt = new Date();
  }
  next();
});

// Pre-save: Initialize version history on first save
FileAttachmentSchema.pre('save', function(next) {
  if (this.isNew && this.versionHistory.length === 0) {
    this.versionHistory.push({
      version: 1,
      uploadedAt: this.uploadedAt,
      uploadedBy: this.uploadedBy,
      s3Key: this.s3Key
    });
  }
  next();
});

export const FileAttachment = model<IFileAttachment, IFileAttachmentModel>(
  'FileAttachment',
  FileAttachmentSchema
);
