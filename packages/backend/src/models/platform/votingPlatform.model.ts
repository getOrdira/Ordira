// src/models/platform/votingPlatform.model.ts
import { Schema, model, Document, Types, Model, models } from 'mongoose';

export interface IVotingPlatform extends Document {
  // Ownership and identification
  businessId: Types.ObjectId;
  title: string;
  slug: string;
  description?: string;

  // Platform status and lifecycle
  status: 'draft' | 'live' | 'paused' | 'completed' | 'archived';
  visibility: 'public' | 'private' | 'unlisted';

  // Scheduling
  timezone: string;
  startTime?: Date;
  endTime?: Date;
  isScheduled: boolean;

  // Access control
  emailGating: {
    enabled: boolean;
    allowedDomains?: string[]; // e.g., ['@company.com', '@partner.com']
    allowedEmails?: string[]; // Specific email whitelist
    requireEmailVerification: boolean;
    blockDisposableEmails: boolean;
  };

  // Branding and customization
  branding: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    customCSS?: string; // Only for premium+ plans
    faviconUrl?: string;
  };

  // Template configuration
  templateId: string; // 'modern', 'minimal', 'classic', 'vibrant', 'professional'
  customTemplateConfig?: {
    layout: 'single-page' | 'multi-step' | 'wizard';
    progressBarStyle: 'linear' | 'circular' | 'stepped';
    buttonStyle: 'rounded' | 'square' | 'pill';
    animationsEnabled: boolean;
  };

  // Response settings
  responseSettings: {
    allowMultipleResponses: boolean;
    allowAnonymous: boolean;
    requireLogin: boolean;
    showResultsAfterVote: boolean;
    showLiveResults: boolean;
    captchaEnabled: boolean;
    maxResponsesPerUser: number;
  };

  // Plan-based feature flags
  planFeatures: {
    watermarkEnabled: boolean; // true for foundation plan
    customCSSEnabled: boolean; // false for foundation/growth
    customDomainEnabled: boolean; // premium+ only
    advancedAnalytics: boolean; // growth+ only
    exportResponses: boolean; // growth+ only
    maxResponses: number; // Based on plan limits
  };

  // Blockchain integration (NEW - DUAL MODE SUPPORT)
  blockchainIntegration: {
    enabled: boolean; // Toggle for blockchain voting
    mode: 'off-chain' | 'on-chain'; // Voting mode
    proposalId?: string; // Linked blockchain proposal (on-chain mode only)
    contractAddress?: string; // Voting contract address
    deploymentTxHash?: string; // Initial deployment transaction
    autoDeployVotes: boolean; // Auto-create PendingVote records on response completion
    batchThreshold?: number; // Min votes before suggesting batch deployment
  };

  // Custom domain (premium+ only)
  customDomain?: {
    domain: string;
    isVerified: boolean;
    verifiedAt?: Date;
    sslEnabled: boolean;
  };

  // Analytics and tracking
  analytics: {
    totalViews: number;
    totalResponses: number;
    uniqueRespondents: number;
    completionRate: number; // Percentage of users who complete all questions
    averageTimeToComplete: number; // in seconds
    bounceRate: number; // Percentage who leave without answering
    lastResponseAt?: Date;
    topReferrers: Array<{ source: string; count: number }>;
  };

  // Social sharing
  socialSharing: {
    enabled: boolean;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: 'summary' | 'summary_large_image';
  };

  // Notifications
  notifications: {
    sendToBusinessOnResponse: boolean;
    sendToRespondentOnComplete: boolean;
    emailTemplate?: string;
    webhookUrl?: string; // For integrations
  };

  // SEO
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    noIndex: boolean; // Don't index in search engines
  };

  // Publishing and archival
  publishedAt?: Date;
  archivedAt?: Date;
  lastModifiedBy?: Types.ObjectId; // Track who made last changes

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isActive(): boolean;
  isExpired(): boolean;
  canAcceptResponses(): boolean;
  incrementViews(): Promise<IVotingPlatform>;
  incrementResponses(isUnique: boolean): Promise<IVotingPlatform>;
  updateAnalytics(data: Partial<IVotingPlatform['analytics']>): Promise<IVotingPlatform>;
  publish(): Promise<IVotingPlatform>;
  pause(): Promise<IVotingPlatform>;
  archive(): Promise<IVotingPlatform>;
  isEmailAllowed(email: string): boolean;
  getPublicUrl(): string;
}

// Static methods interface
export interface IVotingPlatformModel extends Model<IVotingPlatform> {
  findByBusiness(businessId: string): Promise<IVotingPlatform[]>;
  findLivePlatforms(): Promise<IVotingPlatform[]>;
  findBySlug(slug: string, businessId?: string): Promise<IVotingPlatform | null>;
  findActiveForBusiness(businessId: string): Promise<IVotingPlatform[]>;
  getAnalyticsSummary(businessId: string): Promise<any>;
  expireScheduledPlatforms(): Promise<any>;
}

const VotingPlatformSchema = new Schema<IVotingPlatform>(
  {
    // Ownership
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true
    },

    title: {
      type: String,
      required: [true, 'Platform title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },

    slug: {
      type: String,
      required: [true, 'Slug is required'],
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'],
      index: true
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'live', 'paused', 'completed', 'archived'],
      default: 'draft',
      index: true
    },

    visibility: {
      type: String,
      enum: ['public', 'private', 'unlisted'],
      default: 'public'
    },

    // Scheduling
    timezone: {
      type: String,
      default: 'UTC',
      trim: true
    },

    startTime: {
      type: Date,
      index: true
    },

    endTime: {
      type: Date,
      index: true,
      validate: {
        validator: function(this: IVotingPlatform, v: Date) {
          return !this.startTime || !v || v > this.startTime;
        },
        message: 'End time must be after start time'
      }
    },

    isScheduled: {
      type: Boolean,
      default: false
    },

    // Email gating
    emailGating: {
      enabled: {
        type: Boolean,
        default: false
      },
      allowedDomains: [{
        type: String,
        trim: true,
        lowercase: true,
        match: [/^@?[\w.-]+\.\w{2,}$/, 'Invalid domain format']
      }],
      allowedEmails: [{
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
      }],
      requireEmailVerification: {
        type: Boolean,
        default: true
      },
      blockDisposableEmails: {
        type: Boolean,
        default: true
      }
    },

    // Branding
    branding: {
      logoUrl: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: 'Logo URL must be valid'
        }
      },
      primaryColor: {
        type: String,
        default: '#3B82F6',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color']
      },
      secondaryColor: {
        type: String,
        default: '#10B981',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color']
      },
      backgroundColor: {
        type: String,
        default: '#FFFFFF',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color']
      },
      textColor: {
        type: String,
        default: '#1F2937',
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color']
      },
      fontFamily: {
        type: String,
        default: 'Inter, sans-serif',
        trim: true
      },
      customCSS: {
        type: String,
        trim: true,
        maxlength: [50000, 'Custom CSS cannot exceed 50000 characters']
      },
      faviconUrl: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: 'Favicon URL must be valid'
        }
      }
    },

    // Template
    templateId: {
      type: String,
      enum: ['modern', 'minimal', 'classic', 'vibrant', 'professional'],
      default: 'modern'
    },

    customTemplateConfig: {
      layout: {
        type: String,
        enum: ['single-page', 'multi-step', 'wizard'],
        default: 'single-page'
      },
      progressBarStyle: {
        type: String,
        enum: ['linear', 'circular', 'stepped'],
        default: 'linear'
      },
      buttonStyle: {
        type: String,
        enum: ['rounded', 'square', 'pill'],
        default: 'rounded'
      },
      animationsEnabled: {
        type: Boolean,
        default: true
      }
    },

    // Response settings
    responseSettings: {
      allowMultipleResponses: {
        type: Boolean,
        default: false
      },
      allowAnonymous: {
        type: Boolean,
        default: false
      },
      requireLogin: {
        type: Boolean,
        default: true
      },
      showResultsAfterVote: {
        type: Boolean,
        default: false
      },
      showLiveResults: {
        type: Boolean,
        default: false
      },
      captchaEnabled: {
        type: Boolean,
        default: false
      },
      maxResponsesPerUser: {
        type: Number,
        default: 1,
        min: [1, 'Max responses must be at least 1'],
        max: [10, 'Max responses cannot exceed 10']
      }
    },

    // Plan features
    planFeatures: {
      watermarkEnabled: {
        type: Boolean,
        default: true // true for foundation plan
      },
      customCSSEnabled: {
        type: Boolean,
        default: false
      },
      customDomainEnabled: {
        type: Boolean,
        default: false
      },
      advancedAnalytics: {
        type: Boolean,
        default: false
      },
      exportResponses: {
        type: Boolean,
        default: false
      },
      maxResponses: {
        type: Number,
        default: 100 // Foundation plan limit
      }
    },

    // Blockchain integration
    blockchainIntegration: {
      enabled: {
        type: Boolean,
        default: false
      },
      mode: {
        type: String,
        enum: ['off-chain', 'on-chain'],
        default: 'off-chain'
      },
      proposalId: {
        type: String,
        trim: true
      },
      contractAddress: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address']
      },
      deploymentTxHash: {
        type: String,
        trim: true,
        lowercase: true
      },
      autoDeployVotes: {
        type: Boolean,
        default: true
      },
      batchThreshold: {
        type: Number,
        default: 20,
        min: [1, 'Batch threshold must be at least 1']
      }
    },

    // Custom domain
    customDomain: {
      domain: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^[\w.-]+\.\w{2,}$/, 'Invalid domain format']
      },
      isVerified: {
        type: Boolean,
        default: false
      },
      verifiedAt: {
        type: Date
      },
      sslEnabled: {
        type: Boolean,
        default: false
      }
    },

    // Analytics
    analytics: {
      totalViews: {
        type: Number,
        default: 0,
        min: [0, 'Views cannot be negative']
      },
      totalResponses: {
        type: Number,
        default: 0,
        min: [0, 'Responses cannot be negative']
      },
      uniqueRespondents: {
        type: Number,
        default: 0,
        min: [0, 'Unique respondents cannot be negative']
      },
      completionRate: {
        type: Number,
        default: 0,
        min: [0, 'Completion rate cannot be negative'],
        max: [100, 'Completion rate cannot exceed 100']
      },
      averageTimeToComplete: {
        type: Number,
        default: 0,
        min: [0, 'Average time cannot be negative']
      },
      bounceRate: {
        type: Number,
        default: 0,
        min: [0, 'Bounce rate cannot be negative'],
        max: [100, 'Bounce rate cannot exceed 100']
      },
      lastResponseAt: {
        type: Date
      },
      topReferrers: [{
        source: { type: String, trim: true },
        count: { type: Number, default: 0, min: 0 }
      }]
    },

    // Social sharing
    socialSharing: {
      enabled: {
        type: Boolean,
        default: true
      },
      ogTitle: {
        type: String,
        trim: true,
        maxlength: [100, 'OG title cannot exceed 100 characters']
      },
      ogDescription: {
        type: String,
        trim: true,
        maxlength: [200, 'OG description cannot exceed 200 characters']
      },
      ogImage: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: 'OG image must be a valid URL'
        }
      },
      twitterCard: {
        type: String,
        enum: ['summary', 'summary_large_image'],
        default: 'summary_large_image'
      }
    },

    // Notifications
    notifications: {
      sendToBusinessOnResponse: {
        type: Boolean,
        default: false
      },
      sendToRespondentOnComplete: {
        type: Boolean,
        default: false
      },
      emailTemplate: {
        type: String,
        trim: true
      },
      webhookUrl: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: 'Webhook URL must be valid'
        }
      }
    },

    // SEO
    seo: {
      metaTitle: {
        type: String,
        trim: true,
        maxlength: [70, 'Meta title cannot exceed 70 characters']
      },
      metaDescription: {
        type: String,
        trim: true,
        maxlength: [160, 'Meta description cannot exceed 160 characters']
      },
      keywords: [{
        type: String,
        trim: true
      }],
      noIndex: {
        type: Boolean,
        default: false
      }
    },

    // Publishing
    publishedAt: {
      type: Date,
      index: true
    },

    archivedAt: {
      type: Date
    },

    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Business'
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// ====================
// INDEXES FOR PERFORMANCE
// ====================

VotingPlatformSchema.index({ businessId: 1, status: 1 });
VotingPlatformSchema.index({ slug: 1, businessId: 1 }, { unique: true });
VotingPlatformSchema.index({ status: 1, startTime: 1, endTime: 1 });
VotingPlatformSchema.index({ visibility: 1, status: 1 });
VotingPlatformSchema.index({ 'customDomain.domain': 1 }, { sparse: true });
VotingPlatformSchema.index({ publishedAt: -1 });
VotingPlatformSchema.index({ createdAt: -1 });

// Compound indexes for common queries
VotingPlatformSchema.index({ businessId: 1, status: 1, createdAt: -1 });
VotingPlatformSchema.index({ status: 1, visibility: 1, publishedAt: -1 });

// ====================
// VIRTUAL PROPERTIES
// ====================

VotingPlatformSchema.virtual('isLive').get(function() {
  return this.status === 'live' && this.isActive();
});

VotingPlatformSchema.virtual('responseCount').get(function() {
  return this.analytics.totalResponses;
});

VotingPlatformSchema.virtual('viewCount').get(function() {
  return this.analytics.totalViews;
});

// ====================
// INSTANCE METHODS
// ====================

VotingPlatformSchema.methods.isActive = function(): boolean {
  const now = new Date();

  // Check if scheduled and within time range
  if (this.isScheduled) {
    if (this.startTime && this.startTime > now) {
      return false; // Not started yet
    }
    if (this.endTime && this.endTime < now) {
      return false; // Already ended
    }
  }

  return this.status === 'live';
};

VotingPlatformSchema.methods.isExpired = function(): boolean {
  if (!this.isScheduled || !this.endTime) {
    return false;
  }
  return this.endTime < new Date();
};

VotingPlatformSchema.methods.canAcceptResponses = function(): boolean {
  if (this.status !== 'live') {
    return false;
  }

  if (this.isExpired()) {
    return false;
  }

  // Check if response limit reached
  if (this.analytics.totalResponses >= this.planFeatures.maxResponses) {
    return false;
  }

  return true;
};

VotingPlatformSchema.methods.incrementViews = function(): Promise<IVotingPlatform> {
  return this.updateOne({
    $inc: { 'analytics.totalViews': 1 }
  });
};

VotingPlatformSchema.methods.incrementResponses = function(isUnique: boolean): Promise<IVotingPlatform> {
  const updates: any = {
    $inc: { 'analytics.totalResponses': 1 },
    $set: { 'analytics.lastResponseAt': new Date() }
  };

  if (isUnique) {
    updates.$inc['analytics.uniqueRespondents'] = 1;
  }

  return this.updateOne(updates);
};

VotingPlatformSchema.methods.updateAnalytics = function(data: Partial<IVotingPlatform['analytics']>): Promise<IVotingPlatform> {
  const updates: any = {};

  Object.keys(data).forEach(key => {
    updates[`analytics.${key}`] = data[key as keyof typeof data];
  });

  return this.updateOne({ $set: updates });
};

VotingPlatformSchema.methods.publish = function(): Promise<IVotingPlatform> {
  this.status = 'live';
  this.publishedAt = new Date();
  return this.save();
};

VotingPlatformSchema.methods.pause = function(): Promise<IVotingPlatform> {
  this.status = 'paused';
  return this.save();
};

VotingPlatformSchema.methods.archive = function(): Promise<IVotingPlatform> {
  this.status = 'archived';
  this.archivedAt = new Date();
  return this.save();
};

VotingPlatformSchema.methods.isEmailAllowed = function(email: string): boolean {
  if (!this.emailGating.enabled) {
    return true;
  }

  const lowerEmail = email.toLowerCase();

  // Check specific email whitelist
  if (this.emailGating.allowedEmails && this.emailGating.allowedEmails.length > 0) {
    if (this.emailGating.allowedEmails.includes(lowerEmail)) {
      return true;
    }
  }

  // Check domain whitelist
  if (this.emailGating.allowedDomains && this.emailGating.allowedDomains.length > 0) {
    const emailDomain = '@' + lowerEmail.split('@')[1];
    return this.emailGating.allowedDomains.some(domain => {
      const normalizedDomain = domain.startsWith('@') ? domain : '@' + domain;
      return emailDomain === normalizedDomain;
    });
  }

  // If email gating is enabled but no whitelist specified, allow all
  return this.emailGating.allowedEmails?.length === 0 && this.emailGating.allowedDomains?.length === 0;
};

VotingPlatformSchema.methods.getPublicUrl = function(): string {
  if (this.customDomain?.isVerified) {
    return `https://${this.customDomain.domain}`;
  }

  // Default to subdomain structure
  return `${process.env.FRONTEND_URL}/vote/${this.slug}`;
};

// ====================
// STATIC METHODS
// ====================

VotingPlatformSchema.statics.findByBusiness = function(businessId: string) {
  return this.find({ businessId }).sort({ createdAt: -1 });
};

VotingPlatformSchema.statics.findLivePlatforms = function() {
  const now = new Date();
  return this.find({
    status: 'live',
    $or: [
      { isScheduled: false },
      {
        isScheduled: true,
        startTime: { $lte: now },
        $or: [
          { endTime: { $exists: false } },
          { endTime: { $gte: now } }
        ]
      }
    ]
  });
};

VotingPlatformSchema.statics.findBySlug = function(slug: string, businessId?: string) {
  const query: any = { slug };
  if (businessId) {
    query.businessId = businessId;
  }
  return this.findOne(query);
};

VotingPlatformSchema.statics.findActiveForBusiness = function(businessId: string) {
  return this.find({
    businessId,
    status: { $in: ['live', 'paused'] }
  }).sort({ publishedAt: -1 });
};

VotingPlatformSchema.statics.getAnalyticsSummary = function(businessId: string) {
  return this.aggregate([
    { $match: { businessId: new Types.ObjectId(businessId) } },
    {
      $group: {
        _id: null,
        totalPlatforms: { $sum: 1 },
        totalViews: { $sum: '$analytics.totalViews' },
        totalResponses: { $sum: '$analytics.totalResponses' },
        totalUniqueRespondents: { $sum: '$analytics.uniqueRespondents' },
        averageCompletionRate: { $avg: '$analytics.completionRate' },
        livePlatforms: {
          $sum: { $cond: [{ $eq: ['$status', 'live'] }, 1, 0] }
        },
        draftPlatforms: {
          $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
        }
      }
    }
  ]);
};

VotingPlatformSchema.statics.expireScheduledPlatforms = function() {
  const now = new Date();
  return this.updateMany(
    {
      status: 'live',
      isScheduled: true,
      endTime: { $lt: now }
    },
    {
      $set: { status: 'completed' }
    }
  );
};

// ====================
// PRE-SAVE MIDDLEWARE
// ====================

VotingPlatformSchema.pre('save', function(next) {
  // Auto-generate slug from title if not provided
  if (this.isNew && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Set default social sharing values
  if (!this.socialSharing.ogTitle) {
    this.socialSharing.ogTitle = this.title;
  }
  if (!this.socialSharing.ogDescription) {
    this.socialSharing.ogDescription = this.description || this.title;
  }

  // Set default SEO values
  if (!this.seo.metaTitle) {
    this.seo.metaTitle = this.title;
  }
  if (!this.seo.metaDescription) {
    this.seo.metaDescription = this.description || this.title;
  }

  next();
});

// Check if model already exists to avoid "Cannot overwrite model" error
export const VotingPlatform = (models.VotingPlatform as IVotingPlatformModel) ||
  model<IVotingPlatform, IVotingPlatformModel>('VotingPlatform', VotingPlatformSchema);
