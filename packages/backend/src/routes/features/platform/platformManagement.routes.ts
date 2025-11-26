// src/routes/features/platform/platformManagement.routes.ts
// Routes for voting platform management operations

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { platformManagementController } from '../../../controllers/features/platform/platformManagement.controller';

const objectIdSchema = Joi.string().hex().length(24);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createPlatformBodySchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).min(3).max(100).optional(),
  description: Joi.string().trim().max(2000).optional(),
  templateId: Joi.string().valid('modern', 'minimal', 'classic', 'vibrant', 'professional').optional(),
  visibility: Joi.string().valid('public', 'private', 'unlisted').optional(),

  // Scheduling
  timezone: Joi.string().trim().max(100).optional(),
  startTime: Joi.alternatives().try(Joi.string().isoDate(), Joi.date()).optional(),
  endTime: Joi.alternatives().try(Joi.string().isoDate(), Joi.date()).optional(),

  // Email gating
  emailGatingEnabled: Joi.boolean().optional(),
  allowedDomains: Joi.array().items(Joi.string().trim().max(100)).optional(),
  allowedEmails: Joi.array().items(Joi.string().email()).optional(),
  blockDisposableEmails: Joi.boolean().optional(),

  // Branding
  logoUrl: Joi.string().uri().max(500).optional(),
  primaryColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  secondaryColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  backgroundColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  textColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  fontFamily: Joi.string().trim().max(100).optional(),

  // Blockchain configuration (dual-mode support)
  blockchainEnabled: Joi.boolean().optional(),
  blockchainMode: Joi.string().valid('off-chain', 'on-chain').optional(),
  createProposal: Joi.boolean().optional(),
  proposalDuration: Joi.number().integer().min(3600).max(7776000).optional(), // 1 hour to 90 days
  batchThreshold: Joi.number().integer().min(1).max(10000).optional()
});

const updatePlatformBodySchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).optional(),
  description: Joi.string().trim().max(2000).optional(),
  visibility: Joi.string().valid('public', 'private', 'unlisted').optional(),

  // Scheduling
  startTime: Joi.alternatives().try(Joi.string().isoDate(), Joi.date()).optional(),
  endTime: Joi.alternatives().try(Joi.string().isoDate(), Joi.date()).optional(),

  // Branding
  logoUrl: Joi.string().uri().max(500).optional().allow(''),
  primaryColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  secondaryColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  backgroundColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  textColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  customCSS: Joi.string().trim().max(10000).optional().allow(''),

  // Response settings
  allowMultipleResponses: Joi.boolean().optional(),
  requireLogin: Joi.boolean().optional(),
  showResultsAfterVote: Joi.boolean().optional()
}).min(1);

const toggleBlockchainBodySchema = Joi.object({
  enabled: Joi.boolean().required(),
  mode: Joi.string().valid('off-chain', 'on-chain').optional()
});

const platformIdParamsSchema = Joi.object({
  platformId: objectIdSchema.required()
});

// ============================================
// ROUTE BUILDER
// ============================================

// Use authenticated config for direct API access
const builder = createRouteBuilder(RouteConfigs.authenticated);

// Create platform
builder.post(
  '/',
  createHandler(platformManagementController, 'createPlatform'),
  {
    validateBody: createPlatformBodySchema
  }
);

// Update platform
builder.put(
  '/:platformId',
  createHandler(platformManagementController, 'updatePlatform'),
  {
    validateParams: platformIdParamsSchema,
    validateBody: updatePlatformBodySchema
  }
);

// Toggle blockchain mode for platform
builder.patch(
  '/:platformId/blockchain',
  createHandler(platformManagementController, 'toggleBlockchainMode'),
  {
    validateParams: platformIdParamsSchema,
    validateBody: toggleBlockchainBodySchema
  }
);

// Publish platform (make it live)
builder.post(
  '/:platformId/publish',
  createHandler(platformManagementController, 'publishPlatform'),
  {
    validateParams: platformIdParamsSchema
  }
);

// Pause platform
builder.post(
  '/:platformId/pause',
  createHandler(platformManagementController, 'pausePlatform'),
  {
    validateParams: platformIdParamsSchema
  }
);

// Archive platform
builder.post(
  '/:platformId/archive',
  createHandler(platformManagementController, 'archivePlatform'),
  {
    validateParams: platformIdParamsSchema
  }
);

// Delete platform
builder.delete(
  '/:platformId',
  createHandler(platformManagementController, 'deletePlatform'),
  {
    validateParams: platformIdParamsSchema
  }
);

export default builder.getRouter();

