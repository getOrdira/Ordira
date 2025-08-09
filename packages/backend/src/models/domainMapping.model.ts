// src/models/domainMapping.model.ts
import { Schema, model, Types, Document } from 'mongoose';

export interface IDomainMapping extends Document {
  business: Types.ObjectId;
  hostname: string;
  
  // Enhanced fields
  isActive: boolean;
  isVerified: boolean;
  verificationToken?: string;
  verifiedAt?: Date;
  sslEnabled: boolean;
  sslExpiresAt?: Date;
  
  // DNS and configuration
  dnsRecords?: {
    type: 'CNAME' | 'A';
    name: string;
    value: string;
    ttl?: number;
  }[];
  
  // Analytics
  lastAccessedAt?: Date;
  requestCount: number;
  
  // Instance methods
  generateVerificationToken(): string;
  markAsVerified(): Promise<IDomainMapping>;
  incrementRequestCount(): Promise<IDomainMapping>;
  
  createdAt: Date;
  updatedAt: Date;
}

const DomainMappingSchema = new Schema<IDomainMapping>(
  {
    business: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business reference is required'],
      index: true
    },
    hostname: {
      type: String,
      required: [true, 'Hostname is required'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          // Valid domain regex
          return /^[a-z0-9]+([-.][a-z0-9]+)*\.[a-z]{2,}$/.test(v);
        },
        message: 'Invalid hostname format'
      },
      maxlength: [253, 'Hostname cannot exceed 253 characters']
    },
    
    // Status and verification
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    verificationToken: {
      type: String,
      trim: true,
      select: false // Don't include in queries by default
    },
    verifiedAt: {
      type: Date,
      validate: {
        validator: function(v: Date) {
          return !v || v <= new Date();
        },
        message: 'Verification date cannot be in the future'
      }
    },
    
    // SSL configuration
    sslEnabled: {
      type: Boolean,
      default: false,
      index: true
    },
    sslExpiresAt: {
      type: Date,
      validate: {
        validator: function(v: Date) {
          return !v || v > new Date();
        },
        message: 'SSL expiry date must be in the future'
      }
    },
    
    // DNS records for setup instructions
    dnsRecords: [{
      type: {
        type: String,
        enum: ['CNAME', 'A'],
        required: true
      },
      name: {
        type: String,
        required: true,
        trim: true
      },
      value: {
        type: String,
        required: true,
        trim: true
      },
      ttl: {
        type: Number,
        min: [60, 'TTL must be at least 60 seconds'],
        max: [86400, 'TTL cannot exceed 24 hours'],
        default: 3600 // 1 hour
      }
    }],
    
    // Analytics
    lastAccessedAt: {
      type: Date
    },
    requestCount: {
      type: Number,
      default: 0,
      min: [0, 'Request count cannot be negative']
    }
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        delete ret.verificationToken;
        return ret;
      }
    }
  }
);

// Indexes for performance
DomainMappingSchema.index({ business: 1, isActive: 1 });
DomainMappingSchema.index({ hostname: 1 });
DomainMappingSchema.index({ isVerified: 1 });
DomainMappingSchema.index({ sslEnabled: 1 });
DomainMappingSchema.index({ sslExpiresAt: 1 });
DomainMappingSchema.index({ createdAt: -1 });

// Virtual for SSL status
DomainMappingSchema.virtual('sslStatus').get(function() {
  if (!this.sslEnabled) return 'disabled';
  if (!this.sslExpiresAt) return 'unknown';
  if (this.sslExpiresAt < new Date()) return 'expired';
  
  const daysUntilExpiry = Math.floor((this.sslExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry <= 30) return 'expiring_soon';
  
  return 'active';
});

// Virtual for verification status
DomainMappingSchema.virtual('verificationStatus').get(function() {
  if (this.isVerified) return 'verified';
  if (this.verificationToken) return 'pending';
  return 'not_started';
});

// Instance methods
DomainMappingSchema.methods.generateVerificationToken = function(): string {
  const token = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
  this.verificationToken = token;
  return token;
};

DomainMappingSchema.methods.markAsVerified = function(): Promise<IDomainMapping> {
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.verificationToken = undefined;
  return this.save();
};

DomainMappingSchema.methods.incrementRequestCount = function(): Promise<IDomainMapping> {
  this.requestCount += 1;
  this.lastAccessedAt = new Date();
  return this.save();
};

DomainMappingSchema.methods.updateSSLInfo = function(expiresAt: Date): Promise<IDomainMapping> {
  this.sslEnabled = true;
  this.sslExpiresAt = expiresAt;
  return this.save();
};

DomainMappingSchema.methods.setDNSRecords = function(records: any[]): Promise<IDomainMapping> {
  this.dnsRecords = records;
  return this.save();
};

// Static methods
DomainMappingSchema.statics.findByBusiness = function(businessId: string) {
  return this.find({ business: businessId }).sort({ createdAt: -1 });
};

DomainMappingSchema.statics.findActive = function() {
  return this.find({ isActive: true, isVerified: true });
};

DomainMappingSchema.statics.findByHostname = function(hostname: string) {
  return this.findOne({ 
    hostname: hostname.toLowerCase(), 
    isActive: true, 
    isVerified: true 
  });
};

DomainMappingSchema.statics.findExpiring = function(days: number = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    sslEnabled: true,
    sslExpiresAt: { 
      $lte: futureDate,
      $gte: new Date()
    },
    isActive: true
  });
};

DomainMappingSchema.statics.getBusinessDomainStats = function(businessId: string) {
  return this.aggregate([
    { $match: { business: new Types.ObjectId(businessId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
        sslEnabled: { $sum: { $cond: ['$sslEnabled', 1, 0] } },
        totalRequests: { $sum: '$requestCount' }
      }
    }
  ]);
};

// Pre-save middleware
DomainMappingSchema.pre('save', function(next) {
  // Ensure hostname is lowercase
  if (this.hostname) {
    this.hostname = this.hostname.toLowerCase();
  }
  
  // Generate verification token if new and not verified
  if (this.isNew && !this.isVerified && !this.verificationToken) {
    this.generateVerificationToken();
  }
  
  // Set verified date when marking as verified
  if (this.isModified('isVerified') && this.isVerified && !this.verifiedAt) {
    this.verifiedAt = new Date();
  }
  
  next();
});

// Pre-validate middleware
DomainMappingSchema.pre('validate', function(next) {
  // Validate that hostname doesn't contain protocol
  if (this.hostname && (this.hostname.includes('http://') || this.hostname.includes('https://'))) {
    return next(new Error('Hostname should not include protocol (http/https)'));
  }
  
  // Validate that hostname doesn't include paths
  if (this.hostname && this.hostname.includes('/')) {
    return next(new Error('Hostname should not include paths'));
  }
  
  next();
});

export const DomainMapping = model<IDomainMapping>('DomainMapping', DomainMappingSchema);