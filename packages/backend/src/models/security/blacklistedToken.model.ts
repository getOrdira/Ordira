// src/models/security/blacklistedToken.model.ts
import { Schema, model, models, type Document } from 'mongoose';

export interface BlacklistedTokenDocument extends Document {
  tokenId: string;
  userId: string;
  tokenHash: string;
  reason: string;
  blacklistedAt: Date;
  expiresAt: Date;
}

const blacklistedTokenSchema = new Schema<BlacklistedTokenDocument>({
  tokenId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true },
  reason: { type: String, required: true },
  blacklistedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
});

blacklistedTokenSchema.index({ tokenHash: 1 });

export const BlacklistedTokenModel = models.BlacklistedToken || model('BlacklistedToken', blacklistedTokenSchema);


