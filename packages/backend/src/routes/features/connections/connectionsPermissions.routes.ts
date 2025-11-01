// src/routes/features/connections/connectionsPermissions.routes.ts
// Connection permissions routes using modular connections permissions controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { connectionsPermissionsController } from '../../../controllers/features/connections/connectionsPermissions.controller';

const objectIdSchema = Joi.string().hex().length(24);

const featureKeySchema = Joi.string().valid(
  'analytics',
  'supplyChain',
  'productData',
  'messaging',
  'fileSharing',
  'recommendations'
);

const sharedPairQuerySchema = Joi.object({
  brandId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional()
});

const featureRequestBodySchema = Joi.object({
  brandId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  feature: featureKeySchema.required()
});

const featureToggleBodySchema = Joi.object({
  brandId: objectIdSchema.optional(),
  manufacturerId: objectIdSchema.optional(),
  analytics: Joi.boolean().optional(),
  supplyChain: Joi.boolean().optional(),
  productData: Joi.boolean().optional(),
  messaging: Joi.boolean().optional(),
  fileSharing: Joi.boolean().optional(),
  recommendations: Joi.boolean().optional()
}).or('analytics', 'supplyChain', 'productData', 'messaging', 'fileSharing', 'recommendations');

const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.get(
  '/access',
  createHandler(connectionsPermissionsController, 'getFeatureAccess'),
  {
    validateQuery: sharedPairQuerySchema
  }
);

builder.post(
  '/can-use',
  createHandler(connectionsPermissionsController, 'canUseFeature'),
  {
    validateBody: featureRequestBodySchema
  }
);

builder.post(
  '/explain',
  createHandler(connectionsPermissionsController, 'explainFeatureAccess'),
  {
    validateBody: featureRequestBodySchema
  }
);

builder.post(
  '/validate-toggle',
  createHandler(connectionsPermissionsController, 'validateFeatureTogglePayload'),
  {
    validateBody: featureToggleBodySchema
  }
);

export default builder.getRouter();
