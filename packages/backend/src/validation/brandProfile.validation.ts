// src/validation/brandProfile.validation.ts
import Joi from 'joi';

/**
 * Schema for validating brand profile route parameters
 */
export const brandProfileParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Brand ID must be a valid MongoDB ObjectId',
      'any.required': 'Brand ID is required'
    })
});

/**
 * Schema for brand profile query parameters (for filtering/pagination)
 */
export const brandProfileQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
    
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
    
  search: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search term cannot exceed 100 characters'
    }),
    
  verified: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Verified must be a boolean value'
    }),
    
  industry: Joi.string()
    .trim()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Industry cannot exceed 50 characters'
    })
});

/**
 * All brand profile validation schemas
 */
export const brandProfileValidationSchemas = {
  params: brandProfileParamsSchema,
  query: brandProfileQuerySchema
};