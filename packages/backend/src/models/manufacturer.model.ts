// src/models/manufacturer.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IManufacturer extends Document {
  name:       string;
  email:      string;
  password:   string;        // hashed
  brands:     Types.ObjectId[]; // which BrandSettings they service
  createdAt:  Date;
  updatedAt:  Date;
  profilePictureUrl?: string;
  description?:       string;
  servicesOffered?:   string[];
  moq?:               number;
  industry?:          string;
  contactEmail?:      string;
  socialUrls?:        string[];
}

const ManufacturerSchema = new Schema<IManufacturer>({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  brands:   [{ type: Types.ObjectId, ref: 'BrandSettings' }],
  profilePictureUrl: { type: String },
  description:       { type: String },
  servicesOffered:   [{ type: String }],
  moq:               { type: Number },
  industry:          { type: String },
  contactEmail:      { type: String, lowercase: true },
  socialUrls:        [{ type: String }],
}, { timestamps: true });

export const Manufacturer = model<IManufacturer>('Manufacturer', ManufacturerSchema);
