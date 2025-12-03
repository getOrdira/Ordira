// src/models/collaboration/conversation.model.ts
import { Schema, model, Document, Types, Model } from 'mongoose';

/**
 * Conversation Participant Interface
 */
export interface IConversationParticipant {
  userId: Types.ObjectId;
  userType: 'brand' | 'manufacturer';
  displayName?: string;
  joinedAt: Date;
  lastReadAt?: Date;
  lastReadMessageId?: Types.ObjectId;
  isActive: boolean;
  mutedUntil?: Date;
  role: 'owner' | 'admin' | 'member';
}

/**
 * Last Message Preview Interface
 */
export interface ILastMessagePreview {
  messageId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderType: 'brand' | 'manufacturer';
  senderName: string;
  preview: string; // Truncated message content
  contentType: 'text' | 'file' | 'update' | 'task' | 'system';
  sentAt: Date;
}

/**
 * Unread Count Entry Interface
 */
export interface IUnreadCount {
  participantId: Types.ObjectId;
  count: number;
}

/**
 * Conversation Settings Interface
 */
export interface IConversationSettings {
  allowFileSharing: boolean;
  allowReactions: boolean;
  allowReplies: boolean;
  retentionDays?: number; // Optional message retention policy
}

/**
 * Conversation Document Interface
 * Supports both direct messaging and workspace conversations
 */
export interface IConversation extends Document {
  // Core Identifiers
  conversationId: string; // UUID for external reference

  // Conversation Type
  conversationType: 'direct' | 'workspace' | 'group';

  // Relationship - For direct messaging (brand-manufacturer connection)
  brandId?: Types.ObjectId;
  manufacturerId?: Types.ObjectId;
  connectionId?: string; // Reference to the brand-manufacturer connection

  // Workspace Reference - For workspace conversations
  workspaceId?: Types.ObjectId;
  workspaceUuid?: string; // The workspace's UUID for easy lookup

  // Conversation Details
  name?: string; // Optional name for group/workspace chats
  description?: string;
  avatarUrl?: string;

  // Participants
  participants: IConversationParticipant[];

  // Message Tracking
  lastMessage?: ILastMessagePreview;
  messageCount: number;
  unreadCounts: IUnreadCount[];

  // Settings
  settings: IConversationSettings;

  // Status
  status: 'active' | 'archived' | 'deleted';
  isPinned: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId;
  archivedAt?: Date;
  archivedBy?: Types.ObjectId;

  // Instance methods
  isParticipant(userId: string): boolean;
  getParticipant(userId: string): IConversationParticipant | undefined;
  addParticipant(userId: string, userType: 'brand' | 'manufacturer', role?: 'owner' | 'admin' | 'member'): Promise<IConversation>;
  removeParticipant(userId: string): Promise<IConversation>;
  updateLastRead(userId: string, messageId: string): Promise<IConversation>;
  incrementUnread(excludeUserId: string): Promise<IConversation>;
  resetUnread(userId: string): Promise<IConversation>;
  updateLastMessage(message: ILastMessagePreview): Promise<IConversation>;
}

/**
 * Conversation Static Methods Interface
 */
export interface IConversationModel extends Model<IConversation> {
  findByConversationId(conversationId: string): Promise<IConversation | null>;
  findDirectConversation(brandId: string, manufacturerId: string): Promise<IConversation | null>;
  findWorkspaceConversation(workspaceId: string): Promise<IConversation | null>;
  findUserConversations(userId: string, options?: any): Promise<IConversation[]>;
  getOrCreateDirectConversation(
    brandId: string,
    manufacturerId: string,
    createdBy: string,
    creatorType: 'brand' | 'manufacturer'
  ): Promise<IConversation>;
  getOrCreateWorkspaceConversation(
    workspaceId: string,
    workspaceUuid: string,
    workspaceName: string,
    createdBy: string
  ): Promise<IConversation>;
}

/**
 * Conversation Participant Schema
 */
const ConversationParticipantSchema = new Schema<IConversationParticipant>({
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
  displayName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  joinedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  lastReadAt: {
    type: Date
  },
  lastReadMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true
  },
  mutedUntil: {
    type: Date
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    required: true,
    default: 'member'
  }
}, { _id: false });

/**
 * Last Message Preview Schema
 */
const LastMessagePreviewSchema = new Schema<ILastMessagePreview>({
  messageId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Message'
  },
  senderId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  senderType: {
    type: String,
    enum: ['brand', 'manufacturer'],
    required: true
  },
  senderName: {
    type: String,
    required: true,
    trim: true
  },
  preview: {
    type: String,
    required: true,
    maxlength: 200
  },
  contentType: {
    type: String,
    enum: ['text', 'file', 'update', 'task', 'system'],
    required: true,
    default: 'text'
  },
  sentAt: {
    type: Date,
    required: true
  }
}, { _id: false });

/**
 * Unread Count Schema
 */
const UnreadCountSchema = new Schema<IUnreadCount>({
  participantId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  count: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
}, { _id: false });

/**
 * Conversation Settings Schema
 */
const ConversationSettingsSchema = new Schema<IConversationSettings>({
  allowFileSharing: {
    type: Boolean,
    default: true
  },
  allowReactions: {
    type: Boolean,
    default: true
  },
  allowReplies: {
    type: Boolean,
    default: true
  },
  retentionDays: {
    type: Number,
    min: 0
  }
}, { _id: false });

/**
 * Main Conversation Schema
 */
const ConversationSchema = new Schema<IConversation>(
  {
    // Core Identifiers
    conversationId: {
      type: String,
      required: [true, 'Conversation ID is required'],
      unique: true,
      index: true
    },

    // Conversation Type
    conversationType: {
      type: String,
      enum: {
        values: ['direct', 'workspace', 'group'],
        message: 'Conversation type must be direct, workspace, or group'
      },
      required: [true, 'Conversation type is required'],
      index: true
    },

    // Relationship - For direct messaging
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      index: true,
      sparse: true
    },
    manufacturerId: {
      type: Schema.Types.ObjectId,
      ref: 'Manufacturer',
      index: true,
      sparse: true
    },
    connectionId: {
      type: String,
      sparse: true
    },

    // Workspace Reference
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true,
      sparse: true
    },
    workspaceUuid: {
      type: String,
      sparse: true
    },

    // Conversation Details
    name: {
      type: String,
      trim: true,
      maxlength: [200, 'Conversation name cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    avatarUrl: {
      type: String
    },

    // Participants
    participants: {
      type: [ConversationParticipantSchema],
      required: true,
      validate: {
        validator: function(v: IConversationParticipant[]) {
          return v.length >= 1;
        },
        message: 'Conversation must have at least one participant'
      }
    },

    // Message Tracking
    lastMessage: {
      type: LastMessagePreviewSchema
    },
    messageCount: {
      type: Number,
      default: 0,
      min: 0
    },
    unreadCounts: {
      type: [UnreadCountSchema],
      default: []
    },

    // Settings
    settings: {
      type: ConversationSettingsSchema,
      required: true,
      default: () => ({
        allowFileSharing: true,
        allowReactions: true,
        allowReplies: true
      })
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      required: true,
      default: 'active',
      index: true
    },
    isPinned: {
      type: Boolean,
      required: true,
      default: false
    },

    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      required: [true, 'Creator ID is required'],
      ref: 'User'
    },
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
// INDEXES
// ====================

// Composite index for direct conversation lookup
ConversationSchema.index(
  { brandId: 1, manufacturerId: 1, conversationType: 1 },
  { sparse: true }
);

// Index for workspace conversation lookup
ConversationSchema.index({ workspaceId: 1, conversationType: 1 }, { sparse: true });

// Index for finding user's conversations
ConversationSchema.index({ 'participants.userId': 1, status: 1 });

// Index for sorting by last message
ConversationSchema.index({ 'lastMessage.sentAt': -1 });

// Index for unread counts
ConversationSchema.index({ 'unreadCounts.participantId': 1 });

// Text index for search
ConversationSchema.index({ name: 'text', description: 'text' });

// ====================
// VIRTUAL PROPERTIES
// ====================

// Virtual for active participant count
ConversationSchema.virtual('activeParticipantCount').get(function() {
  return this.participants.filter(p => p.isActive).length;
});

// Virtual for checking if conversation has unread messages
ConversationSchema.virtual('hasUnread').get(function() {
  return this.unreadCounts.some(uc => uc.count > 0);
});

// ====================
// INSTANCE METHODS
// ====================

/**
 * Check if user is a participant
 */
ConversationSchema.methods.isParticipant = function(userId: string): boolean {
  return this.participants.some(
    (p: IConversationParticipant) => p.userId.toString() === userId && p.isActive
  );
};

/**
 * Get participant by user ID
 */
ConversationSchema.methods.getParticipant = function(userId: string): IConversationParticipant | undefined {
  return this.participants.find(
    (p: IConversationParticipant) => p.userId.toString() === userId
  );
};

/**
 * Add a participant to conversation
 */
ConversationSchema.methods.addParticipant = function(
  userId: string,
  userType: 'brand' | 'manufacturer',
  role: 'owner' | 'admin' | 'member' = 'member'
): Promise<IConversation> {
  const existingIdx = this.participants.findIndex(
    (p: IConversationParticipant) => p.userId.toString() === userId
  );

  if (existingIdx >= 0) {
    // Reactivate if inactive
    this.participants[existingIdx].isActive = true;
    this.participants[existingIdx].joinedAt = new Date();
  } else {
    this.participants.push({
      userId: new Types.ObjectId(userId),
      userType,
      joinedAt: new Date(),
      isActive: true,
      role
    });

    // Initialize unread count for new participant
    this.unreadCounts.push({
      participantId: new Types.ObjectId(userId),
      count: 0
    });
  }

  return this.save();
};

/**
 * Remove a participant from conversation
 */
ConversationSchema.methods.removeParticipant = function(userId: string): Promise<IConversation> {
  const participant = this.participants.find(
    (p: IConversationParticipant) => p.userId.toString() === userId
  );

  if (participant) {
    participant.isActive = false;
  }

  return this.save();
};

/**
 * Update last read position for user
 */
ConversationSchema.methods.updateLastRead = function(
  userId: string,
  messageId: string
): Promise<IConversation> {
  const participant = this.participants.find(
    (p: IConversationParticipant) => p.userId.toString() === userId
  );

  if (participant) {
    participant.lastReadAt = new Date();
    participant.lastReadMessageId = new Types.ObjectId(messageId);
  }

  // Reset unread count
  const unreadEntry = this.unreadCounts.find(
    (uc: IUnreadCount) => uc.participantId.toString() === userId
  );
  if (unreadEntry) {
    unreadEntry.count = 0;
  }

  return this.save();
};

/**
 * Increment unread count for all participants except sender
 */
ConversationSchema.methods.incrementUnread = function(excludeUserId: string): Promise<IConversation> {
  for (const participant of this.participants) {
    if (participant.userId.toString() !== excludeUserId && participant.isActive) {
      const unreadEntry = this.unreadCounts.find(
        (uc: IUnreadCount) => uc.participantId.toString() === participant.userId.toString()
      );
      if (unreadEntry) {
        unreadEntry.count += 1;
      } else {
        this.unreadCounts.push({
          participantId: participant.userId,
          count: 1
        });
      }
    }
  }

  return this.save();
};

/**
 * Reset unread count for a user
 */
ConversationSchema.methods.resetUnread = function(userId: string): Promise<IConversation> {
  const unreadEntry = this.unreadCounts.find(
    (uc: IUnreadCount) => uc.participantId.toString() === userId
  );
  if (unreadEntry) {
    unreadEntry.count = 0;
  }

  return this.save();
};

/**
 * Update last message preview
 */
ConversationSchema.methods.updateLastMessage = function(
  message: ILastMessagePreview
): Promise<IConversation> {
  this.lastMessage = message;
  this.messageCount += 1;
  return this.save();
};

// ====================
// STATIC METHODS
// ====================

/**
 * Find conversation by UUID
 */
ConversationSchema.statics.findByConversationId = function(conversationId: string) {
  return this.findOne({ conversationId, status: { $in: ['active', 'archived'] } });
};

/**
 * Find direct conversation between brand and manufacturer
 */
ConversationSchema.statics.findDirectConversation = function(
  brandId: string,
  manufacturerId: string
) {
  return this.findOne({
    brandId,
    manufacturerId,
    conversationType: 'direct',
    status: { $in: ['active', 'archived'] }
  });
};

/**
 * Find workspace conversation
 */
ConversationSchema.statics.findWorkspaceConversation = function(workspaceId: string) {
  return this.findOne({
    workspaceId,
    conversationType: 'workspace',
    status: { $in: ['active', 'archived'] }
  });
};

/**
 * Find all conversations for a user
 */
ConversationSchema.statics.findUserConversations = function(
  userId: string,
  options: any = {}
) {
  const { status = 'active', limit = 50, sortBy = 'lastMessage.sentAt' } = options;

  const query: any = {
    'participants.userId': userId,
    'participants.isActive': true,
    status
  };

  return this.find(query)
    .sort({ [sortBy]: -1 })
    .limit(limit)
    .populate('brandId', 'name companyName logo')
    .populate('manufacturerId', 'name companyName logo')
    .populate('workspaceId', 'name workspaceId');
};

/**
 * Get or create direct conversation
 */
ConversationSchema.statics.getOrCreateDirectConversation = async function(
  brandId: string,
  manufacturerId: string,
  createdBy: string,
  creatorType: 'brand' | 'manufacturer'
) {
  // Try to find existing
  let conversation = await this.findOne({
    brandId,
    manufacturerId,
    conversationType: 'direct',
    status: { $in: ['active', 'archived'] }
  });

  if (conversation) {
    return conversation;
  }

  // Create new direct conversation
  const { v4: uuidv4 } = await import('uuid');

  conversation = new this({
    conversationId: uuidv4(),
    conversationType: 'direct',
    brandId,
    manufacturerId,
    participants: [
      {
        userId: new Types.ObjectId(brandId),
        userType: 'brand',
        joinedAt: new Date(),
        isActive: true,
        role: 'owner'
      },
      {
        userId: new Types.ObjectId(manufacturerId),
        userType: 'manufacturer',
        joinedAt: new Date(),
        isActive: true,
        role: 'owner'
      }
    ],
    unreadCounts: [
      { participantId: new Types.ObjectId(brandId), count: 0 },
      { participantId: new Types.ObjectId(manufacturerId), count: 0 }
    ],
    createdBy: new Types.ObjectId(createdBy)
  });

  return conversation.save();
};

/**
 * Get or create workspace conversation
 */
ConversationSchema.statics.getOrCreateWorkspaceConversation = async function(
  workspaceId: string,
  workspaceUuid: string,
  workspaceName: string,
  createdBy: string
) {
  // Try to find existing
  let conversation = await this.findOne({
    workspaceId,
    conversationType: 'workspace',
    status: { $in: ['active', 'archived'] }
  });

  if (conversation) {
    return conversation;
  }

  // Create new workspace conversation
  const { v4: uuidv4 } = await import('uuid');

  conversation = new this({
    conversationId: uuidv4(),
    conversationType: 'workspace',
    workspaceId,
    workspaceUuid,
    name: `${workspaceName} Chat`,
    participants: [
      {
        userId: new Types.ObjectId(createdBy),
        userType: 'brand', // Will be updated based on actual user
        joinedAt: new Date(),
        isActive: true,
        role: 'owner'
      }
    ],
    unreadCounts: [
      { participantId: new Types.ObjectId(createdBy), count: 0 }
    ],
    createdBy: new Types.ObjectId(createdBy)
  });

  return conversation.save();
};

// ====================
// MIDDLEWARE
// ====================

// Pre-save: Validate conversation type requirements
ConversationSchema.pre('save', function(next) {
  if (this.conversationType === 'direct') {
    if (!this.brandId || !this.manufacturerId) {
      return next(new Error('Direct conversation requires brandId and manufacturerId'));
    }
  } else if (this.conversationType === 'workspace') {
    if (!this.workspaceId) {
      return next(new Error('Workspace conversation requires workspaceId'));
    }
  }
  next();
});

export const Conversation = model<IConversation, IConversationModel>(
  'Conversation',
  ConversationSchema
);

