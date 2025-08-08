import { Schema, model, Document, Types } from 'mongoose';

export interface IApiKey extends Document {
  business: Types.ObjectId;  // ← here
  key:      string;
  hashedSecret: string;
  revoked:     boolean;
  createdAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>({
  business: {
    type:     Schema.Types.ObjectId,
    ref:      'BrandSettings',
    required: true
  },
  key: {
    type:     String,
    required: true,
    unique:   true
  },
   hashedSecret: { type: String, required: true },        // ← add this
   revoked:     { type: Boolean, default: false },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export const ApiKey = model<IApiKey>('ApiKey', ApiKeySchema);


