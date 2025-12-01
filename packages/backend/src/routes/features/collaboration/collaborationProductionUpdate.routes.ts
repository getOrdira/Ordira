// src/routes/features/collaboration/collaborationProductionUpdate.routes.ts
// Production update routes using modular collaboration production update controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { collaborationProductionUpdateController } from '../../../controllers/features/collaboration/collaborationProductionUpdate.controller';
import { requireFeature } from '../../../middleware/collaboration/requireFeature.middleware';

const objectIdSchema = Joi.string().hex().length(24);
const uuidSchema = Joi.string().uuid();

const workspaceIdParamsSchema = Joi.object({
  workspaceId: uuidSchema.required()
});

const updateIdParamsSchema = Joi.object({
  workspaceId: uuidSchema.required(),
  updateId: objectIdSchema.required()
});

const createUpdateBodySchema = Joi.object({
  updateType: Joi.string().valid('status', 'milestone', 'delay', 'quality', 'general').required(),
  title: Joi.string().trim().min(1).max(200).required(),
  message: Joi.string().trim().min(1).max(5000).required(),
  status: Joi.string().valid('on_track', 'at_risk', 'delayed', 'completed').optional(),
  milestone: Joi.string().trim().max(200).optional(),
  delayInfo: Joi.object({
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    expectedDelayDays: Joi.number().integer().min(0).optional(),
    reason: Joi.string().trim().max(1000).optional()
  }).optional(),
  qualityMetrics: Joi.object({
    passRate: Joi.number().min(0).max(100).optional(),
    defectsFound: Joi.number().integer().min(0).optional(),
    notes: Joi.string().trim().max(2000).optional()
  }).optional(),
  attachments: Joi.array().items(objectIdSchema).optional(),
  isUrgent: Joi.boolean().default(false),
  notifyBrand: Joi.boolean().default(true)
});

const addCommentBodySchema = Joi.object({
  message: Joi.string().trim().min(1).max(2000).required()
});

const updatesQuerySchema = Joi.object({
  workspaceId: uuidSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  updateType: Joi.string().valid('status', 'milestone', 'delay', 'quality', 'general').optional(),
  unviewedOnly: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional()
});

const workspaceUpdatesQuerySchema = Joi.object({
  updateType: Joi.string().valid('status', 'milestone', 'delay', 'quality', 'general').optional(),
  unviewedOnly: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Create production update (requires realTimeUpdates feature)
builder.post(
  '/workspaces/:workspaceId/updates',
  createHandler(collaborationProductionUpdateController, 'createUpdate'),
  {
    validateParams: workspaceIdParamsSchema,
    validateBody: createUpdateBodySchema,
    middleware: [requireFeature('realTimeUpdates')]
  }
);

// Get update by ID
builder.get(
  '/workspaces/:workspaceId/updates/:updateId',
  createHandler(collaborationProductionUpdateController, 'getUpdateById'),
  {
    validateParams: updateIdParamsSchema
  }
);

// Get workspace updates
builder.get(
  '/workspaces/:workspaceId/updates',
  createHandler(collaborationProductionUpdateController, 'getWorkspaceUpdates'),
  {
    validateParams: workspaceIdParamsSchema,
    validateQuery: workspaceUpdatesQuerySchema
  }
);

// Get updates with filtering and pagination
builder.get(
  '/updates',
  createHandler(collaborationProductionUpdateController, 'getUpdates'),
  {
    validateQuery: updatesQuerySchema
  }
);

// Mark update as viewed
builder.post(
  '/workspaces/:workspaceId/updates/:updateId/viewed',
  createHandler(collaborationProductionUpdateController, 'markAsViewed'),
  {
    validateParams: updateIdParamsSchema
  }
);

// Add comment to update
builder.post(
  '/workspaces/:workspaceId/updates/:updateId/comments',
  createHandler(collaborationProductionUpdateController, 'addComment'),
  {
    validateParams: updateIdParamsSchema,
    validateBody: addCommentBodySchema
  }
);

// Get unviewed updates for user
builder.get(
  '/updates/unviewed',
  createHandler(collaborationProductionUpdateController, 'getUnviewedUpdates')
);

// Get update statistics
builder.get(
  '/workspaces/:workspaceId/updates/stats',
  createHandler(collaborationProductionUpdateController, 'getUpdateStats'),
  {
    validateParams: workspaceIdParamsSchema
  }
);

export default builder.getRouter();

