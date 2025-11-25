// src/routes/features/brands/brandIntegrations.routes.ts
// Brand integrations routes using modular brand integrations controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { brandIntegrationsController } from '../../../controllers/features/brands/brandIntegrations.controller';

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

builder.get(
  '/status',
  createHandler(brandIntegrationsController, 'getIntegrationStatus')
);

builder.post(
  '/shopify/test',
  createHandler(brandIntegrationsController, 'testShopifyConnection'),
  {
    validateBody: Joi.object({
      shopDomain: Joi.string().trim().required(),
      accessToken: Joi.string().trim().required()
    })
  }
);

builder.post(
  '/shopify',
  createHandler(brandIntegrationsController, 'configureShopifyIntegration'),
  {
    validateBody: Joi.object({
      shopDomain: Joi.string().trim().required(),
      accessToken: Joi.string().trim().required(),
      webhookSecret: Joi.string().trim().optional()
    })
  }
);

builder.post(
  '/woocommerce',
  createHandler(brandIntegrationsController, 'configureWooCommerceIntegration'),
  {
    validateBody: Joi.object({
      wooDomain: Joi.string().trim().required(),
      wooConsumerKey: Joi.string().trim().required(),
      wooConsumerSecret: Joi.string().trim().required()
    })
  }
);

builder.post(
  '/wix',
  createHandler(brandIntegrationsController, 'configureWixIntegration'),
  {
    validateBody: Joi.object({
      wixDomain: Joi.string().trim().required(),
      wixApiKey: Joi.string().trim().required(),
      wixRefreshToken: Joi.string().trim().optional()
    })
  }
);

builder.put(
  '/:type',
  createHandler(brandIntegrationsController, 'updateIntegration'),
  {
    validateParams: Joi.object({
      type: Joi.string().trim().required()
    }),
    validateBody: Joi.object({
      credentials: Joi.object().required()
    })
  }
);

builder.delete(
  '/:type',
  createHandler(brandIntegrationsController, 'removeIntegration'),
  {
    validateParams: Joi.object({
      type: Joi.string().trim().required()
    })
  }
);

builder.get(
  '/configured',
  createHandler(brandIntegrationsController, 'getConfiguredIntegrations')
);

builder.get(
  '/available',
  createHandler(brandIntegrationsController, 'getAvailableIntegrations')
);

builder.get(
  '/permissions',
  createHandler(brandIntegrationsController, 'checkIntegrationPermissions'),
  {
    validateQuery: Joi.object({
      integrationType: Joi.string().trim().required()
    })
  }
);

builder.get(
  '/statistics',
  createHandler(brandIntegrationsController, 'getIntegrationStatistics')
);

export default builder.getRouter();
