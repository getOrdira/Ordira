// src/models/manufacturer.model.ts
import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IManufacturer extends Document {
  name: string;
  email: string;
  password: string;
  brands: Types.ObjectId[]; // References to BrandSettings
  createdAt: Date;
  updatedAt: Date;
  
  // Core Profile Information (aligned with service methods)
  industry?: string;
  description?: string;
  contactEmail?: string;
  servicesOffered?: string[];
  moq?: number;
  
  // Enhanced Profile Information
  profilePictureUrl?: string;
  website?: string;
  socialUrls?: string[];
  
  // Account Status & Verification (aligned with controller logic)
  isActive?: boolean;
  deactivatedAt?: Date;
  isVerified?: boolean;
  verifiedAt?: Date;
  isEmailVerified?: boolean;
  emailVerifiedAt?: Date;
  verificationToken?: string;
  
  // Business Information
  businessLicense?: string;
  certifications?: string[];
  establishedYear?: number;
  employeeCount?: number;
  headquarters?: {
    country?: string;
    city?: string;
    address?: string;
    postalCode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Manufacturing Capabilities
  manufacturingCapabilities?: {
    productTypes?: string[];
    materials?: string[];
    processes?: string[];
    qualityStandards?: string[];
    customization?: 'none' | 'limited' | 'full';
    sustainabilityPractices?: string[];
  };
  
  // Connection & Business Metrics (aligned with service methods)
  totalConnections?: number;
  connectionRequests?: {
    sent: number;
    received: number;
    approved: number;
    rejected: number;
  };
  averageResponseTime?: number; // in hours
  successfulProjects?: number;
  clientSatisfactionRating?: number; // 1-5 scale
  
  // Communication Preferences
  preferredContactMethod?: 'email' | 'phone' | 'message';
  timezone?: string;
  availableHours?: {
    start: string; // "09:00"
    end: string;   // "17:00"
    timezone: string;
  };
  responseTimeCommitment?: number; // in hours
  
  // Security & Authentication (aligned with auth service)
  lastLoginAt?: Date;
  loginAttempts?: number;
  lockUntil?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  
  // Profile Analytics & Activity (aligned with dashboard methods)
  profileViews?: number;
  searchAppearances?: number;
  lastProfileUpdate?: Date;
  profileScore?: number; // calculated score based on completeness and activity
  
  // Activity Tracking (aligned with service calculations)
  activityMetrics?: {
    lastActiveAt?: Date;
    profileCompleteness?: number;
    engagementScore?: number;
    responsiveness?: 'high' | 'medium' | 'low';
  };
  
  // Partnership Preferences
  partnershipPreferences?: {
    preferredBrandTypes?: string[];
    minimumProjectValue?: number;
    maximumProjectDuration?: number; // in months
    preferredRegions?: string[];
    exclusivity?: 'none' | 'category' | 'full';
  };
  
  // Compliance & Quality
  qualityAssurance?: {
    iso9001?: boolean;
    iso14001?: boolean;
    customCertifications?: string[];
    auditHistory?: Array<{
      auditor: string;
      date: Date;
      result: 'passed' | 'failed' | 'conditional';
      score?: number;
    }>;
  };
  
  // Financial Information
  financialInfo?: {
    annualRevenue?: string; // "1M-5M", "5M-10M", etc.
    paymentTerms?: string[];
    creditRating?: string;
    insuranceCoverage?: boolean;
  };
  
  // Notification Preferences
  notificationSettings?: {
    email?: {
      connectionRequests: boolean;
      projectUpdates: boolean;
      marketing: boolean;
      systemAlerts: boolean;
    };
    sms?: {
      urgentOnly: boolean;
      projectDeadlines: boolean;
    };
    inApp?: {
      all: boolean;
      mentions: boolean;
      messages: boolean;
    };
  };
  
  // Instance methods (aligned with service requirements)
  comparePassword(candidatePassword: string): Promise<boolean>;
  isAccountActive(): boolean;
  getProfileCompleteness(): number;
  updateLastLogin(): Promise<IManufacturer>;
  incrementLoginAttempts(): Promise<IManufacturer>;
  resetLoginAttempts(): Promise<IManufacturer>;
  calculateProfileScore(): number;
  updateActivityMetrics(): Promise<IManufacturer>;
  canConnectToBrand(brandId: string): Promise<boolean>;
  getConnectionHistory(): Promise<any[]>;
  generateVerificationToken(): string;
  isProfileComplete(): boolean;
  getRecommendations(): string[];
  updateConnectionStats(action: 'sent' | 'received' | 'approved' | 'rejected'): Promise<IManufacturer>;
}

const ManufacturerSchema = new Schema<IManufacturer>({
  // Core Required Fields (aligned with registration validation)
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
    index: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true, 
    lowercase: true, 
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    index: true
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  brands: [{ 
    type: Types.ObjectId, 
    ref: 'BrandSettings', // Properly aligned with service references
    validate: {
      validator: function(brands: Types.ObjectId[]) {
        return brands.length <= 100;
      },
      message: 'Cannot connect to more than 100 brands'
    }
  }],
  
  // Core Profile Information (aligned with update methods)
  industry: { 
    type: String, 
    trim: true,
    maxlength: [100, 'Industry cannot exceed 100 characters'],
    index: true
  },
  description: { 
    type: String, 
    trim: true, 
    maxlength: [2000, 'Description cannot exceed 2000 characters']
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
  servicesOffered: [{
    type: String, 
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  }],
  moq: { 
    type: Number, 
    min: [1, 'MOQ must be at least 1']
  },
  
  // Enhanced Profile Information
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
  website: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Website must be a valid URL'
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
  
  // Account Status & Verification (aligned with auth service)
  isActive: { type: Boolean, default: true, index: true },
  deactivatedAt: { type: Date },
  isVerified: { type: Boolean, default: false, index: true },
  verifiedAt: { type: Date },
  isEmailVerified: { type: Boolean, default: false, index: true },
  emailVerifiedAt: { type: Date },
  verificationToken: { 
    type: String, 
    select: false // Don't include in queries by default
  },
  
  // Business Information
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
    country: { type: String, trim: true, maxlength: [100, 'Country cannot exceed 100 characters'], index: true },
    city: { type: String, trim: true, maxlength: [100, 'City cannot exceed 100 characters'] },
    address: { type: String, trim: true, maxlength: [500, 'Address cannot exceed 500 characters'] },
    postalCode: { type: String, trim: true, maxlength: [20, 'Postal code cannot exceed 20 characters'] },
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    }
  },
  
  // Manufacturing Capabilities
  manufacturingCapabilities: {
    productTypes: [{ type: String, trim: true }],
    materials: [{ type: String, trim: true }],
    processes: [{ type: String, trim: true }],
    qualityStandards: [{ type: String, trim: true }],
    customization: { 
      type: String, 
      enum: ['none', 'limited', 'full'],
      default: 'limited'
    },
    sustainabilityPractices: [{ type: String, trim: true }]
  },
  
  // Connection & Business Metrics (aligned with service calculations)
  totalConnections: { type: Number, default: 0, min: 0 },
  connectionRequests: {
    sent: { type: Number, default: 0, min: 0 },
    received: { type: Number, default: 0, min: 0 },
    approved: { type: Number, default: 0, min: 0 },
    rejected: { type: Number, default: 0, min: 0 }
  },
  averageResponseTime: { type: Number, min: 0 }, // in hours
  successfulProjects: { type: Number, default: 0, min: 0 },
  clientSatisfactionRating: { type: Number, min: 1, max: 5 },
  
  // Communication Preferences
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
  availableHours: {
    start: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    end: { type: String, match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    timezone: { type: String, trim: true }
  },
  responseTimeCommitment: { type: Number, min: 1, max: 168 }, // max 1 week
  
  // Security & Authentication (aligned with login/token methods)
  lastLoginAt: { type: Date, index: true },
  loginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },
  
  // Profile Analytics & Activity (aligned with dashboard methods)
  profileViews: { type: Number, default: 0, min: 0 },
  searchAppearances: { type: Number, default: 0, min: 0 },
  lastProfileUpdate: { type: Date, default: Date.now },
  profileScore: { type: Number, min: 0, max: 100, default: 0 },
  
  // Activity Tracking (aligned with service calculations)
  activityMetrics: {
    lastActiveAt: { type: Date, default: Date.now },
    profileCompleteness: { type: Number, min: 0, max: 100, default: 0 },
    engagementScore: { type: Number, min: 0, max: 100, default: 0 },
    responsiveness: { 
      type: String, 
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  },
  
  // Partnership Preferences
  partnershipPreferences: {
    preferredBrandTypes: [{ type: String, trim: true }],
    minimumProjectValue: { type: Number, min: 0 },
    maximumProjectDuration: { type: Number, min: 1, max: 120 }, // months
    preferredRegions: [{ type: String, trim: true }],
    exclusivity: { 
      type: String, 
      enum: ['none', 'category', 'full'],
      default: 'none'
    }
  },
  
  // Compliance & Quality
  qualityAssurance: {
    iso9001: { type: Boolean, default: false },
    iso14001: { type: Boolean, default: false },
    customCertifications: [{ type: String, trim: true }],
    auditHistory: [{
      auditor: { type: String, required: true, trim: true },
      date: { type: Date, required: true },
      result: { 
        type: String, 
        enum: ['passed', 'failed', 'conditional'],
        required: true 
      },
      score: { type: Number, min: 0, max: 100 }
    }]
  },
  
  // Financial Information
  financialInfo: {
    annualRevenue: { 
      type: String, 
      enum: ['<1M', '1M-5M', '5M-10M', '10M-50M', '50M-100M', '>100M']
    },
    paymentTerms: [{ type: String, trim: true }],
    creditRating: { type: String, trim: true },
    insuranceCoverage: { type: Boolean, default: false }
  },
  
  // Notification Preferences (aligned with dashboard requirements)
  notificationSettings: {
    email: {
      connectionRequests: { type: Boolean, default: true },
      projectUpdates: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      systemAlerts: { type: Boolean, default: true }
    },
    sms: {
      urgentOnly: { type: Boolean, default: false },
      projectDeadlines: { type: Boolean, default: false }
    },
    inApp: {
      all: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      messages: { type: Boolean, default: true }
    }
  }
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.twoFactorSecret;
      delete ret.verificationToken;
      return ret;
    }
  }
});

// Indexes for Performance (optimized for service queries)
ManufacturerSchema.index({ email: 1 });
ManufacturerSchema.index({ name: 1 });
ManufacturerSchema.index({ industry: 1 });
ManufacturerSchema.index({ isActive: 1 });
ManufacturerSchema.index({ isVerified: 1 });
ManufacturerSchema.index({ isEmailVerified: 1 });
ManufacturerSchema.index({ servicesOffered: 1 });
ManufacturerSchema.index({ 'headquarters.country': 1 });
ManufacturerSchema.index({ profileScore: -1 });
ManufacturerSchema.index({ lastLoginAt: -1 });
ManufacturerSchema.index({ createdAt: -1 });

// Compound indexes for service search methods
ManufacturerSchema.index({ isActive: 1, isVerified: 1 });
ManufacturerSchema.index({ industry: 1, isActive: 1 });
ManufacturerSchema.index({ isActive: 1, profileScore: -1 });
ManufacturerSchema.index({ industry: 1, 'headquarters.country': 1 });
ManufacturerSchema.index({ servicesOffered: 1, isActive: 1 });

// Text index for search functionality (aligned with service search)
ManufacturerSchema.index({
  name: 'text',
  description: 'text',
  servicesOffered: 'text',
  industry: 'text'
});

// Virtuals (aligned with service return types)
ManufacturerSchema.virtual('brandsCount').get(function() {
  return this.brands?.length || 0;
});

ManufacturerSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

ManufacturerSchema.virtual('connectionSuccessRate').get(function() {
  const total = this.connectionRequests?.sent || 0;
  const approved = this.connectionRequests?.approved || 0;
  return total > 0 ? Math.round((approved / total) * 100) : 0;
});

ManufacturerSchema.virtual('yearsInBusiness').get(function() {
  return this.establishedYear ? new Date().getFullYear() - this.establishedYear : 0;
});

ManufacturerSchema.virtual('isProfileComplete').get(function() {
  return this.getProfileCompleteness() >= 80;
});

// Instance Methods (aligned with service requirements)
ManufacturerSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

ManufacturerSchema.methods.isAccountActive = function(): boolean {
  return this.isActive !== false && !this.deactivatedAt && !this.isLocked;
};

// Profile completeness calculation (aligned with service method)
ManufacturerSchema.methods.getProfileCompleteness = function(): number {
  const requiredFields = [
    'name', 'email', 'description', 'industry', 'servicesOffered', 'moq'
  ];
  
  const optionalFields = [
    'contactEmail', 'profilePictureUrl', 'website', 'headquarters.country',
    'establishedYear', 'employeeCount', 'certifications'
  ];
  
  const enhancedFields = [
    'manufacturingCapabilities.productTypes', 'partnershipPreferences.preferredBrandTypes',
    'qualityAssurance.iso9001', 'financialInfo.annualRevenue'
  ];
  
  let score = 0;
  let totalFields = 0;
  
  // Required fields (50% weight)
  requiredFields.forEach(field => {
    totalFields += 5;
    const value = this[field];
    if (Array.isArray(value) ? value.length > 0 : value) {
      score += 5;
    }
  });
  
  // Optional fields (30% weight)
  optionalFields.forEach(field => {
    totalFields += 3;
    const keys = field.split('.');
    let value = this;
    for (const key of keys) {
      value = value?.[key];
    }
    if (Array.isArray(value) ? value.length > 0 : value) {
      score += 3;
    }
  });
  
  // Enhanced fields (20% weight)
  enhancedFields.forEach(field => {
    totalFields += 2;
    const keys = field.split('.');
    let value = this;
    for (const key of keys) {
      value = value?.[key];
    }
    if (Array.isArray(value) ? value.length > 0 : value) {
      score += 2;
    }
  });
  
  return Math.min(Math.round((score / totalFields) * 100), 100);
};

ManufacturerSchema.methods.calculateProfileScore = function(): number {
  const completeness = this.getProfileCompleteness();
  const verificationBonus = this.isVerified ? 10 : 0;
  const emailVerificationBonus = this.isEmailVerified ? 5 : 0;
  const activityBonus = this.lastLoginAt && 
    (Date.now() - this.lastLoginAt.getTime()) < 30 * 24 * 60 * 60 * 1000 ? 5 : 0;
  
  const baseScore = completeness * 0.7;
  const bonuses = verificationBonus + emailVerificationBonus + activityBonus;
  
  return Math.min(Math.round(baseScore + bonuses), 100);
};

ManufacturerSchema.methods.updateLastLogin = function(): Promise<IManufacturer> {
  this.lastLoginAt = new Date();
  if (this.activityMetrics) {
    this.activityMetrics.lastActiveAt = new Date();
  }
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

ManufacturerSchema.methods.updateActivityMetrics = function(): Promise<IManufacturer> {
  const completeness = this.getProfileCompleteness();
  const profileScore = this.calculateProfileScore();
  
  let responsiveness = 'medium';
  if (this.averageResponseTime) {
    if (this.averageResponseTime <= 4) responsiveness = 'high';
    else if (this.averageResponseTime >= 24) responsiveness = 'low';
  }
  
  this.activityMetrics = {
    lastActiveAt: new Date(),
    profileCompleteness: completeness,
    engagementScore: this.calculateEngagementScore(),
    responsiveness: responsiveness as 'high' | 'medium' | 'low'
  };
  
  this.profileScore = profileScore;
  this.lastProfileUpdate = new Date();
  
  return this.save();
};

ManufacturerSchema.methods.calculateEngagementScore = function(): number {
  let score = 0;
  
  if (this.profileViews) {
    score += Math.min(this.profileViews * 0.1, 20);
  }
  
  const successRate = this.connectionSuccessRate;
  score += successRate * 0.3;
  
  if (this.lastLoginAt && (Date.now() - this.lastLoginAt.getTime()) < 7 * 24 * 60 * 60 * 1000) {
    score += 20;
  }
  
  score += this.getProfileCompleteness() * 0.3;
  
  return Math.min(Math.round(score), 100);
};

// Eligibility check (aligned with service canConnectToBrand)
ManufacturerSchema.methods.canConnectToBrand = async function(brandId: string): Promise<boolean> {
  if (this.brands.includes(brandId)) {
    return false;
  }
  
  if (!this.isAccountActive() || !this.isEmailVerified) {
    return false;
  }
  
  if (this.getProfileCompleteness() < 60) {
    return false;
  }
  
  return true;
};

ManufacturerSchema.methods.getConnectionHistory = async function(): Promise<any[]> {
  return [
    {
      type: 'connection_requests_sent',
      count: this.connectionRequests?.sent || 0
    },
    {
      type: 'connection_requests_approved',
      count: this.connectionRequests?.approved || 0
    },
    {
      type: 'total_brands_connected',
      count: this.totalConnections || 0
    }
  ];
};

ManufacturerSchema.methods.generateVerificationToken = function(): string {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = token;
  return token;
};

ManufacturerSchema.methods.isProfileComplete = function(): boolean {
  return this.getProfileCompleteness() >= 80;
};

ManufacturerSchema.methods.getRecommendations = function(): string[] {
  const recommendations = [];
  const completeness = this.getProfileCompleteness();
  
  if (completeness < 50) {
    recommendations.push('Complete your basic profile information');
  }
  
  if (!this.isEmailVerified) {
    recommendations.push('Verify your email address');
  }
  
  if (!this.description || this.description.length < 100) {
    recommendations.push('Add a detailed description of your services');
  }
  
  if (!this.servicesOffered || this.servicesOffered.length === 0) {
    recommendations.push('List the services you offer');
  }
  
  if (!this.moq) {
    recommendations.push('Specify your minimum order quantity');
  }
  
  if (!this.profilePictureUrl) {
    recommendations.push('Upload a professional profile picture');
  }
  
  if (this.totalConnections === 0) {
    recommendations.push('Start connecting with brands');
  }
  
  return recommendations;
};

ManufacturerSchema.methods.updateConnectionStats = function(action: 'sent' | 'received' | 'approved' | 'rejected'): Promise<IManufacturer> {
  if (!this.connectionRequests) {
    this.connectionRequests = { sent: 0, received: 0, approved: 0, rejected: 0 };
  }
  
  this.connectionRequests[action] += 1;
  
  if (action === 'approved') {
    this.totalConnections = (this.totalConnections || 0) + 1;
  }
  
  return this.save();
};

// Static Methods (aligned with service search methods)
ManufacturerSchema.statics.getManufacturerStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalManufacturers: { $sum: 1 },
        activeManufacturers: { $sum: { $cond: ['$isActive', 1, 0] } },
        verifiedManufacturers: { $sum: { $cond: ['$isVerified', 1, 0] } },
        emailVerifiedManufacturers: { $sum: { $cond: ['$isEmailVerified', 1, 0] } },
        averageProfileScore: { $avg: '$profileScore' },
        averageConnections: { $avg: '$totalConnections' }
      }
    }
  ]);
};

ManufacturerSchema.statics.getEngagementMetrics = function(days: number = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        isActive: true,
        lastLoginAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        activeUsers: { $sum: 1 },
        averageEngagementScore: { $avg: '$activityMetrics.engagementScore' },
        highEngagementUsers: { 
          $sum: { 
            $cond: [
              { $gte: ['$activityMetrics.engagementScore', 70] }, 
              1, 
              0
            ] 
          }
        }
      }
    }
  ]);
};

// Pre-save middleware (aligned with service validation)
ManufacturerSchema.pre('save', async function(next) {
  // Hash password if modified (aligned with auth service)
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error: any) {
      return next(error);
    }
  }
  
  // Clean up arrays (aligned with service normalization)
  if (this.socialUrls) {
    this.socialUrls = this.socialUrls.filter(url => url && url.trim());
  }
  
  if (this.servicesOffered) {
    this.servicesOffered = this.servicesOffered.filter(service => service && service.trim());
  }
  
  if (this.certifications) {
    this.certifications = this.certifications.filter(cert => cert && cert.trim());
  }
  
  // Update profile metrics (aligned with service calculations)
  if (this.isModified() && !this.isNew) {
    this.lastProfileUpdate = new Date();
    
    if (!this.activityMetrics) {
      this.activityMetrics = {
        lastActiveAt: new Date(),
        profileCompleteness: 0,
        engagementScore: 0,
        responsiveness: 'medium'
      };
    }
    
    this.activityMetrics.profileCompleteness = this.getProfileCompleteness();
    this.profileScore = this.calculateProfileScore();
  }
  
  // Initialize defaults for new documents (aligned with service expectations)
  if (this.isNew) {
    if (!this.connectionRequests) {
      this.connectionRequests = { sent: 0, received: 0, approved: 0, rejected: 0 };
    }
    
    if (!this.activityMetrics) {
      this.activityMetrics = {
        lastActiveAt: new Date(),
        profileCompleteness: this.getProfileCompleteness(),
        engagementScore: 0,
        responsiveness: 'medium'
      };
    }
    
    if (!this.notificationSettings) {
      this.notificationSettings = {
        email: {
          connectionRequests: true,
          projectUpdates: true,
          marketing: false,
          systemAlerts: true
        },
        sms: {
          urgentOnly: false,
          projectDeadlines: false
        },
        inApp: {
          all: true,
          mentions: true,
          messages: true
        }
      };
    }
    
    this.profileScore = this.calculateProfileScore();
  }
  
  // Update total connections when brands array changes (aligned with service logic)
  if (this.isModified('brands')) {
    this.totalConnections = this.brands.length;
  }
  
  next();
});

// Post-save middleware for analytics (aligned with service tracking)
ManufacturerSchema.post('save', function(doc) {
  if (this.isModified('isVerified') && doc.isVerified) {
    console.log(`Manufacturer ${doc.email} verified at ${new Date()}`);
  }
  
  if (this.isModified('totalConnections')) {
    console.log(`Manufacturer ${doc.email} connection count: ${doc.totalConnections}`);
  }
});

// Pre-findOneAndUpdate middleware (aligned with service updates)
ManufacturerSchema.pre('findOneAndUpdate', function() {
  this.set({ lastProfileUpdate: new Date() });
});

export const Manufacturer = model<IManufacturer>('Manufacturer', ManufacturerSchema);.findByIndustry = function(industry: string) {
  return this.find({ 
    industry, 
    isActive: { $ne: false },
    isEmailVerified: true
  }).sort({ profileScore: -1, name: 1 });
};

ManufacturerSchema.statics.findVerified = function() {
  return this.find({ 
    isVerified: true,
    isEmailVerified: true,
    isActive: { $ne: false }
  }).sort({ profileScore: -1, name: 1 });
};

ManufacturerSchema.statics.searchManufacturers = function(searchTerm: string, options: any = {}) {
  const query: any = {
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { industry: { $regex: searchTerm, $options: 'i' } },
      { servicesOffered: { $in: [new RegExp(searchTerm, 'i')] } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  if (options.industry) {
    query.industry = { $regex: options.industry, $options: 'i' };
  }
  
  if (options.verified !== undefined) {
    query.isVerified = options.verified;
  }
  
  if (options.minMoq !== undefined || options.maxMoq !== undefined) {
    query.moq = {};
    if (options.minMoq !== undefined) query.moq.$gte = options.minMoq;
    if (options.maxMoq !== undefined) query.moq.$lte = options.maxMoq;
  }
  
  if (options.services && options.services.length > 0) {
    query.servicesOffered = { $in: options.services.map((s: string) => new RegExp(s, 'i')) };
  }
  
  if (options.country) {
    query['headquarters.country'] = { $regex: options.country, $options: 'i' };
  }
  
  return this.find(query)
    .sort({ profileScore: -1, totalConnections: -1 })
    .limit(options.limit || 50);
  
};
