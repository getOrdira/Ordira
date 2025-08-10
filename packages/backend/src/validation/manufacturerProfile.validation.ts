// src/validation/manufacturerProfile.validation.ts
import Joi from 'joi';

/**
 * Schema for manufacturer profile route parameters
 */
export const manufacturerProfileParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Manufacturer ID must be a valid MongoDB ObjectId',
      'any.required': 'Manufacturer ID is required'
    }),

  industry: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Industry parameter cannot exceed 100 characters'
    })
});

/**
 * Schema for listing manufacturer profiles with query parameters
 */
export const listManufacturerProfilesQuerySchema = Joi.object({
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

  industry: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Industry filter cannot exceed 100 characters'
    }),

  verified: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Verified must be a boolean value'
    }),

  minMoq: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.integer': 'Minimum MOQ must be an integer',
      'number.min': 'Minimum MOQ must be at least 1'
    }),

  maxMoq: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.integer': 'Maximum MOQ must be an integer',
      'number.min': 'Maximum MOQ must be at least 1'
    }),

  country: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Country filter cannot exceed 100 characters'
    }),

  city: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'City filter cannot exceed 100 characters'
    }),

  servicesOffered: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Services filter cannot exceed 200 characters'
    }),

  certifications: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Certifications filter cannot exceed 200 characters'
    }),

  hasPortfolio: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Has portfolio must be a boolean value'
    }),

  rating: Joi.number()
    .min(1)
    .max(5)
    .optional()
    .messages({
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5'
    }),

  sortBy: Joi.string()
    .valid('name', 'createdAt', 'rating', 'reviewCount', 'lastActive', 'moq', 'industry')
    .default('rating')
    .messages({
      'any.only': 'Sort by must be one of: name, createdAt, rating, reviewCount, lastActive, moq, industry'
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either "asc" or "desc"'
    }),

  search: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search term cannot exceed 100 characters'
    })
});

/**
 * Schema for advanced manufacturer search
 */
export const manufacturerSearchQuerySchema = Joi.object({
  // Include all basic listing parameters
  ...listManufacturerProfilesQuerySchema.describe().keys,

  // Advanced search parameters
  keywords: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot search for more than 10 keywords',
      'string.max': 'Each keyword cannot exceed 50 characters'
    }),

  capabilities: Joi.array()
    .items(Joi.string().trim().max(100))
    .max(20)
    .optional()
    .messages({
      'array.max': 'Cannot filter by more than 20 capabilities',
      'string.max': 'Each capability cannot exceed 100 characters'
    }),

  productCategories: Joi.array()
    .items(Joi.string().trim().max(100))
    .max(20)
    .optional()
    .messages({
      'array.max': 'Cannot filter by more than 20 product categories',
      'string.max': 'Each category cannot exceed 100 characters'
    }),

  priceRange: Joi.object({
    min: Joi.number().min(0).optional(),
    max: Joi.number().min(0).optional(),
    currency: Joi.string().length(3).uppercase().default('USD').optional()
  }).optional(),

  leadTimeMax: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .optional()
    .messages({
      'number.integer': 'Lead time must be an integer',
      'number.min': 'Lead time must be at least 1 day',
      'number.max': 'Lead time cannot exceed 365 days'
    }),

  radius: Joi.number()
    .min(1)
    .max(10000)
    .optional()
    .messages({
      'number.min': 'Radius must be at least 1 km',
      'number.max': 'Radius cannot exceed 10,000 km'
    }),

  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  })
  .when('radius', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  })
  .messages({
    'any.required': 'Coordinates are required when radius is specified'
  }),

  includeInactive: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Include inactive must be a boolean value'
    })
});

/**
 * All manufacturer profile validation schemas
 */
export const manufacturerProfileValidationSchemas = {
  params: manufacturerProfileParamsSchema,
  listQuery: listManufacturerProfilesQuerySchema,
  search: manufacturerSearchQuerySchema
};