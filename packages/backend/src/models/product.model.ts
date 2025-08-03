// src/models/product.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  business: Types.ObjectId;
  title: string;
  description?: string;
  media: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    business: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    title: { type: String, required: true },
    description: { type: String },
    media: [{ type: Types.ObjectId, ref: 'Media' }]
  },
  { timestamps: true }
);

export const Product = model<IProduct>('Product', ProductSchema);