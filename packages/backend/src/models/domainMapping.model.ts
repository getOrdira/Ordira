// src/models/domainMapping.model.ts
import { Schema, model, Types, Document } from 'mongoose';

export interface IDomainMapping extends Document {
  business: Types.ObjectId;
  hostname: string; // Legacy field for backward compatibility
  domain: string; // Primary domain field
  
  // Status and configuration
  status: 'pending_verification' | 'active' | 'error' | 'deleting';
  certificateType: 'letsencrypt' | 'custom';
  forceHttps: boolean;
  autoRenewal: boolean;
  
  // Enhanced verification fields
  isActive: boolean;
  isVerified: boolean;
  verificationMethod: 'dns' | 'file' | 'email';
  verificationToken?: string;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
  
  // SSL configuration
  sslEnabled: boolean;
  sslExpiresAt?: Date;
  sslStatus: 'unknown' | 'active' | 'expired' | 'expiring_soon' | 'error';
  certificateExpiry?: Date;
  certificateInfo?: {
    issuer: string;
    validFrom: Date;
    validTo: Date;
    fingerprint?: string;
    serialNumber?: string;
  };
  lastCertificateRenewal?: Date;
  renewedBy?: Types.ObjectId;
  
  // Custom certificate data
  customCertificate?: {
    certificate: string;
    privateKey: string;
    chainCertificate?: string;
    uploadedAt: Date;
    uploadedBy: Types.ObjectId;
  };
  
  // DNS and CNAME configuration
  cnameTarget: string;
  dnsRecords?: {
    type: 'CNAME' | 'A' | 'TXT';
    name: string;
    value: string;
    ttl?: number;
    required?: boolean;
  }[];
  dnsStatus: 'unknown' | 'verified' | 'error' | 'pending';
  
  // Health monitoring
  healthStatus: 'unknown' | 'healthy' | 'warning' | 'error';
  lastHealthCheck?: Date;
  averageResponseTime?: number;
  uptimePercentage?: number;
  lastDowntime?: Date;
  
  // Performance metrics
  performanceMetrics?: {
    responseTime: number;
    uptime: number;
    errorRate: number;
    lastChecked: Date;
  };
  
  // Analytics tracking
  lastAccessedAt?: Date;
  requestCount: number;
  analyticsData?: {
    totalRequests: number;
    uniqueVisitors: number;
    errorCount: number;
    lastReset: Date;
  };
  
  // Plan and configuration metadata
  planLevel: 'foundation' | 'growth' | 'premium' | 'enterprise';
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  mappingMetadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
    timestamp?: Date;
    changedFields?: string[];
    updateReason?: string;
  };
  
  // Deletion tracking
  deletedBy?: Types.ObjectId;
  deletionReason?: string;
  
  // Instance methods
  generateVerificationToken(): string;
  markAsVerified(): Promise<IDomainMapping>;
  incrementRequestCount(): Promise<IDomainMapping>;
  updateSSLInfo(expiresAt: Date): Promise<IDomainMapping>;
  setDNSRecords(records: any[]): Promise<IDomainMapping>;
  updateHealthStatus(status: string): Promise<IDomainMapping>;
  recordPerformanceMetrics(metrics: any): Promise<IDomainMapping>;
  canBeDeleted(): boolean;
  isExpiringSoon(days?: number): boolean;
  getSetupInstructions(): any;
  
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
    
    // Domain fields (both for compatibility)
    hostname: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Allow empty for backward compatibility
          return /^[a-z0-9]+([-.][a-z0-9]+)*\.[a-z]{2,}$/.test(v);
        },
        message: 'Invalid hostname format'
      },
      maxlength: [253, 'Hostname cannot exceed 253 characters']
    },
    domain: {
      type: String,
      required: [true, 'Domain is required'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          return /^[a-z0-9]+([-.][a-z0-9]+)*\.[a-z]{2,}$/.test(v);
        },
        message: 'Invalid domain format'
      },
      maxlength: [253, 'Domain cannot exceed 253 characters'],
      index: true
    },
    
    // Status and configuration
    status: {
      type: String,
      enum: ['pending_verification', 'active', 'error', 'deleting'],
      default: 'pending_verification',
      index: true
    },
    certificateType: {
      type: String,
      enum: ['letsencrypt', 'custom'],
      default: 'letsencrypt'
    },
    forceHttps: {
      type: Boolean,
      default: true
    },
    autoRenewal: {
      type: Boolean,
      default: true
    },
    
    // Enhanced verification
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
    verificationMethod: {
      type: String,
      enum: ['dns', 'file', 'email'],
      default: 'dns'
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
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Business'
    },
    
    // SSL configuration
    sslEnabled: {
      type: Boolean,
      default: true,
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
    sslStatus: {
      type: String,
      enum: ['unknown', 'active', 'expired', 'expiring_soon', 'error'],
      default: 'unknown',
      index: true
    },
    certificateExpiry: {
      type: Date,
      index: true
    },
    certificateInfo: {
      issuer: String,
      validFrom: Date,
      validTo: Date,
      fingerprint: String,
      serialNumber: String
    },
    lastCertificateRenewal: {
      type: Date
    },
    renewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Business'
    },
    
    // Custom certificate
    customCertificate: {
      certificate: {
        type: String,
        select: false // Sensitive data
      },
      privateKey: {
        type: String,
        select: false // Sensitive data
      },
      chainCertificate: {
        type: String,
        select: false // Sensitive data
      },
      uploadedAt: Date,
      uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
      }
    },
    
    // DNS configuration
    cnameTarget: {
      type: String,
      default: function() {
        return process.env.FRONTEND_HOSTNAME || 'app.yourdomain.com';
      }
    },
    dnsRecords: [{
      type: {
        type: String,
        enum: ['CNAME', 'A', 'TXT'],
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
        default: 300
      },
      required: {
        type: Boolean,
        default: false
      }
    }],
    dnsStatus: {
      type: String,
      enum: ['unknown', 'verified', 'error', 'pending'],
      default: 'unknown',
      index: true
    },
    
    // Health monitoring
    healthStatus: {
      type: String,
      enum: ['unknown', 'healthy', 'warning', 'error'],
      default: 'unknown',
      index: true
    },
    lastHealthCheck: {
      type: Date,
      index: true
    },
    averageResponseTime: {
      type: Number,
      min: 0,
      default: 0
    },
    uptimePercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    lastDowntime: {
      type: Date
    },
    
    // Performance metrics
    performanceMetrics: {
      responseTime: {
        type: Number,
        min: 0,
        default: 0
      },
      uptime: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      errorRate: {
        type: Number,
        min: 0,
        default: 0
      },
      lastChecked: {
        type: Date,
        default: Date.now
      }
    },
    
    // Analytics
    lastAccessedAt: {
      type: Date
    },
    requestCount: {
      type: Number,
      default: 0,
      min: [0, 'Request count cannot be negative']
    },
    analyticsData: {
      totalRequests: {
        type: Number,
        default: 0,
        min: 0
      },
      uniqueVisitors: {
        type: Number,
        default: 0,
        min: 0
      },
      errorCount: {
        type: Number,
        default: 0,
        min: 0
      },
      lastReset: {
        type: Date,
        default: Date.now
      }
    },
    
    // Plan and metadata
    planLevel: {
      type: String,
      enum: ['foundation', 'growth', 'premium', 'enterprise'],
      default: 'foundation'
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Business'
    },
    mappingMetadata: {
      ipAddress: String,
      userAgent: String,
      source: String,
      timestamp: Date,
      changedFields: [String],
      updateReason: String
    },
    
    // Deletion tracking
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Business'
    },
    deletionReason: {
      type: String
    }
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        delete ret.verificationToken;
        // Don't expose sensitive certificate data
        if (ret.customCertificate) {
          delete ret.customCertificate.certificate;
          delete ret.customCertificate.privateKey;
          delete ret.customCertificate.chainCertificate;
        }
        return ret;
      }
    }
  }
);

// Comprehensive indexes for performance
DomainMappingSchema.index({ business: 1, status: 1 });
DomainMappingSchema.index({ business: 1, isActive: 1 });
DomainMappingSchema.index({ domain: 1 });
DomainMappingSchema.index({ hostname: 1 }); // Legacy support
DomainMappingSchema.index({ status: 1, healthStatus: 1 });
DomainMappingSchema.index({ isVerified: 1 });
DomainMappingSchema.index({ sslEnabled: 1, sslStatus: 1 });
DomainMappingSchema.index({ certificateExpiry: 1 });
DomainMappingSchema.index({ lastHealthCheck: 1 });
DomainMappingSchema.index({ planLevel: 1 });
DomainMappingSchema.index({ createdAt: -1 });
DomainMappingSchema.index({ updatedAt: -1 });

// Compound indexes for common queries
DomainMappingSchema.index({ business: 1, status: 1, healthStatus: 1 });
DomainMappingSchema.index({ status: 1, certificateExpiry: 1 });

// Virtual for backward compatibility
DomainMappingSchema.virtual('verificationStatus').get(function() {
  if (this.isVerified) return 'verified';
  if (this.verificationToken) return 'pending';
  return 'not_started';
});

// Virtual for overall health
DomainMappingSchema.virtual('overallHealth').get(function() {
  if (this.status !== 'active') return 'inactive';
  if (this.healthStatus === 'error') return 'error';
  if (this.sslStatus === 'expired' || this.sslStatus === 'error') return 'error';
  if (this.dnsStatus === 'error') return 'error';
  if (this.healthStatus === 'warning' || this.sslStatus === 'expiring_soon') return 'warning';
  if (this.healthStatus === 'healthy' && this.sslStatus === 'active' && this.dnsStatus === 'verified') return 'healthy';
  return 'unknown';
});

// Instance methods
DomainMappingSchema.methods.generateVerificationToken = function(): string {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = token;
  return token;
};

DomainMappingSchema.methods.markAsVerified = function(): Promise<IDomainMapping> {
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.status = 'active';
  this.dnsStatus = 'verified';
  this.verificationToken = undefined;
  return this.save();
};

DomainMappingSchema.methods.incrementRequestCount = function(): Promise<IDomainMapping> {
  this.requestCount += 1;
  this.lastAccessedAt = new Date();
  
  // Update analytics data
  if (!this.analyticsData) {
    this.analyticsData = {
      totalRequests: 0,
      uniqueVisitors: 0,
      errorCount: 0,
      lastReset: new Date()
    };
  }
  this.analyticsData.totalRequests += 1;
  
  return this.save();
};

DomainMappingSchema.methods.updateSSLInfo = function(expiresAt: Date): Promise<IDomainMapping> {
  this.sslEnabled = true;
  this.sslExpiresAt = expiresAt;
  this.certificateExpiry = expiresAt;
  this.lastCertificateRenewal = new Date();
  
  // Update SSL status based on expiry
  const daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry <= 30) {
    this.sslStatus = 'expiring_soon';
  } else {
    this.sslStatus = 'active';
  }
  
  return this.save();
};

DomainMappingSchema.methods.setDNSRecords = function(records: any[]): Promise<IDomainMapping> {
  this.dnsRecords = records;
  return this.save();
};

DomainMappingSchema.methods.updateHealthStatus = function(status: string): Promise<IDomainMapping> {
  this.healthStatus = status as any;
  this.lastHealthCheck = new Date();
  return this.save();
};

DomainMappingSchema.methods.recordPerformanceMetrics = function(metrics: {
  responseTime: number;
  uptime: number;
  errorRate: number;
}): Promise<IDomainMapping> {
  this.performanceMetrics = {
    ...metrics,
    lastChecked: new Date()
  };
  this.averageResponseTime = metrics.responseTime;
  this.uptimePercentage = metrics.uptime;
  return this.save();
};

DomainMappingSchema.methods.canBeDeleted = function(): boolean {
  return ['pending_verification', 'error'].includes(this.status);
};

DomainMappingSchema.methods.isExpiringSoon = function(days: number = 30): boolean {
  if (!this.certificateExpiry) return false;
  const daysUntilExpiry = Math.floor((this.certificateExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= days;
};

DomainMappingSchema.methods.getSetupInstructions = function(): any {
  return {
    dnsRecords: this.dnsRecords || [],
    verification: {
      method: this.verificationMethod,
      token: this.verificationToken,
      steps: [
        'Add the DNS record above to your domain provider',
        'Wait for DNS propagation (usually 5-60 minutes)',
        'Click verify to complete the setup process',
        'SSL certificate will be issued automatically'
      ]
    },
    cnameTarget: this.cnameTarget
  };
};

// Static methods
DomainMappingSchema.statics.findByBusiness = function(businessId: string) {
  return this.find({ 
    business: businessId,
    status: { $ne: 'deleting' }
  }).sort({ createdAt: -1 });
};

DomainMappingSchema.statics.findActive = function() {
  return this.find({ 
    isActive: true, 
    isVerified: true,
    status: 'active'
  });
};

DomainMappingSchema.statics.findByHostname = function(hostname: string) {
  return this.findOne({ 
    $or: [
      { hostname: hostname.toLowerCase() },
      { domain: hostname.toLowerCase() }
    ],
    isActive: true, 
    isVerified: true,
    status: 'active'
  });
};

DomainMappingSchema.statics.findExpiring = function(days: number = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    sslEnabled: true,
    certificateExpiry: { 
      $lte: futureDate,
      $gte: new Date()
    },
    isActive: true,
    status: 'active'
  });
};

DomainMappingSchema.statics.findHealthy = function() {
  return this.find({
    status: 'active',
    healthStatus: 'healthy',
    sslStatus: 'active',
    dnsStatus: 'verified'
  });
};

DomainMappingSchema.statics.findWithIssues = function() {
  return this.find({
    $or: [
      { healthStatus: 'error' },
      { sslStatus: 'error' },
      { sslStatus: 'expired' },
      { dnsStatus: 'error' },
      { status: 'error' }
    ]
  });
};

DomainMappingSchema.statics.getBusinessDomainStats = function(businessId: string) {
  return this.aggregate([
    { 
      $match: { 
        business: new Types.ObjectId(businessId),
        status: { $ne: 'deleting' }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
        sslEnabled: { $sum: { $cond: ['$sslEnabled', 1, 0] } },
        healthy: { $sum: { $cond: [{ $eq: ['$healthStatus', 'healthy'] }, 1, 0] } },
        totalRequests: { $sum: '$requestCount' },
        avgResponseTime: { $avg: '$averageResponseTime' }
      }
    }
  ]);
};

DomainMappingSchema.statics.getGlobalStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalDomains: { $sum: 1 },
        activeDomains: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        verifiedDomains: { $sum: { $cond: ['$isVerified', 1, 0] } },
        healthyDomains: { $sum: { $cond: [{ $eq: ['$healthStatus', 'healthy'] }, 1, 0] } },
        domainsWithSSL: { $sum: { $cond: ['$sslEnabled', 1, 0] } },
        expiringSoon: { 
          $sum: { 
            $cond: [
              { 
                $and: [
                  { $ne: ['$certificateExpiry', null] },
                  { $lte: ['$certificateExpiry', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] }
                ]
              }, 
              1, 
              0
            ] 
          }
        }
      }
    }
  ]);
};

// Pre-save middleware
DomainMappingSchema.pre('save', function(next) {
  // Ensure both hostname and domain are set and lowercase
  if (this.domain) {
    this.domain = this.domain.toLowerCase();
    // Keep hostname in sync for backward compatibility
    if (!this.hostname) {
      this.hostname = this.domain;
    }
  }
  if (this.hostname) {
    this.hostname = this.hostname.toLowerCase();
    // Keep domain in sync
    if (!this.domain) {
      this.domain = this.hostname;
    }
  }
  
  // Generate verification token if new and not verified
  if (this.isNew && !this.isVerified && !this.verificationToken) {
    this.generateVerificationToken();
  }
  
  // Update SSL status based on expiry
  if (this.certificateExpiry) {
    const daysUntilExpiry = Math.floor((this.certificateExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) {
      this.sslStatus = 'expired';
    } else if (daysUntilExpiry <= 30) {
      this.sslStatus = 'expiring_soon';
    } else if (this.sslEnabled) {
      this.sslStatus = 'active';
    }
  }
  
  // Set verified date when marking as verified
  if (this.isModified('isVerified') && this.isVerified && !this.verifiedAt) {
    this.verifiedAt = new Date();
  }
  
  // Update status when verified
  if (this.isModified('isVerified') && this.isVerified && this.status === 'pending_verification') {
    this.status = 'active';
  }
  
  next();
});

// Pre-validate middleware
DomainMappingSchema.pre('validate', function(next) {
  // Validate that domain doesn't contain protocol
  if (this.domain && (this.domain.includes('http://') || this.domain.includes('https://'))) {
    return next(new Error('Domain should not include protocol (http/https)'));
  }
  
  // Validate that domain doesn't include paths
  if (this.domain && this.domain.includes('/')) {
    return next(new Error('Domain should not include paths'));
  }
  
  // Ensure cnameTarget is set
  if (!this.cnameTarget) {
    this.cnameTarget = process.env.FRONTEND_HOSTNAME || 'app.yourdomain.com';
  }
  
  next();
});

// Post-save middleware for analytics
DomainMappingSchema.post('save', function(doc) {
  // Log important changes for analytics
  if (this.isModified('status')) {
    console.log(`Domain ${doc.domain} status changed to ${doc.status}`);
  }
  if (this.isModified('healthStatus')) {
    console.log(`Domain ${doc.domain} health changed to ${doc.healthStatus}`);
  }
});

export const DomainMapping = model<IDomainMapping>('DomainMapping', DomainMappingSchema);