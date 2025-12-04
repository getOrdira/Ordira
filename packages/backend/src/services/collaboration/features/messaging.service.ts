// src/services/collaboration/features/messaging.service.ts

import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  Conversation,
  IConversation,
  ILastMessagePreview
} from '../../../models/collaboration/conversation.model';
import {
  Message,
  IMessage,
  IMessageSender,
  IMessageContent,
  IMessageFileAttachment,
  ISharedEntity
} from '../../../models/collaboration/message.model';
import { Workspace } from '../../../models/collaboration/workspace.model';
import { FileAttachment } from '../../../models/collaboration/fileAttachment.model';
import { ProductionUpdate } from '../../../models/collaboration/productionUpdate.model';
import { TaskThread } from '../../../models/collaboration/taskThread.model';
import { connectionValidationService } from '../core/connectionValidation.service';
import { realTimeCollaborationService, CollaborationEventType } from '../core/realTimeCollaboration.service';
import { logger } from '../../../utils/logger';

/**
 * Send Message Input
 */
export interface ISendMessageInput {
  conversationId: string;
  senderId: string;
  senderType: 'brand' | 'manufacturer';
  senderName: string;
  senderAvatar?: string;
  text: string;
  fileAttachments?: Array<{
    fileId: string;
    fileName: string;
    fileCategory: string;
    fileSize: number;
    mimeType: string;
    thumbnailUrl?: string;
    s3Url: string;
  }>;
  sharedEntities?: Array<{
    entityType: 'file' | 'update' | 'task' | 'workspace';
    entityId: string;
    title: string;
    preview?: string;
    metadata?: Record<string, any>;
  }>;
  replyToMessageId?: string;
  mentionedUserIds?: string[];
  clientMessageId?: string;
}

/**
 * Create Conversation Input
 */
export interface ICreateConversationInput {
  conversationType: 'direct' | 'workspace' | 'group';
  brandId?: string;
  manufacturerId?: string;
  workspaceId?: string;
  name?: string;
  description?: string;
  createdBy: string;
  creatorType: 'brand' | 'manufacturer';
  initialParticipants?: Array<{
    userId: string;
    userType: 'brand' | 'manufacturer';
    role?: 'owner' | 'admin' | 'member';
  }>;
}

/**
 * Get Messages Options
 */
export interface IGetMessagesOptions {
  limit?: number;
  before?: Date | string;
  after?: Date | string;
  includeDeleted?: boolean;
}

/**
 * Get Conversations Options
 */
export interface IGetConversationsOptions {
  status?: 'active' | 'archived';
  limit?: number;
  sortBy?: string;
  unreadOnly?: boolean;
}

/**
 * Messaging Service
 * Handles all messaging operations between brands and manufacturers
 */
export class MessagingService {
  /**
   * Get or create a direct conversation between brand and manufacturer
   */
  async getOrCreateDirectConversation(
    brandId: string,
    manufacturerId: string,
    createdBy: string,
    creatorType: 'brand' | 'manufacturer'
  ): Promise<IConversation> {
    try {
      // Validate connection exists
      const connectionStatus = await connectionValidationService.validateConnection(
        new Types.ObjectId(brandId),
        new Types.ObjectId(manufacturerId)
      );

      if (!connectionStatus.isConnected || connectionStatus.status !== 'active') {
        throw { statusCode: 403, code: 'CONNECTION_REQUIRED', message: 'An active connection is required to start a conversation' };
      }

      // Use static method to get or create
      return await Conversation.getOrCreateDirectConversation(
        brandId,
        manufacturerId,
        createdBy,
        creatorType
      );
    } catch (error: any) {
      // Re-throw structured errors as-is
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error;
      }
      // Wrap other errors
      throw { statusCode: 500, code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to get or create direct conversation' };
    }
  }

  /**
   * Get or create a workspace conversation
   */
  async getOrCreateWorkspaceConversation(
    workspaceId: string,
    createdBy: string
  ): Promise<IConversation> {
    try {
      // Get workspace details
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw { statusCode: 404, code: 'WORKSPACE_NOT_FOUND', message: 'Workspace not found' };
      }

      return await Conversation.getOrCreateWorkspaceConversation(
        workspaceId,
        workspace.workspaceId,
        workspace.name,
        createdBy
      );
    } catch (error: any) {
      // Re-throw structured errors as-is
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error;
      }
      // Wrap other errors
      throw { statusCode: 500, code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to get or create workspace conversation' };
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(input: ICreateConversationInput): Promise<IConversation> {
    const {
      conversationType,
      brandId,
      manufacturerId,
      workspaceId,
      name,
      description,
      createdBy,
      creatorType,
      initialParticipants = []
    } = input;

    // For direct conversations, use the get-or-create method
    if (conversationType === 'direct') {
      if (!brandId || !manufacturerId) {
        throw new Error('Brand ID and Manufacturer ID required for direct conversation');
      }
      return this.getOrCreateDirectConversation(brandId, manufacturerId, createdBy, creatorType);
    }

    // For workspace conversations
    if (conversationType === 'workspace') {
      if (!workspaceId) {
        throw new Error('Workspace ID required for workspace conversation');
      }
      return this.getOrCreateWorkspaceConversation(workspaceId, createdBy);
    }

    // For group conversations (custom groups)
    const participants = [
      {
        userId: new Types.ObjectId(createdBy),
        userType: creatorType,
        joinedAt: new Date(),
        isActive: true,
        role: 'owner' as const
      },
      ...initialParticipants.map(p => ({
        userId: new Types.ObjectId(p.userId),
        userType: p.userType,
        joinedAt: new Date(),
        isActive: true,
        role: p.role || 'member' as const
      }))
    ];

    const conversation = new Conversation({
      conversationId: uuidv4(),
      conversationType,
      brandId: brandId ? new Types.ObjectId(brandId) : undefined,
      manufacturerId: manufacturerId ? new Types.ObjectId(manufacturerId) : undefined,
      name,
      description,
      participants,
      unreadCounts: participants.map(p => ({
        participantId: p.userId,
        count: 0
      })),
      createdBy: new Types.ObjectId(createdBy)
    });

    await conversation.save();

    // Broadcast conversation created event
    realTimeCollaborationService.broadcastToUser(
      createdBy,
      CollaborationEventType.CONVERSATION_CREATED,
      { conversation }
    );

    logger.info('Conversation created', {
      conversationId: conversation.conversationId,
      type: conversationType
    });

    return conversation;
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId: string): Promise<IConversation | null> {
    return await Conversation.findByConversationId(conversationId);
  }

  /**
   * Get conversation by MongoDB ObjectId
   */
  async getConversationByObjectId(id: string): Promise<IConversation | null> {
    return Conversation.findById(id);
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(
    userId: string,
    options: IGetConversationsOptions = {}
  ): Promise<IConversation[]> {
    const { status = 'active', limit = 50, unreadOnly = false } = options;

    let query: any = {
      'participants.userId': userId,
      'participants.isActive': true,
      status
    };

    if (unreadOnly) {
      query['unreadCounts'] = {
        $elemMatch: {
          participantId: new Types.ObjectId(userId),
          count: { $gt: 0 }
        }
      };
    }

    return Conversation.find(query)
      .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 })
      .limit(limit)
      .populate('brandId', 'name companyName logo')
      .populate('manufacturerId', 'name companyName logo')
      .populate('workspaceId', 'name workspaceId');
  }

  /**
   * Get direct conversation between brand and manufacturer
   */
  async getDirectConversation(
    brandId: string,
    manufacturerId: string
  ): Promise<IConversation | null> {
    return await Conversation.findDirectConversation(brandId, manufacturerId);
  }

  /**
   * Send a message
   */
  async sendMessage(input: ISendMessageInput): Promise<IMessage> {
    const {
      conversationId,
      senderId,
      senderType,
      senderName,
      senderAvatar,
      text,
      fileAttachments = [],
      sharedEntities = [],
      replyToMessageId,
      mentionedUserIds = [],
      clientMessageId
    } = input;

    // Get conversation
    const conversation = await Conversation.findByConversationId(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Verify sender is a participant
    if (!conversation.isParticipant(senderId)) {
      throw new Error('You are not a participant in this conversation');
    }

    // Build sender object
    const sender: IMessageSender = {
      userId: new Types.ObjectId(senderId),
      userType: senderType,
      displayName: senderName,
      avatarUrl: senderAvatar
    };

    // Build content object
    const content: IMessageContent = {
      text,
      contentType: this.determineContentType(text, fileAttachments, sharedEntities),
      mentionedUserIds: mentionedUserIds.map(id => new Types.ObjectId(id))
    };

    // Build file attachments
    const messageFileAttachments: IMessageFileAttachment[] = fileAttachments.map(f => ({
      fileId: new Types.ObjectId(f.fileId),
      fileName: f.fileName,
      fileCategory: f.fileCategory,
      fileSize: f.fileSize,
      mimeType: f.mimeType,
      thumbnailUrl: f.thumbnailUrl,
      s3Url: f.s3Url
    }));

    // Build shared entities
    const messageSharedEntities: ISharedEntity[] = sharedEntities.map(e => ({
      entityType: e.entityType,
      entityId: new Types.ObjectId(e.entityId),
      title: e.title,
      preview: e.preview,
      metadata: e.metadata
    }));

    // Handle reply
    let replyTo;
    if (replyToMessageId) {
      const parentMessage = await Message.findByMessageId(replyToMessageId);
      if (parentMessage) {
        replyTo = {
          messageId: parentMessage._id,
          senderId: parentMessage.sender.userId,
          senderName: parentMessage.sender.displayName,
          preview: parentMessage.content.text.substring(0, 100),
          contentType: parentMessage.content.contentType
        };

        // Increment reply count on parent
        parentMessage.replyCount += 1;
        await parentMessage.save();
      }
    }

    // Create message
    const message = new Message({
      messageId: uuidv4(),
      conversationId: conversation._id,
      workspaceId: conversation.workspaceId,
      sender,
      content,
      fileAttachments: messageFileAttachments,
      sharedEntities: messageSharedEntities,
      replyTo,
      status: 'sent',
      clientMessageId
    });

    await message.save();

    // Update conversation's last message
    const lastMessagePreview: ILastMessagePreview = {
      messageId: message._id,
      senderId: new Types.ObjectId(senderId),
      senderType,
      senderName,
      preview: this.createMessagePreview(text, content.contentType),
      contentType: content.contentType === 'mixed' ? 'text' : content.contentType,
      sentAt: new Date()
    };

    await conversation.updateLastMessage(lastMessagePreview);

    // Increment unread counts for other participants
    await conversation.incrementUnread(senderId);

    // Broadcast message to conversation room
    realTimeCollaborationService.broadcastMessage(
      conversationId,
      message.toJSON(),
      senderId
    );

    // Notify mentioned users
    for (const mentionedUserId of mentionedUserIds) {
      realTimeCollaborationService.broadcastToUser(
        mentionedUserId,
        CollaborationEventType.MESSAGE_SENT,
        {
          conversationId,
          message: message.toJSON(),
          mentioned: true
        }
      );
    }

    logger.info('Message sent', {
      messageId: message.messageId,
      conversationId,
      senderId
    });

    return message;
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    options: IGetMessagesOptions = {}
  ): Promise<IMessage[]> {
    const { limit = 50, before, after, includeDeleted = false } = options;

    // Verify user has access to conversation
    const conversation = await Conversation.findByConversationId(conversationId);
    if (!conversation || !conversation.isParticipant(userId)) {
      throw new Error('Access denied to conversation');
    }

    return Message.findByConversation(conversation._id.toString(), {
      limit,
      before,
      after,
      includeDeleted
    });
  }

  /**
   * Mark messages as read
   */
  async markAsRead(
    conversationId: string,
    userId: string,
    messageId?: string
  ): Promise<void> {
    const conversation = await Conversation.findByConversationId(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // If specific message ID provided, mark up to that message
    if (messageId) {
      const message = await Message.findByMessageId(messageId);
      if (message) {
        await message.markAsRead(userId);
        await conversation.updateLastRead(userId, messageId);
      }
    } else {
      // Mark all unread messages as read
      const unreadMessages = await Message.getUnreadMessages(
        conversation._id.toString(),
        userId
      );

      for (const message of unreadMessages) {
        await message.markAsRead(userId);
      }

      // Update conversation's last read
      if (unreadMessages.length > 0) {
        const lastMessage = unreadMessages[unreadMessages.length - 1];
        await conversation.updateLastRead(userId, lastMessage.messageId);
      }
    }

    // Reset unread count
    await conversation.resetUnread(userId);

    // Broadcast read receipt
    realTimeCollaborationService.broadcastToConversation(
      conversationId,
      CollaborationEventType.MESSAGE_READ,
      {
        userId,
        messageId,
        readAt: new Date()
      }
    );
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageId: string,
    userId: string,
    newText: string
  ): Promise<IMessage> {
    const message = await Message.findByMessageId(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Verify ownership
    if (message.sender.userId.toString() !== userId) {
      throw new Error('You can only edit your own messages');
    }

    // Check if message can be edited (within time limit, not deleted)
    if (message.isDeleted) {
      throw new Error('Cannot edit a deleted message');
    }

    await message.editContent(newText);

    // Get conversation for broadcasting
    const conversation = await Conversation.findById(message.conversationId);
    if (conversation) {
      realTimeCollaborationService.broadcastToConversation(
        conversation.conversationId,
        CollaborationEventType.MESSAGE_EDITED,
        {
          messageId: message.messageId,
          userId,
          newText,
          editedAt: message.editedAt
        }
      );
    }

    logger.info('Message edited', { messageId, userId });

    return message;
  }

  /**
   * Delete a message
   */
  async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<IMessage> {
    const message = await Message.findByMessageId(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Verify ownership
    if (message.sender.userId.toString() !== userId) {
      throw new Error('You can only delete your own messages');
    }

    await message.softDelete(userId);

    // Get conversation for broadcasting
    const conversation = await Conversation.findById(message.conversationId);
    if (conversation) {
      realTimeCollaborationService.broadcastToConversation(
        conversation.conversationId,
        CollaborationEventType.MESSAGE_DELETED,
        {
          messageId: message.messageId,
          userId,
          deletedAt: message.deletedAt
        }
      );
    }

    logger.info('Message deleted', { messageId, userId });

    return message;
  }

  /**
   * Add reaction to message
   */
  async addReaction(
    messageId: string,
    userId: string,
    userType: 'brand' | 'manufacturer',
    emoji: string
  ): Promise<IMessage> {
    const message = await Message.findByMessageId(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    await message.addReaction(userId, userType, emoji);

    // Get conversation for broadcasting
    const conversation = await Conversation.findById(message.conversationId);
    if (conversation) {
      realTimeCollaborationService.broadcastToConversation(
        conversation.conversationId,
        CollaborationEventType.MESSAGE_REACTION_ADDED,
        {
          messageId: message.messageId,
          userId,
          userType,
          emoji
        }
      );
    }

    return message;
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<IMessage> {
    const message = await Message.findByMessageId(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    await message.removeReaction(userId, emoji);

    // Get conversation for broadcasting
    const conversation = await Conversation.findById(message.conversationId);
    if (conversation) {
      realTimeCollaborationService.broadcastToConversation(
        conversation.conversationId,
        CollaborationEventType.MESSAGE_REACTION_REMOVED,
        {
          messageId: message.messageId,
          userId,
          emoji
        }
      );
    }

    return message;
  }

  /**
   * Search messages in a conversation
   */
  async searchMessages(
    conversationId: string,
    userId: string,
    query: string,
    options: { limit?: number } = {}
  ): Promise<IMessage[]> {
    const conversation = await Conversation.findByConversationId(conversationId);
    if (!conversation || !conversation.isParticipant(userId)) {
      throw new Error('Access denied to conversation');
    }

    return Message.searchMessages(conversation._id.toString(), query, options);
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const conversations = await this.getUserConversations(userId);
    
    let totalUnread = 0;
    for (const conversation of conversations) {
      const unreadEntry = conversation.unreadCounts.find(
        uc => uc.participantId.toString() === userId
      );
      if (unreadEntry) {
        totalUnread += unreadEntry.count;
      }
    }

    return totalUnread;
  }

  /**
   * Get unread counts per conversation for user
   */
  async getUnreadCounts(userId: string): Promise<Record<string, number>> {
    const conversations = await this.getUserConversations(userId);
    
    const counts: Record<string, number> = {};
    for (const conversation of conversations) {
      const unreadEntry = conversation.unreadCounts.find(
        uc => uc.participantId.toString() === userId
      );
      if (unreadEntry && unreadEntry.count > 0) {
        counts[conversation.conversationId] = unreadEntry.count;
      }
    }

    return counts;
  }

  /**
   * Share a file in conversation
   */
  async shareFile(
    conversationId: string,
    fileId: string,
    senderId: string,
    senderType: 'brand' | 'manufacturer',
    senderName: string,
    messageText?: string
  ): Promise<IMessage> {
    const file = await FileAttachment.findById(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    return this.sendMessage({
      conversationId,
      senderId,
      senderType,
      senderName,
      text: messageText || `Shared a file: ${file.fileName}`,
      fileAttachments: [{
        fileId: file._id.toString(),
        fileName: file.fileName,
        fileCategory: file.fileCategory,
        fileSize: file.fileSize,
        mimeType: file.fileType, // fileType is the MIME type in FileAttachment model
        thumbnailUrl: file.designMetadata?.renderUrl,
        s3Url: file.s3Url
      }]
    });
  }

  /**
   * Share a production update in conversation
   */
  async shareProductionUpdate(
    conversationId: string,
    updateId: string,
    senderId: string,
    senderType: 'brand' | 'manufacturer',
    senderName: string,
    messageText?: string
  ): Promise<IMessage> {
    const update = await ProductionUpdate.findById(updateId);
    if (!update) {
      throw new Error('Production update not found');
    }

    return this.sendMessage({
      conversationId,
      senderId,
      senderType,
      senderName,
      text: messageText || `Shared a production update: ${update.title}`,
      sharedEntities: [{
        entityType: 'update',
        entityId: update._id.toString(),
        title: update.title,
        preview: update.message.substring(0, 200),
        metadata: {
          updateType: update.updateType,
          currentStatus: update.currentStatus,
          completionPercentage: update.completionPercentage
        }
      }]
    });
  }

  /**
   * Share a task in conversation
   */
  async shareTask(
    conversationId: string,
    taskId: string,
    senderId: string,
    senderType: 'brand' | 'manufacturer',
    senderName: string,
    messageText?: string
  ): Promise<IMessage> {
    const task = await TaskThread.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    return this.sendMessage({
      conversationId,
      senderId,
      senderType,
      senderName,
      text: messageText || `Shared a task: ${task.title}`,
      sharedEntities: [{
        entityType: 'task',
        entityId: task._id.toString(),
        title: task.title,
        preview: task.description?.substring(0, 200),
        metadata: {
          threadType: task.threadType,
          status: task.taskDetails?.status,
          priority: task.taskDetails?.priority,
          isResolved: task.isResolved
        }
      }]
    });
  }

  /**
   * Add participant to conversation
   */
  async addParticipant(
    conversationId: string,
    userId: string,
    userType: 'brand' | 'manufacturer',
    addedBy: string,
    role: 'owner' | 'admin' | 'member' = 'member'
  ): Promise<IConversation> {
    const conversation = await Conversation.findByConversationId(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    await conversation.addParticipant(userId, userType, role);

    // Send system message
    await this.sendSystemMessage(
      conversationId,
      `A new participant has joined the conversation`
    );

    // Broadcast participant added
    realTimeCollaborationService.broadcastToConversation(
      conversationId,
      CollaborationEventType.CONVERSATION_PARTICIPANT_ADDED,
      {
        participantId: userId,
        userType,
        addedBy
      }
    );

    return conversation;
  }

  /**
   * Remove participant from conversation
   */
  async removeParticipant(
    conversationId: string,
    userId: string,
    removedBy: string
  ): Promise<IConversation> {
    const conversation = await Conversation.findByConversationId(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    await conversation.removeParticipant(userId);

    // Send system message
    await this.sendSystemMessage(
      conversationId,
      `A participant has left the conversation`
    );

    // Broadcast participant removed
    realTimeCollaborationService.broadcastToConversation(
      conversationId,
      CollaborationEventType.CONVERSATION_PARTICIPANT_REMOVED,
      {
        participantId: userId,
        removedBy
      }
    );

    return conversation;
  }

  /**
   * Archive conversation
   */
  async archiveConversation(
    conversationId: string,
    archivedBy: string
  ): Promise<IConversation> {
    const conversation = await Conversation.findByConversationId(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.status = 'archived';
    conversation.archivedAt = new Date();
    conversation.archivedBy = new Types.ObjectId(archivedBy);
    await conversation.save();

    realTimeCollaborationService.broadcastToConversation(
      conversationId,
      CollaborationEventType.CONVERSATION_ARCHIVED,
      { archivedBy }
    );

    return conversation;
  }

  /**
   * Sync workspace members to conversation
   * Called when workspace members change
   */
  async syncWorkspaceConversationMembers(workspaceId: string): Promise<void> {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return;

    const conversation = await Conversation.findWorkspaceConversation(workspaceId);
    if (!conversation) return;

    // Get all workspace members
    const allMembers = [
      ...workspace.brandMembers.map(m => ({
        userId: m.userId.toString(),
        userType: 'brand' as const
      })),
      ...workspace.manufacturerMembers.map(m => ({
        userId: m.userId.toString(),
        userType: 'manufacturer' as const
      }))
    ];

    // Add missing participants
    for (const member of allMembers) {
      if (!conversation.isParticipant(member.userId)) {
        await conversation.addParticipant(member.userId, member.userType, 'member');
      }
    }

    logger.info('Synced workspace conversation members', {
      workspaceId,
      conversationId: conversation.conversationId,
      memberCount: allMembers.length
    });
  }

  // ==================
  // PRIVATE HELPERS
  // ==================

  /**
   * Determine content type based on message contents
   */
  private determineContentType(
    text: string,
    fileAttachments: any[],
    sharedEntities: any[]
  ): 'text' | 'file' | 'update' | 'task' | 'system' | 'mixed' {
    const hasFiles = fileAttachments.length > 0;
    const hasEntities = sharedEntities.length > 0;
    const hasText = text && text.trim().length > 0;

    if (hasFiles && hasText) return 'mixed';
    if (hasFiles) return 'file';
    if (hasEntities) {
      const entityType = sharedEntities[0].entityType;
      if (entityType === 'update') return 'update';
      if (entityType === 'task') return 'task';
    }
    return 'text';
  }

  /**
   * Create message preview for conversation list
   */
  private createMessagePreview(text: string, contentType: string): string {
    if (contentType === 'file') return '📎 Shared a file';
    if (contentType === 'update') return '📊 Shared a production update';
    if (contentType === 'task') return '✅ Shared a task';
    if (contentType === 'system') return text;

    // Truncate text
    if (text.length > 100) {
      return text.substring(0, 97) + '...';
    }
    return text;
  }

  /**
   * Send a system message
   */
  private async sendSystemMessage(
    conversationId: string,
    text: string
  ): Promise<IMessage> {
    const conversation = await Conversation.findByConversationId(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const message = new Message({
      messageId: uuidv4(),
      conversationId: conversation._id,
      workspaceId: conversation.workspaceId,
      sender: {
        userId: new Types.ObjectId(),
        userType: 'brand',
        displayName: 'System'
      },
      content: {
        text,
        contentType: 'system'
      },
      isSystemMessage: true,
      status: 'sent'
    });

    await message.save();

    // Update conversation's last message
    const lastMessagePreview: ILastMessagePreview = {
      messageId: message._id,
      senderId: message.sender.userId,
      senderType: 'brand',
      senderName: 'System',
      preview: text,
      contentType: 'system',
      sentAt: message.createdAt
    };

    await conversation.updateLastMessage(lastMessagePreview);

    return message;
  }
}

// Export singleton instance
export const messagingService = new MessagingService();

