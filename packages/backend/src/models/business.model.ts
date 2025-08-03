// src/models/business.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IBusiness extends Document {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  email: string;
  businessName: string;
  regNumber?: string;
  taxId?: string;
  address: string;
  password: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailCode?: string;
  createdAt: Date;
  updatedAt: Date;
  profilePictureUrl?: string;
  description?: string;
  industry?:  string;
  contactEmail?: string;
  socialUrls?:   string[];
  walletAddress?: string;
}

const BusinessSchema = new Schema<IBusiness>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    businessName: { type: String, required: true },
    regNumber: { type: String },
    taxId: { type: String },
    address: { type: String, required: true },
    password: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    emailCode: { type: String },
    profilePictureUrl: { type: String },
    description: { type: String },
    industry: { type: String },
    contactEmail: { type: String, lowercase: true },
    socialUrls: [{ type: String }],
    walletAddress:    { type: String, lowercase: true },  
  },
  { timestamps: true }
);

export const Business = model<IBusiness>('Business', BusinessSchema);