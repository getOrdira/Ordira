// src/models/business.model.ts
import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IBusiness extends Document {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  email: string;
  businessName: string;
  businessType: 'brand' | 'creator'; // Distinguish between brands and creators/influencers
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
  industry?: string;
  contactEmail?: string;
  socialUrls?: string[];
  walletAddress?: string;
  certificateWallet: string;
  plan?: string;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  isActive?: boolean;
  
  securityPreferences?: {
    twoFactorEnabled?: boolean;
    loginNotifications?: boolean;
    sessionTimeout?: number;
    allowedIpAddresses?: string[];
    requirePasswordChange?: boolean;
    updatedAt?: Date;
  };

  // Additional security and account management
  lastLoginAt?: Date;
  loginAttempts?: number;
  lockUntil?: Date;
  tokenVersion?: number;
  
  // ADD THESE PASSWORD RESET FIELDS:
  passwordResetCode?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordResetAttempts?: number;
  lastPasswordResetAttempt?: Date;
  lastPasswordChangeAt?: Date;
  
  // Enhanced profile
  website?: string;
  phoneNumber?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  yearEstablished?: number;
  profileViews?: number;
  
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  isAccountLocked(): boolean;
  incrementLoginAttempts(): Promise<IBusiness>;
  resetLoginAttempts(): Promise<IBusiness>;
  getFullName(): string;
  getProfileCompleteness(): number;
}

const BusinessSchema = new Schema<IBusiness>(
  {
    // Required personal info
    firstName: { 
      type: String, 
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: { 
      type: String, 
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    dateOfBirth: { 
      type: Date, 
      required: [true, 'Date of birth is required'],
      validate: {
        validator: function(v: Date) {
          const today = new Date();
          const age = today.getFullYear() - v.getFullYear();
          return age >= 18 && age <= 120;
        },
        message: 'Must be between 18 and 120 years old'
      }
    },

    isActive: {
      type: Boolean,
      default: true
    },

    email: { 
      type: String, 
      required: [true, 'Email is required'],
      unique: true, 
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },

    // Required business info
    businessName: { 
      type: String, 
      required: [true, 'Business name is required'],
      trim: true,
      minlength: [2, 'Business name must be at least 2 characters'],
      maxlength: [100, 'Business name cannot exceed 100 characters']
    },
    businessType: {
      type: String,
      required: [true, 'Business type is required'],
      enum: {
        values: ['brand', 'creator'],
        message: 'Business type must be either "brand" or "creator"'
      },
      default: 'brand'
    },
    address: { 
      type: String, 
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters']
    },
    password: { 
      type: String, 
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false // Don't include in queries by default
    },

    plan: {
    type: String,
    enum: ['foundation', 'growth', 'premium', 'enterprise'],
    default: 'foundation'
    },
    
    // Optional business info
    regNumber: { 
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      maxlength: [20, 'Registration number cannot exceed 20 characters']
    },
    taxId: { 
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      maxlength: [25, 'Tax ID cannot exceed 25 characters']
    },
    
    // Account status
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    emailCode: { 
      type: String,
      select: false // Don't include in queries
    },
    
    emailVerifiedAt: { type: Date },
    phoneVerifiedAt: { type: Date },
    
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
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    industry: { 
      type: String,
      trim: true,
      maxlength: [75, 'Industry cannot exceed 75 characters']
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
    walletAddress: { 
      type: String, 
      lowercase: true,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum wallet address format']
    },
    
    // Enhanced fields
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
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format']
    },
    companySize: {
      type: String,
      enum: ['startup', 'small', 'medium', 'large', 'enterprise']
    },
    yearEstablished: {
      type: Number,
      min: [1800, 'Year established cannot be before 1800'],
      max: [new Date().getFullYear(), 'Year established cannot be in the future']
    },
    
    // Security fields
    lastLoginAt: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    
    // Password reset fields
    passwordResetCode: { 
      type: String,
      select: false // Don't include in queries for security
    },
    passwordResetToken: { 
      type: String,
      select: false // Don't include in queries for security
    },
    passwordResetExpires: { 
      type: Date,
      select: false // Don't include in queries for security
    },
    passwordResetAttempts: { 
      type: Number, 
      default: 0 
    },
    lastPasswordResetAttempt: { 
      type: Date 
    },
    lastPasswordChangeAt: { 
      type: Date 
    }
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.password;
        delete ret.emailCode;
        delete ret.passwordResetCode; // Don't expose in JSON
        delete ret.passwordResetToken; // Don't expose in JSON
        delete ret.passwordResetExpires; // Don't expose in JSON
        delete ret.__v;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        return ret;
      }
    }
  }
);

// Indexes for performance
BusinessSchema.index({ email: 1 });
BusinessSchema.index({ businessName: 1 });
BusinessSchema.index({ industry: 1 });
BusinessSchema.index({ isEmailVerified: 1 });
BusinessSchema.index({ createdAt: -1 });
BusinessSchema.index({ regNumber: 1 }, { sparse: true });
BusinessSchema.index({ taxId: 1 }, { sparse: true });

// Compound indexes
BusinessSchema.index({ email: 1, isEmailVerified: 1 });

// Virtual for full name
BusinessSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Virtual for account lock status
BusinessSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// Instance methods
BusinessSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

BusinessSchema.methods.isAccountLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

BusinessSchema.methods.incrementLoginAttempts = function(): Promise<IBusiness> {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates: any = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) }; // 2 hours
  }
  
  return this.updateOne(updates);
};

BusinessSchema.methods.resetLoginAttempts = function(): Promise<IBusiness> {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLoginAt: new Date() }
  });
};

BusinessSchema.methods.getFullName = function(): string {
  return `${this.firstName} ${this.lastName}`.trim();
};

BusinessSchema.methods.getProfileCompleteness = function(): number {
  const requiredFields = ['firstName', 'lastName', 'email', 'businessName', 'address'];
  const optionalFields = ['description', 'industry', 'profilePictureUrl', 'website', 'phoneNumber'];
  
  const completedRequired = requiredFields.filter(field => this[field]).length;
  const completedOptional = optionalFields.filter(field => this[field]).length;
  
  const requiredWeight = 0.7;
  const optionalWeight = 0.3;
  
  const requiredScore = (completedRequired / requiredFields.length) * requiredWeight;
  const optionalScore = (completedOptional / optionalFields.length) * optionalWeight;
  
  return Math.round((requiredScore + optionalScore) * 100);
};

// Static methods
BusinessSchema.statics.findVerified = function() {
  return this.find({ isEmailVerified: true });
};

BusinessSchema.statics.findByIndustry = function(industry: string) {
  return this.find({ industry, isEmailVerified: true });
};

BusinessSchema.statics.getIndustryStats = function() {
  return this.aggregate([
    { $match: { isEmailVerified: true } },
    { $group: { _id: '$industry', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

// Pre-save middleware
BusinessSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error: any) {
      return next(error);
    }
  }
  
  // Normalize social URLs
  if (this.socialUrls) {
    this.socialUrls = this.socialUrls.filter(url => url && url.trim());
  }
  
  next();
});

export const Business = model<IBusiness>('Business', BusinessSchema);