// src/models/collaboration/taskThread.model.ts
import { Schema, model, Document, Types, Model } from 'mongoose';

/**
 * Checklist Item Interface
 */
export interface IChecklistItem {
  text: string;
  completed: boolean;
  completedBy?: Types.ObjectId;
  completedAt?: Date;
}

/**
 * Comment Reaction Interface
 */
export interface ICommentReaction {
  emoji: string; // e.g., '👍', '❤️', '🎉'
  userId: Types.ObjectId;
  createdAt: Date;
}

/**
 * Thread Comment Interface
 */
export interface IThreadComment {
  userId: Types.ObjectId;
  userType: 'brand' | 'manufacturer';
  message: string;
  reactions: ICommentReaction[];
  createdAt: Date;
  updatedAt?: Date;
  editedAt?: Date;
}

/**
 * Thread Participant Interface
 */
export interface IThreadParticipant {
  userId: Types.ObjectId;
  userType: 'brand' | 'manufacturer';
  role: 'owner' | 'assignee' | 'viewer' | 'commenter';
  addedAt: Date;
  lastViewedAt?: Date;
}

/**
 * Related Entity Reference Interface
 */
export interface IRelatedEntity {
  entityType: 'file' | 'update' | 'workspace' | 'task';
  entityId: Types.ObjectId;
  addedAt: Date;
  addedBy: Types.ObjectId;
}

/**
 * Task Details Interface
 */
export interface ITaskDetails {
  assignees: Types.ObjectId[]; // User IDs assigned to task
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked' | 'cancelled';
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  blockedReason?: string;
  estimatedHours?: number;
  actualHours?: number;
  checklist: IChecklistItem[];
  tags: string[];
}

/**
 * Task Thread Document Interface
 * Represents discussion threads and task management within workspaces
 */
export interface ITaskThread extends Document {
  // Relationships
  workspaceId: Types.ObjectId; // Reference to Workspace
  createdBy: Types.ObjectId; // User who created the thread

  // Thread Identification
  threadType: 'task' | 'discussion' | 'approval' | 'question';
  title: string;
  description?: string;

  // Task-Specific Details (if threadType === 'task')
  taskDetails?: ITaskDetails;

  // Participants & Access
  participants: IThreadParticipant[];

  // Comments & Discussion
  comments: IThreadComment[];

  // Related Entities
  relatedEntities: IRelatedEntity[];

  // Thread Status
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  isPinned: boolean;
  isLocked: boolean; // Prevents further comments

  // Visibility & Notifications
  visibleToBrand: boolean;
  visibleToManufacturer: boolean;
  notifyOnNewComment: Types.ObjectId[]; // User IDs to notify

  // Activity Tracking
  lastActivityAt: Date;
  commentCount: number;
  viewCount: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  archivedBy?: Types.ObjectId;

  // Instance methods
  isParticipant(userId: string): boolean;
  addComment(userId: string, userType: 'brand' | 'manufacturer', message: string): Promise<ITaskThread>;
  addParticipant(userId: string, userType: 'brand' | 'manufacturer', role?: 'owner' | 'assignee' | 'viewer' | 'commenter'): Promise<ITaskThread>;
  resolve(userId: string): Promise<ITaskThread>;
  updateTaskStatus(status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked' | 'cancelled', userId?: string): Promise<ITaskThread>;
  toggleChecklistItem(itemId: string, userId: string): Promise<ITaskThread>;
  recordView(userId: string): Promise<ITaskThread>;
}

/**
 * Task Thread Static Methods Interface
 */
export interface ITaskThreadModel extends Model<ITaskThread> {
  findByWorkspace(workspaceId: string, options?: any): Promise<ITaskThread[]>;
  findUserTasks(userId: string, status?: string): Promise<ITaskThread[]>;
  findUnresolvedThreads(workspaceId: string): Promise<ITaskThread[]>;
  getThreadStats(workspaceId: string): Promise<any>;
  findOverdueTasks(workspaceId?: string): Promise<ITaskThread[]>;
}

/**
 * Checklist Item Schema
 */
const ChecklistItemSchema = new Schema<IChecklistItem>({
  text: {
    type: String,
    required: true,
    maxlength: 500
  },
  completed: {
    type: Boolean,
    required: true,
    default: false
  },
  completedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: {
    type: Date
  }
}, { _id: true }); // Keep _id for individual items

/**
 * Comment Reaction Schema
 */
const CommentReactionSchema = new Schema<ICommentReaction>({
  emoji: {
    type: String,
    required: true,
    maxlength: 10
  },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { _id: false });

/**
 * Thread Comment Schema
 */
const ThreadCommentSchema = new Schema<IThreadComment>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  userType: {
    type: String,
    enum: ['brand', 'manufacturer'],
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 5000
  },
  reactions: {
    type: [CommentReactionSchema],
    default: []
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  editedAt: {
    type: Date
  }
}, { _id: true }); // Keep _id for comments to allow deletion/editing

/**
 * Thread Participant Schema
 */
const ThreadParticipantSchema = new Schema<IThreadParticipant>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  userType: {
    type: String,
    enum: ['brand', 'manufacturer'],
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'assignee', 'viewer', 'commenter'],
    required: true,
    default: 'commenter'
  },
  addedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  lastViewedAt: {
    type: Date
  }
}, { _id: false });

/**
 * Related Entity Schema
 */
const RelatedEntitySchema = new Schema<IRelatedEntity>({
  entityType: {
    type: String,
    enum: ['file', 'update', 'workspace', 'task'],
    required: true
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  addedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  addedBy: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  }
}, { _id: false });

/**
 * Task Details Schema
 */
const TaskDetailsSchema = new Schema<ITaskDetails>({
  assignees: {
    type: [Schema.Types.ObjectId],
    default: [],
    ref: 'User'
  },
  dueDate: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'completed', 'blocked', 'cancelled'],
    required: true,
    default: 'todo'
  },
  completedAt: {
    type: Date
  },
  completedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  blockedReason: {
    type: String,
    maxlength: 1000
  },
  estimatedHours: {
    type: Number,
    min: 0,
    max: 1000
  },
  actualHours: {
    type: Number,
    min: 0,
    max: 1000
  },
  checklist: {
    type: [ChecklistItemSchema],
    default: []
  },
  tags: {
    type: [String],
    default: []
  }
}, { _id: false });

/**
 * Main Task Thread Schema
 */
const TaskThreadSchema = new Schema<ITaskThread>(
  {
    // Relationships
    workspaceId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Workspace ID is required'],
      ref: 'Workspace',
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: [true, 'Creator ID is required'],
      ref: 'User'
    },

    // Thread Identification
    threadType: {
      type: String,
      enum: {
        values: ['task', 'discussion', 'approval', 'question'],
        message: 'Thread type must be task, discussion, approval, or question'
      },
      required: [true, 'Thread type is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Thread title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },

    // Task-Specific Details
    taskDetails: {
      type: TaskDetailsSchema,
      default: undefined
    },

    // Participants & Access
    participants: {
      type: [ThreadParticipantSchema],
      default: []
    },

    // Comments & Discussion
    comments: {
      type: [ThreadCommentSchema],
      default: []
    },

    // Related Entities
    relatedEntities: {
      type: [RelatedEntitySchema],
      default: []
    },

    // Thread Status
    isResolved: {
      type: Boolean,
      required: true,
      default: false,
      index: true
    },
    resolvedAt: {
      type: Date
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    isPinned: {
      type: Boolean,
      required: true,
      default: false
    },
    isLocked: {
      type: Boolean,
      required: true,
      default: false
    },

    // Visibility & Notifications
    visibleToBrand: {
      type: Boolean,
      required: true,
      default: true
    },
    visibleToManufacturer: {
      type: Boolean,
      required: true,
      default: true
    },
    notifyOnNewComment: {
      type: [Schema.Types.ObjectId],
      default: [],
      ref: 'User'
    },

    // Activity Tracking
    lastActivityAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },

    // Metadata
    archivedAt: {
      type: Date
    },
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
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
// INDEXES FOR MONGODB ATLAS PERFORMANCE
// ====================

// Composite index for workspace thread queries
TaskThreadSchema.index({ workspaceId: 1, lastActivityAt: -1 });

// Index for finding threads by type and status
TaskThreadSchema.index({ workspaceId: 1, threadType: 1, isResolved: 1 });

// Index for task queries by status
TaskThreadSchema.index({
  threadType: 1,
  'taskDetails.status': 1,
  'taskDetails.dueDate': 1
}, { sparse: true });

// Index for finding user's assigned tasks
TaskThreadSchema.index({ 'taskDetails.assignees': 1 });

// Index for participant queries
TaskThreadSchema.index({ 'participants.userId': 1 });

// Index for finding pinned threads
TaskThreadSchema.index({ workspaceId: 1, isPinned: 1, lastActivityAt: -1 });

// Index for overdue tasks
TaskThreadSchema.index({
  threadType: 1,
  'taskDetails.status': 1,
  'taskDetails.dueDate': 1
}, { sparse: true });

// Index for archived threads
TaskThreadSchema.index({ archivedAt: 1 }, { sparse: true });

// Text index for search functionality
TaskThreadSchema.index({ title: 'text', description: 'text' });

// Compound index for unresolved threads
TaskThreadSchema.index({ workspaceId: 1, isResolved: 1, lastActivityAt: -1 });

// ====================
// VIRTUAL PROPERTIES
// ====================

// Virtual for checking if thread is active
TaskThreadSchema.virtual('isActive').get(function() {
  return !this.isResolved && !this.archivedAt;
});

// Virtual for checking if task is overdue
TaskThreadSchema.virtual('isOverdue').get(function() {
  if (this.threadType !== 'task' || !this.taskDetails?.dueDate) {
    return false;
  }
  const now = new Date();
  return this.taskDetails.dueDate < now &&
         !['completed', 'cancelled'].includes(this.taskDetails.status);
});

// Virtual for task completion percentage
TaskThreadSchema.virtual('taskCompletionPercentage').get(function() {
  if (this.threadType !== 'task' || !this.taskDetails?.checklist.length) {
    return 0;
  }
  const completed = this.taskDetails.checklist.filter(item => item.completed).length;
  return Math.round((completed / this.taskDetails.checklist.length) * 100);
});

// Virtual for unread status per user (requires userId parameter in usage)
TaskThreadSchema.virtual('hasUnreadComments').get(function() {
  // This is a placeholder - actual implementation would compare lastViewedAt
  // with lastActivityAt for a specific user
  return false;
});

// ====================
// INSTANCE METHODS
// ====================

// Check if user is a participant
TaskThreadSchema.methods.isParticipant = function(userId: string): boolean {
  const userIdStr = userId.toString();
  return this.participants.some(
    (p: IThreadParticipant) => p.userId.toString() === userIdStr
  );
};

// Add a comment
TaskThreadSchema.methods.addComment = function(
  userId: string,
  userType: 'brand' | 'manufacturer',
  message: string
): Promise<ITaskThread> {
  this.comments.push({
    userId: new Types.ObjectId(userId),
    userType,
    message,
    reactions: [],
    createdAt: new Date()
  } as IThreadComment);

  this.commentCount += 1;
  this.lastActivityAt = new Date();

  return this.save();
};

// Add a participant
TaskThreadSchema.methods.addParticipant = function(
  userId: string,
  userType: 'brand' | 'manufacturer',
  role: 'owner' | 'assignee' | 'viewer' | 'commenter' = 'commenter'
): Promise<ITaskThread> {
  if (!this.isParticipant(userId)) {
    this.participants.push({
      userId: new Types.ObjectId(userId),
      userType,
      role,
      addedAt: new Date()
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Mark as resolved
TaskThreadSchema.methods.resolve = function(
  userId: string
): Promise<ITaskThread> {
  this.isResolved = true;
  this.resolvedAt = new Date();
  this.resolvedBy = new Types.ObjectId(userId);
  return this.save();
};

// Update task status
TaskThreadSchema.methods.updateTaskStatus = function(
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked' | 'cancelled',
  userId?: string
): Promise<ITaskThread> {
  if (this.threadType === 'task' && this.taskDetails) {
    this.taskDetails.status = status;

    if (status === 'completed' && userId) {
      this.taskDetails.completedAt = new Date();
      this.taskDetails.completedBy = new Types.ObjectId(userId);
      this.isResolved = true;
      this.resolvedAt = new Date();
      this.resolvedBy = new Types.ObjectId(userId);
    }

    this.lastActivityAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Toggle checklist item
TaskThreadSchema.methods.toggleChecklistItem = function(
  itemId: string,
  userId: string
): Promise<ITaskThread> {
  if (this.threadType === 'task' && this.taskDetails) {
    const item = this.taskDetails.checklist.id(itemId);
    if (item) {
      item.completed = !item.completed;
      if (item.completed) {
        item.completedBy = new Types.ObjectId(userId);
        item.completedAt = new Date();
      } else {
        item.completedBy = undefined;
        item.completedAt = undefined;
      }
      this.lastActivityAt = new Date();
      return this.save();
    }
  }
  return Promise.resolve(this);
};

// Record a view
TaskThreadSchema.methods.recordView = function(userId: string): Promise<ITaskThread> {
  const participant = this.participants.find(
    (p: IThreadParticipant) => p.userId.toString() === userId.toString()
  );

  if (participant) {
    participant.lastViewedAt = new Date();
  }

  this.viewCount += 1;
  return this.save();
};

// ====================
// STATIC METHODS
// ====================

// Find threads by workspace
TaskThreadSchema.statics.findByWorkspace = function(
  workspaceId: string,
  options: any = {}
) {
  const {
    threadType,
    isResolved,
    limit = 50,
    sort = { lastActivityAt: -1 }
  } = options;

  const query: any = { workspaceId };

  // Only include non-archived threads
  if (!options.includeArchived) {
    query.archivedAt = null;
  }

  if (threadType) query.threadType = threadType;
  if (typeof isResolved === 'boolean') query.isResolved = isResolved;

  return this.find(query)
    .sort(sort)
    .limit(limit)
    .populate('createdBy', 'name email')
    .populate('participants.userId', 'name email');
};

// Find user's assigned tasks
TaskThreadSchema.statics.findUserTasks = function(
  userId: string,
  status?: string
) {
  const query: any = {
    threadType: 'task',
    'taskDetails.assignees': userId,
    archivedAt: null
  };

  if (status) {
    query['taskDetails.status'] = status;
  }

  return this.find(query)
    .sort({ 'taskDetails.dueDate': 1, lastActivityAt: -1 })
    .populate('workspaceId', 'name workspaceId')
    .populate('createdBy', 'name email');
};

// Find unresolved threads
TaskThreadSchema.statics.findUnresolvedThreads = function(workspaceId: string) {
  return this.find({
    workspaceId,
    isResolved: false,
    archivedAt: null
  })
    .sort({ isPinned: -1, lastActivityAt: -1 })
    .populate('createdBy', 'name email');
};

// Get thread statistics
TaskThreadSchema.statics.getThreadStats = async function(workspaceId: string) {
  const stats = await this.aggregate([
    {
      $match: {
        workspaceId: new Types.ObjectId(workspaceId),
        archivedAt: null
      }
    },
    {
      $group: {
        _id: '$threadType',
        total: { $sum: 1 },
        resolved: {
          $sum: { $cond: ['$isResolved', 1, 0] }
        },
        avgComments: { $avg: '$commentCount' },
        avgViews: { $avg: '$viewCount' }
      }
    }
  ]);

  // Get task-specific stats
  const taskStats = await this.aggregate([
    {
      $match: {
        workspaceId: new Types.ObjectId(workspaceId),
        threadType: 'task',
        archivedAt: null
      }
    },
    {
      $group: {
        _id: '$taskDetails.status',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    byType: stats,
    tasksByStatus: taskStats
  };
};

// Find overdue tasks
TaskThreadSchema.statics.findOverdueTasks = function(workspaceId?: string) {
  const now = new Date();
  const query: any = {
    threadType: 'task',
    'taskDetails.dueDate': { $lt: now },
    'taskDetails.status': { $nin: ['completed', 'cancelled'] },
    archivedAt: null
  };

  if (workspaceId) {
    query.workspaceId = workspaceId;
  }

  return this.find(query)
    .sort({ 'taskDetails.dueDate': 1 })
    .populate('workspaceId', 'name workspaceId')
    .populate('taskDetails.assignees', 'name email')
    .populate('createdBy', 'name email');
};

// ====================
// MIDDLEWARE
// ====================

// Pre-save: Validate task details for task threads
TaskThreadSchema.pre('save', function(next) {
  if (this.threadType === 'task' && !this.taskDetails) {
    return next(new Error('Task details required for task thread type'));
  }
  next();
});

// Pre-save: Update lastActivityAt on comment additions
TaskThreadSchema.pre('save', function(next) {
  if (this.isModified('comments') && !this.isNew) {
    this.lastActivityAt = new Date();
  }
  next();
});

// Pre-save: Auto-resolve task when completed
TaskThreadSchema.pre('save', function(next) {
  if (
    this.threadType === 'task' &&
    this.taskDetails?.status === 'completed' &&
    !this.isResolved
  ) {
    this.isResolved = true;
    this.resolvedAt = new Date();
  }
  next();
});

// Pre-save: Ensure creator is a participant
TaskThreadSchema.pre('save', function(next) {
  if (this.isNew) {
    const creatorIsParticipant = this.participants.some(
      (p: IThreadParticipant) => p.userId.toString() === this.createdBy.toString()
    );

    if (!creatorIsParticipant) {
      this.participants.push({
        userId: this.createdBy,
        userType: 'brand', // Will be set correctly by application logic
        role: 'owner',
        addedAt: new Date()
      });
    }
  }
  next();
});

export const TaskThread = model<ITaskThread, ITaskThreadModel>(
  'TaskThread',
  TaskThreadSchema
);
