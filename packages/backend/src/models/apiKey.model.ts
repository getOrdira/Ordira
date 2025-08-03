import { Schema, model, Document, Types } from 'mongoose';

export interface IApiKey extends Document {
  business: Types.ObjectId;  // ← here
  key:      string;
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
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export const ApiKey = model<IApiKey>('ApiKey', ApiKeySchema);


