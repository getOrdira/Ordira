// src/models/collaboration/workspace.model.ts
import { Schema, model, Document, Types, Model } from 'mongoose';

/**
 * Workspace Member Interface
 */
export interface IWorkspaceMember {
  userId: Types.ObjectId;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  addedAt: Date;
  addedBy: Types.ObjectId;
}

/**
 * Production Details Interface
 */
export interface IProductionDetails {
  productName?: string;
  quantity?: number;
  targetDeliveryDate?: Date;
  productionStartDate?: Date;
  productionEndDate?: Date;
  currentStatus?: 'pending' | 'in_progress' | 'quality_check' | 'shipping' | 'delivered';
}

/**
 * Enabled Features Interface (Plan-based)
 */
export interface IEnabledFeatures {
  fileSharing: boolean;
  realTimeUpdates: boolean;
  taskManagement: boolean;
  designReview: boolean;
  supplyChainTracking: boolean;
  videoUpdates: boolean;
  automatedNotifications: boolean;
}

/**
 * Workspace Document Interface
 * Represents a project-based collaboration space between a brand and manufacturer
 */
export interface IWorkspace extends Document {
  // Core Identifiers
  workspaceId: string; // UUID for external reference
  name: string;
  description?: string;

  // Relationship
  brandId: Types.ObjectId; // Reference to Business
  manufacturerId: Types.ObjectId; // Reference to Manufacturer
  connectionId?: string; // Optional: for tracking the connection

  // Workspace Type & Status
  type: 'production_run' | 'design_collaboration' | 'general';
  status: 'active' | 'archived' | 'completed' | 'cancelled';

  // Production Details (if type === 'production_run')
  productionDetails?: IProductionDetails;

  // Access Control
  brandMembers: IWorkspaceMember[];
  manufacturerMembers: IWorkspaceMember[];

  // Activity Tracking
  lastActivity: Date;
  activityCount: number;
  messageCount: number;
  fileCount: number;
  updateCount: number;

  // Plan-Based Features (denormalized for performance)
  enabledFeatures: IEnabledFeatures;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId;
  archivedAt?: Date;
  archivedBy?: Types.ObjectId;
}

/**
 * Workspace Static Methods Interface
 */
export interface IWorkspaceModel extends Model<IWorkspace> {
  findByWorkspaceId(workspaceId: string): Promise<IWorkspace | null>;
  findByConnection(brandId: string, manufacturerId: string): Promise<IWorkspace[]>;
  findActiveWorkspaces(filter?: any): Promise<IWorkspace[]>;
  getWorkspaceStats(workspaceId: string): Promise<any>;
}

/**
 * Workspace Member Schema
 */
const WorkspaceMemberSchema = new Schema<IWorkspaceMember>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member', 'viewer'],
    required: true,
    default: 'member'
  },
  addedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  addedBy: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  }
}, { _id: false });

/**
 * Production Details Schema
 */
const ProductionDetailsSchema = new Schema<IProductionDetails>({
  productName: { type: String },
  quantity: { type: Number, min: 0 },
  targetDeliveryDate: { type: Date },
  productionStartDate: { type: Date },
  productionEndDate: { type: Date },
  currentStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'quality_check', 'shipping', 'delivered'],
    default: 'pending'
  }
}, { _id: false });

/**
 * Enabled Features Schema
 */
const EnabledFeaturesSchema = new Schema<IEnabledFeatures>({
  fileSharing: { type: Boolean, default: false },
  realTimeUpdates: { type: Boolean, default: false },
  taskManagement: { type: Boolean, default: false },
  designReview: { type: Boolean, default: false },
  supplyChainTracking: { type: Boolean, default: false },
  videoUpdates: { type: Boolean, default: false },
  automatedNotifications: { type: Boolean, default: false }
}, { _id: false });

/**
 * Main Workspace Schema
 */
const WorkspaceSchema = new Schema<IWorkspace>(
  {
    // Core Identifiers
    workspaceId: {
      type: String,
      required: [true, 'Workspace ID is required'],
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [200, 'Workspace name cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },

    // Relationship
    brandId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Brand ID is required'],
      ref: 'Business',
      index: true
    },
    manufacturerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Manufacturer ID is required'],
      ref: 'Manufacturer',
      index: true
    },
    connectionId: {
      type: String,
      sparse: true
    },

    // Workspace Type & Status
    type: {
      type: String,
      enum: {
        values: ['production_run', 'design_collaboration', 'general'],
        message: 'Type must be production_run, design_collaboration, or general'
      },
      required: [true, 'Workspace type is required'],
      default: 'general'
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'archived', 'completed', 'cancelled'],
        message: 'Status must be active, archived, completed, or cancelled'
      },
      required: [true, 'Workspace status is required'],
      default: 'active',
      index: true
    },

    // Production Details
    productionDetails: {
      type: ProductionDetailsSchema,
      default: undefined
    },

    // Access Control
    brandMembers: {
      type: [WorkspaceMemberSchema],
      default: []
    },
    manufacturerMembers: {
      type: [WorkspaceMemberSchema],
      default: []
    },

    // Activity Tracking
    lastActivity: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    activityCount: {
      type: Number,
      default: 0,
      min: 0
    },
    messageCount: {
      type: Number,
      default: 0,
      min: 0
    },
    fileCount: {
      type: Number,
      default: 0,
      min: 0
    },
    updateCount: {
      type: Number,
      default: 0,
      min: 0
    },

    // Plan-Based Features
    enabledFeatures: {
      type: EnabledFeaturesSchema,
      required: true,
      default: () => ({
        fileSharing: false,
        realTimeUpdates: false,
        taskManagement: false,
        designReview: false,
        supplyChainTracking: false,
        videoUpdates: false,
        automatedNotifications: false
      })
    },

    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      required: [true, 'Creator ID is required'],
      ref: 'User'
    },
    archivedAt: {
      type: Date
    },
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
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

// Composite index for finding workspaces by brand-manufacturer connection
WorkspaceSchema.index({ brandId: 1, manufacturerId: 1, status: 1 });

// Index for workspace lookup by external ID
WorkspaceSchema.index({ workspaceId: 1 }, { unique: true });

// Index for finding active workspaces sorted by activity
WorkspaceSchema.index({ status: 1, lastActivity: -1 });

// Index for user membership queries (brands)
WorkspaceSchema.index({ 'brandMembers.userId': 1 });

// Index for user membership queries (manufacturers)
WorkspaceSchema.index({ 'manufacturerMembers.userId': 1 });

// Compound index for filtering by type and status
WorkspaceSchema.index({ type: 1, status: 1 });

// Index for production status queries
WorkspaceSchema.index({ 'productionDetails.currentStatus': 1 }, { sparse: true });

// Text index for search functionality
WorkspaceSchema.index({ name: 'text', description: 'text' });

// ====================
// VIRTUAL PROPERTIES
// ====================

// Virtual for total member count
WorkspaceSchema.virtual('totalMembers').get(function() {
  return this.brandMembers.length + this.manufacturerMembers.length;
});

// Virtual for checking if workspace is active
WorkspaceSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Virtual for days since last activity
WorkspaceSchema.virtual('daysSinceActivity').get(function() {
  const now = new Date();
  const diffTime = now.getTime() - this.lastActivity.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// ====================
// INSTANCE METHODS
// ====================

// Check if a user is a member of the workspace
WorkspaceSchema.methods.isMember = function(userId: string): boolean {
  const userIdStr = userId.toString();
  const isBrandMember = this.brandMembers.some(
    (m: IWorkspaceMember) => m.userId.toString() === userIdStr
  );
  const isManufacturerMember = this.manufacturerMembers.some(
    (m: IWorkspaceMember) => m.userId.toString() === userIdStr
  );
  return isBrandMember || isManufacturerMember;
};

// Check if a user has a specific role or higher
WorkspaceSchema.methods.hasRole = function(
  userId: string,
  minRole: 'viewer' | 'member' | 'admin' | 'owner'
): boolean {
  const roleHierarchy = { viewer: 0, member: 1, admin: 2, owner: 3 };
  const userIdStr = userId.toString();

  const brandMember = this.brandMembers.find(
    (m: IWorkspaceMember) => m.userId.toString() === userIdStr
  );
  const manufacturerMember = this.manufacturerMembers.find(
    (m: IWorkspaceMember) => m.userId.toString() === userIdStr
  );

  const member = brandMember || manufacturerMember;
  if (!member) return false;

  return roleHierarchy[member.role] >= roleHierarchy[minRole];
};

// Update last activity timestamp
WorkspaceSchema.methods.recordActivity = function(): Promise<IWorkspace> {
  this.lastActivity = new Date();
  this.activityCount += 1;
  return this.save();
};

// ====================
// STATIC METHODS
// ====================

// Find workspace by external workspace ID
WorkspaceSchema.statics.findByWorkspaceId = function(workspaceId: string) {
  return this.findOne({ workspaceId });
};

// Find all workspaces for a brand-manufacturer connection
WorkspaceSchema.statics.findByConnection = function(
  brandId: string,
  manufacturerId: string
) {
  return this.find({
    brandId,
    manufacturerId,
    status: { $in: ['active', 'completed'] }
  }).sort({ lastActivity: -1 });
};

// Find active workspaces with optional filters
WorkspaceSchema.statics.findActiveWorkspaces = function(filter: any = {}) {
  return this.find({
    status: 'active',
    ...filter
  }).sort({ lastActivity: -1 });
};

// Get workspace statistics
WorkspaceSchema.statics.getWorkspaceStats = async function(workspaceId: string) {
  const workspace = await this.findOne({ workspaceId });
  if (!workspace) return null;

  return {
    workspaceId: workspace.workspaceId,
    name: workspace.name,
    totalMembers: workspace.brandMembers.length + workspace.manufacturerMembers.length,
    activityCount: workspace.activityCount,
    messageCount: workspace.messageCount,
    fileCount: workspace.fileCount,
    updateCount: workspace.updateCount,
    daysSinceActivity: Math.floor(
      (Date.now() - workspace.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    ),
    status: workspace.status,
    type: workspace.type
  };
};

// ====================
// MIDDLEWARE
// ====================

// Pre-save: Update lastActivity on any modification
WorkspaceSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastActivity = new Date();
  }
  next();
});

// Pre-save: Validate production details for production_run type
WorkspaceSchema.pre('save', function(next) {
  if (this.type === 'production_run' && !this.productionDetails) {
    return next(new Error('Production details required for production_run workspace type'));
  }
  next();
});

export const Workspace = model<IWorkspace, IWorkspaceModel>('Workspace', WorkspaceSchema);
