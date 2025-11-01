// src/routes/features/connections/connectionsCollaboration.routes.ts
// Connection collaboration routes using modular connections collaboration controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { connectionsCollaborationController } from '../../../controllers/features/connections/connectionsCollaboration.controller';

const objectIdSchema = Joi.string().hex().length(24);

const collaborationQuerySchema = Joi.object({
  brandId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional()
});

const catalogQuerySchema = collaborationQuerySchema.keys({
  limit: Joi.number().integer().min(1).max(100).optional()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.get(
  '/overview',
  createHandler(connectionsCollaborationController, 'getCollaborationOverview'),
  {
    validateQuery: collaborationQuerySchema
  }
);

builder.get(
  '/catalog',
  createHandler(connectionsCollaborationController, 'getSharedProductCatalog'),
  {
    validateQuery: catalogQuerySchema
  }
);

builder.get(
  '/suggestions',
  createHandler(connectionsCollaborationController, 'suggestNextSteps'),
  {
    validateQuery: collaborationQuerySchema
  }
);

export default builder.getRouter();
