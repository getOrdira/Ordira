// src/models/manufacturer.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IManufacturer extends Document {
  name: string;
  email: string;
  password: string;        // hashed
  brands: Types.ObjectId[]; // which BrandSettings they service
  createdAt: Date;
  updatedAt: Date;
  
  // Profile information
  profilePictureUrl?: string;
  description?: string;
  servicesOffered?: string[];
  moq?: number;
  industry?: string;
  contactEmail?: string;
  socialUrls?: string[];
  
  // Account status
  isActive?: boolean;
  deactivatedAt?: Date;
  
  // Verification status
  isVerified?: boolean;
  verifiedAt?: Date;
  
  // Business information
  businessLicense?: string;
  certifications?: string[];
  establishedYear?: number;
  employeeCount?: number;
  headquarters?: {
    country?: string;
    city?: string;
    address?: string;
  };
  
  // Communication preferences
  preferredContactMethod?: 'email' | 'phone' | 'message';
  timezone?: string;
  
  // Statistics (calculated fields)
  totalConnections?: number;
  lastLoginAt?: Date;
}

const ManufacturerSchema = new Schema<IManufacturer>({
  // Required fields
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  brands: [{ type: Types.ObjectId, ref: 'BrandSettings' }],
  
  // Profile information
  profilePictureUrl: { type: String, trim: true },
  description: { type: String, trim: true, maxlength: 2000 },
  servicesOffered: [{ type: String, trim: true }],
  moq: { type: Number, min: 0 },
  industry: { type: String, trim: true },
  contactEmail: { type: String, lowercase: true, trim: true },
  socialUrls: [{ type: String, trim: true }],
  
  // Account status
  isActive: { type: Boolean, default: true },
  deactivatedAt: { type: Date },
  
  // Verification status
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  
  // Business information
  businessLicense: { type: String, trim: true },
  certifications: [{ type: String, trim: true }],
  establishedYear: { 
    type: Number, 
    min: 1800, 
    max: new Date().getFullYear()
  },
  employeeCount: { type: Number, min: 1 },
  headquarters: {
    country: { type: String, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true }
  },
  
  // Communication preferences
  preferredContactMethod: { 
    type: String, 
    enum: ['email', 'phone', 'message'],
    default: 'email'
  },
  timezone: { type: String, trim: true },
  
  // Statistics
  totalConnections: { type: Number, default: 0 },
  lastLoginAt: { type: Date }
}, { 
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Indexes for better performance
ManufacturerSchema.index({ email: 1 });
ManufacturerSchema.index({ industry: 1 });
ManufacturerSchema.index({ isActive: 1 });
ManufacturerSchema.index({ servicesOffered: 1 });
ManufacturerSchema.index({ 'headquarters.country': 1 });
ManufacturerSchema.index({ createdAt: -1 });

// Virtual for brand count
ManufacturerSchema.virtual('brandsCount').get(function() {
  return this.brands?.length || 0;
});

// Pre-save middleware to update totalConnections
ManufacturerSchema.pre('save', function(next) {
  if (this.isModified('brands')) {
    this.totalConnections = this.brands?.length || 0;
  }
  next();
});

// Instance methods
ManufacturerSchema.methods.isAccountActive = function(): boolean {
  return this.isActive !== false && !this.deactivatedAt;
};

ManufacturerSchema.methods.getProfileCompleteness = function(): number {
  const fields = [
    'name', 'email', 'description', 'industry', 
    'servicesOffered', 'moq', 'contactEmail', 'profilePictureUrl'
  ];
  
  const completedFields = fields.filter(field => {
    const value = this[field];
    return value !== null && value !== undefined && value !== '';
  });
  
  return Math.round((completedFields.length / fields.length) * 100);
};

ManufacturerSchema.methods.updateLastLogin = function(): Promise<IManufacturer> {
  this.lastLoginAt = new Date();
  return this.save();
};

// Static methods
ManufacturerSchema.statics.findByIndustry = function(industry: string) {
  return this.find({ 
    industry, 
    isActive: { $ne: false } 
  }).sort('name');
};

ManufacturerSchema.statics.findVerified = function() {
  return this.find({ 
    isVerified: true,
    isActive: { $ne: false }
  }).sort('name');
};

ManufacturerSchema.statics.getIndustryStats = function() {
  return this.aggregate([
    { $match: { isActive: { $ne: false } } },
    { $group: { _id: '$industry', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

export const Manufacturer = model<IManufacturer>('Manufacturer', ManufacturerSchema);
