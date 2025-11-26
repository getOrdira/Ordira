// src/models/platform/votingResponse.model.ts
import { Schema, model, Document, Types, Model, models } from 'mongoose';
import crypto from 'crypto';

export interface IVotingResponse extends Document {
  // Ownership and references
  platformId: Types.ObjectId;
  businessId: Types.ObjectId;
  userId?: Types.ObjectId; // Optional - may be null for anonymous responses

  // Response identification
  responseHash: string; // hash(userId + platformId) for duplicate prevention
  sessionId?: string; // Browser session tracking for anonymous users
  fingerprint?: string; // Device fingerprint for additional duplicate prevention

  // Response data
  answers: Array<{
    questionId: Types.ObjectId;
    questionType: string;
    value: any; // Can be string, number, array, etc. depending on question type
    textValue?: string; // For text/textarea responses
    choiceValues?: string[]; // For multiple choice/image selection
    numericValue?: number; // For ratings/scales
    dateValue?: Date; // For date questions
    fileUrls?: string[]; // For file upload questions
    metadata?: {
      timeToAnswer?: number; // Time spent on this question in seconds
      skipped?: boolean;
      otherText?: string; // For "other" option in multiple choice
    };
  }>;

  // Completion tracking
  isComplete: boolean;
  completionPercentage: number;
  startedAt: Date;
  completedAt?: Date;
  timeToComplete?: number; // Total time in seconds

  // User context
  userContext: {
    ipAddress?: string;
    userAgent?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    operatingSystem?: string;
    screenResolution?: string;
    language?: string;
    timezone?: string;
  };

  // Location data (if available)
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
  };

  // Referral tracking
  referralData?: {
    source?: string; // 'email', 'social', 'direct', 'organic', etc.
    medium?: string;
    campaign?: string;
    referrerUrl?: string;
    utmParams?: {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_term?: string;
      utm_content?: string;
    };
  };

  // Quality and validation
  qualityMetrics: {
    isValid: boolean;
    isSuspicious: boolean; // Flagged by fraud detection
    suspiciousReasons?: string[];
    validationScore: number; // 0-100, based on various factors
    hasDuplicateAnswers?: boolean; // User gave same answer to all questions
    completionSpeed: 'too_fast' | 'normal' | 'slow';
  };

  // Status and flags
  status: 'in_progress' | 'completed' | 'abandoned' | 'flagged' | 'deleted';
  isAnonymous: boolean;
  isFlagged: boolean;
  flaggedReason?: string;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;

  // Email verification (for email-gated platforms)
  emailVerification?: {
    email: string;
    isVerified: boolean;
    verificationCode?: string;
    verificationSentAt?: Date;
    verifiedAt?: Date;
  };

  // Edit tracking
  editHistory?: Array<{
    editedAt: Date;
    editedBy?: Types.ObjectId;
    changes: string; // JSON string of what changed
  }>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  calculateCompletionPercentage(): number;
  markComplete(): Promise<IVotingResponse>;
  flagAsSuspicious(reason: string): Promise<IVotingResponse>;
  addAnswer(answer: IVotingResponse['answers'][0]): Promise<IVotingResponse>;
  updateAnswer(questionId: string, value: any): Promise<IVotingResponse>;
  getAnswer(questionId: string): any;
  calculateQualityScore(): number;
  generateFingerprint(): string;
}

// Static methods interface
export interface IVotingResponseModel extends Model<IVotingResponse> {
  findByPlatform(platformId: string): Promise<IVotingResponse[]>;
  findByUser(userId: string): Promise<IVotingResponse[]>;
  findCompletedResponses(platformId: string): Promise<IVotingResponse[]>;
  checkDuplicate(userId: string, platformId: string): Promise<IVotingResponse | null>;
  getResponseStats(platformId: string): Promise<any>;
  getCompletionRateByTime(platformId: string): Promise<any>;
  detectSuspiciousResponses(platformId: string): Promise<IVotingResponse[]>;
  createResponseHash(userId: string, platformId: string, sessionId?: string): string;
}

const VotingResponseSchema = new Schema<IVotingResponse>(
  {
    // Ownership
    platformId: {
      type: Schema.Types.ObjectId,
      ref: 'VotingPlatform',
      required: [true, 'Platform ID is required'],
      index: true
    },

    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },

    // Response identification
    responseHash: {
      type: String,
      required: [true, 'Response hash is required'],
      unique: true,
      index: true
    },

    sessionId: {
      type: String,
      trim: true,
      index: true
    },

    fingerprint: {
      type: String,
      trim: true,
      index: true
    },

    // Answers
    answers: [{
      questionId: {
        type: Schema.Types.ObjectId,
        ref: 'VotingQuestion',
        required: true,
        index: true
      },
      questionType: {
        type: String,
        required: true,
        enum: ['text', 'multiple_choice', 'image_selection', 'rating', 'textarea', 'yes_no', 'scale', 'ranking', 'date', 'file_upload']
      },
      value: {
        type: Schema.Types.Mixed,
        required: true
      },
      textValue: {
        type: String,
        trim: true,
        maxlength: [10000, 'Text value cannot exceed 10000 characters']
      },
      choiceValues: [{
        type: String,
        trim: true
      }],
      numericValue: {
        type: Number
      },
      dateValue: {
        type: Date
      },
      fileUrls: [{
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return /^https?:\/\/.+/.test(v);
          },
          message: 'File URL must be valid'
        }
      }],
      metadata: {
        timeToAnswer: {
          type: Number,
          min: [0, 'Time to answer cannot be negative']
        },
        skipped: {
          type: Boolean,
          default: false
        },
        otherText: {
          type: String,
          trim: true,
          maxlength: [500, 'Other text cannot exceed 500 characters']
        }
      }
    }],

    // Completion tracking
    isComplete: {
      type: Boolean,
      default: false,
      index: true
    },

    completionPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Completion percentage cannot be negative'],
      max: [100, 'Completion percentage cannot exceed 100']
    },

    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },

    completedAt: {
      type: Date,
      index: true
    },

    timeToComplete: {
      type: Number,
      min: [0, 'Time to complete cannot be negative']
    },

    // User context
    userContext: {
      ipAddress: {
        type: String,
        trim: true,
        match: [/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[a-fA-F0-9:]+)$/, 'Invalid IP address format']
      },
      userAgent: {
        type: String,
        trim: true,
        maxlength: [500, 'User agent cannot exceed 500 characters']
      },
      deviceType: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet']
      },
      browser: {
        type: String,
        trim: true
      },
      operatingSystem: {
        type: String,
        trim: true
      },
      screenResolution: {
        type: String,
        trim: true
      },
      language: {
        type: String,
        trim: true
      },
      timezone: {
        type: String,
        trim: true
      }
    },

    // Location
    location: {
      country: {
        type: String,
        trim: true,
        maxlength: [100, 'Country cannot exceed 100 characters']
      },
      region: {
        type: String,
        trim: true,
        maxlength: [100, 'Region cannot exceed 100 characters']
      },
      city: {
        type: String,
        trim: true,
        maxlength: [100, 'City cannot exceed 100 characters']
      },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          validate: {
            validator: function(v: number[]) {
              return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
            },
            message: 'Invalid coordinates format'
          }
        }
      }
    },

    // Referral data
    referralData: {
      source: {
        type: String,
        trim: true,
        maxlength: [100, 'Source cannot exceed 100 characters']
      },
      medium: {
        type: String,
        trim: true,
        maxlength: [100, 'Medium cannot exceed 100 characters']
      },
      campaign: {
        type: String,
        trim: true,
        maxlength: [100, 'Campaign cannot exceed 100 characters']
      },
      referrerUrl: {
        type: String,
        trim: true,
        maxlength: [500, 'Referrer URL cannot exceed 500 characters']
      },
      utmParams: {
        utm_source: { type: String, trim: true },
        utm_medium: { type: String, trim: true },
        utm_campaign: { type: String, trim: true },
        utm_term: { type: String, trim: true },
        utm_content: { type: String, trim: true }
      }
    },

    // Quality metrics
    qualityMetrics: {
      isValid: {
        type: Boolean,
        default: true
      },
      isSuspicious: {
        type: Boolean,
        default: false,
        index: true
      },
      suspiciousReasons: [{
        type: String,
        trim: true
      }],
      validationScore: {
        type: Number,
        default: 100,
        min: [0, 'Validation score cannot be negative'],
        max: [100, 'Validation score cannot exceed 100']
      },
      hasDuplicateAnswers: {
        type: Boolean,
        default: false
      },
      completionSpeed: {
        type: String,
        enum: ['too_fast', 'normal', 'slow'],
        default: 'normal'
      }
    },

    // Status
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned', 'flagged', 'deleted'],
      default: 'in_progress',
      index: true
    },

    isAnonymous: {
      type: Boolean,
      default: false,
      index: true
    },

    isFlagged: {
      type: Boolean,
      default: false,
      index: true
    },

    flaggedReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Flagged reason cannot exceed 500 characters']
    },

    reviewedAt: {
      type: Date
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Business'
    },

    // Email verification
    emailVerification: {
      email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
      },
      isVerified: {
        type: Boolean,
        default: false
      },
      verificationCode: {
        type: String,
        trim: true,
        select: false
      },
      verificationSentAt: {
        type: Date
      },
      verifiedAt: {
        type: Date
      }
    },

    // Edit history
    editHistory: [{
      editedAt: {
        type: Date,
        default: Date.now
      },
      editedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      changes: {
        type: String,
        maxlength: [5000, 'Changes description cannot exceed 5000 characters']
      }
    }]
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        delete ret.emailVerification?.verificationCode;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// ====================
// INDEXES FOR PERFORMANCE
// ====================

VotingResponseSchema.index({ platformId: 1, status: 1 });
VotingResponseSchema.index({ platformId: 1, isComplete: 1 });
VotingResponseSchema.index({ userId: 1, platformId: 1 });
VotingResponseSchema.index({ businessId: 1, createdAt: -1 });
VotingResponseSchema.index({ responseHash: 1 }, { unique: true });
VotingResponseSchema.index({ sessionId: 1, platformId: 1 });
VotingResponseSchema.index({ fingerprint: 1, platformId: 1 });
VotingResponseSchema.index({ 'emailVerification.email': 1, platformId: 1 });
VotingResponseSchema.index({ startedAt: -1 });
VotingResponseSchema.index({ completedAt: -1 });
VotingResponseSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial index

// Compound indexes
VotingResponseSchema.index({ platformId: 1, isComplete: 1, createdAt: -1 });
VotingResponseSchema.index({ businessId: 1, status: 1, createdAt: -1 });
VotingResponseSchema.index({ platformId: 1, 'qualityMetrics.isSuspicious': 1 });
VotingResponseSchema.index({ platformId: 1, isFlagged: 1 });

// ====================
// VIRTUAL PROPERTIES
// ====================

VotingResponseSchema.virtual('totalAnswers').get(function() {
  return this.answers.length;
});

VotingResponseSchema.virtual('duration').get(function() {
  if (this.completedAt) {
    return Math.floor((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);
  }
  return Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
});

// ====================
// INSTANCE METHODS
// ====================

VotingResponseSchema.methods.calculateCompletionPercentage = function(): number {
  // This would need the total questions from the platform
  // For now, return the stored value
  return this.completionPercentage;
};

VotingResponseSchema.methods.markComplete = function(): Promise<IVotingResponse> {
  this.isComplete = true;
  this.status = 'completed';
  this.completedAt = new Date();
  this.completionPercentage = 100;
  this.timeToComplete = Math.floor((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);

  // Calculate quality score
  this.qualityMetrics.validationScore = this.calculateQualityScore();

  return this.save();
};

VotingResponseSchema.methods.flagAsSuspicious = function(reason: string): Promise<IVotingResponse> {
  this.qualityMetrics.isSuspicious = true;
  this.isFlagged = true;
  this.status = 'flagged';
  this.flaggedReason = reason;

  if (!this.qualityMetrics.suspiciousReasons) {
    this.qualityMetrics.suspiciousReasons = [];
  }
  this.qualityMetrics.suspiciousReasons.push(reason);

  return this.save();
};

VotingResponseSchema.methods.addAnswer = function(answer: IVotingResponse['answers'][0]): Promise<IVotingResponse> {
  // Remove existing answer for this question if present
  this.answers = this.answers.filter(
    a => a.questionId.toString() !== answer.questionId.toString()
  );

  // Add new answer
  this.answers.push(answer);

  return this.save();
};

VotingResponseSchema.methods.updateAnswer = function(questionId: string, value: any): Promise<IVotingResponse> {
  const answer = this.answers.find(
    a => a.questionId.toString() === questionId
  );

  if (answer) {
    answer.value = value;

    // Update type-specific fields based on question type
    switch (answer.questionType) {
      case 'text':
      case 'textarea':
        answer.textValue = value;
        break;
      case 'multiple_choice':
      case 'image_selection':
        answer.choiceValues = Array.isArray(value) ? value : [value];
        break;
      case 'rating':
      case 'scale':
        answer.numericValue = Number(value);
        break;
      case 'date':
        answer.dateValue = new Date(value);
        break;
    }
  }

  return this.save();
};

VotingResponseSchema.methods.getAnswer = function(questionId: string): any {
  const answer = this.answers.find(
    a => a.questionId.toString() === questionId
  );
  return answer ? answer.value : null;
};

VotingResponseSchema.methods.calculateQualityScore = function(): number {
  let score = 100;

  // Deduct points for suspicious indicators
  if (this.qualityMetrics.isSuspicious) {
    score -= 30;
  }

  if (this.qualityMetrics.hasDuplicateAnswers) {
    score -= 20;
  }

  if (this.qualityMetrics.completionSpeed === 'too_fast') {
    score -= 25;
  }

  // Deduct points if incomplete
  if (!this.isComplete) {
    score -= 15;
  }

  // Deduct points for missing context
  if (!this.userContext.ipAddress) {
    score -= 5;
  }

  if (!this.userContext.userAgent) {
    score -= 5;
  }

  return Math.max(0, score);
};

VotingResponseSchema.methods.generateFingerprint = function(): string {
  const data = [
    this.userContext.ipAddress,
    this.userContext.userAgent,
    this.userContext.screenResolution,
    this.userContext.timezone,
    this.userContext.language
  ].filter(Boolean).join('|');

  return crypto.createHash('sha256').update(data).digest('hex');
};

// ====================
// STATIC METHODS
// ====================

VotingResponseSchema.statics.findByPlatform = function(platformId: string) {
  return this.find({ platformId }).sort({ createdAt: -1 });
};

VotingResponseSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

VotingResponseSchema.statics.findCompletedResponses = function(platformId: string) {
  return this.find({
    platformId,
    isComplete: true,
    status: 'completed'
  }).sort({ completedAt: -1 });
};

VotingResponseSchema.statics.checkDuplicate = function(userId: string, platformId: string): Promise<IVotingResponse | null> {
  const Model = this as IVotingResponseModel;
  const hash = Model.createResponseHash(userId, platformId);
  return Model.findOne({ responseHash: hash, isComplete: true }).exec();
};

VotingResponseSchema.statics.getResponseStats = function(platformId: string) {
  return this.aggregate([
    { $match: { platformId: new Types.ObjectId(platformId) } },
    {
      $group: {
        _id: null,
        totalResponses: { $sum: 1 },
        completedResponses: {
          $sum: { $cond: ['$isComplete', 1, 0] }
        },
        inProgressResponses: {
          $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
        },
        abandonedResponses: {
          $sum: { $cond: [{ $eq: ['$status', 'abandoned'] }, 1, 0] }
        },
        flaggedResponses: {
          $sum: { $cond: ['$isFlagged', 1, 0] }
        },
        anonymousResponses: {
          $sum: { $cond: ['$isAnonymous', 1, 0] }
        },
        averageCompletionTime: {
          $avg: '$timeToComplete'
        },
        averageQualityScore: {
          $avg: '$qualityMetrics.validationScore'
        },
        deviceBreakdown: {
          $push: '$userContext.deviceType'
        },
        completionRateByDay: {
          $push: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
            completed: '$isComplete'
          }
        }
      }
    }
  ]);
};

VotingResponseSchema.statics.getCompletionRateByTime = function(platformId: string) {
  return this.aggregate([
    { $match: { platformId: new Types.ObjectId(platformId), isComplete: true } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$completedAt' }
        },
        count: { $sum: 1 },
        avgTime: { $avg: '$timeToComplete' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

VotingResponseSchema.statics.detectSuspiciousResponses = function(platformId: string) {
  return this.find({
    platformId,
    $or: [
      { 'qualityMetrics.isSuspicious': true },
      { 'qualityMetrics.validationScore': { $lt: 50 } },
      { 'qualityMetrics.completionSpeed': 'too_fast' }
    ]
  }).sort({ 'qualityMetrics.validationScore': 1 });
};

VotingResponseSchema.statics.createResponseHash = function(
  userId: string,
  platformId: string,
  sessionId?: string
): string {
  const data = `${userId || sessionId}:${platformId}:${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// ====================
// PRE-SAVE MIDDLEWARE
// ====================

VotingResponseSchema.pre('save', function(next) {
  // Generate fingerprint if context is available
  if (!this.fingerprint && this.userContext.ipAddress) {
    this.fingerprint = this.generateFingerprint();
  }

  // Auto-detect completion speed
  if (this.isComplete && this.timeToComplete) {
    if (this.timeToComplete < 30) { // Less than 30 seconds
      this.qualityMetrics.completionSpeed = 'too_fast';
    } else if (this.timeToComplete > 1800) { // More than 30 minutes
      this.qualityMetrics.completionSpeed = 'slow';
    } else {
      this.qualityMetrics.completionSpeed = 'normal';
    }
  }

  // Check for duplicate answers (all answers are the same)
  if (this.answers.length > 3) {
    const uniqueValues = new Set(this.answers.map(a => JSON.stringify(a.value)));
    if (uniqueValues.size === 1) {
      this.qualityMetrics.hasDuplicateAnswers = true;
    }
  }

  next();
});

// Check if model already exists to avoid "Cannot overwrite model" error
export const VotingResponse = (models.VotingResponse as IVotingResponseModel) ||
  model<IVotingResponse, IVotingResponseModel>('VotingResponse', VotingResponseSchema);
