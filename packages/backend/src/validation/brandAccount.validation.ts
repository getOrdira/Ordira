// src/validation/brandAccount.validation.ts
import Joi from 'joi';

export const updateBrandAccountSchema = Joi.object({
  profilePictureUrl: Joi.string().uri().optional(),
  description:       Joi.string().max(1000).optional(),
  industry:          Joi.string().max(100).optional(),
  contactEmail:      Joi.string().email().optional(),
  socialUrls:        Joi.array().items(Joi.string().uri()).optional(),
  walletAddress: Joi.string()
  .pattern(/^0x[a-fA-F0-9]{40}$/)
  .optional()
});
