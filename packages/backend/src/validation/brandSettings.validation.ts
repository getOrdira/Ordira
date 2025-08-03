// src/validation/brandSettings.validation.ts
import Joi from 'joi';

export const updateBrandSettingsSchema = Joi.object({
  themeColor: Joi.string().optional(),
  logoUrl: Joi.string().uri().optional(),
  bannerImages: Joi.array().items(Joi.string().uri()).optional(),
  customCss: Joi.string().optional(),

  // Routing & hosting
  subdomain: Joi.string()
    .alphanum()
    .min(3)
    .max(63)
    .optional(),
  customDomain: Joi.string()
    .domain({ tlds: { allow: false } })
    .optional(),

  // E-commerce integrations
  shopifyDomain: Joi.string().domain({ tlds: { allow: false } }).optional(),
  shopifyAccessToken: Joi.string().optional(),
  shopifyWebhookSecret: Joi.string().optional(),

  wooDomain: Joi.string().domain({ tlds: { allow: false } }).optional(),
  wooConsumerKey: Joi.string().optional(),
  wooConsumerSecret: Joi.string().optional(),

  wixDomain: Joi.string().domain({ tlds: { allow: false } }).optional(),
  wixApiKey: Joi.string().optional(),

  // Web3 settings
  certificateWallet: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
});
