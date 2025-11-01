// src/routes/integrations/ecommerce/ecommerceProviders.routes.ts
// Ecommerce providers routes using modular ecommerce providers controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { ecommerceProvidersController } from '../../../controllers/integrations/ecommerce/ecommerceProviders.controller';

const providerSchema = Joi.string().valid('shopify', 'wix', 'woocommerce');

const providerParamsSchema = Joi.object({
  provider: providerSchema.required()
});

const builder = createRouteBuilder(RouteConfigs.authenticated);

// List all supported providers
builder.get(
  '/',
  createHandler(ecommerceProvidersController, 'listProviders')
);

// Get provider capabilities
builder.get(
  '/:provider/capabilities',
  createHandler(ecommerceProvidersController, 'getProviderCapabilities'),
  {
    validateParams: providerParamsSchema
  }
);

export default builder.getRouter();