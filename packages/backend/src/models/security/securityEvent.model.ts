// src/models/security/securityEvent.model.ts
import { Schema, model, models, type Document } from 'mongoose';
import { SecurityEventType, SecuritySeverity, type SecurityActorType } from '../../services/infrastructure/security/utils/securityTypes'; 

export interface SecurityEventDocument extends Document {
  eventType: SecurityEventType;
  userId: string;
  userType: SecurityActorType;
  severity: SecuritySeverity;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  sessionId?: string;
  tokenId?: string;
  additionalData?: Record<string, unknown>;
  timestamp: Date;
  expiresAt?: Date;
}

const securityEventSchema = new Schema<SecurityEventDocument>({
  eventType: { type: String, required: true, enum: Object.values(SecurityEventType) },
  userId: { type: String, required: true, index: true },
  userType: { type: String, required: true, enum: ['business', 'user', 'manufacturer'] },
  severity: { type: String, required: true, enum: Object.values(SecuritySeverity) },
  success: { type: Boolean, required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  deviceFingerprint: { type: String },
  sessionId: { type: String },
  tokenId: { type: String },
  additionalData: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }
});

securityEventSchema.index({ eventType: 1, timestamp: -1 });
securityEventSchema.index({ severity: 1, timestamp: -1 });

export const SecurityEventModel = models.SecurityEvent || model('SecurityEvent', securityEventSchema);


