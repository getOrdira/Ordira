// src/routes/features/collaboration/collaborationTask.routes.ts
// Task management routes using modular collaboration task controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { collaborationTaskController } from '../../../controllers/features/collaboration/collaborationTask.controller';
import { requireFeature } from '../../../middleware/collaboration/requireFeature.middleware';

const objectIdSchema = Joi.string().hex().length(24);
const uuidSchema = Joi.string().uuid();

const workspaceIdParamsSchema = Joi.object({
  workspaceId: uuidSchema.required()
});

const taskIdParamsSchema = Joi.object({
  workspaceId: uuidSchema.required(),
  taskId: objectIdSchema.required()
});

const itemIdParamsSchema = Joi.object({
  workspaceId: uuidSchema.required(),
  taskId: objectIdSchema.required(),
  itemId: Joi.string().required()
});

const createThreadBodySchema = Joi.object({
  threadType: Joi.string().valid('task', 'discussion', 'approval', 'question').required(),
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(5000).optional(),
  status: Joi.string().valid('todo', 'in_progress', 'review', 'completed', 'blocked', 'cancelled').default('todo'),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  dueDate: Joi.date().optional(),
  assignedTo: Joi.object({
    userId: objectIdSchema.required(),
    userType: Joi.string().valid('brand', 'manufacturer').required()
  }).optional(),
  participants: Joi.array().items(Joi.object({
    userId: objectIdSchema.required(),
    userType: Joi.string().valid('brand', 'manufacturer').required(),
    role: Joi.string().valid('assignee', 'reviewer', 'commenter').optional()
  })).optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
  checklist: Joi.array().items(Joi.object({
    text: Joi.string().trim().min(1).max(500).required(),
    completed: Joi.boolean().default(false)
  })).optional(),
  attachments: Joi.array().items(objectIdSchema).optional(),

  enabledFeatures: Joi.object({
    fileSharing: Joi.boolean().optional(),
    realTimeUpdates: Joi.boolean().optional(),
    taskManagement: Joi.boolean().optional(),
    designReview: Joi.boolean().optional(),
    supplyChainTracking: Joi.boolean().optional(),
    videoUpdates: Joi.boolean().optional(),
    automatedNotifications: Joi.boolean().optional()
  }).optional()
});

const updateTaskStatusBodySchema = Joi.object({
  status: Joi.string().valid('todo', 'in_progress', 'review', 'completed', 'blocked', 'cancelled').required()
});

const addCommentBodySchema = Joi.object({
  message: Joi.string().trim().min(1).max(2000).required(),
  comment: Joi.string().trim().min(1).max(2000).optional() // Alias for message
});

const addParticipantBodySchema = Joi.object({
  userId: objectIdSchema.required(),
  userType: Joi.string().valid('brand', 'manufacturer').required(),
  role: Joi.string().valid('assignee', 'reviewer', 'commenter').default('commenter')
});

const toggleChecklistItemBodySchema = Joi.object({
  completed: Joi.boolean().required()
});

const tasksQuerySchema = Joi.object({
  workspaceId: uuidSchema.optional(),
  threadType: Joi.string().valid('task', 'discussion', 'approval', 'question').optional(),
  isResolved: Joi.boolean().optional(),
  status: Joi.string().valid('todo', 'in_progress', 'review', 'completed', 'blocked', 'cancelled').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  assignedTo: objectIdSchema.optional(),
  overdueOnly: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  dueDateFrom: Joi.date().iso().optional(),
  dueDateTo: Joi.date().iso().optional()
});

const workspaceThreadsQuerySchema = Joi.object({
  threadType: Joi.string().valid('task', 'discussion', 'approval', 'question').optional(),
  isResolved: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const userTasksQuerySchema = Joi.object({
  status: Joi.string().valid('todo', 'in_progress', 'review', 'completed', 'blocked', 'cancelled').optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Create task or discussion thread (requires taskManagement feature)
builder.post(
  '/workspaces/:workspaceId/tasks',
  createHandler(collaborationTaskController, 'createThread'),
  {
    validateParams: workspaceIdParamsSchema,
    validateBody: createThreadBodySchema,
    middleware: [requireFeature('taskManagement')]
  }
);

// Get thread by ID
builder.get(
  '/workspaces/:workspaceId/tasks/:taskId',
  createHandler(collaborationTaskController, 'getThreadById'),
  {
    validateParams: taskIdParamsSchema
  }
);

// Get workspace threads
builder.get(
  '/workspaces/:workspaceId/tasks',
  createHandler(collaborationTaskController, 'getWorkspaceThreads'),
  {
    validateParams: workspaceIdParamsSchema,
    validateQuery: workspaceThreadsQuerySchema
  }
);

// Get threads with filtering and pagination
builder.get(
  '/tasks',
  createHandler(collaborationTaskController, 'getThreads'),
  {
    validateQuery: tasksQuerySchema
  }
);

// Get user's assigned tasks
builder.get(
  '/tasks/user',
  createHandler(collaborationTaskController, 'getUserTasks'),
  {
    validateQuery: userTasksQuerySchema
  }
);

// Update task status
builder.patch(
  '/workspaces/:workspaceId/tasks/:taskId/status',
  createHandler(collaborationTaskController, 'updateTaskStatus'),
  {
    validateParams: taskIdParamsSchema,
    validateBody: updateTaskStatusBodySchema
  }
);

// Add comment to thread
builder.post(
  '/workspaces/:workspaceId/tasks/:taskId/comments',
  createHandler(collaborationTaskController, 'addComment'),
  {
    validateParams: taskIdParamsSchema,
    validateBody: addCommentBodySchema
  }
);

// Add participant to thread
builder.post(
  '/workspaces/:workspaceId/tasks/:taskId/participants',
  createHandler(collaborationTaskController, 'addParticipant'),
  {
    validateParams: taskIdParamsSchema,
    validateBody: addParticipantBodySchema
  }
);

// Resolve thread
builder.post(
  '/workspaces/:workspaceId/tasks/:taskId/resolve',
  createHandler(collaborationTaskController, 'resolveThread'),
  {
    validateParams: taskIdParamsSchema
  }
);

// Toggle checklist item
builder.patch(
  '/workspaces/:workspaceId/tasks/:taskId/checklist/:itemId',
  createHandler(collaborationTaskController, 'toggleChecklistItem'),
  {
    validateParams: itemIdParamsSchema,
    validateBody: toggleChecklistItemBodySchema
  }
);

// Get overdue tasks
builder.get(
  '/tasks/overdue',
  createHandler(collaborationTaskController, 'getOverdueTasks')
);

// Get thread statistics
builder.get(
  '/workspaces/:workspaceId/tasks/stats',
  createHandler(collaborationTaskController, 'getThreadStats'),
  {
    validateParams: workspaceIdParamsSchema
  }
);

export default builder.getRouter();

