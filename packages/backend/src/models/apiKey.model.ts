// src/models/apiKey.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IApiKey extends Document {
  business: Types.ObjectId;
  keyId: string;
  hashedSecret: string;
  revoked: boolean;
  createdAt: Date;
  updatedAt?: Date;
  
  // Core API key properties
  name: string;
  permissions: string[];
  expiresAt?: Date;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  allowedOrigins?: string[];
  description?: string;
  planLevel?: string;
  
  // Creation tracking
  createdBy?: Types.ObjectId | string;
  
  // Revocation tracking
  revokedAt?: Date;
  revokedBy?: string;
  reason?: string;
  
  // Rotation tracking
  rotatedAt?: Date;
  rotatedBy?: string;
  rotationReason?: string;
  
  // Update tracking
  updatedBy?: string;
  
  // Usage tracking
  lastUsed?: Date;
  usageCount: number;
  
  // Security & access control
  isActive?: boolean;
  scopes?: string[];
}

const ApiKeySchema = new Schema<IApiKey>({
  business: {
    type: Schema.Types.ObjectId,
    ref: 'BrandSettings',
    required: true,
    index: true
  },
  keyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  hashedSecret: { 
    type: String, 
    required: true 
  },
  revoked: { 
    type: Boolean, 
    default: false,
    index: true
  },
  
  // Core API key properties
  name: {
    type: String,
    required: true,
    default: 'Default API Key'
  },
  permissions: {
    type: [{
      type: String,
      enum: ['read', 'write', 'admin', 'analytics', 'integrations', 'webhooks', 'export']
    }],
    default: ['read'],
    required: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  rateLimits: {
    requestsPerMinute: { 
      type: Number, 
      default: 100,
      min: 1,
      max: 10000
    },
    requestsPerDay: { 
      type: Number, 
      default: 1000,
      min: 1,
      max: 1000000
    }
  },
  allowedOrigins: {
    type: [String],
    validate: {
      validator: function(origins: string[]) {
        if (!origins || origins.length === 0) return true;
        return origins.every(origin => {
          try {
            new URL(origin);
            return true;
          } catch {
            return origin === '*' || /^https?:\/\//.test(origin);
          }
        });
      },
      message: 'Invalid origin format'
    }
  },
  description: {
    type: String,
    maxlength: 500
  },
  planLevel: {
    type: String,
    enum: ['foundation', 'growth', 'premium', 'enterprise'],
    default: 'foundation'
  },
  
  // Creation tracking
  createdBy: { 
    type: Schema.Types.Mixed, // Can be ObjectId or string
    ref: 'BrandSettings'
  },
  
  // Revocation tracking
  revokedAt: {
    type: Date,
    index: true
  },
  revokedBy: {
    type: String
  },
  reason: {
    type: String,
    maxlength: 200
  },
  
  // Rotation tracking
  rotatedAt: {
    type: Date,
    index: true
  },
  rotatedBy: {
    type: String
  },
  rotationReason: {
    type: String,
    maxlength: 200
  },
  
  // Update tracking
  updatedBy: {
    type: String
  },
  
  // Usage tracking
  lastUsed: {
    type: Date,
    index: true
  },
  usageCount: { 
    type: Number, 
    default: 0,
    min: 0
  },
  
  // Security & access control
  isActive: {
    type: Boolean,
    default: true
  },
  scopes: {
    type: [String],
    default: []
  }
}, {
  timestamps: { 
    createdAt: true, 
    updatedAt: true 
  },
  toJSON: {
    transform: function(doc, ret) {
      // Never expose the hashed secret in JSON responses
      delete ret.hashedSecret;
      return ret;
    }
  }
});

// Indexes for better query performance
ApiKeySchema.index({ business: 1, revoked: 1 });
ApiKeySchema.index({ business: 1, keyId: 1 });
ApiKeySchema.index({ keyId: 1, revoked: 1 });
ApiKeySchema.index({ expiresAt: 1 }, { sparse: true });
ApiKeySchema.index({ lastUsed: 1 }, { sparse: true });

// Virtual for checking if key is expired
ApiKeySchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return this.expiresAt < new Date();
});

// Virtual for checking if key is truly active
ApiKeySchema.virtual('isActiveAndValid').get(function() {
  return !this.revoked && 
         (this.isActive !== false) && 
         (!this.expiresAt || this.expiresAt > new Date());
});

// Pre-save middleware to update usageCount on lastUsed changes
ApiKeySchema.pre('save', function(next) {
  if (this.isModified('lastUsed') && !this.isNew) {
    this.usageCount = (this.usageCount || 0) + 1;
  }
  next();
});

export const ApiKey = model<IApiKey>('ApiKey', ApiKeySchema);


