// src/models/platform/votingQuestion.model.ts
import mongoose, { Schema, model, Document, Types, Model, models } from 'mongoose';

export interface IVotingQuestion extends Document {
  // Ownership
  platformId: Types.ObjectId;
  businessId: Types.ObjectId;

  // Question details
  questionText: string;
  questionType: 'text' | 'multiple_choice' | 'image_selection' | 'rating' | 'textarea' | 'yes_no' | 'scale' | 'ranking' | 'date' | 'file_upload';
  description?: string;
  helpText?: string;

  // Ordering and visibility
  order: number;
  isRequired: boolean;
  isActive: boolean;

  // Type-specific configurations
  textConfig?: {
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
    validationRegex?: string;
    inputType: 'text' | 'email' | 'url' | 'number' | 'tel';
  };

  textareaConfig?: {
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
    rows?: number;
  };

  multipleChoiceConfig?: {
    options: Array<{
      id: string;
      text: string;
      imageUrl?: string;
      order: number;
    }>;
    allowMultipleSelection: boolean;
    minSelections?: number;
    maxSelections?: number;
    randomizeOrder: boolean;
    showOtherOption: boolean;
  };

  imageSelectionConfig?: {
    images: Array<{
      id: string;
      imageUrl: string;
      caption?: string;
      order: number;
    }>;
    allowMultipleSelection: boolean;
    minSelections?: number;
    maxSelections?: number;
    imageSize: 'small' | 'medium' | 'large';
    displayLayout: 'grid' | 'carousel' | 'list';
  };

  ratingConfig?: {
    ratingType: 'stars' | 'numeric' | 'emoji' | 'hearts';
    minValue: number;
    maxValue: number;
    step?: number;
    labels?: {
      min?: string;
      max?: string;
    };
  };

  scaleConfig?: {
    minValue: number;
    maxValue: number;
    step: number;
    minLabel?: string;
    maxLabel?: string;
    showValues: boolean;
  };

  rankingConfig?: {
    items: Array<{
      id: string;
      text: string;
      imageUrl?: string;
    }>;
    minRankings?: number;
    maxRankings?: number;
  };

  dateConfig?: {
    allowPastDates: boolean;
    allowFutureDates: boolean;
    minDate?: Date;
    maxDate?: Date;
    includeTime: boolean;
  };

  fileUploadConfig?: {
    allowedFileTypes: string[]; // ['image/png', 'image/jpeg', 'application/pdf']
    maxFileSize: number; // in bytes
    maxFiles: number;
  };

  // Product voting configuration (for blockchain product selection)
  productVotingConfig?: {
    enabled: boolean;                    // Is this a product voting question?
    products: Types.ObjectId[];          // Product IDs to vote on
    allowMultipleSelection: boolean;     // Can select multiple products?
    maxSelections?: number;              // Max products to select
    minSelections?: number;              // Min products required
    showProductDetails: boolean;         // Show full product info
    showProductImages: boolean;          // Show product images
    showProductPrices: boolean;          // Show product prices
    sortOrder: 'manual' | 'popular' | 'recent' | 'price-asc' | 'price-desc';
    displayStyle: 'grid' | 'list' | 'carousel';
  };

  // Conditional logic
  conditionalLogic?: {
    enabled: boolean;
    conditions: Array<{
      questionId: Types.ObjectId;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
      value: any;
    }>;
    action: 'show' | 'hide' | 'require' | 'skip';
  };

  // Validation rules
  validation: {
    required: boolean;
    customErrorMessage?: string;
  };

  // Analytics
  analytics: {
    totalResponses: number;
    totalSkips: number;
    averageTimeToAnswer: number; // in seconds
    responseDistribution?: Map<string, number>; // For choice-based questions
  };

  // Metadata
  imageUrl?: string; // Question image/illustration
  videoUrl?: string; // Question video
  metadata?: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  getResponseCount(): number;
  getSkipRate(): number;
  incrementResponse(): Promise<IVotingQuestion>;
  incrementSkip(): Promise<IVotingQuestion>;
  updateResponseDistribution(value: string): Promise<IVotingQuestion>;
}

// Static methods interface
export interface IVotingQuestionModel extends Model<IVotingQuestion> {
  findByPlatform(platformId: string): Promise<IVotingQuestion[]>;
  findActivePlatformQuestions(platformId: string): Promise<IVotingQuestion[]>;
  getQuestionStats(platformId: string): Promise<any>;
  reorderQuestions(platformId: string, questionIds: string[]): Promise<any>;
}

const VotingQuestionSchema = new Schema<IVotingQuestion>(
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

    // Question details
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      minlength: [3, 'Question text must be at least 3 characters'],
      maxlength: [1000, 'Question text cannot exceed 1000 characters']
    },

    questionType: {
      type: String,
      required: [true, 'Question type is required'],
      enum: ['text', 'multiple_choice', 'image_selection', 'rating', 'textarea', 'yes_no', 'scale', 'ranking', 'date', 'file_upload'],
      index: true
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },

    helpText: {
      type: String,
      trim: true,
      maxlength: [300, 'Help text cannot exceed 300 characters']
    },

    // Ordering (default to 0, pre-save hook will auto-increment for new questions)
    order: {
      type: Number,
      default: 0,
      min: [0, 'Order cannot be negative'],
      index: true
    },

    isRequired: {
      type: Boolean,
      default: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // Text configuration
    textConfig: {
      placeholder: {
        type: String,
        trim: true,
        maxlength: [100, 'Placeholder cannot exceed 100 characters']
      },
      minLength: {
        type: Number,
        min: [0, 'Min length cannot be negative']
      },
      maxLength: {
        type: Number,
        min: [1, 'Max length must be at least 1']
      },
      validationRegex: {
        type: String,
        trim: true
      },
      inputType: {
        type: String,
        enum: ['text', 'email', 'url', 'number', 'tel']
      }
    },

    // Textarea configuration
    textareaConfig: {
      placeholder: {
        type: String,
        trim: true,
        maxlength: [100, 'Placeholder cannot exceed 100 characters']
      },
      minLength: {
        type: Number,
        min: [0, 'Min length cannot be negative']
      },
      maxLength: {
        type: Number,
        min: [1, 'Max length must be at least 1'],
        max: [10000, 'Max length cannot exceed 10000 characters']
      },
      rows: {
        type: Number,
        min: [2, 'Rows must be at least 2'],
        max: [20, 'Rows cannot exceed 20']
      }
    },

    // Multiple choice configuration
    multipleChoiceConfig: {
      options: [{
        id: {
          type: String,
          required: true
        },
        text: {
          type: String,
          required: true,
          trim: true,
          maxlength: [200, 'Option text cannot exceed 200 characters']
        },
        imageUrl: {
          type: String,
          trim: true,
          validate: {
            validator: function(v: string) {
              return !v || /^https?:\/\/.+/.test(v);
            },
            message: 'Image URL must be valid'
          }
        },
        order: {
          type: Number,
          required: true,
          min: 0
        }
      }],
      allowMultipleSelection: {
        type: Boolean
      },
      minSelections: {
        type: Number,
        min: [0, 'Min selections cannot be negative']
      },
      maxSelections: {
        type: Number,
        min: [1, 'Max selections must be at least 1']
      },
      randomizeOrder: {
        type: Boolean
      },
      showOtherOption: {
        type: Boolean
      }
    },

    // Image selection configuration
    imageSelectionConfig: {
      images: [{
        id: {
          type: String,
          required: true
        },
        imageUrl: {
          type: String,
          required: true,
          trim: true,
          validate: {
            validator: function(v: string) {
              return /^https?:\/\/.+/.test(v);
            },
            message: 'Image URL must be valid'
          }
        },
        caption: {
          type: String,
          trim: true,
          maxlength: [100, 'Caption cannot exceed 100 characters']
        },
        order: {
          type: Number,
          required: true,
          min: 0
        }
      }],
      allowMultipleSelection: {
        type: Boolean
      },
      minSelections: {
        type: Number,
        min: [0, 'Min selections cannot be negative']
      },
      maxSelections: {
        type: Number,
        min: [1, 'Max selections must be at least 1']
      },
      imageSize: {
        type: String,
        enum: ['small', 'medium', 'large']
      },
      displayLayout: {
        type: String,
        enum: ['grid', 'carousel', 'list']
      }
    },

    // Rating configuration
    ratingConfig: {
      ratingType: {
        type: String,
        enum: ['stars', 'numeric', 'emoji', 'hearts']
      },
      minValue: {
        type: Number,
        min: [0, 'Min value cannot be negative']
      },
      maxValue: {
        type: Number,
        min: [1, 'Max value must be at least 1'],
        max: [10, 'Max value cannot exceed 10']
      },
      step: {
        type: Number,
        min: [0.1, 'Step must be at least 0.1']
      },
      labels: {
        min: {
          type: String,
          trim: true,
          maxlength: [50, 'Label cannot exceed 50 characters']
        },
        max: {
          type: String,
          trim: true,
          maxlength: [50, 'Label cannot exceed 50 characters']
        }
      }
    },

    // Scale configuration
    scaleConfig: {
      minValue: {
        type: Number,
        min: [0, 'Min value cannot be negative']
      },
      maxValue: {
        type: Number,
        min: [1, 'Max value must be at least 1']
      },
      step: {
        type: Number,
        min: [0.1, 'Step must be at least 0.1']
      },
      minLabel: {
        type: String,
        trim: true,
        maxlength: [50, 'Label cannot exceed 50 characters']
      },
      maxLabel: {
        type: String,
        trim: true,
        maxlength: [50, 'Label cannot exceed 50 characters']
      },
      showValues: {
        type: Boolean
      }
    },

    // Ranking configuration
    rankingConfig: {
      items: [{
        id: {
          type: String,
          required: true
        },
        text: {
          type: String,
          required: true,
          trim: true,
          maxlength: [200, 'Item text cannot exceed 200 characters']
        },
        imageUrl: {
          type: String,
          trim: true,
          validate: {
            validator: function(v: string) {
              return !v || /^https?:\/\/.+/.test(v);
            },
            message: 'Image URL must be valid'
          }
        }
      }],
      minRankings: {
        type: Number,
        min: [1, 'Min rankings must be at least 1']
      },
      maxRankings: {
        type: Number,
        min: [1, 'Max rankings must be at least 1']
      }
    },

    // Date configuration
    dateConfig: {
      allowPastDates: {
        type: Boolean
      },
      allowFutureDates: {
        type: Boolean
      },
      minDate: {
        type: Date
      },
      maxDate: {
        type: Date
      },
      includeTime: {
        type: Boolean
      }
    },

    // File upload configuration
    fileUploadConfig: {
      allowedFileTypes: [{
        type: String,
        trim: true
      }],
      maxFileSize: {
        type: Number,
        min: [1024, 'Max file size must be at least 1KB'],
        max: [104857600, 'Max file size cannot exceed 100MB']
      },
      maxFiles: {
        type: Number,
        min: [1, 'Max files must be at least 1'],
        max: [10, 'Max files cannot exceed 10']
      }
    },

    // Product voting configuration (for blockchain product selection)
    productVotingConfig: {
      enabled: {
        type: Boolean
      },
      products: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'
      }],
      allowMultipleSelection: {
        type: Boolean
      },
      maxSelections: {
        type: Number,
        min: [1, 'Max selections must be at least 1'],
        max: [50, 'Max selections cannot exceed 50']
      },
      minSelections: {
        type: Number,
        min: [1, 'Min selections must be at least 1']
      },
      showProductDetails: {
        type: Boolean
      },
      showProductImages: {
        type: Boolean
      },
      showProductPrices: {
        type: Boolean
      },
      sortOrder: {
        type: String,
        enum: ['manual', 'popular', 'recent', 'price-asc', 'price-desc']
      },
      displayStyle: {
        type: String,
        enum: ['grid', 'list', 'carousel']
      }
    },

    // Conditional logic
    conditionalLogic: {
      enabled: {
        type: Boolean,
        default: false
      },
      conditions: [{
        questionId: {
          type: Schema.Types.ObjectId,
          ref: 'VotingQuestion'
        },
        operator: {
          type: String,
          enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than']
        },
        value: Schema.Types.Mixed
      }],
      action: {
        type: String,
        enum: ['show', 'hide', 'require', 'skip'],
        default: 'show'
      }
    },

    // Validation
    validation: {
      required: {
        type: Boolean,
        default: true
      },
      customErrorMessage: {
        type: String,
        trim: true,
        maxlength: [200, 'Error message cannot exceed 200 characters']
      }
    },

    // Analytics
    analytics: {
      totalResponses: {
        type: Number,
        default: 0,
        min: [0, 'Total responses cannot be negative']
      },
      totalSkips: {
        type: Number,
        default: 0,
        min: [0, 'Total skips cannot be negative']
      },
      averageTimeToAnswer: {
        type: Number,
        default: 0,
        min: [0, 'Average time cannot be negative']
      },
      responseDistribution: {
        type: Map,
        of: Number,
        default: new Map()
      }
    },

    // Metadata
    imageUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Image URL must be valid'
      }
    },

    videoUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Video URL must be valid'
      }
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        // Convert Map to object for JSON serialization
        if (ret.analytics?.responseDistribution instanceof Map) {
          ret.analytics.responseDistribution = Object.fromEntries(ret.analytics.responseDistribution);
        }
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// ====================
// INDEXES FOR PERFORMANCE
// ====================

VotingQuestionSchema.index({ platformId: 1, order: 1 });
VotingQuestionSchema.index({ platformId: 1, isActive: 1, order: 1 });
VotingQuestionSchema.index({ businessId: 1 });
VotingQuestionSchema.index({ questionType: 1 });
VotingQuestionSchema.index({ createdAt: -1 });

// Compound indexes
VotingQuestionSchema.index({ platformId: 1, isActive: 1, isRequired: 1 });

// Product voting index for blockchain integration queries
VotingQuestionSchema.index({ platformId: 1, 'productVotingConfig.enabled': 1 });

// ====================
// VIRTUAL PROPERTIES
// ====================

VotingQuestionSchema.virtual('responseRate').get(function() {
  if (!this.analytics) return 0;
  const total = (this.analytics.totalResponses || 0) + (this.analytics.totalSkips || 0);
  if (total === 0) return 0;
  return ((this.analytics.totalResponses || 0) / total) * 100;
});

VotingQuestionSchema.virtual('skipRate').get(function() {
  if (!this.analytics) return 0;
  const total = (this.analytics.totalResponses || 0) + (this.analytics.totalSkips || 0);
  if (total === 0) return 0;
  return ((this.analytics.totalSkips || 0) / total) * 100;
});

// ====================
// INSTANCE METHODS
// ====================

VotingQuestionSchema.methods.getResponseCount = function(): number {
  return this.analytics.totalResponses;
};

VotingQuestionSchema.methods.getSkipRate = function(): number {
  const total = this.analytics.totalResponses + this.analytics.totalSkips;
  if (total === 0) return 0;
  return (this.analytics.totalSkips / total) * 100;
};

VotingQuestionSchema.methods.incrementResponse = function(): Promise<IVotingQuestion> {
  return this.updateOne({
    $inc: { 'analytics.totalResponses': 1 }
  });
};

VotingQuestionSchema.methods.incrementSkip = function(): Promise<IVotingQuestion> {
  return this.updateOne({
    $inc: { 'analytics.totalSkips': 1 }
  });
};

VotingQuestionSchema.methods.updateResponseDistribution = function(value: string): Promise<IVotingQuestion> {
  const key = `analytics.responseDistribution.${value}`;
  return this.updateOne({
    $inc: { [key]: 1 }
  });
};

// ====================
// STATIC METHODS
// ====================

VotingQuestionSchema.statics.findByPlatform = function(platformId: string) {
  return this.find({ platformId }).sort({ order: 1 });
};

VotingQuestionSchema.statics.findActivePlatformQuestions = function(platformId: string) {
  return this.find({
    platformId,
    isActive: true
  }).sort({ order: 1 });
};

VotingQuestionSchema.statics.getQuestionStats = function(platformId: string) {
  return this.aggregate([
    { $match: { platformId: new Types.ObjectId(platformId) } },
    {
      $group: {
        _id: null,
        totalQuestions: { $sum: 1 },
        activeQuestions: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        requiredQuestions: {
          $sum: { $cond: ['$isRequired', 1, 0] }
        },
        totalResponses: { $sum: '$analytics.totalResponses' },
        totalSkips: { $sum: '$analytics.totalSkips' },
        averageResponseTime: { $avg: '$analytics.averageTimeToAnswer' },
        questionTypes: {
          $push: '$questionType'
        }
      }
    },
    {
      $project: {
        totalQuestions: 1,
        activeQuestions: 1,
        requiredQuestions: 1,
        totalResponses: 1,
        totalSkips: 1,
        averageResponseTime: 1,
        questionTypeCounts: {
          $reduce: {
            input: '$questionTypes',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $literal: {
                    '$$this': {
                      $add: [
                        { $ifNull: [{ $getField: { field: '$$this', input: '$$value' } }, 0] },
                        1
                      ]
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  ]);
};

VotingQuestionSchema.statics.reorderQuestions = function(platformId: string, questionIds: string[]) {
  const bulkOps = questionIds.map((questionId, index) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(questionId), platformId: new Types.ObjectId(platformId) },
      update: { $set: { order: index } }
    }
  }));

  return this.bulkWrite(bulkOps);
};

// ====================
// PRE-SAVE MIDDLEWARE
// ====================

VotingQuestionSchema.pre('save', async function(next) {
  // Auto-assign order if new question and order not explicitly set
  if (this.isNew && (this.order === undefined || this.order === null || this.order === 0)) {
    // Use this.constructor to get the model in pre-save hooks
    const VotingQuestionModel = this.constructor as Model<IVotingQuestion>;
    const maxOrder = await VotingQuestionModel
      .findOne({ platformId: this.platformId })
      .sort({ order: -1 })
      .select('order')
      .lean();

    this.order = maxOrder && maxOrder.order !== undefined ? maxOrder.order + 1 : 0;
  }

  // Apply defaults for nested config objects
  // Mongoose doesn't apply defaults to nested objects if the parent object is defined
  if (this.ratingConfig) {
    this.ratingConfig.ratingType = this.ratingConfig.ratingType || 'stars';
    this.ratingConfig.minValue = this.ratingConfig.minValue !== undefined ? this.ratingConfig.minValue : 1;
    this.ratingConfig.maxValue = this.ratingConfig.maxValue !== undefined ? this.ratingConfig.maxValue : 5;
    this.ratingConfig.step = this.ratingConfig.step !== undefined ? this.ratingConfig.step : 1;
  }

  if (this.textareaConfig) {
    this.textareaConfig.rows = this.textareaConfig.rows !== undefined ? this.textareaConfig.rows : 4;
  }

  if (this.textConfig) {
    this.textConfig.inputType = this.textConfig.inputType || 'text';
  }

  if (this.scaleConfig) {
    this.scaleConfig.minValue = this.scaleConfig.minValue !== undefined ? this.scaleConfig.minValue : 1;
    this.scaleConfig.maxValue = this.scaleConfig.maxValue !== undefined ? this.scaleConfig.maxValue : 10;
    this.scaleConfig.step = this.scaleConfig.step !== undefined ? this.scaleConfig.step : 1;
    this.scaleConfig.showValues = this.scaleConfig.showValues !== undefined ? this.scaleConfig.showValues : true;
  }

  if (this.multipleChoiceConfig) {
    this.multipleChoiceConfig.allowMultipleSelection = this.multipleChoiceConfig.allowMultipleSelection !== undefined ? this.multipleChoiceConfig.allowMultipleSelection : false;
    this.multipleChoiceConfig.randomizeOrder = this.multipleChoiceConfig.randomizeOrder !== undefined ? this.multipleChoiceConfig.randomizeOrder : false;
    this.multipleChoiceConfig.showOtherOption = this.multipleChoiceConfig.showOtherOption !== undefined ? this.multipleChoiceConfig.showOtherOption : false;
  }

  if (this.imageSelectionConfig) {
    this.imageSelectionConfig.allowMultipleSelection = this.imageSelectionConfig.allowMultipleSelection !== undefined ? this.imageSelectionConfig.allowMultipleSelection : false;
    this.imageSelectionConfig.imageSize = this.imageSelectionConfig.imageSize || 'medium';
    this.imageSelectionConfig.displayLayout = this.imageSelectionConfig.displayLayout || 'grid';
  }

  if (this.fileUploadConfig) {
    this.fileUploadConfig.maxFileSize = this.fileUploadConfig.maxFileSize !== undefined ? this.fileUploadConfig.maxFileSize : 5242880; // 5MB
    this.fileUploadConfig.maxFiles = this.fileUploadConfig.maxFiles !== undefined ? this.fileUploadConfig.maxFiles : 1;
  }

  if (this.dateConfig) {
    this.dateConfig.allowPastDates = this.dateConfig.allowPastDates !== undefined ? this.dateConfig.allowPastDates : true;
    this.dateConfig.allowFutureDates = this.dateConfig.allowFutureDates !== undefined ? this.dateConfig.allowFutureDates : true;
    this.dateConfig.includeTime = this.dateConfig.includeTime !== undefined ? this.dateConfig.includeTime : false;
  }

  if (this.productVotingConfig) {
    this.productVotingConfig.enabled = this.productVotingConfig.enabled !== undefined ? this.productVotingConfig.enabled : false;
    this.productVotingConfig.allowMultipleSelection = this.productVotingConfig.allowMultipleSelection !== undefined ? this.productVotingConfig.allowMultipleSelection : false;
    this.productVotingConfig.minSelections = this.productVotingConfig.minSelections !== undefined ? this.productVotingConfig.minSelections : 1;
    this.productVotingConfig.showProductDetails = this.productVotingConfig.showProductDetails !== undefined ? this.productVotingConfig.showProductDetails : true;
    this.productVotingConfig.showProductImages = this.productVotingConfig.showProductImages !== undefined ? this.productVotingConfig.showProductImages : true;
    this.productVotingConfig.showProductPrices = this.productVotingConfig.showProductPrices !== undefined ? this.productVotingConfig.showProductPrices : false;
    this.productVotingConfig.sortOrder = this.productVotingConfig.sortOrder || 'manual';
    this.productVotingConfig.displayStyle = this.productVotingConfig.displayStyle || 'grid';
  }

  next();
});

// Check if model already exists to avoid "Cannot overwrite model" error
export const VotingQuestion = (models.VotingQuestion as IVotingQuestionModel) ||
  model<IVotingQuestion, IVotingQuestionModel>('VotingQuestion', VotingQuestionSchema);
