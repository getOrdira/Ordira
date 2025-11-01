// src/models/activeSession.model.ts
import { Schema, model, models, type Document } from 'mongoose';
import type { SecurityActorType } from '../../services/security/utilities/securityTypes';

export interface ActiveSessionDocument extends Document {
  sessionId: string;
  userId: string;
  userType: SecurityActorType;
  tokenId: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}

const activeSessionSchema = new Schema<ActiveSessionDocument>({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  userType: { type: String, required: true, enum: ['business', 'user', 'manufacturer'] },
  tokenId: { type: String, required: true },
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
  deviceFingerprint: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  isActive: { type: Boolean, default: true }
});

activeSessionSchema.index({ userId: 1, isActive: 1 });
activeSessionSchema.index({ tokenId: 1 });

export const ActiveSessionModel = models.ActiveSession || model('ActiveSession', activeSessionSchema);

