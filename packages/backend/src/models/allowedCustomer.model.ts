// src/models/allowedCustomer.model.ts
import { Schema, model, Document, Types, Model } from 'mongoose';

export interface IAllowedCustomer extends Document {
  // Core customer information
  business: Types.ObjectId;
  email: string;
  findByEmail: string;
  
  // Customer metadata
  firstName?: string;
  lastName?: string;
  customerSource: 'manual' | 'shopify' | 'woocommerce' | 'csv_import' | 'api_import';
  externalCustomerId?: string; // Shopify customer ID, WooCommerce ID, etc.
  
  // Import tracking
  importBatch?: string; // Batch ID for bulk imports
  importedAt?: Date;
  importedBy?: Types.ObjectId; // User who imported
  
  // Access control
  isActive: boolean;
  hasAccess: boolean;
  accessRevokedAt?: Date;
  accessRevokedBy?: Types.ObjectId;
  accessRevokedReason?: string;
  
  // Customer behavior
  lastVotingAccess?: Date;
  totalVotingAccesses: number;
  totalVotes: number;
  registeredAt?: Date; // When they actually registered on the platform
  
  // Customer preferences
  tags: string[];
  notes?: string;
  vipStatus: boolean;
  
  // Sync status for integrations
  syncStatus: 'synced' | 'pending' | 'failed' | 'manual';
  lastSyncAt?: Date;
  syncError?: string;
  
  // Instance methods
  grantAccess(): Promise<IAllowedCustomer>;
  revokeAccess(reason?: string, revokedBy?: string): Promise<IAllowedCustomer>;
  recordVotingAccess(): Promise<IAllowedCustomer>;
  updateFromExternalSource(data: any): Promise<IAllowedCustomer>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
export interface IAllowedCustomerModel extends Model<IAllowedCustomer> {
  findByEmail(email: string, businessId: string): Promise<IAllowedCustomer | null>;
  findByBusiness(businessId: string): Promise<IAllowedCustomer[]>;
  bulkImport(businessId: string, customers: any[], source: string): Promise<{ imported: number; errors: string[] }>;
  isEmailAllowed(email: string, businessId: string): Promise<boolean>;
  getCustomerStats(businessId: string): Promise<any>;
  syncFromShopify(businessId: string): Promise<{ synced: number; errors: string[] }>;
}

const AllowedCustomerSchema = new Schema<IAllowedCustomer>(
  {
    // Core references
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business reference is required'],
      index: true
    },
    
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
      index: true
    },
    
    // Customer metadata
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    
    customerSource: {
      type: String,
      enum: ['manual', 'shopify', 'woocommerce', 'csv_import', 'api_import'],
      required: true,
      index: true
    },
    
    externalCustomerId: {
      type: String,
      trim: true,
      index: true
    },
    
    // Import tracking
    importBatch: {
      type: String,
      index: true
    },
    
    importedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    
    importedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Business'
    },
    
    // Access control
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    
    hasAccess: {
      type: Boolean,
      default: true,
      index: true
    },
    
    accessRevokedAt: {
      type: Date
    },
    
    accessRevokedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Business'
    },
    
    accessRevokedReason: {
      type: String,
      maxlength: [500, 'Revocation reason cannot exceed 500 characters']
    },
    
    // Customer behavior tracking
    lastVotingAccess: {
      type: Date
    },
    
    totalVotingAccesses: {
      type: Number,
      default: 0,
      min: [0, 'Voting accesses cannot be negative']
    },
    
    totalVotes: {
      type: Number,
      default: 0,
      min: [0, 'Total votes cannot be negative']
    },
    
    registeredAt: {
      type: Date
    },
    
    // Customer management
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [30, 'Tag cannot exceed 30 characters']
    }],
    
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    
    vipStatus: {
      type: Boolean,
      default: false,
      index: true
    },
    
    // Sync management
    syncStatus: {
      type: String,
      enum: ['synced', 'pending', 'failed', 'manual'],
      default: 'manual',
      index: true
    },
    
    lastSyncAt: {
      type: Date
    },
    
    syncError: {
      type: String,
      maxlength: [500, 'Sync error cannot exceed 500 characters']
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
// INDEXES FOR PERFORMANCE
// ====================

// Primary lookup indexes
AllowedCustomerSchema.index({ business: 1, email: 1 }, { unique: true });
AllowedCustomerSchema.index({ business: 1, isActive: 1, hasAccess: 1 });
AllowedCustomerSchema.index({ business: 1, customerSource: 1 });

// Import and sync indexes
AllowedCustomerSchema.index({ importBatch: 1 });
AllowedCustomerSchema.index({ syncStatus: 1, lastSyncAt: 1 });
AllowedCustomerSchema.index({ externalCustomerId: 1, customerSource: 1 });

// Analytics indexes
AllowedCustomerSchema.index({ business: 1, totalVotes: -1 });
AllowedCustomerSchema.index({ business: 1, lastVotingAccess: -1 });

// ====================
// VIRTUAL PROPERTIES
// ====================

// Full name virtual
AllowedCustomerSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || this.email.split('@')[0];
});

// Days since last access
AllowedCustomerSchema.virtual('daysSinceLastAccess').get(function() {
  if (!this.lastVotingAccess) return null;
  return Math.floor((Date.now() - this.lastVotingAccess.getTime()) / (1000 * 60 * 60 * 24));
});

// Customer engagement level
AllowedCustomerSchema.virtual('engagementLevel').get(function() {
  if (this.totalVotes >= 10) return 'high';
  if (this.totalVotes >= 3) return 'medium';
  if (this.totalVotes >= 1) return 'low';
  return 'none';
});

// ====================
// INSTANCE METHODS
// ====================

AllowedCustomerSchema.methods.grantAccess = function(): Promise<IAllowedCustomer> {
  this.hasAccess = true;
  this.isActive = true;
  this.accessRevokedAt = undefined;
  this.accessRevokedBy = undefined;
  this.accessRevokedReason = undefined;
  return this.save();
};

AllowedCustomerSchema.methods.revokeAccess = function(
  reason?: string, 
  revokedBy?: string
): Promise<IAllowedCustomer> {
  this.hasAccess = false;
  this.accessRevokedAt = new Date();
  this.accessRevokedReason = reason;
  if (revokedBy) {
    this.accessRevokedBy = revokedBy as any;
  }
  return this.save();
};

AllowedCustomerSchema.methods.recordVotingAccess = function(): Promise<IAllowedCustomer> {
  this.lastVotingAccess = new Date();
  this.totalVotingAccesses += 1;
  return this.save();
};

AllowedCustomerSchema.methods.updateFromExternalSource = function(data: {
  firstName?: string;
  lastName?: string;
  tags?: string[];
  externalCustomerId?: string;
}): Promise<IAllowedCustomer> {
  if (data.firstName) this.firstName = data.firstName;
  if (data.lastName) this.lastName = data.lastName;
  if (data.externalCustomerId) this.externalCustomerId = data.externalCustomerId;
  if (data.tags) this.tags = [...new Set([...this.tags, ...data.tags])];
  
  this.lastSyncAt = new Date();
  this.syncStatus = 'synced';
  this.syncError = undefined;
  
  return this.save();
};

// ====================
// STATIC METHODS
// ====================

AllowedCustomerSchema.statics.findByEmail = function(email: string, businessId: string) {
  return this.findOne({ 
    email: email.toLowerCase(), 
    business: businessId 
  });
};

AllowedCustomerSchema.statics.findByBusiness = function(businessId: string) {
  return this.find({ 
    business: businessId,
    isActive: true 
  }).sort({ createdAt: -1 });
};

AllowedCustomerSchema.statics.isEmailAllowed = function(email: string, businessId: string) {
  return this.findOne({
    email: email.toLowerCase(),
    business: businessId,
    isActive: true,
    hasAccess: true
  }).then(customer => !!customer);
};

AllowedCustomerSchema.statics.bulkImport = async function(
  businessId: string, 
  customers: any[], 
  source: string
) {
  const errors: string[] = [];
  let imported = 0;
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  for (const customerData of customers) {
    try {
      // Validate email
      if (!customerData.email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(customerData.email)) {
        errors.push(`Invalid email: ${customerData.email || 'missing'}`);
        continue;
      }

      // Check if already exists
      const existing = await (this as IAllowedCustomerModel).findByEmail(customerData.email, businessId);
      if (existing) {
        // Update existing customer
        await existing.updateFromExternalSource({
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          tags: customerData.tags,
          externalCustomerId: customerData.externalCustomerId
        });
        imported++;
      } else {
        // Create new customer
        await this.create({
          business: businessId,
          email: customerData.email.toLowerCase(),
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          customerSource: source,
          externalCustomerId: customerData.externalCustomerId,
          importBatch: batchId,
          importedAt: new Date(),
          tags: customerData.tags || [],
          vipStatus: customerData.vipStatus || false,
          isActive: true,
          hasAccess: true,
          syncStatus: 'synced'
        });
        imported++;
      }
    } catch (error: any) {
      errors.push(`Failed to import ${customerData.email}: ${error.message}`);
    }
  }

  return { imported, errors };
};

AllowedCustomerSchema.statics.getCustomerStats = function(businessId: string) {
  return this.aggregate([
    { $match: { business: businessId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $and: ['$isActive', '$hasAccess'] }, 1, 0] } },
        registered: { $sum: { $cond: ['$registeredAt', 1, 0] } },
        totalVotes: { $sum: '$totalVotes' },
        vipCustomers: { $sum: { $cond: ['$vipStatus', 1, 0] } },
        bySource: {
          $push: {
            source: '$customerSource',
            active: { $cond: [{ $and: ['$isActive', '$hasAccess'] }, 1, 0] }
          }
        }
      }
    }
  ]);
};

AllowedCustomerSchema.statics.syncFromShopify = async function(businessId: string) {
  // This would integrate with Shopify API to sync customers
  // Implementation depends on your Shopify integration setup
  return { synced: 0, errors: ['Shopify sync not implemented yet'] };
};

export const AllowedCustomer = model<IAllowedCustomer, IAllowedCustomerModel>('AllowedCustomer', AllowedCustomerSchema);