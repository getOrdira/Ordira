// src/models/collection.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface ICollection extends Document {
  business: Types.ObjectId;
  title: string;
  description?: string;
  products: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    business: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    title: { type: String, required: true },
    description: { type: String },
    products: [{ type: Types.ObjectId, ref: 'Product' }]
  },
  { timestamps: true }
);

export const Collection = model<ICollection>('Collection', CollectionSchema);