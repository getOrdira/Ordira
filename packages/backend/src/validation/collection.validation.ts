// src/validation/collection.validation.ts
import Joi from 'joi';

export const createCollectionSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().optional(),
  products: Joi.array().items(Joi.string().hex().length(24)).required()
});

export const updateCollectionSchema = createCollectionSchema;