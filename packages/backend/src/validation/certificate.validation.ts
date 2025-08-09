// src/validation/certificate.validation.ts
import Joi from 'joi';

/**
 * Schema for creating a single certificate
 */
export const createCertificateSchema = Joi.object({
  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Product ID must be a valid MongoDB ObjectId',
      'any.required': 'Product ID is required'
    }),

  recipient: Joi.string()
    .trim()
    .custom((value, helpers) => {
      // Validate email or Ethereum address
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
      
      if (!emailRegex.test(value) && !ethAddressRegex.test(value)) {
        return helpers.error('recipient.invalidFormat');
      }
      
      return value;
    })
    .required()
    .messages({
      'recipient.invalidFormat': 'Recipient must be a valid email address or Ethereum wallet address',
      'any.required': 'Recipient is required'
    }),

  contactMethod: Joi.string()
    .valid('email', 'wallet')
    .default('email')
    .messages({
      'any.only': 'Contact method must be either "email" or "wallet"'
    }),

  // Optional certificate metadata
  certificateData: Joi.object({
    serialNumber: Joi.string().trim().max(100).optional(),
    manufacturingDate: Joi.date().max('now').optional(),
    expiryDate: Joi.date().greater('now').optional(),
    batchNumber: Joi.string().trim().max(50).optional(),
    qualityCertifications: Joi.array().items(Joi.string().max(100)).max(10).optional()
  }).optional()
});

/**
 * Schema for batch certificate creation
 */
export const batchCreateCertificatesSchema = Joi.object({
  certificates: Joi.array()
    .items(createCertificateSchema)
    .min(1)
    .max(100) // Limit batch size
    .required()
    .messages({
      'array.min': 'At least one certificate must be provided',
      'array.max': 'Cannot create more than 100 certificates at once',
      'any.required': 'Certificates array is required'
    })
});

/**
 * Schema for certificate route parameters
 */
export const certificateParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Certificate ID must be a valid MongoDB ObjectId',
      'any.required': 'Certificate ID is required'
    })
});

/**
 * Schema for listing certificates with query parameters
 */
export const listCertificatesQuerySchema = Joi.object({
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

  status: Joi.string()
    .valid('pending', 'minted', 'failed', 'transferred')
    .optional()
    .messages({
      'any.only': 'Status must be one of: pending, minted, failed, transferred'
    }),

  recipient: Joi.string()
    .trim()
    .optional(),

  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Product ID must be a valid MongoDB ObjectId'
    }),

  startDate: Joi.date()
    .optional(),

  endDate: Joi.date()
    .greater(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.greater': 'End date must be after start date'
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
 * All certificate validation schemas
 */
export const certificateValidationSchemas = {
  create: createCertificateSchema,
  batchCreate: batchCreateCertificatesSchema,
  params: certificateParamsSchema,
  listQuery: listCertificatesQuerySchema
};