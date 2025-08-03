// src/validation/manufacturerAccount.validation.ts
import Joi from 'joi';

export const updateManufacturerAccountSchema = Joi.object({
  profilePictureUrl: Joi.string().uri().optional(),
  description:       Joi.string().max(1000).optional(),
  servicesOffered:   Joi.array().items(Joi.string().max(100)).optional(),
  moq:               Joi.number().min(0).optional(),
  industry:          Joi.string().max(100).optional(),
  contactEmail:      Joi.string().email().optional(),
  socialUrls:        Joi.array().items(Joi.string().uri()).optional()

});
