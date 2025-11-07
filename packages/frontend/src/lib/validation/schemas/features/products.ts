// src/lib/validation/schemas/features/products.ts
// Frontend validation schemas for product creation and updates.

import Joi from 'joi';

import { commonSchemas } from '../commonSchemas';

const PRODUCT_STATUS_VALUES = ['draft', 'active', 'archived'] as const;

const productSpecificationsSchema = Joi.object()
  .pattern(
    /.*/,
    Joi.alternatives(Joi.string().trim().max(500), Joi.number(), Joi.boolean())
  )
  .max(50)
  .messages({
    'object.max': 'Cannot have more than 50 specifications'
  });

const productBaseSchema = Joi.object({
  businessId: commonSchemas.optionalMongoId,
  manufacturerId: commonSchemas.optionalMongoId,
  title: Joi.string().trim().min(2).max(200).required().messages({
    'string.min': 'Title must be at least 2 characters long',
    'string.max': 'Title cannot exceed 200 characters',
    'any.required': 'Title is required'
  }),
  description: Joi.string().trim().max(2000).optional().messages({
    'string.max': 'Description cannot exceed 2000 characters'
  }),
  price: Joi.number().min(0).max(1_000_000_000).optional().messages({
    'number.min': 'Price must be non-negative',
    'number.max': 'Price exceeds maximum allowed value'
  }),
  sku: Joi.string().trim().max(100).optional().messages({
    'string.max': 'SKU cannot exceed 100 characters'
  }),
  status: Joi.string().valid(...PRODUCT_STATUS_VALUES).optional().messages({
    'any.only': 'Invalid status value'
  }),
  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 20 tags',
      'string.max': 'Tag cannot exceed 50 characters'
    }),
  media: Joi.array().items(commonSchemas.mongoId).optional().messages({
    'string.hex': 'Each media ID must be a valid MongoDB ObjectId'
  }),
  specifications: productSpecificationsSchema.optional()
})
  .custom((value, helpers) => {
    if (!value.businessId && !value.manufacturerId) {
      return helpers.error('any.invalid', {
        message: 'Either businessId or manufacturerId must be provided'
      });
    }

    if (value.tags) {
      const tags = value.tags as string[];
      const lowerTags = tags.map((tag: string) => tag.toLowerCase());
      const duplicates = lowerTags.filter((tag: string, index: number) => lowerTags.indexOf(tag) !== index);
      if (duplicates.length) {
        return helpers.error('any.invalid', { message: 'Tags must be unique' });
      }
    }

    if (value.media) {
      const mediaSet = new Set(value.media);
      if (mediaSet.size !== value.media.length) {
        return helpers.error('any.invalid', { message: 'Media IDs must be unique' });
      }
    }

    return value;
  })
  .messages({
    'any.invalid': '{{#message}}'
  });

const productUpdateSchema = productBaseSchema.fork(['title'], schema => schema.optional());

/**
 * Product feature specific Joi schemas mirroring backend validation behaviour.
 */
export const productsFeatureSchemas = {
  create: productBaseSchema,
  update: productUpdateSchema
} as const;
