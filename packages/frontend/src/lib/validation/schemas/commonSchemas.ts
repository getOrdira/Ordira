import Joi from 'joi';

/**
 * Common validation schemas aligned with backend infrastructure validators.
 */

const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  'tempmail.org',
  'guerrillamail.com',
  'mailinator.com',
  'yopmail.com',
  'temp-mail.org'
];

const objectId = Joi.string().hex().length(24);
const uuid = Joi.string().guid({ version: ['uuidv4', 'uuidv5'] });
const email = Joi.string().email({ tlds: { allow: false } }).lowercase();
const url = Joi.string().uri({ scheme: ['http', 'https'] });
const phone = Joi.string().pattern(/^\+?[1-9]\d{1,14}$/);
const hexColor = Joi.string().pattern(/^#(?:[A-Fa-f0-9]{3}){1,2}$/);
const ethereumAddress = Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/);
const transactionHash = Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/);
const dateIso = Joi.date().iso();

const stringSchema = (options: { min?: number; max?: number; trim?: boolean } = {}) => {
  let schema = Joi.string();
  if (options.trim !== false) {
    schema = schema.trim();
  }
  if (options.min !== undefined) {
    schema = schema.min(options.min);
  }
  if (options.max !== undefined) {
    schema = schema.max(options.max);
  }
  return schema;
};

export const commonSchemas = {
  mongoId: objectId.messages({
    'string.hex': 'Must be a valid MongoDB ObjectId',
    'string.length': 'Must be a valid MongoDB ObjectId'
  }),
  optionalMongoId: objectId.optional(),

  uuid: uuid.messages({
    'string.guid': 'Must be a valid UUID'
  }),
  optionalUuid: uuid.optional(),

  email: email.required().messages({
    'string.email': 'Must be a valid email address',
    'any.required': 'Email is required'
  }),
  optionalEmail: email.optional().messages({
    'string.email': 'Must be a valid email address'
  }),

  businessEmail: email.required().custom((value, helpers) => {
    const domain = value.split('@')[1]?.toLowerCase();
    if (domain && DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
      return helpers.error('string.disposableEmail');
    }
    return value;
  }).messages({
    'string.email': 'Must be a valid email address',
    'string.disposableEmail': 'Disposable email addresses are not allowed',
    'any.required': 'Business email is required'
  }),

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

  phone: phone.required().messages({
    'string.pattern.base': 'Must be a valid E.164 phone number',
    'any.required': 'Phone number is required'
  }),
  optionalPhone: phone.optional().messages({
    'string.pattern.base': 'Must be a valid E.164 phone number'
  }),

  url: url.required().messages({
    'string.uri': 'Must be a valid URL (http or https)',
    'any.required': 'URL is required'
  }),
  optionalUrl: url.optional().messages({
    'string.uri': 'Must be a valid URL (http or https)'
  }),

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

  date: dateIso.required().messages({
    'date.format': 'Date must be in ISO format',
    'any.required': 'Date is required'
  }),
  optionalDate: dateIso.optional().messages({
    'date.format': 'Date must be in ISO format'
  }),
  futureDate: dateIso.min('now').required().messages({
    'date.min': 'Date must be in the future',
    'any.required': 'Date is required'
  }),
  optionalFutureDate: dateIso.min('now').optional().messages({
    'date.min': 'Date must be in the future'
  }),
  pastDate: dateIso.max('now').required().messages({
    'date.max': 'Date must be in the past',
    'any.required': 'Date is required'
  }),
  optionalPastDate: dateIso.max('now').optional().messages({
    'date.max': 'Date must be in the past'
  }),
  dateOfBirth: dateIso
    .max(new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000))
    .min('1900-01-01')
    .optional()
    .messages({
      'date.max': 'Must be at least 13 years old',
      'date.min': 'Date of birth must be after 1900'
    }),

  shortText: stringSchema({ min: 1, max: 100 }).required(),
  optionalShortText: stringSchema({ min: 1, max: 100 }).optional(),
  mediumText: stringSchema({ min: 1, max: 500 }).required(),
  optionalMediumText: stringSchema({ min: 1, max: 500 }).optional(),
  longText: stringSchema({ min: 1, max: 2000 }).required(),
  optionalLongText: stringSchema({ max: 2000 }).optional(),

  businessName: stringSchema({ min: 2, max: 100 }).required().messages({
    'any.required': 'Business name is required'
  }),

  subdomain: Joi.string()
    .pattern(/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/)
    .min(3)
    .max(63)
    .lowercase()
    .invalid('www', 'api', 'admin', 'dashboard', 'app', 'mail', 'ftp', 'localhost', 'staging', 'dev')
    .required()
    .messages({
      'string.pattern.base': 'Subdomain must contain only lowercase letters, numbers, or hyphens (no leading or trailing hyphen)',
      'string.min': 'Subdomain must be at least 3 characters',
      'string.max': 'Subdomain cannot exceed 63 characters',
      'any.invalid': 'This subdomain is reserved and cannot be used',
      'any.required': 'Subdomain is required'
    }),

  industry: Joi.string()
    .valid(
      'Textile Manufacturing',
      'Food & Beverage Manufacturing',
      'Electronics Manufacturing',
      'Automotive Manufacturing',
      'Pharmaceutical Manufacturing',
      'Chemical Manufacturing',
      'Machinery Manufacturing',
      'Metal Fabrication',
      'Plastic Manufacturing',
      'Technology',
      'Healthcare',
      'Finance',
      'Retail',
      'Education',
      'Consulting',
      'Real Estate',
      'Construction',
      'Transportation',
      'Energy',
      'Media',
      'Other'
    )
    .optional()
    .messages({
      'any.only': 'Must select a valid industry'
    }),

  servicesOffered: Joi.array()
    .items(stringSchema({ max: 100 }))
    .min(1)
    .max(20)
    .optional()
    .messages({
      'array.min': 'At least one service is required',
      'array.max': 'Cannot have more than 20 services'
    }),

  moq: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.integer': 'MOQ must be a whole number',
      'number.min': 'MOQ must be at least 1'
    }),

  searchQuery: stringSchema({ min: 2, max: 100 }).optional().messages({
    'string.min': 'Search query must be at least 2 characters',
    'string.max': 'Search query cannot exceed 100 characters'
  }),

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

  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'name', 'email', 'status')
    .default('createdAt')
    .optional(),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional(),

  hexColor: hexColor.optional().messages({
    'string.pattern.base': 'Must be a valid hex color code (e.g., #FF0000)'
  }),

  ethereumAddress: ethereumAddress.optional().messages({
    'string.pattern.base': 'Must be a valid Ethereum address'
  }),

  transactionHash: transactionHash.optional().messages({
    'string.pattern.base': 'Must be a valid Ethereum transaction hash'
  }),

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

  twoFactorCode: Joi.string()
    .alphanum()
    .length(6)
    .optional()
    .messages({
      'string.alphanum': 'Two-factor code must be alphanumeric',
      'string.length': 'Two-factor code must be exactly 6 characters'
    }),

  fileSize: Joi.number()
    .positive()
    .max(100 * 1024 * 1024)
    .messages({
      'number.positive': 'File size must be positive',
      'number.max': 'File size cannot exceed 100MB'
    }),

  fileName: stringSchema({ min: 1, max: 255 }).pattern(/^[^<>:"/\|?*]+$/).messages({
    'string.pattern.base': 'Filename contains invalid characters',
    'string.max': 'Filename cannot exceed 255 characters'
  })
};

