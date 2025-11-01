// src/routes/features/brands/brandCompleteness.routes.ts
// Brand completeness routes using modular brand completeness controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { brandCompletenessController } from '../../../controllers/features/brands/brandCompleteness.controller';

const builder = createRouteBuilder(RouteConfigs.tenant);

const completenessQuerySchema = Joi.object({
  plan: Joi.string().optional(),
  includeRecommendations: Joi.boolean().optional()
});

const configQuerySchema = Joi.object({
  plan: Joi.string().required()
});

builder.get(
  '/profile',
  createHandler(brandCompletenessController, 'calculateBusinessProfileCompleteness'),
  {
    validateQuery: completenessQuerySchema
  }
);

builder.get(
  '/settings',
  createHandler(brandCompletenessController, 'calculateBrandSettingsCompleteness'),
  {
    validateQuery: completenessQuerySchema
  }
);

builder.get(
  '/integrations',
  createHandler(brandCompletenessController, 'calculateIntegrationCompleteness'),
  {
    validateQuery: completenessQuerySchema
  }
);

builder.get(
  '/overall',
  createHandler(brandCompletenessController, 'calculateOverallCompleteness'),
  {
    validateQuery: completenessQuerySchema
  }
);

builder.get(
  '/config/profile',
  createHandler(brandCompletenessController, 'getBusinessProfileConfig'),
  {
    validateQuery: configQuerySchema
  }
);

builder.get(
  '/config/settings',
  createHandler(brandCompletenessController, 'getBrandSettingsConfig'),
  {
    validateQuery: configQuerySchema
  }
);

builder.get(
  '/config/integrations',
  createHandler(brandCompletenessController, 'getIntegrationConfig'),
  {
    validateQuery: configQuerySchema
  }
);

builder.get(
  '/legacy/profile',
  createHandler(brandCompletenessController, 'calculateSimpleProfileCompleteness')
);

builder.get(
  '/legacy/setup',
  createHandler(brandCompletenessController, 'calculateSimpleSetupCompleteness')
);

export default builder.getRouter();

