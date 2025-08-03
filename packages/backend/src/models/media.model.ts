// src/models/media.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IMedia extends Document {
  url: string;
  type: 'image' | 'video' | 'gif';
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video', 'gif'], required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'Business', required: true }
  },
  { timestamps: true }
);

export const Media = model<IMedia>('Media', MediaSchema);