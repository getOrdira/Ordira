// src/validation/media.validation.ts
import Joi from 'joi';

/**
 * Schema for media upload
 */
export const uploadMediaSchema = Joi.object({
  title: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Title cannot exceed 200 characters'
    }),

  description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),

  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 20 tags',
      'string.max': 'Each tag cannot exceed 50 characters'
    }),

  category: Joi.string()
    .valid('image', 'video', 'document', 'audio', 'archive', 'other')
    .optional()
    .messages({
      'any.only': 'Category must be one of: image, video, document, audio, archive, other'
    }),

  isPublic: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'isPublic must be a boolean value'
    }),

  folder: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Folder name cannot exceed 100 characters'
    }),

  // File metadata (usually auto-detected but can be overridden)
  mimeType: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'MIME type cannot exceed 100 characters'
    }),

  alt: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Alt text cannot exceed 500 characters'
    })
});

/**
 * Schema for listing media with query parameters
 */
export const listMediaQuerySchema = Joi.object({
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

  category: Joi.string()
    .valid('image', 'video', 'document', 'audio', 'archive', 'other')
    .optional()
    .messages({
      'any.only': 'Category must be one of: image, video, document, audio, archive, other'
    }),

  folder: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Folder filter cannot exceed 100 characters'
    }),

  isPublic: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isPublic must be a boolean value'
    }),

  search: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search term cannot exceed 100 characters'
    }),

  tags: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Tags filter cannot exceed 200 characters'
    }),

  mimeType: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'MIME type filter cannot exceed 100 characters'
    }),

  minSize: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.integer': 'Minimum size must be an integer',
      'number.min': 'Minimum size cannot be negative'
    }),

  maxSize: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.integer': 'Maximum size must be an integer',
      'number.min': 'Maximum size cannot be negative'
    }),

  startDate: Joi.date()
    .optional(),

  endDate: Joi.date()
    .greater(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.greater': 'End date must be after start date'
    }),

  sortBy: Joi.string()
    .valid('filename', 'createdAt', 'updatedAt', 'size', 'category', 'title')
    .default('createdAt')
    .messages({
      'any.only': 'Sort by must be one of: filename, createdAt, updatedAt, size, category, title'
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be either "asc" or "desc"'
    })
});

/**
 * Schema for media route parameters
 */
export const mediaParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Media ID must be a valid MongoDB ObjectId',
      'any.required': 'Media ID is required'
    }),

  mediaType: Joi.string()
    .valid('images', 'videos', 'documents', 'audio', 'archives', 'other')
    .optional()
    .messages({
      'any.only': 'Media type must be one of: images, videos, documents, audio, archives, other'
    })
});

/**
 * Schema for updating media metadata
 */
export const updateMediaMetadataSchema = Joi.object({
  title: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Title cannot exceed 200 characters'
    }),

  description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),

  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(20)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 20 tags',
      'string.max': 'Each tag cannot exceed 50 characters'
    }),

  category: Joi.string()
    .valid('image', 'video', 'document', 'audio', 'archive', 'other')
    .optional()
    .messages({
      'any.only': 'Category must be one of: image, video, document, audio, archive, other'
    }),

  isPublic: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isPublic must be a boolean value'
    }),

  folder: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Folder name cannot exceed 100 characters'
    }),

  alt: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Alt text cannot exceed 500 characters'
    })
});

/**
 * Schema for bulk media operations
 */
export const bulkDeleteMediaSchema = Joi.object({
  mediaIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one media ID must be provided',
      'array.max': 'Cannot delete more than 100 media files at once',
      'string.pattern.base': 'Each media ID must be a valid MongoDB ObjectId',
      'any.required': 'Media IDs array is required'
    }),

  permanent: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Permanent must be a boolean value'
    })
});

/**
 * All media validation schemas
 */
export const mediaValidationSchemas = {
  upload: uploadMediaSchema,
  listQuery: listMediaQuerySchema,
  params: mediaParamsSchema,
  updateMetadata: updateMediaMetadataSchema,
  bulkDelete: bulkDeleteMediaSchema
};