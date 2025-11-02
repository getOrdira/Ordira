// src/models/user/user.model.ts
import { Schema, model, Document, Types, Model } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  // Basic user information
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  fullName?: string;
  
  // Email verification
  emailCode?: string;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  
  // Security and authentication
  lastLoginAt?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
  lastPasswordChangeAt?: Date;
  tokenVersion?: number;
  isActive?: boolean;

  passwordResetCode?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordResetAttempts?: number;
  lastPasswordResetAttempt?: Date;
  
  // User preferences and settings
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
    language: string;
    timezone: string;
  };

   securityPreferences?: {
    twoFactorEnabled?: boolean;
    loginNotifications?: boolean;
    sessionTimeout?: number;
    allowedIpAddresses?: string[];
    requirePasswordChange?: boolean;
    updatedAt?: Date;
  };
  
  // Voting-related fields
  votingHistory: Array<{
    proposalId: string;
    businessId: Types.ObjectId;
    productId?: Types.ObjectId;
    vote: 'yes' | 'no' | 'abstain';
    selectedProductId?: string;
    productName?: string;
    votedAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }>;
  
  // Brand interactions
  brandInteractions: Array<{
    businessId: Types.ObjectId;
    firstInteraction: Date;
    lastInteraction: Date;
    totalVotes: number;
    totalPageViews: number;
    favoriteProducts: Types.ObjectId[];
  }>;
  
  // Analytics tracking
  analytics: {
    totalVotes: number;
    totalSessions: number;
    averageSessionDuration: number; // in minutes
    lastActiveAt: Date;
    deviceInfo?: string;
    referralSource?: string;
    engagementScore?: number;
  };
  
  // Account status
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  suspendedAt?: Date;
  suspensionReason?: string;
  deletedAt?: Date;
  
  // Instance methods
  comparePassword(candidate: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<IUser>;
  resetLoginAttempts(): Promise<IUser>;
  isAccountLocked(): boolean;
  hasVotedForProposal(proposalId: string): boolean;
  canVoteForBusiness(businessId: string): boolean;
  addVote(voteData: any): Promise<IUser>;
  updateBrandInteraction(businessId: string): Promise<IUser>;
  incrementAnalytics(type: string, value?: number): Promise<IUser>;
  generateBackupCodes(): string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
export interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findVerifiedUsers(): Promise<IUser[]>;
  findActiveUsers(): Promise<IUser[]>;
  findUsersByBrand(businessId: string): Promise<IUser[]>;
  getVotingStats(businessId?: string): Promise<any>;
  findUsersWithVotingHistory(): Promise<IUser[]>;
  bulkUpdatePreferences(userIds: string[], preferences: any): Promise<any>;
}

const UserSchema = new Schema<IUser>(
  {
    // Basic user information
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
    
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    
    profilePictureUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'Invalid profile picture URL format'
      }
    },
    
    // Email verification
    emailCode: { 
      type: String, 
      select: false,
      length: [6, 'Email code must be 6 characters']
    },
    
    isEmailVerified: { 
      type: Boolean, 
      default: false,
      index: true
    },
    
    emailVerifiedAt: {
      type: Date
    },
    
    // Security and authentication
    lastLoginAt: { 
      type: Date,
      index: true
    },
    
    loginAttempts: { 
      type: Number, 
      default: 0,
      min: [0, 'Login attempts cannot be negative']
    },
    
    lockUntil: { 
      type: Date,
      index: true
    },
    
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    
    twoFactorSecret: {
      type: String,
      select: false
    },
    
    backupCodes: [{
      type: String,
      select: false
    }],
    
    // User preferences
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      marketingEmails: { type: Boolean, default: true },
      language: { type: String, default: 'en', enum: ['en', 'es', 'fr', 'de'] },
      timezone: { type: String, default: 'UTC' }
    },
    
    // Voting history
    votingHistory: [{
      proposalId: { 
        type: String, 
        required: true,
        index: true
      },
      businessId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Business', 
        required: true,
        index: true
      },
      productId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Product'
      },
      vote: { 
        type: String, 
        enum: ['yes', 'no', 'abstain'], 
        required: true 
      },
      votedAt: { 
        type: Date, 
        default: Date.now,
        index: true
      },
      ipAddress: { type: String },
      userAgent: { type: String }
    }],
    
    // Brand interactions tracking
    brandInteractions: [{
      businessId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Business', 
        required: true,
        index: true
      },
      firstInteraction: { 
        type: Date, 
        default: Date.now 
      },
      lastInteraction: { 
        type: Date, 
        default: Date.now 
      },
      totalVotes: { 
        type: Number, 
        default: 0,
        min: [0, 'Total votes cannot be negative']
      },
      totalPageViews: { 
        type: Number, 
        default: 0,
        min: [0, 'Page views cannot be negative']
      },
      favoriteProducts: [{ 
        type: Schema.Types.ObjectId, 
        ref: 'Product' 
      }]
    }],
    
    // Analytics and tracking
    analytics: {
      totalVotes: { 
        type: Number, 
        default: 0,
        min: [0, 'Total votes cannot be negative'],
        index: true
      },
      totalSessions: { 
        type: Number, 
        default: 0,
        min: [0, 'Total sessions cannot be negative']
      },
      averageSessionDuration: { 
        type: Number, 
        default: 0,
        min: [0, 'Session duration cannot be negative']
      },
      lastActiveAt: { 
        type: Date, 
        default: Date.now,
        index: true
      },
      deviceInfo: { type: String },
      referralSource: { type: String }
    },
    
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
    },
    
    // Account status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'deleted'],
      default: 'active',
      index: true
    },
    
    suspendedAt: {
      type: Date
    },
    
    suspensionReason: {
      type: String,
      maxlength: [500, 'Suspension reason cannot exceed 500 characters']
    },
    
    deletedAt: {
      type: Date
    }
  },
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        delete ret.password;
        delete ret.emailCode;
        delete ret.passwordResetCode;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.twoFactorSecret;
        delete ret.backupCodes;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// ====================
// INDEXES FOR PERFORMANCE
// ====================

// Authentication and security indexes
UserSchema.index({ email: 1 });
UserSchema.index({ isEmailVerified: 1, status: 1 });
UserSchema.index({ lockUntil: 1 });
UserSchema.index({ lastLoginAt: -1 });

// Voting-related indexes
UserSchema.index({ 'votingHistory.proposalId': 1 });
UserSchema.index({ 'votingHistory.businessId': 1, 'votingHistory.votedAt': -1 });
UserSchema.index({ 'analytics.totalVotes': -1 });

// Brand interaction indexes
UserSchema.index({ 'brandInteractions.businessId': 1 });
UserSchema.index({ 'analytics.lastActiveAt': -1 });

// Compound indexes for common queries
UserSchema.index({ status: 1, isEmailVerified: 1, createdAt: -1 });
UserSchema.index({ email: 1, status: 1 });

// ====================
// VIRTUAL PROPERTIES
// ====================

// Full name virtual
UserSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || 'Anonymous User';
});

// Account age in days
UserSchema.virtual('accountAge').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Voting engagement score
UserSchema.virtual('engagementScore').get(function() {
  const votes = this.analytics.totalVotes || 0;
  const sessions = this.analytics.totalSessions || 0;
  const avgSession = this.analytics.averageSessionDuration || 0;
  
  return (votes * 10) + (sessions * 2) + (avgSession * 0.1);
});

// Active status
UserSchema.virtual('isActive').get(function() {
  const daysSinceActive = (Date.now() - this.analytics.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceActive <= 30; // Active if used within 30 days
});

// ====================
// MIDDLEWARE
// ====================

// Pre-save: Hash password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Pre-save: Update analytics
UserSchema.pre('save', function(next) {
  if (this.isModified('analytics.lastActiveAt')) {
    this.analytics.totalSessions = (this.analytics.totalSessions || 0) + 1;
  }
  next();
});

// ====================
// INSTANCE METHODS
// ====================

// Password comparison
UserSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

// Login attempt management
UserSchema.methods.incrementLoginAttempts = function(): Promise<IUser> {
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates: any = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) }; // 2 hours
  }
  
  return this.updateOne(updates);
};

UserSchema.methods.resetLoginAttempts = function(): Promise<IUser> {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLoginAt: new Date() }
  });
};

// Account status checks
UserSchema.methods.isAccountLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Voting-related methods
UserSchema.methods.hasVotedForProposal = function(proposalId: string): boolean {
  return this.votingHistory.some(vote => vote.proposalId === proposalId);
};

UserSchema.methods.canVoteForBusiness = function(businessId: string): boolean {
  return this.status === 'active' && 
         this.isEmailVerified && 
         !this.isAccountLocked();
};

UserSchema.methods.addVote = function(voteData: {
  proposalId: string;
  businessId: string;
  productId?: string;
  vote: 'yes' | 'no' | 'abstain';
  ipAddress?: string;
  userAgent?: string;
}): Promise<IUser> {
  // Add to voting history
  this.votingHistory.push({
    ...voteData,
    votedAt: new Date()
  });
  
  // Update analytics
  this.analytics.totalVotes = (this.analytics.totalVotes || 0) + 1;
  this.analytics.lastActiveAt = new Date();
  
  // Update brand interaction
  let brandInteraction = this.brandInteractions.find(
    bi => bi.businessId.toString() === voteData.businessId
  );
  
  if (brandInteraction) {
    brandInteraction.totalVotes += 1;
    brandInteraction.lastInteraction = new Date();
  } else {
    this.brandInteractions.push({
      businessId: voteData.businessId,
      firstInteraction: new Date(),
      lastInteraction: new Date(),
      totalVotes: 1,
      totalPageViews: 0,
      favoriteProducts: []
    });
  }
  
  return this.save();
};

UserSchema.methods.updateBrandInteraction = function(businessId: string): Promise<IUser> {
  let interaction = this.brandInteractions.find(
    bi => bi.businessId.toString() === businessId
  );
  
  if (interaction) {
    interaction.totalPageViews += 1;
    interaction.lastInteraction = new Date();
  } else {
    this.brandInteractions.push({
      businessId: new Types.ObjectId(businessId),
      firstInteraction: new Date(),
      lastInteraction: new Date(),
      totalVotes: 0,
      totalPageViews: 1,
      favoriteProducts: []
    });
  }
  
  this.analytics.lastActiveAt = new Date();
  return this.save();
};

UserSchema.methods.incrementAnalytics = function(type: string, value: number = 1): Promise<IUser> {
  switch (type) {
    case 'session':
      this.analytics.totalSessions = (this.analytics.totalSessions || 0) + value;
      break;
    case 'sessionDuration':
      const currentAvg = this.analytics.averageSessionDuration || 0;
      const totalSessions = this.analytics.totalSessions || 1;
      this.analytics.averageSessionDuration = ((currentAvg * (totalSessions - 1)) + value) / totalSessions;
      break;
  }
  
  this.analytics.lastActiveAt = new Date();
  return this.save();
};

UserSchema.methods.generateBackupCodes = function(): string[] {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    codes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
  }
  this.backupCodes = codes;
  return codes;
};

// ====================
// STATIC METHODS
// ====================

UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findVerifiedUsers = function() {
  return this.find({ isEmailVerified: true, status: 'active' });
};

UserSchema.statics.findActiveUsers = function() {
  return this.find({ 
    status: 'active',
    'analytics.lastActiveAt': { 
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
    }
  });
};

UserSchema.statics.findUsersByBrand = function(businessId: string) {
  return this.find({ 
    'brandInteractions.businessId': businessId,
    status: 'active'
  });
};

UserSchema.statics.getVotingStats = function(businessId?: string) {
  const match: any = { status: 'active' };
  if (businessId) {
    match['votingHistory.businessId'] = businessId;
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalVotes: { $sum: '$analytics.totalVotes' },
        averageVotesPerUser: { $avg: '$analytics.totalVotes' },
        activeUsers: {
          $sum: {
            $cond: [
              {
                $gte: [
                  '$analytics.lastActiveAt',
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

UserSchema.statics.findUsersWithVotingHistory = function() {
  return this.find({ 
    'analytics.totalVotes': { $gt: 0 },
    status: 'active'
  }).sort({ 'analytics.totalVotes': -1 });
};

UserSchema.statics.bulkUpdatePreferences = function(userIds: string[], preferences: any) {
  return this.updateMany(
    { _id: { $in: userIds } },
    { $set: { preferences } }
  );
};

export const User = model<IUser, IUserModel>('User', UserSchema);

