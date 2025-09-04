// src/lib/validation/utils.ts

import Joi from 'joi';

/**
 * Common validation schemas that mirror backend patterns
 * These patterns are extracted from backend/src/middleware/validation.middleware.ts
 */
export const commonSchemas = {
  // MongoDB ObjectId validation
  mongoId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Must be a valid MongoDB ObjectId'
    }),

  // Email validation (matches backend)
  email: Joi.string()
    .email({ tlds: { allow: false } }) // Allow all TLDs like backend
    .lowercase()
    .required()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required'
    }),

  optionalEmail: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .optional()
    .messages({
      'string.email': 'Must be a valid email address'
    }),

  // Business email (special validation for business accounts)
  businessEmail: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .required()
    .custom((value, helpers) => {
      // Block common disposable email domains (matches backend logic)
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
        'mailinator.com', 'yopmail.com', 'temp-mail.org'
      ];
      const domain = value.split('@')[1]?.toLowerCase();
      if (disposableDomains.includes(domain)) {
        return helpers.error('string.disposableEmail');
      }
      return value;
    })
    .messages({
      'string.email': 'Must be a valid email address',
      'string.disposableEmail': 'Disposable email addresses are not allowed',
      'any.required': 'Business email is required'
    }),

  // Password validation (matches backend exactly)
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),

  // Phone number validation (international format)
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Must be a valid phone number in international format',
      'any.required': 'Phone number is required'
    }),

  optionalPhone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Must be a valid phone number in international format'
    }),

  // URL validation
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'string.uri': 'Must be a valid URL (http or https)',
      'any.required': 'URL is required'
    }),

  optionalUrl: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional()
    .messages({
      'string.uri': 'Must be a valid URL (http or https)'
    }),

  // Plan validation
  plan: Joi.string()
    .valid('foundation', 'growth', 'premium', 'enterprise')
    .required()
    .messages({
      'any.only': 'Plan must be one of: foundation, growth, premium, enterprise',
      'any.required': 'Plan is required'
    }),

  optionalPlan: Joi.string()
    .valid('foundation', 'growth', 'premium', 'enterprise')
    .optional()
    .messages({
      'any.only': 'Plan must be one of: foundation, growth, premium, enterprise'
    }),

  // Date validations
  date: Joi.date()
    .iso()
    .required()
    .messages({
      'date.format': 'Date must be in ISO format',
      'any.required': 'Date is required'
    }),

  futureDate: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.format': 'Date must be in ISO format',
      'date.min': 'Date must be in the future',
      'any.required': 'Date is required'
    }),

  pastDate: Joi.date()
    .iso()
    .max('now')
    .required()
    .messages({
      'date.format': 'Date must be in ISO format',
      'date.max': 'Date must be in the past',
      'any.required': 'Date is required'
    }),

  dateOfBirth: Joi.date()
    .iso()
    .max(new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000)) // 13+ years old
    .min('1900-01-01')
    .optional()
    .messages({
      'date.format': 'Date must be in ISO format',
      'date.max': 'Must be at least 13 years old',
      'date.min': 'Date of birth must be after 1900'
    }),

  // Text validations
  shortText: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Must be at least 1 character',
      'string.max': 'Cannot exceed 100 characters',
      'any.required': 'This field is required'
    }),

  mediumText: Joi.string()
    .trim()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.min': 'Must be at least 1 character',
      'string.max': 'Cannot exceed 500 characters',
      'any.required': 'This field is required'
    }),

  longText: Joi.string()
    .trim()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.min': 'Must be at least 1 character',
      'string.max': 'Cannot exceed 2000 characters',
      'any.required': 'This field is required'
    }),

  optionalLongText: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .messages({
      'string.max': 'Cannot exceed 2000 characters'
    }),

  // Business-specific validations
  businessName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Business name must be at least 2 characters',
      'string.max': 'Business name cannot exceed 100 characters',
      'any.required': 'Business name is required'
    }),

  // Subdomain validation (matches backend patterns)
  subdomain: Joi.string()
    .alphanum()
    .min(3)
    .max(63)
    .lowercase()
    .pattern(/^[a-z0-9]+$/)
    .invalid('www', 'api', 'admin', 'dashboard', 'app', 'mail', 'ftp', 'localhost', 'staging', 'dev')
    .required()
    .messages({
      'string.pattern.base': 'Subdomain must contain only lowercase letters and numbers',
      'string.min': 'Subdomain must be at least 3 characters',
      'string.max': 'Subdomain cannot exceed 63 characters',
      'any.invalid': 'This subdomain is reserved and cannot be used',
      'any.required': 'Subdomain is required'
    }),

  // Industry validation
  industry: Joi.string()
    .valid(
      'Textile Manufacturing', 'Food & Beverage Manufacturing', 'Electronics Manufacturing',
      'Automotive Manufacturing', 'Pharmaceutical Manufacturing', 'Chemical Manufacturing',
      'Machinery Manufacturing', 'Metal Fabrication', 'Plastic Manufacturing',
      'Technology', 'Healthcare', 'Finance', 'Retail', 'Education', 'Consulting',
      'Real Estate', 'Construction', 'Transportation', 'Energy', 'Media',
      'Other'
    )
    .optional()
    .messages({
      'any.only': 'Must select a valid industry'
    }),

  // Services offered validation
  servicesOffered: Joi.array()
    .items(Joi.string().trim().max(100))
    .min(1)
    .max(20)
    .optional()
    .messages({
      'array.min': 'At least one service is required',
      'array.max': 'Cannot have more than 20 services',
      'string.max': 'Each service cannot exceed 100 characters'
    }),

  // Minimum order quantity
  moq: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.integer': 'MOQ must be a whole number',
      'number.min': 'MOQ must be at least 1'
    }),

  // Search query validation
  searchQuery: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 2 characters',
      'string.max': 'Search query cannot exceed 100 characters'
    }),

  // Pagination schemas
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

  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .messages({
      'number.integer': 'Offset must be an integer',
      'number.min': 'Offset must be at least 0'
    }),

  // Sort options
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'name', 'email', 'status')
    .default('createdAt')
    .optional(),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional(),

  // Hex color validation
  hexColor: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional()
    .messages({
      'string.pattern.base': 'Must be a valid hex color code (e.g., #FF0000)'
    }),

  // Ethereum address validation
  ethereumAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Must be a valid Ethereum address'
    }),

  // Transaction hash validation
  transactionHash: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{64}$/)
    .messages({
      'string.pattern.base': 'Must be a valid Ethereum transaction hash'
    }),

  // Verification code (6-character alphanumeric)
  verificationCode: Joi.string()
    .alphanum()
    .length(6)
    .uppercase()
    .required()
    .messages({
      'string.alphanum': 'Verification code must be alphanumeric',
      'string.length': 'Verification code must be exactly 6 characters',
      'any.required': 'Verification code is required'
    }),

  // Two-factor code (6-character alphanumeric)
  twoFactorCode: Joi.string()
    .alphanum()
    .length(6)
    .optional()
    .messages({
      'string.alphanum': 'Two-factor code must be alphanumeric',
      'string.length': 'Two-factor code must be exactly 6 characters'
    }),

  // File validation
  fileSize: Joi.number()
    .positive()
    .max(100 * 1024 * 1024) // 100MB max
    .messages({
      'number.positive': 'File size must be positive',
      'number.max': 'File size cannot exceed 100MB'
    }),

  fileName: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .pattern(/^[^<>:"/\\|?*]+$/)
    .messages({
      'string.pattern.base': 'Filename contains invalid characters',
      'string.max': 'Filename cannot exceed 255 characters'
    })
};

/**
 * Pagination schema for consistent pagination across all endpoints
 */
export const paginationSchema = Joi.object({
  page: commonSchemas.page,
  limit: commonSchemas.limit,
  offset: commonSchemas.offset
});

/**
 * Search schema for consistent search functionality
 */
export const searchSchema = Joi.object({
  q: commonSchemas.searchQuery,
  sortBy: commonSchemas.sortBy,
  sortOrder: commonSchemas.sortOrder
});

/**
 * Date range schema for analytics and filtering
 */
export const dateRangeSchema = Joi.object({
  startDate: commonSchemas.date.optional(),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date'
    }),
  timeframe: Joi.string()
    .valid('24h', '7d', '30d', '90d', '1y', 'all')
    .default('30d')
    .optional(),
  timezone: Joi.string()
    .max(50)
    .default('UTC')
    .optional()
});

/**
 * Generic filter schema
 */
export const filterSchema = Joi.object({
  status: Joi.string()
    .valid('active', 'inactive', 'pending', 'suspended', 'deleted')
    .optional(),
  verified: Joi.boolean().optional(),
  ...paginationSchema.describe().keys,
  ...searchSchema.describe().keys,
  ...dateRangeSchema.describe().keys
});

/**
 * Helper function to create consistent error messages
 */
export const createValidationError = (field: string, message: string, code?: string) => ({
  field,
  message,
  code: code || 'VALIDATION_ERROR'
});

/**
 * Helper function to format Joi validation errors consistently
 */
export const formatJoiError = (error: Joi.ValidationError) => {
  const details = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
    type: detail.type
  }));

  return {
    message: `Validation failed: ${details.map(d => d.message).join(', ')}`,
    details,
    code: 'VALIDATION_ERROR'
  };
};

/**
 * Helper to validate data and return formatted errors
 */
export const validateData = <T>(schema: Joi.ObjectSchema<T>, data: any) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    return {
      success: false,
      error: formatJoiError(error),
      data: null
    };
  }

  return {
    success: true,
    error: null,
    data: value as T
  };
};