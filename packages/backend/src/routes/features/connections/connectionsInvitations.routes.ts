// src/routes/features/connections/connectionsInvitations.routes.ts
// Connection invitations routes using modular connection invitations controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { connectionsInvitationsController } from '../../../controllers/features/connections/connectionsInvitations.controller';

const objectIdSchema = Joi.string().hex().length(24);

const invitationTypeSchema = Joi.string().valid('collaboration', 'manufacturing', 'partnership', 'custom');

const sendInvitationBodySchema = Joi.object({
  manufacturerId: objectIdSchema.required(),
  invitationType: invitationTypeSchema.optional(),
  message: Joi.string().trim().max(1000).optional(),
  terms: Joi.object().unknown(true).optional()
});

const bulkInviteBodySchema = Joi.object({
  manufacturerIds: Joi.array().items(objectIdSchema).min(1).max(100).required(),
  invitationType: invitationTypeSchema.optional(),
  message: Joi.string().trim().max(1000).optional()
});

const respondInvitationBodySchema = Joi.object({
  inviteId: objectIdSchema.required(),
  accept: Joi.boolean().required(),
  message: Joi.string().trim().max(1000).optional()
});

const inviteIdParamsSchema = Joi.object({
  inviteId: objectIdSchema.required()
});

const manufacturerParamsSchema = Joi.object({
  manufacturerId: objectIdSchema.required()
});

const connectionStatusParamsSchema = Joi.object({
  brandId: objectIdSchema.required(),
  manufacturerId: objectIdSchema.required()
});

const recentActivityQuerySchema = Joi.object({
  entityType: Joi.string().valid('brand', 'manufacturer').optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
  entityId: objectIdSchema.optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.post(
  '/',
  createHandler(connectionsInvitationsController, 'sendInvitation'),
  {
    validateBody: sendInvitationBodySchema
  }
);

builder.post(
  '/bulk',
  createHandler(connectionsInvitationsController, 'bulkInvite'),
  {
    validateBody: bulkInviteBodySchema
  }
);

builder.post(
  '/respond',
  createHandler(connectionsInvitationsController, 'respondInvitation'),
  {
    validateBody: respondInvitationBodySchema
  }
);

builder.get(
  '/brand',
  createHandler(connectionsInvitationsController, 'listBrandInvitations')
);

builder.get(
  '/brand/pending',
  createHandler(connectionsInvitationsController, 'listPendingBrandInvitations')
);

builder.get(
  '/brand/stats',
  createHandler(connectionsInvitationsController, 'getBrandConnectionStats')
);

builder.get(
  '/brand/connected-manufacturers',
  createHandler(connectionsInvitationsController, 'getConnectedManufacturers')
);

builder.get(
  '/manufacturer',
  createHandler(connectionsInvitationsController, 'listManufacturerInvitations')
);

builder.get(
  '/manufacturer/pending',
  createHandler(connectionsInvitationsController, 'listPendingManufacturerInvitations')
);

builder.get(
  '/manufacturer/stats',
  createHandler(connectionsInvitationsController, 'getManufacturerConnectionStats')
);

builder.get(
  '/manufacturer/connected-brands',
  createHandler(connectionsInvitationsController, 'getConnectedBrands')
);

builder.get(
  '/status/:brandId/:manufacturerId',
  createHandler(connectionsInvitationsController, 'checkConnectionStatus'),
  {
    validateParams: connectionStatusParamsSchema
  }
);

builder.delete(
  '/connections/:manufacturerId',
  createHandler(connectionsInvitationsController, 'removeConnection'),
  {
    validateParams: manufacturerParamsSchema
  }
);

builder.get(
  '/activity',
  createHandler(connectionsInvitationsController, 'getRecentActivity'),
  {
    validateQuery: recentActivityQuerySchema
  }
);

builder.get(
  '/:inviteId',
  createHandler(connectionsInvitationsController, 'getInvitationById'),
  {
    validateParams: inviteIdParamsSchema
  }
);

builder.delete(
  '/:inviteId',
  createHandler(connectionsInvitationsController, 'cancelInvitation'),
  {
    validateParams: inviteIdParamsSchema
  }
);

export default builder.getRouter();
