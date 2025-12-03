// src/routes/features/collaboration/collaborationWorkspace.routes.ts
// Workspace management routes using modular collaboration workspace controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { collaborationWorkspaceController } from '../../../controllers/features/collaboration/collaborationWorkspace.controller';
import { requireConnection } from '../../../middleware/collaboration/requireConnection.middleware';

const objectIdSchema = Joi.string().hex().length(24);
const uuidSchema = Joi.string().uuid();

const workspaceIdParamsSchema = Joi.object({
  workspaceId: uuidSchema.required()
});

const userIdParamsSchema = Joi.object({
  userId: objectIdSchema.required()
});

const createWorkspaceBodySchema = Joi.object({
  brandId: objectIdSchema.required(),
  manufacturerId: objectIdSchema.required(),
  name: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(2000).optional(),
  type: Joi.string().valid('production_run', 'design_collaboration', 'general').default('general'),
  productionDetails: Joi.object({
    productName: Joi.string().trim().max(200).optional(),
    quantity: Joi.number().integer().min(0).optional(),
    targetDeliveryDate: Joi.date().optional(),
    productionStartDate: Joi.date().optional(),
    productionEndDate: Joi.date().optional(),
    currentStatus: Joi.string().valid('pending', 'in_progress', 'quality_check', 'shipping', 'delivered').optional()
  }).optional(),
  brandMembers: Joi.array().items(Joi.object({
    userId: objectIdSchema.required(),
    role: Joi.string().valid('owner', 'admin', 'member', 'viewer').required()
  })).optional(),
  manufacturerMembers: Joi.array().items(Joi.object({
    userId: objectIdSchema.required(),
    role: Joi.string().valid('owner', 'admin', 'member', 'viewer').required()
  })).optional(),
  // Optional: Override enabled features for the workspace (for testing or admin purposes)
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

const updateWorkspaceBodySchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  description: Joi.string().trim().max(2000).optional(),
  productionDetails: Joi.object({
    productName: Joi.string().trim().max(200).optional(),
    quantity: Joi.number().integer().min(0).optional(),
    targetDeliveryDate: Joi.date().optional(),
    productionStartDate: Joi.date().optional(),
    productionEndDate: Joi.date().optional(),
    currentStatus: Joi.string().valid('pending', 'in_progress', 'quality_check', 'shipping', 'delivered').optional()
  }).optional()
});

const addMemberBodySchema = Joi.object({
  userId: objectIdSchema.required(),
  userType: Joi.string().valid('brand', 'manufacturer').required(),
  role: Joi.string().valid('owner', 'admin', 'member', 'viewer').default('member')
});

const workspacesQuerySchema = Joi.object({
  brandId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  status: Joi.string().valid('active', 'archived', 'completed', 'cancelled').optional(),
  type: Joi.string().valid('production_run', 'design_collaboration', 'general').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  searchQuery: Joi.string().trim().optional()
});

const userWorkspacesQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'archived', 'completed', 'cancelled').optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Create workspace (requires connection)
builder.post(
  '/',
  createHandler(collaborationWorkspaceController, 'createWorkspace'),
  {
    validateBody: createWorkspaceBodySchema,
    middleware: [requireConnection]
  }
);

// Get workspace by ID
builder.get(
  '/:workspaceId',
  createHandler(collaborationWorkspaceController, 'getWorkspaceById'),
  {
    validateParams: workspaceIdParamsSchema
  }
);

// Get workspaces with filtering
builder.get(
  '/',
  createHandler(collaborationWorkspaceController, 'getWorkspaces'),
  {
    validateQuery: workspacesQuerySchema
  }
);

// Get user's workspaces
builder.get(
  '/user/workspaces',
  createHandler(collaborationWorkspaceController, 'getUserWorkspaces'),
  {
    validateQuery: userWorkspacesQuerySchema
  }
);

// Update workspace
builder.put(
  '/:workspaceId',
  createHandler(collaborationWorkspaceController, 'updateWorkspace'),
  {
    validateParams: workspaceIdParamsSchema,
    validateBody: updateWorkspaceBodySchema
  }
);

// Add member to workspace
builder.post(
  '/:workspaceId/members',
  createHandler(collaborationWorkspaceController, 'addMember'),
  {
    validateParams: workspaceIdParamsSchema,
    validateBody: addMemberBodySchema
  }
);

// Remove member from workspace
builder.delete(
  '/:workspaceId/members/:userId',
  createHandler(collaborationWorkspaceController, 'removeMember'),
  {
    validateParams: workspaceIdParamsSchema.keys({ userId: objectIdSchema.required() })
  }
);

// Archive workspace
builder.post(
  '/:workspaceId/archive',
  createHandler(collaborationWorkspaceController, 'archiveWorkspace'),
  {
    validateParams: workspaceIdParamsSchema
  }
);

// Get workspace statistics
builder.get(
  '/:workspaceId/stats',
  createHandler(collaborationWorkspaceController, 'getWorkspaceStats'),
  {
    validateParams: workspaceIdParamsSchema
  }
);

export default builder.getRouter();

