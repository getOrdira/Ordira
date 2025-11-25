// src/routes/features/brands/brandSettings.routes.ts
// Brand settings routes using modular brand settings controller

import Joi from 'joi';
import { createRouteBuilder, RouteConfigs, createHandler } from '../../core/base.routes';
import { brandSettingsController } from '../../../controllers/features/brands/brandSettings.controller';

// Use authenticated config for direct API access without tenant resolution
const builder = createRouteBuilder(RouteConfigs.authenticated);

const updateBrandSettingsSchema = Joi.object({
  themeColor: Joi.string().pattern(/^#([0-9A-F]{3}){1,2}$/i).optional(),
  logoUrl: Joi.string().uri().optional(),
  bannerImages: Joi.array().items(Joi.string().uri()).max(5).optional(),
  customCss: Joi.string().max(10000).optional(),
  subdomain: Joi.string().alphanum().min(3).max(63).lowercase().pattern(/^[a-z0-9]+$/).optional(),
  customDomain: Joi.string().max(100).optional(),
  certificateWallet: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  voteContract: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  nftContract: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  chainId: Joi.number().integer().optional(),
  shopifyIntegration: Joi.object({
    shopifyDomain: Joi.string().max(200).optional(),
    shopifyAccessToken: Joi.string().max(500).optional(),
    shopifyWebhookSecret: Joi.string().max(500).optional(),
    syncProducts: Joi.boolean().optional(),
    syncOrders: Joi.boolean().optional()
  }).optional(),
  wooCommerceIntegration: Joi.object({
    wooDomain: Joi.string().max(200).optional(),
    wooConsumerKey: Joi.string().max(200).optional(),
    wooConsumerSecret: Joi.string().max(200).optional(),
    apiVersion: Joi.string().max(10).optional(),
    syncInterval: Joi.number().integer().min(0).optional()
  }).optional(),
  wixIntegration: Joi.object({
    wixDomain: Joi.string().max(200).optional(),
    wixApiKey: Joi.string().max(200).optional(),
    wixRefreshToken: Joi.string().max(500).optional(),
    syncProducts: Joi.boolean().optional(),
    syncOrders: Joi.boolean().optional()
  }).optional(),
  emailNotifications: Joi.object({
    newConnections: Joi.boolean().optional(),
    productUpdates: Joi.boolean().optional(),
    systemAlerts: Joi.boolean().optional(),
    marketingEmails: Joi.boolean().optional()
  }).optional(),
  privacySettings: Joi.object({
    profileVisibility: Joi.string().valid('public', 'private', 'connections_only').optional(),
    showContactInfo: Joi.boolean().optional(),
    allowDirectMessages: Joi.boolean().optional(),
    dataSharing: Joi.boolean().optional()
  }).optional()
});

builder.get(
  '/',
  createHandler(brandSettingsController, 'getSettings')
);

builder.put(
  '/',
  createHandler(brandSettingsController, 'updateSettings'),
  {
    validateBody: updateBrandSettingsSchema
  }
);

builder.post(
  '/integration/test',
  createHandler(brandSettingsController, 'testIntegration'),
  {
    validateBody: Joi.object({
      integrationType: Joi.string().valid('shopify', 'woocommerce', 'wix').required(),
      credentials: Joi.object().required()
    })
  }
);

builder.post(
  '/domain/validate',
  createHandler(brandSettingsController, 'validateDomain'),
  {
    validateBody: Joi.object({
      domain: Joi.string().trim().required(),
      subdomain: Joi.string().trim().optional()
    })
  }
);

builder.post(
  '/wallet/validate',
  createHandler(brandSettingsController, 'validateWallet'),
  {
    validateBody: Joi.object({
      walletAddress: Joi.string().trim().required(),
      signature: Joi.string().trim().optional(),
      message: Joi.string().trim().optional()
    })
  }
);

builder.get(
  '/export',
  createHandler(brandSettingsController, 'exportSettings'),
  {
    validateQuery: Joi.object({
      format: Joi.string().valid('json', 'yaml', 'csv', 'xml').required(),
      includeSecrets: Joi.boolean().optional()
    })
  }
);

builder.post(
  '/import',
  createHandler(brandSettingsController, 'importSettings'),
  {
    validateBody: Joi.object({
      settings: Joi.any().required(),
      format: Joi.string().valid('json', 'yaml', 'csv', 'xml').required(),
      overwrite: Joi.boolean().optional()
    })
  }
);

builder.get(
  '/integrations/status',
  createHandler(brandSettingsController, 'getIntegrationStatus')
);

builder.post(
  '/integrations/sync',
  createHandler(brandSettingsController, 'syncIntegration'),
  {
    validateBody: Joi.object({
      integrationType: Joi.string().valid('shopify', 'woocommerce', 'wix').required()
    })
  }
);

builder.get(
  '/domain/setup-instructions',
  createHandler(brandSettingsController, 'getDomainSetupInstructions')
);

builder.get(
  '/health',
  createHandler(brandSettingsController, 'getSettingsHealth')
);

export default builder.getRouter();
