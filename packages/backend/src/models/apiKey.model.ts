// In apiKey.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IApiKey extends Document {
  business: Types.ObjectId;
  keyId: string;
  hashedSecret: string;
  revoked: boolean;
  createdAt: Date;
  
  // Add the missing properties:
  name?: string;
  permissions?: string[];
  expiresAt?: Date;
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  allowedOrigins?: string[];
  description?: string;
  planLevel?: string;
  createdBy?: Types.ObjectId;
  
  // Revocation tracking:
  revokedAt?: Date;        // ← Add this
  revokedBy?: string;      // ← Add this
  reason?: string;         // ← Add this
  
  // Rotation tracking:
  rotatedAt?: Date;        // ← Add this
  rotatedBy?: string;      // ← Add this
  rotationReason?: string; // ← Add this
  
  // Usage tracking:
  lastUsed?: Date;
  usageCount?: number;
}

const ApiKeySchema = new Schema<IApiKey>({
  business: {
    type: Schema.Types.ObjectId,
    ref: 'BrandSettings',
    required: true
  },
  keyId: {
    type: String,
    required: true,
    unique: true
  },
  hashedSecret: { 
    type: String, 
    required: true 
  },
  revoked: { 
    type: Boolean, 
    default: false 
  },
  
  // Enhanced fields:
  name: {
    type: String,
    default: 'Default API Key'
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'admin', 'webhook']
  }],
  expiresAt: Date,
  rateLimits: {
    requestsPerMinute: { type: Number, default: 60 },
    requestsPerDay: { type: Number, default: 1000 }
  },
  allowedOrigins: [String],
  description: String,
  planLevel: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'BrandSettings' },
  
  // Revocation tracking:
  revokedAt: Date,
  revokedBy: String,
  reason: String,
  
  // Rotation tracking:
  rotatedAt: Date,
  rotatedBy: String,
  rotationReason: String,
  
  // Usage tracking:
  lastUsed: Date,
  usageCount: { type: Number, default: 0 }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export const ApiKey = model<IApiKey>('ApiKey', ApiKeySchema);


