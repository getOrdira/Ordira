// src/routes/features/collaboration/collaborationMessaging.routes.ts
// Messaging routes using modular collaboration messaging controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { collaborationMessagingController } from '../../../controllers/features/collaboration/collaborationMessaging.controller';

const objectIdSchema = Joi.string().hex().length(24);
const uuidSchema = Joi.string().uuid();

// ===================
// PARAM SCHEMAS
// ===================

const conversationIdParamsSchema = Joi.object({
  conversationId: uuidSchema.required()
});

const messageIdParamsSchema = Joi.object({
  conversationId: uuidSchema.required(),
  messageId: uuidSchema.required()
});

const directConversationParamsSchema = Joi.object({
  brandId: objectIdSchema.required(),
  manufacturerId: objectIdSchema.required()
});

// ===================
// BODY SCHEMAS
// ===================

const getOrCreateDirectBodySchema = Joi.object({
  brandId: objectIdSchema.required(),
  manufacturerId: objectIdSchema.required()
});

const getOrCreateWorkspaceBodySchema = Joi.object({
  workspaceId: objectIdSchema.required()
});

const sendMessageBodySchema = Joi.object({
  text: Joi.string().trim().max(10000).allow(''),
  senderName: Joi.string().trim().max(100).required(),
  senderAvatar: Joi.string().uri().optional(),
  fileAttachments: Joi.array().items(Joi.object({
    fileId: objectIdSchema.required(),
    fileName: Joi.string().trim().max(255).required(),
    fileCategory: Joi.string().required(),
    fileSize: Joi.number().integer().min(0).required(),
    mimeType: Joi.string().required(),
    thumbnailUrl: Joi.string().uri().optional(),
    s3Url: Joi.string().uri().required()
  })).optional(),
  sharedEntities: Joi.array().items(Joi.object({
    entityType: Joi.string().valid('file', 'update', 'task', 'workspace').required(),
    entityId: objectIdSchema.required(),
    title: Joi.string().trim().max(200).required(),
    preview: Joi.string().trim().max(500).optional(),
    metadata: Joi.object().unknown(true).optional()
  })).optional(),
  replyToMessageId: uuidSchema.optional(),
  mentionedUserIds: Joi.array().items(objectIdSchema).optional(),
  clientMessageId: Joi.string().optional()
}).or('text', 'fileAttachments', 'sharedEntities');

const editMessageBodySchema = Joi.object({
  text: Joi.string().trim().min(1).max(10000).required()
});

const reactionBodySchema = Joi.object({
  emoji: Joi.string().trim().min(1).max(20).required()
});

const markAsReadBodySchema = Joi.object({
  messageId: uuidSchema.optional()
});

const shareFileBodySchema = Joi.object({
  fileId: objectIdSchema.required(),
  senderName: Joi.string().trim().max(100).optional(),
  text: Joi.string().trim().max(1000).optional()
});

const shareUpdateBodySchema = Joi.object({
  updateId: objectIdSchema.required(),
  senderName: Joi.string().trim().max(100).optional(),
  text: Joi.string().trim().max(1000).optional()
});

const shareTaskBodySchema = Joi.object({
  taskId: objectIdSchema.required(),
  senderName: Joi.string().trim().max(100).optional(),
  text: Joi.string().trim().max(1000).optional()
});

// ===================
// QUERY SCHEMAS
// ===================

const conversationsQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'archived').optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  unreadOnly: Joi.boolean().optional()
});

const messagesQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  before: Joi.date().iso().optional(),
  after: Joi.date().iso().optional()
});

const searchMessagesQuerySchema = Joi.object({
  q: Joi.string().trim().min(1).max(200).required(),
  limit: Joi.number().integer().min(1).max(50).optional()
});

// ===================
// ROUTES
// ===================

const builder = createRouteBuilder(RouteConfigs.authenticated);

// --- CONVERSATION ROUTES ---

// Get or create direct conversation
builder.post(
  '/direct',
  createHandler(collaborationMessagingController, 'getOrCreateDirectConversation'),
  {
    validateBody: getOrCreateDirectBodySchema
  }
);

// Get or create direct conversation (alternative with params)
builder.get(
  '/direct/:brandId/:manufacturerId',
  createHandler(collaborationMessagingController, 'getOrCreateDirectConversation'),
  {
    validateParams: directConversationParamsSchema
  }
);

// Get or create workspace conversation
builder.post(
  '/workspace',
  createHandler(collaborationMessagingController, 'getOrCreateWorkspaceConversation'),
  {
    validateBody: getOrCreateWorkspaceBodySchema
  }
);

// Get user's conversations
builder.get(
  '/conversations',
  createHandler(collaborationMessagingController, 'getUserConversations'),
  {
    validateQuery: conversationsQuerySchema
  }
);

// Get conversation by ID
builder.get(
  '/conversations/:conversationId',
  createHandler(collaborationMessagingController, 'getConversationById'),
  {
    validateParams: conversationIdParamsSchema
  }
);

// Archive conversation
builder.post(
  '/conversations/:conversationId/archive',
  createHandler(collaborationMessagingController, 'archiveConversation'),
  {
    validateParams: conversationIdParamsSchema
  }
);

// --- MESSAGE ROUTES ---

// Send message
builder.post(
  '/conversations/:conversationId/messages',
  createHandler(collaborationMessagingController, 'sendMessage'),
  {
    validateParams: conversationIdParamsSchema,
    validateBody: sendMessageBodySchema
  }
);

// Get messages in conversation
builder.get(
  '/conversations/:conversationId/messages',
  createHandler(collaborationMessagingController, 'getMessages'),
  {
    validateParams: conversationIdParamsSchema,
    validateQuery: messagesQuerySchema
  }
);

// Mark messages as read
builder.post(
  '/conversations/:conversationId/read',
  createHandler(collaborationMessagingController, 'markAsRead'),
  {
    validateParams: conversationIdParamsSchema,
    validateBody: markAsReadBodySchema
  }
);

// Search messages in conversation
builder.get(
  '/conversations/:conversationId/search',
  createHandler(collaborationMessagingController, 'searchMessages'),
  {
    validateParams: conversationIdParamsSchema,
    validateQuery: searchMessagesQuerySchema
  }
);

// Edit message
builder.put(
  '/conversations/:conversationId/messages/:messageId',
  createHandler(collaborationMessagingController, 'editMessage'),
  {
    validateParams: messageIdParamsSchema,
    validateBody: editMessageBodySchema
  }
);

// Delete message
builder.delete(
  '/conversations/:conversationId/messages/:messageId',
  createHandler(collaborationMessagingController, 'deleteMessage'),
  {
    validateParams: messageIdParamsSchema
  }
);

// --- REACTION ROUTES ---

// Add reaction to message
builder.post(
  '/conversations/:conversationId/messages/:messageId/reactions',
  createHandler(collaborationMessagingController, 'addReaction'),
  {
    validateParams: messageIdParamsSchema,
    validateBody: reactionBodySchema
  }
);

// Remove reaction from message
builder.delete(
  '/conversations/:conversationId/messages/:messageId/reactions',
  createHandler(collaborationMessagingController, 'removeReaction'),
  {
    validateParams: messageIdParamsSchema,
    validateQuery: reactionBodySchema
  }
);

// --- SHARING ROUTES ---

// Share file in conversation
builder.post(
  '/conversations/:conversationId/share/file',
  createHandler(collaborationMessagingController, 'shareFile'),
  {
    validateParams: conversationIdParamsSchema,
    validateBody: shareFileBodySchema
  }
);

// Share production update in conversation
builder.post(
  '/conversations/:conversationId/share/update',
  createHandler(collaborationMessagingController, 'shareProductionUpdate'),
  {
    validateParams: conversationIdParamsSchema,
    validateBody: shareUpdateBodySchema
  }
);

// Share task in conversation
builder.post(
  '/conversations/:conversationId/share/task',
  createHandler(collaborationMessagingController, 'shareTask'),
  {
    validateParams: conversationIdParamsSchema,
    validateBody: shareTaskBodySchema
  }
);

// --- UNREAD ROUTES ---

// Get total unread count
builder.get(
  '/unread/count',
  createHandler(collaborationMessagingController, 'getUnreadCount')
);

// Get unread counts per conversation
builder.get(
  '/unread/counts',
  createHandler(collaborationMessagingController, 'getUnreadCounts')
);

export default builder.getRouter();

