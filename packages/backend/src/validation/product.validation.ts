// src/validation/product.validation.ts
import Joi from 'joi';

export const createProductSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional(),
  media: Joi.array().items(Joi.string().hex().length(24)).required()
});

export const updateProductSchema = createProductSchema;