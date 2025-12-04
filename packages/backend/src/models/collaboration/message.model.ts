// src/models/collaboration/message.model.ts
import { Schema, model, Document, Types, Model } from 'mongoose';

/**
 * Message Sender Interface
 */
export interface IMessageSender {
  userId: Types.ObjectId;
  userType: 'brand' | 'manufacturer';
  displayName: string;
  avatarUrl?: string;
}

/**
 * Message Content Interface
 */
export interface IMessageContent {
  text: string;
  contentType: 'text' | 'file' | 'update' | 'task' | 'system' | 'mixed';
  formattedText?: string; // For rich text formatting
  mentionedUserIds?: Types.ObjectId[];
}

/**
 * File Attachment in Message Interface
 */
export interface IMessageFileAttachment {
  fileId: Types.ObjectId;
  fileName: string;
  fileCategory: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
  s3Url: string;
}

/**
 * Shared Entity Reference Interface
 * For sharing production updates, tasks, etc.
 */
export interface ISharedEntity {
  entityType: 'file' | 'update' | 'task' | 'workspace';
  entityId: Types.ObjectId;
  title: string;
  preview?: string;
  metadata?: Record<string, any>;
}

/**
 * Message Reaction Interface
 */
export interface IMessageReaction {
  emoji: string;
  userId: Types.ObjectId;
  userType: 'brand' | 'manufacturer';
  createdAt: Date;
}

/**
 * Read Receipt Interface
 */
export interface IReadReceipt {
  userId: Types.ObjectId;
  readAt: Date;
}

/**
 * Reply Reference Interface
 */
export interface IReplyReference {
  messageId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderName: string;
  preview: string;
  contentType: string;
}

/**
 * Message Document Interface
 */
export interface IMessage extends Document {
  // Core Identifiers
  messageId: string; // UUID for external reference

  // Relationships
  conversationId: Types.ObjectId;
  workspaceId?: Types.ObjectId; // For workspace context messages

  // Sender
  sender: IMessageSender;

  // Content
  content: IMessageContent;

  // Attachments
  fileAttachments: IMessageFileAttachment[];
  sharedEntities: ISharedEntity[];

  // Reply Threading
  replyTo?: IReplyReference;
  replyCount: number;

  // Reactions
  reactions: IMessageReaction[];

  // Read Receipts
  readBy: IReadReceipt[];
  deliveredTo: Types.ObjectId[];

  // Status
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;

  // Visibility
  isSystemMessage: boolean;
  isPinned: boolean;
  pinnedAt?: Date;
  pinnedBy?: Types.ObjectId;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  clientMessageId?: string; // For deduplication

  // Instance methods
  markAsRead(userId: string): Promise<IMessage>;
  addReaction(userId: string, userType: 'brand' | 'manufacturer', emoji: string): Promise<IMessage>;
  removeReaction(userId: string, emoji: string): Promise<IMessage>;
  editContent(newText: string): Promise<IMessage>;
  softDelete(deletedBy: string): Promise<IMessage>;
}

/**
 * Message Static Methods Interface
 */
export interface IMessageModel extends Model<IMessage> {
  findByMessageId(messageId: string): Promise<IMessage | null>;
  findByConversation(conversationId: string, options?: any): Promise<IMessage[]>;
  findByWorkspace(workspaceId: string, options?: any): Promise<IMessage[]>;
  getUnreadMessages(conversationId: string, userId: string, since?: Date): Promise<IMessage[]>;
  searchMessages(conversationId: string, query: string, options?: any): Promise<IMessage[]>;
  getReplies(parentMessageId: string, options?: any): Promise<IMessage[]>;
  getRecentMessages(conversationId: string, limit?: number): Promise<IMessage[]>;
}

/**
 * Message Sender Schema
 */
const MessageSenderSchema = new Schema<IMessageSender>({
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
    required: true,
    trim: true,
    maxlength: 100
  },
  avatarUrl: {
    type: String
  }
}, { _id: false });

/**
 * Message Content Schema
 */
const MessageContentSchema = new Schema<IMessageContent>({
  text: {
    type: String,
    required: true,
    maxlength: 10000
  },
  contentType: {
    type: String,
    enum: ['text', 'file', 'update', 'task', 'system', 'mixed'],
    required: true,
    default: 'text'
  },
  formattedText: {
    type: String,
    maxlength: 15000
  },
  mentionedUserIds: {
    type: [Schema.Types.ObjectId],
    default: [],
    ref: 'User'
  }
}, { _id: false });

/**
 * Message File Attachment Schema
 */
const MessageFileAttachmentSchema = new Schema<IMessageFileAttachment>({
  fileId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'FileAttachment'
  },
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  fileCategory: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0
  },
  mimeType: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  s3Url: {
    type: String,
    required: true
  }
}, { _id: false });

/**
 * Shared Entity Schema
 */
const SharedEntitySchema = new Schema<ISharedEntity>({
  entityType: {
    type: String,
    enum: ['file', 'update', 'task', 'workspace'],
    required: true
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  preview: {
    type: String,
    maxlength: 500
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, { _id: false });

/**
 * Message Reaction Schema
 */
const MessageReactionSchema = new Schema<IMessageReaction>({
  emoji: {
    type: String,
    required: true,
    maxlength: 20
  },
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
  createdAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { _id: false });

/**
 * Read Receipt Schema
 */
const ReadReceiptSchema = new Schema<IReadReceipt>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  readAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { _id: false });

/**
 * Reply Reference Schema
 */
const ReplyReferenceSchema = new Schema<IReplyReference>({
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
    required: true
  }
}, { _id: false });

/**
 * Main Message Schema
 */
const MessageSchema = new Schema<IMessage>(
  {
    // Core Identifiers
    messageId: {
      type: String,
      required: [true, 'Message ID is required'],
      unique: true,
      index: true
    },

    // Relationships
    conversationId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Conversation ID is required'],
      ref: 'Conversation',
      index: true
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      index: true,
      sparse: true
    },

    // Sender
    sender: {
      type: MessageSenderSchema,
      required: [true, 'Sender information is required']
    },

    // Content
    content: {
      type: MessageContentSchema,
      required: [true, 'Message content is required']
    },

    // Attachments
    fileAttachments: {
      type: [MessageFileAttachmentSchema],
      default: []
    },
    sharedEntities: {
      type: [SharedEntitySchema],
      default: []
    },

    // Reply Threading
    replyTo: {
      type: ReplyReferenceSchema
    },
    replyCount: {
      type: Number,
      default: 0,
      min: 0
    },

    // Reactions
    reactions: {
      type: [MessageReactionSchema],
      default: []
    },

    // Read Receipts
    readBy: {
      type: [ReadReceiptSchema],
      default: []
    },
    deliveredTo: {
      type: [Schema.Types.ObjectId],
      default: [],
      ref: 'User'
    },

    // Status
    status: {
      type: String,
      enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
      required: true,
      default: 'sent'
    },
    isEdited: {
      type: Boolean,
      required: true,
      default: false
    },
    editedAt: {
      type: Date
    },
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },

    // Visibility
    isSystemMessage: {
      type: Boolean,
      required: true,
      default: false
    },
    isPinned: {
      type: Boolean,
      required: true,
      default: false
    },
    pinnedAt: {
      type: Date
    },
    pinnedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },

    // Client-side deduplication
    clientMessageId: {
      type: String,
      sparse: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.__v;
        // Hide deleted message content
        if (ret.isDeleted) {
          ret.content = { text: 'This message was deleted', contentType: 'system' };
          ret.fileAttachments = [];
          ret.sharedEntities = [];
        }
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// ====================
// INDEXES
// ====================

// Composite index for conversation message queries (most common)
MessageSchema.index({ conversationId: 1, createdAt: -1 });

// Index for workspace messages
MessageSchema.index({ workspaceId: 1, createdAt: -1 }, { sparse: true });

// Index for finding unread messages
MessageSchema.index({ conversationId: 1, 'readBy.userId': 1, createdAt: -1 });

// Index for reply threads
MessageSchema.index({ 'replyTo.messageId': 1 }, { sparse: true });

// Index for pinned messages
MessageSchema.index({ conversationId: 1, isPinned: 1 }, { sparse: true });

// Index for searching by sender
MessageSchema.index({ 'sender.userId': 1, createdAt: -1 });

// Index for mentioned users
MessageSchema.index({ 'content.mentionedUserIds': 1 }, { sparse: true });

// Text index for message search
MessageSchema.index({ 'content.text': 'text' });

// Index for client message deduplication
MessageSchema.index({ clientMessageId: 1, 'sender.userId': 1 }, { sparse: true });

// ====================
// VIRTUAL PROPERTIES
// ====================

// Virtual for reaction count
MessageSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

// Virtual for unique reaction emojis
MessageSchema.virtual('uniqueReactions').get(function() {
  const emojiCounts: Record<string, number> = {};
  for (const reaction of this.reactions) {
    emojiCounts[reaction.emoji] = (emojiCounts[reaction.emoji] || 0) + 1;
  }
  return Object.entries(emojiCounts).map(([emoji, count]) => ({ emoji, count }));
});

// Virtual for read count
MessageSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Virtual for has attachments
MessageSchema.virtual('hasAttachments').get(function() {
  return this.fileAttachments.length > 0 || this.sharedEntities.length > 0;
});

// ====================
// INSTANCE METHODS
// ====================

/**
 * Mark message as read by user
 */
MessageSchema.methods.markAsRead = function(userId: string): Promise<IMessage> {
  const alreadyRead = this.readBy.some(
    (r: IReadReceipt) => r.userId.toString() === userId
  );

  if (!alreadyRead) {
    this.readBy.push({
      userId: new Types.ObjectId(userId),
      readAt: new Date()
    });

    // Update status if all participants have read
    if (this.status !== 'read') {
      this.status = 'read';
    }
  }

  return this.save();
};

/**
 * Add reaction to message
 */
MessageSchema.methods.addReaction = function(
  userId: string,
  userType: 'brand' | 'manufacturer',
  emoji: string
): Promise<IMessage> {
  // Remove existing reaction with same emoji from user
  this.reactions = this.reactions.filter(
    (r: IMessageReaction) => !(r.userId.toString() === userId && r.emoji === emoji)
  );

  // Add new reaction
  this.reactions.push({
    emoji,
    userId: new Types.ObjectId(userId),
    userType,
    createdAt: new Date()
  });

  return this.save();
};

/**
 * Remove reaction from message
 */
MessageSchema.methods.removeReaction = function(
  userId: string,
  emoji: string
): Promise<IMessage> {
  this.reactions = this.reactions.filter(
    (r: IMessageReaction) => !(r.userId.toString() === userId && r.emoji === emoji)
  );

  return this.save();
};

/**
 * Edit message content
 */
MessageSchema.methods.editContent = function(newText: string): Promise<IMessage> {
  this.content.text = newText;
  this.isEdited = true;
  this.editedAt = new Date();

  return this.save();
};

/**
 * Soft delete message
 */
MessageSchema.methods.softDelete = function(deletedBy: string): Promise<IMessage> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = new Types.ObjectId(deletedBy);

  return this.save();
};

// ====================
// STATIC METHODS
// ====================

/**
 * Find message by UUID
 */
MessageSchema.statics.findByMessageId = function(messageId: string) {
  return this.findOne({ messageId, isDeleted: false });
};

/**
 * Find messages by conversation
 */
MessageSchema.statics.findByConversation = function(
  conversationId: string,
  options: any = {}
) {
  const {
    limit = 50,
    before,
    after,
    includeDeleted = false
  } = options;

  const query: any = { conversationId };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  if (before) {
    query.createdAt = { $lt: new Date(before) };
  } else if (after) {
    query.createdAt = { $gt: new Date(after) };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('fileAttachments.fileId', 'fileName s3Url thumbnailUrl');
};

/**
 * Find messages by workspace
 */
MessageSchema.statics.findByWorkspace = function(
  workspaceId: string,
  options: any = {}
) {
  const { limit = 50, before, includeDeleted = false } = options;

  const query: any = { workspaceId, isDeleted: !includeDeleted ? false : undefined };

  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Get unread messages for user in conversation
 */
MessageSchema.statics.getUnreadMessages = function(
  conversationId: string,
  userId: string,
  since?: Date
) {
  const query: any = {
    conversationId,
    isDeleted: false,
    'sender.userId': { $ne: userId },
    'readBy.userId': { $ne: userId }
  };

  if (since) {
    query.createdAt = { $gt: since };
  }

  return this.find(query).sort({ createdAt: 1 });
};

/**
 * Search messages in conversation
 */
MessageSchema.statics.searchMessages = async function(
  conversationId: string,
  searchQuery: string,
  options: any = {}
) {
  const { limit = 20 } = options;

  try {
    // Try using text index search first
    return await this.find({
      conversationId,
      isDeleted: false,
      $text: { $search: searchQuery }
    })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .limit(limit);
  } catch (error: any) {
    // Fallback to regex search if text index doesn't exist
    if (error.code === 4 || error.message?.includes('$search')) {
      return await this.find({
        conversationId,
        isDeleted: false,
        'content.text': { $regex: searchQuery, $options: 'i' }
      })
        .sort({ createdAt: -1 })
        .limit(limit);
    }
    throw error;
  }
};

/**
 * Get replies to a message
 */
MessageSchema.statics.getReplies = function(
  parentMessageId: string,
  options: any = {}
) {
  const { limit = 50 } = options;

  return this.find({
    'replyTo.messageId': parentMessageId,
    isDeleted: false
  })
    .sort({ createdAt: 1 })
    .limit(limit);
};

/**
 * Get recent messages in conversation
 */
MessageSchema.statics.getRecentMessages = function(
  conversationId: string,
  limit: number = 20
) {
  return this.find({
    conversationId,
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// ====================
// MIDDLEWARE
// ====================

// Pre-save: Validate content
MessageSchema.pre('save', function(next) {
  if (!this.content.text && this.fileAttachments.length === 0 && this.sharedEntities.length === 0) {
    return next(new Error('Message must have text content, file attachments, or shared entities'));
  }
  next();
});

// Pre-save: Update content type based on attachments
MessageSchema.pre('save', function(next) {
  if (this.isNew) {
    if (this.fileAttachments.length > 0 && this.content.text) {
      this.content.contentType = 'mixed';
    } else if (this.fileAttachments.length > 0) {
      this.content.contentType = 'file';
    } else if (this.sharedEntities.length > 0) {
      const entityType = this.sharedEntities[0].entityType;
      if (entityType === 'update') this.content.contentType = 'update';
      else if (entityType === 'task') this.content.contentType = 'task';
    }
  }
  next();
});

export const Message = model<IMessage, IMessageModel>('Message', MessageSchema);

