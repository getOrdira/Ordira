// src/routes/features/collaboration/collaborationFile.routes.ts
// File management routes using modular collaboration file controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { collaborationFileController } from '../../../controllers/features/collaboration/collaborationFile.controller';
import { requireFeature } from '../../../middleware/collaboration/requireFeature.middleware';

const objectIdSchema = Joi.string().hex().length(24);
const uuidSchema = Joi.string().uuid();

const workspaceIdParamsSchema = Joi.object({
  workspaceId: uuidSchema.required()
});

const fileIdParamsSchema = Joi.object({
  workspaceId: uuidSchema.required(),
  fileId: objectIdSchema.required()
});

const annotationIdParamsSchema = Joi.object({
  workspaceId: uuidSchema.required(),
  fileId: objectIdSchema.required(),
  annotationId: Joi.string().required()
});

const uploadFileBodySchema = Joi.object({
  fileName: Joi.string().trim().min(1).max(255).required(),
  fileCategory: Joi.string().valid('design', 'technical_spec', 'sample_photo', 'production_photo', 'contract', 'certificate', 'other').required(),
  fileSize: Joi.number().integer().min(0).required(),
  mimeType: Joi.string().trim().required(),
  s3Key: Joi.string().trim().required(),
  s3Url: Joi.string().uri().required(),
  description: Joi.string().trim().max(2000).optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).optional(),
  requiresApproval: Joi.boolean().default(false),
  designMetadata: Joi.object({
    format: Joi.string().valid('3D', '2D', 'CAD', 'PDF', 'image').optional(),
    dimensions: Joi.object({
      width: Joi.number().min(0).optional(),
      height: Joi.number().min(0).optional(),
      depth: Joi.number().min(0).optional()
    }).optional(),
    units: Joi.string().max(20).optional(),
    software: Joi.string().max(100).optional(),
    renderUrl: Joi.string().uri().optional()
  }).optional(),
  
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

const createVersionBodySchema = uploadFileBodySchema;

const addAnnotationBodySchema = Joi.object({
  // Accept both 'coordinates' and 'position' as field names
  coordinates: Joi.object({
    x: Joi.number().min(0).max(1).required(),
    y: Joi.number().min(0).max(1).required()
  }).optional(),
  position: Joi.object({
    x: Joi.number().min(0).max(1).required(),
    y: Joi.number().min(0).max(1).required()
  }).optional(),
  // Accept both 'comment' and 'content' as field names
  comment: Joi.string().trim().min(1).max(2000).optional(),
  content: Joi.string().trim().min(1).max(2000).optional(),
  category: Joi.string().valid('feedback', 'issue', 'question', 'approval').optional(),
  type: Joi.string().valid('comment', 'markup', 'highlight', 'pin').optional(),
  // Allow additional fields from test script
  annotationId: Joi.string().optional(),
  createdBy: Joi.string().hex().length(24).optional(),
  creatorType: Joi.string().valid('brand', 'manufacturer').optional()
}).or('coordinates', 'position').or('comment', 'content');

const approveFileBodySchema = Joi.object({
  comments: Joi.string().trim().max(2000).optional()
});

const rejectFileBodySchema = Joi.object({
  reason: Joi.string().trim().min(1).max(2000).required()
});

const filesQuerySchema = Joi.object({
  workspaceId: uuidSchema.optional(),
  category: Joi.string().valid('design', 'technical_spec', 'sample_photo', 'production_photo', 'contract', 'certificate', 'other').optional(),
  approvalStatus: Joi.string().valid('pending', 'approved', 'rejected', 'needs_changes').optional(),
  latestOnly: Joi.boolean().optional(),
  uploadedBy: objectIdSchema.optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

const workspaceFilesQuerySchema = Joi.object({
  category: Joi.string().valid('design', 'technical_spec', 'sample_photo', 'production_photo', 'contract', 'certificate', 'other').optional(),
  latestOnly: Joi.boolean().optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// Upload file (requires fileSharing feature)
builder.post(
  '/workspaces/:workspaceId/files',
  createHandler(collaborationFileController, 'uploadFile'),
  {
    validateParams: workspaceIdParamsSchema,
    validateBody: uploadFileBodySchema,
    middleware: [requireFeature('fileSharing')]
  }
);

// Get file by ID
builder.get(
  '/workspaces/:workspaceId/files/:fileId',
  createHandler(collaborationFileController, 'getFileById'),
  {
    validateParams: fileIdParamsSchema
  }
);

// Get workspace files
builder.get(
  '/workspaces/:workspaceId/files',
  createHandler(collaborationFileController, 'getWorkspaceFiles'),
  {
    validateParams: workspaceIdParamsSchema,
    validateQuery: workspaceFilesQuerySchema
  }
);

// Get files with filtering and pagination
builder.get(
  '/files',
  createHandler(collaborationFileController, 'getFiles'),
  {
    validateQuery: filesQuerySchema
  }
);

// Create new file version
builder.post(
  '/workspaces/:workspaceId/files/:fileId/versions',
  createHandler(collaborationFileController, 'createNewVersion'),
  {
    validateParams: fileIdParamsSchema,
    validateBody: createVersionBodySchema,
    middleware: [requireFeature('fileSharing')]
  }
);

// Add annotation to file
builder.post(
  '/workspaces/:workspaceId/files/:fileId/annotations',
  createHandler(collaborationFileController, 'addAnnotation'),
  {
    validateParams: fileIdParamsSchema,
    validateBody: addAnnotationBodySchema,
    middleware: [requireFeature('fileSharing')]
  }
);

// Resolve annotation
builder.post(
  '/workspaces/:workspaceId/files/:fileId/annotations/:annotationId/resolve',
  createHandler(collaborationFileController, 'resolveAnnotation'),
  {
    validateParams: annotationIdParamsSchema,
    middleware: [requireFeature('fileSharing')]
  }
);

// Approve file
builder.post(
  '/workspaces/:workspaceId/files/:fileId/approve',
  createHandler(collaborationFileController, 'approveFile'),
  {
    validateParams: fileIdParamsSchema,
    validateBody: approveFileBodySchema,
    middleware: [requireFeature('fileSharing')]
  }
);

// Reject file
builder.post(
  '/workspaces/:workspaceId/files/:fileId/reject',
  createHandler(collaborationFileController, 'rejectFile'),
  {
    validateParams: fileIdParamsSchema,
    validateBody: rejectFileBodySchema,
    middleware: [requireFeature('fileSharing')]
  }
);

// Delete file (soft delete)
builder.delete(
  '/workspaces/:workspaceId/files/:fileId',
  createHandler(collaborationFileController, 'deleteFile'),
  {
    validateParams: fileIdParamsSchema,
    middleware: [requireFeature('fileSharing')]
  }
);

// Get pending approvals
builder.get(
  '/workspaces/:workspaceId/files/pending-approvals',
  createHandler(collaborationFileController, 'getPendingApprovals'),
  {
    validateParams: workspaceIdParamsSchema,
    middleware: [requireFeature('fileSharing')]
  }
);

// Get file statistics
builder.get(
  '/workspaces/:workspaceId/files/stats',
  createHandler(collaborationFileController, 'getFileStats'),
  {
    validateParams: workspaceIdParamsSchema,
    middleware: [requireFeature('fileSharing')]
  }
);

export default builder.getRouter();

