// src/controllers/features/collaboration/collaborationMessaging.controller.ts
// Controller for messaging operations

import { Response, NextFunction } from 'express';
import { CollaborationBaseController, CollaborationRequest } from './collaborationBase.controller';
import { messagingService } from '../../../services/collaboration/features/messaging.service';

interface MessagingQuery {
  limit?: number;
  before?: string;
  after?: string;
  status?: 'active' | 'archived';
  unreadOnly?: boolean;
  emoji?: string;
  q?: string;
}

interface MessagingRequest extends CollaborationRequest {
  validatedQuery?: MessagingQuery;
  validatedParams?: {
    conversationId?: string;
    messageId?: string;
    brandId?: string;
    manufacturerId?: string;
  };
  validatedBody?: any;
}

/**
 * CollaborationMessagingController handles messaging operations.
 */
export class CollaborationMessagingController extends CollaborationBaseController {
  /**
   * Get or create direct conversation between brand and manufacturer.
   */
  async getOrCreateDirectConversation(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'GET_OR_CREATE_DIRECT_CONVERSATION');

      const userId = this.resolveUserId(req);
      const userType = this.resolveUserType(req);
      const brandId = req.validatedParams?.brandId || req.validatedBody?.brandId || req.businessId;
      const manufacturerId = req.validatedParams?.manufacturerId || req.validatedBody?.manufacturerId || req.manufacturerId;

      if (!brandId || !manufacturerId) {
        throw { statusCode: 400, message: 'Both brandId and manufacturerId are required' };
      }

      const conversation = await messagingService.getOrCreateDirectConversation(
        brandId,
        manufacturerId,
        userId,
        userType
      );

      this.logAction(req, 'GET_OR_CREATE_DIRECT_CONVERSATION_SUCCESS', {
        conversationId: conversation.conversationId,
        brandId,
        manufacturerId
      });

      return { conversation };
    }, res, 'Conversation retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get or create workspace conversation.
   */
  async getOrCreateWorkspaceConversation(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'GET_OR_CREATE_WORKSPACE_CONVERSATION');

      const userId = this.resolveUserId(req);
      const workspaceId = this.resolveWorkspaceId(req);

      const conversation = await messagingService.getOrCreateWorkspaceConversation(
        workspaceId,
        userId
      );

      this.logAction(req, 'GET_OR_CREATE_WORKSPACE_CONVERSATION_SUCCESS', {
        conversationId: conversation.conversationId,
        workspaceId
      });

      return { conversation };
    }, res, 'Workspace conversation retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get conversation by ID.
   */
  async getConversationById(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'GET_CONVERSATION_BY_ID');

      const conversationId = req.validatedParams?.conversationId;
      if (!conversationId) {
        throw { statusCode: 400, message: 'Conversation ID is required' };
      }

      const userId = this.resolveUserId(req);

      const conversation = await messagingService.getConversationById(conversationId);
      if (!conversation) {
        throw { statusCode: 404, message: 'Conversation not found' };
      }

      // Verify user has access
      if (!conversation.isParticipant(userId)) {
        throw { statusCode: 403, message: 'Access denied to this conversation' };
      }

      this.logAction(req, 'GET_CONVERSATION_BY_ID_SUCCESS', {
        conversationId
      });

      return { conversation };
    }, res, 'Conversation retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get user's conversations.
   */
  async getUserConversations(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'GET_USER_CONVERSATIONS');

      const userId = this.resolveUserId(req);
      const query = req.validatedQuery || {};

      const conversations = await messagingService.getUserConversations(userId, {
        status: query.status,
        limit: query.limit,
        unreadOnly: query.unreadOnly
      });

      this.logAction(req, 'GET_USER_CONVERSATIONS_SUCCESS', {
        userId,
        count: conversations.length
      });

      return { conversations };
    }, res, 'Conversations retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Send a message.
   */
  async sendMessage(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'SEND_MESSAGE');

      const conversationId = req.validatedParams?.conversationId || req.validatedBody?.conversationId;
      if (!conversationId) {
        throw { statusCode: 400, message: 'Conversation ID is required' };
      }

      const userId = this.resolveUserId(req);
      const userType = this.resolveUserType(req);

      const body = req.validatedBody || {};
      if (!body.text && !body.fileAttachments?.length && !body.sharedEntities?.length) {
        throw { statusCode: 400, message: 'Message content is required' };
      }

      const message = await messagingService.sendMessage({
        conversationId,
        senderId: userId,
        senderType: userType,
        senderName: body.senderName || 'User',
        senderAvatar: body.senderAvatar,
        text: body.text || '',
        fileAttachments: body.fileAttachments,
        sharedEntities: body.sharedEntities,
        replyToMessageId: body.replyToMessageId,
        mentionedUserIds: body.mentionedUserIds,
        clientMessageId: body.clientMessageId
      });

      this.logAction(req, 'SEND_MESSAGE_SUCCESS', {
        messageId: message.messageId,
        conversationId
      });

      return { message };
    }, res, 'Message sent successfully', this.getRequestMeta(req));
  }

  /**
   * Get messages in a conversation.
   */
  async getMessages(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'GET_MESSAGES');

      const conversationId = req.validatedParams?.conversationId;
      if (!conversationId) {
        throw { statusCode: 400, message: 'Conversation ID is required' };
      }

      const userId = this.resolveUserId(req);
      const query = req.validatedQuery || {};

      const messages = await messagingService.getMessages(conversationId, userId, {
        limit: query.limit,
        before: query.before,
        after: query.after
      });

      this.logAction(req, 'GET_MESSAGES_SUCCESS', {
        conversationId,
        count: messages.length
      });

      return { messages };
    }, res, 'Messages retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Mark messages as read.
   */
  async markAsRead(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'MARK_MESSAGES_AS_READ');

      const conversationId = req.validatedParams?.conversationId;
      if (!conversationId) {
        throw { statusCode: 400, message: 'Conversation ID is required' };
      }

      const userId = this.resolveUserId(req);
      const messageId = req.validatedBody?.messageId || req.validatedParams?.messageId;

      await messagingService.markAsRead(conversationId, userId, messageId);

      this.logAction(req, 'MARK_MESSAGES_AS_READ_SUCCESS', {
        conversationId,
        messageId
      });

      return { success: true };
    }, res, 'Messages marked as read successfully', this.getRequestMeta(req));
  }

  /**
   * Edit a message.
   */
  async editMessage(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'EDIT_MESSAGE');

      const messageId = req.validatedParams?.messageId;
      if (!messageId) {
        throw { statusCode: 400, message: 'Message ID is required' };
      }

      const userId = this.resolveUserId(req);
      const newText = req.validatedBody?.text;

      if (!newText) {
        throw { statusCode: 400, message: 'New message text is required' };
      }

      const message = await messagingService.editMessage(messageId, userId, newText);

      this.logAction(req, 'EDIT_MESSAGE_SUCCESS', {
        messageId
      });

      return { message };
    }, res, 'Message edited successfully', this.getRequestMeta(req));
  }

  /**
   * Delete a message.
   */
  async deleteMessage(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'DELETE_MESSAGE');

      const messageId = req.validatedParams?.messageId;
      if (!messageId) {
        throw { statusCode: 400, message: 'Message ID is required' };
      }

      const userId = this.resolveUserId(req);

      const message = await messagingService.deleteMessage(messageId, userId);

      this.logAction(req, 'DELETE_MESSAGE_SUCCESS', {
        messageId
      });

      return { message };
    }, res, 'Message deleted successfully', this.getRequestMeta(req));
  }

  /**
   * Add reaction to message.
   */
  async addReaction(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'ADD_MESSAGE_REACTION');

      const messageId = req.validatedParams?.messageId;
      if (!messageId) {
        throw { statusCode: 400, message: 'Message ID is required' };
      }

      const userId = this.resolveUserId(req);
      const userType = this.resolveUserType(req);
      const emoji = req.validatedBody?.emoji;

      if (!emoji) {
        throw { statusCode: 400, message: 'Emoji is required' };
      }

      const message = await messagingService.addReaction(messageId, userId, userType, emoji);

      this.logAction(req, 'ADD_MESSAGE_REACTION_SUCCESS', {
        messageId,
        emoji
      });

      return { message };
    }, res, 'Reaction added successfully', this.getRequestMeta(req));
  }

  /**
   * Remove reaction from message.
   */
  async removeReaction(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'REMOVE_MESSAGE_REACTION');

      const messageId = req.validatedParams?.messageId;
      if (!messageId) {
        throw { statusCode: 400, message: 'Message ID is required' };
      }

      const userId = this.resolveUserId(req);
      const emoji = req.validatedBody?.emoji || req.validatedQuery?.emoji;

      if (!emoji) {
        throw { statusCode: 400, message: 'Emoji is required' };
      }

      const message = await messagingService.removeReaction(messageId, userId, emoji);

      this.logAction(req, 'REMOVE_MESSAGE_REACTION_SUCCESS', {
        messageId,
        emoji
      });

      return { message };
    }, res, 'Reaction removed successfully', this.getRequestMeta(req));
  }

  /**
   * Search messages in conversation.
   */
  async searchMessages(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'SEARCH_MESSAGES');

      const conversationId = req.validatedParams?.conversationId;
      if (!conversationId) {
        throw { statusCode: 400, message: 'Conversation ID is required' };
      }

      const userId = this.resolveUserId(req);
      const query = req.validatedQuery?.q || req.validatedBody?.query;

      if (!query) {
        throw { statusCode: 400, message: 'Search query is required' };
      }

      const messages = await messagingService.searchMessages(
        conversationId,
        userId,
        query,
        { limit: req.validatedQuery?.limit }
      );

      this.logAction(req, 'SEARCH_MESSAGES_SUCCESS', {
        conversationId,
        query,
        count: messages.length
      });

      return { messages };
    }, res, 'Messages searched successfully', this.getRequestMeta(req));
  }

  /**
   * Get unread count for user.
   */
  async getUnreadCount(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'GET_UNREAD_COUNT');

      const userId = this.resolveUserId(req);

      const count = await messagingService.getUnreadCount(userId);

      this.logAction(req, 'GET_UNREAD_COUNT_SUCCESS', {
        userId,
        count
      });

      return { unreadCount: count };
    }, res, 'Unread count retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Get unread counts per conversation.
   */
  async getUnreadCounts(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'GET_UNREAD_COUNTS');

      const userId = this.resolveUserId(req);

      const counts = await messagingService.getUnreadCounts(userId);

      this.logAction(req, 'GET_UNREAD_COUNTS_SUCCESS', {
        userId
      });

      return { unreadCounts: counts };
    }, res, 'Unread counts retrieved successfully', this.getRequestMeta(req));
  }

  /**
   * Share a file in conversation.
   */
  async shareFile(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'SHARE_FILE_IN_CONVERSATION');

      const conversationId = req.validatedParams?.conversationId;
      if (!conversationId) {
        throw { statusCode: 400, message: 'Conversation ID is required' };
      }

      const fileId = req.validatedBody?.fileId;
      if (!fileId) {
        throw { statusCode: 400, message: 'File ID is required' };
      }

      const userId = this.resolveUserId(req);
      const userType = this.resolveUserType(req);

      const message = await messagingService.shareFile(
        conversationId,
        fileId,
        userId,
        userType,
        req.validatedBody?.senderName || 'User',
        req.validatedBody?.text
      );

      this.logAction(req, 'SHARE_FILE_IN_CONVERSATION_SUCCESS', {
        conversationId,
        fileId,
        messageId: message.messageId
      });

      return { message };
    }, res, 'File shared successfully', this.getRequestMeta(req));
  }

  /**
   * Share a production update in conversation.
   */
  async shareProductionUpdate(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'SHARE_UPDATE_IN_CONVERSATION');

      const conversationId = req.validatedParams?.conversationId;
      if (!conversationId) {
        throw { statusCode: 400, message: 'Conversation ID is required' };
      }

      const updateId = req.validatedBody?.updateId;
      if (!updateId) {
        throw { statusCode: 400, message: 'Update ID is required' };
      }

      const userId = this.resolveUserId(req);
      const userType = this.resolveUserType(req);

      const message = await messagingService.shareProductionUpdate(
        conversationId,
        updateId,
        userId,
        userType,
        req.validatedBody?.senderName || 'User',
        req.validatedBody?.text
      );

      this.logAction(req, 'SHARE_UPDATE_IN_CONVERSATION_SUCCESS', {
        conversationId,
        updateId,
        messageId: message.messageId
      });

      return { message };
    }, res, 'Production update shared successfully', this.getRequestMeta(req));
  }

  /**
   * Share a task in conversation.
   */
  async shareTask(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'SHARE_TASK_IN_CONVERSATION');

      const conversationId = req.validatedParams?.conversationId;
      if (!conversationId) {
        throw { statusCode: 400, message: 'Conversation ID is required' };
      }

      const taskId = req.validatedBody?.taskId;
      if (!taskId) {
        throw { statusCode: 400, message: 'Task ID is required' };
      }

      const userId = this.resolveUserId(req);
      const userType = this.resolveUserType(req);

      const message = await messagingService.shareTask(
        conversationId,
        taskId,
        userId,
        userType,
        req.validatedBody?.senderName || 'User',
        req.validatedBody?.text
      );

      this.logAction(req, 'SHARE_TASK_IN_CONVERSATION_SUCCESS', {
        conversationId,
        taskId,
        messageId: message.messageId
      });

      return { message };
    }, res, 'Task shared successfully', this.getRequestMeta(req));
  }

  /**
   * Archive conversation.
   */
  async archiveConversation(req: MessagingRequest, res: Response, next: NextFunction): Promise<void> {
    await this.handleAsync(async () => {
      if (!req.userId || !req.userType) {
        throw { statusCode: 401, message: 'Authentication required' };
      }

      this.recordPerformance(req, 'ARCHIVE_CONVERSATION');

      const conversationId = req.validatedParams?.conversationId;
      if (!conversationId) {
        throw { statusCode: 400, message: 'Conversation ID is required' };
      }

      const userId = this.resolveUserId(req);

      const conversation = await messagingService.archiveConversation(conversationId, userId);

      this.logAction(req, 'ARCHIVE_CONVERSATION_SUCCESS', {
        conversationId
      });

      return { conversation };
    }, res, 'Conversation archived successfully', this.getRequestMeta(req));
  }
}

export const collaborationMessagingController = new CollaborationMessagingController();
