// src/models/manufacturer.model.ts
import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IManufacturer extends Document {
  name: string;
  email: string;
  password: string;
  brands: Types.ObjectId[];
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
  
  // Security
  lastLoginAt?: Date;
  loginAttempts?: number;
  lockUntil?: Date;
  
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  isAccountActive(): boolean;
  getProfileCompleteness(): number;
  updateLastLogin(): Promise<IManufacturer>;
  incrementLoginAttempts(): Promise<IManufacturer>;
  resetLoginAttempts(): Promise<IManufacturer>;
}

const ManufacturerSchema = new Schema<IManufacturer>({
  // Required fields
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true, 
    lowercase: true, 
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  brands: [{ 
    type: Types.ObjectId, 
    ref: 'BrandSettings',
    validate: {
      validator: function(brands: Types.ObjectId[]) {
        return brands.length <= 100;
      },
      message: 'Cannot connect to more than 100 brands'
    }
  }],
  
  // Profile information
  profilePictureUrl: { 
    type: String, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Profile picture must be a valid URL'
    }
  },
  description: { 
    type: String, 
    trim: true, 
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  servicesOffered: [{
    type: String, 
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  }],
  moq: { 
    type: Number, 
    min: [1, 'MOQ must be at least 1']
  },
  industry: { 
    type: String, 
    trim: true,
    maxlength: [100, 'Industry cannot exceed 100 characters'],
    index: true
  },
  contactEmail: { 
    type: String, 
    lowercase: true, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid contact email'
    }
  },
  socialUrls: [{
    type: String, 
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Social URLs must be valid HTTP/HTTPS URLs'
    }
  }],
  
  // Account status
  isActive: { type: Boolean, default: true, index: true },
  deactivatedAt: { type: Date },
  
  // Verification status
  isVerified: { type: Boolean, default: false, index: true },
  verifiedAt: { type: Date },
  
  // Business information
  businessLicense: { 
    type: String, 
    trim: true,
    maxlength: [100, 'Business license cannot exceed 100 characters']
  },
  certifications: [{
    type: String, 
    trim: true,
    maxlength: [100, 'Certification cannot exceed 100 characters']
  }],
  establishedYear: { 
    type: Number, 
    min: [1800, 'Established year cannot be before 1800'], 
    max: [new Date().getFullYear(), 'Established year cannot be in the future']
  },
  employeeCount: { 
    type: Number, 
    min: [1, 'Employee count must be at least 1']
  },
  headquarters: {
    country: { type: String, trim: true, maxlength: [100, 'Country cannot exceed 100 characters'] },
    city: { type: String, trim: true, maxlength: [100, 'City cannot exceed 100 characters'] },
    address: { type: String, trim: true, maxlength: [500, 'Address cannot exceed 500 characters'] }
  },
  
  // Communication preferences
  preferredContactMethod: { 
    type: String, 
    enum: ['email', 'phone', 'message'],
    default: 'email'
  },
  timezone: { 
    type: String, 
    trim: true,
    maxlength: [50, 'Timezone cannot exceed 50 characters']
  },
  
  // Security fields
  lastLoginAt: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date }
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  }
});

// Indexes for better performance
ManufacturerSchema.index({ email: 1 });
ManufacturerSchema.index({ industry: 1 });
ManufacturerSchema.index({ isActive: 1 });
ManufacturerSchema.index({ isVerified: 1 });
ManufacturerSchema.index({ servicesOffered: 1 });
ManufacturerSchema.index({ 'headquarters.country': 1 });
ManufacturerSchema.index({ createdAt: -1 });

// Compound indexes
ManufacturerSchema.index({ isActive: 1, isVerified: 1 });
ManufacturerSchema.index({ industry: 1, isActive: 1 });

// Virtual for brand count
ManufacturerSchema.virtual('brandsCount').get(function() {
  return this.brands?.length || 0;
});

// Virtual for account lock status
ManufacturerSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// Instance methods
ManufacturerSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

ManufacturerSchema.methods.isAccountActive = function(): boolean {
  return this.isActive !== false && !this.deactivatedAt && !this.isLocked;
};

ManufacturerSchema.methods.getProfileCompleteness = function(): number {
  const requiredFields = ['name', 'email', 'description', 'industry'];
  const optionalFields = ['servicesOffered', 'moq', 'contactEmail', 'profilePictureUrl', 'headquarters.country'];
  
  const completedRequired = requiredFields.filter(field => {
    const value = this[field];
    return value !== null && value !== undefined && value !== '';
  }).length;
  
  const completedOptional = optionalFields.filter(field => {
    const keys = field.split('.');
    let value = this;
    for (const key of keys) {
      value = value?.[key];
    }
    return value !== null && value !== undefined && value !== '';
  }).length;
  
  const requiredWeight = 0.7;
  const optionalWeight = 0.3;
  
  const requiredScore = (completedRequired / requiredFields.length) * requiredWeight;
  const optionalScore = (completedOptional / optionalFields.length) * optionalWeight;
  
  return Math.round((requiredScore + optionalScore) * 100);
};

ManufacturerSchema.methods.updateLastLogin = function(): Promise<IManufacturer> {
  this.lastLoginAt = new Date();
  return this.save();
};

ManufacturerSchema.methods.incrementLoginAttempts = function(): Promise<IManufacturer> {
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates: any = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) };
  }
  
  return this.updateOne(updates);
};

ManufacturerSchema.methods.resetLoginAttempts = function(): Promise<IManufacturer> {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLoginAt: new Date() }
  });
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

ManufacturerSchema.statics.searchManufacturers = function(searchTerm: string) {
  return this.find({
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { industry: { $regex: searchTerm, $options: 'i' } },
      { servicesOffered: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  });
};

// Pre-save middleware
ManufacturerSchema.pre('save', async function(next) {
  if (this.isModified('brands')) {
    // Update totalConnections virtual when brands change
  }
  
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error: any) {
      return next(error);
    }
  }
  
  if (this.socialUrls) {
    this.socialUrls = this.socialUrls.filter(url => url && url.trim());
  }
  
  if (this.servicesOffered) {
    this.servicesOffered = this.servicesOffered.filter(service => service && service.trim());
  }
  
  next();
});

export const Manufacturer = model<IManufacturer>('Manufacturer', ManufacturerSchema);
